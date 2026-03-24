-- Create public.messages table
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references auth.users(id) not null,
  receiver_id uuid references auth.users(id) not null,
  content text not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.messages enable row level security;

-- Create policies
create policy "Users can view their own messages." on public.messages 
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send messages." on public.messages 
  for insert with check (auth.uid() = sender_id);

-- Optional: Add an index to speed up message querying
create index messages_sender_receiver_idx on public.messages(sender_id, receiver_id);
create index messages_created_at_idx on public.messages(created_at);
