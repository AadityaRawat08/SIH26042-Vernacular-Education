import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/ui-kit";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { listClassrooms } from "@/lib/classrooms.functions";
import { ArrowRight, Clock3, Plus, Users } from "lucide-react";

/** Consistent pastel identity per class card, always in the same order. */
const CLASS_SKINS = [
  { band: "bg-tint-sky", icon: "bg-info/15 text-info", title: "text-info" },
  { band: "bg-tint-mint", icon: "bg-success/15 text-success", title: "text-success" },
  { band: "bg-tint-lavender", icon: "bg-violet-deep/15 text-violet-deep", title: "text-violet-deep" },
  { band: "bg-tint-sand", icon: "bg-amber-deep/15 text-amber-deep", title: "text-amber-deep" },
  { band: "bg-tint-teal", icon: "bg-teal-deep/15 text-teal-deep", title: "text-teal-deep" },
  { band: "bg-tint-coral", icon: "bg-coral-deep/15 text-coral-deep", title: "text-coral-deep" },
] as const;


function lessonTime(iso: string | undefined) {
  if (!iso) return "Not scheduled";
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return sameDay ? time : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + " · " + time;
}

export const Route = createFileRoute("/teacher/classrooms/")({
  head: () => ({ meta: [
    { title: "My classrooms — Tribhashniya" },
    { name: "description", content: "Open a classroom and get to today's teaching in seconds." },
    { property: "og:title", content: "My classrooms — Tribhashniya" },
    { property: "og:description", content: "Every class and section, clearly separated and ready to teach." },
  ] }),
  component: ClassroomsPage,
});

function ClassroomsPage() {
  const { session, loading } = useAuth();
  const fetchClassrooms = useServerFn(listClassrooms);
  const { data, isLoading } = useQuery({
    queryKey: ["classrooms"],
    queryFn: () => fetchClassrooms(),
    enabled: Boolean(session),
  });
  const classrooms = data ?? [];
  const busy = loading || (Boolean(session) && isLoading);

  return (
    <AppLayout role="teacher">
      <PageHeader eyebrow="Tribhashniya" title="My Classrooms" subtitle="Choose a class to see today’s lesson." />

      {busy ? <p className="mt-8 text-sm text-muted-foreground">Loading your classes…</p> : null}

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {classrooms.map((c, index) => {
          const skin = CLASS_SKINS[index % CLASS_SKINS.length]!;
          return (
            <Link
              key={c.id}
              to="/teacher/classrooms/$classroomId"
              params={{ classroomId: c.id }}
              className="card-lift group relative flex min-h-80 flex-col overflow-hidden rounded-4xl border border-border bg-card shadow-[var(--shadow-card)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <div className={cn("p-6 pb-5", skin.band)}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow">Classroom {String(index + 1).padStart(2, "0")}</p>
                    <h2 className={cn("mt-4 font-display text-4xl leading-none font-semibold", skin.title)}>
                      {c.className}
                    </h2>
                    <p className="mt-2 text-lg font-semibold text-muted-foreground">Section {c.section}</p>
                  </div>
                  <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl", skin.icon)}>
                    <Users className="size-6" />
                  </span>
                </div>
                <p className="mt-5 flex items-center gap-2 text-sm font-semibold">
                  <Users className="size-4 text-muted-foreground" />
                  {c.studentCount} Students
                </p>
              </div>
              <div className="flex flex-1 flex-col p-6 pt-5">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Today's lesson</p>
                  <p className="mt-2 line-clamp-2 font-display text-xl font-semibold">
                    {c.nextLesson?.topic ?? c.currentTopic}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock3 className="size-4" />
                    {lessonTime(c.nextLesson?.scheduledAt)} · {c.nextLesson?.durationMin ?? 40} min
                  </p>
                </div>

                <div className="mt-auto flex min-h-13 items-center justify-between rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
                  <span>Open classroom</span>
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })}

        <Link
          to="/teacher/classrooms/new"
          className="group grid min-h-80 place-items-center rounded-4xl border-2 border-dashed border-border bg-secondary/35 p-6 text-center transition hover:border-primary hover:bg-primary/8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <div>
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-card)] transition-transform group-hover:scale-105"><Plus className="size-7" /></span>
            <h2 className="mt-5 font-display text-2xl font-semibold">Add Classroom</h2>
            <p className="mt-2 text-sm text-muted-foreground">Set up a class in six simple steps.</p>
          </div>
        </Link>
      </div>
    </AppLayout>
  );
}
