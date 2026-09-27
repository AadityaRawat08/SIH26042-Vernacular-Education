/**
 * Domain types for Tribhashniya.
 *
 * These interfaces are the contract between the UI and the (future) backend.
 * Every screen reads these shapes only — swap `src/lib/services/*` for real
 * REST/AI/language-API implementations without touching components.
 */

export type Role = "teacher" | "institute" | "parent";

export type LanguageCode = "hi" | "sat" | "en" | "ho" | "mun";

export interface Language {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  available: boolean;
}

export type Connectivity = "online" | "weak" | "offline";

export type StudentLevel = "beginner" | "average" | "advanced" | "mixed";

export interface TeacherProfile {
  id: string;
  fullName: string;
  photoUrl?: string;
  mobile: string;
  school: string;
  board: string;
  experienceYears: number;
  subjects: string[];
  classes: string[];
  sections: string[];
  qualification: string;
  skills: string[];
  spokenLanguages: LanguageCode[];
  interfaceLanguage: LanguageCode;
  teachingLanguage: LanguageCode;
  motherTongueCapable: boolean;
  studentCount: number;
  resources: string[];
  internet: Connectivity;
  teachingStyle: string;
  periodDuration: number;
  activityTypes: string[];
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export interface InstituteProfile {
  id: string;
  name: string;
  logoText: string;
  board: string;
  address: string;
  district: string;
  schoolType: string;
  classes: string[];
  sections: string[];
  teacherCount: number;
  studentCount: number;
  infrastructure: string[];
  academicYear: string;
}

export interface ParentProfile {
  id: string;
  parentName: string;
  childName: string;
  childClass: string;
  section: string;
  school: string;
  relationship: string;
}

export interface Classroom {
  id: string;
  className: string;
  section: string;
  subject: string;
  studentCount: number;
  language: LanguageCode;
  academicYear: string;
  currentTopic: string;
  understanding: number;
  colorKey: "primary" | "success" | "info" | "warning";
}

export interface Student {
  id: string;
  classroomId: string;
  name: string;
  roll: number;
  understanding: number;
  lastAssessment: number;
  weakArea: string;
  recommendedAction: string;
  motherTongue: LanguageCode;
  aiInsight: string;
  homeworkDone: number;
  homeworkTotal: number;
  topicScores: { topic: string; score: number }[];
  assessmentHistory: { date: string; title: string; score: number }[];
  teacherNotes: string[];
}

export interface PreviousLecture {
  id: string;
  classroomId: string;
  date: string;
  topic: string;
  chapter: string;
  durationMin: number;
  objective: string;
  activities: string[];
  assessmentScore: number;
  understanding: number;
  languageSupport: string;
  teacherNotes: string;
  aiSummary: string;
}

export interface UpcomingLecture {
  id: string;
  classroomId: string;
  week: string;
  date: string;
  topic: string;
  chapter: string;
  durationMin: number;
  objective: string;
  activities: string[];
  materials: string[];
  status: "planned" | "ai-adjusted" | "locked" | "draft";
  adjustedFrom?: string;
  adjustmentReason?: string;
}

export type PlanBlock =
  | "explanation"
  | "script"
  | "examples"
  | "localExamples"
  | "activity"
  | "story"
  | "audio"
  | "video"
  | "visuals"
  | "vocabulary"
  | "questions"
  | "worksheet"
  | "assessment"
  | "homework"
  | "remedial"
  | "advanced"
  | "blackboard";

export interface PlanRequest {
  className: string;
  section: string;
  subject: string;
  chapter: string;
  topic: string;
  language: LanguageCode;
  durationMin: number;
  blocks: PlanBlock[];
  resources: string[];
  internet: Connectivity;
  studentLevel: StudentLevel;
  note: string;
}

export interface TimelineStep {
  from: number;
  to: number;
  title: string;
  detail: string;
}

export interface VocabularyEntry {
  id: string;
  en: string;
  hi: string;
  sat: string;
  pronunciation: string;
  example: string;
  verified: boolean;
}

export interface VideoResource {
  id: string;
  title: string;
  durationMin: number;
  language: string;
  topic: string;
  relevance: number;
}

export interface QuestionSet {
  easy: string[];
  medium: string[];
  challenge: string[];
}

export interface PeriodPlan {
  id: string;
  request: PlanRequest;
  createdAt: string;
  approved: boolean;
  objective: string[];
  whatToTeach: string;
  timeline: TimelineStep[];
  script: string;
  scriptTranslations: Record<string, string>;
  explanation: string;
  vocabulary: VocabularyEntry[];
  localExamples: string[];
  activity: {
    objective: string;
    materials: string[];
    steps: string[];
    outcome: string;
    timeMin: number;
  };
  videos: VideoResource[];
  visuals: { title: string; caption: string }[];
  blackboard: string[];
  questions: QuestionSet;
  worksheet: { title: string; items: string[] };
  assessment: { title: string; items: string[] };
  homework: string[];
  remedial: string[];
  advanced: string[];
  teacherNotes: string[];
  rationale: string[];
}

export interface Assessment {
  id: string;
  classroomId: string;
  title: string;
  type: "test" | "quiz" | "homework" | "oral" | "activity";
  topic: string;
  language: LanguageCode;
  difficulty: "easy" | "medium" | "hard";
  questionCount: number;
  date: string;
  averageScore: number;
  attempted: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  kind: "class" | "ai" | "content" | "sync" | "assessment";
  read: boolean;
}

export interface ResourceItem {
  id: string;
  title: string;
  category: "video" | "audio" | "image" | "activity" | "worksheet" | "story" | "vocabulary";
  className: string;
  subject: string;
  language: string;
  duration: string;
  sizeMb: number;
}

export interface CurriculumChapter {
  id: string;
  board: string;
  className: string;
  subject: string;
  chapter: string;
  lessons: { title: string; topics: string[] }[];
  documents: { title: string; kind: "textbook" | "syllabus" | "guide" | "supplement"; sizeMb: number }[];
}

export interface OfflinePack {
  id: string;
  label: string;
  classroomId: string;
  sizeMb: number;
  includes: string[];
  downloaded: boolean;
}

export interface SyncItem {
  id: string;
  label: string;
  kind: string;
  createdAt: string;
}

export interface CorrectionItem {
  id: string;
  term: string;
  aiOutput: string;
  suggestion: string;
  language: string;
  status: "pending" | "verified" | "rejected";
  submittedBy: string;
}
