
import { useState, useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { Send, Paperclip, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ChatMessage from "./ChatMessage";
import ChatHeader from "./ChatHeader";
import { Message } from "@/types/chat";
import { sendMessage } from "@/services/chatService";

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your medical AI assistant. Currently, I'm using language model and web search to answer your medical questions. The local medical database (RAG) is not active at the moment. For detailed answers, please ensure your questions are clear and specific. The information provided does not replace specialized medical consultation.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

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
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const data = await sendMessage(userMessage.content);
      
      const assistantMessage = {
        role: "assistant" as const,
        content: data.answer,
        timestamp: new Date(),
        metadata: {
          cypher_query: data.cypher_query,
          raw_data: data.raw_data
        }
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Failed to fetch response:", error);
      toast({
        title: "Error",
        description: "Failed to connect to the server. Please try again later.",
        variant: "destructive",
      });
      
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
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
        content: "Chat history cleared. I'm still connected and ready to help with medical questions using LLM and web search!",
        timestamp: new Date(),
      },
    ]);
    
    toast({
      title: "Chat Cleared",
      description: "All messages have been cleared while maintaining connection.",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-chat-bg">
      <ChatHeader onClearHistory={handleClearHistory} />
      
      {/* Disclaimer Banner */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-4 mt-2 rounded-r-lg">
        <div className="flex items-center max-w-4xl mx-auto">
          <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <strong>Note:</strong> This AI assistant uses language model and web search only. 
            The local medical database (RAG) is currently not active. Information provided does not replace professional medical consultation.
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
              placeholder="Ask a medical question (using LLM + web search)..."
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
  );
};

export default ChatInterface;
