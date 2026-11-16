export type MajorId =
  | 'engineering'
  | 'medicine'
  | 'pharmacy'
  | 'it'
  | 'business'
  | 'law'
  | 'education'
  | 'media'
  | 'sciences'
  | 'arts'
  | 'humanities'
  | 'sports';

export type MaterialType = 'lecture' | 'summary' | 'past_exams' | 'book' | 'video';

export type AccessTier = 'free' | 'basic' | 'full';

export type PlanId = 'free' | 'basic' | 'full' | 'annual' | 'instructor';

export type BillingCycle = 'monthly' | 'semester' | 'annual';

export interface MaterialReview {
  id: string;
  studentName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export type TeacherEvaluationStatus = 'pending' | 'evaluated' | 'needs_revision';

export interface StudyMaterial {
  id: string;
  title: string;
  university: string;
  faculty?: string;
  department?: string;
  majorId: MajorId;
  courseCode: string;
  courseName: string;
  academicYear: number;
  type: MaterialType;
  accessTier: AccessTier;
  authorName: string;
  authorRole: 'student' | 'instructor';
  verified: boolean;
  pagesOrDuration: string;
  updatedAt: string;
  ratingAvg: number;
  ratingCount: number;
  downloadsCount: number;
  summaryNotes: string;
  previewContent: string[];
  reviews: MaterialReview[];
  fileName?: string;
  evaluationStatus?: TeacherEvaluationStatus;
  teacherPointsAwarded?: number;
  teacherEvaluationNote?: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
}

export interface CourseRequest {
  id: string;
  courseName: string;
  majorId: MajorId;
  university: string;
  faculty?: string;
  department?: string;
  notes: string;
  votes: number;
  votedByUser: boolean;
  createdAt: string;
  status?: 'pending' | 'fulfilled';
}

export type AssistantRole = 'advisor' | 'tutor' | 'fast_reviewer';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: string;
  modelUsed?: string;
  usedSearch?: boolean;
  sources?: GroundingSource[];
  searchFallbackReason?: string;
}

export type UserRole = 'student' | 'teacher' | 'admin';

export interface AuthSession {
  isAuthenticated: boolean;
  role: UserRole;
  displayName: string;
  email: string;
  departmentOrTitle: string;
}

export interface ExamCourse {
  id: string;
  courseCode: string;
  courseName: string;
  majorId: MajorId;
  academicYear: number;
  examTitle: string;
  examDate: string;
  location: string;
}

export interface ExamNotificationLog {
  id: string;
  examId: string;
  courseCode: string;
  courseName: string;
  channel: 'in_app' | 'whatsapp' | 'email' | 'browser';
  message: string;
  sentAt: string;
  read: boolean;
}

export interface MaterialStatusNotification {
  id: string;
  materialId: string;
  courseCode: string;
  courseName: string;
  materialTitle: string;
  status: TeacherEvaluationStatus;
  pointsAwarded?: number;
  note?: string;
  evaluatedBy?: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export type SocialProvider = 'x' | 'facebook' | 'google' | 'instagram';

export interface LinkedSocialAccount {
  connected: boolean;
  handle: string;
  connectedAt?: string;
}

export type LinkedAccountsMap = Record<SocialProvider, LinkedSocialAccount>;

export interface StudentProfile {
  name: string;
  university: string;
  faculty?: string;
  department?: string;
  majorId: MajorId;
  academicYear: number;
  planId: PlanId;
  points: number;
  examAlertsEnabled: boolean;
  whatsappAlertsEnabled: boolean;
  emailAlertsEnabled: boolean;
  uploadedCount: number;
  enrolledCourses: string[];
  alertLeadHours: number;
  linkedAccounts: LinkedAccountsMap;
}

export interface LeanWeekTask {
  week: number;
  title: string;
  details: string;
  targetMetric: string;
  completed: boolean;
}

export interface CanvasBlock {
  id: string;
  number: string;
  title: string;
  summary: string;
  points: string[];
}

export interface CampusPartnerAd {
  id: string;
  name: string;
  category: string;
  offer: string;
  location: string;
  code: string;
}

export interface SupportTicket {
  id: string;
  channel: 'whatsapp' | 'chat';
  message: string;
  createdAt: string;
  status: string;
  resolved?: boolean;
  adminReply?: string;
}

export interface AppState {
  universities: string[];
  authSession: AuthSession;
  profile: StudentProfile;
  materials: StudyMaterial[];
  courseRequests: CourseRequest[];
  leanTasks: LeanWeekTask[];
  canvasBlocks: CanvasBlock[];
  partnerAds: CampusPartnerAd[];
  supportTickets: SupportTicket[];
  exams: ExamCourse[];
  examNotifications: ExamNotificationLog[];
  materialNotifications: MaterialStatusNotification[];
}
