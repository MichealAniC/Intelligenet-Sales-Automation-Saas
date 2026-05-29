from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AssignmentStatus, LeadCategory
from app.models.utils import enum_values


class LeadAssignment(Base):
    __tablename__ = "lead_assignments"

    assignment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    lead_id: Mapped[str] = mapped_column(ForeignKey("leads.lead_id", ondelete="CASCADE"))
    assigned_to: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    assigned_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    assignment_priority: Mapped[LeadCategory] = mapped_column(
        Enum(LeadCategory, name="lead_category", values_callable=enum_values)
    )
    assignment_status: Mapped[AssignmentStatus] = mapped_column(
        Enum(AssignmentStatus, name="assignment_status", values_callable=enum_values)
    )
    assignment_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    lead = relationship("Lead", back_populates="assignments")
    assignee = relationship(
        "User",
        foreign_keys=[assigned_to],
        back_populates="assignments_received",
    )
    assigner = relationship(
        "User",
        foreign_keys=[assigned_by],
        back_populates="assignments_given",
    )
