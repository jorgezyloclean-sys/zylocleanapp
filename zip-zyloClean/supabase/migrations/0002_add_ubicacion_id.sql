-- Migration: add ubicacionId to jobs table
-- Each client can have multiple locations (ubicaciones). This column stores
-- which specific location the job was scheduled for.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS "ubicacionId" text;

-- Optional: index for faster lookups by location
CREATE INDEX IF NOT EXISTS idx_jobs_ubicacion ON public.jobs ("ubicacionId");

-- Notify PostgREST to refresh the schema cache
NOTIFY pgrst, 'reload schema';