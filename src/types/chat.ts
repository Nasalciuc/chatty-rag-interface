
export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    cypher_query?: string;
    raw_data?: string[];
  };
}
