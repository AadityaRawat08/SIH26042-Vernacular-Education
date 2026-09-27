import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  EXPLAIN_OPTIONS,
  LOCAL_THEMES,
  MATERIAL_OPTIONS,
  blackboardPlan,
  explainAgain,
  generateActivity,
  generateHomework,
  generateStory,
  localExamples,
  transcribeTeacherNote,
  type ExplainStyle,
  type HomeworkKind,
  type TeachingContext,
} from "@/lib/services/teaching-ai";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Mic,
  NotebookPen,
  PenSquare,
  Presentation,
  Sparkles,
  Sprout,
  Target,
  Trash2,
  X,
} from "lucide-react";

/**
 * Teaching Tools — secondary in-class helpers kept in one bottom sheet so the
 * live classroom stays uncluttered. All generation is demo mode (see
 * src/lib/services/teaching-ai.ts).
 */

export type ToolId = "explain" | "local" | "story" | "activity" | "blackboard" | "notes" | "homework";

const TOOLS: Array<{ id: ToolId; label: string; hint: string; icon: typeof Sparkles; tint: string; icons: string }> = [
  { id: "explain", label: "Explain Again", hint: "Another way to say it", icon: Sparkles, tint: "border-violet-deep/20 bg-tint-lavender", icons: "bg-violet-deep/15 text-violet-deep" },
  { id: "local", label: "Make It Local", hint: "Familiar examples", icon: Sprout, tint: "border-success/20 bg-tint-mint", icons: "bg-success/15 text-success" },
  { id: "story", label: "Teach Through Story", hint: "Short class story", icon: BookOpen, tint: "border-info/20 bg-tint-sky", icons: "bg-info/15 text-info" },
  { id: "activity", label: "Create Activity", hint: "With what you have", icon: Target, tint: "border-teal-deep/20 bg-tint-teal", icons: "bg-teal-deep/15 text-teal-deep" },
  { id: "blackboard", label: "Blackboard", hint: "What to write", icon: Presentation, tint: "border-amber-deep/20 bg-tint-amber", icons: "bg-amber-deep/15 text-amber-deep" },
  { id: "notes", label: "Teacher Notes", hint: "Speak, don't type", icon: Mic, tint: "border-coral-deep/20 bg-tint-coral", icons: "bg-coral-deep/15 text-coral-deep" },
  { id: "homework", label: "Create Homework", hint: "From this lesson", icon: NotebookPen, tint: "border-border bg-tint-sand", icons: "bg-ink/10 text-ink" },
];

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[88svh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full border border-border">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

const btn = "rounded-2xl px-4 py-3 text-sm font-semibold transition-all active:scale-[0.99]";
const primaryBtn = cn(btn, "bg-primary text-primary-foreground hover:brightness-110");
const ghostBtn = cn(btn, "border border-border bg-card");

/* ------------------------------------------------------------ Explain again */

export function ExplainAgainPanel({ context, onClose }: { context: TeachingContext; onClose: () => void }) {
  const [style, setStyle] = useState<ExplainStyle | null>(null);
  const [attempt, setAttempt] = useState(0);

  return (
    <Sheet title="Explain Again" onClose={onClose}>
      {!style ? (
        <>
          <p className="text-sm text-muted-foreground">What would you like?</p>
          <div className="mt-3 space-y-2">
            {EXPLAIN_OPTIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  setStyle(o.id);
                  setAttempt(0);
                }}
                className="w-full rounded-2xl border border-border bg-secondary/60 px-4 py-3.5 text-left"
              >
                <span className="block text-sm font-semibold">{o.label}</span>
                <span className="block text-xs text-muted-foreground">{o.hint}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">AI suggestion</p>
          <p className="mt-2 rounded-2xl bg-tint-lavender p-4 font-display text-lg leading-relaxed">
            {explainAgain(style, context, attempt)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              className={primaryBtn}
              onClick={() => {
                toast.success("Using this explanation in class");
                onClose();
              }}
            >
              Use this
            </button>
            <button className={ghostBtn} onClick={() => setAttempt((a) => a + 1)}>
              Try another
            </button>
          </div>
          <button
            className={cn(ghostBtn, "mt-2 w-full")}
            onClick={() => toast.success("Explanation prepared in the student language (demo)")}
          >
            Explain in student language
          </button>
          <button className="mt-3 text-xs font-medium text-muted-foreground underline" onClick={() => setStyle(null)}>
            Choose a different way
          </button>
        </>
      )}
    </Sheet>
  );
}

/* --------------------------------------------------------------- Local */

export function LocalExampleGenerator({ context, onClose }: { context: TeachingContext; onClose: () => void }) {
  const [themes, setThemes] = useState<string[]>(["Fruits", "Village surroundings"]);
  const [results, setResults] = useState<string[] | null>(null);

  return (
    <Sheet title="Make It Local" onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        Turn textbook examples for <span className="font-medium text-foreground">{context.topic ?? "this topic"}</span> into
        things your children see every day.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {LOCAL_THEMES.map((t) => {
          const on = themes.includes(t);
          return (
            <button
              key={t}
              onClick={() => setThemes((s) => (on ? s.filter((x) => x !== t) : [...s, t]))}
              className={cn(
                "rounded-full px-3.5 py-2 text-xs font-medium",
                on ? "bg-success text-success-foreground" : "border border-border bg-card",
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
      <button className={cn(primaryBtn, "mt-4 w-full")} onClick={() => setResults(localExamples(context.topic ?? "", themes))}>
        Generate examples
      </button>
      {results ? (
        <ul className="mt-4 space-y-2">
          {results.map((r) => (
            <li key={r} className="rounded-2xl bg-tint-mint p-4 text-sm">
              {r}
              <span className="mt-2 flex gap-2">
                <button onClick={() => toast.success("Added to this lesson")} className="rounded-full bg-card px-3 py-1.5 text-xs font-medium">Use</button>
                <button onClick={() => toast.info("Open in the planner to edit")} className="rounded-full bg-card px-3 py-1.5 text-xs font-medium">Edit</button>
                <button onClick={() => toast.success("Saved to your resources")} className="rounded-full bg-card px-3 py-1.5 text-xs font-medium">Save</button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Sheet>
  );
}

/* --------------------------------------------------------------- Story */

export function StoryGenerator({ context, onClose }: { context: TeachingContext; onClose: () => void }) {
  const [length, setLength] = useState<"short" | "medium">("short");
  const [difficulty, setDifficulty] = useState<"easy" | "medium">("easy");
  const [seed, setSeed] = useState(0);
  const [story, setStory] = useState<ReturnType<typeof generateStory> | null>(null);

  const make = () => setStory(generateStory(context.topic ?? "", context.className ?? "The class", length, difficulty));

  return (
    <Sheet title="Teach Through Story" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-medium text-muted-foreground">
          Length
          <select
            value={length}
            onChange={(e) => setLength(e.target.value as "short" | "medium")}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
          >
            <option value="short">Short (2 min)</option>
            <option value="medium">Medium (4 min)</option>
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as "easy" | "medium")}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
          </select>
        </label>
      </div>
      <button className={cn(primaryBtn, "mt-4 w-full")} onClick={make}>
        {story ? "Regenerate" : "Generate story"}
      </button>
      {story ? (
        <div key={seed} className="mt-4 space-y-3">
          <div className="rounded-2xl bg-tint-sky p-4">
            <p className="font-display text-lg font-semibold">{story.title}</p>
            <p className="mt-2 text-sm leading-relaxed">{story.story}</p>
          </div>
          <div className="surface-card p-4 text-sm">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Learning objective</p>
            <p className="mt-1">{story.objective}</p>
            <p className="mt-3 text-[11px] font-semibold text-muted-foreground uppercase">Questions</p>
            <ul className="mt-1 space-y-1">{story.questions.map((q) => <li key={q}>• {q}</li>)}</ul>
            <p className="mt-3 text-[11px] font-semibold text-muted-foreground uppercase">Vocabulary</p>
            <p className="mt-1">{story.vocabulary.join(" · ")}</p>
            <p className="mt-3 text-[11px] font-semibold text-muted-foreground uppercase">Activity</p>
            <p className="mt-1">{story.activity}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className={primaryBtn} onClick={() => { toast.success("Story added to this lesson"); onClose(); }}>Use story</button>
            <button className={ghostBtn} onClick={() => { setSeed((s) => s + 1); make(); }}>Regenerate</button>
            <button className={ghostBtn} onClick={() => toast.success("Saved to your resources")}>Save</button>
            <button className={ghostBtn} onClick={() => toast.success("Story translated (demo)")}>Translate story</button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}

/* ------------------------------------------------------------- Activity */

export function ActivityGenerator({ context, onClose }: { context: TeachingContext; onClose: () => void }) {
  const [materials, setMaterials] = useState<string[]>(["Sticks"]);
  const [duration, setDuration] = useState(10);
  const [activity, setActivity] = useState<ReturnType<typeof generateActivity> | null>(null);

  return (
    <Sheet title="Create an Activity" onClose={onClose}>
      <p className="text-sm text-muted-foreground">What do you have in the room right now?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {MATERIAL_OPTIONS.map((m) => {
          const on = materials.includes(m);
          return (
            <button
              key={m}
              onClick={() => setMaterials((s) => (on ? s.filter((x) => x !== m) : [...s, m]))}
              className={cn("rounded-full px-3.5 py-2 text-xs font-medium", on ? "bg-teal-deep text-primary-foreground" : "border border-border bg-card")}
            >
              {m}
            </button>
          );
        })}
      </div>
      <label className="mt-4 block text-xs font-medium text-muted-foreground">
        Duration — {duration} minutes
        <input type="range" min={5} max={25} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-2 w-full" />
      </label>
      <button
        className={cn(primaryBtn, "mt-2 w-full")}
        onClick={() => setActivity(generateActivity(context.topic ?? "", context.className ?? "the class", duration, materials))}
      >
        Create activity
      </button>
      {activity ? (
        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-2xl bg-tint-teal p-4">
            <p className="font-display text-lg font-semibold">{activity.title}</p>
            <p className="mt-1 text-sm">{activity.objective}</p>
            <p className="mt-2 text-xs text-muted-foreground">About {activity.timeMin} minutes · no smart board or phones needed</p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Materials</p>
            <ul className="mt-1 space-y-1">{activity.materials.map((m) => <li key={m}>• {m}</li>)}</ul>
            <p className="mt-3 text-[11px] font-semibold text-muted-foreground uppercase">Steps</p>
            <ol className="mt-1 space-y-1">{activity.steps.map((s, i) => <li key={s}>{i + 1}. {s}</li>)}</ol>
            <p className="mt-3 text-[11px] font-semibold text-muted-foreground uppercase">Teacher instructions</p>
            <p className="mt-1">{activity.teacherInstructions}</p>
            <p className="mt-3 text-[11px] font-semibold text-muted-foreground uppercase">Expected student response</p>
            <p className="mt-1">{activity.expectedResponse}</p>
            <p className="mt-3 text-[11px] font-semibold text-muted-foreground uppercase">Quick assessment</p>
            <ul className="mt-1 space-y-1">{activity.quickAssessment.map((q) => <li key={q}>• {q}</li>)}</ul>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className={primaryBtn} onClick={() => { toast.success("Activity added to this lesson"); onClose(); }}>Use activity</button>
            <button className={ghostBtn} onClick={() => toast.success("Saved to your resources")}>Save</button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}

/* ----------------------------------------------------------- Blackboard */

export function BlackboardMode({ context, onClose }: { context: TeachingContext; onClose: () => void }) {
  const [cards, setCards] = useState(() => blackboardPlan(context.topic ?? ""));
  const [i, setI] = useState(0);
  const [editing, setEditing] = useState(false);
  const card = cards[Math.min(i, cards.length - 1)]!;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#14321f] text-[#f3f7f1]">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <p className="text-xs tracking-wide uppercase opacity-70">Blackboard · {i + 1} of {cards.length}</p>
        <div className="flex gap-2">
          <button onClick={() => setEditing((e) => !e)} className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-medium">
            <PenSquare className="mr-1 inline size-3.5" /> {editing ? "Done" : "Edit"}
          </button>
          <button onClick={() => toast.success("Blackboard plan saved")} className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-medium">Save</button>
          <button onClick={onClose} aria-label="Close blackboard" className="grid size-8 place-items-center rounded-full border border-white/25">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 pb-6">
        <p className="font-display text-sm tracking-[0.2em] uppercase opacity-70">{card.heading}</p>
        {editing ? (
          <textarea
            value={card.lines.join("\n")}
            onChange={(e) =>
              setCards((cs) => cs.map((c, idx) => (idx === i ? { ...c, lines: e.target.value.split("\n") } : c)))
            }
            rows={6}
            className="mt-4 w-full rounded-2xl border border-white/25 bg-transparent p-4 font-display text-2xl leading-relaxed outline-none"
          />
        ) : (
          <div className="mt-4 space-y-3">
            {card.lines.map((line, idx) => (
              <p key={idx} className="font-display text-3xl leading-snug sm:text-4xl">{line}</p>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-5 pb-8">
        <button
          onClick={() => setI((v) => Math.max(0, v - 1))}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-white/25 px-5 py-3.5 text-sm font-semibold"
        >
          <ChevronLeft className="size-4" /> Previous
        </button>
        <button
          onClick={() => setI((v) => Math.min(cards.length - 1, v + 1))}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-white/15 px-5 py-3.5 text-sm font-semibold"
        >
          Next <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- Teacher notes */

export interface TeacherNote {
  id: string;
  text: string;
  at: string;
}

export function TeacherSpeechNotes({
  notes,
  onChange,
  onClose,
}: {
  notes: TeacherNote[];
  onChange: (next: TeacherNote[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);

  const speak = () => {
    setListening(true);
    setTimeout(() => {
      setDraft(transcribeTeacherNote(notes.length));
      setListening(false);
    }, 1200);
  };

  return (
    <Sheet title="Teacher Notes" onClose={onClose}>
      <p className="text-sm text-muted-foreground">Tap the microphone and just say what you noticed. No typing needed.</p>
      <button
        onClick={speak}
        className={cn(
          "mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-5 text-base font-semibold",
          listening ? "bg-coral-deep text-primary-foreground" : "bg-tint-coral text-coral-deep",
        )}
      >
        <Mic className="size-5" /> {listening ? "Listening…" : "Speak your note"}
      </button>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        placeholder="Or type a short note…"
        className="mt-3 w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm outline-none"
      />
      <button
        className={cn(primaryBtn, "mt-2 w-full")}
        onClick={() => {
          if (!draft.trim()) {
            toast.warning("Say or type a note first");
            return;
          }
          onChange([{ id: `n-${Date.now()}`, text: draft.trim(), at: new Date().toISOString() }, ...notes]);
          setDraft("");
          toast.success("Note saved with this lecture");
        }}
      >
        Save note
      </button>
      <div className="mt-4 space-y-2">
        {notes.map((n) => (
          <div key={n.id} className="flex items-start justify-between gap-3 rounded-2xl bg-secondary p-3.5">
            <p className="text-sm">{n.text}</p>
            <button
              aria-label="Delete note"
              onClick={() => onChange(notes.filter((x) => x.id !== n.id))}
              className="grid size-8 shrink-0 place-items-center rounded-full bg-card"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------- Homework */

const HOMEWORK_KINDS: HomeworkKind[] = ["MCQ", "Fill in the blanks", "Short answer", "Picture-based", "Activity-based"];

export function HomeworkAssistant({ context, onClose }: { context: TeachingContext; onClose: () => void }) {
  const [kinds, setKinds] = useState<HomeworkKind[]>(["Fill in the blanks", "Picture-based"]);
  const [count, setCount] = useState(5);
  const [items, setItems] = useState<string[] | null>(null);

  return (
    <Sheet title="Create Homework" onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        Taken from this lesson: {context.className ?? "class"} · {context.subject ?? "subject"} · {context.topic ?? "topic"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {HOMEWORK_KINDS.map((k) => {
          const on = kinds.includes(k);
          return (
            <button
              key={k}
              onClick={() => setKinds((s) => (on ? s.filter((x) => x !== k) : [...s, k]))}
              className={cn("rounded-full px-3.5 py-2 text-xs font-medium", on ? "bg-ink text-ink-foreground" : "border border-border bg-card")}
            >
              {k}
            </button>
          );
        })}
      </div>
      <label className="mt-4 block text-xs font-medium text-muted-foreground">
        Questions — {count}
        <input type="range" min={3} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} className="mt-2 w-full" />
      </label>
      <button className={cn(primaryBtn, "mt-2 w-full")} onClick={() => setItems(generateHomework(context.topic ?? "", count, kinds))}>
        Generate homework
      </button>
      {items ? (
        <>
          <ol className="mt-4 space-y-2">
            {items.map((it, i) => (
              <li key={i} className="rounded-2xl bg-secondary p-3.5 text-sm">{i + 1}. {it}</li>
            ))}
          </ol>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className={primaryBtn} onClick={() => { toast.success("Homework assigned — parents will see it"); onClose(); }}>Assign</button>
            <button className={ghostBtn} onClick={() => toast.success("Saved to your resources")}>Save</button>
          </div>
        </>
      ) : null}
    </Sheet>
  );
}

/* --------------------------------------------------- Teaching Tools drawer */

export function TeachingToolsDrawer({
  context,
  notes,
  onNotesChange,
  trigger = "button",
}: {
  context: TeachingContext;
  notes: TeacherNote[];
  onNotesChange: (next: TeacherNote[]) => void;
  trigger?: "button" | "inline";
}) {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<ToolId | null>(null);

  const grid = (
    <div className="grid grid-cols-2 gap-3">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          onClick={() => {
            setTool(t.id);
            setOpen(false);
          }}
          className={cn("card-lift flex flex-col gap-2.5 rounded-2xl border p-4 text-left", t.tint)}
        >
          <span className={cn("grid size-10 place-items-center rounded-xl", t.icons)}>
            <t.icon className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">{t.label}</span>
            <span className="block text-xs text-muted-foreground">{t.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      {trigger === "button" ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-semibold"
        >
          <Sparkles className="mr-1.5 inline size-4 text-violet-deep" /> Teaching tools
        </button>
      ) : (
        grid
      )}

      {open ? <Sheet title="Teaching tools" onClose={() => setOpen(false)}>{grid}</Sheet> : null}

      {tool === "explain" ? <ExplainAgainPanel context={context} onClose={() => setTool(null)} /> : null}
      {tool === "local" ? <LocalExampleGenerator context={context} onClose={() => setTool(null)} /> : null}
      {tool === "story" ? <StoryGenerator context={context} onClose={() => setTool(null)} /> : null}
      {tool === "activity" ? <ActivityGenerator context={context} onClose={() => setTool(null)} /> : null}
      {tool === "blackboard" ? <BlackboardMode context={context} onClose={() => setTool(null)} /> : null}
      {tool === "notes" ? <TeacherSpeechNotes notes={notes} onChange={onNotesChange} onClose={() => setTool(null)} /> : null}
      {tool === "homework" ? <HomeworkAssistant context={context} onClose={() => setTool(null)} /> : null}
    </>
  );
}
