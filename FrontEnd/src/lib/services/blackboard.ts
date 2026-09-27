/**
 * AI BLACKBOARD ENGINE (demo mode).
 *
 * The blackboard is structured data, never one big string, so it stays
 * editable, translatable, replayable and storable.
 *
 * Backend contract (future):
 *   GET    /blackboard/{lecture_id}
 *   POST   /blackboard                 create session
 *   POST   /blackboard/steps
 *   POST   /blackboard/elements
 *   PUT    /blackboard/elements/{id}
 *   DELETE /blackboard/elements/{id}
 *   POST   /blackboard/generate        -> generateBlackboard()
 *   POST   /blackboard/translate       -> translateBoard()
 *   POST   /blackboard/voice           -> voiceToElement()
 *   POST   /blackboard/snapshot        -> boardSnapshot()
 *   POST   /blackboard/reuse
 *   GET    /blackboard/templates       -> BOARD_TEMPLATES
 *   POST   /blackboard/ai-suggestion   -> askBlackboardAI()
 */

import { translate } from "./ai";
import type { LanguageCode } from "../types";

export type ElementType =
  | "text"
  | "equation"
  | "steps"
  | "diagram"
  | "image"
  | "vocabulary"
  | "question"
  | "activity"
  | "summary"
  | "highlight"
  | "table";

export type BoardArea = "top" | "center" | "side" | "bottom";

export interface BoardElement {
  id: string;
  type: ElementType;
  area: BoardArea;
  title?: string;
  /** Lines of board content. Rendered large, in chalk style. */
  lines: string[];
  /** Vocabulary / table rows: [left, right]. */
  rows?: Array<[string, string]>;
  highlighted?: boolean;
  hidden?: boolean;
  /** Set when the element was written by the teacher during class. */
  source?: "ai" | "teacher" | "student" | "tool";
  translated?: { language: LanguageCode; lines: string[] } | null;
}

export interface BoardStep {
  id: string;
  stepNumber: number;
  kind: "topic" | "concept" | "example" | "solution" | "question" | "practice" | "summary" | "extra";
  title: string;
  teacherInstruction: string;
  studentPrompt?: string;
  durationMin: number;
  elements: BoardElement[];
}

export interface BoardSession {
  id: string;
  templateId: string;
  className: string;
  section: string;
  subject: string;
  topic: string;
  steps: BoardStep[];
  createdAt: string;
}

export interface BoardTemplate {
  id: string;
  label: string;
  hint: string;
  subjects: string[];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  { id: "math-problem", label: "Math problem", hint: "Equation, worked steps, practice", subjects: ["Mathematics", "Maths"] },
  { id: "concept", label: "Concept explanation", hint: "Idea, example, question", subjects: ["*"] },
  { id: "story", label: "Story lesson", hint: "Story, meaning, question", subjects: ["Language", "Hindi", "English"] },
  { id: "vocabulary", label: "Vocabulary", hint: "Word, meaning, sentence", subjects: ["Language", "Hindi", "English"] },
  { id: "qa", label: "Question & answer", hint: "Ask, discuss, confirm", subjects: ["*"] },
  { id: "activity", label: "Activity", hint: "Materials, steps, check", subjects: ["*"] },
  { id: "evs-diagram", label: "EVS diagram", hint: "Picture, labels, process", subjects: ["EVS", "Science"] },
  { id: "language", label: "Language lesson", hint: "Sentence patterns and practice", subjects: ["Language"] },
  { id: "revision", label: "Revision", hint: "Recall, examples, quick test", subjects: ["*"] },
  { id: "assessment", label: "Assessment", hint: "Questions only, no answers", subjects: ["*"] },
];

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function makeElement(
  type: ElementType,
  lines: string[],
  opts: Partial<Omit<BoardElement, "id" | "type" | "lines">> = {},
): BoardElement {
  return {
    id: uid("el"),
    type,
    area: opts.area ?? "center",
    lines,
    source: opts.source ?? "ai",
    ...(opts.title !== undefined ? { title: opts.title } : {}),
    ...(opts.rows ? { rows: opts.rows } : {}),
    ...(opts.highlighted ? { highlighted: true } : {}),
    ...(opts.hidden ? { hidden: true } : {}),
    translated: null,
  };
}

