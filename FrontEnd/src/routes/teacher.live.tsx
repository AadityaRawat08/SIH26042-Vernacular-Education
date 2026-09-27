import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Languages,
  MoreHorizontal,
  Pause,
  Play,
  Presentation,
  Timer,
  Toolbox,
  Users,
  X,
} from "lucide-react";
import { Surface } from "@/components/common/ui-kit";
import { LiveBlackboard } from "@/components/blackboard/LiveBlackboard";
import { TeacherLanguageBridge, StudentResponsePanel } from "@/components/translation/TranslationPanel";
import { LectureWrapUp } from "@/components/teaching/LectureWrapUp";
import { LiveLectureTools, type LiveToolId } from "@/components/teaching/LiveLectureTools";
import type { TeacherNote } from "@/components/teaching/TeachingTools";
import { useApp } from "@/lib/app-state";
import { studentsOf } from "@/lib/mock/selectors";
import { buildLectureSummary, type TeachingContext } from "@/lib/services/teaching-ai";
import {
  answerObservation,
  boardSnapshot,
  generateBlackboard,
  hintElement,
  makeElement,
  type BoardElement,
  type BoardSession,
} from "@/lib/services/blackboard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/teacher/live")({
  head: () => ({
    meta: [
      { title: "Live Class — Tribhashniya" },
      { name: "description", content: "Teach with a large AI blackboard, two-way translation and classroom tools." },
      { property: "og:title", content: "Live Class — Tribhashniya" },
      { property: "og:description", content: "One simple classroom workspace for blackboard teaching and language support." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LivePage,
});

function pad(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function LivePage() {
  const { plan, classrooms, queueSync, saveBoard } = useApp();
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [lessonStep, setLessonStep] = useState(1);
  const [boardStep, setBoardStep] = useState(0);
  const [annotationCount, setAnnotationCount] = useState(0);
  const [teacherTranslationOpen, setTeacherTranslationOpen] = useState(true);
  const [studentTranslationOpen, setStudentTranslationOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<LiveToolId | null>(null);
  const [boardToolsOpen, setBoardToolsOpen] = useState(false);
  const [notes, setNotes] = useState<TeacherNote[]>([]);
  const [marks, setMarks] = useState<Record<string, boolean | undefined>>({});
  const [participation, setParticipation] = useState<Record<string, string[]>>({});
  const [classAnswers, setClassAnswers] = useState<string[]>([]);
  const [understanding, setUnderstanding] = useState<"understood" | "partial" | "help" | null>(null);
  const [wrapUp, setWrapUp] = useState(false);

  const lessonRef = useRef<HTMLElement | null>(null);
  const boardRef = useRef<HTMLElement | null>(null);
  const teacherTranslationRef = useRef<HTMLElement | null>(null);
  const studentTranslationRef = useRef<HTMLElement | null>(null);
  const toolsRef = useRef<HTMLElement | null>(null);

  const className = plan?.request.className ?? "Class 2";
  const section = plan?.request.section ?? "A";
  const subject = plan?.request.subject ?? "Mathematics";
  const topic = plan?.request.topic ?? "Addition within 100";
  const durationMin = plan?.request.durationMin ?? 40;
  const timeline = plan?.timeline ?? [
    { title: "Introduction", from: 0, to: 5, detail: "Connect the topic to what children already know." },
    { title: "Explanation", from: 5, to: 15, detail: "Show tens and ones clearly on the board." },
    { title: "Activity", from: 15, to: 25, detail: "Count objects together in small groups." },
    { title: "Practice", from: 25, to: 35, detail: "Children solve one example with a partner." },
    { title: "Assessment", from: 35, to: 40, detail: "Ask one short check question." },
  ];
  const currentLesson = timeline[Math.min(lessonStep, timeline.length - 1)] ?? timeline[0]!;
  const lessonScript = plan?.script ?? "Explain that tens are groups of ten. Say: Let us count the tens first, then the ones. Ask: What do you notice?";

  const classroom = useMemo(
    () => classrooms.find((item) => item.className === className && item.section === section) ?? classrooms[0],
    [classrooms, className, section],
  );
  const students = useMemo(() => (classroom ? studentsOf(classroom.id).slice(0, 8) : []), [classroom]);
  const [board, setBoard] = useState<BoardSession>(() => generateBlackboard({ className, section, subject, topic }));

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const teachingContext: TeachingContext = { surface: "live", className, section, subject, topic };
  const progress = Math.min(100, (seconds / 60 / durationMin) * 100);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const openTool = (tool: LiveToolId | null = null) => {
    setActiveTool(tool);
    setToolsOpen(true);
  };
  const addToBoard = (element: BoardElement) => {
    setBoard((current) => ({ ...current, steps: current.steps.map((step, index) => index === boardStep ? { ...step, elements: [...step.elements, element] } : step) }));
    toast.success("Added to the blackboard");
  };
  const mark = (id: string, present: boolean) => {
    setMarks((current) => ({ ...current, [id]: present }));
    queueSync(`Attendance — ${students.find((student) => student.id === id)?.name ?? "student"} ${present ? "present" : "absent"}`, "Attendance");
  };
  const finishClass = () => {
    setRunning(false);
    setWrapUp(true);
  };

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => navigate({ to: "/teacher" })} className="grid size-10 shrink-0 place-items-center rounded-full border border-border" aria-label="Exit class"><ArrowLeft className="size-4" /></button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-success uppercase">Live Class · {className}{section}</p>
              <h1 className="truncate text-base font-semibold sm:text-lg">{subject} · {topic}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="hidden items-center gap-1 rounded-full bg-secondary px-3 py-2 font-mono text-xs sm:flex"><Timer className="size-3.5" />{pad(seconds)}</div>
            <button type="button" onClick={() => setRunning((value) => !value)} className="grid size-10 place-items-center rounded-full bg-ink text-ink-foreground" aria-label={running ? "Pause class timer" : "Resume class timer"}>{running ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
            <button type="button" onClick={() => openTool()} className="grid size-10 place-items-center rounded-full border border-border" aria-label="More classroom tools"><MoreHorizontal className="size-5" /></button>
          </div>
        </div>
        <div className="h-1 bg-secondary"><div className="h-full bg-success transition-all" style={{ width: `${progress}%` }} /></div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-3 pt-4 pb-36 sm:px-5 sm:pt-6">
        <section ref={lessonRef} className="scroll-mt-24" aria-labelledby="lesson-progress-heading">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <div className="min-w-0"><p className="eyebrow">Lesson progress</p><h2 id="lesson-progress-heading" className="truncate text-xl font-semibold">{currentLesson.title}</h2></div>
            <button type="button" onClick={() => openTool("script")} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold">Lesson script</button>
          </div>
          <div className="mt-3 flex overflow-x-auto pb-1">
            {timeline.map((item, index) => (
              <button key={`${item.title}-${index}`} type="button" onClick={() => setLessonStep(index)} className="group flex min-w-24 flex-1 items-center text-left last:flex-none">
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold", index < lessonStep ? "bg-success text-success-foreground" : index === lessonStep ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{index < lessonStep ? <Check className="size-3.5" /> : index + 1}</span>
                <span className={cn("mx-1 h-0.5 min-w-6 flex-1", index < lessonStep ? "bg-success" : "bg-border", index === timeline.length - 1 && "hidden")} />
              </button>
            ))}
          </div>
          <div className="mt-1 flex gap-4 overflow-x-auto text-[11px] text-muted-foreground">{timeline.map((item, index) => <span key={`${item.title}-label`} className={cn("min-w-20", index === lessonStep && "font-semibold text-primary")}>{item.title}</span>)}</div>
        </section>

        <section ref={boardRef} className="scroll-mt-24" aria-labelledby="blackboard-heading">
          <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><div><p className="eyebrow">Main workspace</p><h2 id="blackboard-heading" className="text-xl font-semibold">Blackboard</h2></div><button type="button" onClick={() => setBoardToolsOpen(true)} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold">Edit Blackboard</button></div>
          <LiveBlackboard session={board} onSessionChange={setBoard} stepIndex={boardStep} onStepChange={setBoardStep} onAnnotationsChange={setAnnotationCount} toolsOpen={boardToolsOpen} onToolsOpenChange={setBoardToolsOpen} />
        </section>

        <TranslationSection ref={teacherTranslationRef} eyebrow="Teacher → Students" title="Language Bridge" subtitle="Communicate with students in their language." open={teacherTranslationOpen} onToggle={() => setTeacherTranslationOpen((value) => !value)} tone="teacher">
          <TeacherLanguageBridge onSend={(text) => toast.success(`Ready for students: ${text}`)} />
        </TranslationSection>

        <TranslationSection ref={studentTranslationRef} eyebrow="Students → Teacher" title="Student Response" subtitle="Let students respond in the language they understand." open={studentTranslationOpen} onToggle={() => setStudentTranslationOpen((value) => !value)} tone="student">
          <StudentResponsePanel onSend={(text) => setClassAnswers((answers) => [...answers, text])} />
        </TranslationSection>

        <section ref={toolsRef} className="scroll-mt-24" aria-labelledby="tools-heading">
          <div className="mb-3"><p className="eyebrow">On demand</p><h2 id="tools-heading" className="text-xl font-semibold">Teaching Tools</h2></div>
          <button type="button" onClick={() => openTool()} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-primary/20 bg-tint-indigo p-4 text-left shadow-[var(--shadow-card)]"><span className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground"><Toolbox className="size-5" /></span><span className="min-w-0"><span className="block font-semibold">Open all classroom tools</span><span className="block text-xs text-muted-foreground">Teach, students, classroom and teacher tools</span></span><ArrowLeft className="size-4 rotate-180 text-primary" /></button>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ToolShortcut icon="✨" title="AI Blackboard" subtitle="Create board content" onClick={() => openTool("ai-board")} />
            <ToolShortcut icon="🎯" title="Activity" subtitle="Start class activity" onClick={() => openTool("activity")} />
            <ToolShortcut icon="📅" title="Attendance" subtitle="Mark the class" onClick={() => openTool("attendance")} />
            <ToolShortcut icon="📝" title="Assessment" subtitle="Check learning" onClick={() => openTool("assessment")} />
          </div>
        </section>

        <Surface as="section" className="border-coral-deep/20" aria-labelledby="understanding-heading">
          <p className="eyebrow">Student understanding</p>
          <h2 id="understanding-heading" className="mt-1 text-xl font-semibold">How is the class doing?</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <UnderstandingButton label="Understood" icon="✓" active={understanding === "understood"} onClick={() => setUnderstanding("understood")} tone="success" />
            <UnderstandingButton label="Partly" icon="◐" active={understanding === "partial"} onClick={() => setUnderstanding("partial")} tone="warning" />
            <UnderstandingButton label="Needs Help" icon="!" active={understanding === "help"} onClick={() => { setUnderstanding("help"); addToBoard(hintElement(topic)); }} tone="danger" />
          </div>
          {understanding === "help" ? <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-tint-coral p-3"><div className="min-w-0"><p className="text-sm font-semibold">Try one more visual explanation.</p><p className="text-xs text-muted-foreground">A structured hint is ready on the blackboard.</p></div><button type="button" onClick={() => openTool("explain")} className="shrink-0 rounded-lg bg-card px-3 py-2 text-xs font-semibold">Explain again</button></div> : null}
          {classAnswers.length ? <div className="mt-3 rounded-lg bg-secondary p-3"><p className="text-xs font-semibold">Recent class responses</p><p className="mt-1 text-sm">{answerObservation(classAnswers) ?? classAnswers.slice(-3).join(" · ")}</p></div> : null}
        </Surface>

        <button type="button" onClick={finishClass} className="w-full rounded-lg bg-coral-deep py-4 text-base font-semibold text-primary-foreground">End Class</button>
      </main>

      <nav aria-label="Live Class quick access" className="fixed inset-x-2 bottom-2 z-40 mx-auto max-w-xl rounded-lg border border-border bg-card/95 p-1.5 shadow-[var(--shadow-lift)] backdrop-blur">
        <div className="grid grid-cols-5">
          <QuickAction label="Lesson" icon={BookOpen} onClick={() => { scrollTo(lessonRef); openTool("script"); }} />
          <QuickAction label="Board" icon={Presentation} onClick={() => scrollTo(boardRef)} />
          <QuickAction label="Translate" icon={Languages} onClick={() => { setTeacherTranslationOpen(true); window.setTimeout(() => scrollTo(teacherTranslationRef), 50); }} />
          <QuickAction label="Students" icon={Users} onClick={() => { setStudentTranslationOpen(true); window.setTimeout(() => scrollTo(studentTranslationRef), 50); }} />
          <QuickAction label="Tools" icon={Toolbox} onClick={() => openTool()} />
        </div>
      </nav>

      <LiveLectureTools open={toolsOpen} activeTool={activeTool} onOpenChange={setToolsOpen} onActiveToolChange={setActiveTool} context={teachingContext} students={students} marks={marks} onMark={mark} participation={participation} onParticipationChange={setParticipation} notes={notes} onNotesChange={setNotes} currentScript={lessonScript} studentAnswers={classAnswers} onAddToBoard={addToBoard} onOpenBlackboardTools={() => setBoardToolsOpen(true)} />

      {wrapUp ? <LectureWrapUp summary={buildLectureSummary({ classLabel: `${className} ${section}`, subject, topic, durationMin: Math.max(1, Math.round(seconds / 60)), activitiesDone: [plan?.activity.objective ?? "Blackboard lesson"], notes: notes.map((note) => note.text), presentCount: Object.values(marks).filter(Boolean).length, totalCount: students.length, participationCount: Object.values(participation).filter((tags) => tags.length).length, needAttention: students.filter((student) => (participation[student.id] ?? []).includes("Needed help")).map((student) => student.name) })} onClose={() => setWrapUp(false)} onSave={() => { const snapshot = boardSnapshot(board, { stepsShown: boardStep + 1, studentAnswers: classAnswers, annotations: annotationCount }); saveBoard(snapshot); queueSync(`Blackboard snapshot — ${topic}`, "Blackboard"); queueSync(`Lecture summary — ${topic}`, "Lecture"); setWrapUp(false); navigate({ to: "/teacher" }); }} /> : null}
    </div>
  );
}

const TranslationSection = ({ ref, eyebrow, title, subtitle, open, onToggle, tone, children }: { ref: React.Ref<HTMLElement>; eyebrow: string; title: string; subtitle: string; open: boolean; onToggle: () => void; tone: "teacher" | "student"; children: React.ReactNode }) => (
  <section ref={ref} className="scroll-mt-24 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
    <button type="button" onClick={onToggle} className={cn("grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 text-left sm:p-5", tone === "teacher" ? "bg-tint-teal" : "bg-tint-mint")} aria-expanded={open}>
      <span className="min-w-0"><span className="eyebrow block">{eyebrow}</span><span className="mt-1 block text-xl font-semibold">{title}</span><span className="mt-1 block text-sm text-muted-foreground">{subtitle}</span></span>{open ? <ChevronUp className="size-5 shrink-0" /> : <ChevronDown className="size-5 shrink-0" />}
    </button>
    {open ? <div className="p-4 sm:p-5">{children}</div> : null}
  </section>
);

function ToolShortcut({ icon, title, subtitle, onClick }: { icon: string; title: string; subtitle: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="grid min-h-24 grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-lg border border-border bg-card p-3 text-left"><span className="text-xl">{icon}</span><span className="min-w-0"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{subtitle}</span></span></button>;
}

function UnderstandingButton({ label, icon, active, onClick, tone }: { label: string; icon: string; active: boolean; onClick: () => void; tone: "success" | "warning" | "danger" }) {
  const activeTone = tone === "success" ? "border-success bg-tint-mint text-success" : tone === "warning" ? "border-warning bg-tint-amber text-warning" : "border-coral-deep bg-tint-coral text-coral-deep";
  return <button type="button" onClick={onClick} className={cn("min-h-20 rounded-lg border p-2 text-center text-xs font-semibold", active ? activeTone : "border-border bg-card")}><span className="mx-auto mb-1 grid size-7 place-items-center rounded-full bg-secondary text-base">{icon}</span>{label}</button>;
}

function QuickAction({ label, icon: Icon, onClick }: { label: string; icon: typeof BookOpen; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-w-0 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"><Icon className="size-4" /><span className="truncate">{label}</span></button>;
}
