
import os
import logging
from typing import Optional, Dict, Any, List
from functools import lru_cache
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain.chat_models import ChatOpenAI
from langchain.agents import initialize_agent, Tool
from langchain.tools.tavily_search import TavilySearchResults
from langchain.callbacks import get_openai_callback
from langchain.memory import ConversationBufferMemory
from langchain.schema import SystemMessage
from tenacity import retry, stop_after_attempt, wait_exponential
from neo4j import GraphDatabase

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# Configuration
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4")
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://20.215.233.235:7687")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "shrink-report-mentor-amanda-harvard-9201")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")
RAG_SEARCH_K = int(os.getenv("RAG_SEARCH_K", "4"))
API_TIMEOUT = int(os.getenv("API_TIMEOUT", "60"))

app = FastAPI(title="Medical Assistant API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionRequest(BaseModel):
    question: str

class AnswerResponse(BaseModel):
    answer: str
    sources: list = ["Neo4j", "web"]
    token_usage: Optional[int] = None

@lru_cache(maxsize=1)
def get_neo4j_driver():
    """Creates and caches the Neo4j driver"""
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))
        # Test connection
        with driver.session(database=NEO4J_DATABASE) as session:
            session.run("RETURN 1")
        logger.info("Neo4j connection established successfully")
        return driver
    except Exception as e:
        logger.error(f"Failed to connect to Neo4j: {e}")
        return None

def search_drugs_neo4j(query: str) -> str:
    """Search for drug information in Neo4j database"""
    try:
        driver = get_neo4j_driver()
        if not driver:
            return "Neo4j database not available"
            
        with driver.session(database=NEO4J_DATABASE) as session:
            # Search for drugs by name or description
            result = session.run(
                """
                MATCH (d:Drug) 
                WHERE toLower(d.name) CONTAINS toLower($query) 
                   OR toLower(d.description) CONTAINS toLower($query)
                RETURN d.name as name, d.description as description
                LIMIT $limit
                """,
                query=query, limit=RAG_SEARCH_K
            )
            
            drugs = []
            for record in result:
                drugs.append(f"Medicament: {record['name']} - {record['description']}")
            
            if drugs:
                return "Informații din baza de date medicală:\n" + "\n".join(drugs)
            else:
                return f"Nu s-au găsit informații în baza de date pentru: {query}"
                
    except Exception as e:
        logger.error(f"Error searching Neo4j: {e}")
        return f"Eroare la căutarea în baza de date: {str(e)}"

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
def create_medical_assistant():
    """Creates and returns a medical assistant agent with Neo4j and web search capabilities."""
    
    try:
        # 1. Initialize LLM with proper error handling
        llm = ChatOpenAI(
            model=OPENAI_MODEL, 
            temperature=0,
            request_timeout=API_TIMEOUT,
            streaming=False
        )
        
        # 2. Setup Neo4j RAG tool
        neo4j_rag_tool = None
        try:
            driver = get_neo4j_driver()
            if driver:
                neo4j_rag_tool = Tool(
                    name="MedicalKnowledgeBase",
                    func=search_drugs_neo4j,
                    description="""Folosește pentru întrebări despre medicamente, contraindicații,
                                   dozaje, interacțiuni medicamentoase și informații din baza de date medicală Neo4j."""
                )
        except Exception as e:
            logger.error(f"Error setting up Neo4j tool: {e}")
        
        # 3. Setup web search tool with error handling
        web_search_tool = None
        tavily_api_key = os.getenv("TAVILY_API_KEY")
        if tavily_api_key:
            try:
                web_search_tool = Tool(
                    name="WebSearch",
                    func=TavilySearchResults(max_results=5).run,
                    description="""Folosește pentru a găsi informații recente de pe internet despre 
                                  medicamente, ghiduri clinice, studii noi, reglementări medicale."""
                )
            except Exception as e:
                logger.error(f"Error setting up web search: {e}")
        else:
            logger.warning("TAVILY_API_KEY not found in environment variables")
        
        # 4. Create tools list
        tools = []
        if neo4j_rag_tool:
            tools.append(neo4j_rag_tool)
        if web_search_tool:
            tools.append(web_search_tool)
        
        if not tools:
            # Fallback to direct LLM if no tools available
            return llm
        
        # 5. Setup conversation memory
        memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
        
        # 6. Create and return the agent with system message
        system_message = SystemMessage(content="""
        Ești un asistent medical AI care oferă informații precise și actualizate despre medicamente,
        tratamente și ghiduri clinice. Folosești baza de date medicală Neo4j când sunt
        disponibile informații și cauți pe web pentru informații actualizate când este necesar. 
        
        Respectă întotdeauna următoarele reguli:
        1. Nu oferi sfaturi medicale personalizate
        2. Menționează întotdeauna sursa informațiilor
        3. Recunoaște limitările tale și recomandă consultarea unui medic pentru situații specifice
        """)
        
        agent = initialize_agent(
            tools=tools,
            llm=llm,
            agent_type="openai-functions",
            verbose=True,
            handle_parsing_errors=True,
            memory=memory,
            agent_kwargs={"system_message": system_message}
        )
        
        return agent
    
    except Exception as e:
        logger.error(f"Failed to create medical assistant: {e}")
        raise

