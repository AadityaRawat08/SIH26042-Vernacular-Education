import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Classroom data access (Phase 2).
 *
 * All reads/writes go through the signed-in teacher's own session, so row-level
 * rules in the database decide what is visible. The UI only ever sees plain DTOs.
 */

export interface ClassroomCard {
  id: string;
  className: string;
  section: string;
  subject: string;
  studentCount: number;
  language: string;
  supportLanguage: string;
  understanding: number;
  currentTopic: string;
  nextLesson: { topic: string; scheduledAt: string; durationMin: number } | null;
}

export interface LectureDto {
  id: string;
  topic: string;
  chapter: string | null;
  scheduledAt: string;
  durationMin: number;
  status: string;
  objective: string | null;
  activities: string[];
  materials: string[];
  understanding: number | null;
  languageSupport: string | null;
  teacherNotes: string | null;
  aiSummary: string | null;
}

export interface StudentDto {
  id: string;
  name: string;
  roll: number;
  understanding: number;
  weakArea: string | null;
  motherTongue: string;
}

export const listClassrooms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClassroomCard[]> => {
    const { supabase, userId } = context;

    const rooms = await supabase
      .from("classrooms")
      .select("id, class_name, section, subject, student_count, language, support_language, understanding, current_topic")
      .eq("teacher_id", userId)
      .order("class_name")
      .order("section");
    if (rooms.error) throw rooms.error;

    const ids = (rooms.data ?? []).map((r) => r.id);
    let lectures: Array<{ classroom_id: string; topic: string; scheduled_at: string; duration_min: number }> = [];
    if (ids.length) {
      const res = await supabase
        .from("lecture_sessions")
        .select("classroom_id, topic, scheduled_at, duration_min")
        .in("classroom_id", ids)
        .neq("status", "completed")
        .order("scheduled_at");
      if (res.error) throw res.error;
      lectures = res.data ?? [];
    }

    return (rooms.data ?? []).map((r) => {
      const next = lectures.find((l) => l.classroom_id === r.id);
      return {
        id: r.id,
        className: r.class_name,
        section: r.section,
        subject: r.subject,
        studentCount: r.student_count,
        language: r.language,
        supportLanguage: r.support_language,
        understanding: r.understanding,
        currentTopic: r.current_topic ?? "No lesson set yet",
        nextLesson: next
          ? { topic: next.topic, scheduledAt: next.scheduled_at, durationMin: next.duration_min }
          : null,
      };
    });
  });

export const getClassroomDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classroomId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const room = await supabase
      .from("classrooms")
      .select("id, class_name, section, subject, student_count, language, support_language, understanding, current_topic")
      .eq("id", data.classroomId)
      .maybeSingle();
    if (room.error) throw room.error;
    if (!room.data) return null;

    const [lectureRes, studentRes, assessmentRes, recRes] = await Promise.all([
      supabase
        .from("lecture_sessions")
        .select(
          "id, topic, chapter, scheduled_at, duration_min, status, objective, activities, materials, understanding, language_support, teacher_notes, ai_summary",
        )
        .eq("classroom_id", data.classroomId)
        .order("scheduled_at"),
      supabase
        .from("students")
        .select("id, full_name, roll, understanding, weak_area, mother_tongue")
        .eq("classroom_id", data.classroomId)
        .order("roll"),
      supabase
        .from("assessments")
        .select("id, title, topic, kind, difficulty, scheduled_date, assessment_submissions(score, max_score), assessment_questions(id)")
        .eq("classroom_id", data.classroomId)
        .order("scheduled_date", { ascending: false }),
      supabase
        .from("ai_recommendations")
        .select("title, body, action_label")
        .eq("classroom_id", data.classroomId)
        .in("status", ["open", "new"])
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    if (lectureRes.error) throw lectureRes.error;
    if (studentRes.error) throw studentRes.error;
    if (assessmentRes.error) throw assessmentRes.error;
    if (recRes.error) throw recRes.error;

    const lectures: LectureDto[] = (lectureRes.data ?? []).map((l) => ({
      id: l.id,
      topic: l.topic,
      chapter: l.chapter,
      scheduledAt: l.scheduled_at,
      durationMin: l.duration_min,
      status: l.status,
      objective: l.objective,
      activities: l.activities ?? [],
      materials: l.materials ?? [],
      understanding: l.understanding,
      languageSupport: l.language_support,
      teacherNotes: l.teacher_notes,
      aiSummary: l.ai_summary,
    }));

    const students: StudentDto[] = (studentRes.data ?? []).map((s) => ({
      id: s.id,
      name: s.full_name,
      roll: s.roll,
      understanding: s.understanding,
      weakArea: s.weak_area,
      motherTongue: s.mother_tongue,
    }));

    const assessments = (assessmentRes.data ?? []).map((a) => {
      const subs = (a.assessment_submissions ?? []) as Array<{ score: number; max_score: number }>;
      const average = subs.length
        ? Math.round(subs.reduce((sum, s) => sum + (Number(s.score) / Number(s.max_score)) * 100, 0) / subs.length)
        : 0;
      return {
        id: a.id,
        title: a.title,
        topic: a.topic,
        kind: a.kind,
        difficulty: a.difficulty,
        date: a.scheduled_date,
        questionCount: ((a.assessment_questions ?? []) as Array<{ id: string }>).length,
        attempted: subs.length,
        averageScore: average,
      };
    });

    return {
      classroom: {
        id: room.data.id,
        className: room.data.class_name,
        section: room.data.section,
        subject: room.data.subject,
        studentCount: room.data.student_count,
        language: room.data.language,
        supportLanguage: room.data.support_language,
        understanding: room.data.understanding,
        currentTopic: room.data.current_topic ?? "No lesson set yet",
      },
      previous: lectures.filter((l) => l.status === "completed").reverse(),
      upcoming: lectures.filter((l) => l.status !== "completed"),
      students,
      assessments,
      recommendation: recRes.data?.[0] ?? null,
    };
  });

export const createClassroom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      className: string;
      section: string;
      subject: string;
      studentCount: number;
      language: string;
      supportLanguage: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const profile = await supabase.from("profiles").select("school_id").eq("id", userId).maybeSingle();
    if (profile.error) throw profile.error;

    const created = await supabase
      .from("classrooms")
      .insert({
        teacher_id: userId,
        school_id: profile.data?.school_id ?? null,
        class_name: data.className,
        section: data.section,
        subject: data.subject,
        student_count: data.studentCount,
        language: data.language,
        support_language: data.supportLanguage,
        academic_year: "2025-26",
        current_topic: "First lesson",
        understanding: 0,
      })
      .select("id")
      .single();
    if (created.error) throw created.error;

    return { id: created.data.id };
  });