/** Pick a template from subject + topic, the way the AI would. */
export function pickTemplate(subject: string, topic: string): BoardTemplate {
  const s = subject.toLowerCase();
  const t = topic.toLowerCase();
  if (s.includes("math") || /add|subtract|multipl|divis|number|fraction/.test(t)) return BOARD_TEMPLATES[0]!;
  if (s.includes("evs") || s.includes("science")) return BOARD_TEMPLATES[6]!;
  if (s.includes("hindi") || s.includes("english") || s.includes("language")) return BOARD_TEMPLATES[3]!;
  return BOARD_TEMPLATES[1]!;
}

function mathBoard(topic: string): BoardStep[] {
  const T = topic || "Addition within 100";
  return [
    {
      id: uid("st"), stepNumber: 1, kind: "topic", title: "Today's topic", durationMin: 2,
      teacherInstruction: "Write the topic and say it in both languages.",
      elements: [
        makeElement("text", [T.toUpperCase()], { area: "top", title: "Today's topic" }),
        makeElement("text", ["We will join two numbers and find the total."], { area: "center" }),
      ],
    },
    {
      id: uid("st"), stepNumber: 2, kind: "concept", title: "Tens and ones", durationMin: 4,
      teacherInstruction: "Explain place value with sticks before writing anything.",
      elements: [
        makeElement("table", [], { area: "center", title: "Place value", rows: [["TENS", "ONES"], ["2", "3"], ["1", "4"]] }),
        makeElement("vocabulary", [], { area: "side", title: "Words", rows: [["Add / जोड़ना", "ᱡᱚᱲᱟᱣ"], ["Total / कुल", "ᱡᱚᱛᱚ"]] }),
      ],
    },
    {
      id: uid("st"), stepNumber: 3, kind: "example", title: "Example", durationMin: 4,
      teacherInstruction: "Read the example aloud. Do not solve it yet.",
      elements: [makeElement("equation", ["23 + 14 = ?"], { area: "center", highlighted: true })],
    },
    {
      id: uid("st"), stepNumber: 4, kind: "solution", title: "Solve it together", durationMin: 6,
      teacherInstruction: "Add the ones first, then the tens. Point at the column each time.",
      elements: [
        makeElement("steps", ["Add the ones: 3 + 4 = 7", "Add the tens: 2 + 1 = 3", "Answer = 37"], { area: "center", title: "Steps" }),
        makeElement("equation", ["23 + 14 = 37"], { area: "center" }),
      ],
    },
    {
      id: uid("st"), stepNumber: 5, kind: "question", title: "Ask the class", durationMin: 4,
      teacherInstruction: "Ask three children. Wait before helping.",
      studentPrompt: "What is 25 + 12?",
      elements: [makeElement("question", ["What is 25 + 12?"], { area: "bottom", highlighted: true })],
    },
    {
      id: uid("st"), stepNumber: 6, kind: "practice", title: "Practice", durationMin: 5,
      teacherInstruction: "Children write in notebooks while you walk around.",
      elements: [makeElement("steps", ["31 + 15 = ___", "42 + 26 = ___", "53 + 14 = ___"], { area: "center", title: "Practice" })],
    },
    {
      id: uid("st"), stepNumber: 7, kind: "summary", title: "Summary", durationMin: 3,
      teacherInstruction: "Everyone repeats the rule aloud, twice.",
      elements: [makeElement("summary", ["Remember: add the ones first, then the tens."], { area: "bottom" })],
    },
  ];
}

