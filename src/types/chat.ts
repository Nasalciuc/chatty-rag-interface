
import { ChatMode } from "@/types/chat";
export interface ThinkingStep {
  type: 'reasoning' | 'action' | 'result' | 'conclusion';
  content: string;
  tool?: string;
  timestamp: number;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    sources?: string[];
    token_usage?: number;
    neo4j_results?: any[];
    parallel_results?: {
      neo4j: any[];
      llm_web: string;
    };
    search_type?: 'standard' | 'neo4j' | 'parallel';
    thinking_process?: ThinkingStep[];
    mode?: ChatMode;
  };
}

export interface Neo4jResult {
  [key: string]: any;
}

export interface AdvancedMessageOptions {
  useNeo4j?: boolean;
  useCypher?: string;
  useParallelSearch?: boolean;
  includeThinking?: boolean;
  mode?: ChatMode;
  systemPrompt?: string;
}

export type ChatMode = 'ask' | 'edit' | 'agent';

export interface ChatModeConfig {
  id: ChatMode;
  label: string;
  description: string;
  icon: string;
}
