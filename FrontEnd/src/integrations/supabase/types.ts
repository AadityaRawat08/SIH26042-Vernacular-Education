export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_generation_history: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: string
          kind: string
          provider: string
          request: Json
          success: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          kind: string
          provider?: string
          request?: Json
          success?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          kind?: string
          provider?: string
          request?: Json
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      ai_recommendations: {
        Row: {
          action_label: string | null
          body: string
          classroom_id: string
          created_at: string
          id: string
          lecture_session_id: string | null
          lesson_plan_id: string | null
          status: string
          teacher_id: string
          title: string
        }
        Insert: {
          action_label?: string | null
          body: string
          classroom_id: string
          created_at?: string
          id?: string
          lecture_session_id?: string | null
          lesson_plan_id?: string | null
          status?: string
          teacher_id: string
          title: string
        }
        Update: {
          action_label?: string | null
          body?: string
          classroom_id?: string
          created_at?: string
          id?: string
          lecture_session_id?: string | null
          lesson_plan_id?: string | null
          status?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_recommendations_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendations_lecture_session_id_fkey"
            columns: ["lecture_session_id"]
            isOneToOne: false
            referencedRelation: "lecture_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_recommendations_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          answer: string | null
          assessment_id: string
          created_at: string
          difficulty: string
          id: string
          options: Json
          position: number
          prompt: string
        }
        Insert: {
          answer?: string | null
          assessment_id: string
          created_at?: string
          difficulty?: string
          id?: string
          options?: Json
          position?: number
          prompt: string
        }
        Update: {
          answer?: string | null
          assessment_id?: string
          created_at?: string
          difficulty?: string
          id?: string
          options?: Json
          position?: number
          prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_submissions: {
        Row: {
          assessment_id: string
          id: string
          max_score: number
          score: number
          student_id: string
          submitted_at: string
        }
        Insert: {
          assessment_id: string
          id?: string
          max_score?: number
          score?: number
          student_id: string
          submitted_at?: string
        }
        Update: {
          assessment_id?: string
          id?: string
          max_score?: number
          score?: number
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_submissions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          classroom_id: string
          created_at: string
          difficulty: string
          id: string
          kind: string
          language: string
          lecture_session_id: string | null
          scheduled_date: string
          teacher_id: string
          title: string
          topic: string
          updated_at: string
        }
        Insert: {
          classroom_id: string
          created_at?: string
          difficulty?: string
          id?: string
          kind?: string
          language?: string
          lecture_session_id?: string | null
          scheduled_date?: string
          teacher_id: string
          title: string
          topic: string
          updated_at?: string
        }
        Update: {
          classroom_id?: string
          created_at?: string
          difficulty?: string
          id?: string
          kind?: string
          language?: string
          lecture_session_id?: string | null
          scheduled_date?: string
          teacher_id?: string
          title?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_lecture_session_id_fkey"
            columns: ["lecture_session_id"]
            isOneToOne: false
            referencedRelation: "lecture_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          board: string
          class_name: string
          created_at: string
          id: string
          position: number
          subject: string
          title: string
        }
        Insert: {
          board?: string
          class_name: string
          created_at?: string
          id?: string
          position?: number
          subject: string
          title: string
        }
        Update: {
          board?: string
          class_name?: string
          created_at?: string
          id?: string
          position?: number
          subject?: string
          title?: string
        }
        Relationships: []
      }
      classrooms: {
        Row: {
          academic_year: string
          class_name: string
          created_at: string
          current_topic: string | null
          id: string
          language: string
          school_id: string | null
          section: string
          student_count: number
          subject: string
          support_language: string
          teacher_id: string
          understanding: number
          updated_at: string
        }
        Insert: {
          academic_year?: string
          class_name: string
          created_at?: string
          current_topic?: string | null
          id?: string
          language?: string
          school_id?: string | null
          section: string
          student_count?: number
          subject: string
          support_language?: string
          teacher_id: string
          understanding?: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_name?: string
          created_at?: string
          current_topic?: string | null
          id?: string
          language?: string
          school_id?: string | null
          section?: string
          student_count?: number
          subject?: string
          support_language?: string
          teacher_id?: string
          understanding?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      language_vocabulary: {
        Row: {
          created_at: string
          example: string | null
          id: string
          pronunciation: string | null
          subject: string | null
          term_en: string
          term_hi: string | null
          term_sat: string | null
          verified: boolean
        }
        Insert: {
          created_at?: string
          example?: string | null
          id?: string
          pronunciation?: string | null
          subject?: string | null
          term_en: string
          term_hi?: string | null
          term_sat?: string | null
          verified?: boolean
        }
        Update: {
          created_at?: string
          example?: string | null
          id?: string
          pronunciation?: string | null
          subject?: string | null
          term_en?: string
          term_hi?: string | null
          term_sat?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      learning_gaps: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          kind: Database["public"]["Enums"]["gap_kind"]
          student_id: string
          topic: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["gap_kind"]
          student_id: string
          topic: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["gap_kind"]
          student_id?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_gaps_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_sessions: {
        Row: {
          activities: string[]
          adjusted_from: string | null
          adjustment_reason: string | null
          ai_summary: string | null
          chapter: string | null
          classroom_id: string
          created_at: string
          duration_min: number
          id: string
          language_support: string | null
          lesson_plan_id: string | null
          materials: string[]
          objective: string | null
          scheduled_at: string
          status: string
          teacher_id: string
          teacher_notes: string | null
          topic: string
          understanding: number | null
          updated_at: string
        }
        Insert: {
          activities?: string[]
          adjusted_from?: string | null
          adjustment_reason?: string | null
          ai_summary?: string | null
          chapter?: string | null
          classroom_id: string
          created_at?: string
          duration_min?: number
          id?: string
          language_support?: string | null
          lesson_plan_id?: string | null
          materials?: string[]
          objective?: string | null
          scheduled_at?: string
          status?: string
          teacher_id: string
          teacher_notes?: string | null
          topic: string
          understanding?: number | null
          updated_at?: string
        }
        Update: {
          activities?: string[]
          adjusted_from?: string | null
          adjustment_reason?: string | null
          ai_summary?: string | null
          chapter?: string | null
          classroom_id?: string
          created_at?: string
          duration_min?: number
          id?: string
          language_support?: string | null
          lesson_plan_id?: string | null
          materials?: string[]
          objective?: string | null
          scheduled_at?: string
          status?: string
          teacher_id?: string
          teacher_notes?: string | null
          topic?: string
          understanding?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_sessions_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_sessions_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          chapter: string
          classroom_id: string
          created_at: string
          duration_min: number
          id: string
          language: string
          plan: Json
          requirements: string[]
          resources: string[]
          status: Database["public"]["Enums"]["plan_status"]
          student_level: string
          teacher_id: string
          teacher_note: string | null
          topic: string
          updated_at: string
        }
        Insert: {
          chapter: string
          classroom_id: string
          created_at?: string
          duration_min?: number
          id?: string
          language?: string
          plan?: Json
          requirements?: string[]
          resources?: string[]
          status?: Database["public"]["Enums"]["plan_status"]
          student_level?: string
          teacher_id: string
          teacher_note?: string | null
          topic: string
          updated_at?: string
        }
        Update: {
          chapter?: string
          classroom_id?: string
          created_at?: string
          duration_min?: number
          id?: string
          language?: string
          plan?: Json
          requirements?: string[]
          resources?: string[]
          status?: Database["public"]["Enums"]["plan_status"]
          student_level?: string
          teacher_id?: string
          teacher_note?: string | null
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      offline_content: {
        Row: {
          classroom_id: string | null
          created_at: string
          downloaded: boolean
          id: string
          includes: string[]
          label: string
          size_mb: number
          user_id: string
        }
        Insert: {
          classroom_id?: string | null
          created_at?: string
          downloaded?: boolean
          id?: string
          includes?: string[]
          label: string
          size_mb?: number
          user_id: string
        }
        Update: {
          classroom_id?: string | null
          created_at?: string
          downloaded?: boolean
          id?: string
          includes?: string[]
          label?: string
          size_mb?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_content_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_links: {
        Row: {
          created_at: string
          id: string
          parent_user_id: string
          relationship: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_user_id: string
          relationship?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_user_id?: string
          relationship?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          experience_years: number
          full_name: string
          id: string
          interface_language: string
          phone: string | null
          photo_url: string | null
          qualification: string | null
          school_id: string | null
          teaching_language: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          experience_years?: number
          full_name?: string
          id: string
          interface_language?: string
          phone?: string | null
          photo_url?: string | null
          qualification?: string | null
          school_id?: string | null
          teaching_language?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          experience_years?: number
          full_name?: string
          id?: string
          interface_language?: string
          phone?: string | null
          photo_url?: string | null
          qualification?: string | null
          school_id?: string | null
          teaching_language?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          approved: boolean
          category: string
          class_name: string | null
          created_at: string
          created_by: string | null
          duration: string | null
          id: string
          language: string
          size_mb: number
          storage_url: string | null
          subject: string | null
          title: string
          topic: string | null
        }
        Insert: {
          approved?: boolean
          category?: string
          class_name?: string | null
          created_at?: string
          created_by?: string | null
          duration?: string | null
          id?: string
          language?: string
          size_mb?: number
          storage_url?: string | null
          subject?: string | null
          title: string
          topic?: string | null
        }
        Update: {
          approved?: boolean
          category?: string
          class_name?: string | null
          created_at?: string
          created_by?: string | null
          duration?: string | null
          id?: string
          language?: string
          size_mb?: number
          storage_url?: string | null
          subject?: string | null
          title?: string
          topic?: string | null
        }
        Relationships: []
      }
      schools: {
        Row: {
          academic_year: string
          address: string | null
          board: string
          created_at: string
          created_by: string | null
          district: string | null
          id: string
          name: string
          school_type: string | null
          updated_at: string
        }
        Insert: {
          academic_year?: string
          address?: string | null
          board?: string
          created_at?: string
          created_by?: string | null
          district?: string | null
          id?: string
          name: string
          school_type?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string
          address?: string | null
          board?: string
          created_at?: string
          created_by?: string | null
          district?: string | null
          id?: string
          name?: string
          school_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      student_answers: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          submission_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          submission_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "assessment_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progress: {
        Row: {
          attendance: number
          created_at: string
          id: string
          language_support_need: boolean
          mastery: number
          observations: string | null
          participation: number
          student_id: string
          subject: string
          topic: string
          updated_at: string
        }
        Insert: {
          attendance?: number
          created_at?: string
          id?: string
          language_support_need?: boolean
          mastery?: number
          observations?: string | null
          participation?: number
          student_id: string
          subject: string
          topic: string
          updated_at?: string
        }
        Update: {
          attendance?: number
          created_at?: string
          id?: string
          language_support_need?: boolean
          mastery?: number
          observations?: string | null
          participation?: number
          student_id?: string
          subject?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          classroom_id: string | null
          created_at: string
          full_name: string
          id: string
          mother_tongue: string
          notes: string | null
          roll: number
          school_id: string | null
          understanding: number
          updated_at: string
          weak_area: string | null
        }
        Insert: {
          classroom_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          mother_tongue?: string
          notes?: string | null
          roll?: number
          school_id?: string | null
          understanding?: number
          updated_at?: string
          weak_area?: string | null
        }
        Update: {
          classroom_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          mother_tongue?: string
          notes?: string | null
          roll?: number
          school_id?: string | null
          understanding?: number
          updated_at?: string
          weak_area?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_queue: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          payload: Json
          synced_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          label: string
          payload?: Json
          synced_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          payload?: Json
          synced_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      teacher_language_feedback: {
        Row: {
          ai_output: string | null
          created_at: string
          id: string
          language: string
          status: string
          suggestion: string | null
          term: string
          user_id: string
        }
        Insert: {
          ai_output?: string | null
          created_at?: string
          id?: string
          language?: string
          status?: string
          suggestion?: string | null
          term: string
          user_id: string
        }
        Update: {
          ai_output?: string | null
          created_at?: string
          id?: string
          language?: string
          status?: string
          suggestion?: string | null
          term?: string
          user_id?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          position: number
          summary: string | null
          title: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          position?: number
          summary?: string | null
          title: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          position?: number
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      translations: {
        Row: {
          audio_url: string | null
          classroom_id: string | null
          created_at: string
          id: string
          mode: Database["public"]["Enums"]["translate_mode"]
          provider: string
          saved: boolean
          source_language: string
          source_text: string | null
          target_language: string
          translated_text: string | null
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          classroom_id?: string | null
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["translate_mode"]
          provider?: string
          saved?: boolean
          source_language: string
          source_text?: string | null
          target_language: string
          translated_text?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string | null
          classroom_id?: string | null
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["translate_mode"]
          provider?: string
          saved?: boolean
          source_language?: string
          source_text?: string | null
          target_language?: string
          translated_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "translations_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "teacher" | "institute" | "parent" | "student" | "admin"
      gap_kind: "concept" | "language" | "both" | "mastered"
      plan_status: "draft" | "generated" | "approved" | "taught"
      translate_mode: "voice_voice" | "voice_text" | "text_voice" | "text_text"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["teacher", "institute", "parent", "student", "admin"],
      gap_kind: ["concept", "language", "both", "mastered"],
      plan_status: ["draft", "generated", "approved", "taught"],
      translate_mode: ["voice_voice", "voice_text", "text_voice", "text_text"],
    },
  },
} as const
