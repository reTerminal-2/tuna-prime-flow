import React, { useState, useEffect, useRef } from 'react';
import { useSellerChat } from '@/hooks/useSellerChat';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Send, MoreVertical, MessageSquare, Phone, Video, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const SellerMessages = () => {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageInput, setMessageInput] = useState('');

  // Get current user (seller)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const {
    conversations,
    activeCustomer,
    setActiveCustomer,
    messages,
    loadingConversations,
    loadingMessages,
    sendMessage
  } = useSellerChat(user?.id);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    
    const success = await sendMessage(messageInput);
    if (success) {
      setMessageInput('');
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[500px] flex overflow-hidden rounded-xl border bg-background shadow-sm mt-2">
      
      {/* Sidebar: Conversation List */}
      <div className="w-full sm:w-[320px] md:w-[380px] flex-shrink-0 border-r flex flex-col bg-muted/10">
        
        {/* Header */}
        <div className="p-4 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Chats</h2>
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search Messenger" 
              className="pl-9 bg-muted/50 border-none rounded-full focus-visible:ring-1 focus-visible:ring-primary/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Contact List */}
        <ScrollArea className="flex-1 px-2">
          {loadingConversations ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                  <div className="w-14 h-14 bg-muted rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm space-y-2">
              <MessageSquare className="h-8 w-8 opacity-20" />
              <p>No messages found.</p>
            </div>
          ) : (
            <div className="space-y-1 pb-4">
              {filteredConversations.map((conv) => {
                const isActive = activeCustomer?.id === conv.customer.id;
                const isUnread = conv.unreadCount > 0;
                
                return (
                  <button
                    key={conv.customer.id}
                    onClick={() => setActiveCustomer(conv.customer)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group hover:bg-muted/60",
                      isActive ? "bg-primary/10 hover:bg-primary/15" : ""
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-14 w-14 border shadow-sm transition-transform group-hover:scale-105">
                        <AvatarImage src={conv.customer.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/5 text-primary text-lg">
                          {conv.customer.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      {isUnread && (
                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-primary border-2 border-background rounded-full" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className={cn(
                          "truncate text-sm",
                          isUnread ? "font-bold text-foreground" : "font-medium text-foreground/90"
                        )}>
                          {conv.customer.full_name || 'Customer'}
                        </h4>
                        {conv.lastMessage && (
                          <span className={cn(
                            "text-xs shrink-0 ml-2",
                            isUnread ? "font-medium text-primary" : "text-muted-foreground"
                          )}>
                            {format(new Date(conv.lastMessage.created_at), 'h:mm a')}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "truncate text-xs",
                          isUnread ? "font-bold text-foreground" : "text-muted-foreground"
                        )}>
                          {conv.lastMessage?.sender_id === user?.id && "You: "}
                          {conv.lastMessage?.content || 'Started a conversation'}
                        </p>
                        {isUnread && (
                          <span className="shrink-0 bg-primary text-primary-foreground text-[10px] font-bold h-5 min-w-[20px] rounded-full flex items-center justify-center px-1">
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
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
        !activeCustomer ? "hidden sm:flex" : "flex absolute sm:relative inset-0 z-20"
      )}>
        {!activeCustomer ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
            <div className="h-24 w-24 bg-muted/20 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-semibold text-foreground/70 mb-2">Your Messages</h3>
            <p className="text-sm">Select a conversation to start chatting.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="sm:hidden -ml-2 text-primary"
                  onClick={() => setActiveCustomer(null)}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={activeCustomer.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {activeCustomer.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm leading-tight">{activeCustomer.full_name || 'Customer'}</h3>
                  <p className="text-xs text-muted-foreground">Active Now</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-primary hover:text-primary hover:bg-primary/10 rounded-full h-9 w-9">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-primary hover:text-primary hover:bg-primary/10 rounded-full h-9 w-9">
                  <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-primary hover:text-primary hover:bg-primary/10 rounded-full h-9 w-9 hidden md:inline-flex">
                  <Info className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-muted/5 to-transparent">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <div className="space-y-6 pb-4 flex flex-col min-h-full justify-end">
                  {/* Hero/Start of chat */}
                  <div className="flex flex-col items-center justify-center mt-10 mb-8 space-y-3">
                    <Avatar className="h-20 w-20 border-2 border-background shadow-md">
                      <AvatarImage src={activeCustomer.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                        {activeCustomer.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                      <h4 className="font-bold text-lg">{activeCustomer.full_name || 'Customer'}</h4>
                      <p className="text-sm text-muted-foreground">TunaFlow User</p>
                    </div>
                  </div>

                  {messages.map((msg, i) => {
                    const isMe = msg.sender_id === user?.id;
                    const showTime = i === 0 || new Date(messages[i].created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 300000;
                    
                    return (
                      <div key={msg.id} className={cn("flex flex-col gap-1.5", isMe ? "items-end" : "items-start")}>
                        {showTime && (
                          <span className="text-[10px] font-medium text-muted-foreground/60 my-2 mx-1 self-center">
                            {format(new Date(msg.created_at), 'MMMM d, yyyy h:mm a')}
                          </span>
                        )}
                        <div className="flex items-end gap-2 max-w-[75%] lg:max-w-[65%] group">
                          {!isMe && (
                            <Avatar className="h-6 w-6 shrink-0 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <AvatarImage src={activeCustomer.avatar_url || ''} />
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                                {activeCustomer.full_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              "px-4 py-2 text-[15px] leading-relaxed shadow-sm break-words",
                              isMe 
                                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-[4px]" 
                                : "bg-[#f0f2f5] dark:bg-muted text-foreground rounded-2xl rounded-bl-[4px]"
                            )}
                          >
                            {msg.content}
                          </div>
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
              <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto items-end">
                <Button variant="ghost" size="icon" type="button" className="text-primary hover:text-primary hover:bg-primary/10 rounded-full shrink-0 mb-0.5 h-9 w-9 disabled:opacity-50">
                   <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-13h2v4h-2zm0 6h2v2h-2z"></path></svg>
                </Button>
                <div className="flex-1 relative bg-muted/40 rounded-3xl border focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary/30 transition-shadow">
                  <Input
                    placeholder="Aa"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="border-0 bg-transparent py-3 px-4 shadow-none focus-visible:ring-0 rounded-3xl text-[15px] min-h-[44px]"
                  />
                  <div className="absolute right-2 top-0 bottom-0 flex items-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      type="button"
                      className="text-primary hover:text-primary hover:bg-primary/10 rounded-full h-8 w-8"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm3.536 14.536l-1.414 1.414L12 15.828l-2.122 2.122-1.414-1.414L10.586 14l-2.122-2.122 1.414-1.414L12 12.172l2.122-2.122 1.414 1.414L13.414 14l2.122 2.122z"></path></svg>
                    </Button>
                  </div>
                </div>
                {messageInput.trim() ? (
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="rounded-full shrink-0 mb-0.5 h-10 w-10 bg-primary hover:bg-primary/90 shadow-sm"
                  >
                    <Send className="h-4 w-4 ml-0.5" />
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="ghost"
                    className="rounded-full shrink-0 mb-0.5 h-10 w-10 text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM8.5 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM12 18c2.28 0 4.22-1.35 5.08-3.29h-10.16c.86 1.94 2.8 3.29 5.08 3.29z"></path></svg>
                  </Button>
                )}
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SellerMessages;
