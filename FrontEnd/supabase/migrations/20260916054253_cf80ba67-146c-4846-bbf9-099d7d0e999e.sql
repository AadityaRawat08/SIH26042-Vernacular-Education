ALTER TABLE public.schools ADD COLUMN created_by uuid DEFAULT auth.uid();
DROP POLICY "schools readable by members" ON public.schools;
CREATE POLICY "schools readable by members" ON public.schools FOR SELECT TO authenticated
USING (id = private.my_school_id() OR created_by = auth.uid());
DROP POLICY "schools insert by member" ON public.schools;
CREATE POLICY "schools insert by member" ON public.schools FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());