import type {
  Assessment,
  Classroom,
  CorrectionItem,
  CurriculumChapter,
  InstituteProfile,
  Language,
  NotificationItem,
  OfflinePack,
  ParentProfile,
  PreviousLecture,
  ResourceItem,
  Student,
  SyncItem,
  TeacherProfile,
  UpcomingLecture,
  VocabularyEntry,
} from "../types";

/** Demo data only. Replace with API responses when a backend is connected. */

export const LANGUAGES: Language[] = [
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", available: true },
  { code: "sat", label: "Santhali", nativeLabel: "ᱥᱟᱱᱛᱟᱲᱤ", available: true },
  { code: "en", label: "English", nativeLabel: "English", available: true },
  { code: "ho", label: "Ho", nativeLabel: "𑢹𑣉𑣉", available: false },
  { code: "mun", label: "Mundari", nativeLabel: "Mundari", available: false },
];

export const BOARDS = ["JAC (Jharkhand)", "CBSE", "ICSE", "State Board", "NCERT aligned"];

export const RESOURCE_OPTIONS = [
  "Blackboard",
  "Chalk",
  "Notebook",
  "Classroom objects",
  "Teacher smartphone",
  "Speaker",
  "Projector",
  "Smart board",
];

export const ACTIVITY_TYPES = [
  "Physical / object based",
  "Storytelling",
  "Group work",
  "Oral drill",
  "Board work",
  "Song & rhyme",
];

export const defaultTeacher: TeacherProfile = {
  id: "t-1",
  fullName: "Reeta Murmu",
  mobile: "+91 98765 43210",
  school: "Govt. Primary School, Dumka",
  board: "JAC (Jharkhand)",
  experienceYears: 8,
  subjects: ["Mathematics", "EVS", "Hindi"],
  classes: ["Class 1", "Class 2", "Class 3"],
  sections: ["A", "B"],
  qualification: "B.Ed, D.El.Ed",
  skills: ["Multi-grade teaching", "Mother-tongue instruction", "Activity based learning"],
  spokenLanguages: ["hi", "sat", "en"],
  interfaceLanguage: "en",
  teachingLanguage: "hi",
  motherTongueCapable: true,
  studentCount: 38,
  resources: ["Blackboard", "Chalk", "Notebook", "Classroom objects", "Teacher smartphone"],
  internet: "weak",
  teachingStyle: "Activity first, then explanation",
  periodDuration: 40,
  activityTypes: ["Physical / object based", "Oral drill"],
  audioEnabled: true,
  videoEnabled: false,
};

export const defaultInstitute: InstituteProfile = {
  id: "i-1",
  name: "Govt. Primary School, Dumka",
  logoText: "GPS",
  board: "JAC (Jharkhand)",
  address: "Ward 6, Dudhani Road, Dumka",
  district: "Dumka, Jharkhand",
  schoolType: "Government Primary",
  classes: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"],
  sections: ["A", "B"],
  teacherCount: 14,
  studentCount: 412,
  infrastructure: ["Blackboard", "Speaker", "Library corner", "Mid-day meal kitchen"],
  academicYear: "2025–26",
};

export const defaultParent: ParentProfile = {
  id: "p-1",
  parentName: "Sanjay Hansda",
  childName: "Anita Hansda",
  childClass: "Class 2",
  section: "A",
  school: "Govt. Primary School, Dumka",
  relationship: "Father",
};

export const classrooms: Classroom[] = [
  {
    id: "c-2a",
    className: "Class 2",
    section: "A",
    subject: "Mathematics",
    studentCount: 38,
    language: "sat",
    academicYear: "2025–26",
    currentTopic: "Addition up to 20",
    understanding: 76,
    colorKey: "primary",
  },
  {
    id: "c-2b",
    className: "Class 2",
    section: "B",
    subject: "Mathematics",
    studentCount: 35,
    language: "hi",
    academicYear: "2025–26",
    currentTopic: "Subtraction basics",
    understanding: 54,
    colorKey: "warning",
  },
  {
    id: "c-1a",
    className: "Class 1",
    section: "A",
    subject: "EVS",
    studentCount: 41,
    language: "sat",
    academicYear: "2025–26",
    currentTopic: "Plants around us",
    understanding: 82,
    colorKey: "success",
  },
  {
    id: "c-3a",
    className: "Class 3",
    section: "A",
    subject: "Hindi",
    studentCount: 33,
    language: "hi",
    academicYear: "2025–26",
    currentTopic: "मात्रा पहचान",
    understanding: 88,
    colorKey: "info",
  },
];

