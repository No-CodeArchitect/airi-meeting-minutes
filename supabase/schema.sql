-- meetings 테이블
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  topic TEXT NOT NULL,
  attendees JSONB NOT NULL DEFAULT '[]',
  place TEXT,
  amount INTEGER NOT NULL,
  store_name TEXT NOT NULL,
  store_name_short TEXT,
  card_last4 CHAR(4),
  handler TEXT,
  minutes_content TEXT,
  future_plans TEXT,
  drive_folder_id TEXT,
  drive_folder_url TEXT,
  pdf_drive_id TEXT,
  pdf_url TEXT,
  receipt_drive_id TEXT,
  approval_doc_drive_id TEXT,
  folder_sequence INTEGER,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_meetings_date    ON meetings(date DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_handler ON meetings(handler);
CREATE INDEX IF NOT EXISTS idx_meetings_card    ON meetings(card_last4);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meetings_updated_at ON meetings;
CREATE TRIGGER trg_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS 활성화 (service_role은 RLS 우회)
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 전체 허용 정책
CREATE POLICY "authenticated users can do all" ON meetings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
