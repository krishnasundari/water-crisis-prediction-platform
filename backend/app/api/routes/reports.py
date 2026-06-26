from fastapi import APIRouter

router = APIRouter()

# Temporary in-memory storage
reports = [
    {
        "id": 1,
        "title": "Monthly Water Report",
        "type": "PDF",
        "created_at": "2026-06-26"
    },
    {
        "id": 2,
        "title": "Village Risk Analysis",
        "type": "CSV",
        "created_at": "2026-06-26"
    }
]


@router.get("/")
async def list_reports():
    return reports


@router.post("/generate")
async def generate_report(report: dict):

    report["id"] = len(reports) + 1

    reports.append(report)

    return {
        "message": "Report generated successfully",
        "data": report
    }


@router.get("/{report_id}")
async def get_report(report_id: int):

    for report in reports:
        if report["id"] == report_id:
            return report

    return {
        "error": "Report not found"
    }


@router.delete("/{report_id}")
async def delete_report(report_id: int):

    for report in reports:

        if report["id"] == report_id:
            reports.remove(report)

            return {
                "message": "Report deleted successfully"
            }

    return {
        "error": "Report not found"
    }


@router.get("/{report_id}/download")
async def download_report(report_id: int):

    return {
        "message": "Download started",
        "report_id": report_id
    }