const firstNames = [
  "Anita",
  "Sunil",
  "Phulmani",
  "Ravi",
  "Sita",
  "Mangal",
  "Budhni",
  "Rajesh",
  "Salkhan",
  "Kajal",
  "Dinesh",
  "Rupa",
];
const lastNames = ["Hansda", "Murmu", "Soren", "Tudu", "Besra", "Kisku", "Hembrom", "Marandi"];
const weakAreas = [
  "Carrying in addition",
  "Number names 11–20",
  "Reading word problems",
  "Counting backwards",
  "Place value",
];
const actions = [
  "Use physical objects, explain in mother tongue",
  "Repeat oral drill with smaller numbers",
  "Pair with a peer for group activity",
  "Give picture-based worksheet",
];

function makeStudents(classroomId: string, count: number, base: number): Student[] {
  return Array.from({ length: count }, (_, i) => {
    const name = `${firstNames[i % firstNames.length]!} ${lastNames[i % lastNames.length]!}`;
    const understanding = Math.max(28, Math.min(98, base + ((i * 13) % 45) - 22));
    return {
      id: `${classroomId}-s${i + 1}`,
      classroomId,
      name,
      roll: i + 1,
      understanding,
      lastAssessment: Math.max(20, Math.min(100, understanding + ((i % 5) - 2) * 4)),
      weakArea: weakAreas[i % weakAreas.length]!,
      recommendedAction: actions[i % actions.length]!,
      motherTongue: i % 3 === 0 ? "sat" : "hi",
      aiInsight:
        understanding < 55
          ? "Student answers correctly when the question is repeated in Santhali — this looks like a language gap, not a concept gap."
          : "Student performs better after mother-tongue explanation followed by a physical activity.",
      homeworkDone: 6 + (i % 5),
      homeworkTotal: 10,
      topicScores: [
        { topic: "Counting", score: Math.min(100, understanding + 8) },
        { topic: "Addition", score: understanding },
        { topic: "Subtraction", score: Math.max(20, understanding - 14) },
        { topic: "Shapes", score: Math.min(100, understanding + 3) },
      ],
      assessmentHistory: [
        { date: "12 Mar", title: "Addition oral drill", score: understanding },
        { date: "06 Mar", title: "Counting quiz", score: Math.min(100, understanding + 6) },
        { date: "27 Feb", title: "Number worksheet", score: Math.max(25, understanding - 9) },
      ],
      teacherNotes:
        understanding < 55
          ? ["Sits at the back, hesitant to answer aloud.", "Responds well to stick-counting."]
          : ["Confident in oral answers.", "Helps peers during group activity."],
    };
  });
}

export const students: Student[] = [
  ...makeStudents("c-2a", 38, 76),
  ...makeStudents("c-2b", 35, 54),
  ...makeStudents("c-1a", 41, 82),
  ...makeStudents("c-3a", 33, 88),
];

