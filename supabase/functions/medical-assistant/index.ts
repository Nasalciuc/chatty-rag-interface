
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionRequest {
  question: string;
  useNeo4j?: boolean;
  useCypher?: string;
  useParallelSearch?: boolean;
  includeThinking?: boolean;
}

interface ThinkingStep {
  type: 'reasoning' | 'action' | 'result' | 'conclusion';
  content: string;
  tool?: string;
  timestamp: number;
}

interface AnswerResponse {
  answer: string;
  sources: string[];
  token_usage?: number;
  neo4j_results?: any[];
  parallel_results?: {
    neo4j: any[];
    llm_web: string;
  };
  thinking_process?: ThinkingStep[];
}

// Neo4j connection details
const NEO4J_URI = "bolt://20.215.233.235:7687";
const NEO4J_USER = "neo4j";
const NEO4J_PASSWORD = "shrink-report-mentor-amanda-harvard-9201";
const NEO4J_DATABASE = "neo4j";

class ThinkingTracker {
  private steps: ThinkingStep[] = [];

  addStep(type: ThinkingStep['type'], content: string, tool?: string) {
    this.steps.push({
      type,
      content,
      tool,
      timestamp: Date.now()
    });
  }

  getSteps(): ThinkingStep[] {
    return this.steps;
  }

  getFormattedThinking(): string {
    let formatted = "🧠 Procesul de gândire:\n\n";
    
    this.steps.forEach((step, index) => {
      switch (step.type) {
        case 'reasoning':
          formatted += `${index + 1}. 🤔 Analizez: ${step.content}\n`;
          break;
        case 'action':
          formatted += `${index + 1}. 🔍 Acțiune: ${step.content}`;
          if (step.tool) formatted += ` (folosind ${step.tool})`;
          formatted += "\n";
          break;
        case 'result':
          formatted += `${index + 1}. 📊 Rezultat: ${step.content}\n`;
          break;
        case 'conclusion':
          formatted += `${index + 1}. ✅ Concluzie: ${step.content}\n`;
          break;
      }
    });

    return formatted;
  }

  clear() {
    this.steps = [];
  }
}

async function connectToNeo4j() {
  try {
    // Since we can't use the neo4j driver directly in Deno, we'll use HTTP API
    const neo4jHttpUri = "http://20.215.233.235:7474/db/neo4j/tx/commit";
    return neo4jHttpUri;
  } catch (error) {
    console.error('Neo4j connection error:', error);
    return null;
  }
}

