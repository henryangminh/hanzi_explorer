from typing import Optional

from fastapi import APIRouter, HTTPException, status

from app.core.deps import AdminUser, CurrentUser, DbSession
from app.schemas.word_report import ReportStatus, WordReportCreate, WordReportResponse, WordReportUpdate
from app.services import word_report_service

router = APIRouter(prefix="/word-reports", tags=["word-reports"])


def _get_or_404(session: DbSession, report_id: int):
    report = word_report_service.get_report(session, report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report


@router.post("", response_model=WordReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(data: WordReportCreate, session: DbSession, user: CurrentUser):
    return word_report_service.create_report(session, user, data)


@router.get("", response_model=list[WordReportResponse])
def list_reports(session: DbSession, admin: AdminUser, status: Optional[ReportStatus] = None):
    return word_report_service.list_reports(session, status)


@router.patch("/{report_id}", response_model=WordReportResponse)
def update_report(report_id: int, data: WordReportUpdate, session: DbSession, admin: AdminUser):
    return word_report_service.set_status(session, _get_or_404(session, report_id), data.status)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(report_id: int, session: DbSession, admin: AdminUser):
    word_report_service.delete_report(session, _get_or_404(session, report_id))
