import type { LanguageCode, PeriodPlan, PlanRequest, TimelineStep } from "../types";
import { vocabulary } from "../mock/data";

/**
 * SIMULATED AI SERVICE.
 *
 * Everything here is local, deterministic mock generation. A backend developer
 * replaces the body of each function with a real API/LLM/RAG call — the
 * signatures and return types are the integration contract.
 */

export const GENERATION_STAGES = [
  "Analyzing curriculum…",
  "Reading relevant textbook content…",
  "Retrieving educational resources…",
  "Understanding learning objective…",
  "Analyzing class history…",
  "Selecting teaching strategy…",
  "Preparing local examples…",
  "Generating activities…",
  "Preparing language support…",
  "Generating assessment…",
  "Finalizing period plan…",
];

function buildTimeline(duration: number): TimelineStep[] {
  const parts: { title: string; detail: string; weight: number }[] = [
    { title: "Warm-up", detail: "Quick oral counting to settle the class.", weight: 0.12 },
    { title: "Introduction", detail: "Connect today's topic to yesterday's stick activity.", weight: 0.13 },
    { title: "Concept explanation", detail: "Explain combining two quantities, in Hindi then Santhali.", weight: 0.2 },
    { title: "Demonstration", detail: "Show 2 + 3 on the blackboard with drawn sticks.", weight: 0.18 },
    { title: "Student activity", detail: "Pairs collect objects and make totals.", weight: 0.17 },
    { title: "Questions", detail: "Whole-class oral questions, easy to challenge.", weight: 0.1 },
    { title: "Assessment", detail: "Three quick oral sums, note who hesitates.", weight: 0.1 },
  ];
  let cursor = 0;
  return parts.map((p, i) => {
    const span = i === parts.length - 1 ? duration - cursor : Math.max(2, Math.round(duration * p.weight));
    const step = { from: cursor, to: Math.min(duration, cursor + span), title: p.title, detail: p.detail };
    cursor = step.to;
    return step;
  });
}

const SCRIPTS = {
  en: "\"Children, look at these two sticks in my hand. Now look at these three. Let us put them together and count them all — one, two, three, four, five. So two and three make five. Say it with me: two and three is five.\"",
  hi: "\"बच्चों, मेरे हाथ में ये दो डंडे देखो। अब ये तीन डंडे देखो। अब इन्हें साथ रखते हैं और सब गिनते हैं — एक, दो, तीन, चार, पाँच। तो दो और तीन मिलकर पाँच होते हैं। मेरे साथ बोलो: दो और तीन पाँच।\"",
  sat: "\"ᱜᱟᱴᱮᱠᱳ, ᱤᱧᱟᱜ ᱛᱤᱨᱮ ᱱᱚᱶᱟ ᱵᱟᱨᱮᱭᱟ ᱥᱟᱠᱟᱢ ᱧᱮᱞ ᱢᱮ। ᱱᱤᱛᱚᱜ ᱱᱚᱶᱟ ᱯᱮᱭᱟ ᱧᱮᱞ ᱢᱮ। ᱡᱚᱛᱚ ᱞᱮᱠᱷᱟᱭ ᱢᱮ — ᱢᱤᱫ, ᱵᱟᱨ, ᱯᱮ, ᱯᱩᱱ, ᱢᱚᱬᱮ। ᱵᱟᱨ ᱟᱨ ᱯᱮ ᱫᱚ ᱢᱚᱬᱮ ᱠᱟᱱᱟ।\"",
};

const LANGUAGE_LABEL: Record<LanguageCode, string> = {
  en: "English",
  hi: "Hindi",
  sat: "Santhali",
  ho: "Ho",
  mun: "Mundari",
};

export function languageLabel(code: LanguageCode) {
  return LANGUAGE_LABEL[code] ?? code;
}

