-- Shundori Phase 4 — product-images Storage bucket and object policies.
-- Object paths use products/<product-uuid>/<file> so policies can identify the
-- product that owns an image.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- The bucket is public, so anonymous HTTP downloads use /object/public URLs and
-- do not evaluate RLS. This SELECT policy governs Storage API listings/queries;
-- the application only renders paths belonging to active products. Delete an
-- image when deactivating a product if the URL must stop resolving immediately.
drop policy if exists "Active product images are public" on storage.objects;
create policy "Active product images are public"
on storage.objects for select to public
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = 'products'
  and exists (
    select 1
    from public.products
    where products.id::text = (storage.foldername(name))[2]
      and products.is_active = true
  )
);

-- All writes require an admin profile and a real product folder.
drop policy if exists "Admins manage product images" on storage.objects;
create policy "Admins manage product images"
on storage.objects for all to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = 'products'
  and public.is_admin()
)
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = 'products'
  and public.is_admin()
  and exists (
    select 1
    from public.products
    where products.id::text = (storage.foldername(name))[2]
  )
);
