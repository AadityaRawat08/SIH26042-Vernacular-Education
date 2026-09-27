import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Lesson plan persistence (Phase 3).
 *
 * The AI generation itself is still simulated in the browser, but every
 * generated plan is now stored in the real database against the teacher's
 * classroom. Swapping the generator for a real LLM later only changes what is
 * put into `plan` — the storage contract stays the same.
 */

export interface SavedPlanSummary {
  id: string;
  classroomId: string;
  className: string;
  section: string;
  subject: string;
  chapter: string;
  topic: string;
  language: string;
  durationMin: number;
  status: string;
  createdAt: string;
}

export interface SavedPlan extends SavedPlanSummary {
  teacherNote: string | null;
  resources: string[];
  requirements: string[];
  studentLevel: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: any;
}

interface SavePlanInput {
  classroomId: string;
  chapter: string;
  topic: string;
  language: string;
  durationMin: number;
  resources: string[];
  requirements: string[];
  studentLevel: string;
  teacherNote: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: any;
}

export const savePeriodPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: SavePlanInput) => data)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { supabase, userId } = context;
    const res = await supabase
      .from("lesson_plans")
      .insert({
        teacher_id: userId,
        classroom_id: data.classroomId,
        chapter: data.chapter,
        topic: data.topic,
        language: data.language,
        duration_min: data.durationMin,
        resources: data.resources,
        requirements: data.requirements,
        student_level: data.studentLevel,
        teacher_note: data.teacherNote || null,
        status: "generated",
        plan: data.plan as never,
      })
      .select("id")
      .single();
    if (res.error) throw res.error;
    return { id: res.data.id };
  });

export const listSavedPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedPlanSummary[]> => {
    const { supabase, userId } = context;
    const res = await supabase
      .from("lesson_plans")
      .select("id, classroom_id, chapter, topic, language, duration_min, status, created_at, classrooms(class_name, section, subject)")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (res.error) throw res.error;
    return (res.data ?? []).map((row) => {
      const room = row.classrooms as { class_name: string; section: string; subject: string } | null;
      return {
        id: row.id,
        classroomId: row.classroom_id,
        className: room?.class_name ?? "",
        section: room?.section ?? "",
        subject: room?.subject ?? "",
        chapter: row.chapter,
        topic: row.topic,
        language: row.language,
        durationMin: row.duration_min,
        status: row.status,
        createdAt: row.created_at,
      };
    });
  });

export const getSavedPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }): Promise<SavedPlan | null> => {
    const { supabase, userId } = context;
    const res = await supabase
      .from("lesson_plans")
      .select(
        "id, classroom_id, chapter, topic, language, duration_min, status, created_at, teacher_note, resources, requirements, student_level, plan, classrooms(class_name, section, subject)",
      )
      .eq("id", data.id)
      .eq("teacher_id", userId)
      .maybeSingle();
    if (res.error) throw res.error;
    if (!res.data) return null;
    const row = res.data;
    const room = row.classrooms as { class_name: string; section: string; subject: string } | null;
    return {
      id: row.id,
      classroomId: row.classroom_id,
      className: room?.class_name ?? "",
      section: room?.section ?? "",
      subject: room?.subject ?? "",
      chapter: row.chapter,
      topic: row.topic,
      language: row.language,
      durationMin: row.duration_min,
      status: row.status,
      createdAt: row.created_at,
      teacherNote: row.teacher_note,
      resources: row.resources ?? [],
      requirements: row.requirements ?? [],
      studentLevel: row.student_level,
      plan: row.plan,
    };
  });

export const setPlanStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: "draft" | "generated" | "approved" | "taught" }) => data)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const res = await supabase
      .from("lesson_plans")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("teacher_id", userId);
    if (res.error) throw res.error;
    return { ok: true };
  });
