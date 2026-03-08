
-- Create topic category enum
CREATE TYPE public.topic_category AS ENUM (
  'job_hunting',
  'promotions',
  'discussions',
  'confessions',
  'local_help',
  'marketplace',
  'events',
  'alerts',
  'ideas',
  'random'
);

-- Add category column to topics
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS category public.topic_category DEFAULT 'discussions';
