import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { languageLabel } from "@/lib/services/ai";
import type { LanguageCode } from "@/lib/types";
import {
  BOARD_TEMPLATES,
  generateBlackboard,
  makeElement,
  readabilityCheck,
  translateStep,
  voiceToElement,
  type BoardElement,
  type BoardSession,
  type BoardStep,
  type ElementType,
} from "@/lib/services/blackboard";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Circle,
  Copy,
  Eraser,
  Highlighter,
  ImagePlus,
  Languages,
  Maximize2,
  Mic,
  Minus,
  Pencil,
  Plus,
  Redo2,
  RotateCcw,
  Settings2,
  Square,
  Trash2,
  Type,
  Undo2,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type Tool = "none" | "pen" | "highlighter" | "eraser" | "line" | "arrow" | "circle" | "rect";

const QUICK_ADD: Array<{ type: ElementType; label: string; icon: typeof Type }> = [
  { type: "text", label: "Text", icon: Type },
  { type: "image", label: "Add image", icon: ImagePlus },
  { type: "question", label: "Add question", icon: Plus },
  { type: "equation", label: "Add example", icon: Plus },
];

function ElementView({ el, selected, onSelect }: { el: BoardElement; selected: boolean; onSelect: () => void }) {
  if (el.hidden) return null;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg px-3 py-2 text-left transition",
        selected && "ring-2 ring-board-accent",
        el.highlighted && "bg-board-accent/15",
      )}
    >
      {el.title ? <p className="font-mono text-[11px] text-board-muted uppercase">{el.title}</p> : null}
      {el.type === "equation" ? (
        <p className="chalk font-mono text-3xl leading-snug font-semibold text-board-foreground sm:text-4xl">{el.lines.join("  ")}</p>
      ) : el.type === "question" ? (
        <p className="chalk text-2xl leading-snug font-semibold text-board-accent sm:text-3xl">{el.lines.map((line) => `? ${line}`).join(" ")}</p>
      ) : el.type === "steps" || el.type === "activity" || el.type === "diagram" ? (
        <ol className="space-y-1.5 text-board-foreground">
          {el.lines.map((line, index) => (
            <li key={`${line}-${index}`} className="flex gap-2 text-xl leading-snug sm:text-2xl">
              <span className="font-mono text-board-muted">{index + 1}.</span>
              <span className="chalk">{line}</span>
            </li>
          ))}
        </ol>
      ) : el.type === "vocabulary" || el.type === "table" ? (
        <table className="w-full text-board-foreground">
          <tbody>
            {(el.rows ?? []).map((row, index) => (
              <tr key={index} className="border-b border-board-foreground/10 last:border-0">
                <td className="chalk py-1.5 pr-4 text-xl sm:text-2xl">{row[0]}</td>
                <td className="chalk py-1.5 text-xl text-board-muted sm:text-2xl">{row[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : el.type === "image" ? (
        <div className="rounded-lg border border-dashed border-board-foreground/30 p-6 text-center text-lg text-board-foreground">{el.lines.join(" ") || "Teaching picture"}</div>
      ) : el.type === "summary" ? (
        <p className="chalk rounded-lg border-l-4 border-board-muted pl-3 text-xl leading-snug text-board-foreground sm:text-2xl">{el.lines.join(" ")}</p>
      ) : (
        <p className="chalk text-2xl leading-snug font-medium text-board-foreground sm:text-3xl">{el.lines.join(" ")}</p>
      )}
      {el.translated ? (
        <p className="mt-1.5 rounded-lg bg-board-foreground/10 px-2.5 py-1.5 text-lg leading-snug text-board-muted">
          {el.translated.lines.join(" ")}
          <span className="ml-2 font-mono text-[10px] uppercase opacity-70">{languageLabel(el.translated.language)}</span>
        </p>
      ) : null}
    </button>
  );
}

function ToolsSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 sm:items-center sm:p-4" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section className="flex max-h-[90svh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card sm:rounded-2xl">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="eyebrow">Blackboard</p>
            <h2 className="truncate text-lg font-semibold">Blackboard Tools</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full border border-border" aria-label="Close blackboard tools"><X className="size-4" /></button>
        </header>
        <div className="overflow-y-auto p-4">{children}</div>
      </section>
    </div>
  );
}

export function LiveBlackboard({
  session,
  onSessionChange,
  stepIndex,
  onStepChange,
  onAnnotationsChange,
  toolsOpen = false,
  onToolsOpenChange,
  className,
}: {
  session: BoardSession;
  onSessionChange: (session: BoardSession) => void;
  stepIndex: number;
  onStepChange: (index: number) => void;
  onAnnotationsChange?: (count: number) => void;
  toolsOpen?: boolean;
  onToolsOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const step: BoardStep = session.steps[Math.min(stepIndex, session.steps.length - 1)]!;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("none");
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [transLang, setTransLang] = useState<LanguageCode>("sat");
  const [check, setCheck] = useState<string[] | null>(null);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [annotations, setAnnotations] = useState(0);
  const [undoStack, setUndoStack] = useState<BoardSession[]>([]);
  const [redoStack, setRedoStack] = useState<BoardSession[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selected = useMemo(() => step.elements.find((element) => element.id === selectedId) ?? null, [step, selectedId]);

  useEffect(() => setSelectedId(null), [stepIndex]);
  useEffect(() => onAnnotationsChange?.(annotations), [annotations, onAnnotationsChange]);

  const commit = (next: BoardSession) => {
    setUndoStack((stack) => [...stack.slice(-19), session]);
    setRedoStack([]);
    onSessionChange(next);
  };
  const updateStep = (patch: (current: BoardStep) => BoardStep) => commit({ ...session, steps: session.steps.map((item, index) => (index === stepIndex ? patch(item) : item)) });
  const patchElement = (id: string, patch: Partial<BoardElement>) => updateStep((current) => ({ ...current, elements: current.elements.map((element) => (element.id === id ? { ...element, ...patch } : element)) }));
  const addElement = (element: BoardElement) => {
    updateStep((current) => ({ ...current, elements: [...current.elements, element] }));
    setSelectedId(element.id);
    toast.success("Added to the blackboard");
  };

  const next = () => {
    if (stepIndex >= session.steps.length - 1) {
      toast.info("This is the final board step.");
      return;
    }
    onStepChange(stepIndex + 1);
  };
  const previous = () => onStepChange(Math.max(0, stepIndex - 1));

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "none") return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const startX = (event.clientX - rect.left) * scaleX;
    const startY = (event.clientY - rect.top) * scaleY;
    context.lineCap = "round";
    context.strokeStyle = tool === "highlighter" ? "rgba(255,212,121,0.45)" : "#f4f1e6";
    context.lineWidth = tool === "highlighter" ? 22 : tool === "eraser" ? 34 : 3;
    context.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    context.beginPath();
    context.moveTo(startX, startY);
    const move = (moveEvent: PointerEvent) => {
      context.lineTo((moveEvent.clientX - rect.left) * scaleX, (moveEvent.clientY - rect.top) * scaleY);
      context.stroke();
    };
    const finish = (upEvent: PointerEvent) => {
      if (["line", "arrow", "circle", "rect"].includes(tool)) {
        const endX = (upEvent.clientX - rect.left) * scaleX;
        const endY = (upEvent.clientY - rect.top) * scaleY;
        context.beginPath();
        if (tool === "circle") {
          context.arc(startX, startY, Math.hypot(endX - startX, endY - startY), 0, Math.PI * 2);
        } else if (tool === "rect") {
          context.strokeRect(startX, startY, endX - startX, endY - startY);
        } else {
          context.moveTo(startX, startY);
          context.lineTo(endX, endY);
        }
        context.stroke();
      }
      context.globalCompositeOperation = "source-over";
      setAnnotations((count) => count + 1);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
    };
    if (["pen", "highlighter", "eraser"].includes(tool)) window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
  };

  const clearAnnotations = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    toast.info("Board marks cleared");
  };

  const boardSurface = (
    <div className={cn("flex min-h-0 flex-1 flex-col", fullscreen && "h-svh")}>
      <div className="relative min-h-[52svh] flex-1 overflow-hidden rounded-lg border-[8px] border-board-frame bg-board shadow-[inset_0_0_80px_color-mix(in_oklab,var(--color-ink)_55%,transparent)] sm:min-h-[58svh] lg:min-h-[64svh]">
        <header className="absolute inset-x-0 top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 bg-ink/35 px-3 py-2.5">
          <p className="min-w-0 truncate font-mono text-[11px] text-board-muted uppercase">Step {step.stepNumber} of {session.steps.length} · {step.title}</p>
          <button type="button" onClick={() => setFullscreen((value) => !value)} className="grid size-9 shrink-0 place-items-center rounded-full bg-board-foreground/10 text-board-foreground" aria-label="Show blackboard fullscreen"><Maximize2 className="size-4" /></button>
        </header>
        <div className="h-full overflow-auto px-3 pt-14 pb-5 sm:px-6" style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${100 / zoom}%` }}>
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              {(["top", "center", "bottom"] as const).flatMap((area) => step.elements.filter((element) => element.area === area).map((element) => <ElementView key={element.id} el={element} selected={selectedId === element.id} onSelect={() => setSelectedId(element.id)} />))}
            </div>
            <div className="space-y-3 lg:w-56 lg:border-l lg:border-board-foreground/15 lg:pl-3">
              {step.elements.filter((element) => element.area === "side").map((element) => <ElementView key={element.id} el={element} selected={selectedId === element.id} onSelect={() => setSelectedId(element.id)} />)}
            </div>
          </div>
        </div>
        <canvas ref={canvasRef} width={1200} height={800} onPointerDown={draw} className={cn("absolute inset-0 size-full touch-none", tool === "none" ? "pointer-events-none" : "cursor-crosshair")} />
      </div>

      {selected ? (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          <button type="button" onClick={() => patchElement(selected.id, { translated: translateStep({ ...step, elements: [selected] }, transLang).elements[0]?.translated ?? null })} className="shrink-0 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold"><Languages className="mr-1 inline size-3.5" /> Translate</button>
          <button type="button" onClick={() => toast.success(`Reading aloud: ${selected.lines.join(" ")}`)} className="shrink-0 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold"><Volume2 className="mr-1 inline size-3.5" /> Play</button>
          <button type="button" onClick={() => { void navigator.clipboard.writeText(selected.lines.join(" ")); toast.success("Copied"); }} className="shrink-0 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold"><Copy className="mr-1 inline size-3.5" /> Copy</button>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <button type="button" onClick={previous} className="inline-flex h-12 items-center gap-1 rounded-lg border border-border bg-card px-3 text-sm font-semibold"><ArrowLeft className="size-4" /> <span className="hidden sm:inline">Previous</span></button>
        <p className="min-w-0 text-center text-sm font-semibold">Step {step.stepNumber} of {session.steps.length}</p>
        <button type="button" onClick={next} className="inline-flex h-12 items-center justify-center gap-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><span>Next</span><ArrowRight className="size-4" /></button>
      </div>
    </div>
  );

  if (fullscreen) return <div className="fixed inset-0 z-50 flex flex-col bg-background p-2 sm:p-4">{boardSurface}<button type="button" onClick={() => setFullscreen(false)} className="mt-2 rounded-lg bg-card py-3 text-sm font-semibold">Exit fullscreen</button></div>;

  const tools: Array<[Tool, string, typeof Pencil]> = [
    ["pen", "Pen", Pencil], ["highlighter", "Highlighter", Highlighter], ["eraser", "Eraser", Eraser], ["arrow", "Arrow", ArrowRight], ["line", "Line", Minus], ["circle", "Circle", Circle], ["rect", "Rectangle", Square],
  ];

  return (
    <section className={cn("flex flex-col", className)}>
      {boardSurface}
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-tint-mint px-3 py-2.5">
        <div className="min-w-0"><p className="text-[11px] font-semibold text-muted-foreground uppercase">Teach now</p><p className="truncate text-sm">{step.teacherInstruction}</p></div>
        <button type="button" onClick={() => onToolsOpenChange?.(true)} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold"><Settings2 className="size-4" /> Tools</button>
      </div>

      {toolsOpen ? (
        <ToolsSheet onClose={() => onToolsOpenChange?.(false)}>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {tools.map(([value, label, Icon]) => <button key={value} type="button" onClick={() => setTool(value)} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border text-[11px] font-medium", tool === value ? "border-primary bg-secondary text-primary" : "border-border bg-card")}><Icon className="size-4" />{label}</button>)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {QUICK_ADD.map(({ type, label, icon: Icon }) => <button key={type} type="button" onClick={() => addElement(makeElement(type, [`${label} — tap Edit to change`], { area: type === "question" ? "bottom" : "center", source: "teacher" }))} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 text-xs font-semibold"><Icon className="size-4" />{label}</button>)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button type="button" disabled={!undoStack.length} onClick={() => { const previousSession = undoStack.at(-1); if (!previousSession) return; setRedoStack((stack) => [...stack, session]); setUndoStack((stack) => stack.slice(0, -1)); onSessionChange(previousSession); }} className="rounded-lg border border-border py-2.5 text-xs font-semibold disabled:opacity-40"><Undo2 className="mr-1 inline size-4" />Undo</button>
            <button type="button" disabled={!redoStack.length} onClick={() => { const nextSession = redoStack.at(-1); if (!nextSession) return; setUndoStack((stack) => [...stack, session]); setRedoStack((stack) => stack.slice(0, -1)); onSessionChange(nextSession); }} className="rounded-lg border border-border py-2.5 text-xs font-semibold disabled:opacity-40"><Redo2 className="mr-1 inline size-4" />Redo</button>
            <button type="button" onClick={clearAnnotations} className="rounded-lg border border-border py-2.5 text-xs font-semibold"><Trash2 className="mr-1 inline size-4" />Clear marks</button>
            <button type="button" onClick={() => { if (!selected) { toast.info("Tap board content first."); return; } setEditText(selected.lines.join("\n")); setEditing(true); }} className="rounded-lg border border-border py-2.5 text-xs font-semibold"><Pencil className="mr-1 inline size-4" />Edit selected</button>
          </div>
          <div className="mt-3 rounded-lg bg-secondary p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><p className="text-sm font-semibold">Board language</p><div className="flex gap-1">{(["hi", "en", "sat"] as const).map((language) => <button key={language} type="button" onClick={() => setTransLang(language)} className={cn("rounded-full px-2.5 py-1 text-xs", transLang === language ? "bg-ink text-ink-foreground" : "bg-card")}>{languageLabel(language)}</button>)}</div></div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => updateStep((current) => translateStep(current, transLang))} className="rounded-lg bg-card py-2.5 text-xs font-semibold">Translate board</button>
              <button type="button" onClick={() => updateStep((current) => ({ ...current, elements: current.elements.map((element) => ({ ...element, translated: null })) }))} className="rounded-lg bg-card py-2.5 text-xs font-semibold">Show original</button>
              <button type="button" onClick={() => { addElement(voiceToElement(voiceIndex)); setVoiceIndex((index) => index + 1); }} className="rounded-lg bg-card py-2.5 text-xs font-semibold"><Mic className="mr-1 inline size-4" />Add by voice</button>
              <button type="button" onClick={() => { const issues = readabilityCheck(session); setCheck(issues.map((issue) => issue.message)); }} className="rounded-lg bg-card py-2.5 text-xs font-semibold">Check readability</button>
            </div>
            {check ? <p className="mt-2 rounded-lg bg-card p-2.5 text-xs">{check.length ? check.join(" ") : <><Check className="mr-1 inline size-4 text-success" />Readable from the back row.</>}</p> : null}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <select value={session.templateId} onChange={(event) => { onSessionChange(generateBlackboard({ className: session.className, section: session.section, subject: session.subject, topic: session.topic, templateId: event.target.value })); onStepChange(0); }} className="min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-sm">{BOARD_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}</select>
            <button type="button" onClick={() => { onStepChange(0); clearAnnotations(); }} className="rounded-lg border border-border px-3 py-2.5 text-xs font-semibold"><RotateCcw className="mr-1 inline size-4" />Replay</button>
            <div className="flex items-center gap-1 rounded-lg border border-border px-2"><button type="button" onClick={() => setZoom((value) => Math.max(0.8, value - 0.1))} aria-label="Zoom out"><ZoomOut className="size-4" /></button><span className="w-10 text-center text-xs">{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(1.4, value + 0.1))} aria-label="Zoom in"><ZoomIn className="size-4" /></button></div>
          </div>
        </ToolsSheet>
      ) : null}

      {editing && selected ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-card p-4 sm:rounded-2xl">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center"><h3 className="text-lg font-semibold">Edit board text</h3><button type="button" onClick={() => setEditing(false)} aria-label="Close editor"><X className="size-5" /></button></div>
            <textarea value={editText} onChange={(event) => setEditText(event.target.value)} rows={5} className="mt-3 w-full rounded-lg border border-border bg-background p-3 text-sm" />
            <button type="button" onClick={() => { patchElement(selected.id, { lines: editText.split("\n").filter(Boolean), source: "teacher" }); setEditing(false); }} className="mt-2 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground">Save changes</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
