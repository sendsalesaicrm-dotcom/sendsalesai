-- Repoint Evolution inbound messages that arrived with WhatsApp LID addressing (@lid)
-- to the correct lead derived from raw.key.remoteJidAlt (e.g. 5511...@s.whatsapp.net).
--
-- This fixes already-split history caused by mistakenly treating @lid as the phone number.

-- Ensure helper exists (idempotent).
CREATE OR REPLACE FUNCTION public.normalize_br_phone(raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
BEGIN
  digits := regexp_replace(COALESCE(raw, ''), '\\D', '', 'g');
  IF digits = '' THEN
    RETURN '';
  END IF;

  IF digits ~ '^55\\d{10,11}$' THEN
    RETURN digits;
  END IF;

  IF digits ~ '^\\d{10,11}$' THEN
    RETURN '55' || digits;
  END IF;

  RETURN digits;
END;
$$;

WITH src AS (
  SELECT
    c.id AS conversation_id,
    l.organization_id,
    public.normalize_br_phone(split_part((c.raw->'key'->>'remoteJidAlt'), '@', 1)) AS target_phone
  FROM public.conversations c
  JOIN public.leads l ON l.id = c.lead_id
  WHERE (c.provider = 'evolution')
    AND (c.raw IS NOT NULL)
    AND (c.raw->'key'->>'remoteJid') LIKE '%@lid'
    AND (c.raw->'key'->>'remoteJidAlt') IS NOT NULL
    AND (c.raw->'key'->>'remoteJidAlt') <> ''
), targets AS (
  SELECT
    s.conversation_id,
    t.id AS target_lead_id
  FROM src s
  JOIN public.leads t
    ON t.organization_id = s.organization_id
   AND t.phone = s.target_phone
  WHERE s.target_phone <> ''
)
UPDATE public.conversations c
SET lead_id = targets.target_lead_id
FROM targets
WHERE c.id = targets.conversation_id
  AND c.lead_id IS DISTINCT FROM targets.target_lead_id;
