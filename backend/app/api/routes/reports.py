from fastapi import APIRouter

router = APIRouter()

@router.post("/generate")
async def generate_report():
    return {"report_id": 1, "status": "generated"}

@router.get("/{report_id}/download")
async def download_report(report_id: int):
    return {"report_id": report_id, "download": "ready"}