export const previousLectures: PreviousLecture[] = [
  {
    id: "pl-1",
    classroomId: "c-2a",
    date: "12 March 2026",
    topic: "Addition up to 10",
    chapter: "Chapter 3 — Adding numbers",
    durationMin: 40,
    objective: "Students combine two small quantities and say the total.",
    activities: ["Stick counting in pairs", "Oral drill 2+3, 4+1", "Blackboard sums"],
    assessmentScore: 78,
    understanding: 76,
    languageSupport: "Hindi + Santhali",
    teacherNotes: "Back rows needed the Santhali repetition twice.",
    aiSummary:
      "Most students understood addition using physical objects. 7 students require additional practice with quantities above 6.",
  },
  {
    id: "pl-2",
    classroomId: "c-2a",
    date: "10 March 2026",
    topic: "Number names 11–20",
    chapter: "Chapter 2 — Numbers",
    durationMin: 40,
    objective: "Students read and write number names from eleven to twenty.",
    activities: ["Number card game", "Board writing", "Group chanting"],
    assessmentScore: 71,
    understanding: 69,
    languageSupport: "Hindi",
    teacherNotes: "Confusion between 13 and 30 in Hindi.",
    aiSummary:
      "Recognition is strong orally but written forms are weak. Recommend a writing worksheet before moving ahead.",
  },
  {
    id: "pl-3",
    classroomId: "c-2b",
    date: "12 March 2026",
    topic: "Subtraction — taking away",
    chapter: "Chapter 4 — Subtraction",
    durationMin: 40,
    objective: "Students remove a quantity from a group and count what remains.",
    activities: ["Stone removal activity", "Story problem"],
    assessmentScore: 54,
    understanding: 54,
    languageSupport: "Hindi",
    teacherNotes: "Too abstract, needed more objects.",
    aiSummary:
      "Class struggled with quantity separation. 14 students answered below 50%. Recommend returning to concrete objects and revisiting addition first.",
  },
  {
    id: "pl-4",
    classroomId: "c-1a",
    date: "11 March 2026",
    topic: "Parts of a plant",
    chapter: "Chapter 5 — Plants around us",
    durationMin: 30,
    objective: "Students name root, stem, leaf and flower.",
    activities: ["Leaf collection walk", "Drawing on board"],
    assessmentScore: 84,
    understanding: 82,
    languageSupport: "Santhali",
    teacherNotes: "Very high participation outdoors.",
    aiSummary: "Strong recall of local plant names. Extend with a naming activity in Santhali.",
  },
];

export const upcomingLectures: UpcomingLecture[] = [
  {
    id: "ul-1",
    classroomId: "c-2a",
    week: "Week 1",
    date: "16 March 2026",
    topic: "Addition up to 20",
    chapter: "Chapter 3 — Adding numbers",
    durationMin: 40,
    objective: "Students add two numbers whose total is within twenty.",
    activities: ["Bundle of ten activity", "Board sums"],
    materials: ["Sticks", "Chalk", "Notebook"],
    status: "planned",
  },
  {
    id: "ul-2",
    classroomId: "c-2a",
    week: "Week 2",
    date: "23 March 2026",
    topic: "Additional addition practice",
    chapter: "Chapter 3 — Adding numbers",
    durationMin: 40,
    objective: "Consolidate carrying using concrete objects before new concepts.",
    activities: ["Peer drill", "Picture worksheet"],
    materials: ["Stones", "Worksheet", "Chalk"],
    status: "ai-adjusted",
    adjustedFrom: "Subtraction — introduction",
    adjustmentReason:
      "Assessment on 12 March showed 7 students below 55% on quantity combinations. Subtraction moved one week later.",
  },
  {
    id: "ul-3",
    classroomId: "c-2a",
    week: "Week 3",
    date: "30 March 2026",
    topic: "Subtraction — taking away",
    chapter: "Chapter 4 — Subtraction",
    durationMin: 40,
    objective: "Students remove a quantity and count the remainder.",
    activities: ["Stone removal", "Story problem"],
    materials: ["Stones", "Blackboard"],
    status: "planned",
  },
  {
    id: "ul-4",
    classroomId: "c-2a",
    week: "Week 4",
    date: "06 April 2026",
    topic: "Word problems with addition and subtraction",
    chapter: "Chapter 4 — Subtraction",
    durationMin: 40,
    objective: "Students translate a spoken situation into a number sentence.",
    activities: ["Market role play"],
    materials: ["Classroom objects"],
    status: "locked",
  },
  {
    id: "ul-5",
    classroomId: "c-2b",
    week: "Week 1",
    date: "16 March 2026",
    topic: "Addition revision with objects",
    chapter: "Chapter 3 — Adding numbers",
    durationMin: 40,
    objective: "Rebuild the base before continuing subtraction.",
    activities: ["Object grouping", "Oral drill"],
    materials: ["Sticks", "Stones"],
    status: "ai-adjusted",
    adjustedFrom: "Subtraction practice",
    adjustmentReason: "Class average of 54% on 12 March indicates the prior concept is not secure.",
  },
  {
    id: "ul-6",
    classroomId: "c-1a",
    week: "Week 1",
    date: "17 March 2026",
    topic: "Uses of plants",
    chapter: "Chapter 5 — Plants around us",
    durationMin: 30,
    objective: "Students describe how plants are used at home.",
    activities: ["Home item sorting"],
    materials: ["Leaves", "Chalk"],
    status: "planned",
  },
];