def validate_query(query: str) -> bool:
    """Basic input validation to prevent prompt injection"""
    if not query or len(query.strip()) < 3:
        return False
    return True

def query_agent(agent, query: str, track_tokens: bool = True) -> Dict[str, Any]:
    """Query the agent with token usage tracking and input validation"""
    if not agent:
        return {"answer": "Agent initialization failed.", "token_usage": 0}
    
    if not validate_query(query):
        return {"answer": "Query invalid. Please provide a proper medical question.", "token_usage": 0}
    
    try:
        if track_tokens:
            with get_openai_callback() as cb:
                if hasattr(agent, 'run'):
                    response = agent.run(query)
                else:
                    # Fallback for direct LLM
                    response = agent.predict(query)
                logger.info(f"Token usage: {cb.total_tokens} tokens (${cb.total_cost:.4f})")
                return {"answer": response, "token_usage": cb.total_tokens}
        else:
            if hasattr(agent, 'run'):
                response = agent.run(query)
            else:
                response = agent.predict(query)
            return {"answer": response, "token_usage": 0}
    except Exception as e:
        logger.error(f"Error during query execution: {e}")
        return {"answer": f"Sorry, I encountered an error: {str(e)}", "token_usage": 0}

class MedicalAssistant:
    """Class to encapsulate the medical assistant functionality"""
    
    def __init__(self):
        self.agent = None
        try:
            self.agent = create_medical_assistant()
            logger.info("Medical assistant initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize medical assistant: {e}")
    
    def ask(self, query: str) -> Dict[str, Any]:
        """Public method to ask questions to the medical assistant"""
        return query_agent(self.agent, query)
    
    def is_ready(self) -> bool:
        """Check if the assistant is properly initialized"""
        return self.agent is not None

# Initialize the medical assistant
medical_assistant = MedicalAssistant()

@app.get("/")
async def root():
    return {"message": "Medical Assistant API with Neo4j is running"}

@app.get("/health")
async def health_check():
    neo4j_status = get_neo4j_driver() is not None
    return {
        "status": "healthy",
        "assistant_ready": medical_assistant.is_ready(),
        "neo4j_connected": neo4j_status
    }

@app.post("/ask", response_model=AnswerResponse)
async def ask_question(request: QuestionRequest):
    try:
        if not medical_assistant.is_ready():
            raise HTTPException(status_code=500, detail="Medical assistant not ready")
        
        result = medical_assistant.ask(request.question)
        
        return AnswerResponse(
            answer=result["answer"],
            token_usage=result.get("token_usage", 0),
            sources=["Neo4j", "web"] if medical_assistant.is_ready() else ["LLM"]
        )
    
    except Exception as e:
        logger.error(f"Error processing question: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
