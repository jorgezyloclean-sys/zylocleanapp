-- Migration: Add email fields to clients and staff
-- Run this in Supabase SQL Editor

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS email text;
