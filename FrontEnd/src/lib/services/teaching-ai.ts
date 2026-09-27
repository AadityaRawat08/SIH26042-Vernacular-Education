/**
 * SIMULATED TEACHING-INTELLIGENCE SERVICE (demo mode).
 *
 * Every function here is deterministic local generation so the whole teaching
 * ecosystem works without AI credentials. The signatures are the integration
 * contract: a backend developer swaps each body for a real LLM / RAG call
 * (/ai/copilot, /ai/explain, /ai/local-example, /ai/story, /ai/activity,
 * /ai/blackboard, /ai/lecture-summary, /ai/homework) without touching the UI.
 */

export interface TeachingContext {
  surface: "home" | "classroom" | "live" | "student" | "plan" | "translator";
  className?: string | undefined;
  section?: string | undefined;
  subject?: string | undefined;
  topic?: string | undefined;
  studentName?: string | undefined;
  language?: string | undefined;
}

export function contextLabel(ctx: TeachingContext): string {
  const parts = [
    ctx.className ? `${ctx.className}${ctx.section ? ` ${ctx.section}` : ""}` : null,
    ctx.subject,
    ctx.topic,
    ctx.studentName,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "General teaching help";
}

/* ---------------------------------------------------------------- Copilot */

export const COPILOT_SUGGESTIONS: Record<TeachingContext["surface"], string[]> = {
  home: [
    "What should I focus on today?",
    "Give me a 5-minute activity.",
    "Which students need extra help?",
    "Translate this sentence.",
  ],
  classroom: [
    "Why did students struggle yesterday?",
    "Give me a local example.",
    "Create three questions.",
    "Suggest a revision plan.",
  ],
  live: [
    "Explain this again, simply.",
    "Give me a 5-minute activity.",
    "How should I explain this again?",
    "Make this explanation easier.",
  ],
  student: [
    "How can I support this student?",
    "Give two easier practice questions.",
    "Should I use mother-tongue support?",
  ],
  plan: [
    "Make this lesson shorter.",
    "Add one more activity.",
    "Create three questions.",
  ],
  translator: [
    "Translate this sentence.",
    "Give me classroom phrases.",
    "How do I pronounce this word?",
  ],
};

/** Simulated copilot reply. Replace with POST /ai/copilot. */
export function copilotReply(question: string, ctx: TeachingContext): string {
  const q = question.toLowerCase();
  const where = contextLabel(ctx);
  const topic = ctx.topic ?? "today's topic";

  if (q.includes("activity")) {
    return `AI suggestion for ${where}\n\nA 5-minute activity for ${topic}: ask pairs to collect five small objects, make two groups, and say the total aloud. Walk one row at a time and ask one pair to show the class. No materials beyond what is already in the room.`;
  }
  if (q.includes("translate")) {
    return `Open the Translate screen and choose a mode — Voice → Voice, Voice → Text, Text → Voice or Text → Text. Anything you translate can be saved as a classroom phrase and reused in ${where}.`;
  }
  if (q.includes("struggl") || q.includes("why")) {
    return `Possible reason: the last assessment for ${topic} shows most mistakes came at the step where two groups are combined, not at counting. A few children may also need mother-tongue support for the instruction words. AI teaching suggestion: repeat the instruction in the learner language and re-do the object activity before written sums.`;
  }
  if (q.includes("question")) {
    return `Three questions for ${topic}:\n1. Easy — Show me two sticks and three sticks. How many together?\n2. Medium — What is 4 + 3?\n3. Challenge — I have 6 sticks. How many more do I need to reach 10?`;
  }
  if (q.includes("local") || q.includes("example")) {
    return `Local example for ${topic}: two bundles of mahua leaves and three bundles kept together on the mat — count the bundles as one pile. Children see the total before any number is written.`;
  }
  if (q.includes("easier") || q.includes("simpl")) {
    return `Simpler wording for ${topic}: "When we put two groups together, we count how many we have in total." Say it once in Hindi, once in the learner language, then show it with objects.`;
  }
  if (q.includes("student") || q.includes("help")) {
    return `AI suggestion: ${ctx.studentName ?? "A few students"} may need language support rather than more practice. Repeat the instruction in the mother tongue and give one extra visual example before the written work.`;
  }
  return `AI suggestion for ${where}\n\nStart ${topic} with something the children can hold, say the key sentence twice — once in Hindi and once in the learner language — and only then write on the board. Check understanding with three quick oral questions before moving on.`;
}

/* ----------------------------------------------------------- Explain again */

export type ExplainStyle =
  | "simplify"
  | "local"
  | "story"
  | "activity"
  | "learner-language"
  | "visual"
  | "another";

export const EXPLAIN_OPTIONS: Array<{ id: ExplainStyle; label: string; hint: string }> = [
  { id: "simplify", label: "Simplify it", hint: "Shorter, easier words" },
  { id: "local", label: "Give a local example", hint: "Something they see daily" },
  { id: "story", label: "Tell a story", hint: "Two-minute story" },
  { id: "activity", label: "Show an activity", hint: "Do it with objects" },
  { id: "learner-language", label: "Explain in learner language", hint: "Mother-tongue wording" },
  { id: "visual", label: "Give a visual explanation", hint: "Draw it on the board" },
  { id: "another", label: "Give another example", hint: "A fresh example" },
];

/** Simulated alternative explanation. Replace with POST /ai/explain. */
export function explainAgain(style: ExplainStyle, ctx: TeachingContext, attempt = 0): string {
  const topic = ctx.topic ?? "this topic";
  const variants: Record<ExplainStyle, string[]> = {
    simplify: [
      `When we put two groups together, we count how many we have in total. That is ${topic}.`,
      `Two things here, three things there. Push them together and count everything — that is the answer.`,
    ],
    local: [
      `You picked 2 guavas and your friend picked 3. Put them in one basket and count — 5 guavas.`,
      `Two goats near the well, three goats near the tree. All together, how many goats?`,
    ],
    story: [
      `Sita took 2 rotis for school. Her brother gave her 3 more. On the way she counted them — one, two, three, four, five. She had five rotis to share.`,
      `A farmer carried 4 bundles of sticks. His son brought 1 more. Together they counted 5 bundles before tying them.`,
    ],
    activity: [
      `Ask each pair to place 2 stones, then 3 stones, push them into one pile and count aloud. Repeat with 4 and 1.`,
      `Two rows of children stand up — 3 in one row, 2 in another. The class counts the standing children.`,
    ],
    "learner-language": [
      `Say the same sentence slowly in the learner language, then in Hindi, then point to the objects. Ask one child from the back row to repeat it.`,
      `Use the mother-tongue words for "together" and "how many" before using any textbook words.`,
    ],
    visual: [
      `Draw two sticks, a gap, three sticks. Circle all of them and write the total under the circle.`,
      `Draw a number line 0–10. Hop 2, then hop 3, and mark where you land.`,
    ],
    another: [
      `3 chalk pieces on the table and 2 in your hand — how many chalk pieces in the class?`,
      `4 children sitting, 2 more join. Count the children now.`,
    ],
  };
  const list = variants[style];
  return list[attempt % list.length]!;
}

/* ------------------------------------------------------------ Make it local */

export const LOCAL_THEMES = [
  "Fruits",
  "Vegetables",
  "Market",
  "Household objects",
  "School supplies",
  "Animals",
  "Village surroundings",
  "Farming",
  "Everyday activities",
] as const;

/** Simulated local examples. Replace with POST /ai/local-example. */
export function localExamples(topic: string, themes: string[]): string[] {
  const t = topic || "the topic";
  const picked = themes.length ? themes : ["Everyday activities"];
  const bank: Record<string, string> = {
    Fruits: `Two guavas in one basket and three in another — count all the guavas to teach ${t}.`,
    Vegetables: `Four brinjals from the kitchen garden and two from the market — use them for ${t}.`,
    Market: `The shopkeeper gives 2 sweets and then 3 more. Ask children how many sweets in the packet — that is ${t}.`,
    "Household objects": `Three spoons and two bowls on the mat — group them and count for ${t}.`,
    "School supplies": `Two pencils on your desk and three in the box — bring them together to show ${t}.`,
    Animals: `Three hens near the door and two under the tree — count all the hens while teaching ${t}.`,
    "Village surroundings": `Two mahua trees on this side of the path and three on the other — count them together for ${t}.`,
    Farming: `Four bundles of paddy tied and one still loose — combine and count while explaining ${t}.`,
    "Everyday activities": `Two children fetching water and three sweeping — count the working children to show ${t}.`,
  };
  return picked.slice(0, 5).map((theme) => bank[theme] ?? `${theme}: a familiar example for ${t}.`);
}

/* -------------------------------------------------------------- Story */

export interface GeneratedStory {
  title: string;
  story: string;
  objective: string;
  questions: string[];
  vocabulary: string[];
  activity: string;
}

/** Simulated story. Replace with POST /ai/story. */
export function generateStory(topic: string, className: string, length: "short" | "medium", difficulty: "easy" | "medium"): GeneratedStory {
  const t = topic || "the topic";
  const extra =
    length === "medium"
      ? " On the way home they met their teacher, who asked them to count once more, slowly, so the little ones could hear each number."
      : "";
  return {
    title: `The day Budhni counted with ${t.toLowerCase()}`,
    story: `Budhni went to the field with her brother. She picked two small pumpkins and her brother picked three. They put everything in one basket and counted together — one, two, three, four, five. "Five!" said Budhni, and her brother smiled because she had counted without help.${extra}`,
    objective: `Children connect ${t} to something they do at home, and say the total aloud with confidence.`,
    questions: [
      "How many pumpkins did Budhni pick?",
      "How many did her brother pick?",
      "How many were in the basket altogether?",
      difficulty === "medium" ? "If one pumpkin rolled away, how many are left?" : "Show the total with your fingers.",
    ],
    vocabulary: ["together", "count", "total", "basket", "more"],
    activity: `Ask two children to act out the story with objects from the classroom while the rest count aloud. ${className} can then make their own short story in pairs.`,
  };
}

/* ------------------------------------------------------------- Activity */

export interface GeneratedActivity {
  title: string;
  objective: string;
  materials: string[];
  steps: string[];
  teacherInstructions: string;
  expectedResponse: string;
  quickAssessment: string[];
  timeMin: number;
}

export const MATERIAL_OPTIONS = ["Sticks", "Paper", "Books", "Pencils", "Classroom objects", "No materials"] as const;

/** Simulated activity. Replace with POST /ai/activity. */
export function generateActivity(topic: string, className: string, durationMin: number, materials: string[]): GeneratedActivity {
  const useful = materials.filter((m) => m !== "No materials");
  const has = useful.length ? useful : ["hands and voices"];
  return {
    title: `${topic || "Topic"} — do it together`,
    objective: `Every child in ${className} physically makes the answer once before writing anything.`,
    materials: has.map((m) => `${m} (about 5 per pair)`),
    steps: [
      `Put children in pairs. Give each pair ${has[0]!.toLowerCase()}.`,
      "One child makes the first group, the partner makes the second group.",
      "They push the groups together and count aloud.",
      "Repeat twice with different numbers.",
      "Two pairs come to the board and draw what they did.",
    ],
    teacherInstructions:
      "Say each instruction twice — once in Hindi, once in the learner language. Walk one row at a time. Do not move to written sums until every pair has done it once.",
    expectedResponse: "Children say the total without counting again from one.",
    quickAssessment: [
      "Ask three children a fresh question from the front rows.",
      "Ask two children from the back row in their mother tongue.",
      "Note who hesitated for more than five seconds.",
    ],
    timeMin: Math.max(5, Math.round(durationMin * 0.2)),
  };
}

/* ------------------------------------------------------------ Blackboard */

export interface BlackboardCard {
  heading: string;
  lines: string[];
}

/** Simulated blackboard plan. Replace with POST /ai/blackboard. */
export function blackboardPlan(topic: string): BlackboardCard[] {
  const t = topic || "Today's topic";
  return [
    { heading: "Today's topic", lines: [t, "Class work — copy the heading"] },
    { heading: "Rule", lines: ["Add the ones first.", "Then add the tens."] },
    { heading: "Example", lines: ["23 + 14 = 37", "|| + ||| = |||||"] },
    { heading: "Question", lines: ["What is 25 + 12?", "What is 31 + 6?"] },
    { heading: "Homework", lines: ["3 + 4 = ___", "12 + 5 = ___", "21 + 6 = ___"] },
  ];
}

/* --------------------------------------------------------- Speech notes */

const NOTE_SAMPLES = [
  "Most students understood addition, but four students are still confusing tens and ones.",
  "The stick activity worked well. Back rows needed the instruction repeated in Santhali.",
  "Two children were absent, so repeat the warm-up next period.",
];

/** Simulated speech-to-text for teacher notes. Replace with the ASR endpoint. */
export function transcribeTeacherNote(index = 0): string {
  return NOTE_SAMPLES[index % NOTE_SAMPLES.length]!;
}

/* ------------------------------------------------------- Lecture summary */

export interface LectureSummary {
  classLabel: string;
  subject: string;
  topic: string;
  durationMin: number;
  taught: string;
  activities: string[];
  assessment: string;
  attendance: string;
  participation: string;
  languageSupport: string;
  notes: string[];
  needAttention: string[];
  nextStep: string;
}

/** Simulated lecture summary. Replace with POST /ai/lecture-summary. */
export function buildLectureSummary(input: {
  classLabel: string;
  subject: string;
  topic: string;
  durationMin: number;
  activitiesDone: string[];
  notes: string[];
  presentCount: number;
  totalCount: number;
  participationCount: number;
  needAttention: string[];
}): LectureSummary {
  return {
    classLabel: input.classLabel,
    subject: input.subject,
    topic: input.topic,
    durationMin: input.durationMin,
    taught: `${input.topic} was taught with objects first, then the written form on the board.`,
    activities: input.activitiesDone.length ? input.activitiesDone : ["Object grouping activity"],
    assessment: "Quick oral check — most children answered within five seconds.",
    attendance: `${input.presentCount} of ${input.totalCount} children marked present.`,
    participation: `${input.participationCount} of ${input.totalCount} children took part actively.`,
    languageSupport: "Key instructions repeated in the learner language for the back rows.",
    notes: input.notes,
    needAttention: input.needAttention,
    nextStep: "Begin the next lesson with a short place-value activity before new content.",
  };
}

/* --------------------------------------------------------------- Homework */

export type HomeworkKind = "MCQ" | "Fill in the blanks" | "Short answer" | "Picture-based" | "Activity-based";

/** Simulated homework generation. Replace with POST /ai/homework. */
export function generateHomework(topic: string, count: number, kinds: HomeworkKind[]): string[] {
  const t = topic || "the topic";
  const bank: Record<HomeworkKind, string[]> = {
    MCQ: [`2 + 3 = ?  (a) 4  (b) 5  (c) 6`, `4 + 1 = ?  (a) 5  (b) 6  (c) 7`],
    "Fill in the blanks": ["3 + ___ = 5", "___ + 2 = 6"],
    "Short answer": [`Write one sentence about ${t} in your own words.`, "Make your own question and answer it."],
    "Picture-based": ["Draw 2 sticks and 3 sticks. Write the total.", "Circle the group that has more."],
    "Activity-based": ["Collect 10 objects at home, make two groups and draw them.", "Ask someone at home one addition question."],
  };
  const chosen = kinds.length ? kinds : (["Short answer"] as HomeworkKind[]);
  const out: string[] = [];
  let i = 0;
  while (out.length < count) {
    const kind = chosen[i % chosen.length]!;
    const list = bank[kind];
    out.push(`${kind}: ${list[Math.floor(i / chosen.length) % list.length]}`);
    i += 1;
    if (i > count * 4) break;
  }
  return out.slice(0, count);
}

/* ------------------------------------------------------------ Class pulse */

export type PulseLevel = "on-track" | "reinforce" | "support";

export interface ClassPulse {
  level: PulseLevel;
  label: string;
  points: string[];
}

export function classPulse(average: number, languageSupport: number, practice: number): ClassPulse {
  const level: PulseLevel = average >= 75 ? "on-track" : average >= 55 ? "reinforce" : "support";
  const label = level === "on-track" ? "On track" : level === "reinforce" ? "Needs reinforcement" : "Needs more support";
  return {
    level,
    label,
    points: [
      average >= 75
        ? "Most students understand the current topic."
        : "A part of the class is still unsure about the current topic.",
      `${languageSupport} students may need additional language support.`,
      `${practice} students may need more practice.`,
      "Participation decreased during the final activity.",
    ],
  };
}
