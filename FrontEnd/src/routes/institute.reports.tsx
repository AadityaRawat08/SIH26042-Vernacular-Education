import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, Pill, Surface } from "@/components/common/ui-kit";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";

export const Route = createFileRoute("/institute/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Tribhashniya" },
      { name: "description", content: "Downloadable monthly and term reports for the school." },
      { property: "og:title", content: "Reports — Tribhashniya" },
      { property: "og:description", content: "Reports ready for the block office." },
    ],
  }),
  component: ReportsPage,
});

const REPORTS = [
  { id: "rep-1", title: "March 2026 — Monthly learning report", meta: "All classes · PDF · 12 pages", status: "Ready" },
  { id: "rep-2", title: "Term 2 — Syllabus coverage report", meta: "Per class and subject · PDF", status: "Ready" },
  { id: "rep-3", title: "Assessment summary — February 2026", meta: "Scores and participation · PDF", status: "Ready" },
  { id: "rep-4", title: "Language-support impact note", meta: "Mother-tongue vs standard sections · PDF", status: "Generating" },
];

function ReportsPage() {
  return (
    <AppLayout role="institute">
      <PageHeader title="Reports" subtitle="Generated automatically from classroom activity — ready to share." />
      <div className="mt-5 space-y-3">
        {REPORTS.map((r) => (
          <Surface key={r.id} className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary"><FileText className="size-4 text-primary-deep" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.meta}</p>
            </div>
            <Pill tone={r.status === "Ready" ? "success" : "warning"}>{r.status}</Pill>
            <button
              onClick={() => toast.success(r.status === "Ready" ? "Download started (simulated)" : "Still generating — try soon")}
              className="grid size-9 place-items-center rounded-full bg-secondary"
              aria-label={`Download ${r.title}`}
            >
              <Download className="size-4" />
            </button>
          </Surface>
        ))}
      </div>
    </AppLayout>
  );
}
