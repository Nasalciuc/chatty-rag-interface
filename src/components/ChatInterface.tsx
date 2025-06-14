import { useState, useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { Send, Paperclip, AlertCircle, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ChatMessage from "./ChatMessage";
import ChatHeader from "./ChatHeader";
import ChatModeSelector from "./ChatModeSelector";
import { Message, ChatMode } from "@/types/chat";
import { sendMessageWithMode, testConnection } from "@/services/chatService";

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Bună! Sunt asistentul tău medical AI cu trei moduri de funcționare:\n\n• **Ask** - pentru întrebări directe despre medicină\n• **Edit** - pentru îmbunătățirea și editarea informațiilor medicale\n• **Agent** - pentru analiză medicală avansată cu gândire detaliată\n\nAlege modul dorit și pune-mi întrebarea ta medicală!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("checking");
  const [showThinking, setShowThinking] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ChatMode>('ask');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const status = await testConnection();
      setConnectionStatus(status.assistant_ready ? "connected" : "limited");
    } catch (error) {
      setConnectionStatus("disconnected");
      console.error("Connection check failed:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: "user" as const,
      content: input.trim(),
      timestamp: new Date(),
      metadata: {
        mode: selectedMode
      }
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const data = await sendMessageWithMode(userMessage.content, selectedMode, {
        includeThinking: showThinking
      });
      
      const assistantMessage = {
        role: "assistant" as const,
        content: data.answer,
        timestamp: new Date(),
        metadata: {
          sources: data.sources,
          token_usage: data.token_usage,
          thinking_process: data.thinking_process,
          mode: selectedMode
        }
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Failed to fetch response:", error);
      toast({
        title: "Eroare",
        description: "Nu s-a putut conecta la server. Încearcă din nou mai târziu.",
        variant: "destructive",
      });
      
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Îmi pare rău, am întâmpinat o eroare în procesarea cererii tale. Te rog să încerci din nou mai târziu.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  const handleClearHistory = () => {
    setMessages([
      {
        role: "assistant",
        content: "Istoricul conversației a fost șters. Sunt încă conectat și gata să ajut cu întrebări medicale folosind RAG și căutare web!",
        timestamp: new Date(),
      },
    ]);
    
    toast({
      title: "Chat șters",
      description: "Toate mesajele au fost șterse menținând conexiunea.",
    });
  };

  const getModeStatusMessage = () => {
    const modeDescriptions = {
      ask: "ASK - Întrebări directe medicale",
      edit: "EDIT - Editare și îmbunătățire informații",
      agent: "AGENT - Analiză medicală avansată"
    };
    
    return `${getStatusMessage()} | ${modeDescriptions[selectedMode]}`;
  };

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case "connected":
        return "RAG + Căutare Web + Thinking Activ";
      case "limited":
        return "Doar LLM + Căutare Web + Thinking";
      case "disconnected":
        return "Deconectat";
      default:
        return "Se verifică conexiunea...";
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-600";
      case "limited":
        return "text-yellow-600";
      case "disconnected":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-chat-bg">
      <ChatHeader onClearHistory={handleClearHistory} status={getModeStatusMessage()} />
      
      {/* Status Banner */}
      <div className={`${connectionStatus === 'disconnected' ? 'bg-red-50 border-red-400' : connectionStatus === 'limited' ? 'bg-yellow-50 border-yellow-400' : 'bg-green-50 border-green-400'} border-l-4 p-4 mx-4 mt-2 rounded-r-lg`}>
        <div className="flex items-center max-w-4xl mx-auto">
          <AlertCircle className={`h-5 w-5 ${getStatusColor()} mr-2 flex-shrink-0`} />
          <div className={`text-sm ${getStatusColor().replace('text-', 'text-').replace('-600', '-800')}`}>
            <strong>Status:</strong> {getStatusMessage()}. 
            {connectionStatus === 'disconnected' && " Verifică dacă serverul backend rulează pe localhost:8000."}
            {connectionStatus === 'limited' && " Baza de date medicală locală nu este disponibilă."}
            {connectionStatus === 'connected' && " Toate funcționalitățile sunt active."}
            <br />
            <em>Informațiile oferite nu înlocuiesc consultul medical profesional.</em>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-auto p-4">
        <div className="max-w-4xl mx-auto">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          {isLoading && (
            <div className="flex items-start gap-2 animate-fade-in ml-2">
              <div className="flex space-x-2 p-3 bg-chat-assistant rounded-lg">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="border-t border-chat-border p-4 bg-white">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Chat Mode Selector */}
          <ChatModeSelector 
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
          />

          {/* Thinking Toggle */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Brain className="h-4 w-4" />
            <Label htmlFor="thinking-mode" className="cursor-pointer">
              Arată gândirea AI-ului
            </Label>
            <Switch 
              id="thinking-mode"
              checked={showThinking} 
              onCheckedChange={setShowThinking}
              className="data-[state=checked]:bg-purple-600"
            />
            <span className="text-xs text-gray-500">
              {showThinking ? "Activ - vei vedea procesul de gândire" : "Inactiv"}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex items-end gap-2 bg-gray-100 rounded-lg p-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-700"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Întreabă despre medicamente, tratamente sau informații medicale..."
                className="min-h-12 flex-grow resize-none border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                rows={1}
              />
              <Button
                type="submit"
                size="icon"
                className={`rounded-full bg-chat-highlight hover:bg-purple-700 ${
                  !input.trim() || isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={!input.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
