import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  FolderOpen,
  Gauge,
  Globe2,
  GraduationCap,
  Headphones,
  History,
  Home,
  Lightbulb,
  MessageCircle,
  Mic,
  NotebookPen,
  Presentation,
  RotateCcw,
  Sparkles,
  Sprout,
  Target,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  askBlackboardAI,
  hintElement,
  makeElement,
  type BoardElement,
} from "@/lib/services/blackboard";
import {
  copilotReply,
  explainAgain,
  generateActivity,
  generateHomework,
  generateStory,
  localExamples,
  transcribeTeacherNote,
  type TeachingContext,
} from "@/lib/services/teaching-ai";
import type { TeacherNote } from "@/components/teaching/TeachingTools";

export type LiveToolId =
  | "ai-board" | "explain" | "local" | "story" | "activity" | "script"
  | "attendance" | "assessment" | "progress" | "support" | "pulse" | "participation"
  | "homework" | "resources" | "pronunciation" | "translations" | "board-tools"
  | "notes" | "copilot" | "reuse" | "feedback";

type Student = { id: string; name: string };

type ToolDefinition = {
  id: LiveToolId;
  label: string;
  description: string;
  icon: typeof Sparkles;
  tint: string;
};

const GROUPS: Array<{ title: string; tools: ToolDefinition[] }> = [
  {
    title: "Teach",
    tools: [
      { id: "ai-board", label: "AI Blackboard", description: "Create or improve board content", icon: Sparkles, tint: "bg-tint-lavender text-violet-deep" },
      { id: "explain", label: "Explain Again", description: "Try another way to explain it", icon: Lightbulb, tint: "bg-tint-amber text-amber-deep" },
      { id: "local", label: "Local Example", description: "Connect the lesson to daily life", icon: Sprout, tint: "bg-tint-mint text-success" },
      { id: "story", label: "Story", description: "Teach through a short story", icon: BookOpen, tint: "bg-tint-sky text-info" },
      { id: "activity", label: "Activity", description: "Create a classroom activity", icon: Target, tint: "bg-tint-teal text-teal-deep" },
      { id: "script", label: "Lesson Script", description: "See what to say in this step", icon: NotebookPen, tint: "bg-tint-sand text-foreground" },
    ],
  },
  {
    title: "Students",
    tools: [
      { id: "attendance", label: "Attendance", description: "Mark today's attendance", icon: CalendarCheck, tint: "bg-tint-mint text-success" },
      { id: "assessment", label: "Assessment", description: "Check learning during class", icon: ClipboardCheck, tint: "bg-tint-sky text-info" },
      { id: "progress", label: "Student Progress", description: "See a quick class overview", icon: BarChart3, tint: "bg-tint-indigo text-primary" },
      { id: "support", label: "Student Support", description: "Find the right next action", icon: Users, tint: "bg-tint-coral text-coral-deep" },
      { id: "pulse", label: "Class Learning Pulse", description: "See if the class is on track", icon: Gauge, tint: "bg-tint-amber text-amber-deep" },
      { id: "participation", label: "Participation", description: "Record who joined in", icon: GraduationCap, tint: "bg-tint-teal text-teal-deep" },
    ],
  },
  {
    title: "Classroom",
    tools: [
      { id: "homework", label: "Homework", description: "Create and assign practice", icon: Home, tint: "bg-tint-amber text-amber-deep" },
      { id: "resources", label: "Resources", description: "Use saved teaching materials", icon: FolderOpen, tint: "bg-tint-sky text-info" },
      { id: "pronunciation", label: "Pronunciation", description: "Hear a lesson word clearly", icon: Headphones, tint: "bg-tint-teal text-teal-deep" },
      { id: "translations", label: "Saved Translations", description: "Reuse trusted classroom phrases", icon: Globe2, tint: "bg-tint-mint text-success" },
      { id: "board-tools", label: "Blackboard Tools", description: "Draw, edit and translate the board", icon: Presentation, tint: "bg-tint-sand text-foreground" },
    ],
  },
  {
    title: "Teacher",
    tools: [
      { id: "notes", label: "Teacher Notes", description: "Record what you observe", icon: Mic, tint: "bg-tint-coral text-coral-deep" },
      { id: "copilot", label: "Ask Tribhashniya", description: "Get contextual teaching help", icon: MessageCircle, tint: "bg-tint-lavender text-violet-deep" },
      { id: "reuse", label: "Reuse Content", description: "Reuse a previous teaching item", icon: History, tint: "bg-tint-sky text-info" },
      { id: "feedback", label: "Teacher Feedback", description: "Record what worked today", icon: NotebookPen, tint: "bg-tint-coral text-coral-deep" },
    ],
  },
];

