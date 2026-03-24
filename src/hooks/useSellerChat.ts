import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChatMessage } from './useChat';

export interface CustomerProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Conversation {
  customer: CustomerProfile;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

export const useSellerChat = (sellerId: string | undefined) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeCustomer, setActiveCustomer] = useState<CustomerProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, conv) => acc + conv.unreadCount, 0);
  }, [conversations]);

  // Fetch all conversations for the seller
  useEffect(() => {
    if (!sellerId) {
      setLoadingConversations(false);
      return;
    }

    const fetchConversations = async () => {
      try {
        // 1. Fetch all messages where seller is involved
        const { data: allMessages, error: msgsError } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${sellerId},receiver_id.eq.${sellerId}`)
          .order('created_at', { ascending: false });

        if (msgsError) throw msgsError;

        if (!allMessages || allMessages.length === 0) {
          setConversations([]);
          setLoadingConversations(false);
          return;
        }

        // 2. Extract unique customer IDs
        const customersMap = new Map<string, { lastMessage: ChatMessage | null, unreadCount: number }>();
        
        allMessages.forEach((msg: any) => {
          const isSender = msg.sender_id === sellerId;
          const customerId = isSender ? msg.receiver_id : msg.sender_id;
          
          if (!customersMap.has(customerId)) {
            customersMap.set(customerId, {
              lastMessage: msg,
              unreadCount: (!isSender && !msg.read) ? 1 : 0
            });
          } else {
            const data = customersMap.get(customerId)!;
            if (!isSender && !msg.read) {
              data.unreadCount += 1;
            }
          }
        });

        const customerIds = Array.from(customersMap.keys());

        if (customerIds.length === 0) {
          setConversations([]);
          setLoadingConversations(false);
          return;
        }

        // 3. Fetch customer profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', customerIds);

        if (profilesError) throw profilesError;

        // 4. Combine data
        const convos: Conversation[] = profiles?.map(profile => ({
          customer: {
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          },
          lastMessage: customersMap.get(profile.id)?.lastMessage || null,
          unreadCount: customersMap.get(profile.id)?.unreadCount || 0
        })).sort((a, b) => {
          const timeA = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
          const timeB = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
          return timeB - timeA;
        }) || [];

        setConversations(convos);
      } catch (error) {
        console.error("Error fetching seller conversations:", error);
      } finally {
        setLoadingConversations(false);
      }
    };

    fetchConversations();
  }, [sellerId]);

  // Fetch messages for active customer
  useEffect(() => {
    if (!sellerId || !activeCustomer) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${sellerId},receiver_id.eq.${activeCustomer.id}),and(sender_id.eq.${activeCustomer.id},receiver_id.eq.${sellerId})`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data as ChatMessage[] || []);

        // Mark unread messages from this customer as read
        const unreadIds = (data as ChatMessage[])
          .filter(m => m.receiver_id === sellerId && !m.read)
          .map(m => m.id);

        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ read: true } as any)
            .in('id', unreadIds);

          // Update local unread count in conversations array
          setConversations(prev => prev.map(c => 
            c.customer.id === activeCustomer.id 
              ? { ...c, unreadCount: 0 } 
              : c
          ));
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load messages");
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [sellerId, activeCustomer]);

  const sendMessage = async (content: string) => {
    if (!sellerId || !activeCustomer || !content.trim()) return false;
    
    const tempId = crypto.randomUUID();
    const newMessage: ChatMessage = {
      id: tempId,
      sender_id: sellerId,
      receiver_id: activeCustomer.id,
      content,
      read: false,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Optimistically update conversation list
    setConversations(prev => {
      const existing = prev.find(c => c.customer.id === activeCustomer.id);
      const filtered = prev.filter(c => c.customer.id !== activeCustomer.id);
      
      if (existing) {
        return [{
          ...existing,
          lastMessage: newMessage
        }, ...filtered];
      }
      return prev;
    });

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          sender_id: sellerId,
          receiver_id: activeCustomer.id,
          content
        }] as any);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      setMessages(prev => prev.filter(m => m.id !== tempId));
      return false;
    }
  };

  // Subscribe to real-time updates globally
  useEffect(() => {
    if (!sellerId) return;

    const channel = supabase
      .channel('public:messages:seller')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${sellerId}`
      }, async (payload) => {
        const newMsg = payload.new as ChatMessage;
        
        // If it's the active chat, append to messages and mark as read
        if (activeCustomer && newMsg.sender_id === activeCustomer.id) {
          setMessages(prev => [...prev, newMsg]);
          await supabase.from('messages').update({ read: true } as any).eq('id', newMsg.id);
          
          // Update last message
          setConversations(prev => prev.map(c => 
            c.customer.id === newMsg.sender_id 
              ? { ...c, lastMessage: newMsg } 
              : c
          ));
        } else {
          // If not active chat, increment unread count
          setConversations(prev => {
            const exists = prev.find(c => c.customer.id === newMsg.sender_id);
            if (exists) {
              return prev.map(c => 
                c.customer.id === newMsg.sender_id 
                  ? { ...c, lastMessage: newMsg, unreadCount: c.unreadCount + 1 }
                  : c
              );
            } else {
              // We need to fetch the profile for the new sender
              // To avoid complex state logic here, simply re-fetching all could work
              // or just fetch that single user profile and prepend
              supabase.from('profiles').select('id, full_name, avatar_url').eq('id', newMsg.sender_id).single()
              .then(({ data }) => {
                if (data) {
                  setConversations(current => [{
                    customer: { id: data.id, full_name: data.full_name, avatar_url: data.avatar_url },
                    lastMessage: newMsg,
                    unreadCount: 1
                  }, ...current]);
                }
              });
              return prev;
            }
          });
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${sellerId}`
      }, (payload) => {
        // Handle sent messages echoing across multiple tabs
         const newMsg = payload.new as ChatMessage;
         setMessages(prev => {
           if(prev.some(m => m.id === newMsg.id || (m.content === newMsg.content && Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 5000))) return prev;
           return [...prev, newMsg];
         });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sellerId, activeCustomer]);

  return {
    conversations,
    activeCustomer,
    setActiveCustomer,
    messages,
    loadingConversations,
    loadingMessages,
    sendMessage,
    totalUnreadCount
  };
};
