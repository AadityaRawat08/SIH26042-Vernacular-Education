import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { homePathFor, useAuth } from "@/lib/auth";
import { ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tribhashniya — AI teaching plans in every language" },
      {
        name: "description",
        content:
          "AI-powered teaching for every language, every classroom. Generate the full period plan, teacher script, mother-tongue support and assessment for primary classrooms.",
      },
      { property: "og:title", content: "Tribhashniya" },
      {
        property: "og:description",
        content: "AI-powered teaching for every language, every classroom.",
      },
    ],
  }),
  component: Splash,
});

const LOOP = [
  "Approved curriculum",
  "AI understanding",
  "Period planning",
  "Vernacular adaptation",
  "Live classroom",
  "Assessment",
  "Adaptive next lecture",
];

function Splash() {
  const { session, primaryRole } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1400);
    return () => clearTimeout(t);
  }, []);

  const continueTo = () => {
    if (!session) return navigate({ to: "/auth" });
    return navigate({ to: homePathFor(primaryRole) });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary font-display text-3xl font-semibold text-primary-foreground shadow-[var(--shadow-lift)]">
          V
        </div>
        <h1 className="mt-6 font-display text-4xl leading-tight font-semibold text-balance">
          Tribhashniya
        </h1>
        <p className="mt-3 text-[15px] text-muted-foreground text-pretty">
          AI-powered teaching for every language, every classroom.
        </p>

        <div className="mt-8 surface-card p-4 text-left">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.16em] text-primary-deep uppercase">
            <Sparkles className="size-3.5" /> The teaching loop
          </span>
          <ul className="mt-3 space-y-2">
            {LOOP.map((step, i) => (
              <li
                key={step}
                className="flex items-center gap-3 text-sm transition-opacity duration-500"
                style={{ opacity: ready ? 1 : 0.25, transitionDelay: `${i * 90}ms` }}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary font-mono text-[10px]">
                  {i + 1}
                </span>
                <span className="font-medium">{step}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={continueTo}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[15px] font-semibold text-ink-foreground transition-opacity hover:opacity-90"
        >
          Continue <ArrowRight className="size-4" />
        </button>
        <p className="mt-4 font-mono text-[11px] text-muted-foreground">
          Frontend prototype · AI, language and sync services are simulated
        </p>
        <Link to="/help" className="mt-2 inline-block text-xs text-muted-foreground underline">
          How this prototype works
        </Link>
      </div>
    </div>
  );
}
