
import { useState } from "react";
import { Message } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Code } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const [showMetadata, setShowMetadata] = useState(false);

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(message.timestamp));

  const isUser = message.role === "user";
  const hasMetadata = message.metadata && (message.metadata.cypher_query || (message.metadata.raw_data && message.metadata.raw_data.length > 0));

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
            {isUser ? "You" : "Assistant"}
          </span>
          <span className="text-xs opacity-70">{formattedTime}</span>
        </div>

        <div className="whitespace-pre-wrap">{message.content}</div>

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
              <Code className="h-4 w-4" />
              <span>{showMetadata ? "Hide details" : "Show details"}</span>
            </Button>

            {showMetadata && (
              <div className={`mt-2 p-2 rounded ${isUser ? "bg-purple-700" : "bg-gray-200"}`}>
                {message.metadata.cypher_query && (
                  <div className="mb-2">
                    <p className="font-medium mb-1">Cypher Query:</p>
                    <pre className="text-xs overflow-x-auto p-2 bg-gray-800 text-gray-200 rounded">
                      {message.metadata.cypher_query}
                    </pre>
                  </div>
                )}
                {message.metadata.raw_data && message.metadata.raw_data.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">Data Sources:</p>
                    <ul className="list-disc pl-5">
                      {message.metadata.raw_data.map((item, index) => (
                        <li key={index} className="text-xs">
                          {item}
                        </li>
                      ))}
                    </ul>
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