function evsBoard(topic: string): BoardStep[] {
  const T = topic || "Parts of a plant";
  return [
    { id: uid("st"), stepNumber: 1, kind: "topic", title: "Today's topic", durationMin: 2, teacherInstruction: "Write the topic and show a real object if you have one.", elements: [makeElement("text", [T.toUpperCase()], { area: "top", title: "Today's topic" })] },
    { id: uid("st"), stepNumber: 2, kind: "concept", title: "Key idea", durationMin: 4, teacherInstruction: "Explain in the mother tongue first.", elements: [makeElement("text", [`${T} — what it is and why it matters.`], { area: "center" })] },
    { id: uid("st"), stepNumber: 3, kind: "example", title: "Diagram", durationMin: 5, teacherInstruction: "Draw on the board while children watch.", elements: [makeElement("diagram", ["Draw the outline", "Label each part", "Use arrows to show the order"], { area: "center", title: "Draw and label" })] },
    { id: uid("st"), stepNumber: 4, kind: "solution", title: "Labels", durationMin: 4, teacherInstruction: "Ask children to name each label.", elements: [makeElement("vocabulary", [], { area: "side", title: "Labels", rows: [["Root / जड़", "ᱨᱮᱦᱮᱫ"], ["Leaf / पत्ता", "ᱥᱟᱠᱟᱢ"]] })] },
    { id: uid("st"), stepNumber: 5, kind: "question", title: "Ask the class", durationMin: 4, teacherInstruction: "Ask three children.", studentPrompt: `Name one part you can see in ${T.toLowerCase()}.`, elements: [makeElement("question", [`Name one part of ${T.toLowerCase()}.`], { area: "bottom", highlighted: true })] },
    { id: uid("st"), stepNumber: 6, kind: "practice", title: "Practice", durationMin: 5, teacherInstruction: "Children draw and label in notebooks.", elements: [makeElement("activity", ["Draw the picture", "Write two labels", "Show your neighbour"], { area: "center", title: "Do this now" })] },
    { id: uid("st"), stepNumber: 7, kind: "summary", title: "Summary", durationMin: 3, teacherInstruction: "Repeat the two key words together.", elements: [makeElement("summary", [`Remember: ${T} has parts, and each part has a job.`], { area: "bottom" })] },
  ];
}

function languageBoard(topic: string): BoardStep[] {
  const T = topic || "New words";
  return [
    { id: uid("st"), stepNumber: 1, kind: "topic", title: "Today's topic", durationMin: 2, teacherInstruction: "Say the topic in both languages.", elements: [makeElement("text", [T.toUpperCase()], { area: "top", title: "Today's topic" })] },
    { id: uid("st"), stepNumber: 2, kind: "concept", title: "New words", durationMin: 5, teacherInstruction: "Say each word twice, children repeat.", elements: [makeElement("vocabulary", [], { area: "center", title: "Word · meaning", rows: [["Water / पानी", "ᱫᱟᱜ"], ["School / विद्यालय", "ᱟᱥᱲᱟ"], ["Friend / मित्र", "ᱜᱟᱛᱮ"]] })] },
    { id: uid("st"), stepNumber: 3, kind: "example", title: "Sentence", durationMin: 4, teacherInstruction: "Write one sentence and read it aloud.", elements: [makeElement("text", ["I drink water every day."], { area: "center", highlighted: true })] },
    { id: uid("st"), stepNumber: 4, kind: "solution", title: "Make your own", durationMin: 5, teacherInstruction: "Two children give a sentence each.", elements: [makeElement("steps", ["Choose one word", "Say a sentence", "Write it in your notebook"], { area: "center", title: "Steps" })] },
    { id: uid("st"), stepNumber: 5, kind: "question", title: "Ask the class", durationMin: 4, teacherInstruction: "Ask three children.", studentPrompt: "Use 'friend' in a sentence.", elements: [makeElement("question", ["Use the word 'friend' in a sentence."], { area: "bottom", highlighted: true })] },
    { id: uid("st"), stepNumber: 6, kind: "practice", title: "Practice", durationMin: 4, teacherInstruction: "Children write two sentences.", elements: [makeElement("steps", ["Write two sentences", "Underline the new word"], { area: "center", title: "Practice" })] },
    { id: uid("st"), stepNumber: 7, kind: "summary", title: "Summary", durationMin: 3, teacherInstruction: "Repeat all three words together.", elements: [makeElement("summary", ["Remember the three new words."], { area: "bottom" })] },
  ];
}

