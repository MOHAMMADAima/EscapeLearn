
-- ===== PROFILES =====
CREATE TYPE public.user_role AS ENUM ('student', 'teacher');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== ESCAPE ROOMS =====
CREATE TABLE public.escape_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  narrative_intro TEXT NOT NULL,
  pdf_content TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escape_rooms TO authenticated;
GRANT ALL ON public.escape_rooms TO service_role;
ALTER TABLE public.escape_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read escape rooms" ON public.escape_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can insert" ON public.escape_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner can update" ON public.escape_rooms FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Owner can delete" ON public.escape_rooms FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ===== ROOMS =====
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escape_room_id UUID NOT NULL REFERENCES public.escape_rooms(id) ON DELETE CASCADE,
  room_number INT NOT NULL,
  title TEXT NOT NULL,
  concept TEXT NOT NULL,
  narrative_description TEXT NOT NULL,
  puzzle_question TEXT NOT NULL,
  correct_answer_keywords TEXT NOT NULL,
  hint TEXT NOT NULL,
  is_boss_room BOOLEAN NOT NULL DEFAULT false,
  order_index INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX rooms_escape_room_idx ON public.rooms(escape_room_id, order_index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage rooms" ON public.rooms FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.escape_rooms er WHERE er.id = escape_room_id AND er.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.escape_rooms er WHERE er.id = escape_room_id AND er.created_by = auth.uid()));

-- ===== GAME SESSIONS =====
CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escape_room_id UUID NOT NULL REFERENCES public.escape_rooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  current_room_index INT NOT NULL DEFAULT 0,
  hints_used INT NOT NULL DEFAULT 0,
  score INT,
  pre_confidence_scores JSONB,
  post_confidence_scores JSONB
);
CREATE INDEX game_sessions_student_idx ON public.game_sessions(student_id);
CREATE INDEX game_sessions_room_idx ON public.game_sessions(escape_room_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_sessions TO authenticated;
GRANT ALL ON public.game_sessions TO service_role;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Student manages own sessions" ON public.game_sessions FOR ALL TO authenticated
  USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM public.escape_rooms er WHERE er.id = escape_room_id AND er.created_by = auth.uid()))
  WITH CHECK (auth.uid() = student_id);

-- ===== ROOM ATTEMPTS =====
CREATE TABLE public.room_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answer_given TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  hint_used BOOLEAN NOT NULL DEFAULT false,
  time_spent_seconds INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX room_attempts_session_idx ON public.room_attempts(session_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_attempts TO authenticated;
GRANT ALL ON public.room_attempts TO service_role;
ALTER TABLE public.room_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Student manages own attempts" ON public.room_attempts FOR ALL TO authenticated
  USING (auth.uid() = student_id OR EXISTS (
    SELECT 1 FROM public.game_sessions gs
    JOIN public.escape_rooms er ON er.id = gs.escape_room_id
    WHERE gs.id = session_id AND er.created_by = auth.uid()
  ))
  WITH CHECK (auth.uid() = student_id);
