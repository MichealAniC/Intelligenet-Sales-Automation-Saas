from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ActivityType, ActivityOutcome


class Activity(Base):
    __tablename__ = "activities"

    activity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    lead_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("leads.lead_id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    activity_type: Mapped[ActivityType] = mapped_column(
        Enum(ActivityType, name="activity_type"),
        nullable=False,
    )
    outcome: Mapped[ActivityOutcome] = mapped_column(
        Enum(ActivityOutcome, name="activity_outcome"),
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    lead = relationship("Lead", back_populates="activities")
    user = relationship("User", back_populates="activities")
