
import { useState } from "react";
import { Message } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Info, Brain, ChevronDown, ChevronUp, MessageCircle, Edit3, Bot } from "lucide-react";
import { formatThinkingProcess } from "@/services/chatService";

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const [showMetadata, setShowMetadata] = useState(false);
  const [showThinking, setShowThinking] = useState(false);

  const formattedTime = new Intl.DateTimeFormat("ro-RO", {
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(message.timestamp));

  const isUser = message.role === "user";
  const hasMetadata = message.metadata && (message.metadata.sources || message.metadata.token_usage);
  const hasThinking = message.metadata?.thinking_process && message.metadata.thinking_process.length > 0;
  const messageMode = message.metadata?.mode;

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'ask':
        return <MessageCircle className="h-3 w-3" />;
      case 'edit':
        return <Edit3 className="h-3 w-3" />;
      case 'agent':
        return <Bot className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'ask':
        return 'ASK';
      case 'edit':
        return 'EDIT';
      case 'agent':
        return 'AGENT';
      default:
        return '';
    }
  };

  return (
    <div
      className={`mb-4 animate-fade-in ${
        isUser ? "flex justify-end" : "flex justify-start"
      }`}
    >
      <div
        className={`max-w-3xl rounded-lg p-4 ${
          isUser
            ? "bg-chat-highlight text-white rounded-br-none"
            : "bg-chat-assistant text-gray-800 rounded-tl-none"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">
            {isUser ? "Tu" : "Asistent"}
          </span>
          {messageMode && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
              isUser ? "bg-purple-700" : "bg-purple-100 text-purple-700"
            }`}>
              {getModeIcon(messageMode)}
              <span>{getModeLabel(messageMode)}</span>
            </div>
          )}
          <span className="text-xs opacity-70">{formattedTime}</span>
        </div>

        <div className="whitespace-pre-wrap">{message.content}</div>

        {/* Thinking Process Section */}
        {hasThinking && (
          <div className="mt-3 text-sm border-t border-gray-300 pt-3">
            <Button
              variant="ghost"
              size="sm"
              className={`flex items-center gap-1 p-1 ${
                isUser ? "text-white" : "text-purple-600"
              }`}
              onClick={() => setShowThinking(!showThinking)}
            >
              <Brain className="h-4 w-4" />
              <span>Procesul de gândire</span>
              {showThinking ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>

            {showThinking && (
              <div className={`mt-2 p-3 rounded text-xs ${isUser ? "bg-purple-700" : "bg-purple-50 text-gray-700"}`}>
                <div className="whitespace-pre-wrap">
                  {formatThinkingProcess(message.metadata.thinking_process)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metadata Section */}
        {hasMetadata && (
          <div className="mt-3 text-sm">
            <Button
              variant="ghost"
              size="sm"
              className={`flex items-center gap-1 p-1 ${
                isUser ? "text-white" : "text-gray-500"
              }`}
              onClick={() => setShowMetadata(!showMetadata)}
            >
              <Info className="h-4 w-4" />
              <span>{showMetadata ? "Ascunde detalii" : "Arată detalii"}</span>
            </Button>

            {showMetadata && (
              <div className={`mt-2 p-2 rounded ${isUser ? "bg-purple-700" : "bg-gray-200"}`}>
                {message.metadata.sources && (
                  <div className="mb-2">
                    <p className="font-medium mb-1">Surse:</p>
                    <div className="flex gap-2 flex-wrap">
                      {message.metadata.sources.map((source, index) => (
                        <span key={index} className="text-xs px-2 py-1 bg-gray-600 text-white rounded">
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {message.metadata.token_usage && (
                  <div>
                    <p className="font-medium mb-1">Token-uri utilizate:</p>
                    <span className="text-xs">{message.metadata.token_usage}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
