
# Medical Assistant Backend

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Add your API keys to the `.env` file:
- `OPENAI_API_KEY`: Your OpenAI API key
- `TAVILY_API_KEY`: Your Tavily API key (optional, for web search)

4. If you have a medical database (FAISS index), place it in the `medical_index` folder.

## Running the Server

```bash
python main.py
```

The server will run on `http://localhost:8000`

## API Endpoints

- `GET /`: Health check
- `GET /health`: Detailed health status
- `POST /ask`: Ask a medical question

### Example Request:
```json
POST /ask
{
  "question": "Ce interacțiuni are ibuprofenul cu warfarina?"
}
```

### Example Response:
```json
{
  "answer": "Ibuprofenul poate crește riscul de sângerare...",
  "sources": ["RAG", "web"],
  "token_usage": 123
}
```
