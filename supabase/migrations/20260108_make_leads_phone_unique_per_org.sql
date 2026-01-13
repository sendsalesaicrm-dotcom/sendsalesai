-- Enforce phone uniqueness PER ORGANIZATION.
-- Each organization can only have a phone number once.
-- Phone is normalized to digits-only.

-- 1) Normalize existing data
UPDATE public.leads
SET phone = regexp_replace(COALESCE(phone, ''), '\\D', '', 'g')
WHERE phone IS NOT NULL;

-- 2) Deduplicate within (organization_id, phone), keeping the most recently active/created row
WITH ranked AS (
  SELECT
    id,
    organization_id,
    phone,
    row_number() OVER (
      PARTITION BY organization_id, phone
      ORDER BY COALESCE(last_active, created_at) DESC NULLS LAST,
               created_at DESC NULLS LAST,
               id
    ) AS rn
  FROM public.leads
  WHERE organization_id IS NOT NULL AND phone IS NOT NULL AND phone <> ''
)
DELETE FROM public.leads
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 3) Always normalize phone on write
CREATE OR REPLACE FUNCTION public.normalize_leads_phone()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.phone := regexp_replace(COALESCE(NEW.phone, ''), '\\D', '', 'g');
  IF NEW.phone = '' THEN
    RAISE EXCEPTION 'Lead phone cannot be empty';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_leads_phone ON public.leads;
CREATE TRIGGER trg_normalize_leads_phone
BEFORE INSERT OR UPDATE OF phone ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.normalize_leads_phone();

-- 4) Replace any previous global-unique index (if it exists)
DROP INDEX IF EXISTS public.leads_phone_unique_idx;

-- 5) Enforce uniqueness per organization
CREATE UNIQUE INDEX IF NOT EXISTS leads_org_phone_unique_idx
ON public.leads (organization_id, phone);
