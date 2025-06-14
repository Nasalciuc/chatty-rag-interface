
import { MessageCircle, Edit3, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMode, ChatModeConfig } from "@/types/chat";

interface ChatModeSelectorProps {
  selectedMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

const ChatModeSelector = ({ selectedMode, onModeChange }: ChatModeSelectorProps) => {
  const modes: ChatModeConfig[] = [
    {
      id: 'ask',
      label: 'Ask',
      description: 'Întreabă despre informații medicale',
      icon: 'MessageCircle'
    },
    {
      id: 'edit',
      label: 'Edit', 
      description: 'Modifică și îmbunătățește răspunsuri',
      icon: 'Edit3'
    },
    {
      id: 'agent',
      label: 'Agent',
      description: 'Asistent medical cu gândire avansată',
      icon: 'Bot'
    }
  ];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'MessageCircle':
        return <MessageCircle className="h-4 w-4" />;
      case 'Edit3':
        return <Edit3 className="h-4 w-4" />;
      case 'Bot':
        return <Bot className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
      <span className="text-sm font-medium text-gray-700 mr-2">Mod:</span>
      {modes.map((mode) => (
        <Button
          key={mode.id}
          variant={selectedMode === mode.id ? "default" : "ghost"}
          size="sm"
          onClick={() => onModeChange(mode.id)}
          className={`flex items-center gap-2 ${
            selectedMode === mode.id 
              ? "bg-chat-highlight text-white hover:bg-purple-700" 
              : "text-gray-600 hover:text-gray-800"
          }`}
          title={mode.description}
        >
          {getIcon(mode.icon)}
          <span>{mode.label}</span>
        </Button>
      ))}
    </div>
  );
};

export default ChatModeSelector;
