export type UserRole = "Admin" | "Sales";

export type SeniorityLevel = "C-Suite" | "VP" | "Director" | "Manager" | "Staff";

export type CompanySizeCategory = "Startup" | "SMB" | "Mid-Market" | "Enterprise";

export type LeadSource =
  | "LinkedIn"
  | "Webinar"
  | "Referral"
  | "Cold Email"
  | "Website"
  | "Paid Ads"
  | "Events";

export type FollowUpStatus = "Positive" | "Neutral" | "Negative" | "No Response";

export type EstimatedBudget = "Low" | "Medium" | "High";

export type PurchaseTimeline = "Immediate" | "1-3 Months" | "3-6 Months" | "Future";

export type LeadCategory = "Hot" | "Warm" | "Cold";

export type AssignmentStatus = "Assigned" | "In Progress" | "Completed";

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Unqualified"
  | "Converted"
  | "Archived";

export type UUID = string;

export interface UserPublic {
  id: UUID;
  organization_id: UUID;
  staff_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
  organization_name?: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer" | string;
  user: UserPublic;
}

export interface LoginRequest {
  staff_id: string;
  password: string;
}

export interface AdminSignupRequest {
  organization_name: string;
  full_name: string;
  email: string;
  password: string;
  staff_id: string;
}

export interface InvitationCreateRequest {
  email: string;
  expires_in_hours?: number;
}

export interface InvitationPublic {
  id: UUID;
  organization_id: UUID;
  email: string;
  role: UserRole;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface InvitationCreateResponse {
  invitation: InvitationPublic;
  invitation_token: string;
  invitation_url: string;
}

export interface InvitationInfo {
  organization_name: string;
  email: string;
  role: UserRole;
  expires_at: string;
}

export interface InvitationAcceptRequest {
  token: string;
  full_name: string;
  password: string;
  staff_id: string;
}

export interface LeadImportIssue {
  severity: "error" | "warning";
  row?: number | null;
  field?: string | null;
  message: string;
}

export interface LeadImportValidateResponse {
  row_count: number;
  mapped_columns: Record<string, string>;
  missing_required_columns: string[];
  extra_columns: string[];
  preview_rows: Record<string, unknown>[];
  issues: LeadImportIssue[];
}

export interface LeadImportRowResult {
  row: number;
  status: "imported" | "updated" | "skipped_duplicate" | "failed";
  lead_id?: string | null;
  assigned_to?: string | null;
  score_value?: number | null;
  score_category?: string | null;
  message?: string | null;
}

export interface LeadImportResponse {
  batch_id?: string | null;
  row_count: number;
  imported_count: number;
  updated_count: number;
  skipped_duplicate_count: number;
  failed_count: number;
  results: LeadImportRowResult[];
  issues: LeadImportIssue[];
  error_report_csv?: string | null;
}

export interface LeadCreate {
  full_name?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  job_title: string;
  seniority_level: SeniorityLevel;
  department: string;
  country: string;
  company_name: string;
  company_industry: string;
  company_size_category: CompanySizeCategory;
  company_size_range: string;
  estimated_annual_revenue: number;
  lead_source: LeadSource;
  date_captured: string;
  website_visits: number;
  pages_viewed: number;
  average_time_on_site: number;
  email_open_rate: number;
  email_click_rate: number;
  webinar_attendance: boolean;
  last_interaction_days: number;
  meeting_scheduled: boolean;
  follow_up_status: FollowUpStatus;
  estimated_budget: EstimatedBudget;
  purchase_timeline: PurchaseTimeline;
  lead_status?: LeadStatus | null;
}

export interface LeadPublic extends LeadCreate {
  lead_id: string;
  full_name: string;
  lead_status: LeadStatus;
  converted: boolean;
  created_at: string;
}

export interface LeadScorePublic {
  score_id: UUID;
  lead_id: string;
  score_value: number;
  score_category: LeadCategory;
  prediction_probability: number;
  prediction_result: boolean;
  model_name: string;
  created_at: string;
}

export interface LeadAssignmentPublic {
  assignment_id: UUID;
  lead_id: string;
  assigned_to: UUID;
  assigned_by: UUID | null;
  assignment_priority: LeadCategory;
  assignment_status: AssignmentStatus;
  assignment_date: string;
}

export interface LeadWorkflowResponse {
  lead: LeadPublic;
  score: LeadScorePublic;
  assignment: LeadAssignmentPublic | null;
  recommended_action: string;
}

export interface LeadSummaryItem {
  lead: LeadPublic;
  score_value?: number | null;
  score_category?: LeadCategory | null;
  prediction_probability?: number | null;
  recommended_action?: string | null;
  assigned_to_staff_id?: string | null;
  assigned_to_name?: string | null;
  assignment_status?: AssignmentStatus | null;
}

export interface LeadOpsListResponse {
  total: number;
  items: LeadSummaryItem[];
}

export interface DashboardRecentScore {
  lead_id: string;
  lead_name: string;
  company_name?: string | null;
  score_value: number;
  score_category: LeadCategory;
  prediction_probability?: number | null;
  recommended_action?: string | null;
  created_at: string;
  assigned_to_staff_id?: string | null;
  assigned_to_name?: string | null;
}

export interface DashboardOverview {
  total_leads: number;
  scored_leads: number;
  hot_count: number;
  warm_count: number;
  cold_count: number;
  assigned_leads: number;
  unassigned_leads: number;
  recent_scores: DashboardRecentScore[];
}

export interface LeadEventPublic {
  id: UUID;
  lead_id: string;
  actor_user_id?: UUID | null;
  batch_id?: UUID | null;
  event_type: string;
  data?: Record<string, unknown> | null;
  created_at: string;
}

export interface LeadNotePublic {
  id: UUID;
  lead_id: string;
  author_user_id?: UUID | null;
  body: string;
  created_at: string;
}

export interface LeadTagPublic {
  id: UUID;
  name: string;
  created_at: string;
}

export interface LeadIntelligenceAI {
  score_value?: number | null;
  conversion_probability?: number | null;
  lead_tier?: LeadCategory | null;
  ai_priority_level?: string | null;
  confidence_score?: number | null;
  ranking_position?: number | null;
  predicted_value?: number | null;
  recommended_action?: string | null;
  reasoning?: string | null;
}

export interface LeadIntelligenceAssignment {
  assigned_to_staff_id?: string | null;
  assigned_to_name?: string | null;
  assignment_status?: AssignmentStatus | null;
}

export interface LeadIntelligenceDetail {
  lead: LeadPublic;
  lead_status: LeadStatus;
  import_batch_code?: string | null;
  raw_data?: Record<string, unknown> | null;
  ai: LeadIntelligenceAI;
  assignment: LeadIntelligenceAssignment;
  recent_events: LeadEventPublic[];
  notes: LeadNotePublic[];
  tags: LeadTagPublic[];
}
