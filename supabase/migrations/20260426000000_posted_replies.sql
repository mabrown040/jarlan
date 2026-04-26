CREATE TABLE public.posted_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES auth.users(id),
  extraction_id UUID,
  subreddit TEXT,
  post_url TEXT,
  reply_body TEXT NOT NULL,
  share_url TEXT NOT NULL,
  extraction_confidence TEXT,
  reply_style TEXT,
  word_count INTEGER,
  posted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.posted_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert their own posted replies"
  ON public.posted_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (operator_id = auth.uid());

CREATE POLICY "Admins can view all posted replies"
  ON public.posted_replies
  FOR SELECT
  TO authenticated
  USING (true);
