
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";

export const sendMessage = async (message: string): Promise<{ 
  answer: string; 
  sources: string[];
  token_usage: number;
}> => {
  const { data, error } = await supabase.functions.invoke('medical-assistant', {
    body: { question: message },
  });

  if (error) {
    throw new Error(`Error: ${error.message}`);
  }

  return data;
};

export const testConnection = async (): Promise<{status: string, assistant_ready: boolean}> => {
  const { data, error } = await supabase.functions.invoke('medical-assistant/health');
  
  if (error) {
    throw new Error(`Error: ${error.message}`);
  }
  
  return data;
};
