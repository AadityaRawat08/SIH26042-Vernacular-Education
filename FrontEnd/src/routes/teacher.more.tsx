import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/ui-kit";
import {
  Bell,
  BookOpen,
  Cloud,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Languages,
  LifeBuoy,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { LinkProps } from "@tanstack/react-router";

export const Route = createFileRoute("/teacher/more")({
  head: () => ({
    meta: [
      { title: "More tools — Tribhashniya" },
      { name: "description", content: "Assessments, worksheets, resources, offline downloads, language library, notifications, settings and help." },
      { property: "og:title", content: "More tools — Tribhashniya" },
      { property: "og:description", content: "Everything else you need, one tap away." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MorePage,
});

const ITEMS: { to: NonNullable<LinkProps["to"]>; label: string; hint: string; icon: LucideIcon }[] = [
  { to: "/teacher/blackboard", label: "Blackboard", hint: "Replay and reuse saved boards", icon: BookOpen },
  { to: "/teacher/assessments", label: "Assessments", hint: "Create and check tests", icon: ClipboardCheck },
  { to: "/teacher/worksheets", label: "Worksheets", hint: "Printable practice", icon: FileText },
  { to: "/teacher/curriculum", label: "Syllabus", hint: "Chapters and topics", icon: BookOpen },
  { to: "/teacher/resources", label: "Resources", hint: "Audio, video, activities", icon: GraduationCap },
  { to: "/teacher/offline", label: "Offline content", hint: "Downloads and sync", icon: Cloud },
  { to: "/teacher/language", label: "Language library", hint: "Words you verified", icon: Languages },
  { to: "/notifications", label: "Notifications", hint: "Class reminders", icon: Bell },
  { to: "/settings", label: "Settings", hint: "Languages and account", icon: Settings },
  { to: "/help", label: "Help", hint: "How to use Tribhashniya", icon: LifeBuoy },
];

function MorePage() {
  return (
    <AppLayout role="teacher">
      <PageHeader title="More" subtitle="Everything else, in one place." />
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <Link key={item.label} to={item.to} className="surface-card flex items-center gap-3 p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary">
              <item.icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold">{item.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