const action = "rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50";
const secondary = "rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold";

export function LiveLectureTools({
  open,
  activeTool,
  onOpenChange,
  onActiveToolChange,
  context,
  students,
  marks,
  onMark,
  participation,
  onParticipationChange,
  notes,
  onNotesChange,
  currentScript,
  studentAnswers,
  onAddToBoard,
  onOpenBlackboardTools,
}: {
  open: boolean;
  activeTool: LiveToolId | null;
  onOpenChange: (open: boolean) => void;
  onActiveToolChange: (tool: LiveToolId | null) => void;
  context: TeachingContext;
  students: Student[];
  marks: Record<string, boolean | undefined>;
  onMark: (id: string, present: boolean) => void;
  participation: Record<string, string[]>;
  onParticipationChange: (next: Record<string, string[]>) => void;
  notes: TeacherNote[];
  onNotesChange: (next: TeacherNote[]) => void;
  currentScript: string;
  studentAnswers: string[];
  onAddToBoard: (element: BoardElement) => void;
  onOpenBlackboardTools: () => void;
}) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiPreview, setAiPreview] = useState<ReturnType<typeof askBlackboardAI> | null>(null);
  const [localContext, setLocalContext] = useState("Village");
  const [localPreview, setLocalPreview] = useState("");
  const [story, setStory] = useState<ReturnType<typeof generateStory> | null>(null);
  const [activity, setActivity] = useState<ReturnType<typeof generateActivity> | null>(null);
  const [homework, setHomework] = useState<string[] | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantReply, setAssistantReply] = useState("");
  const [feedback, setFeedback] = useState("");
  const [assessmentResult, setAssessmentResult] = useState("");
  const [pronunciationWord, setPronunciationWord] = useState(context.topic ?? "Addition");
  const presentCount = Object.values(marks).filter(Boolean).length;
  const participationCount = Object.values(participation).filter((tags) => tags.length).length;

  const currentDefinition = useMemo(() => GROUPS.flatMap((group) => group.tools).find((tool) => tool.id === activeTool), [activeTool]);

  const close = () => {
    onActiveToolChange(null);
    onOpenChange(false);
  };

  const addPreview = (element: BoardElement) => {
    onAddToBoard({ ...element, id: `${element.id}-${Date.now()}` });
    setAiPreview(null);
    close();
  };

  const toolBody = () => {
    switch (activeTool) {
      case "ai-board":
        return <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Ask AI to create or improve what goes on the board.</p>
          <div className="flex flex-wrap gap-2">{["Simplify", "Example", "Question", "Diagram", "Summary", "Local example", "Translate"].map((prompt) => <button key={prompt} type="button" onClick={() => { setAiPrompt(prompt); setAiPreview(askBlackboardAI(prompt, { topic: context.topic ?? "this lesson", className: context.className ?? "the class" })); }} className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">{prompt}</button>)}</div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"><input value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="What do you want to add?" className="min-w-0 rounded-lg border border-border bg-background px-3 py-3 text-sm" /><button type="button" onClick={() => aiPrompt.trim() && setAiPreview(askBlackboardAI(aiPrompt, { topic: context.topic ?? "this lesson", className: context.className ?? "the class" }))} className={action}>Generate</button></div>
          {aiPreview ? <div className="rounded-lg border border-violet-deep/20 bg-tint-lavender p-4"><p className="eyebrow">AI preview</p><p className="mt-1 font-semibold">{aiPreview.element.title ?? aiPreview.element.type}</p><p className="mt-2 text-sm">{aiPreview.element.lines.join(" · ")}</p><div className="mt-3 grid grid-cols-3 gap-2"><button type="button" onClick={() => addPreview(aiPreview.element)} className={action}>Add to board</button><button type="button" onClick={() => setAiPrompt(aiPreview.element.lines.join("\n"))} className={secondary}>Edit</button><button type="button" onClick={() => setAiPreview(askBlackboardAI(aiPrompt, { topic: context.topic ?? "this lesson", className: context.className ?? "the class" }))} className={secondary}>Try again</button></div></div> : null}
        </div>;
      case "local":
        return <div className="space-y-3"><p className="text-sm">Topic: <strong>{context.topic}</strong></p><div className="flex flex-wrap gap-2">{["Village", "Market", "Home", "School", "Nature", "Everyday Life"].map((option) => <button key={option} type="button" onClick={() => setLocalContext(option)} className={cn("rounded-full px-3 py-2 text-xs font-semibold", localContext === option ? "bg-success text-success-foreground" : "border border-border")}>{option}</button>)}</div><button type="button" onClick={() => setLocalPreview(localExamples(context.topic ?? "", [localContext])[0] ?? "A familiar daily-life example.")} className={action}>Generate example</button>{localPreview ? <Preview text={localPreview} onAdd={() => { onAddToBoard(makeElement("text", [localPreview], { title: "Local example", source: "tool" })); close(); }} secondaryLabel="Use in explanation" /> : null}</div>;
      case "story":
        return <div className="space-y-3"><button type="button" onClick={() => setStory(generateStory(context.topic ?? "", context.className ?? "the class", "short", "easy"))} className={action}>Generate short story</button>{story ? <div className="rounded-lg bg-tint-sky p-4"><h3 className="font-semibold">{story.title}</h3><p className="mt-2 text-sm leading-relaxed">{story.story}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => { onAddToBoard(makeElement("text", [story.story], { title: story.title, source: "tool" })); close(); }} className={action}>Add to board</button><button type="button" onClick={() => toast.success("Reading story aloud")} className={secondary}>Read aloud</button><button type="button" onClick={() => toast.success("Story translated in demo mode")} className={secondary}>Translate</button></div></div> : null}</div>;
      case "activity":
        return <div className="space-y-3"><div className="grid grid-cols-2 gap-2"><label className="text-xs text-muted-foreground">Duration<select className="mt-1 w-full rounded-lg border border-border bg-background p-2.5"><option>10 minutes</option><option>15 minutes</option></select></label><label className="text-xs text-muted-foreground">Difficulty<select className="mt-1 w-full rounded-lg border border-border bg-background p-2.5"><option>Easy</option><option>Medium</option></select></label></div><button type="button" onClick={() => setActivity(generateActivity(context.topic ?? "", context.className ?? "the class", 10, ["Sticks"]))} className={action}>Create activity</button>{activity ? <div className="rounded-lg bg-tint-teal p-4 text-sm"><h3 className="font-semibold">{activity.title}</h3><p className="mt-1">{activity.objective}</p><p className="mt-3 font-semibold">Materials</p><p>{activity.materials.join(", ")}</p><ol className="mt-3 space-y-1">{activity.steps.map((step, index) => <li key={step}>{index + 1}. {step}</li>)}</ol><div className="mt-3 flex gap-2"><button type="button" onClick={() => { onAddToBoard(makeElement("activity", activity.steps, { title: activity.title, source: "tool" })); close(); }} className={action}>Add to board</button><button type="button" onClick={() => toast.success("Activity started")} className={secondary}>Start activity</button></div></div> : null}</div>;
      case "explain": {
        const explanation = explainAgain("simplify", context);
        return <div className="space-y-3"><div className="rounded-lg bg-tint-amber p-4 text-sm leading-relaxed">{explanation}</div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => toast.success("Using this explanation")} className={action}>Use</button><button type="button" onClick={() => { onAddToBoard(makeElement("steps", explanation.split(". ").filter(Boolean), { title: "Explain again", source: "tool" })); close(); }} className={secondary}>Add to board</button><button type="button" onClick={() => toast.success("Explanation translated")} className={secondary}>Translate</button><button type="button" onClick={() => toast.info("A new explanation is ready")} className={secondary}>Try another</button></div></div>;
      }
      case "script":
        return <div className="space-y-3"><p className="eyebrow">Current step</p><p className="rounded-lg bg-secondary p-4 text-base leading-relaxed">{currentScript}</p><div className="grid grid-cols-2 gap-2"><button type="button" className={secondary}>Previous</button><button type="button" className={action}>Next</button></div></div>;
      case "attendance":
        return <div className="space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-semibold">{presentCount} of {students.length} marked present</p><button type="button" onClick={() => students.forEach((student) => onMark(student.id, true))} className={secondary}>Mark all present</button></div>{students.map((student) => <div key={student.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-secondary p-2.5"><span className="truncate text-sm font-medium">{student.name}</span><div className="flex gap-1"><button type="button" onClick={() => onMark(student.id, true)} className={cn("rounded-lg px-2.5 py-2 text-xs", marks[student.id] === true ? "bg-success text-success-foreground" : "bg-card")}>Present</button><button type="button" onClick={() => onMark(student.id, false)} className={cn("rounded-lg px-2.5 py-2 text-xs", marks[student.id] === false ? "bg-destructive text-destructive-foreground" : "bg-card")}>Absent</button><button type="button" onClick={() => toast.success(`${student.name} marked late`)} className="rounded-lg bg-card px-2.5 py-2 text-xs">Late</button></div></div>)}<button type="button" onClick={() => toast.success("Attendance saved")} className={action}>Save attendance</button></div>;
      case "assessment":
        return <div className="space-y-3"><p className="text-sm text-muted-foreground">Current topic: {context.topic}</p><div className="rounded-lg bg-tint-sky p-4"><p className="eyebrow">Short answer</p><p className="mt-1 text-lg font-semibold">What is 23 + 14?</p></div><div className="grid grid-cols-3 gap-2">{["Correct", "Partly Correct", "Needs Help"].map((result) => <button key={result} type="button" onClick={() => setAssessmentResult(result)} className={cn("rounded-lg border px-2 py-3 text-xs font-semibold", assessmentResult === result ? "border-primary bg-secondary text-primary" : "border-border")}>{result}</button>)}</div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => onAddToBoard(makeElement("question", ["What is 23 + 14?"], { highlighted: true, area: "bottom", source: "tool" }))} className={secondary}>Ask on board</button><button type="button" onClick={() => assessmentResult ? toast.success("Assessment result saved") : toast.warning("Choose a result first")} className={action}>Save result</button></div></div>;
      case "participation":
        return <div className="space-y-2"><p className="text-sm text-muted-foreground">Tap what each child did.</p>{students.map((student) => <div key={student.id} className="rounded-lg bg-secondary p-2.5"><p className="text-sm font-semibold">{student.name}</p><div className="mt-2 flex flex-wrap gap-1">{["Participated", "Answered", "Asked", "Needed help"].map((tag) => { const active = (participation[student.id] ?? []).includes(tag); return <button key={tag} type="button" onClick={() => onParticipationChange({ ...participation, [student.id]: active ? (participation[student.id] ?? []).filter((item) => item !== tag) : [...(participation[student.id] ?? []), tag] })} className={cn("rounded-full px-2.5 py-1.5 text-[11px]", active ? "bg-ink text-ink-foreground" : "bg-card")}>{tag}</button>; })}</div></div>)}</div>;
      case "progress":
        return <div className="grid grid-cols-3 gap-2"><Metric label="Class average" value="74%" /><Metric label="Doing well" value={String(Math.max(1, participationCount))} /><Metric label="Need support" value={String(Math.max(0, students.length - participationCount))} /><button type="button" onClick={() => toast.info("Detailed progress stays available after class")} className={cn(secondary, "col-span-3")}>View details</button></div>;
      case "support":
        return <div className="space-y-3"><div className="rounded-lg bg-tint-coral p-4"><p className="font-semibold">A few students may need another visual explanation.</p><p className="mt-1 text-sm text-muted-foreground">Tens and ones may still be mixed up.</p></div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => toast.success("A simpler explanation is ready")} className={secondary}>Explain again</button><button type="button" onClick={() => { onAddToBoard(hintElement(context.topic ?? "this topic")); close(); }} className={action}>Show hint on board</button></div></div>;
      case "pulse":
        return <div className="rounded-lg bg-tint-amber p-5 text-center"><p className="text-3xl">🟡</p><p className="mt-2 text-lg font-semibold">Needs reinforcement</p><p className="mt-1 text-sm text-muted-foreground">{studentAnswers.length ? "Recent answers show mixed understanding." : "Collect a few responses to sharpen this view."}</p></div>;
      case "homework":
        return <div className="space-y-3"><p className="text-sm">{context.className} · {context.subject} · {context.topic}</p><button type="button" onClick={() => setHomework(generateHomework(context.topic ?? "", 5, ["Short answer", "Fill in the blanks"]))} className={action}>Generate homework</button>{homework ? <div className="space-y-2">{homework.map((item, index) => <p key={item} className="rounded-lg bg-tint-amber p-3 text-sm">{index + 1}. {item}</p>)}<div className="grid grid-cols-3 gap-2"><button type="button" onClick={() => onAddToBoard(makeElement("steps", homework, { title: "Homework", area: "bottom", source: "tool" }))} className={secondary}>Add to board</button><button type="button" onClick={() => toast.success("Homework assigned")} className={action}>Assign</button><button type="button" onClick={() => toast.success("Homework saved")} className={secondary}>Save</button></div></div> : null}</div>;
      case "resources":
        return <SimpleItems items={["Addition with sticks — image", "Place value — worksheet", "Count together — audio", "Number groups — activity"]} actionLabel="Use" onAction={(item) => toast.success(`${item} ready for class`)} boardAction={(item) => onAddToBoard(makeElement("image", [item], { title: "Resource", source: "tool" }))} />;
      case "pronunciation":
        return <div className="space-y-3"><input value={pronunciationWord} onChange={(event) => setPronunciationWord(event.target.value)} className="w-full rounded-lg border border-border bg-background p-3" /><div className="rounded-lg bg-tint-teal p-4"><p className="text-xl font-semibold">{pronunciationWord}</p><p className="mt-1 text-sm text-muted-foreground">Meaning and classroom pronunciation</p></div><button type="button" onClick={() => toast.success(`Playing ${pronunciationWord}`)} className={action}>Play pronunciation</button></div>;
      case "translations":
        return <SimpleItems items={["Open your book.", "Listen carefully.", "Work in groups.", "Answer this question."]} actionLabel="Play" onAction={(item) => toast.success(`Playing: ${item}`)} boardAction={(item) => onAddToBoard(makeElement("text", [item], { title: "Classroom phrase", source: "tool" }))} />;
      case "board-tools":
        return <div className="space-y-3"><p className="text-sm text-muted-foreground">Draw, add text or images, translate, zoom, replay, and check readability.</p><button type="button" onClick={() => { close(); onOpenBlackboardTools(); }} className={action}>Open Blackboard Tools</button></div>;
      case "notes":
        return <div className="space-y-3"><button type="button" onClick={() => setNoteDraft(transcribeTeacherNote(notes.length))} className={secondary}><Mic className="mr-1 inline size-4" />Record note</button><textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={3} placeholder="What did you observe?" className="w-full rounded-lg border border-border bg-background p-3 text-sm" /><button type="button" onClick={() => { if (!noteDraft.trim()) return; onNotesChange([{ id: `note-${Date.now()}`, text: noteDraft.trim(), at: new Date().toISOString() }, ...notes]); setNoteDraft(""); toast.success("Note saved with this lecture"); }} className={action}>Save note</button>{notes.map((note) => <p key={note.id} className="rounded-lg bg-secondary p-3 text-sm">{note.text}</p>)}</div>;
      case "copilot":
        return <div className="space-y-3"><p className="text-sm text-muted-foreground">I already know this class, subject, topic, and current lesson.</p><textarea value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} rows={3} placeholder="Why are students struggling?" className="w-full rounded-lg border border-border bg-background p-3 text-sm" /><button type="button" onClick={() => assistantInput.trim() && setAssistantReply(copilotReply(assistantInput, context))} className={action}>Ask Tribhashniya</button>{assistantReply ? <p className="rounded-lg bg-tint-lavender p-4 text-sm leading-relaxed">{assistantReply}</p> : null}</div>;
      case "reuse":
        return <div className="space-y-3"><SimpleItems items={["Previous blackboard", "Market activity", "Place value worksheet", "Classroom translation", "Number story"]} actionLabel="Reuse" onAction={(item) => toast.success(`${item} reused in this class`)} /><select className="w-full rounded-lg border border-border bg-background p-3 text-sm"><option>Same class</option><option>Another section</option><option>Another class</option></select></div>;
      case "feedback":
        return <div className="space-y-3"><p className="font-semibold">Was this lesson useful?</p><div className="grid grid-cols-3 gap-2">{["👍 Yes", "😐 Partly", "👎 No"].map((option) => <button key={option} type="button" onClick={() => setFeedback(option)} className={cn("rounded-lg border px-2 py-3 text-sm", feedback === option ? "border-primary bg-secondary" : "border-border")}>{option}</button>)}</div><button type="button" onClick={() => setFeedback(`${feedback} · ${transcribeTeacherNote(1)}`)} className={secondary}><Mic className="mr-1 inline size-4" />Voice feedback</button><button type="button" onClick={() => feedback ? toast.success("Feedback saved with this lecture") : toast.warning("Choose an answer first")} className={action}>Save feedback</button></div>;
      default:
        return null;
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 sm:items-center sm:p-4" onMouseDown={(event) => event.currentTarget === event.target && close()}>
      <section className="flex max-h-[92svh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card sm:rounded-2xl">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0"><p className="eyebrow">Live Class</p><h2 className="truncate text-xl font-semibold">{currentDefinition?.label ?? "Teaching Tools"}</h2>{currentDefinition ? <p className="truncate text-xs text-muted-foreground">{currentDefinition.description}</p> : null}</div>
          <button type="button" onClick={close} aria-label="Close teaching tools" className="grid size-10 shrink-0 place-items-center rounded-full border border-border"><X className="size-4" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTool ? <>{toolBody()}<button type="button" onClick={() => onActiveToolChange(null)} className="mt-5 text-sm font-semibold text-primary">← All tools</button></> : <div className="space-y-6">{GROUPS.map((group) => <section key={group.title}><p className="eyebrow mb-2">{group.title}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{group.tools.map((tool) => <button key={tool.id} type="button" onClick={() => onActiveToolChange(tool.id)} className="grid min-h-28 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-lg border border-border bg-card p-3 text-left shadow-[var(--shadow-card)]"><span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", tool.tint)}><tool.icon className="size-4" /></span><span className="min-w-0"><span className="block text-sm font-semibold">{tool.label}</span><span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{tool.description}</span></span><ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" /></button>)}</div></section>)}</div>}
        </div>
      </section>
    </div>
  );
}

function Preview({ text, onAdd, secondaryLabel }: { text: string; onAdd: () => void; secondaryLabel: string }) {
  return <div className="rounded-lg bg-tint-mint p-4"><p className="text-sm">{text}</p><div className="mt-3 flex gap-2"><button type="button" onClick={onAdd} className={action}>Add to board</button><button type="button" onClick={() => toast.success(`${secondaryLabel} selected`)} className={secondary}>{secondaryLabel}</button></div></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-secondary p-3 text-center"><p className="text-xl font-semibold">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{label}</p></div>;
}

function SimpleItems({ items, actionLabel, onAction, boardAction }: { items: string[]; actionLabel: string; onAction: (item: string) => void; boardAction?: (item: string) => void }) {
  return <div className="space-y-2">{items.map((item) => <div key={item} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-secondary p-3"><p className="min-w-0 text-sm font-medium">{item}</p><div className="flex gap-1"><button type="button" onClick={() => onAction(item)} className="rounded-lg bg-card px-3 py-2 text-xs font-semibold">{actionLabel}</button>{boardAction ? <button type="button" onClick={() => boardAction(item)} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Add to board</button> : null}</div></div>)}</div>;
}
