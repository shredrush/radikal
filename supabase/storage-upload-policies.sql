-- Storage RLS policy cleanup for server-issued signed uploads.
--
-- The signed-upload flow posts files directly from the browser to Supabase
-- Storage to bypass the server-action body limit. The server issues a signed
-- upload URL (token) scoped to one content-addressed object path, and the
-- browser uploads directly to that URL. The token authorizes exactly one
-- object path; no browser Storage credentials are needed.
--
-- `createSignedUploadUrl` is called by the application server with the service
-- role, which bypasses RLS. The subsequent signed upload does not require an
-- `storage.objects` policy. Do not grant `anon` insert: an anon insert policy
-- lets anyone holding the public project key write arbitrary objects.
--
-- Run this in the Supabase SQL editor to remove the previously deployed broad
-- policies. Buckets remain public for reads only.

drop policy if exists "Allow anon insert into trip-media (signed uploads)" on storage.objects;
drop policy if exists "Allow anon insert into guide-media (signed uploads)" on storage.objects;
drop policy if exists "Allow anon insert into profile-media (signed uploads)" on storage.objects;
