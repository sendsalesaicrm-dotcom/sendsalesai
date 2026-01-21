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

      const nowIso = new Date().toISOString();
      let metaPhoneNumberId = ""; // Used to identify Org for Meta
      const provider = body.object === "whatsapp_business_account" ? "meta" : "evolution";

      type ParsedIncoming = {
        phone: string;
        name: string;
        content: string;
        timestamp: string;
        external_id: string | null;
        instanceName?: string;
      };

      const normalizePhone = (raw: string) => String(raw || '').replace(/\D/g, '');

      const getEvolutionExternalId = (raw: any): string | null => {
        return raw?.id || raw?.messageId || raw?.key?.id || raw?.key?.idMessage || null;
      };

      const parseMeta = (): ParsedIncoming[] => {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        metaPhoneNumberId = value?.metadata?.phone_number_id;

        // Ignore status updates (sent, delivered, read)
        if (!value?.messages || !Array.isArray(value.messages) || value.messages.length === 0) return [];

        const contact = value.contacts?.[0];
        const name = contact?.profile?.name;

        return value.messages.map((message: any) => {
          const phone = message.from;
          const content = message.text?.body || "[Mídia/Outro formato]";
          const ts = message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : nowIso;
          const external_id = message.id || null;
          return {
            phone: normalizePhone(phone),
            name: name || normalizePhone(phone),
            content,
            timestamp: ts,
            external_id,
          };
        });
      };

      const parseEvolution = (): ParsedIncoming[] => {
        const instanceName = body.instance || body?.data?.instance || body?.data?.instanceName;
        const event = body.event || body.type;

        // Evolution often sends arrays/batches. Normalize to list of message-like items.
        const data = body.data;
        const candidates: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.messages)
            ? data.messages
            : data
              ? [data]
              : [];

        // Do not hard-filter by event name: Evolution versions vary and sometimes still include
        // message payloads under different event types.

        const results: ParsedIncoming[] = [];
        for (const item of candidates) {
          try {
            const key = item?.key || item?.message?.key || item?.data?.key || {};
            if (key?.fromMe) continue;

            const rawJid = key?.senderPn || key?.remoteJid || item?.remoteJid || '';
            const jid = String(rawJid);
            const stripped = jid
              .replace('@s.whatsapp.net', '')
              .replace('@c.us', '');
            const phone = normalizePhone(stripped);
            if (!phone) continue;

            const msgContent = item?.message || item?.data?.message;
            if (!msgContent) continue;

            const content =
              msgContent.conversation ||
              msgContent.extendedTextMessage?.text ||
              msgContent.imageMessage?.caption ||
              msgContent.videoMessage?.caption ||
              "[Mensagem Complexa/Mídia]";
            if (!content) continue;

            const name = item?.pushName || item?.data?.pushName || phone;
            const external_id = getEvolutionExternalId(item);
            const tsRaw = item?.createdAt || item?.created_at || item?.timestamp || item?.messageTimestamp || item?.message?.messageTimestamp;
            let timestamp = nowIso;
            if (typeof tsRaw === 'string') {
              const d = new Date(tsRaw);
              if (!Number.isNaN(d.getTime())) timestamp = d.toISOString();
            } else if (typeof tsRaw === 'number' && Number.isFinite(tsRaw)) {
              const ms = tsRaw > 10_000_000_000 ? tsRaw : tsRaw * 1000;
              const d = new Date(ms);
              if (!Number.isNaN(d.getTime())) timestamp = d.toISOString();
            }

            results.push({ phone, name, content, timestamp, external_id, instanceName });
          } catch (e) {
            console.error('[parseEvolution] item error:', (e as any)?.message || e);
          }
        }

        return results;
      };

      const incoming: ParsedIncoming[] = body.object === "whatsapp_business_account" ? parseMeta() : parseEvolution();
      if (incoming.length === 0) {
        // Unknown/ignored format. Always return 200 to prevent provider retries.
        return new Response("OK", { status: 200, headers: corsHeaders });
      }

      // --- DATABASE PERSISTENCE ---
      // Resolve organization once (Meta uses phone_number_id; Evolution uses instance name)
      let organizationId: string | null = null;

      if (metaPhoneNumberId) {
        const { data: config } = await supabase
          .from('whatsapp_config')
          .select('organization_id')
          .eq('phone_number_id', metaPhoneNumberId)
          .single();
        if (config) organizationId = config.organization_id;
      }

      if (!organizationId) {
        const instanceName = incoming[0]?.instanceName;
        if (instanceName) {
          const { data: org } = await supabase
            .from('organizations')
            .select('id')
            .eq('evolution_instance', instanceName)
            .single();
          if (org) organizationId = org.id;
        }
      }

      // IMPORTANT: do not fallback to the first org (this causes "lost" messages / wrong routing)
      if (!organizationId) {
        console.warn(`Could not resolve organization for provider=${provider}`);
        return new Response("OK", { status: 200, headers: corsHeaders });
      }

      for (const msg of incoming) {
        const phone = msg.phone;
        const content = msg.content;
        const name = msg.name;
        const timestamp = msg.timestamp || nowIso;

        console.log(`Processing message from ${phone}: ${content}`);

        // 1. Find or Create Lead (per-organization uniqueness)
        let leadId: string | null = null;
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('phone', phone)
          .maybeSingle();

        if (existingLead) {
          leadId = existingLead.id;

          const updateData: any = { last_active: timestamp };
          if (name && name !== phone) updateData.name = name;
          await supabase.from('leads').update(updateData).eq('id', leadId);
        } else {
          const { data: newLead, error: createError } = await supabase
            .from('leads')
            .insert({
              organization_id: organizationId,
              phone: phone,
              name: name || phone,
              status: 'new',
              tags: ['inbound'],
              last_active: timestamp,
            })
            .select('id')
            .single();

          if (!createError && newLead) leadId = newLead.id;
        }

        if (!leadId) continue;

        // 2. Idempotent insert (prevents duplicates + avoids "lost" on retries)
        const payload: any = {
          lead_id: leadId,
          content,
          sender_type: 'contact',
          created_at: timestamp,
          provider,
          external_id: msg.external_id,
        };

        const { error: insErr } = await supabase
          .from('conversations')
          .upsert(payload, { onConflict: 'provider,external_id' });

        if (insErr) {
          // If we don't have external_id, upsert can't dedupe; still log.
          console.error('Insert conversation error:', insErr);
        }
      }

      return new Response("Event processed", { status: 200, headers: corsHeaders });

    } catch (error) {
      console.error("Webhook Error:", error);
      // Always 200 to avoid provider retries storms; log is the source of truth.
      return new Response("Internal Error", { status: 200, headers: corsHeaders });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});