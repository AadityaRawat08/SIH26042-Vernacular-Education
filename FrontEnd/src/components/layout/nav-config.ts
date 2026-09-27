import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Cloud,
  GraduationCap,
  Home,
  Languages,
  LayoutGrid,
  LifeBuoy,
  type LucideIcon,
  MessageSquareHeart,
  MoreHorizontal,
  Radio,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import type { LinkProps } from "@tanstack/react-router";
import type { Role } from "@/lib/types";

export interface NavItem {
  to: NonNullable<LinkProps["to"]>;
  label: string;
  icon: LucideIcon;
}

/** Primary teacher navigation: Home, Classes, Prepare, Teach, Progress, More. */
export const teacherSidebar: NavItem[] = [
  { to: "/teacher", label: "Home", icon: Home },
  { to: "/teacher/classrooms", label: "Classes", icon: LayoutGrid },
  { to: "/teacher/planner", label: "Prepare", icon: Sparkles },
  { to: "/teacher/live", label: "Teach", icon: Radio },
  { to: "/teacher/translate", label: "Translate", icon: Languages },
  { to: "/teacher/progress", label: "Progress", icon: BarChart3 },
  { to: "/teacher/more", label: "More", icon: MoreHorizontal },
];

export const teacherBottom: NavItem[] = [
  { to: "/teacher", label: "Home", icon: Home },
  { to: "/teacher/classrooms", label: "Classes", icon: LayoutGrid },
  { to: "/teacher/planner", label: "Prepare", icon: Sparkles },
  { to: "/teacher/live", label: "Teach", icon: Radio },
  { to: "/teacher/progress", label: "Progress", icon: BarChart3 },
  { to: "/teacher/more", label: "More", icon: MoreHorizontal },
];

export const instituteSidebar: NavItem[] = [
  { to: "/institute", label: "Dashboard", icon: Building2 },
  { to: "/institute/teachers", label: "Teachers", icon: Users },
  { to: "/institute/students", label: "Students", icon: GraduationCap },
  { to: "/institute/classes", label: "Classes", icon: LayoutGrid },
  { to: "/institute/curriculum", label: "Curriculum", icon: BookOpen },
  { to: "/institute/assessments", label: "Assessments", icon: ClipboardCheck },
  { to: "/institute/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/institute/reports", label: "Reports", icon: CalendarClock },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const instituteBottom: NavItem[] = [
  { to: "/institute", label: "Home", icon: Building2 },
  { to: "/institute/teachers", label: "Teachers", icon: Users },
  { to: "/institute/students", label: "Students", icon: GraduationCap },
  { to: "/institute/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const parentSidebar: NavItem[] = [
  { to: "/parent", label: "Home", icon: Home },
  { to: "/parent/child", label: "Child", icon: GraduationCap },
  { to: "/parent/lessons", label: "Lessons", icon: BookOpen },
  { to: "/parent/progress", label: "Progress", icon: BarChart3 },
  { to: "/parent/homework", label: "Homework", icon: ClipboardCheck },
  { to: "/parent/feedback", label: "Feedback", icon: MessageSquareHeart },
  { to: "/parent/learn", label: "Learning area", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const parentBottom: NavItem[] = [
  { to: "/parent", label: "Home", icon: Home },
  { to: "/parent/lessons", label: "Lessons", icon: BookOpen },
  { to: "/parent/learn", label: "Learn", icon: Sparkles },
  { to: "/parent/progress", label: "Progress", icon: BarChart3 },
  { to: "/parent/feedback", label: "Feedback", icon: MessageSquareHeart },
];

export function navForRole(role: Role) {
  if (role === "institute") return { sidebar: instituteSidebar, bottom: instituteBottom };
  if (role === "parent") return { sidebar: parentSidebar, bottom: parentBottom };
  return { sidebar: teacherSidebar, bottom: teacherBottom };
}