export const assessments: Assessment[] = [
  {
    id: "as-1",
    classroomId: "c-2a",
    title: "Addition oral drill",
    type: "oral",
    topic: "Addition up to 10",
    language: "sat",
    difficulty: "easy",
    questionCount: 10,
    date: "12 March 2026",
    averageScore: 78,
    attempted: 36,
  },
  {
    id: "as-2",
    classroomId: "c-2a",
    title: "Number names written test",
    type: "test",
    topic: "Number names 11–20",
    language: "hi",
    difficulty: "medium",
    questionCount: 15,
    date: "10 March 2026",
    averageScore: 71,
    attempted: 38,
  },
  {
    id: "as-3",
    classroomId: "c-2a",
    title: "Counting homework",
    type: "homework",
    topic: "Counting to 50",
    language: "hi",
    difficulty: "easy",
    questionCount: 8,
    date: "08 March 2026",
    averageScore: 83,
    attempted: 31,
  },
  {
    id: "as-4",
    classroomId: "c-2b",
    title: "Subtraction quiz",
    type: "quiz",
    topic: "Subtraction basics",
    language: "hi",
    difficulty: "medium",
    questionCount: 10,
    date: "12 March 2026",
    averageScore: 54,
    attempted: 34,
  },
  {
    id: "as-5",
    classroomId: "c-2a",
    title: "Stick grouping activity",
    type: "activity",
    topic: "Grouping in tens",
    language: "sat",
    difficulty: "easy",
    questionCount: 5,
    date: "05 March 2026",
    averageScore: 88,
    attempted: 38,
  },
];

export const vocabulary: VocabularyEntry[] = [
  {
    id: "v-1",
    en: "Addition",
    hi: "जोड़ना",
    sat: "ᱡᱚᱲᱟᱣ",
    pronunciation: "/joɽaw/",
    example: "2 और 3 जोड़ने पर 5 होता है।",
    verified: true,
  },
  {
    id: "v-2",
    en: "Number",
    hi: "संख्या",
    sat: "ᱮᱞᱮᱠᱷᱟ",
    pronunciation: "/elekha/",
    example: "यह संख्या पाँच है।",
    verified: true,
  },
  {
    id: "v-3",
    en: "Count",
    hi: "गिनना",
    sat: "ᱞᱮᱠᱷᱟ",
    pronunciation: "/lekha/",
    example: "डंडों को गिनो।",
    verified: false,
  },
  {
    id: "v-4",
    en: "Total",
    hi: "कुल",
    sat: "ᱡᱚᱛᱚ",
    pronunciation: "/joto/",
    example: "कुल कितने हुए?",
    verified: true,
  },
  {
    id: "v-5",
    en: "Stick",
    hi: "डंडा",
    sat: "ᱥᱟᱠᱟᱢ",
    pronunciation: "/sakam/",
    example: "पाँच डंडे लाओ।",
    verified: false,
  },
  {
    id: "v-6",
    en: "Leaf",
    hi: "पत्ता",
    sat: "ᱥᱟᱠᱟᱢ",
    pronunciation: "/sakam/",
    example: "पेड़ का पत्ता हरा है।",
    verified: true,
  },
];

