
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";

export interface AdvancedMessageOptions {
  useNeo4j?: boolean;
  useCypher?: string;
  useParallelSearch?: boolean;
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
  useParallelSearch: boolean = true
): Promise<AdvancedResponse> => {
  return sendMessage(message, { useParallelSearch });
};

export const sendNeo4jMessage = async (
  message: string,
  customCypher?: string
): Promise<AdvancedResponse> => {
  return sendMessage(message, { 
    useNeo4j: true,
    useCypher: customCypher 
  });
};

export const runCypherQuery = async (cypher: string): Promise<{
  results: any[];
  count: number;
}> => {
  const { data, error } = await supabase.functions.invoke('medical-assistant/cypher', {
    body: { cypher },
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
}> => {
  const { data, error } = await supabase.functions.invoke('medical-assistant/health');
  
  if (error) {
    throw new Error(`Error: ${error.message}`);
  }
  
  return data;
};
