from fastapi import APIRouter
from app.services import leave_report_service as service
from app.services.export_service import export_csv

router = APIRouter(prefix="/reports/leaves", tags=["Leave Reports"])

@router.get("/status-summary")
def status_summary():
    return service.leave_status_summary()

@router.get("/status-summary/download")
def status_summary_download():
    return export_csv(service.leave_status_summary(), "leave_status_summary.csv")