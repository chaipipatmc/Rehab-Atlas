-- Add last_login and login_count to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- RPC to atomically track login
CREATE OR REPLACE FUNCTION track_user_login(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET last_login = NOW(),
      login_count = COALESCE(login_count, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
