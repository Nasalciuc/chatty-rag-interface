
import { Pill } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  onClearHistory: () => void;
  status?: string;
}

const ChatHeader = ({ onClearHistory, status = "Se verifică..." }: ChatHeaderProps) => {
  return (
    <div className="border-b border-chat-border bg-white p-4">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Pill className="h-6 w-6 text-chat-highlight" />
          <h1 className="text-xl font-semibold">Medilexa</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onClearHistory}
            className="text-gray-600 hover:text-gray-800"
          >
            Șterge Chat
          </Button>
          <div className="text-sm text-gray-500">{status}</div>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
