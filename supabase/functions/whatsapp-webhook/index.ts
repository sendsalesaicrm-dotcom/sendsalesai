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
  const webhookSecret = Deno.env.get("WHATSAPP_WEBHOOK_SECRET");

  if (method === "OPTIONS") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

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
      // Optional shared-secret auth for providers that can send a header.
      // If WHATSAPP_WEBHOOK_SECRET is unset, accept requests (backward compatible).
      if (webhookSecret) {
        const provided = req.headers.get("x-webhook-secret") || req.headers.get("X-Webhook-Secret");
        if (!provided || provided !== webhookSecret) {
          return new Response("Unauthorized", { status: 401, headers: corsHeaders });
        }
      }

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
        raw?: any;
        media_type?: string | null;
        media_url?: string | null;
        mime_type?: string | null;
        file_name?: string | null;
        caption?: string | null;
      };

      const normalizePhone = (raw: string) => String(raw || '').replace(/\D/g, '');

      const getEvolutionExternalId = (raw: any): string | null => {
        // Prefer the WhatsApp message key id (most stable/unique across Evolution versions).
        // Some payloads include a top-level `id` that is NOT the message id and can collide
        // with outbound message ids, causing UPSERT to become an UPDATE.
        const key =
          raw?.key ||
          raw?.message?.key ||
          raw?.message?.message?.key ||
          raw?.data?.key ||
          raw?.data?.message?.key ||
          raw?.data?.message?.message?.key ||
          {};
        return (
          key?.id ||
          key?.idMessage ||
          raw?.messageId ||
          raw?.data?.messageId ||
          raw?.id ||
          null
        );
      };

      const safeInsertWebhookDebugEvent = async (row: {
        provider: string;
        event_type?: string | null;
        instance_name?: string | null;
        phone?: string | null;
        external_id?: string | null;
        parsed_count: number;
        drop_reason?: string | null;
        sample_content?: string | null;
        payload?: any;
      }) => {
        try {
          await supabase
            .from('whatsapp_webhook_events')
            .insert({
              provider: row.provider,
              event_type: row.event_type ?? null,
              instance_name: row.instance_name ?? null,
              phone: row.phone ?? null,
              external_id: row.external_id ?? null,
              parsed_count: row.parsed_count,
              drop_reason: row.drop_reason ?? null,
              sample_content: row.sample_content ?? null,
              payload: row.payload ?? null,
            });
        } catch (_e) {
          // Debug table may not exist yet (migration not applied). Never break webhook flow.
        }
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
            raw: message,
          };
        });
      };

      const parseEvolution = (): ParsedIncoming[] => {
        const instanceName = body.instance || body?.instanceName || body?.data?.instance || body?.data?.instanceName;
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

        // Some Evolution payloads place the message fields at the top-level.
        if (candidates.length === 0 && (body?.key || body?.message || body?.data?.key || body?.data?.message)) {
          candidates.push(body);
        }

        // Do not hard-filter by event name: Evolution versions vary and sometimes still include
        // message payloads under different event types.

        const results: ParsedIncoming[] = [];
        for (const item of candidates) {
          try {
            const itemInstanceName =
              item?.instance ||
              item?.instanceName ||
              item?.data?.instance ||
              item?.data?.instanceName ||
              instanceName;

            const key =
              item?.key ||
              item?.message?.key ||
              item?.message?.message?.key ||
              item?.data?.key ||
              item?.data?.message?.key ||
              item?.data?.message?.message?.key ||
              {};
            const fromMe = key?.fromMe === true || key?.fromMe === 'true';
            if (fromMe) continue;

            const rawJid =
              key?.senderPn ||
              key?.remoteJid ||
              key?.participant ||
              item?.remoteJid ||
              item?.from ||
              item?.sender ||
              item?.participant ||
              item?.data?.from ||
              item?.data?.sender ||
              '';
            const jid = String(rawJid);
            const stripped = jid
              .replace('@s.whatsapp.net', '')
              .replace('@c.us', '');
            const phone = normalizePhone(stripped);
            if (!phone) continue;

            const msgContainer = item?.message || item?.data?.message;
            const msgContent = msgContainer?.message || msgContainer;
            if (!msgContent) continue;

            // Best-effort media extraction for Evolution payloads (varies by version)
            const extractMedia = (mc: any) => {
              const image = mc?.imageMessage;
              const video = mc?.videoMessage;
              const doc = mc?.documentMessage;
              const audio = mc?.audioMessage;

              const pickUrl = (m: any): string | null => {
                const url = m?.url || m?.mediaUrl || m?.media_url;
                if (typeof url === 'string' && url.trim()) return url;
                // Some payloads use 'directPath' without full URL; we can't reconstruct safely here.
                return null;
              };

              if (image) {
                return {
                  media_type: 'image',
                  media_url: pickUrl(image),
                  mime_type: image?.mimetype || image?.mimeType || null,
                  file_name: image?.fileName || image?.filename || null,
                  caption: image?.caption || null,
                };
              }
              if (video) {
                return {
                  media_type: 'video',
                  media_url: pickUrl(video),
                  mime_type: video?.mimetype || video?.mimeType || null,
                  file_name: video?.fileName || video?.filename || null,
                  caption: video?.caption || null,
                };
              }
              if (doc) {
                return {
                  media_type: 'document',
                  media_url: pickUrl(doc),
                  mime_type: doc?.mimetype || doc?.mimeType || null,
                  file_name: doc?.fileName || doc?.filename || null,
                  caption: doc?.caption || null,
                };
              }
              if (audio) {
                return {
                  media_type: 'audio',
                  media_url: pickUrl(audio),
                  mime_type: audio?.mimetype || audio?.mimeType || null,
                  file_name: audio?.fileName || audio?.filename || null,
                  caption: null,
                };
              }
              return {
                media_type: null,
                media_url: null,
                mime_type: null,
                file_name: null,
                caption: null,
              };
            };

            const media = extractMedia(msgContent);

            const content =
              msgContent.conversation ||
              msgContent.extendedTextMessage?.text ||
              media.caption ||
              (media.media_type ? 'Mídia' : "[Mensagem Complexa/Mídia]");
            if (!content) continue;

            const name = item?.pushName || item?.data?.pushName || phone;
            const external_id = getEvolutionExternalId(item);
            const tsRaw =
              item?.createdAt ||
              item?.created_at ||
              item?.timestamp ||
              item?.messageTimestamp ||
              item?.message?.messageTimestamp ||
              msgContainer?.messageTimestamp ||
              msgContent?.messageTimestamp;
            let timestamp = nowIso;
            if (typeof tsRaw === 'string') {
              const d = new Date(tsRaw);
              if (!Number.isNaN(d.getTime())) timestamp = d.toISOString();
            } else if (typeof tsRaw === 'number' && Number.isFinite(tsRaw)) {
              const ms = tsRaw > 10_000_000_000 ? tsRaw : tsRaw * 1000;
              const d = new Date(ms);
              if (!Number.isNaN(d.getTime())) timestamp = d.toISOString();
            }

            results.push({
              phone,
              name,
              content,
              timestamp,
              external_id,
              instanceName: itemInstanceName,
              raw: item,
              media_type: media.media_type,
              media_url: media.media_url,
              mime_type: media.mime_type,
              file_name: media.file_name,
              caption: media.caption,
            });
          } catch (e) {
            console.error('[parseEvolution] item error:', (e as any)?.message || e);
          }
        }

        return results;
      };

      const incoming: ParsedIncoming[] = body.object === "whatsapp_business_account" ? parseMeta() : parseEvolution();
      if (incoming.length === 0) {
        if (provider === 'evolution') {
          const instanceGuess = body.instance || body?.instanceName || body?.data?.instance || body?.data?.instanceName || null;
          const eventGuess = body.event || body.type || null;
          await safeInsertWebhookDebugEvent({
            provider,
            event_type: eventGuess,
            instance_name: instanceGuess,
            parsed_count: 0,
            drop_reason: 'parsed_zero_messages',
            payload: body,
          });
        }
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

      // Fallback: if Evolution didn't include the instance name in this webhook event,
      // attempt to resolve org by phone when it is unique across organizations.
      if (!organizationId) {
        const phone = incoming[0]?.phone;
        if (phone) {
          const { data: leads, error } = await supabase
            .from('leads')
            .select('organization_id')
            .eq('phone', phone)
            .limit(2);

          if (!error && Array.isArray(leads) && leads.length === 1) {
            organizationId = (leads[0] as any)?.organization_id || null;
          }
        }
      }

      // IMPORTANT: do not fallback to the first org (this causes "lost" messages / wrong routing)
      if (!organizationId) {
        const first = incoming[0] as any;
        console.warn(
          `Could not resolve organization for provider=${provider} instance=${first?.instanceName || ''} phone=${first?.phone || ''} event=${body?.event || body?.type || ''}`
        );

        await safeInsertWebhookDebugEvent({
          provider,
          event_type: (body?.event || body?.type || null) as any,
          instance_name: first?.instanceName || null,
          phone: first?.phone || null,
          external_id: first?.external_id || null,
          parsed_count: incoming.length,
          drop_reason: 'org_not_resolved',
          sample_content: first?.content ? String(first.content).slice(0, 280) : null,
          payload: body,
        });
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

        // Raw payload (debugging). Safe-guard: retry without it if DB migration isn't applied.
        if (msg.raw) payload.raw = msg.raw;

        // Media fields (only if present)
        if (msg.media_type) payload.media_type = msg.media_type;
        if (msg.media_url) payload.media_url = msg.media_url;
        if (msg.mime_type) payload.mime_type = msg.mime_type;
        if (msg.file_name) payload.file_name = msg.file_name;
        if (msg.caption) payload.caption = msg.caption;

        let { error: insErr } = await supabase
          .from('conversations')
          .upsert(payload, { onConflict: 'provider,external_id' });

        // If production DB hasn't received the `raw` column yet, retry without it.
        if (insErr && payload.raw) {
          const msgText = String((insErr as any)?.message || '');
          if (msgText.includes('column') && msgText.includes('raw')) {
            delete payload.raw;
            const retry = await supabase
              .from('conversations')
              .upsert(payload, { onConflict: 'provider,external_id' });
            insErr = retry.error;
          }
        }

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