from fastapi import FastAPI
from app.api import attendance_reports, employee_reports, leave_reports, payroll_reports, performance_reports

app = FastAPI(title="EMS Reports Service")

app.include_router(attendance_reports.router)
app.include_router(employee_reports.router)
app.include_router(leave_reports.router)
app.include_router(payroll_reports.router)
app.include_router(performance_reports.router)
