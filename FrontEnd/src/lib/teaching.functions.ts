// src/lib/teaching.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Teaching data access (Phase 2b): teacher home, class progress and one student.
 * Everything runs through the signed-in teacher's own session.
 */

export interface TeacherHomeLecture {
  id: string;
  classroomId: string;
  topic: string;
  scheduledAt: string;
  durationMin: number;
  status: string;
  understanding: number | null;
  aiSummary: string | null;
  classLabel: string;
  subject: string;
}

export const getTeacherHome = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileRes, roomRes, recRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      supabase
        .from("classrooms")
        .select("id, class_name, section, subject, student_count, understanding")
        .eq("teacher_id", userId)
        .order("class_name")
        .order("section"),
      supabase
        .from("ai_recommendations")
        .select("title, body, action_label")
        .eq("teacher_id", userId)
        .in("status", ["open", "new"])
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    if (profileRes.error) throw profileRes.error;
    if (roomRes.error) throw roomRes.error;
    if (recRes.error) throw recRes.error;

    const classrooms = (roomRes.data ?? []).map((r) => ({
      id: r.id,
      className: r.class_name,
      section: r.section,
      subject: r.subject,
      studentCount: r.student_count,
      understanding: r.understanding,
    }));
    const ids = classrooms.map((c) => c.id);

    let lectures: TeacherHomeLecture[] = [];
    let attention = 0;
    let subjectAverages: Array<{ subject: string; score: number }> = [];

    if (ids.length) {
      const [lecRes, studentRes] = await Promise.all([
        supabase
          .from("lecture_sessions")
          .select("id, classroom_id, topic, scheduled_at, duration_min, status, understanding, ai_summary")
          .in("classroom_id", ids)
          .order("scheduled_at"),
        supabase.from("students").select("id, classroom_id, understanding").in("classroom_id", ids),
      ]);
      if (lecRes.error) throw lecRes.error;
      if (studentRes.error) throw studentRes.error;

      lectures = (lecRes.data ?? []).map((l) => {
        const room = classrooms.find((c) => c.id === l.classroom_id);
        return {
          id: l.id,
          classroomId: l.classroom_id,
          topic: l.topic,
          scheduledAt: l.scheduled_at,
          durationMin: l.duration_min,
          status: l.status,
          understanding: l.understanding,
          aiSummary: l.ai_summary,
          classLabel: room ? `${room.className} ${room.section}` : "Class",
          subject: room?.subject ?? "",
        };
      });

      attention = (studentRes.data ?? []).filter((s) => (s.understanding ?? 0) < 60).length;

      const bySubject = new Map<string, number[]>();
      for (const room of classrooms) {
        const list = bySubject.get(room.subject) ?? [];
        list.push(room.understanding ?? 0);
        bySubject.set(room.subject, list);
      }
      subjectAverages = [...bySubject.entries()].map(([subject, values]) => ({
        subject,
        score: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      }));
    }

    const today = new Date().toDateString();
    const todays = lectures.filter((l) => new Date(l.scheduledAt).toDateString() === today);
    const upcoming = lectures.filter((l) => l.status !== "completed");
    const previous = lectures.filter((l) => l.status === "completed").reverse();

    return {
      teacherName: profileRes.data?.full_name ?? "Teacher",
      classrooms,
      todays,
      upcomingCount: upcoming.length,
      completedCount: previous.length,
      attentionCount: attention,
      subjectAverages,
      previous: previous.slice(0, 4),
      recommendation: recRes.data?.[0] ?? null,
      nextLesson: upcoming[0] ?? null,
    };
  });

export const getClassProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classroomId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const studentRes = await supabase
      .from("students")
      .select("id, full_name, roll, understanding, weak_area, mother_tongue")
      .eq("classroom_id", data.classroomId)
      .order("roll");
    if (studentRes.error) throw studentRes.error;

    const students = (studentRes.data ?? []).map((s) => ({
      id: s.id,
      name: s.full_name,
      roll: s.roll,
      understanding: s.understanding ?? 0,
      weakArea: s.weak_area,
      motherTongue: s.mother_tongue,
    }));

    let topics: Array<{ topic: string; score: number }> = [];
    let languageSupport = 0;
    if (students.length) {
      const progRes = await supabase
        .from("student_progress")
        .select("topic, mastery, language_support_need, student_id")
        .in(
          "student_id",
          students.map((s) => s.id),
        );
      if (progRes.error) throw progRes.error;
      const rows = progRes.data ?? [];
      const byTopic = new Map<string, number[]>();
      for (const row of rows) {
        const list = byTopic.get(row.topic) ?? [];
        list.push(row.mastery ?? 0);
        byTopic.set(row.topic, list);
      }
      topics = [...byTopic.entries()].map(([topic, values]) => ({
        topic,
        score: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      }));
      languageSupport = new Set(rows.filter((r) => r.language_support_need).map((r) => r.student_id)).size;
    }

    const average = students.length
      ? Math.round(students.reduce((sum, s) => sum + s.understanding, 0) / students.length)
      : 0;

    return { students, topics, languageSupport, average };
  });

export const getStudentDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { studentId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const studentRes = await supabase
      .from("students")
      .select("id, full_name, roll, understanding, weak_area, mother_tongue, notes, classroom_id")
      .eq("id", data.studentId)
      .maybeSingle();
    if (studentRes.error) throw studentRes.error;
    if (!studentRes.data) return null;
    const s = studentRes.data;

    const [roomRes, progRes, subRes, gapRes] = await Promise.all([
      supabase.from("classrooms").select("class_name, section, subject").eq("id", s.classroom_id ?? "").maybeSingle(),
      supabase.from("student_progress").select("topic, mastery, attendance, participation, language_support_need, observations").eq("student_id", s.id),
      supabase
        .from("assessment_submissions")
        .select("score, max_score, submitted_at, assessments(title, scheduled_date)")
        .eq("student_id", s.id)
        .order("submitted_at"),
      supabase.from("learning_gaps").select("topic, kind, detail").eq("student_id", s.id),
    ]);
    if (roomRes.error) throw roomRes.error;
    if (progRes.error) throw progRes.error;
    if (subRes.error) throw subRes.error;
    if (gapRes.error) throw gapRes.error;

    const history = (subRes.data ?? []).map((row) => {
      const assessment = row.assessments as unknown as { title: string; scheduled_date: string } | null;
      return {
        label: assessment?.scheduled_date ?? String(row.submitted_at).slice(0, 10),
        title: assessment?.title ?? "Assessment",
        score: Math.round((Number(row.score) / Number(row.max_score)) * 100),
      };
    });

    const progress = progRes.data ?? [];
    const attendance = progress.length
      ? Math.round(progress.reduce((sum, p) => sum + (p.attendance ?? 0), 0) / progress.length)
      : 0;

    return {
      student: {
        id: s.id,
        name: s.full_name,
        roll: s.roll,
        understanding: s.understanding ?? 0,
        weakArea: s.weak_area,
        motherTongue: s.mother_tongue,
        notes: s.notes,
      },
      classroom: roomRes.data
        ? { className: roomRes.data.class_name, section: roomRes.data.section, subject: roomRes.data.subject }
        : null,
      topics: progress.map((p) => ({ topic: p.topic, score: p.mastery ?? 0 })),
      observations: progress.map((p) => p.observations).filter(Boolean) as string[],
      languageSupportNeeded: progress.some((p) => p.language_support_need),
      attendance,
      history,
      gaps: (gapRes.data ?? []).map((g) => ({ topic: g.topic, kind: String(g.kind), detail: g.detail })),
      lastAssessment: history.length ? history[history.length - 1]!.score : 0,
    };
  });
