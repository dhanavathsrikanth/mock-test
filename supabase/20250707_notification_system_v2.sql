-- ============================================================
-- Notification System V2 - Production-Grade Schema Migration
-- ============================================================

-- Drop old enum types if they exist to allow clean re-creation
DROP TYPE IF EXISTS notification_type_enum CASCADE;
DROP TYPE IF EXISTS notification_channel_enum CASCADE;
DROP TYPE IF EXISTS notification_priority_enum CASCADE;
DROP TYPE IF EXISTS notification_status_enum CASCADE;
DROP TYPE IF EXISTS delivery_status_enum CASCADE;
DROP TYPE IF EXISTS notification_event_type_enum CASCADE;

-- Create enum types
CREATE TYPE notification_type_enum AS ENUM (
  'system', 'success', 'warning', 'error', 'info',
  'achievement', 'reminder', 'marketing', 'exam',
  'mock_test', 'pyq', 'leaderboard', 'streak',
  'friend_activity', 'feature_release', 'announcement', 'admin'
);

CREATE TYPE notification_channel_enum AS ENUM ('in_app', 'push', 'email');
CREATE TYPE notification_priority_enum AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE notification_status_enum AS ENUM (
  'pending', 'delivered', 'failed', 'archived', 'deleted', 'scheduled', 'expired'
);
CREATE TYPE delivery_status_enum AS ENUM ('pending', 'sent', 'delivered', 'failed', 'retrying', 'bounced');
CREATE TYPE notification_event_type_enum AS ENUM (
  'user_registered', 'test_completed', 'result_generated', 'leaderboard_updated',
  'pyqs_published', 'mock_test_published', 'friend_request_accepted',
  'achievement_unlocked', 'streak_updated', 'profile_completed',
  'admin_announcement', 'subscription_updated', 'password_changed',
  'daily_reminder', 'streak_alert', 'daily_question_alert', 'exam_date_alert', 'custom'
);

-- ============================================================
-- Core Notifications Table (Enhanced)
-- ============================================================
-- Migrate existing notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deep_link_url text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS status notification_status_enum DEFAULT 'delivered';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority notification_priority_enum DEFAULT 'normal';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel notification_channel_enum DEFAULT 'in_app';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS group_key text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Set read_at for existing read notifications
UPDATE notifications SET read_at = created_at WHERE is_read = true AND read_at IS NULL;

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_group ON notifications(user_id, group_key) WHERE group_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- ============================================================
-- Notification Preferences (Enhanced)
-- ============================================================
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS push_enabled boolean DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS email_enabled boolean DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS system boolean DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS success boolean DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS warning boolean DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS error boolean DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS info boolean DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS achievement boolean DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS reminder boolean DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS marketing boolean DEFAULT false;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS exam boolean DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS mock_test boolean DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS pyq boolean DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS leaderboard boolean DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS streak boolean DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS friend_activity boolean DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS feature_release boolean DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS announcement boolean DEFAULT true;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_start time;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_end time;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- ============================================================
-- Push Subscriptions (Enhanced)
-- ============================================================
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS endpoint text;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS p256dh text;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS auth text;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Migrate existing subscription data if needed
UPDATE push_subscriptions
SET endpoint = subscription->>'endpoint',
    p256dh = (subscription->'keys'->>'p256dh'),
    auth = (subscription->'keys'->>'auth')
WHERE endpoint IS NULL AND subscription IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON push_subscriptions(endpoint);

-- ============================================================
-- Notification Events Table (Event-Driven Architecture)
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type notification_event_type_enum NOT NULL,
  user_id text NOT NULL,
  payload jsonb DEFAULT '{}',
  processed boolean DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_events_type ON notification_events(event_type);
CREATE INDEX IF NOT EXISTS idx_notif_events_user ON notification_events(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_events_unprocessed ON notification_events(processed, created_at)
  WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_notif_events_created ON notification_events(created_at DESC);

-- ============================================================
-- Delivery Logs Table
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel notification_channel_enum NOT NULL,
  status delivery_status_enum NOT NULL DEFAULT 'pending',
  error_message text,
  attempts integer DEFAULT 0,
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_notif ON delivery_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_status ON delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_channel ON delivery_logs(channel);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_created ON delivery_logs(created_at DESC);

-- ============================================================
-- Notification Queue Table (Internal Queue)
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  priority notification_priority_enum DEFAULT 'normal',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead')),
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  error text,
  scheduled_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_queue_status_priority ON notification_queue(status, priority, scheduled_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_scheduled ON notification_queue(scheduled_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_queue_created ON notification_queue(created_at DESC);

-- ============================================================
-- RLS Policies
-- ============================================================

-- Notifications: users can only see their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
CREATE POLICY "Admins can view all notifications"
  ON notifications FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'admin')
  );

-- Notification Events
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage events" ON notification_events;
CREATE POLICY "Service role can manage events"
  ON notification_events FOR ALL
  USING (true);

-- Delivery Logs
ALTER TABLE delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage delivery logs" ON delivery_logs;
CREATE POLICY "Service role can manage delivery logs"
  ON delivery_logs FOR ALL
  USING (true);

-- Notification Queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage queue" ON notification_queue;
CREATE POLICY "Service role can manage queue"
  ON notification_queue FOR ALL
  USING (true);

-- Push Subscriptions: users manage their own
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role full access push_subscriptions" ON push_subscriptions;
CREATE POLICY "Service role full access push_subscriptions"
  ON push_subscriptions FOR ALL
  USING (true);

-- Notification Preferences: users manage their own
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role full access notification_preferences" ON notification_preferences;
CREATE POLICY "Service role full access notification_preferences"
  ON notification_preferences FOR ALL
  USING (true);

-- ============================================================
-- Helper Functions
-- ============================================================

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE notifications
  SET status = 'expired'
  WHERE expires_at IS NOT NULL
    AND expires_at < now()
    AND status NOT IN ('expired', 'deleted');
END;
$$;

-- Function to clean up old delivery logs (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_delivery_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM delivery_logs
  WHERE created_at < now() - interval '30 days';
END;
$$;

-- Function to clean up old notification events (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_notification_events()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM notification_events
  WHERE created_at < now() - interval '7 days';
END;
$$;

-- Function to clean up expired push subscriptions
CREATE OR REPLACE FUNCTION cleanup_stale_push_subscriptions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM push_subscriptions
  WHERE updated_at < now() - interval '90 days';
END;
$$;
