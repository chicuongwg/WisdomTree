-- Batch E: the users table gets its first write path. avatar_key follows the
-- catalog_items.cover_photo_key precedent — a text object-store key, NULL when
-- the member has not chosen a picture.
ALTER TABLE users ADD COLUMN avatar_key text;
