-- DEPRECATED / NO-OP
--
-- This migration originally enforced GLOBAL uniqueness on `phone`.
-- The correct requirement is uniqueness PER ORGANIZATION, implemented in:
--   20260108_make_leads_phone_unique_per_org.sql
--
-- This file is intentionally left as a no-op to avoid accidental execution.
SELECT 1;
