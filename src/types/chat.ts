
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
  };
}

export interface Neo4jResult {
  [key: string]: any;
}

export interface AdvancedMessageOptions {
  useNeo4j?: boolean;
  useCypher?: string;
  useParallelSearch?: boolean;
}
