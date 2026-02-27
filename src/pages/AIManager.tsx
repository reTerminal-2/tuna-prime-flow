import { useEffect, useRef, useState } from "react";
import { useIsMobileLayout } from "@/hooks/use-layout-mode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Send,
  Bot,
  User,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BrainCircuit,
  Zap,
  Settings,
  MessageSquare,
  PlusCircle,
  X,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { useAI } from "@/contexts/AIContext";

import { AIProductForm } from "@/components/ai/AIProductForm";
import { AIPricingRuleForm } from "@/components/ai/AIPricingRuleForm";

const AIManager = () => {
  const isMobileLayout = useIsMobileLayout();
  const navigate = useNavigate();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const {
    messages,
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
    handleAction,
    submitFeedback
  } = useAI();

  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productFormData, setProductFormData] = useState<any>(undefined);

  const [isPricingRuleFormOpen, setIsPricingRuleFormOpen] = useState(false);
  const [pricingRuleFormData, setPricingRuleFormData] = useState<any>(undefined);

  const [feedbackState, setFeedbackState] = useState<Record<string, 1 | -1>>({});

  // Intercept handleAction to check for modal triggers
  const onHandleAction = async (messageId: string, action: any, approved: boolean) => {
    if (approved) {
      if (action.type === 'OPEN_PRODUCT_FORM') {
        setProductFormData(action.payload);
        setIsProductFormOpen(true);
        handleAction(messageId, action, true);
        return;
      }

      if (action.type === 'OPEN_PRICING_RULE_FORM') {
        setPricingRuleFormData(action.payload);
        setIsPricingRuleFormOpen(true);
        handleAction(messageId, action, true);
        return;
      }
    }

    handleAction(messageId, action, approved);
  };

  useEffect(() => {
    // Auto-scroll to bottom of chat
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className={`p-4 ${isMobileLayout ? 'md:p-4' : 'md:p-6'} h-full ${!isMobileLayout ? 'md:h-[calc(100vh-4rem)]' : ''} flex flex-col gap-4 md:gap-6 overflow-y-auto md:overflow-hidden ${isMobileLayout ? 'pb-20' : ''}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            AI Manager
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">Your ultra-smart assistant for business optimization</p>
        </div>
        {healthScore && (
          <div className="flex items-center gap-4 bg-card border p-2 rounded-lg shadow-sm w-full sm:w-auto justify-between sm:justify-start">
            <div className="text-left">
              <p className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-wider">Business Health</p>
              <p className={`font-bold text-sm md:text-base ${healthScore.status === 'Excellent' ? 'text-green-600' :
                healthScore.status === 'Stable' ? 'text-blue-600' : 'text-orange-600'
                }`}>{healthScore.status}</p>
            </div>
            <div className="relative h-10 w-10 md:h-12 md:w-12 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-full border-4 border-muted opacity-30"></div>
              <div
                className={`absolute inset-0 rounded-full border-4 border-r-transparent transform -rotate-45 ${healthScore.score > 80 ? 'border-green-500' : 'border-blue-500'
                  }`}
                style={{ clipPath: `polygon(0 0, 100% 0, 100% ${healthScore.score}%, 0 100%)` }}
              ></div>
              <span className="font-bold text-xs md:text-sm">{healthScore.score}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Left Column: Dashboard Stats */}
        <div className="space-y-6 flex flex-col md:overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

          {/* Action Plan Card */}
          <Card className="border-l-4 border-l-purple-500 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-600" />
                Daily Action Plan
              </CardTitle>
              <CardDescription className="text-xs">AI-generated tasks for today</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {actionPlan.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="mt-0.5 h-4 w-4 rounded-full border border-primary flex items-center justify-center shrink-0 cursor-pointer hover:bg-primary/20">
                      <div className="h-2 w-2 rounded-full bg-transparent hover:bg-primary"></div>
                    </div>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Health Breakdown */}
          {healthScore && (
            <Card className="hidden sm:block lg:block">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Inventory Efficiency</span>
                    <span>{healthScore.breakdown.inventory}%</span>
                  </div>
                  <Progress value={healthScore.breakdown.inventory} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Sales Velocity</span>
                    <span>{healthScore.breakdown.sales}%</span>
                  </div>
                  <Progress value={healthScore.breakdown.sales} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Customer Retention</span>
                    <span>{healthScore.breakdown.customerRetention}%</span>
                  </div>
                  <Progress value={healthScore.breakdown.customerRetention} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alert Card */}
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-900">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Critical Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-orange-800 leading-relaxed">
                Market shift detected in "Canned Goods". Competitor prices dropped by 5% avg. Consider adjusting pricing strategy.
              </p>
              <Button variant="outline" size="sm" className="w-full mt-3 bg-white hover:bg-orange-100 border-orange-200 text-orange-900 text-[10px] h-8">
                Analyze Market
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Chat Interface */}
        <div className="lg:col-span-3 flex h-[500px] md:h-full min-h-0 mt-4 lg:mt-0">
          <Card className="flex-1 flex flex-row shadow-lg border-primary/20 overflow-hidden">

            {/* Sidebar for Sessions */}
            <div className="w-64 border-r bg-muted/20 flex flex-col hidden md:flex">
              <div className="p-3 border-b">
                <Button
                  onClick={createNewSession}
                  className="w-full justify-start gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-0"
                  variant="outline"
                >
                  <PlusCircle className="h-4 w-4" />
                  New Chat
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {chatSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => setCurrentSessionId(session.id)}
                      className={`
                           group flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer transition-all
                           ${currentSessionId === session.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }
                        `}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
                      <span className="truncate flex-1 text-xs">{session.last_message || "New Chat"}</span>

                      <button
                        onClick={(e) => deleteSession(e, session.id)}
                        className={`
                            opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive
                            p-1 rounded transition-all
                            ${currentSessionId === session.id ? 'opacity-100' : ''}
                          `}
                        title="Delete Chat"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-background">
              <div className="border-b p-3 md:p-4 flex items-center gap-3 bg-muted/10">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center shadow-sm">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs md:text-sm">Chat with TunaBrain</h3>
                  <p className="text-[10px] md:text-xs text-muted-foreground">AI Business Consultant</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 relative">
                {isLoadingHistory && (
                  <div className="absolute inset-0 bg-background/50 z-20 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[10px] text-muted-foreground">Loading chat...</p>
                    </div>
                  </div>
                )}
                <ScrollArea ref={scrollAreaRef} className="flex-1 p-3 md:p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <div className="space-y-6 max-w-3xl mx-auto">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`h-7 w-7 md:h-8 md:w-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-muted' : 'bg-primary/10'
                          }`}>
                          {msg.role === 'user' ? <User className="h-3 w-3 md:h-4 md:w-4" /> : <Bot className="h-3 w-3 md:h-4 md:w-4 text-primary" />}
                        </div>
                        <div className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-3 py-2 md:px-4 md:py-2.5 text-xs md:text-sm ${msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted border border-border'
                          }`}>
                          <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>

                          {/* Feedback Buttons for AI messages */}
                          {msg.role === 'assistant' && msg.id !== 'init' && (
                            <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-border/40">
                              <span className="text-[9px] text-muted-foreground mr-1">Helpful?</span>
                              <button
                                onClick={() => {
                                  if (feedbackState[msg.id]) return;
                                  setFeedbackState(prev => ({ ...prev, [msg.id]: 1 }));
                                  submitFeedback(msg.id, 1);
                                }}
                                disabled={!!feedbackState[msg.id]}
                                className={`p-1 rounded transition-colors ${feedbackState[msg.id] === 1
                                  ? 'text-green-500 bg-green-500/10'
                                  : 'text-muted-foreground hover:text-green-500 hover:bg-green-500/10'
                                  } disabled:cursor-not-allowed`}
                                title="Helpful"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => {
                                  if (feedbackState[msg.id]) return;
                                  setFeedbackState(prev => ({ ...prev, [msg.id]: -1 }));
                                  submitFeedback(msg.id, -1);
                                }}
                                disabled={!!feedbackState[msg.id]}
                                className={`p-1 rounded transition-colors ${feedbackState[msg.id] === -1
                                  ? 'text-red-500 bg-red-500/10'
                                  : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'
                                  } disabled:cursor-not-allowed`}
                                title="Not helpful"
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </button>
                            </div>
                          )}

                          {/* Missing API Key Action */}
                          {msg.content.includes("Missing Gemini API Key") && msg.role === 'assistant' && (
                            <div className="mt-3">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="w-full text-[10px] h-8"
                                onClick={() => navigate("/seller/settings")}
                              >
                                <Settings className="h-3 w-3 mr-2" />
                                Configure API Key
                              </Button>
                            </div>
                          )}

                          {/* Action Approval UI */}
                          {msg.action && msg.role === 'assistant' && (
                            <div className="mt-3 bg-background rounded-lg p-2 md:p-3 border border-border shadow-sm">
                              <div className="flex items-start gap-2 mb-2">
                                <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-purple-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="font-medium text-[10px] uppercase text-muted-foreground mb-0.5">Proposed Action</p>
                                  <p className="font-semibold text-xs md:text-sm text-foreground">{msg.action.description}</p>
                                </div>
                              </div>

                              {msg.actionStatus === 'pending' && (
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    className="h-7 text-[10px] bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                                    onClick={() => onHandleAction(msg.id, msg.action, true)}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[10px] text-destructive hover:bg-destructive/10 border-destructive/20 flex-1 sm:flex-none"
                                    onClick={() => onHandleAction(msg.id, msg.action, false)}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}

                              {msg.actionStatus === 'completed' && (
                                <div className="flex items-center gap-1 mt-2 text-[10px] text-green-600 font-medium">
                                  <CheckCircle className="h-3 w-3" /> Action Completed
                                </div>
                              )}

                              {msg.actionStatus === 'rejected' && (
                                <div className="mt-2 text-[10px] text-muted-foreground italic">
                                  Action rejected by user
                                </div>
                              )}
                            </div>
                          )}

                          <span className={`text-[9px] md:text-[10px] block mt-1 opacity-70 ${msg.role === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'
                            }`}>
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex gap-3">
                        <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                        </div>
                        <div className="bg-muted border border-border rounded-2xl px-3 py-2 md:px-4 md:py-3 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary/40 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary/40 rounded-full animate-bounce delay-75"></div>
                          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary/40 rounded-full animate-bounce delay-150"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="p-3 md:p-4 border-t bg-background mt-auto">
                  <div className="max-w-3xl mx-auto w-full">
                    <form
                      onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                      className="flex gap-2"
                    >
                      <Input
                        placeholder="Ask me anything..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-1 bg-muted/50 focus-visible:ring-primary h-9 md:h-10 text-xs md:text-sm"
                        disabled={isTyping}
                      />
                      <Button type="submit" size="icon" className="h-9 w-9 md:h-10 md:w-10" disabled={!input.trim() || isTyping}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-2 no-scrollbar">
                      {["Analysis of this week's sales", "Draft a marketing email", "What should I restock?", "Competitor check"].map((suggestion) => (
                        <Badge
                          key={suggestion}
                          variant="outline"
                          className="cursor-pointer hover:bg-secondary whitespace-nowrap text-[10px] py-1 px-3 h-auto"
                          onClick={() => setInput(suggestion)}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <AIProductForm
        open={isProductFormOpen}
        onOpenChange={setIsProductFormOpen}
        initialData={productFormData}
      />

      <AIPricingRuleForm
        open={isPricingRuleFormOpen}
        onOpenChange={setIsPricingRuleFormOpen}
        initialData={pricingRuleFormData}
      />
    </div>

  );
};

export default AIManager;