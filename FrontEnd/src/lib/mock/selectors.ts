import { assessments, previousLectures, students, upcomingLectures } from "./data";
import type { Classroom } from "../types";

export const studentsOf = (classroomId: string) => students.filter((s) => s.classroomId === classroomId);
export const previousOf = (classroomId: string) => previousLectures.filter((l) => l.classroomId === classroomId);
export const upcomingOf = (classroomId: string) => upcomingLectures.filter((l) => l.classroomId === classroomId);
export const assessmentsOf = (classroomId: string) => assessments.filter((a) => a.classroomId === classroomId);
export const studentById = (id: string) => students.find((s) => s.id === id);

export const classroomLabel = (c: Classroom) => `${c.className} · Section ${c.section}`;

export const needAttention = (classroomId: string) =>
  studentsOf(classroomId).filter((s) => s.understanding < 55);

export const subjectAverages = [
  { subject: "Mathematics", score: 82 },
  { subject: "EVS", score: 74 },
  { subject: "Language", score: 88 },
];

export const topicPerformance = [
  { topic: "Counting", score: 89 },
  { topic: "Addition", score: 76 },
  { topic: "Subtraction", score: 54 },
  { topic: "Shapes", score: 81 },
  { topic: "Measurement", score: 68 },
];

export const trend = [
  { label: "Week 1", score: 61 },
  { label: "Week 2", score: 66 },
  { label: "Week 3", score: 64 },
  { label: "Week 4", score: 72 },
  { label: "Week 5", score: 76 },
];
