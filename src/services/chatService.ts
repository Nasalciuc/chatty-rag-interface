
import { Message } from "@/types/chat";

const API_URL = "http://localhost:8000";

export const sendMessage = async (message: string): Promise<{ 
  answer: string; 
  sources: string[];
  token_usage: number;
}> => {
  const response = await fetch(`${API_URL}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question: message }),
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }

  return response.json();
};

export const testConnection = async (): Promise<{status: string, assistant_ready: boolean}> => {
  const response = await fetch(`${API_URL}/health`);
  
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  
  return response.json();
};
