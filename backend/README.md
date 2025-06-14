
# Medical Assistant Backend with Neo4j

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Add your API keys and Neo4j credentials to the `.env` file:
- `OPENAI_API_KEY`: Your OpenAI API key
- `TAVILY_API_KEY`: Your Tavily API key (optional, for web search)
- `NEO4J_URI`: Your Neo4j database URI (default: bolt://20.215.233.235:7687)
- `NEO4J_USERNAME`: Your Neo4j username (default: neo4j)
- `NEO4J_PASSWORD`: Your Neo4j password
- `NEO4J_DATABASE`: Your Neo4j database name (default: neo4j)

## Neo4j Database Setup

Make sure your Neo4j database contains drug information with the following structure:
```cypher
MERGE (d:Drug {name: "Paracetamol"}) 
SET d.description = "Analgezic și antipiretic."

MERGE (d:Drug {name: "Ibuprofen"}) 
SET d.description = "Antiinflamator nesteroidian."
```

## Running the Server

```bash
python main.py
```

The server will run on `http://localhost:8000`

## API Endpoints

- `GET /`: Health check
- `GET /health`: Detailed health status including Neo4j connection
- `POST /ask`: Ask a medical question

### Example Request:
```json
POST /ask
{
  "question": "Ce este paracetamolul?"
}
```

### Example Response:
```json
{
  "answer": "Paracetamolul este un analgezic și antipiretic folosit pentru...",
  "sources": ["Neo4j", "web"],
  "token_usage": 123
}
```

## Features

- **Neo4j Integration**: Searches medical database for drug information
- **Web Search**: Uses Tavily for recent medical information
- **Token Usage Tracking**: Monitors OpenAI API usage
- **Error Handling**: Graceful fallbacks when services are unavailable
