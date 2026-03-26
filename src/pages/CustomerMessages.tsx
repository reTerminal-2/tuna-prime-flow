import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MessageSquare, ArrowLeft, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ChatSeller } from '@/hooks/useChat';

const CustomerMessages = () => {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [activeSeller, setActiveSeller] = useState<ChatSeller | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate('/auth?returnUrl=/messages');
        return;
      }
      setUser(session.user);
    });
  }, [navigate]);

  const {
    eligibleSellers,
    messages,
    loadingSellers,
    loadingMessages,
    fetchMessages,
    sendMessage
  } = useChat(user?.id);

  // Auto-select first seller if only one
  useEffect(() => {
    if (eligibleSellers.length === 1 && !activeSeller) {
      handleSelectSeller(eligibleSellers[0]);
    }
  }, [eligibleSellers]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectSeller = (seller: ChatSeller) => {
    setActiveSeller(seller);
    fetchMessages(seller.user_id);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeSeller) return;
    const success = await sendMessage(activeSeller.user_id, messageInput);
    if (success) setMessageInput('');
  };

  if (!user) return null;

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[500px] flex overflow-hidden rounded-xl border bg-background shadow-sm">

      {/* Sidebar: Seller List */}
      <div className={cn(
        "w-full sm:w-[300px] flex-shrink-0 border-r flex flex-col bg-muted/10",
        activeSeller ? "hidden sm:flex" : "flex"
      )}>
        <div className="p-4 border-b bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="sm:hidden rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold tracking-tight">Messages</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Chat with sellers you've ordered from</p>
        </div>

        <ScrollArea className="flex-1 px-2 py-2">
          {loadingSellers ? (
            <div className="space-y-3 p-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                  <div className="w-12 h-12 bg-muted rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : eligibleSellers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm space-y-3 px-4 text-center">
              <Store className="h-10 w-10 opacity-20" />
              <p>You haven't ordered from any sellers yet. Place an order to start chatting!</p>
            </div>
          ) : (
            <div className="space-y-1 pb-4">
              {eligibleSellers.map((seller) => {
                const isActive = activeSeller?.user_id === seller.user_id;
                return (
                  <button
                    key={seller.user_id}
                    onClick={() => handleSelectSeller(seller)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left hover:bg-muted/60",
                      isActive ? "bg-primary/10 hover:bg-primary/15" : ""
                    )}
                  >
                    <Avatar className="h-12 w-12 border shadow-sm">
                      <AvatarImage src={seller.profile_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {seller.store_name?.charAt(0) || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{seller.store_name}</h4>
                      <p className="text-xs text-muted-foreground truncate">Tap to chat</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-background relative",
        !activeSeller ? "hidden sm:flex" : "flex absolute sm:relative inset-0 z-20"
      )}>
        {!activeSeller ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
            <div className="h-24 w-24 bg-muted/20 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-semibold text-foreground/70 mb-2">Your Messages</h3>
            <p className="text-sm">Select a seller to start chatting.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b flex items-center gap-3 px-4 bg-background/95 backdrop-blur shadow-sm shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden -ml-2 text-primary"
                onClick={() => setActiveSeller(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={activeSeller.profile_url} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {activeSeller.store_name?.charAt(0) || 'S'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-sm leading-tight">{activeSeller.store_name}</h3>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-muted/5 to-transparent">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <div className="space-y-4 pb-4 flex flex-col min-h-full justify-end">
                  {/* Chat header */}
                  <div className="flex flex-col items-center mt-10 mb-6 space-y-2">
                    <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                      <AvatarImage src={activeSeller.profile_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xl">
                        {activeSeller.store_name?.charAt(0) || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <h4 className="font-bold">{activeSeller.store_name}</h4>
                      <p className="text-xs text-muted-foreground">TunaFlow Seller</p>
                    </div>
                  </div>

                  {messages.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      No messages yet. Say hello! 👋
                    </p>
                  )}

                  {messages.map((msg, i) => {
                    const isMe = msg.sender_id === user?.id;
                    const showTime = i === 0 || new Date(messages[i].created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 300000;
                    return (
                      <div key={msg.id} className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                        {showTime && (
                          <span className="text-[10px] font-medium text-muted-foreground/60 my-1 self-center">
                            {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                          </span>
                        )}
                        <div
                          className={cn(
                            "px-4 py-2 text-[15px] leading-relaxed shadow-sm break-words max-w-[75%] lg:max-w-[65%]",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-2xl rounded-br-[4px]"
                              : "bg-[#f0f2f5] dark:bg-muted text-foreground rounded-2xl rounded-bl-[4px]"
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} className="h-1" />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-3 bg-background border-t shrink-0">
              <form onSubmit={handleSend} className="flex gap-2 max-w-3xl mx-auto items-center">
                <div className="flex-1 relative bg-muted/40 rounded-3xl border focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary/30 transition-shadow">
                  <Input
                    placeholder="Message seller..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="border-0 bg-transparent py-3 px-4 shadow-none focus-visible:ring-0 rounded-3xl text-[15px] min-h-[44px]"
                  />
                </div>
                <Button
                  type="submit"
                  size="icon"
                  disabled={!messageInput.trim()}
                  className="rounded-full shrink-0 h-10 w-10 bg-primary hover:bg-primary/90 shadow-sm disabled:opacity-40"
                >
                  <Send className="h-4 w-4 ml-0.5" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerMessages;
