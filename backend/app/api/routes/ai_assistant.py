from fastapi import APIRouter

router = APIRouter()

@router.post("/chat")
async def chat():
    return {"user_message": "", "assistant_response": "AI is ready to assist"}

@router.get("/conversations")
async def get_conversations():
    return {"conversations": []}
