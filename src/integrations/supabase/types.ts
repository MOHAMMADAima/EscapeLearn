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
      escape_rooms: {
        Row: {
          created_at: string
          created_by: string
          id: string
          narrative_intro: string
          pdf_content: string | null
          room_code: string
          subject: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          narrative_intro: string
          pdf_content?: string | null
          room_code: string
          subject: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          narrative_intro?: string
          pdf_content?: string | null
          room_code?: string
          subject?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "escape_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          completed_at: string | null
          current_room_index: number
          escape_room_id: string
          hints_used: number
          id: string
          post_confidence_scores: Json | null
          pre_confidence_scores: Json | null
          score: number | null
          started_at: string
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          current_room_index?: number
          escape_room_id: string
          hints_used?: number
          id?: string
          post_confidence_scores?: Json | null
          pre_confidence_scores?: Json | null
          score?: number | null
          started_at?: string
          student_id: string
        }
        Update: {
          completed_at?: string | null
          current_room_index?: number
          escape_room_id?: string
          hints_used?: number
          id?: string
          post_confidence_scores?: Json | null
          pre_confidence_scores?: Json | null
          score?: number | null
          started_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_escape_room_id_fkey"
            columns: ["escape_room_id"]
            isOneToOne: false
            referencedRelation: "escape_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      room_attempts: {
        Row: {
          answer_given: string
          completed_at: string
          hint_used: boolean
          id: string
          is_correct: boolean
          room_id: string
          session_id: string
          student_id: string
          time_spent_seconds: number
        }
        Insert: {
          answer_given: string
          completed_at?: string
          hint_used?: boolean
          id?: string
          is_correct: boolean
          room_id: string
          session_id: string
          student_id: string
          time_spent_seconds?: number
        }
        Update: {
          answer_given?: string
          completed_at?: string
          hint_used?: boolean
          id?: string
          is_correct?: boolean
          room_id?: string
          session_id?: string
          student_id?: string
          time_spent_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "room_attempts_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          concept: string
          correct_answer_keywords: string | null
          created_at: string
          escape_room_id: string
          game_data: Json | null
          hint: string
          id: string
          is_boss_room: boolean
          mechanic: string | null
          narrative_description: string
          order_index: number
          puzzle_question: string | null
          room_number: number
          title: string
        }
        Insert: {
          concept: string
          correct_answer_keywords?: string | null
          created_at?: string
          escape_room_id: string
          game_data?: Json | null
          hint: string
          id?: string
          is_boss_room?: boolean
          mechanic?: string | null
          narrative_description: string
          order_index: number
          puzzle_question?: string | null
          room_number: number
          title: string
        }
        Update: {
          concept?: string
          correct_answer_keywords?: string | null
          created_at?: string
          escape_room_id?: string
          game_data?: Json | null
          hint?: string
          id?: string
          is_boss_room?: boolean
          mechanic?: string | null
          narrative_description?: string
          order_index?: number
          puzzle_question?: string | null
          room_number?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_escape_room_id_fkey"
            columns: ["escape_room_id"]
            isOneToOne: false
            referencedRelation: "escape_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: "student" | "teacher"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      user_role: ["student", "teacher"],
    },
  },
} as const
