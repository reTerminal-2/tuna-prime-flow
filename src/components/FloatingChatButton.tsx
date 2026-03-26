import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface CartSeller {
  user_id: string;
  store_name: string;
  profile_url: string;
}

// Read sellers from cart localStorage
const getCartSellers = (): CartSeller[] => {
  try {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const seen = new Set<string>();
    const sellers: CartSeller[] = [];
    for (const item of cart) {
      if (item.seller_id && !seen.has(item.seller_id)) {
        seen.add(item.seller_id);
        sellers.push({
          user_id: item.seller_id,
          store_name: item.seller_store_name || 'Seller',
          profile_url: item.seller_profile_url || '',
        });
      }
    }
    return sellers;
  } catch {
    return [];
  }
};

const FloatingChatButton = () => {
  const [user, setUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cartSellers, setCartSellers] = useState<CartSeller[]>([]);
  const [justAdded, setJustAdded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Watch cart changes
  useEffect(() => {
    const update = () => {
      const prev = cartSellers.length;
      const sellers = getCartSellers();
      setCartSellers(sellers);
      // Animate when a new seller is added
      if (sellers.length > prev) {
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2000);
      }
    };
    update();
    window.addEventListener('cartUpdated', update);
    return () => window.removeEventListener('cartUpdated', update);
  }, []);

  // Fetch unread message count
  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages' as any)
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false);
      setUnreadCount(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel('floating-chat-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => fetchUnread())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => fetchUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Only show for logged-in customers
  const isCustomer = user && user.user_metadata?.role === 'user';
  const isOnMessagesPage = location.pathname === '/messages';
  const primarySeller = cartSellers[0];
  const hasCartSeller = cartSellers.length > 0;

  if (!isCustomer || isOnMessagesPage) return null;

  return (
    <button
      onClick={() => navigate('/messages')}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-2 shadow-xl transition-all duration-300",
        "hover:scale-105 active:scale-95",
        hasCartSeller
          ? "bg-white border border-primary/20 rounded-full pl-2 pr-3 py-2 shadow-lg"
          : "bg-primary text-primary-foreground h-14 w-14 rounded-full",
        justAdded && "ring-4 ring-primary/30 scale-110"
      )}
      aria-label="Open messages"
    >
      {hasCartSeller ? (
        <>
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-primary/30">
              <AvatarImage src={primarySeller.profile_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                {primarySeller.store_name?.charAt(0) || 'S'}
              </AvatarFallback>
            </Avatar>
            {/* Green online dot */}
            <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs font-semibold text-gray-800 max-w-[90px] truncate">
              {primarySeller.store_name}
            </span>
            <span className="text-[10px] text-green-600 font-medium">Chat now</span>
          </div>
          {(unreadCount > 0 || cartSellers.length > 1) && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold h-5 min-w-[20px] rounded-full flex items-center justify-center px-1 ml-1">
              {unreadCount > 0 ? unreadCount : `+${cartSellers.length - 1}`}
            </span>
          )}
        </>
      ) : (
        <>
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[11px] font-bold h-5 min-w-[20px] rounded-full flex items-center justify-center px-1 shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </>
      )}
    </button>
  );
};

export default FloatingChatButton;
