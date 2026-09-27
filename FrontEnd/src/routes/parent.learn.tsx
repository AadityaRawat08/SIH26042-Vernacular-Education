import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, Pill, Surface } from "@/components/common/ui-kit";
import { BookOpen, Headphones, Play } from "lucide-react";

export const Route = createFileRoute("/parent/learn")({
  head: () => ({ meta: [
    { title: "Learning area — Tribhashniya" },
    { name: "description", content: "Friendly bilingual activities for children to practise at home." },
    { property: "og:title", content: "Learning area — Tribhashniya" },
    { property: "og:description", content: "Bilingual practice activities for home learning." },
  ] }),
  component: LearnPage,
});

function LearnPage() {
  const items = [{ title: "Count with mangoes", type: "Activity", icon: Play }, { title: "Water around us", type: "Story", icon: BookOpen }, { title: "Santhali number words", type: "Audio", icon: Headphones }];
  return <AppLayout role="parent"><PageHeader title="Learning area" subtitle="Short activities to practise together." /><div className="mt-5 grid gap-3 sm:grid-cols-2">{items.map(({ title, type, icon: Icon }) => <Surface key={title} className="min-h-36"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary-deep"><Icon className="size-5" /></span><p className="mt-4 font-display text-lg font-semibold">{title}</p><Pill tone="primary">{type}</Pill></Surface>)}</div></AppLayout>;
}