function generalBoard(topic: string): BoardStep[] {
  const T = topic || "Today's lesson";
  return [
    { id: uid("st"), stepNumber: 1, kind: "topic", title: "Today's topic", durationMin: 2, teacherInstruction: "Write the topic and the goal.", elements: [makeElement("text", [T.toUpperCase()], { area: "top", title: "Today's topic" })] },
    { id: uid("st"), stepNumber: 2, kind: "concept", title: "Key idea", durationMin: 5, teacherInstruction: "Explain in short sentences, mother tongue first.", elements: [makeElement("text", [`${T} in one line.`], { area: "center" })] },
    { id: uid("st"), stepNumber: 3, kind: "example", title: "Example", durationMin: 5, teacherInstruction: "Use something from the village.", elements: [makeElement("text", ["A simple example from daily life."], { area: "center", highlighted: true })] },
    { id: uid("st"), stepNumber: 4, kind: "solution", title: "Work it out", durationMin: 5, teacherInstruction: "Do it on the board step by step.", elements: [makeElement("steps", ["Step one", "Step two", "Step three"], { area: "center", title: "Steps" })] },
    { id: uid("st"), stepNumber: 5, kind: "question", title: "Ask the class", durationMin: 4, teacherInstruction: "Ask three children.", studentPrompt: `Tell me one thing about ${T.toLowerCase()}.`, elements: [makeElement("question", [`Tell me one thing about ${T.toLowerCase()}.`], { area: "bottom", highlighted: true })] },
    { id: uid("st"), stepNumber: 6, kind: "practice", title: "Practice", durationMin: 4, teacherInstruction: "Children practise in pairs.", elements: [makeElement("activity", ["Work in pairs", "Each child answers once"], { area: "center", title: "Practice" })] },
    { id: uid("st"), stepNumber: 7, kind: "summary", title: "Summary", durationMin: 3, teacherInstruction: "Say the one thing to remember.", elements: [makeElement("summary", [`Remember: the main point of ${T.toLowerCase()}.`], { area: "bottom" })] },
  ];
}

/** Generate a structured, step-by-step blackboard plan for a lesson. */
export function generateBlackboard(input: {
  className: string;
  section: string;
  subject: string;
  topic: string;
  templateId?: string;
}): BoardSession {
  const template = input.templateId
    ? BOARD_TEMPLATES.find((t) => t.id === input.templateId) ?? pickTemplate(input.subject, input.topic)
    : pickTemplate(input.subject, input.topic);

  const steps =
    template.id === "math-problem"
      ? mathBoard(input.topic)
      : template.id === "evs-diagram"
        ? evsBoard(input.topic)
        : template.id === "vocabulary" || template.id === "language" || template.id === "story"
          ? languageBoard(input.topic)
          : generalBoard(input.topic);

  return {
    id: uid("bb"),
    templateId: template.id,
    className: input.className,
    section: input.section,
    subject: input.subject,
    topic: input.topic,
    steps,
    createdAt: new Date().toISOString(),
  };
}

/** Translate the visible text of a step. Original is never destroyed. */
export function translateStep(step: BoardStep, target: LanguageCode): BoardStep {
  return {
    ...step,
    elements: step.elements.map((el) => ({
      ...el,
      translated:
        el.lines.length || el.rows?.length
          ? { language: target, lines: (el.lines.length ? el.lines : (el.rows ?? []).map((r) => `${r[0]} — ${r[1]}`)).map((l) => translate(l, target)) }
          : null,
    })),
  };
}

