import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const {
      type = 'text',
      organization_id,
      phone,
      message,
      // media
      media,
      mediatype,
      mimetype,
      caption,
      fileName,
      delay,
    } = body ?? {}

    if (!organization_id || !phone) {
      throw new Error('Dados incompletos: organization_id e phone são obrigatórios.')
    }

    if (type === 'text' && !message) {
      throw new Error('Dados incompletos: message é obrigatório para type=text.')
    }

    if (type === 'media') {
      if (!media || !mediatype || !mimetype) {
        throw new Error('Dados incompletos: media, mediatype, mimetype são obrigatórios para type=media.')
      }
    }

    const rawPhone = String(phone)
    const cleanPhone = rawPhone.replace(/\D/g, '')
    if (!cleanPhone) throw new Error('Telefone inválido.')

    // Keep a remoteJid helper for providers that need it, but Evolution sendText/sendMedia
    // typically expects the numeric phone in the `number` field.
    const remoteJid = rawPhone.includes('@') ? rawPhone : `${cleanPhone}@s.whatsapp.net`

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch Organization Config
    const { data: orgData, error: orgError } = await supabaseClient
      .from('organizations')
      .select(`
        id,
        evolution_url,
        evolution_api_key,
        evolution_instance,
        whatsapp_config (
          access_token,
          phone_number_id
        )
      `)
      .eq('id', organization_id)
      .single()

    if (orgError || !orgData) {
      throw new Error('Configurações da organização não encontradas.')
    }

    // 2. Resolve Lead ID (Required for logging conversation)
    let leadId: string | null = null;
    const { data: leadData } = await supabaseClient
      .from('leads')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('phone', cleanPhone)
      .single();

    if (leadData) {
      leadId = leadData.id;
    } else {
      // Logic decision: If lead doesn't exist during outbound, should we create it?
      const { data: newLead, error: createError } = await supabaseClient
        .from('leads')
        .insert({
          organization_id: organization_id,
          phone: cleanPhone,
          name: cleanPhone, // Fallback name
          status: 'new'
        })
        .select('id')
        .single();
      
      if (!createError && newLead) leadId = newLead.id;
    }

    // 3. Send Message Logic
    let providerUsed = '';
    const whatsappConfig = Array.isArray(orgData.whatsapp_config) ? orgData.whatsapp_config[0] : orgData.whatsapp_config;

    // Helper: try to extract an external message id from Evolution/Meta responses
    const extractExternalId = async (res: Response): Promise<string | null> => {
      try {
        const data = await res.clone().json().catch(() => null)
        return (
          (data as any)?.key?.id ||
          (data as any)?.messageId ||
          (data as any)?.id ||
          (data as any)?.data?.key?.id ||
          null
        )
      } catch {
        return null
      }
    }

    let externalId: string | null = null

    // --- PRIORITY 1: EVOLUTION API ---
    if (orgData.evolution_url && orgData.evolution_api_key && orgData.evolution_instance) {
      providerUsed = 'evolution';
      console.log('Sending via Evolution API...');
      
      const baseUrl = orgData.evolution_url.replace(/\/$/, "");
      const instance = orgData.evolution_instance

      if (type === 'media') {
        // Preflight when media is a URL: helps catch non-public/inaccessible URLs
        // before Evolution attempts to fetch it.
        if (typeof media === 'string' && /^https?:\/\//i.test(media)) {
          try {
            let pre = await fetch(media, { method: 'HEAD' })
            if (!pre.ok && pre.status === 405) {
              pre = await fetch(media, {
                method: 'GET',
                headers: {
                  Range: 'bytes=0-0',
                },
              })
            }
            if (!pre.ok) {
              throw new Error(`URL inacessível (${pre.status})`)
            }

            const ct = (pre.headers.get('content-type') || '').toLowerCase()
            const expected = String(mimetype || '').split(';')[0].trim().toLowerCase()
            // If server provides Content-Type, ensure it matches the mimetype passed.
            if (ct && expected && !ct.startsWith(expected)) {
              throw new Error(`Content-Type não bate: esperado ${expected}, veio ${ct}`)
            }
          } catch (e: any) {
            throw new Error(`Mídia URL inválida/inacessível: ${e?.message || String(e)}`)
          }
        }

        const url = `${baseUrl}/message/sendMedia/${instance}`
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            apikey: orgData.evolution_api_key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // IMPORTANT: Evolution expects numeric phone here (per docs examples)
            number: cleanPhone,
            mediatype,
            mimetype,
            caption,
            media,
            fileName,
            delay,
          }),
        })

        if (!response.ok) {
          const err = await response.text().catch(() => '')
          throw new Error(`Erro Evolution API (sendMedia) [${response.status}]: ${err || 'sem detalhes'}`)
        }

        externalId = await extractExternalId(response)
      } else {
        const url = `${baseUrl}/message/sendText/${instance}`

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            apikey: orgData.evolution_api_key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: cleanPhone,
            text: message,
            linkPreview: false,
          }),
        })

        if (!response.ok) {
          const err = await response.text()
          throw new Error(`Erro Evolution API: ${err}`)
        }

        externalId = await extractExternalId(response)
      }
    } 
    // --- PRIORITY 2: META API ---
    else if (whatsappConfig?.access_token && whatsappConfig?.phone_number_id) {
      providerUsed = 'meta';
      console.log('Sending via Meta API...');
      const { phone_number_id, access_token } = whatsappConfig;
      const url = `https://graph.facebook.com/v17.0/${phone_number_id}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: message }
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Erro Meta API: ${err}`);
      }
    } else {
      throw new Error('Nenhuma API de WhatsApp configurada.');
    }

    // 4. Save to Database (Centralized Persistence)
    if (leadId) {
      const { error: insertError } = await supabaseClient
        .from('conversations')
        .insert({
          lead_id: leadId,
          content: type === 'media' ? (caption || `[${mediatype || 'mídia'}]`) : message,
          sender_type: 'user', // Agent/System sending
          is_ai_generated: false,

          provider: providerUsed,
          external_id: externalId,

          media_type: type === 'media' ? mediatype : null,
          media_url: type === 'media' ? media : null,
          mime_type: type === 'media' ? mimetype : null,
          file_name: type === 'media' ? (fileName || null) : null,
          caption: type === 'media' ? (caption || null) : null,
        });

      if (insertError) console.error("Error saving history:", insertError);
      
      // Update Lead "Last Active"
      await supabaseClient.from('leads').update({ last_active: new Date().toISOString() }).eq('id', leadId);
    }

    return new Response(JSON.stringify({ success: true, provider: providerUsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    console.error("Edge Function Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})