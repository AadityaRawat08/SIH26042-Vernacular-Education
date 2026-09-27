
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
CREATE OR REPLACE FUNCTION private.my_school_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;
CREATE OR REPLACE FUNCTION private.teaches_classroom(_classroom_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = _classroom_id AND c.teacher_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION private.is_parent_of(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.parent_links p WHERE p.student_id = _student_id AND p.parent_user_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION private.owns_assessment(_assessment_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = _assessment_id AND a.teacher_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION private.can_view_student(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students st
    LEFT JOIN public.classrooms c ON c.id = st.classroom_id
    WHERE st.id = _student_id AND (c.teacher_id = auth.uid() OR private.is_parent_of(st.id))
  );
$$;
CREATE OR REPLACE FUNCTION private.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.phone)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'teacher'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- recreate policies against private helpers
DROP POLICY "profiles readable by self" ON public.profiles;
CREATE POLICY "profiles readable by self" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR (private.has_role(auth.uid(),'institute') AND school_id = private.my_school_id()));

DROP POLICY "schools readable by members" ON public.schools;
CREATE POLICY "schools readable by members" ON public.schools FOR SELECT TO authenticated USING (id = private.my_school_id());
DROP POLICY "schools managed by institute" ON public.schools;
CREATE POLICY "schools managed by institute" ON public.schools FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(),'institute') AND id = private.my_school_id())
WITH CHECK (private.has_role(auth.uid(),'institute') AND id = private.my_school_id());

DROP POLICY "classrooms owned by teacher" ON public.classrooms;
CREATE POLICY "classrooms owned by teacher" ON public.classrooms FOR ALL TO authenticated
USING (teacher_id = auth.uid() OR (private.has_role(auth.uid(),'institute') AND school_id = private.my_school_id()))
WITH CHECK (teacher_id = auth.uid());

DROP POLICY "students visible to teacher or parent" ON public.students;
CREATE POLICY "students visible to teacher or parent" ON public.students FOR SELECT TO authenticated
USING (private.teaches_classroom(classroom_id) OR private.is_parent_of(id)
  OR (private.has_role(auth.uid(),'institute') AND school_id = private.my_school_id()));
DROP POLICY "students managed by teacher" ON public.students;
CREATE POLICY "students managed by teacher" ON public.students FOR INSERT TO authenticated WITH CHECK (private.teaches_classroom(classroom_id));
DROP POLICY "students updated by teacher" ON public.students;
CREATE POLICY "students updated by teacher" ON public.students FOR UPDATE TO authenticated USING (private.teaches_classroom(classroom_id)) WITH CHECK (private.teaches_classroom(classroom_id));
DROP POLICY "students deleted by teacher" ON public.students;
CREATE POLICY "students deleted by teacher" ON public.students FOR DELETE TO authenticated USING (private.teaches_classroom(classroom_id));

DROP POLICY "lectures own" ON public.lecture_sessions;
CREATE POLICY "lectures own" ON public.lecture_sessions FOR ALL TO authenticated
USING (teacher_id = auth.uid() OR private.teaches_classroom(classroom_id)) WITH CHECK (teacher_id = auth.uid());

DROP POLICY "assessments own" ON public.assessments;
CREATE POLICY "assessments own" ON public.assessments FOR ALL TO authenticated
USING (teacher_id = auth.uid() OR private.teaches_classroom(classroom_id)) WITH CHECK (teacher_id = auth.uid());

DROP POLICY "questions via assessment" ON public.assessment_questions;
CREATE POLICY "questions via assessment" ON public.assessment_questions FOR ALL TO authenticated
USING (private.owns_assessment(assessment_id)) WITH CHECK (private.owns_assessment(assessment_id));

DROP POLICY "submissions via assessment" ON public.assessment_submissions;
CREATE POLICY "submissions via assessment" ON public.assessment_submissions FOR ALL TO authenticated
USING (private.owns_assessment(assessment_id) OR private.is_parent_of(student_id))
WITH CHECK (private.owns_assessment(assessment_id));

DROP POLICY "answers via submission" ON public.student_answers;
CREATE POLICY "answers via submission" ON public.student_answers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.assessment_submissions s WHERE s.id = submission_id AND private.owns_assessment(s.assessment_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.assessment_submissions s WHERE s.id = submission_id AND private.owns_assessment(s.assessment_id)));

DROP POLICY "progress via student" ON public.student_progress;
CREATE POLICY "progress via student" ON public.student_progress FOR ALL TO authenticated
USING (private.can_view_student(student_id)) WITH CHECK (private.can_view_student(student_id));

DROP POLICY "gaps via student" ON public.learning_gaps;
CREATE POLICY "gaps via student" ON public.learning_gaps FOR ALL TO authenticated
USING (private.can_view_student(student_id)) WITH CHECK (private.can_view_student(student_id));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.my_school_id();
DROP FUNCTION IF EXISTS public.teaches_classroom(uuid);
DROP FUNCTION IF EXISTS public.is_parent_of(uuid);
DROP FUNCTION IF EXISTS public.owns_assessment(uuid);
DROP FUNCTION IF EXISTS public.can_view_student(uuid);
DROP FUNCTION IF EXISTS public.handle_new_user();
