
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionRequest {
  question: string;
}

interface AnswerResponse {
  answer: string;
  sources: string[];
  token_usage?: number;
}

async function searchWeb(query: string): Promise<string> {
  const tavilyApiKey = Deno.env.get('TAVILY_API_KEY');
  
  if (!tavilyApiKey) {
    return "Căutarea web nu este disponibilă - lipsește cheia API Tavily.";
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: query,
        search_depth: "basic",
        include_answer: true,
        include_raw_content: false,
        max_results: 3,
        include_domains: [],
        exclude_domains: []
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const results = data.results.slice(0, 3).map((result: any) => 
        `${result.title}: ${result.content}`
      ).join('\n\n');
      
      return `Informații de pe web:\n${results}`;
    }
    
    return "Nu s-au găsit rezultate relevante pe web.";
  } catch (error) {
    console.error('Web search error:', error);
    return `Eroare la căutarea web: ${error.message}`;
  }
}

async function askMedicalAI(question: string): Promise<AnswerResponse> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    return {
      answer: "Serviciul nu este disponibil - lipsește cheia API OpenAI.",
      sources: [],
      token_usage: 0
    };
  }

  try {
    // Search web for additional context
    const webContext = await searchWeb(question);
    
    const systemPrompt = `
Ești un asistent medical AI care oferă informații precise și actualizate despre medicamente,
tratamente și ghiduri clinice. Folosești informații din căutarea web pentru a răspunde la întrebări.

Respectă întotdeauna următoarele reguli:
1. Nu oferi sfaturi medicale personalizate
2. Menționează întotdeauna că informațiile nu înlocuiesc consultul medical de specialitate
3. Recunoaște limitările tale și recomandă consultarea unui medic pentru situații specifice
4. Răspunde în română
5. Folosește informațiile din context pentru a oferi răspunsuri complete și actualizate

Context din căutarea web:
${webContext}
`;

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
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;
    const tokenUsage = data.usage?.total_tokens || 0;

    return {
      answer: answer,
      sources: ["OpenAI", "web"],
      token_usage: tokenUsage
    };

  } catch (error) {
    console.error('Medical AI error:', error);
    return {
      answer: `Îmi pare rău, am întâmpinat o eroare: ${error.message}. Te rog să încerci din nou mai târziu.`,
      sources: [],
      token_usage: 0
    };
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
    if (url.pathname === '/health' && req.method === 'GET') {
      return new Response(JSON.stringify({
        status: "healthy",
        assistant_ready: true,
        neo4j_connected: false // We're not using Neo4j in this Edge Function version
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ask question endpoint
    if (url.pathname === '/ask' && req.method === 'POST') {
      const { question } = await req.json() as QuestionRequest;
      
      if (!question || question.trim().length < 3) {
        return new Response(JSON.stringify({
          error: "Întrebarea este prea scurtă. Te rog să oferi o întrebare medicală detaliată."
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await askMedicalAI(question);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default response for unknown endpoints
    return new Response(JSON.stringify({
      message: "Medical Assistant API with Supabase Edge Functions is running"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
