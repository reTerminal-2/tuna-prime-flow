-- Enable Realtime subscriptions for the messages table
-- This allows the chat UI to update instantly without requiring a page refresh
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
