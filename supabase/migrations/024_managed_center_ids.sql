-- Support partners managing multiple centers
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS managed_center_ids UUID[] DEFAULT '{}';
