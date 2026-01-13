-- Create WhatsApp configuration table.
--
-- NOTE: This migration file was previously corrupted/binary.
-- It is now replaced with valid SQL so it can be applied safely.

CREATE TABLE IF NOT EXISTS public.whatsapp_config (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL,
	waba_id text,
	phone_number_id text,
	verify_token text,
	access_token text,
	updated_at timestamptz,
	CONSTRAINT whatsapp_config_organization_id_fkey
		FOREIGN KEY (organization_id)
		REFERENCES public.organizations (id)
		ON DELETE CASCADE
);

-- One config row per organization.
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_config_organization_id_key
	ON public.whatsapp_config (organization_id);

-- Keep updated_at fresh.
CREATE OR REPLACE FUNCTION public.set_whatsapp_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	NEW.updated_at := now();
	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_whatsapp_config_set_updated_at ON public.whatsapp_config;
CREATE TRIGGER trg_whatsapp_config_set_updated_at
BEFORE UPDATE ON public.whatsapp_config
FOR EACH ROW
EXECUTE FUNCTION public.set_whatsapp_config_updated_at();
��y�^