/** Voice → board element (simulated speech recognition). */
export function voiceToElement(index = 0): BoardElement {
  const heard = [
    "Write today's topic: addition.",
    "Add an example: 25 plus 12.",
    "Ask the class: who can show me ten sticks?",
  ];
  const text = heard[index % heard.length]!;
  const isQuestion = text.toLowerCase().includes("ask the class");
  const content = text.replace(/^(write today's topic:|add an example:|ask the class:)\s*/i, "");
  return makeElement(isQuestion ? "question" : "text", [content.replace(/\.$/, "")], {
    area: isQuestion ? "bottom" : "center",
    source: "teacher",
  });
}

/** Ask Blackboard AI — returns a ready-to-add element plus a short reply. */
export function askBlackboardAI(prompt: string, ctx: { topic: string; className: string }): { reply: string; element: BoardElement } {
  const p = prompt.toLowerCase();
  if (p.includes("easier") || p.includes("simple") || p.includes("reduce")) {
    return {
      reply: "Shorter board text, three lines only.",
      element: makeElement("steps", ["Ones first", "Then tens", "Write the total"], { area: "center", title: "Simple version", source: "tool" }),
    };
  }
  if (p.includes("question")) {
    return { reply: "One question, at class level.", element: makeElement("question", [`What is 15 + 7?`], { area: "bottom", highlighted: true, source: "tool" }) };
  }
  if (p.includes("diagram") || p.includes("draw")) {
    return { reply: "A drawing the class can copy.", element: makeElement("diagram", ["Draw two groups of sticks", "Circle them as one group", "Write the total under it"], { area: "center", title: "Draw this", source: "tool" }) };
  }
  if (p.includes("local") || p.includes("village")) {
    return { reply: "An example from the village.", element: makeElement("text", ["4 mahua flowers + 3 mahua flowers = 7"], { area: "center", source: "tool" }) };
  }
  if (p.includes("translate")) {
    return { reply: "Use Translate board for the full step.", element: makeElement("text", [translate(ctx.topic, "hi")], { area: "center", source: "tool" }) };
  }
  return {
    reply: `Added a simple board element for ${ctx.topic || "this lesson"}.`,
    element: makeElement("text", [`${ctx.topic || "Today's lesson"} — one clear line for ${ctx.className || "the class"}.`], { area: "center", source: "tool" }),
  };
}

/** Hint element generated after a wrong student answer. */
export function hintElement(topic: string): BoardElement {
  return makeElement("steps", ["Show the tens and ones again", "Count the ones first", "Then count the tens"], {
    area: "center",
    title: `Hint — ${topic || "this step"}`,
    highlighted: true,
    source: "tool",
  });
}

export interface ReadabilityIssue {
  stepNumber: number;
  message: string;
}

/** Classroom readability check — can the back row read this? */
export function readabilityCheck(session: BoardSession): ReadabilityIssue[] {
  const issues: ReadabilityIssue[] = [];
  session.steps.forEach((s) => {
    const visible = s.elements.filter((e) => !e.hidden);
    const chars = visible.reduce((n, e) => n + e.lines.join(" ").length, 0);
    if (chars > 220) issues.push({ stepNumber: s.stepNumber, message: "Too much text — use three short lines instead." });
    if (visible.length > 4) issues.push({ stepNumber: s.stepNumber, message: "Too many things on the board at once." });
    if (!visible.length) issues.push({ stepNumber: s.stepNumber, message: "Nothing is visible on this step." });
  });
  if (!session.steps.some((s) => s.elements.some((e) => e.type === "question")))
    issues.push({ stepNumber: 0, message: "No question for the class — add one." });
  if (!session.steps.some((s) => s.kind === "example"))
    issues.push({ stepNumber: 0, message: "No example — add one before practice." });
  return issues;
}

export interface BoardSnapshot {
  topic: string;
  className: string;
  section: string;
  subject: string;
  takenAt: string;
  stepsShown: number;
  totalSteps: number;
  written: string[];
  questionsAsked: string[];
  activitiesShown: string[];
  studentAnswers: string[];
  annotations: number;
  session: BoardSession;
}

/** Final board state saved with the lecture. */
export function boardSnapshot(
  session: BoardSession,
  info: { stepsShown: number; studentAnswers: string[]; annotations: number },
): BoardSnapshot {
  const all = session.steps.flatMap((s) => s.elements);
  return {
    topic: session.topic,
    className: session.className,
    section: session.section,
    subject: session.subject,
    takenAt: new Date().toISOString(),
    stepsShown: info.stepsShown,
    totalSteps: session.steps.length,
    written: all.filter((e) => ["text", "equation", "steps", "summary", "table"].includes(e.type)).flatMap((e) => (e.lines.length ? e.lines : (e.rows ?? []).map((r) => `${r[0]} — ${r[1]}`))),
    questionsAsked: all.filter((e) => e.type === "question").flatMap((e) => e.lines),
    activitiesShown: all.filter((e) => e.type === "activity").flatMap((e) => e.lines),
    studentAnswers: info.studentAnswers,
    annotations: info.annotations,
    session,
  };
}

/** Simple observation over a set of class answers. */
export function answerObservation(answers: string[]): string | null {
  if (answers.length < 3) return null;
  const counts = new Map<string, number>();
  answers.forEach((a) => counts.set(a.trim(), (counts.get(a.trim()) ?? 0) + 1));
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted[0]!;
  const other = sorted[1];
  if (!other) return `All ${answers.length} children answered ${top[0]}.`;
  return `Most children answered ${top[0]}. ${other[1]} answered ${other[0]} — this usually means tens and ones were mixed up.`;
}
