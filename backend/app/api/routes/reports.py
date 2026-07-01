from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
import json
import os

from app.db.database import get_db
from app.models.models import Report
from app.schemas.schemas import ReportGenerateRequest
from app.utils.report_generator import generate_report

router = APIRouter()

@router.get("/")
def list_reports(db: Session = Depends(get_db)):
    return db.query(Report).order_by(Report.created_at.desc()).all()

@router.post("/generate")
def create_report(report: ReportGenerateRequest, db: Session = Depends(get_db)):
    title = f"{report.report_type.upper()} Report {datetime.now().strftime('%Y-%m-%d %H-%M-%S')}"
    data = {
        "Generated On": str(datetime.now()),
        "Include Predictions": report.include_predictions,
        "Include Forecasts": report.include_forecasts,
        "Filters": json.dumps(report.filters or {})
    }
    file_path = generate_report(report.report_type, title, data)
    db_report = Report(
        title=title,
        report_type=report.report_type.lower(),
        file_path=file_path,
        filters=json.dumps(report.filters or {}),
        created_at=datetime.now()
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return {"message":"Report generated successfully.","report":db_report}

@router.get("/{report_id}")
def get_report(report_id:int, db:Session=Depends(get_db)):
    report=db.query(Report).filter(Report.id==report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.get("/{report_id}/download")
def download_report(report_id:int, db:Session=Depends(get_db)):
    report=db.query(Report).filter(Report.id==report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Generated file not found")
    return FileResponse(report.file_path, filename=os.path.basename(report.file_path), media_type="application/octet-stream")

@router.delete("/{report_id}")
def delete_report(report_id:int, db:Session=Depends(get_db)):
    report=db.query(Report).filter(Report.id==report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.file_path and os.path.exists(report.file_path):
        os.remove(report.file_path)
    db.delete(report)
    db.commit()
    return {"message":"Report deleted successfully."}
