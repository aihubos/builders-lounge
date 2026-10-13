-- Existing prompt posts keep their content and receive an optional cover.
ALTER TABLE lounge_prompt_posts ADD COLUMN image_url TEXT NOT NULL DEFAULT '';
