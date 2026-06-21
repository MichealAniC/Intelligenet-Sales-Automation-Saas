from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import ARRAY, Boolean, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AvailabilityStatus, ProfileStatus, SalesProfile, UserRole
from app.models.utils import enum_values


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    staff_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=enum_values)
    )
    # ── Prescriptive Lead Routing attributes ──────────────────────────
    sales_profile: Mapped[SalesProfile | None] = mapped_column(
        Enum(SalesProfile, name="sales_profile", values_callable=enum_values),
        nullable=True,
    )
    availability_status: Mapped[AvailabilityStatus] = mapped_column(
        Enum(AvailabilityStatus, name="availability_status", values_callable=enum_values),
        nullable=False,
        server_default="Available",
    )
    performance_rating: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    industry_specializations: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, server_default="{}"
    )
    auto_assignment_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    profile_status: Mapped[ProfileStatus] = mapped_column(
        Enum(ProfileStatus, name="profile_status", values_callable=enum_values),
        nullable=False,
        server_default="Pending Configuration",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    organization = relationship("Organization", back_populates="users")
    assignments_received = relationship(
        "LeadAssignment",
        foreign_keys="LeadAssignment.assigned_to",
        back_populates="assignee",
    )
    assignments_given = relationship(
        "LeadAssignment",
        foreign_keys="LeadAssignment.assigned_by",
        back_populates="assigner",
    )

    @property
    def organization_name(self) -> str | None:
        return self.organization.name if self.organization else None
