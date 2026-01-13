-- Harden RLS and fix integrity/performance issues discovered via Management API inspection.
-- Safe to run multiple times.

-- -------------------------
-- 1) LEADS: data integrity
-- -------------------------

-- Normalize existing phone values to digits-only.
UPDATE public.leads
SET phone = regexp_replace(COALESCE(phone, ''), '\\D', '', 'g')
WHERE phone IS NOT NULL;

-- Deduplicate within (organization_id, phone), keeping the most recently active/created row.
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
  WHERE organization_id IS NOT NULL
    AND phone IS NOT NULL
    AND phone <> ''
)
DELETE FROM public.leads
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Ensure status_changed_at exists and is maintained.
ALTER TABLE IF EXISTS public.leads
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz NOT NULL DEFAULT now();

UPDATE public.leads
SET status_changed_at = COALESCE(created_at, now())
WHERE status_changed_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_leads_status_changed_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status_changed_at IS NULL THEN
      NEW.status_changed_at := now();
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_leads_status_changed_at ON public.leads;
CREATE TRIGGER trg_set_leads_status_changed_at
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.set_leads_status_changed_at();

-- Always normalize phone on write.
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

-- Enforce uniqueness per organization.
CREATE UNIQUE INDEX IF NOT EXISTS leads_org_phone_unique_idx
ON public.leads (organization_id, phone);

-- -------------------------
-- 2) RLS: enable + tighten
-- -------------------------

-- LEADS: RLS was disabled in production. Enable it and remove overly-permissive policies.
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir TUDO para usuarios logados" ON public.leads;
DROP POLICY IF EXISTS "Enable delete for authenticated users based on organization" ON public.leads;
DROP POLICY IF EXISTS "Acesso Leads" ON public.leads;

CREATE POLICY "leads_select_org_members"
ON public.leads
FOR SELECT
TO authenticated
USING (organization_id IN (SELECT public.get_my_org_ids()));

CREATE POLICY "leads_insert_org_members"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (organization_id IN (SELECT public.get_my_org_ids()));

CREATE POLICY "leads_update_org_members"
ON public.leads
FOR UPDATE
TO authenticated
USING (organization_id IN (SELECT public.get_my_org_ids()))
WITH CHECK (organization_id IN (SELECT public.get_my_org_ids()));

CREATE POLICY "leads_delete_org_members"
ON public.leads
FOR DELETE
TO authenticated
USING (organization_id IN (SELECT public.get_my_org_ids()));

-- CONVERSATIONS: drop the policy that allows any authenticated user to access everything.
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir TUDO para usuarios logados - Conversations" ON public.conversations;
DROP POLICY IF EXISTS "Acesso Conversas" ON public.conversations;

CREATE POLICY "conversations_select_via_lead_org"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.leads
    WHERE leads.id = conversations.lead_id
      AND leads.organization_id IN (SELECT public.get_my_org_ids())
  )
);

CREATE POLICY "conversations_insert_via_lead_org"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.leads
    WHERE leads.id = conversations.lead_id
      AND leads.organization_id IN (SELECT public.get_my_org_ids())
  )
);

CREATE POLICY "conversations_update_via_lead_org"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.leads
    WHERE leads.id = conversations.lead_id
      AND leads.organization_id IN (SELECT public.get_my_org_ids())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.leads
    WHERE leads.id = conversations.lead_id
      AND leads.organization_id IN (SELECT public.get_my_org_ids())
  )
);

CREATE POLICY "conversations_delete_via_lead_org"
ON public.conversations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.leads
    WHERE leads.id = conversations.lead_id
      AND leads.organization_id IN (SELECT public.get_my_org_ids())
  )
);

-- WHATSAPP_CONFIG: restrict to org admins/owners (contains access_token).
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Configs" ON public.whatsapp_config;

CREATE POLICY "whatsapp_config_admin_only"
ON public.whatsapp_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = whatsapp_config.organization_id
      AND m.user_id = auth.uid()
      AND m.role = ANY (ARRAY['owner'::text, 'admin'::text])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = whatsapp_config.organization_id
      AND m.user_id = auth.uid()
      AND m.role = ANY (ARRAY['owner'::text, 'admin'::text])
  )
);
