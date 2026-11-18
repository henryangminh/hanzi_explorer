from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, func, select

from app.models.user import User
from app.models.word_report import WordReport
from app.schemas.word_report import ReportStatus, WordReportCreate, WordReportResponse


def _to_response(report: WordReport, reporter: str) -> WordReportResponse:
    return WordReportResponse(
        id=report.id,
        char=report.char,
        message=report.message,
        status=report.status,
        reporter=reporter,
        created_at=report.created_at,
        resolved_at=report.resolved_at,
    )


def create_report(session: Session, user: User, data: WordReportCreate) -> WordReportResponse:
    report = WordReport(user_id=user.id, char=data.char.strip(), message=data.message.strip())
    session.add(report)
    session.commit()
    session.refresh(report)
    return _to_response(report, user.display_name)


def list_reports(session: Session, status: Optional[ReportStatus]) -> list[WordReportResponse]:
    """Newest first; all reports when `status` is None."""
    stmt = select(WordReport, User.display_name).join(User, User.id == WordReport.user_id)
    if status:
        stmt = stmt.where(WordReport.status == status)
    rows = session.exec(stmt.order_by(WordReport.created_at.desc())).all()
    return [_to_response(report, reporter) for report, reporter in rows]


def count_open(session: Session) -> int:
    return session.exec(select(func.count(WordReport.id)).where(WordReport.status == "open")).one()


def get_report(session: Session, report_id: int) -> WordReport | None:
    return session.get(WordReport, report_id)


def set_status(session: Session, report: WordReport, status: ReportStatus) -> WordReportResponse:
    report.status = status
    report.resolved_at = datetime.now(timezone.utc) if status == "resolved" else None
    session.add(report)
    session.commit()
    session.refresh(report)
    return _to_response(report, session.get(User, report.user_id).display_name)


def delete_report(session: Session, report: WordReport) -> None:
    session.delete(report)
    session.commit()
