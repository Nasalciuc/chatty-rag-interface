
import { Message } from "@/types/chat";

const API_URL = "https://6c8a-93-117-148-210.ngrok-free.app";

export const sendMessage = async (message: string): Promise<{ 
  answer: string; 
  cypher_query: string; 
  raw_data: string[] 
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

export const testConnection = async (): Promise<any[]> => {
  const response = await fetch(`${API_URL}/test-connection`);
  
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  
  return response.json();
};
