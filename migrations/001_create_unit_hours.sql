-- Migration: create unit_hours table

CREATE TABLE IF NOT EXISTS public.unit_hours (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_number integer NOT NULL,
  date date NOT NULL,
  pump_hours integer NOT NULL,
  user_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Index for efficient latest-per-unit lookups
CREATE INDEX IF NOT EXISTS idx_unit_hours_unit_date ON public.unit_hours (unit_number, date DESC);

-- If using Supabase realtime, ensure the table is added to the publication
-- Run this in your Supabase SQL editor (requires appropriate rights):
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.unit_hours;
