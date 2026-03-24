import React, { useState, useEffect, useRef } from 'react';
import { useChat, ChatSeller } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MessageCircle, X, Send, ChevronLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export const ChatBox = () => {
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const { eligibleSellers, messages, loadingSellers, loadingMessages, fetchMessages, sendMessage } = useChat(user?.id);
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeSeller, setActiveSeller] = useState<ChatSeller | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSeller) {
      fetchMessages(activeSeller.user_id);
    }
  }, [activeSeller]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeller || !messageInput.trim()) return;
    
    const success = await sendMessage(activeSeller.user_id, messageInput);
    if (success) {
      setMessageInput('');
    }
  };

  // Only render for authenticated users who have bought things
  if (!user || eligibleSellers.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen ? (
        <div className="bg-background border shadow-xl rounded-2xl w-[350px] sm:w-[400px] h-[500px] max-h-[80vh] flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-5 duration-300 origin-bottom-right">
          
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-3">
              {activeSeller && (
                <button 
                  onClick={() => setActiveSeller(null)}
                  className="hover:bg-primary-foreground/20 p-1 rounded-full transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {activeSeller ? activeSeller.store_name : 'Your Sellers'}
                </h3>
                <p className="text-xs text-primary-foreground/80">
                  {activeSeller ? 'Online' : 'Chat with stores you bought from'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="hover:bg-primary-foreground/20 p-1.5 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden relative bg-muted/20">
            {!activeSeller ? (
              // Seller List
              <ScrollArea className="h-full">
                {loadingSellers ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                        <div className="w-12 h-12 bg-muted rounded-full" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {eligibleSellers.map((seller) => (
                      <button
                        key={seller.user_id}
                        onClick={() => setActiveSeller(seller)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 rounded-xl transition-colors text-left"
                      >
                        <Avatar className="h-12 w-12 border shadow-sm">
                          <AvatarImage src={seller.profile_url} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {seller.store_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{seller.store_name}</h4>
                          <p className="text-xs text-muted-foreground truncate">Tap to chat</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            ) : (
              // Active Chat
              <div className="flex flex-col h-full">
                <ScrollArea className="flex-1 p-4">
                  {loadingMessages ? (
                    <div className="flex justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-muted-foreground opacity-60 mt-10">
                      <MessageCircle className="h-12 w-12" />
                      <p className="text-sm">No messages yet. Say hello to {activeSeller.store_name}!</p>
                    </div>
                  ) : (
                    <div className="space-y-4 pb-2">
                      {messages.map((msg, i) => {
                        const isMe = msg.sender_id === user?.id;
                        const showTime = i === 0 || new Date(messages[i].created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 300000; // 5 mins
                        
                        return (
                          <div key={msg.id} className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                            {showTime && (
                              <span className="text-[10px] text-muted-foreground/70 my-1 mx-2">
                                {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                              </span>
                            )}
                            <div
                              className={cn(
                                "max-w-[75%] px-4 py-2 text-sm shadow-sm",
                                isMe 
                                  ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm" 
                                  : "bg-background border rounded-2xl rounded-tl-sm"
                              )}
                            >
                              {msg.content}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Input Area */}
                <div className="p-3 bg-background border-t">
                  <form onSubmit={handleSend} className="flex items-center gap-2 relative">
                    <Input
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="pr-10 rounded-full bg-muted/30 focus-visible:ring-primary/20 placeholder:text-muted-foreground/50 border-muted"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={!messageInput.trim()}
                      className="absolute right-1 h-8 w-8 rounded-full"
                    >
                      <Send className="h-4 w-4 ml-0.5" />
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Floating Action Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-premium hover:shadow-hover hover:scale-105 active:scale-95 transition-all duration-300 relative group overflow-hidden"
        >
          <div className="absolute inset-0 bg-primary/20 group-hover:bg-primary/30 blur-xl transition-colors" />
          <MessageCircle className="h-6 w-6 relative z-10" />
          
          {/* Unread badge logic could go here, e.g., if there's unread messages from any eligible seller */}
        </Button>
      )}
    </div>
  );
};
