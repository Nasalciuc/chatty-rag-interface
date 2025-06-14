
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";

export interface AdvancedMessageOptions {
  useNeo4j?: boolean;
  useCypher?: string;
  useParallelSearch?: boolean;
  includeThinking?: boolean;
}

export interface ThinkingStep {
  type: 'reasoning' | 'action' | 'result' | 'conclusion';
  content: string;
  tool?: string;
  timestamp: number;
}

export interface AdvancedResponse {
  answer: string;
  sources: string[];
  token_usage: number;
  neo4j_results?: any[];
  parallel_results?: {
    neo4j: any[];
    llm_web: string;
  };
  thinking_process?: ThinkingStep[];
}

export const sendMessage = async (
  message: string, 
  options: AdvancedMessageOptions = {}
): Promise<AdvancedResponse> => {
  const { data, error } = await supabase.functions.invoke('medical-assistant', {
    body: { 
      question: message,
      ...options
    },
  });

  if (error) {
    throw new Error(`Error: ${error.message}`);
  }

  return data;
};

export const sendAdvancedMessage = async (
  message: string,
  useParallelSearch: boolean = true,
  includeThinking: boolean = false
): Promise<AdvancedResponse> => {
  return sendMessage(message, { useParallelSearch, includeThinking });
};

export const sendMessageWithThinking = async (
  message: string,
  includeThinking: boolean = true
): Promise<AdvancedResponse> => {
  return sendMessage(message, { includeThinking });
};

export const sendNeo4jMessage = async (
  message: string,
  customCypher?: string,
  includeThinking: boolean = false
): Promise<AdvancedResponse> => {
  return sendMessage(message, { 
    useNeo4j: true,
    useCypher: customCypher,
    includeThinking 
  });
};

export const runCypherQuery = async (
  cypher: string, 
  includeThinking: boolean = false
): Promise<{
  results: any[];
  count: number;
  thinking_process?: ThinkingStep[];
}> => {
  const { data, error } = await supabase.functions.invoke('medical-assistant/cypher', {
    body: { cypher, includeThinking },
  });

  if (error) {
    throw new Error(`Cypher Error: ${error.message}`);
  }

  return data;
};

export const testConnection = async (): Promise<{
  status: string;
  assistant_ready: boolean;
  neo4j_connected: boolean;
  advanced_features: boolean;
  thinking_enabled: boolean;
}> => {
  const { data, error } = await supabase.functions.invoke('medical-assistant/health');
  
  if (error) {
    throw new Error(`Error: ${error.message}`);
  }
  
  return data;
};

export const formatThinkingProcess = (steps: ThinkingStep[]): string => {
  if (!steps || steps.length === 0) return "";
  
  let formatted = "🧠 **Procesul de gândire:**\n\n";
  
  steps.forEach((step, index) => {
    const timeStr = new Date(step.timestamp).toLocaleTimeString('ro-RO');
    
    switch (step.type) {
      case 'reasoning':
        formatted += `**${index + 1}. 🤔 Analizez** (${timeStr})\n${step.content}\n\n`;
        break;
      case 'action':
        formatted += `**${index + 1}. 🔍 Acțiune** (${timeStr})`;
        if (step.tool) formatted += ` - *${step.tool}*`;
        formatted += `\n${step.content}\n\n`;
        break;
      case 'result':
        formatted += `**${index + 1}. 📊 Rezultat** (${timeStr})`;
        if (step.tool) formatted += ` - *${step.tool}*`;
        formatted += `\n${step.content}\n\n`;
        break;
      case 'conclusion':
        formatted += `**${index + 1}. ✅ Concluzie** (${timeStr})\n${step.content}\n\n`;
        break;
    }
  });

  return formatted;
};
