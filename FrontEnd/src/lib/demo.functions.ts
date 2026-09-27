import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Demo mode seeding.
 *
 * Creates a realistic starting classroom set for a brand-new teacher account so
 * the whole teaching loop (plan -> teach -> assess -> progress -> AI suggestion)
 * is usable immediately. Runs once: if the teacher already has classrooms it
 * returns without writing anything.
 */
export const seedDemoWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const existing = await supabase.from("classrooms").select("id").eq("teacher_id", userId).limit(1);
    if (existing.error) throw existing.error;
    if ((existing.data ?? []).length > 0) return { seeded: false };

    const profile = await supabase.from("profiles").select("school_id, full_name").eq("id", userId).maybeSingle();
    let schoolId = profile.data?.school_id ?? null;

    if (!schoolId) {
      const school = await supabase
        .from("schools")
        .insert({
          name: "Government Primary School, Dumka",
          board: "State Board",
          district: "Dumka",
          school_type: "Government Primary",
          address: "Block 4, Dumka, Jharkhand",
          academic_year: "2025-26",
        })
        .select("id")
        .single();
      if (school.error) throw school.error;
      schoolId = school.data.id;
      await supabase.from("profiles").update({ school_id: schoolId }).eq("id", userId);
    }

    const classroomSeed = [
      { class_name: "Class 1", section: "A", subject: "Mathematics", student_count: 24, current_topic: "Counting in tens", understanding: 72 },
      { class_name: "Class 1", section: "B", subject: "Mathematics", student_count: 27, current_topic: "Counting to 50", understanding: 64 },
      { class_name: "Class 2", section: "A", subject: "Mathematics", student_count: 24, current_topic: "Addition within 100", understanding: 58 },
      { class_name: "Class 2", section: "B", subject: "Environmental Studies", student_count: 25, current_topic: "Parts of a plant", understanding: 81 },
    ];

    const classrooms = await supabase
      .from("classrooms")
      .insert(
        classroomSeed.map((c) => ({
          ...c,
          teacher_id: userId,
          school_id: schoolId,
          language: "hi",
          support_language: "sat",
          academic_year: "2025-26",
        })),
      )
      .select("id, class_name, section, subject, current_topic");
    if (classrooms.error) throw classrooms.error;

    const rooms = classrooms.data;
    const focus = rooms.find((r) => r.class_name === "Class 2" && r.section === "A") ?? rooms[0]!;

    const firstNames = ["Anita", "Budhan", "Chameli", "Dinesh", "Elina", "Fagu", "Gita", "Hopna"];
    const students = await supabase
      .from("students")
      .insert(
        rooms.flatMap((room) =>
          firstNames.slice(0, room.id === focus.id ? 8 : 4).map((name, i) => ({
            classroom_id: room.id,
            school_id: schoolId,
            full_name: `${name} Murmu`,
            roll: i + 1,
            mother_tongue: i % 3 === 0 ? "sat" : "hi",
            understanding: 45 + ((i * 11) % 50),
            weak_area: i % 3 === 0 ? "Place value" : i % 3 === 1 ? "Word problems" : "Vocabulary in Hindi",
          })),
        ),
      )
      .select("id, classroom_id, full_name, understanding, mother_tongue");
    if (students.error) throw students.error;

    const today = new Date();
    const at = (dayOffset: number, hour: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + dayOffset);
      d.setHours(hour, 0, 0, 0);
      return d.toISOString();
    };

    const lectures = await supabase
      .from("lecture_sessions")
      .insert([
        {
          classroom_id: focus.id,
          teacher_id: userId,
          topic: "Place value",
          chapter: "Numbers and Addition",
          scheduled_at: at(-2, 10),
          duration_min: 40,
          status: "completed",
          objective: "Understand tens and ones",
          activities: ["Bundles of sticks", "Board practice"],
          materials: ["Counting sticks"],
          understanding: 54,
          language_support: "Santhali support used for 6 students",
          teacher_notes: "Several children mixed up tens and ones.",
          ai_summary: "Place value needs one more visual round before addition.",
        },
        {
          classroom_id: focus.id,
          teacher_id: userId,
          topic: "Addition within 100",
          chapter: "Numbers and Addition",
          scheduled_at: at(0, 10),
          duration_min: 40,
          status: "planned",
          objective: "Add two-digit numbers with carrying",
          activities: ["Market counting game", "Group worksheet"],
          materials: ["Blackboard", "Counting sticks"],
        },
        {
          classroom_id: focus.id,
          teacher_id: userId,
          topic: "Subtraction within 100",
          chapter: "Subtraction",
          scheduled_at: at(2, 10),
          duration_min: 40,
          status: "planned",
          objective: "Take away with borrowing",
          activities: ["Story problem in Santhali"],
          materials: ["Blackboard"],
        },
        {
          classroom_id: rooms[0]!.id,
          teacher_id: userId,
          topic: "Counting in tens",
          chapter: "Counting to 50",
          scheduled_at: at(0, 12),
          duration_min: 35,
          status: "planned",
          objective: "Group objects in tens",
          activities: ["Pebble grouping"],
          materials: ["Pebbles"],
        },
      ])
      .select("id, topic");
    if (lectures.error) throw lectures.error;

    const assessment = await supabase
      .from("assessments")
      .insert({
        classroom_id: focus.id,
        teacher_id: userId,
        title: "Place value check",
        kind: "quiz",
        topic: "Place value",
        language: "hi",
        difficulty: "easy",
      })
      .select("id")
      .single();
    if (assessment.error) throw assessment.error;

    const questions = await supabase
      .from("assessment_questions")
      .insert([
        { assessment_id: assessment.data.id, position: 1, prompt: "How many tens are in 47?", options: ["3", "4", "7"], answer: "4", difficulty: "easy" },
        { assessment_id: assessment.data.id, position: 2, prompt: "Write 62 as tens and ones.", options: [], answer: "6 tens 2 ones", difficulty: "medium" },
        { assessment_id: assessment.data.id, position: 3, prompt: "Which number has 8 ones?", options: ["18", "81", "80"], answer: "18", difficulty: "easy" },
      ])
      .select("id");
    if (questions.error) throw questions.error;

    const focusStudents = students.data.filter((s) => s.classroom_id === focus.id);
    const submissions = await supabase
      .from("assessment_submissions")
      .insert(
        focusStudents.map((s, i) => ({
          assessment_id: assessment.data.id,
          student_id: s.id,
          score: 40 + ((i * 13) % 55),
          max_score: 100,
        })),
      )
      .select("id, student_id, score");
    if (submissions.error) throw submissions.error;

    await supabase.from("student_progress").insert(
      focusStudents.map((s, i) => ({
        student_id: s.id,
        subject: focus.subject,
        topic: "Place value",
        mastery: 40 + ((i * 13) % 55),
        attendance: 88 + (i % 3) * 4,
        participation: 50 + ((i * 7) % 40),
        language_support_need: s.mother_tongue === "sat",
        observations: s.mother_tongue === "sat" ? "Follows better with Santhali explanation." : "Confident with sticks and bundles.",
      })),
    );

    const otherStudents = students.data.filter((s) => s.classroom_id !== focus.id);
    if (otherStudents.length) {
      await supabase.from("student_progress").insert(
        otherStudents.map((s, i) => {
          const room = rooms.find((r) => r.id === s.classroom_id);
          return {
            student_id: s.id,
            subject: room?.subject ?? "Mathematics",
            topic: room?.current_topic ?? "Counting",
            mastery: 48 + ((i * 11) % 45),
            attendance: 86 + (i % 4) * 3,
            participation: 52 + ((i * 9) % 38),
            language_support_need: s.mother_tongue === "sat",
            observations: s.mother_tongue === "sat" ? "Follows better with a mother-tongue example." : "Participates well in class activities.",
          };
        }),
      );
    }

    await supabase.from("learning_gaps").insert(
      focusStudents.slice(0, 5).map((s, i) => ({
        student_id: s.id,
        topic: "Place value",
        kind: (i < 2 ? "concept" : i < 4 ? "language" : "both") as "concept" | "language" | "both",
        detail: i < 2 ? "Confuses tens and ones column." : "Understands the idea but not the Hindi wording.",
      })),
    );

    await supabase.from("ai_recommendations").insert({
      classroom_id: focus.id,
      teacher_id: userId,
      title: "Start today with a 5-minute visual activity",
      body: "3 students struggled with place value yesterday. Begin the addition lesson with bundles of sticks before writing on the board.",
      action_label: "Use suggestion",
    });

    await supabase.from("offline_content").insert([
      { user_id: userId, classroom_id: focus.id, label: "Class 2A · Addition pack", size_mb: 18, includes: ["Lesson plan", "Audio", "Worksheet"], downloaded: true },
      { user_id: userId, classroom_id: rooms[0]!.id, label: "Class 1A · Counting pack", size_mb: 12, includes: ["Lesson plan", "Activity"], downloaded: false },
    ]);

    await supabase.from("notifications").insert([
      { user_id: userId, title: "Today's lesson is ready", body: "Class 2A · Addition within 100 at 10:00 AM.", kind: "class" },
      { user_id: userId, title: "New AI suggestion", body: "Start with a visual place-value activity.", kind: "ai" },
      { user_id: userId, title: "Offline pack synced", body: "Class 2A addition pack is available without internet.", kind: "sync" },
    ]);

    return { seeded: true, classrooms: rooms.length, students: students.data.length };
  });