export const notifications: NotificationItem[] = [
  {
    id: "n-1",
    title: "Today's class starts in 15 minutes",
    body: "Class 2A · Mathematics · Addition up to 20 · Room 4",
    time: "09:45",
    kind: "class",
    read: false,
  },
  {
    id: "n-2",
    title: "AI adjusted tomorrow's lesson",
    body: "Week 2 for Class 2A changed to additional addition practice after yesterday's assessment.",
    time: "08:20",
    kind: "ai",
    read: false,
  },
  {
    id: "n-3",
    title: "New worksheet generated",
    body: "Addition picture worksheet (Santhali) is ready to print.",
    time: "Yesterday",
    kind: "content",
    read: true,
  },
  {
    id: "n-4",
    title: "Assessment completed",
    body: "Class 2B subtraction quiz — average 54%.",
    time: "Yesterday",
    kind: "assessment",
    read: true,
  },
  {
    id: "n-5",
    title: "Offline data waiting to sync",
    body: "12 changes queued. They will upload when the network returns.",
    time: "Yesterday",
    kind: "sync",
    read: true,
  },
];

export const resources: ResourceItem[] = [
  { id: "r-1", title: "Counting with sticks", category: "video", className: "Class 2", subject: "Mathematics", language: "Hindi", duration: "4:20", sizeMb: 18 },
  { id: "r-2", title: "Addition song", category: "audio", className: "Class 2", subject: "Mathematics", language: "Santhali", duration: "2:05", sizeMb: 3 },
  { id: "r-3", title: "Number chart 1–20", category: "image", className: "Class 1", subject: "Mathematics", language: "Bilingual", duration: "—", sizeMb: 1 },
  { id: "r-4", title: "Stone grouping activity", category: "activity", className: "Class 2", subject: "Mathematics", language: "Santhali", duration: "10 min", sizeMb: 1 },
  { id: "r-5", title: "Addition practice sheet", category: "worksheet", className: "Class 2", subject: "Mathematics", language: "Hindi", duration: "1 page", sizeMb: 2 },
  { id: "r-6", title: "The clever crow", category: "story", className: "Class 1", subject: "Hindi", language: "Hindi", duration: "3 min", sizeMb: 2 },
  { id: "r-7", title: "Maths words: Hindi ↔ Santhali", category: "vocabulary", className: "Class 2", subject: "Mathematics", language: "Bilingual", duration: "40 words", sizeMb: 1 },
  { id: "r-8", title: "Parts of a plant", category: "video", className: "Class 1", subject: "EVS", language: "Santhali", duration: "5:10", sizeMb: 22 },
];

export const curriculum: CurriculumChapter[] = [
  {
    id: "cu-1",
    board: "JAC (Jharkhand)",
    className: "Class 2",
    subject: "Mathematics",
    chapter: "Chapter 3 — Adding numbers",
    lessons: [
      { title: "Adding small numbers", topics: ["Addition up to 10", "Addition up to 20", "Carrying"] },
      { title: "Adding with objects", topics: ["Sticks and stones", "Grouping in tens"] },
    ],
    documents: [
      { title: "Maths textbook — Class 2", kind: "textbook", sizeMb: 14 },
      { title: "Annual syllabus 2025–26", kind: "syllabus", sizeMb: 2 },
      { title: "Teacher guide — Adding numbers", kind: "guide", sizeMb: 5 },
    ],
  },
  {
    id: "cu-2",
    board: "JAC (Jharkhand)",
    className: "Class 2",
    subject: "Mathematics",
    chapter: "Chapter 4 — Subtraction",
    lessons: [
      { title: "Taking away", topics: ["Subtraction within 10", "Story problems"] },
      { title: "Comparing quantities", topics: ["More and less"] },
    ],
    documents: [
      { title: "Maths textbook — Class 2", kind: "textbook", sizeMb: 14 },
      { title: "Subtraction practice bank", kind: "supplement", sizeMb: 3 },
    ],
  },
  {
    id: "cu-3",
    board: "JAC (Jharkhand)",
    className: "Class 1",
    subject: "EVS",
    chapter: "Chapter 5 — Plants around us",
    lessons: [
      { title: "Parts of a plant", topics: ["Root", "Stem", "Leaf", "Flower"] },
      { title: "Uses of plants", topics: ["Food", "Medicine", "Shade"] },
    ],
    documents: [
      { title: "EVS textbook — Class 1", kind: "textbook", sizeMb: 11 },
      { title: "Local plants supplement", kind: "supplement", sizeMb: 4 },
    ],
  },
];

