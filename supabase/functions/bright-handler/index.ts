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
    const { organization_id, phone, message } = await req.json()

    if (!organization_id || !phone || !message) {
      throw new Error('Dados incompletos: organization_id, phone, message são obrigatórios.')
    }

    const cleanPhone = String(phone).replace(/\D/g, '')
    if (!cleanPhone) {
      throw new Error('Telefone inválido.')
    }

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

    // --- PRIORITY 1: EVOLUTION API ---
    if (orgData.evolution_url && orgData.evolution_api_key && orgData.evolution_instance) {
      providerUsed = 'evolution';
      console.log('Sending via Evolution API...');
      
      const baseUrl = orgData.evolution_url.replace(/\/$/, "");
      const url = `${baseUrl}/message/sendText/${orgData.evolution_instance}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': orgData.evolution_api_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: cleanPhone, 
          text: message,
          linkPreview: false
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Erro Evolution API: ${err}`);
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
          content: message,
          sender_type: 'user', // Agent/System sending
          is_ai_generated: false 
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