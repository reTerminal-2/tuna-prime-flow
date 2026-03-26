import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface ChatSeller {
  user_id: string;
  store_name: string;
  profile_url: string;
}

// Read unique sellers from cart items stored in localStorage
const getSellersFromCart = (): ChatSeller[] => {
  try {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const seen = new Set<string>();
    const sellers: ChatSeller[] = [];
    for (const item of cart) {
      if (item.seller_id && !seen.has(item.seller_id)) {
        seen.add(item.seller_id);
        sellers.push({
          user_id: item.seller_id,
          store_name: item.seller_store_name || 'TunaFlow Store',
          profile_url: item.seller_profile_url || '',
        });
      }
    }
    return sellers;
  } catch {
    return [];
  }
};

export const useChat = (currentUserId: string | undefined) => {
  const [eligibleSellers, setEligibleSellers] = useState<ChatSeller[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Merge cart sellers + order sellers into a single deduplicated list
  const refreshSellers = async () => {
    // Always include cart sellers first (instant, no network needed)
    const cartSellers = getSellersFromCart();
    const cartSellerIds = new Set(cartSellers.map(s => s.user_id));

    // Then fetch order-based sellers if user is logged in
    let orderSellers: ChatSeller[] = [];
    if (currentUserId) {
      try {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select(`
            products (
              user_id
            ),
            orders!inner (
              user_id
            )
          `)
          .eq('orders.user_id', currentUserId);

        const sellerIds = new Set<string>();
        orderItems?.forEach((item: any) => {
          if (item.products?.user_id && !cartSellerIds.has(item.products.user_id)) {
            sellerIds.add(item.products.user_id);
          }
        });

        if (sellerIds.size > 0) {
          const { data: stores } = await supabase
            .from('store_settings')
            .select('user_id, store_name, profile_url')
            .in('user_id', Array.from(sellerIds));

          orderSellers = stores?.map(s => ({
            user_id: s.user_id || '',
            store_name: s.store_name || 'Unknown Store',
            profile_url: s.profile_url || ''
          })).filter(s => s.user_id) || [];
        }
      } catch (error) {
        console.error('Error fetching order sellers:', error);
      }
    }

    setEligibleSellers([...cartSellers, ...orderSellers]);
    setLoadingSellers(false);
  };

  useEffect(() => {
    refreshSellers();

    // Re-run when cart changes (cartUpdated event)
    const onCartUpdated = () => refreshSellers();
    window.addEventListener('cartUpdated', onCartUpdated);
    return () => window.removeEventListener('cartUpdated', onCartUpdated);
  }, [currentUserId]);

  const fetchMessages = async (sellerId: string) => {
    if (!currentUserId) return;
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${sellerId}),and(sender_id.eq.${sellerId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data as ChatMessage[] || []);
      
      // Mark as read
      const unreadIds = (data as ChatMessage[])
        ?.filter(m => m.receiver_id === currentUserId && !m.read)
        .map(m => m.id);
        
      if (unreadIds && unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ read: true } as any)
          .in('id', unreadIds);
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async (sellerId: string, content: string) => {
    if (!currentUserId || !content.trim()) return false;
    
    const tempId = crypto.randomUUID();
    const newMessage: ChatMessage = {
      id: tempId,
      sender_id: currentUserId,
      receiver_id: sellerId,
      content,
      read: false,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          sender_id: currentUserId,
          receiver_id: sellerId,
          content
        }] as any);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== tempId));
      return false;
    }
  };

  // Subscribe to new messages
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${currentUserId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${currentUserId}`
      }, (payload) => {
        setMessages(prev => {
          const exists = prev.some(m => m.content === payload.new.content && Math.abs(new Date(m.created_at).getTime() - new Date(payload.new.created_at).getTime()) < 5000);
          if (exists) return prev;
          return [...prev, payload.new as ChatMessage];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return {
    eligibleSellers,
    messages,
    loadingSellers,
    loadingMessages,
    fetchMessages,
    sendMessage
  };
};
