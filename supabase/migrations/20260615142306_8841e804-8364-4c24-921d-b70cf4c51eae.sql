ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS mechanic text,
  ADD COLUMN IF NOT EXISTS game_data jsonb;

ALTER TABLE public.rooms ALTER COLUMN puzzle_question DROP NOT NULL;
ALTER TABLE public.rooms ALTER COLUMN correct_answer_keywords DROP NOT NULL;