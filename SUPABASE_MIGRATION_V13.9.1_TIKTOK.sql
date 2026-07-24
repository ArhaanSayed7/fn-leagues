-- Run once in Supabase Dashboard > SQL Editor before using TikTok links.
alter table public.leagues
  add column if not exists tiktok_url text;