/** Simulated period-plan generation. Replace with POST /api/plans. */
export function generatePeriodPlan(request: PlanRequest): PeriodPlan {
  const topic = request.topic || "Addition";
  const objectiveBase = [
    `Students combine two quantities and state the total for ${topic.toLowerCase()}.`,
    "Students use classroom objects to show a number sentence.",
    `Students say the key words in ${languageLabel(request.language)} and in Hindi.`,
  ];

  return {
    id: `plan-${Date.now()}`,
    request,
    createdAt: new Date().toISOString(),
    approved: false,
    objective: objectiveBase,
    whatToTeach: `Teach ${topic} as a physical action first: put two groups together, then count the whole. Only after every child has done it with objects, write the number sentence on the board. Keep numbers within the range the class already recognises, and repeat each instruction in ${languageLabel(request.language)} for the back rows.`,
    timeline: buildTimeline(request.durationMin),
    script: SCRIPTS[request.language as keyof typeof SCRIPTS] ?? SCRIPTS.en,
    scriptTranslations: {
      en: SCRIPTS.en,
      hi: SCRIPTS.hi,
      sat: SCRIPTS.sat,
    },
    explanation: `Two things and three more things are five things altogether. The word "and" means we bring the groups together. Nothing is taken away, so the answer is always bigger than each group.`,
    vocabulary: vocabulary.slice(0, 5),
    localExamples: [
      "Sticks collected from the school ground",
      "Small stones from the field boundary",
      "Mahua leaves in bundles of five",
      "Chalk pieces on the teacher's table",
      "Children standing in two rows",
    ],
    activity: {
      objective: "Every child physically makes a total from two groups.",
      materials: ["Sticks or stones (5 per child)", "Blackboard", "Chalk"],
      steps: [
        "Ask each pair to collect 5 sticks between them.",
        "One child places 2 sticks, the other places 3.",
        "Together they push the groups into one pile and count aloud.",
        "Repeat with 4 and 1, then 3 and 3.",
        "Two pairs come to the board and draw what they did.",
      ],
      outcome: "Children say the total without recounting from one.",
      timeMin: Math.max(6, Math.round(request.durationMin * 0.18)),
    },
    videos: [
      { id: "vd-1", title: "Counting with sticks", durationMin: 4, language: "Hindi", topic, relevance: 94 },
      { id: "vd-2", title: "Addition song for young learners", durationMin: 2, language: "Santhali", topic, relevance: 88 },
      { id: "vd-3", title: "Making tens with objects", durationMin: 6, language: "Hindi", topic, relevance: 72 },
    ],
    visuals: [
      { title: "Two groups joining", caption: "Two sticks and three sticks drawn side by side, then circled as one group." },
      { title: "Number line 0–10", caption: "Hops of 2 then 3 landing on 5." },
      { title: "Ten frame", caption: "Five filled cells out of ten." },
    ],
    blackboard: [
      "Date · Class 2A · Addition",
      "|| + ||| = |||||",
      "2 + 3 = 5",
      "जोड़ना = ᱡᱚᱲᱟᱣ",
      "Practice: 4 + 1 = ___   3 + 3 = ___   5 + 2 = ___",
    ],
    questions: {
      easy: ["How many sticks are in this hand?", "2 और 1 कितने हुए?", "Show me three stones."],
      medium: ["4 + 3 is how much?", "If I add 2 more to 5, what do I get?", "Make 7 using two groups."],
      challenge: [
        "Two children have 4 stones each. How many together?",
        "I have 6 sticks. How many more to reach 10?",
        "Say a story where you added something at home.",
      ],
    },
    worksheet: {
      title: `${topic} — practice sheet (${languageLabel(request.language)} support)`,
      items: [
        "Draw 2 sticks and 3 sticks. Write the total.",
        "2 + 3 = ___",
        "4 + 1 = ___",
        "Circle the group that has more.",
        "Match the picture to the number sentence.",
        "Write the Santhali word for 'total'.",
      ],
    },
    assessment: {
      title: "Quick oral assessment (last 4 minutes)",
      items: [
        "Ask 3 children: 2 + 3?",
        "Ask 3 children: 4 + 2?",
        "Ask the back row in Santhali: ᱵᱟᱨ ᱟᱨ ᱯᱮ?",
        "Mark who hesitated for more than 5 seconds.",
      ],
    },
    homework: [
      "Collect 10 small objects at home and make two groups. Draw them.",
      "Write three addition sentences in the notebook.",
    ],
    remedial: [
      "Work with 5 children using only numbers up to 5.",
      "Use fingers before objects, then objects before symbols.",
      "Repeat the whole explanation in Santhali only.",
    ],
    advanced: [
      "Add three groups: 2 + 3 + 1.",
      "Make your own story problem for a friend.",
    ],
    teacherNotes: [
      "Keep the back rows involved — repeat every instruction in the mother tongue.",
      "Do not move to written sums until the objects activity is complete.",
      `Internet is ${request.internet}; audio and worksheets are already downloaded.`,
    ],
    rationale: [
      "Previous class performance on this concept was 54%.",
      "Students struggled with quantity combinations, not with counting itself.",
      "The chosen activity requires no special equipment — only classroom objects.",
      `Selected resources match the available equipment: ${request.resources.join(", ") || "blackboard only"}.`,
      `Student level is set to ${request.studentLevel}, so numbers stay within a familiar range.`,
    ],
  };
}

/** Simulated translation. Replace with a BHASHINI NMT call. */
export function translate(text: string, target: LanguageCode): string {
  if (!text.trim()) return "";
  if (target === "sat") return `ᱠᱚᱠᱚ ᱦᱚᱲ — ${text} (ᱥᱟᱱᱛᱟᱲᱤ ᱫᱮᱢᱳ)`;
  if (target === "hi") return `डेमो अनुवाद — ${text}`;
  return `Demo translation — ${text}`;
}

/** Simulated ASR result. Replace with a real speech-to-text stream. */
export function recognizeSpeech(): { text: string; language: LanguageCode; confidence: number } {
  return {
    text: "बच्चों, आज हम जोड़ना सीखेंगे।",
    language: "hi",
    confidence: 0.94,
  };
}

/** Simulated response evaluation. Replace with a scoring API. */
export function evaluateResponse(answer: string, expected: string) {
  const clean = answer.trim().toLowerCase();
  const exp = expected.trim().toLowerCase();
  if (!clean) return null;
  if (clean === exp) {
    return {
      result: "correct" as const,
      confidence: 92,
      diagnosis: "Concept understood.",
      nextAction: "Great! Continue to the next activity.",
    };
  }
  if (exp.includes(clean) || clean.length > 0 === false) {
    return {
      result: "partial" as const,
      confidence: 61,
      diagnosis: "Partial understanding — the child counted but lost track.",
      nextAction: "AI recommends another simpler example with fewer objects.",
    };
  }
  const languageGap = clean.length > 3;
  return {
    result: "incorrect" as const,
    confidence: 48,
    diagnosis: languageGap
      ? "Possible issue: language comprehension — the question may not have been understood."
      : "Possible issue: concept understanding — combining quantities is not secure.",
    nextAction: languageGap
      ? "AI recommends repeating the question in the mother tongue."
      : "AI recommends a remedial explanation with physical objects.",
  };
}
