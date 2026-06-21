from enum import Enum


class UserRole(str, Enum):
    ADMIN = "Admin"
    SALES = "Sales"


class SeniorityLevel(str, Enum):
    C_SUITE = "C-Suite"
    VP = "VP"
    DIRECTOR = "Director"
    MANAGER = "Manager"
    STAFF = "Staff"


class CompanySizeCategory(str, Enum):
    STARTUP = "Startup"
    SMB = "SMB"
    MID_MARKET = "Mid-Market"
    ENTERPRISE = "Enterprise"


class LeadSource(str, Enum):
    LINKEDIN = "LinkedIn"
    WEBINAR = "Webinar"
    REFERRAL = "Referral"
    COLD_EMAIL = "Cold Email"
    WEBSITE = "Website"
    PAID_ADS = "Paid Ads"
    EVENTS = "Events"


class FollowUpStatus(str, Enum):
    POSITIVE = "Positive"
    NEUTRAL = "Neutral"
    NEGATIVE = "Negative"
    NO_RESPONSE = "No Response"


class EstimatedBudget(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class PurchaseTimeline(str, Enum):
    IMMEDIATE = "Immediate"
    ONE_TO_THREE_MONTHS = "1-3 Months"
    THREE_TO_SIX_MONTHS = "3-6 Months"
    FUTURE = "Future"


class LeadCategory(str, Enum):
    HOT = "Hot"
    WARM = "Warm"
    COLD = "Cold"


class AssignmentStatus(str, Enum):
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"


class LeadStatus(str, Enum):
    NEW = "New"
    CONTACTED = "Contacted"
    QUALIFIED = "Qualified"
    UNQUALIFIED = "Unqualified"
    CONVERTED = "Converted"
    ARCHIVED = "Archived"


class SalesProfile(str, Enum):
    JUNIOR_SALES_REP = "Junior Sales Rep"
    SENIOR_SALES_REP = "Senior Sales Rep"
    INDUSTRY_SPECIALIST = "Industry Specialist"
    TOP_PERFORMER = "Top Performer"


class AvailabilityStatus(str, Enum):
    AVAILABLE = "Available"
    BUSY = "Busy"
    ON_LEAVE = "On Leave"
    INACTIVE = "Inactive"


class ProfileStatus(str, Enum):
    PENDING_CONFIGURATION = "Pending Configuration"
    ACTIVE = "Active"
    DISABLED = "Disabled"
