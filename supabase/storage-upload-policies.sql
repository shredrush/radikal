-- Storage RLS policies to allow browser (anon) signed uploads.
--
-- The signed-upload flow posts files directly from the browser to Supabase
-- Storage to bypass the server-action body limit. The server issues a signed
-- upload URL (token) scoped to one content-addressed object path, and the
-- browser authenticates that POST with the anon/publishable key.
--
-- Without these policies an anonymous authenticated request cannot insert into
-- `storage.objects`, so the upload is rejected with:
--   "new row violates row-level security policy" (403 AccessDenied)
--
-- The token already authorizes the specific object, so allowing anon insert
-- into these public buckets does not open arbitrary objecc access beyond what
-- the public bucket already exposes. Run this in the Supabase SQL editor.

create policy "Allow anon insert into trip-media (signed uploads)"
on storage.objects for insert
to anon
with check (bucket_id = 'trip-media');

create policy "Allow anon insert into guide-media (signed uploads)"
on storage.objects for insert
to anon
with check (bucket_id = 'guide-media');
