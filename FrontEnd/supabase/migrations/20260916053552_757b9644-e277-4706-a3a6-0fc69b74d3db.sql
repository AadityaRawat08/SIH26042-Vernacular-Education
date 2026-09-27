
-- ============ enums ============
CREATE TYPE public.app_role AS ENUM ('teacher','institute','parent','student','admin');
CREATE TYPE public.gap_kind AS ENUM ('concept','language','both','mastered');
CREATE TYPE public.plan_status AS ENUM ('draft','generated','approved','taught');
CREATE TYPE public.translate_mode AS ENUM ('voice_voice','voice_text','text_voice','text_text');

-- ============ shared helpers ============
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ schools ============
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  board text NOT NULL DEFAULT 'State Board',
  address text,
  district text,
  school_type text,
  academic_year text NOT NULL DEFAULT '2025-26',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- ============ profiles ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  photo_url text,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  interface_language text NOT NULL DEFAULT 'en',
  teaching_language text NOT NULL DEFAULT 'hi',
  qualification text,
  experience_years int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.my_school_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
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
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "profiles readable by self" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR (public.has_role(auth.uid(),'institute') AND school_id = public.my_school_id()));
CREATE POLICY "profiles insert self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles update self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "roles readable by self" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "schools readable by members" ON public.schools FOR SELECT TO authenticated USING (id = public.my_school_id());
CREATE POLICY "schools managed by institute" ON public.schools FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'institute') AND id = public.my_school_id())
WITH CHECK (public.has_role(auth.uid(),'institute') AND id = public.my_school_id());

-- ============ classrooms & students ============
CREATE TABLE public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_name text NOT NULL,
  section text NOT NULL,
  subject text NOT NULL,
  student_count int NOT NULL DEFAULT 0,
  language text NOT NULL DEFAULT 'hi',
  support_language text NOT NULL DEFAULT 'sat',
  academic_year text NOT NULL DEFAULT '2025-26',
  current_topic text,
  understanding int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classrooms TO authenticated;
GRANT ALL ON public.classrooms TO service_role;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.teaches_classroom(_classroom_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = _classroom_id AND c.teacher_id = auth.uid());
$$;

CREATE POLICY "classrooms owned by teacher" ON public.classrooms FOR ALL TO authenticated
USING (teacher_id = auth.uid() OR (public.has_role(auth.uid(),'institute') AND school_id = public.my_school_id()))
WITH CHECK (teacher_id = auth.uid());

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  roll int NOT NULL DEFAULT 0,
  mother_tongue text NOT NULL DEFAULT 'sat',
  understanding int NOT NULL DEFAULT 0,
  weak_area text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.parent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'parent',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_user_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_links TO authenticated;
GRANT ALL ON public.parent_links TO service_role;
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_parent_of(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.parent_links p WHERE p.student_id = _student_id AND p.parent_user_id = auth.uid());
$$;

CREATE POLICY "parent links own" ON public.parent_links FOR SELECT TO authenticated USING (parent_user_id = auth.uid());
CREATE POLICY "students visible to teacher or parent" ON public.students FOR SELECT TO authenticated
USING (public.teaches_classroom(classroom_id) OR public.is_parent_of(id)
  OR (public.has_role(auth.uid(),'institute') AND school_id = public.my_school_id()));
CREATE POLICY "students managed by teacher" ON public.students FOR INSERT TO authenticated WITH CHECK (public.teaches_classroom(classroom_id));
CREATE POLICY "students updated by teacher" ON public.students FOR UPDATE TO authenticated USING (public.teaches_classroom(classroom_id)) WITH CHECK (public.teaches_classroom(classroom_id));
CREATE POLICY "students deleted by teacher" ON public.students FOR DELETE TO authenticated USING (public.teaches_classroom(classroom_id));

-- ============ curriculum ============
CREATE TABLE public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board text NOT NULL DEFAULT 'State Board',
  class_name text NOT NULL,
  subject text NOT NULL,
  title text NOT NULL,
  position int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  title text NOT NULL,
  position int NOT NULL DEFAULT 1,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.chapters TO authenticated;
GRANT SELECT ON public.topics TO authenticated;
GRANT ALL ON public.chapters TO service_role;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chapters readable" ON public.chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "topics readable" ON public.topics FOR SELECT TO authenticated USING (true);

-- ============ lesson plans & lectures ============
CREATE TABLE public.lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter text NOT NULL,
  topic text NOT NULL,
  duration_min int NOT NULL DEFAULT 40,
  language text NOT NULL DEFAULT 'hi',
  student_level text NOT NULL DEFAULT 'mixed',
  requirements text[] NOT NULL DEFAULT '{}',
  resources text[] NOT NULL DEFAULT '{}',
  teacher_note text,
  status public.plan_status NOT NULL DEFAULT 'generated',
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_plans TO authenticated;
GRANT ALL ON public.lesson_plans TO service_role;
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson plans own" ON public.lesson_plans FOR ALL TO authenticated
USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

