-- Applicants submit with the public (anon) key, which ships in the website's JavaScript, so anon must
-- only be able to add rows and files, never read them. Staff read applications in the Supabase
-- dashboard and the admin email, which use the service role and bypass these policies.

-- These let anyone holding the public key read every application. The form now makes the
-- application's id itself, so it no longer needs to read the row back after inserting it.
drop policy if exists "Allow anon select" on applications;
drop policy if exists "Allow anon select own id" on applications;

-- This let anyone list and download every uploaded pay stub, bank statement and tax form.
-- Uploading only needs the insert policy ("Public can upload application documents").
drop policy if exists "Public can read application documents" on storage.objects;

-- Match the limits the Documents step tells applicants about
update storage.buckets
set file_size_limit = 10485760,  -- 10MB
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']
where id = 'application-documents';

-- The Household step asks each additional occupant's age, not their date of birth
alter table household_members add column if not exists age integer check (age between 0 and 120);
