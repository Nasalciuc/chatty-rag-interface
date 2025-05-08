
import { Database } from "lucide-react";

const ChatHeader = () => {
  return (
    <div className="border-b border-chat-border bg-white p-4">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-chat-highlight" />
          <h1 className="text-xl font-semibold">Knowledge Graph Assistant</h1>
        </div>
        <div className="text-sm text-gray-500">Connected to Neo4j</div>
      </div>
    </div>
  );
};

export default ChatHeader;