CREATE TABLE public.lecture_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  lesson_plan_id uuid REFERENCES public.lesson_plans(id) ON DELETE SET NULL,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  chapter text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  duration_min int NOT NULL DEFAULT 40,
  objective text,
  activities text[] NOT NULL DEFAULT '{}',
  materials text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'planned',
  understanding int,
  language_support text,
  teacher_notes text,
  ai_summary text,
  adjusted_from text,
  adjustment_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lecture_sessions TO authenticated;
GRANT ALL ON public.lecture_sessions TO service_role;
ALTER TABLE public.lecture_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lectures own" ON public.lecture_sessions FOR ALL TO authenticated
USING (teacher_id = auth.uid() OR public.teaches_classroom(classroom_id)) WITH CHECK (teacher_id = auth.uid());

-- ============ assessments ============
CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  lecture_session_id uuid REFERENCES public.lecture_sessions(id) ON DELETE SET NULL,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'quiz',
  topic text NOT NULL,
  language text NOT NULL DEFAULT 'hi',
  difficulty text NOT NULL DEFAULT 'medium',
  scheduled_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessments own" ON public.assessments FOR ALL TO authenticated
USING (teacher_id = auth.uid() OR public.teaches_classroom(classroom_id)) WITH CHECK (teacher_id = auth.uid());

CREATE TABLE public.assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 1,
  prompt text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  answer text,
  difficulty text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_questions TO authenticated;
GRANT ALL ON public.assessment_questions TO service_role;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.owns_assessment(_assessment_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = _assessment_id AND a.teacher_id = auth.uid());
$$;
CREATE POLICY "questions via assessment" ON public.assessment_questions FOR ALL TO authenticated
USING (public.owns_assessment(assessment_id)) WITH CHECK (public.owns_assessment(assessment_id));

CREATE TABLE public.assessment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 100,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_submissions TO authenticated;
GRANT ALL ON public.assessment_submissions TO service_role;
ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submissions via assessment" ON public.assessment_submissions FOR ALL TO authenticated
USING (public.owns_assessment(assessment_id) OR public.is_parent_of(student_id))
WITH CHECK (public.owns_assessment(assessment_id));

CREATE TABLE public.student_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.assessment_submissions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  answer text,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_answers TO authenticated;
GRANT ALL ON public.student_answers TO service_role;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers via submission" ON public.student_answers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.assessment_submissions s WHERE s.id = submission_id AND public.owns_assessment(s.assessment_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.assessment_submissions s WHERE s.id = submission_id AND public.owns_assessment(s.assessment_id)));

-- ============ progress & AI ============
CREATE TABLE public.student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject text NOT NULL,
  topic text NOT NULL,
  mastery int NOT NULL DEFAULT 0,
  attendance int NOT NULL DEFAULT 100,
  participation int NOT NULL DEFAULT 0,
  language_support_need boolean NOT NULL DEFAULT false,
  observations text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_progress TO authenticated;
GRANT ALL ON public.student_progress TO service_role;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.can_view_student(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students st
    LEFT JOIN public.classrooms c ON c.id = st.classroom_id
    WHERE st.id = _student_id AND (c.teacher_id = auth.uid() OR public.is_parent_of(st.id))
  );
$$;
CREATE POLICY "progress via student" ON public.student_progress FOR ALL TO authenticated
USING (public.can_view_student(student_id)) WITH CHECK (public.can_view_student(student_id));

CREATE TABLE public.learning_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  topic text NOT NULL,
  kind public.gap_kind NOT NULL DEFAULT 'concept',
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_gaps TO authenticated;
GRANT ALL ON public.learning_gaps TO service_role;
ALTER TABLE public.learning_gaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gaps via student" ON public.learning_gaps FOR ALL TO authenticated
USING (public.can_view_student(student_id)) WITH CHECK (public.can_view_student(student_id));

