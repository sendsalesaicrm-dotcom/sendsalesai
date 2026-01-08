-- Adds a timestamp that represents when a lead entered its CURRENT kanban status.
-- If you already have a different status-history model, adjust accordingly.

ALTER TABLE IF EXISTS public.leads
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz NOT NULL DEFAULT now();

-- Backfill for existing rows
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
