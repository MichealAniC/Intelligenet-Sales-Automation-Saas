from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import LeadCategory
from app.models.utils import enum_values


class LeadScore(Base):
    __tablename__ = "lead_scores"

    score_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    lead_id: Mapped[str] = mapped_column(ForeignKey("leads.lead_id", ondelete="CASCADE"))
    score_value: Mapped[int] = mapped_column(Integer)
    score_category: Mapped[LeadCategory] = mapped_column(
        Enum(LeadCategory, name="lead_category", values_callable=enum_values)
    )
    prediction_probability: Mapped[float] = mapped_column(Float)
    prediction_result: Mapped[bool] = mapped_column(Boolean)
    model_name: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    lead = relationship("Lead", back_populates="scores")
