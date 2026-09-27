import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, Pill, SectionTitle, Surface } from "@/components/common/ui-kit";
import { useApp } from "@/lib/app-state";
import { curriculum } from "@/lib/mock/data";
import { languageLabel } from "@/lib/services/ai";
import { toast } from "sonner";
import { Download, FileText, Upload } from "lucide-react";

export const Route = createFileRoute("/teacher/curriculum")({
  head: () => ({
    meta: [
      { title: "Curriculum — Tribhashniya" },
      { name: "description", content: "Uploaded textbooks, syllabus and chapter-wise coverage." },
      { property: "og:title", content: "Curriculum — Tribhashniya" },
      { property: "og:description", content: "Your curriculum, chapter by chapter, with AI coverage tracking." },
    ],
  }),
  component: CurriculumPage,
});

function CurriculumPage() {
  const { classrooms } = useApp();
  const [classroomId, setClassroomId] = useState(classrooms[0]?.id ?? "");
  const classroom = classrooms.find((c) => c.id === classroomId);
  const chapters = curriculum.filter(
    (c) => c.className === classroom?.className && c.subject === classroom?.subject,
  );
  const docs = chapters.flatMap((c) => c.documents.map((d) => ({ ...d, chapter: c.chapter })));

  return (
    <AppLayout role="teacher">
      <PageHeader
        title="Curriculum & syllabus"
        subtitle="What the AI plans from — textbooks, chapters and coverage."
        action={
          <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none">
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>{c.className} {c.section} · {c.subject}</option>
            ))}
          </select>
        }
      />

      <div className="mt-4 rounded-2xl bg-ink p-4 text-ink-foreground">
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-primary">Current chapter</p>
        <p className="mt-1 font-display text-2xl font-semibold">{chapters[0]?.chapter ?? "Not uploaded yet"}</p>
        <p className="mt-1 text-sm text-ink-foreground/70">Teaching now: {classroom?.currentTopic}</p>
      </div>

      <Surface className="mt-6">
        <SectionTitle>Uploaded material</SectionTitle>
        <div className="space-y-2.5">
          {docs.map((d) => (
            <div key={`${d.chapter}-${d.title}`} className="flex items-center gap-3 rounded-xl bg-secondary p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-card"><FileText className="size-4 text-primary-deep" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{d.kind} · {d.sizeMb} MB · {d.chapter}</p>
              </div>
              <Pill tone="success">Indexed</Pill>
            </div>
          ))}
          <button
            onClick={() => toast.info("File picker would open here — uploads are simulated in this prototype.")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3.5 text-sm font-medium text-muted-foreground"
          >
            <Upload className="size-4" /> Upload textbook, syllabus or notes
          </button>
        </div>
      </Surface>

      <Surface className="mt-6">
        <SectionTitle>Chapters & lessons</SectionTitle>
        <div className="space-y-3">
          {chapters.map((ch, i) => (
            <div key={ch.id} className="rounded-xl bg-secondary p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{ch.chapter}</p>
                <Pill tone={i === 0 ? "primary" : "muted"}>{i === 0 ? "Teaching now" : "Upcoming"}</Pill>
              </div>
              <div className="mt-2 space-y-1.5">
                {ch.lessons.map((l) => (
                  <p key={l.title} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{l.title}</span> — {l.topics.join(", ")}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => toast.success("Chapter PDFs downloaded (simulated)")} className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium">
          <Download className="size-3.5" /> Download chapter PDFs for offline
        </button>
      </Surface>

      <Surface className="mt-6">
        <SectionTitle>Language support</SectionTitle>
        <Pill tone="primary">{languageLabel(classroom?.language ?? "hi")}</Pill>
        <p className="mt-3 text-sm text-muted-foreground">
          Every chapter plan can be generated with explanations, vocabulary and scripts in this language.
        </p>
      </Surface>
    </AppLayout>
  );
}
