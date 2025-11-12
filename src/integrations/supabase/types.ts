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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      community_comments: {
        Row: {
          created_at: string
          id: string
          post_id: string
          text_content: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          text_content: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          text_content?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          comment_count: number
          created_at: string
          id: string
          image_url: string | null
          like_count: number
          text_content: string
          user_id: string
        }
        Insert: {
          comment_count?: number
          created_at?: string
          id?: string
          image_url?: string | null
          like_count?: number
          text_content: string
          user_id: string
        }
        Update: {
          comment_count?: number
          created_at?: string
          id?: string
          image_url?: string | null
          like_count?: number
          text_content?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_comments: {
        Row: {
          comment: string
          complaint_id: string
          created_at: string
          id: string
          is_internal: boolean | null
          user_id: string
        }
        Insert: {
          comment: string
          complaint_id: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          user_id: string
        }
        Update: {
          comment?: string
          complaint_id?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_comments_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_images: {
        Row: {
          complaint_id: string
          file_size: number
          id: string
          image_url: string
          thumbnail_url: string
          uploaded_at: string
        }
        Insert: {
          complaint_id: string
          file_size: number
          id?: string
          image_url: string
          thumbnail_url: string
          uploaded_at?: string
        }
        Update: {
          complaint_id?: string
          file_size?: number
          id?: string
          image_url?: string
          thumbnail_url?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_images_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      complaint_upvotes: {
        Row: {
          complaint_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          complaint_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          complaint_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_upvotes_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_upvotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["complaint_category"]
          complaint_number: string
          created_at: string
          description: string
          id: string
          is_anonymous: boolean | null
          location: string | null
          resolution_notes: string | null
          resolved_at: string | null
          satisfaction_rating: number | null
          status: Database["public"]["Enums"]["complaint_status"]
          title: string
          updated_at: string
          upvote_count: number
          urgency: Database["public"]["Enums"]["urgency_level"]
          user_id: string
          view_count: number
        }
        Insert: {
          assigned_to?: string | null
          category: Database["public"]["Enums"]["complaint_category"]
          complaint_number: string
          created_at?: string
          description: string
          id?: string
          is_anonymous?: boolean | null
          location?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          satisfaction_rating?: number | null
          status?: Database["public"]["Enums"]["complaint_status"]
          title: string
          updated_at?: string
          upvote_count?: number
          urgency?: Database["public"]["Enums"]["urgency_level"]
          user_id: string
          view_count?: number
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["complaint_category"]
          complaint_number?: string
          created_at?: string
          description?: string
          id?: string
          is_anonymous?: boolean | null
          location?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          satisfaction_rating?: number | null
          status?: Database["public"]["Enums"]["complaint_status"]
          title?: string
          updated_at?: string
          upvote_count?: number
          urgency?: Database["public"]["Enums"]["urgency_level"]
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "complaints_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          complaint_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          complaint_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          complaint_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_complaint_id_fkey"
            columns: ["complaint_id"]
            isOneToOne: false
            referencedRelation: "complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          batch_department: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          batch_department?: string | null
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          batch_department?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles_sensitive: {
        Row: {
          created_at: string
          email: string
          id: string
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
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
      generate_complaint_number: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "staff" | "admin"
      complaint_category:
        | "facilities"
        | "technical"
        | "academic"
        | "food"
        | "transport"
        | "other"
      complaint_status:
        | "submitted"
        | "in_review"
        | "in_progress"
        | "resolved"
        | "closed"
      notification_type:
        | "status_changed"
        | "new_comment"
        | "assigned"
        | "resolved"
      urgency_level: "low" | "medium" | "high" | "critical"
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
      app_role: ["student", "staff", "admin"],
      complaint_category: [
        "facilities",
        "technical",
        "academic",
        "food",
        "transport",
        "other",
      ],
      complaint_status: [
        "submitted",
        "in_review",
        "in_progress",
        "resolved",
        "closed",
      ],
      notification_type: [
        "status_changed",
        "new_comment",
        "assigned",
        "resolved",
      ],
      urgency_level: ["low", "medium", "high", "critical"],
    },
  },
} as const