export const offlinePacks: OfflinePack[] = [
  {
    id: "op-1",
    label: "Offline Classroom Pack — Class 2A",
    classroomId: "c-2a",
    sizeMb: 82,
    includes: ["Lessons", "Audio", "Worksheets", "Activities"],
    downloaded: true,
  },
  {
    id: "op-2",
    label: "Offline Classroom Pack — Class 2B",
    classroomId: "c-2b",
    sizeMb: 64,
    includes: ["Lessons", "Worksheets", "Assessments"],
    downloaded: false,
  },
  {
    id: "op-3",
    label: "Vocabulary Pack — Hindi ↔ Santhali",
    classroomId: "c-2a",
    sizeMb: 12,
    includes: ["Vocabulary", "Audio"],
    downloaded: true,
  },
];

export const syncQueue: SyncItem[] = [
  { id: "sq-1", label: "Assessment result — Addition oral drill", kind: "Assessment", createdAt: "12 Mar 10:42" },
  { id: "sq-2", label: "Teacher correction — Santhali term for 'total'", kind: "Correction", createdAt: "12 Mar 11:05" },
  { id: "sq-3", label: "Student progress — 38 records", kind: "Progress", createdAt: "12 Mar 11:20" },
];

export const corrections: CorrectionItem[] = [
  {
    id: "co-1",
    term: "Total",
    aiOutput: "ᱥᱟᱶᱛᱮ",
    suggestion: "ᱡᱚᱛᱚ",
    language: "Santhali",
    status: "verified",
    submittedBy: "Reeta Murmu",
  },
  {
    id: "co-2",
    term: "Count backwards",
    aiOutput: "ᱛᱟᱭᱚᱢ ᱞᱮᱠᱷᱟ",
    suggestion: "ᱛᱟᱭᱚᱢ ᱠᱷᱚᱱ ᱞᱮᱠᱷᱟ",
    language: "Santhali",
    status: "pending",
    submittedBy: "Reeta Murmu",
  },
];

export const instituteTeachers = [
  { id: "it-1", name: "Reeta Murmu", subjects: "Maths, EVS", classes: "2A, 2B, 1A", activity: "Taught 4 periods today", progress: 76 },
  { id: "it-2", name: "Alok Tudu", subjects: "Hindi", classes: "3A, 3B", activity: "Generated 2 lesson plans", progress: 88 },
  { id: "it-3", name: "Sunita Besra", subjects: "EVS", classes: "1A, 1B", activity: "Assessment pending review", progress: 71 },
  { id: "it-4", name: "Mahesh Soren", subjects: "Maths", classes: "4A, 5A", activity: "3 periods, 1 offline", progress: 64 },
  { id: "it-5", name: "Kiran Hembrom", subjects: "English", classes: "5A", activity: "Synced 18 records", progress: 80 },
];

export const aiRecommendations = [
  {
    id: "ai-1",
    title: "Section 2B struggled with subtraction yesterday (54%).",
    body: "Start today's lesson with a concrete-object activity before written subtraction. Language bridge set to Santhali.",
    action: "Generate lesson",
  },
  {
    id: "ai-2",
    title: "7 students in 2A need extra addition practice.",
    body: "Generate a picture worksheet in Santhali and run it as a 10-minute remedial block.",
    action: "Generate worksheet",
  },
];

export const todaysSchedule = [
  { id: "sc-1", time: "10:00", classroomId: "c-2a", label: "Class 2A · Addition up to 20", meta: "40 min · Santhali support", status: "Now" },
  { id: "sc-2", time: "11:00", classroomId: "c-2b", label: "Class 2B · Addition revision", meta: "40 min · Offline pack", status: "Next" },
  { id: "sc-3", time: "12:30", classroomId: "c-3a", label: "Class 3A · मात्रा पहचान", meta: "30 min · Audio", status: "Upcoming" },
  { id: "sc-4", time: "14:00", classroomId: "c-1a", label: "Class 1A · Uses of plants", meta: "30 min · Outdoor", status: "Upcoming" },
];
