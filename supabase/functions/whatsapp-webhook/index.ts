import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const { url, method } = req;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
  const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "sendsales_verify_token";

  // 1. Handle Webhook Verification (GET) - Meta only
  if (method === "GET") {
    const u = new URL(url);
    const mode = u.searchParams.get("hub.mode");
    const token = u.searchParams.get("hub.verify_token");
    const challenge = u.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === verifyToken) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // 2. Handle Incoming Messages (POST)
  if (method === "POST") {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const body = await req.json();

      let phone = "";
      let name = "";
      let content = "";
      let timestamp = new Date().toISOString();
      let metaPhoneNumberId = ""; // Used to identify Org for Meta

      // --- DETECTION LOGIC ---

      // A. Meta (Official API)
      if (body.object === "whatsapp_business_account") {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        // Capture Phone Number ID to identify Organization later
        metaPhoneNumberId = value?.metadata?.phone_number_id;

        // Ignore status updates (sent, delivered, read)
        if (!value?.messages) return new Response("OK", { status: 200 });

        const message = value.messages[0];
        const contact = value.contacts?.[0];

        phone = message.from; // e.g. "551199999999"
        name = contact?.profile?.name || phone;
        content = message.text?.body || "[Mídia/Outro formato]";
      } 
      
      // B. Evolution API (Generic Baileys/Typebot structure)
      // Usually has 'type', 'event', 'data'
      else if (body.type === "message" || body.event === "messages.upsert" || (body.data && body.data.key)) {
         const data = body.data;
         
         // Skip messages sent by me (to avoid loop/duplication if we are syncing)
         if (data.key?.fromMe) {
             return new Response("OK", { status: 200 });
         }

         // Extract Phone
         const remoteJid = data.key?.remoteJid || ""; // "55119999999@s.whatsapp.net"
         phone = remoteJid.replace("@s.whatsapp.net", "");
         
         // Extract Content
         const msgContent = data.message;
         if (!msgContent) return new Response("OK", { status: 200 });

         content = 
            msgContent.conversation || 
            msgContent.extendedTextMessage?.text || 
            msgContent.imageMessage?.caption ||
            "[Mensagem Complexa/Mídia]";
         
         name = data.pushName || phone;
      } 
      else {
        // Unknown format, log and ignore
        console.log("Unknown Webhook Format:", JSON.stringify(body).substring(0, 100));
        return new Response("OK", { status: 200 });
      }

      if (!phone || !content) {
          return new Response("OK - No Content", { status: 200 });
      }

      console.log(`Processing message from ${phone}: ${content}`);

      // --- DATABASE PERSISTENCE ---

      // 1. Find or Create Lead
      let leadId: string | null = null;
      let organizationId: string | null = null;
      
      // First, try to find an existing lead by phone
      // Note: In a multi-tenant system with duplicate phones across orgs, 
      // this logic might pick the most recently active one.
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id, organization_id")
        .eq("phone", phone)
        .order('last_active', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingLead) {
        leadId = existingLead.id;
        organizationId = existingLead.organization_id;
        
        // Update name if available and last_active
        const updateData: any = { last_active: timestamp };
        if (name && name !== phone) updateData.name = name;
        
        await supabase.from('leads').update(updateData).eq('id', leadId);
      } else {
        // Lead doesn't exist. We need to find the Organization ID to create it.
        
        // Strategy A: If Meta, use phone_number_id from payload
        if (metaPhoneNumberId) {
             const { data: config } = await supabase
                .from('whatsapp_config')
                .select('organization_id')
                .eq('phone_number_id', metaPhoneNumberId)
                .single();
             if (config) organizationId = config.organization_id;
        } 
        
        // Strategy B: If Evolution, we might look for a default org or instance mapping.
        // For this implementation, if we can't find the org, we can't create the lead safely.
        // Fallback: Pick the first organization (DEV ONLY - REMOVE IN PROD)
        if (!organizationId) {
            const { data: firstOrg } = await supabase.from('organizations').select('id').limit(1).single();
            organizationId = firstOrg?.id || null;
        }

        if (organizationId) {
            const { data: newLead, error: createError } = await supabase
            .from("leads")
            .insert({
                organization_id: organizationId,
                phone: phone,
                name: name || phone,
                status: "new",
                tags: ["inbound"],
                last_active: timestamp
            })
            .select("id")
            .single();

            if (!createError && newLead) leadId = newLead.id;
        }
      }

      if (leadId) {
        await supabase.from("conversations").insert({
          lead_id: leadId,
          content: content,
          sender_type: "contact", // It's from the customer
          created_at: timestamp
        });
      } else {
          console.warn(`Could not attribute message from ${phone} to any Organization.`);
      }

      return new Response("Event processed", { status: 200, headers: corsHeaders });

    } catch (error) {
      console.error("Webhook Error:", error);
      return new Response("Internal Error", { status: 200, headers: corsHeaders });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});