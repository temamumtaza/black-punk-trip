-- delete_owned_trip() removes relational records and their receipt objects.
-- These policies make that owner-only operation valid under RLS as well,
-- including on projects where the function owner does not bypass storage RLS.

create policy "trip owners can delete their trips"
  on public.trips for delete
  to public
  using (created_by = auth.uid());

create policy "trip owners can delete receipts"
  on storage.objects for delete
  to public
  using (
    bucket_id = 'trip-receipts'
    and exists (
      select 1
      from public.trips t
      where t.id = ((storage.foldername(name))[1])::uuid
        and t.created_by = auth.uid()
    )
  );
