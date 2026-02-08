import { ChatResponse } from "@/services/aiService";

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: ChatResponse['proposedAction'];
  actionStatus?: 'pending' | 'approved' | 'rejected' | 'completed';
}

export interface ChatSession {
  id: string;
  created_at: string;
  last_message: string;
}

export interface AIContextType {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isTyping: boolean;
  sendMessage: () => Promise<void>;
  chatSessions: ChatSession[];
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  createNewSession: () => void;
  deleteSession: (e: React.MouseEvent, sessionId: string) => Promise<void>;
  isLoadingHistory: boolean;
  healthScore: any;
  actionPlan: string[];
  handleAction: (messageId: string, action: ChatResponse['proposedAction'], approved: boolean) => Promise<void>;
}