CREATE TABLE public.ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_plan_id uuid REFERENCES public.lesson_plans(id) ON DELETE SET NULL,
  lecture_session_id uuid REFERENCES public.lecture_sessions(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  action_label text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_recommendations TO authenticated;
GRANT ALL ON public.ai_recommendations TO service_role;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recommendations own" ON public.ai_recommendations FOR ALL TO authenticated
USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

CREATE TABLE public.ai_generation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  request jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider text NOT NULL DEFAULT 'mock',
  duration_ms int,
  success boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_generation_history TO authenticated;
GRANT ALL ON public.ai_generation_history TO service_role;
ALTER TABLE public.ai_generation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history own" ON public.ai_generation_history FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "history insert own" ON public.ai_generation_history FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============ language ============
CREATE TABLE public.language_vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_en text NOT NULL,
  term_hi text,
  term_sat text,
  pronunciation text,
  example text,
  subject text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.language_vocabulary TO authenticated;
GRANT ALL ON public.language_vocabulary TO service_role;
ALTER TABLE public.language_vocabulary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vocabulary readable" ON public.language_vocabulary FOR SELECT TO authenticated USING (true);

CREATE TABLE public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  mode public.translate_mode NOT NULL DEFAULT 'text_text',
  source_language text NOT NULL,
  target_language text NOT NULL,
  source_text text,
  translated_text text,
  audio_url text,
  provider text NOT NULL DEFAULT 'mock',
  saved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.translations TO authenticated;
GRANT ALL ON public.translations TO service_role;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "translations own" ON public.translations FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.teacher_language_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term text NOT NULL,
  ai_output text,
  suggestion text,
  language text NOT NULL DEFAULT 'sat',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_language_feedback TO authenticated;
GRANT ALL ON public.teacher_language_feedback TO service_role;
ALTER TABLE public.teacher_language_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "language feedback own" ON public.teacher_language_feedback FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ resources, offline, notifications ============
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'worksheet',
  class_name text,
  subject text,
  topic text,
  language text NOT NULL DEFAULT 'hi',
  storage_url text,
  size_mb numeric NOT NULL DEFAULT 0,
  duration text,
  approved boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources readable" ON public.resources FOR SELECT TO authenticated USING (approved OR created_by = auth.uid());
CREATE POLICY "resources insert own" ON public.resources FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "resources update own" ON public.resources FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "resources delete own" ON public.resources FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE TABLE public.offline_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
  label text NOT NULL,
  size_mb numeric NOT NULL DEFAULT 0,
  includes text[] NOT NULL DEFAULT '{}',
  downloaded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offline_content TO authenticated;
GRANT ALL ON public.offline_content TO service_role;
ALTER TABLE public.offline_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offline own" ON public.offline_content FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_queue TO authenticated;
GRANT ALL ON public.sync_queue TO service_role;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync own" ON public.sync_queue FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'class',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications own" ON public.notifications FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ updated_at triggers ============
CREATE TRIGGER t_schools_updated BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_classrooms_updated BEFORE UPDATE ON public.classrooms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_students_updated BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_plans_updated BEFORE UPDATE ON public.lesson_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_lectures_updated BEFORE UPDATE ON public.lecture_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_assessments_updated BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_progress_updated BEFORE UPDATE ON public.student_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ shared curriculum + vocabulary seed ============
INSERT INTO public.chapters (id, board, class_name, subject, title, position) VALUES
('11111111-1111-4111-8111-000000000001','State Board','Class 2','Mathematics','Numbers and Addition',1),
('11111111-1111-4111-8111-000000000002','State Board','Class 2','Mathematics','Subtraction',2),
('11111111-1111-4111-8111-000000000003','State Board','Class 1','Mathematics','Counting to 50',1),
('11111111-1111-4111-8111-000000000004','State Board','Class 2','Environmental Studies','Plants Around Us',1);

INSERT INTO public.topics (chapter_id, title, position, summary) VALUES
('11111111-1111-4111-8111-000000000001','Place value',1,'Tens and ones using bundles of sticks'),
('11111111-1111-4111-8111-000000000001','Addition within 100',2,'Adding two-digit numbers with and without carrying'),
('11111111-1111-4111-8111-000000000002','Subtraction within 100',1,'Taking away with borrowing'),
('11111111-1111-4111-8111-000000000003','Counting in tens',1,'Grouping objects in tens'),
('11111111-1111-4111-8111-000000000004','Parts of a plant',1,'Root, stem, leaf, flower');

INSERT INTO public.language_vocabulary (term_en, term_hi, term_sat, pronunciation, example, subject, verified) VALUES
('Addition','जोड़','ᱡᱚᱲ','jo-r','We will learn addition today.','Mathematics',true),
('Subtraction','घटाव','ᱠᱟᱢᱤ','gha-taav','Subtraction means taking away.','Mathematics',true),
('Number','संख्या','ᱞᱮᱠᱷᱟ','sank-hya','Write the number on the board.','Mathematics',true),
('Plant','पौधा','ᱫᱟᱨᱮ','pau-dha','A plant has roots and leaves.','Environmental Studies',false),
('Sit down','बैठ जाओ','ᱫᱩᱲᱩᱵ ᱢᱮ','baith jao','Please sit down quietly.','Classroom',false);