async function runCypherQuery(cypher: string, thinking?: ThinkingTracker): Promise<any[]> {
  try {
    if (thinking) {
      thinking.addStep('action', `Rulând query Cypher: ${cypher}`, 'Neo4j');
    }

    const neo4jUri = await connectToNeo4j();
    if (!neo4jUri) {
      throw new Error("Nu se poate conecta la Neo4j");
    }

    const auth = btoa(`${NEO4J_USER}:${NEO4J_PASSWORD}`);
    
    const response = await fetch(neo4jUri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        statements: [{
          statement: cypher
        }]
      }),
    });

    if (!response.ok) {
      throw new Error(`Neo4j HTTP error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors && data.errors.length > 0) {
      throw new Error(`Neo4j query error: ${data.errors[0].message}`);
    }

    // Extract results from Neo4j response format
    const results = data.results[0]?.data || [];
    const formattedResults = results.map((row: any) => {
      const result: any = {};
      row.row.forEach((value: any, index: number) => {
        const column = data.results[0].columns[index];
        result[column] = value;
      });
      return result;
    });

    if (thinking) {
      thinking.addStep('result', `Am găsit ${formattedResults.length} rezultate în Neo4j`, 'Neo4j');
    }

    return formattedResults;

  } catch (error) {
    console.error('Cypher query error:', error);
    if (thinking) {
      thinking.addStep('result', `Eroare Neo4j: ${error.message}`, 'Neo4j');
    }
    throw error;
  }
}

async function searchWebAdvanced(query: string, thinking?: ThinkingTracker): Promise<string> {
  const tavilyApiKey = Deno.env.get('TAVILY_API_KEY');
  
  if (!tavilyApiKey) {
    if (thinking) {
      thinking.addStep('result', 'Căutarea web nu este disponibilă - lipsește cheia API Tavily', 'Web Search');
    }
    return "Căutarea web nu este disponibilă - lipsește cheia API Tavily.";
  }

  try {
    if (thinking) {
      thinking.addStep('action', `Căutând pe web informații despre: ${query}`, 'Tavily Web Search');
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: `${query} medicament ghid clinic România`,
        search_depth: "advanced",
        include_answer: true,
        include_raw_content: true,
        max_results: 5,
        include_domains: ["rcp.ro", "anm.ro", "ms.ro", "medicinaregenerativa.ro"],
        exclude_domains: []
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      if (thinking) {
        thinking.addStep('result', `Am găsit ${data.results.length} rezultate relevante pe web`, 'Tavily Web Search');
      }

      const results = data.results.map((result: any) => 
        `Sursă: ${result.title} (${result.url})\nConținut: ${result.content}\n`
      ).join('\n---\n');
      
      const answer = data.answer ? `\nRăspuns sintetic: ${data.answer}` : '';
      
      return `Informații de pe web:\n${results}${answer}`;
    }
    
    if (thinking) {
      thinking.addStep('result', 'Nu s-au găsit rezultate relevante pe web', 'Tavily Web Search');
    }
    return "Nu s-au găsit rezultate relevante pe web.";
  } catch (error) {
    console.error('Advanced web search error:', error);
    if (thinking) {
      thinking.addStep('result', `Eroare la căutarea web: ${error.message}`, 'Tavily Web Search');
    }
    return `Eroare la căutarea web: ${error.message}`;
  }
}

async function generateAutoCypherQuery(question: string, thinking?: ThinkingTracker): Promise<string> {
  if (thinking) {
    thinking.addStep('reasoning', `Analizez întrebarea pentru a genera query Cypher automat: "${question}"`);
  }

  // Generate a basic Cypher query based on the question
  const questionLower = question.toLowerCase();
  let cypherQuery: string;
  
  if (questionLower.includes('medicament') || questionLower.includes('drug')) {
    const drugPattern = questionLower.match(/\b([a-zA-Z]+(?:mol|cin|lin|ina|an|ol))\b/);
    if (drugPattern) {
      const drugName = drugPattern[1];
      cypherQuery = `MATCH (d:Drug) WHERE toLower(d.name) CONTAINS toLower('${drugName}') RETURN d.name, d.description, d.dosage, d.sideEffects LIMIT 5`;
      if (thinking) {
        thinking.addStep('reasoning', `Am identificat medicamentul "${drugName}" în întrebare`);
      }
    } else {
      cypherQuery = `MATCH (d:Drug) RETURN d.name, d.description, d.dosage LIMIT 10`;
      if (thinking) {
        thinking.addStep('reasoning', 'Nu am identificat un medicament specific, voi căuta medicamente generale');
      }
    }
  } else if (questionLower.includes('interacțun') || questionLower.includes('interactiune')) {
    cypherQuery = `MATCH (d1:Drug)-[r:INTERACTS_WITH]->(d2:Drug) RETURN d1.name, r.severity, d2.name LIMIT 10`;
    if (thinking) {
      thinking.addStep('reasoning', 'Întrebarea se referă la interacțiuni medicamentoase');
    }
  } else if (questionLower.includes('contraindicat') || questionLower.includes('contraindication')) {
    cypherQuery = `MATCH (d:Drug)-[r:CONTRAINDICATED_IN]->(c:Condition) RETURN d.name, c.name, r.reason LIMIT 10`;
    if (thinking) {
      thinking.addStep('reasoning', 'Întrebarea se referă la contraindicații');
    }
  } else {
    // Default query
    cypherQuery = `MATCH (d:Drug) RETURN d.name, d.description LIMIT 5`;
    if (thinking) {
      thinking.addStep('reasoning', 'Folosesc query-ul default pentru medicamente generale');
    }
  }

  if (thinking) {
    thinking.addStep('action', `Query Cypher generat: ${cypherQuery}`);
  }

  return cypherQuery;
}

async function askAdvancedMedicalAI(question: string, webContext: string, neo4jContext?: any[], thinking?: ThinkingTracker): Promise<AnswerResponse> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    if (thinking) {
      thinking.addStep('result', 'Serviciul nu este disponibil - lipsește cheia API OpenAI');
    }
    return {
      answer: "Serviciul nu este disponibil - lipsește cheia API OpenAI.",
      sources: [],
      token_usage: 0,
      thinking_process: thinking?.getSteps()
    };
  }

  try {
    if (thinking) {
      thinking.addStep('reasoning', 'Pregătesc contextul pentru AI cu informațiile găsite');
    }

    let contextMessage = `Context din căutarea web:\n${webContext}\n\n`;
    
    if (neo4jContext && neo4jContext.length > 0) {
      const neo4jText = neo4jContext.map(item => 
        Object.entries(item).map(([key, value]) => `${key}: ${value}`).join(', ')
      ).join('\n');
      contextMessage += `Context din baza de date medicală (Neo4j):\n${neo4jText}\n\n`;
      
      if (thinking) {
        thinking.addStep('reasoning', `Am combinat informațiile: ${neo4jContext.length} rezultate Neo4j + informații web`);
      }
    }

    const systemPrompt = `
Ești un asistent medical AI avansat care oferă informații precise și actualizate despre medicamente,
tratamente și ghiduri clinice. Folosești informații din baza de date medicală locală (Neo4j) și 
căutarea web pentru a răspunde la întrebări.

Respectă întotdeauna următoarele reguli:
1. Nu oferi sfaturi medicale personalizate - recomandă întotdeauna consultul medical
2. Menționează întotdeauna sursele informațiilor (baza de date locală și/sau web)
3. Recunoaște limitările tale și recomandă consultarea unui medic pentru situații specifice
4. Răspunde în română într-un mod clar și structurat
5. Pentru medicamente, menționează: indicații, dozaj, contraindicații, efecte adverse
6. Pentru interacțiuni medicamentoase, specifică severitatea și mecanismul
7. Folosește informațiile din context pentru a oferi răspunsuri complete și actualizate

${contextMessage}
`;

    if (thinking) {
      thinking.addStep('action', 'Trimit întrebarea către OpenAI pentru analiză finală', 'OpenAI GPT');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.3,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;
    const tokenUsage = data.usage?.total_tokens || 0;

    const sources = ["OpenAI", "Web Search"];
    if (neo4jContext && neo4jContext.length > 0) {
      sources.push("Neo4j Medical Database");
    }

    if (thinking) {
      thinking.addStep('conclusion', `Am generat răspunsul final folosind ${tokenUsage} token-uri OpenAI`);
    }

    return {
      answer: answer,
      sources: sources,
      token_usage: tokenUsage,
      neo4j_results: neo4jContext,
      thinking_process: thinking?.getSteps()
    };

  } catch (error) {
    console.error('Advanced Medical AI error:', error);
    if (thinking) {
      thinking.addStep('result', `Eroare AI: ${error.message}`);
    }
    return {
      answer: `Îmi pare rău, am întâmpinat o eroare: ${error.message}. Te rog să încerci din nou mai târziu.`,
      sources: [],
      token_usage: 0,
      thinking_process: thinking?.getSteps()
    };
  }
}

async function performParallelSearch(question: string, customCypher?: string, includeThinking?: boolean): Promise<any> {
  const thinking = includeThinking ? new ThinkingTracker() : undefined;

  try {
    if (thinking) {
      thinking.addStep('reasoning', `Încep căutarea paralelă pentru întrebarea: "${question}"`);
      thinking.addStep('action', 'Execut în paralel: căutare Neo4j + căutare web');
    }

    // Generate Cypher query if not provided
    const cypherQuery = customCypher || await generateAutoCypherQuery(question, thinking);
    
    // Run both searches in parallel
    const [neo4jResults, webContext] = await Promise.all([
      runCypherQuery(cypherQuery, thinking).catch(err => {
        console.error('Neo4j parallel search error:', err);
        if (thinking) {
          thinking.addStep('result', `Neo4j a eșuat: ${err.message}`, 'Neo4j');
        }
        return [];
      }),
      searchWebAdvanced(question, thinking).catch(err => {
        console.error('Web parallel search error:', err);
        if (thinking) {
          thinking.addStep('result', `Căutarea web a eșuat: ${err.message}`, 'Web Search');
        }
        return "Căutarea web a eșuat.";
      })
    ]);

    // Generate AI response with both contexts
    const aiResponse = await askAdvancedMedicalAI(question, webContext, neo4jResults, thinking);

    return {
      answer: aiResponse.answer,
      sources: aiResponse.sources,
      token_usage: aiResponse.token_usage,
      parallel_results: {
        neo4j: neo4jResults,
        llm_web: aiResponse.answer
      },
      thinking_process: thinking?.getSteps()
    };

  } catch (error) {
    console.error('Parallel search error:', error);
    if (thinking) {
      thinking.addStep('result', `Eroare în căutarea paralelă: ${error.message}`);
    }
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Health check endpoint
    if (url.pathname.endsWith('/health') && req.method === 'GET') {
      try {
        // Test Neo4j connection
        const testCypher = "MATCH (n) RETURN count(n) as nodeCount LIMIT 1";
        await runCypherQuery(testCypher);
        
        return new Response(JSON.stringify({
          status: "healthy",
          assistant_ready: true,
          neo4j_connected: true,
          advanced_features: true,
          thinking_enabled: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (neo4jError) {
        return new Response(JSON.stringify({
          status: "limited",
          assistant_ready: true,
          neo4j_connected: false,
          advanced_features: false,
          thinking_enabled: true,
          error: "Neo4j connection failed"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Cypher query endpoint
    if (url.pathname.endsWith('/cypher') && req.method === 'POST') {
      let requestData;
      try {
        const body = await req.text();
        if (!body || body.trim() === '') {
          throw new Error('Request body is empty');
        }
        requestData = JSON.parse(body);
      } catch (parseError) {
        console.error('JSON parse error for cypher endpoint:', parseError);
        return new Response(JSON.stringify({
          error: "Invalid JSON în request body"
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { cypher, includeThinking } = requestData;
      
      if (!cypher) {
        return new Response(JSON.stringify({
          error: "Query Cypher lipsește"
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const thinking = includeThinking ? new ThinkingTracker() : undefined;
        const results = await runCypherQuery(cypher, thinking);
        return new Response(JSON.stringify({
          results: results,
          count: results.length,
          thinking_process: thinking?.getSteps()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          error: `Eroare Cypher: ${error.message}`
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Main question endpoint with advanced features
    if (req.method === 'POST') {
      let requestData: QuestionRequest;
      try {
        const body = await req.text();
        console.log('Received request body:', body);
        
        if (!body || body.trim() === '') {
          throw new Error('Request body is empty');
        }
        
        requestData = JSON.parse(body);
        console.log('Parsed request data:', requestData);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return new Response(JSON.stringify({
          error: "Invalid JSON în request body. Verifică formatul request-ului."
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const { question, useNeo4j, useCypher, useParallelSearch, includeThinking } = requestData;
      
      if (!question || question.trim().length < 3) {
        return new Response(JSON.stringify({
          error: "Întrebarea este prea scurtă. Te rog să oferi o întrebare medicală detaliată."
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let result: AnswerResponse;

      try {
        // Handle different types of requests
        if (useParallelSearch) {
          console.log('Performing parallel search with thinking:', includeThinking);
          result = await performParallelSearch(question, useCypher, includeThinking);
        } else if (useNeo4j || useCypher) {
          console.log('Performing Neo4j search with thinking:', includeThinking);
          const thinking = includeThinking ? new ThinkingTracker() : undefined;
          const cypherQuery = useCypher || await generateAutoCypherQuery(question, thinking);
          const neo4jResults = await runCypherQuery(cypherQuery, thinking);
          const webContext = await searchWebAdvanced(question, thinking);
          result = await askAdvancedMedicalAI(question, webContext, neo4jResults, thinking);
        } else {
          console.log('Performing standard search with thinking:', includeThinking);
          const thinking = includeThinking ? new ThinkingTracker() : undefined;
          const webContext = await searchWebAdvanced(question, thinking);
          result = await askAdvancedMedicalAI(question, webContext, undefined, thinking);
        }
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (processingError) {
        console.error('Processing error:', processingError);
        return new Response(JSON.stringify({
          error: `Eroare în procesarea întrebării: ${processingError.message}`
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Default response
    return new Response(JSON.stringify({
      message: "Advanced Medical Assistant API cu Supabase Edge Functions + Thinking Process",
      endpoints: {
        "/health": "GET - Status check cu Neo4j + Thinking",
        "/": "POST - Întrebări medicale avansate cu thinking",
        "/cypher": "POST - Query-uri Cypher directe cu thinking"
      },
      features: [
        "Neo4j Medical Database Integration",
        "Parallel Search (Neo4j + Web)",
        "Advanced Web Search cu domenii medicale",
        "RAG cu context îmbunătățit",
        "Auto-generated Cypher queries",
        "🧠 Thinking Process Tracking",
        "Step-by-step reasoning visualization"
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Advanced Edge function error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      type: "Advanced Medical Assistant Error"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
