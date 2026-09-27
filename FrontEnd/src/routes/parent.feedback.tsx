import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader, Surface } from "@/components/common/ui-kit";
import { toast } from "sonner";

export const Route = createFileRoute("/parent/feedback")({
  head: () => ({ meta: [
    { title: "Teacher feedback — Tribhashniya" },
    { name: "description", content: "Share a message with your child's teacher." },
    { property: "og:title", content: "Teacher feedback — Tribhashniya" },
    { property: "og:description", content: "A simple parent and teacher feedback channel." },
  ] }),
  component: FeedbackPage,
});

function FeedbackPage() {
  const [message, setMessage] = useState("");
  return <AppLayout role="parent"><PageHeader title="Message teacher" subtitle="Ask a question or share how learning is going at home." /><Surface className="mt-5"><textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-32 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none" placeholder="Write your message…" /><button onClick={() => { if (!message.trim()) return; setMessage(""); toast.success("Message sent (simulated)"); }} className="mt-3 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground">Send message</button></Surface></AppLayout>;
}