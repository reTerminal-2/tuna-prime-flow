import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { aiService, ChatResponse } from "@/services/aiService";
import { toast } from "sonner";
import { ChatMessage, ChatSession, AIContextType } from "@/types/ai";
import { useNavigate } from 'react-router-dom';

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content: "Hello! I'm TunaBrain, your AI store manager. I've analyzed your latest data. How can I help you optimize your business today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [healthScore, setHealthScore] = useState<any>(null);
  const [actionPlan, setActionPlan] = useState<string[]>([]);
  const [contextData, setContextData] = useState<{ products: any[], orders: any[], customers: any[] }>({ products: [], orders: [], customers: [] });
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Initial load
  useEffect(() => {
    // Only fetch if user is logged in
    const checkUserAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetchDashboardData();
        fetchChatSessions();
      }
    };
    
    checkUserAndFetch();

    // Subscribe to auth changes to clear/reload data
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            fetchDashboardData();
            fetchChatSessions();
        } else if (event === 'SIGNED_OUT') {
            setMessages([{
                id: 'init',
                role: 'assistant',
                content: "Hello! I'm TunaBrain, your AI store manager. I've analyzed your latest data. How can I help you optimize your business today?",
                timestamp: new Date()
            }]);
            setChatSessions([]);
            setCurrentSessionId(null);
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Session management
  useEffect(() => {
    if (currentSessionId) {
      // Check if this session is already in the list; if not, add it optimistically
      setChatSessions(prev => {
        if (!prev.find(s => s.id === currentSessionId)) {
          return [{
             id: currentSessionId,
             created_at: new Date().toISOString(),
             last_message: "New Chat"
          }, ...prev];
        }
        return prev;
      });

      fetchChatHistory(currentSessionId);
    } else {
        // Only initialize if we have chat sessions loaded or if we are sure we should
        // We defer this slightly to avoid creating sessions on login screen
    }
  }, [currentSessionId]);

  const fetchDashboardData = async () => {
    try {
      const { data: products } = await supabase.from('products').select('*');
      const { data: orders } = await supabase.from('orders').select('*');
      const { data: customers } = await supabase.from('profiles').select('*');

      if (products && orders) {
        setContextData({ products, orders, customers: customers || [] });
        const health = await aiService.generateBusinessHealthScore(products, orders);
        setHealthScore(health);
      }
      
      const plan = await aiService.getDailyActionPlan({ products: products || [], orders: orders || [] });
      setActionPlan(plan);
    } catch (error) {
      console.error("Error fetching AI data:", error);
    }
  };

  const fetchChatSessions = async () => {
    try {
        const { data: sessions, error } = await supabase
            .from('chat_history')
            .select('session_id, created_at, content')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const uniqueSessions = new Map();
        sessions?.forEach(msg => {
            if (!uniqueSessions.has(msg.session_id)) {
                uniqueSessions.set(msg.session_id, {
                    id: msg.session_id,
                    created_at: msg.created_at,
                    last_message: msg.content
                });
            }
        });
        
        const sessionsList = Array.from(uniqueSessions.values()) as ChatSession[];
        
        // If we have no sessions in DB and no current session, create one immediately
        if (sessionsList.length === 0 && !currentSessionId) {
             const newId = crypto.randomUUID();
             const newSession: ChatSession = {
                 id: newId,
                 created_at: new Date().toISOString(),
                 last_message: "New Chat"
             };
             
             setChatSessions([newSession]);
             setCurrentSessionId(newId);
             setMessages([{
                id: 'init',
                role: 'assistant',
                content: "Hello! I'm TunaBrain, your AI store manager. How can I help you today?",
                timestamp: new Date()
            }]);
             return;
        }

        // Ensure current optimistic session is preserved if not in DB yet
        setChatSessions(prev => {
             // Find if we have a current session that is optimistic (not in DB list yet)
             if (currentSessionId) {
                 const currentOptimistic = prev.find(s => s.id === currentSessionId);
                 // If the current session is NOT in the fetched list, keep it at the top
                 if (currentOptimistic && !uniqueSessions.has(currentSessionId)) {
                     return [currentOptimistic, ...sessionsList];
                 }
             }
             return sessionsList;
        });
        
        // If we have sessions and no current session, select the most recent one
        if (sessionsList.length > 0 && !currentSessionId) {
            setCurrentSessionId(sessionsList[0].id);
        }

    } catch (error) {
        console.error("Error fetching chat sessions:", error);
    }
  };

  const createNewSession = () => {
    const newId = crypto.randomUUID();
    const newSession: ChatSession = {
        id: newId,
        created_at: new Date().toISOString(),
        last_message: "New Chat"
    };

    // 1. Add to sessions list immediately (Optimistic UI)
    setChatSessions(prev => [newSession, ...prev]);
    
    // 2. Set as active
    setCurrentSessionId(newId);

    // 3. Reset chat window
    setMessages([{
        id: 'init',
        role: 'assistant',
        content: "Hello! I'm TunaBrain, your AI store manager. How can I help you today?",
        timestamp: new Date()
    }]);
  };

  const fetchChatHistory = async (sessionId: string) => {
    setIsLoadingHistory(true);
    try {
        const { data, error } = await supabase
            .from('chat_history')
            .select('*')
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            const formattedMessages: ChatMessage[] = data.map(msg => ({
                id: msg.id,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                timestamp: new Date(msg.timestamp),
                action: msg.action,
                actionStatus: msg.action_status as any
            }));
            setMessages(formattedMessages);
        } else {
             if (messages.length === 0 || messages[0].id !== 'init') {
                 setMessages([{
                    id: 'init',
                    role: 'assistant',
                    content: "Hello! I'm TunaBrain, your AI store manager. How can I help you today?",
                    timestamp: new Date()
                }]);
             }
        }
    } catch (error) {
        console.error("Error loading chat history:", error);
    } finally {
        setIsLoadingHistory(false);
    }
  };

  const saveMessageToHistory = async (msg: ChatMessage, sessionId: string) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('chat_history').insert({
            id: msg.id,
            user_id: user.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp.toISOString(),
            action: msg.action || null,
            action_status: msg.actionStatus || null,
            session_id: sessionId
        });
        
        if (messages.length <= 2) fetchChatSessions();
    } catch (error) {
        console.error("Error saving message:", error);
    }
  };

  const deleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    
    const updatedSessions = chatSessions.filter(s => s.id !== sessionId);
    setChatSessions(updatedSessions);

    if (sessionId === currentSessionId) {
      if (updatedSessions.length > 0) {
        setCurrentSessionId(updatedSessions[0].id);
      } else {
        createNewSession();
      }
    }

    try {
        const { error } = await supabase
            .from('chat_history')
            .delete()
            .eq('session_id', sessionId);
        
        if (error) {
            console.error("Error deleting session:", error);
            toast.error("Could not delete conversation");
        } else {
            toast.success("Conversation deleted");
        }
    } catch (err) {
        console.error(err);
    }
  };

  const handleAction = async (messageId: string, action: ChatResponse['proposedAction'], approved: boolean) => {
    if (!approved) {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, actionStatus: 'rejected' } : msg
      ));
      return;
    }

    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, actionStatus: 'completed' } : msg
    ));

    const result = await aiService.executeAction(action);
    if (result.success) {
      toast.success("Action executed successfully!");
      fetchDashboardData();
      
      const confirmMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Done! ${action?.description} has been completed.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, confirmMsg]);
      if (currentSessionId) saveMessageToHistory(confirmMsg, currentSessionId);
    } else {
      toast.error(`Failed to execute action: ${result.error || "Unknown error"}`);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    
    if (currentSessionId) saveMessageToHistory(userMsg, currentSessionId);

    try {
      // We don't await this if we want it to be truly background? 
      // Actually, we want to update state when it finishes.
      // Since this is in Context, it will continue even if user changes route.
      const response = await aiService.chatWithAI(userMsg.content, contextData);
      
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        action: response.proposedAction,
        actionStatus: response.proposedAction ? 'pending' : undefined
      };

      setMessages(prev => [...prev, aiMsg]);
      
      if (currentSessionId) saveMessageToHistory(aiMsg, currentSessionId);
    } catch (error) {
      toast.error("AI is temporarily unavailable. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AIContext.Provider value={{
      messages,
      setMessages,
      input,
      setInput,
      isTyping,
      sendMessage,
      chatSessions,
      currentSessionId,
      setCurrentSessionId,
      createNewSession,
      deleteSession,
      isLoadingHistory,
      healthScore,
      actionPlan,
      handleAction
    }}>
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};
