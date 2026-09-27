import { createFileRoute, redirect } from "@tanstack/react-router";

/** The old prototype OTP screen now points at the real sign-in page. */
export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    throw redirect({ to: "/auth", replace: true });
  },
  component: () => null,
});
