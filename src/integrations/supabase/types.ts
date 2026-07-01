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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          device_info: string | null
          event_id: string
          id: string
          scan_method: string | null
          scanned_at: string
          scanned_by: string | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          device_info?: string | null
          event_id: string
          id?: string
          scan_method?: string | null
          scanned_at?: string
          scanned_by?: string | null
          ticket_id: string
          user_id: string
        }
        Update: {
          device_info?: string | null
          event_id?: string
          id?: string
          scan_method?: string | null
          scanned_at?: string
          scanned_by?: string | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_code: string
          event_id: string
          event_title: string
          full_name: string
          id: string
          issued_at: string
          pdf_url: string | null
          registration_id: string | null
          user_id: string
          verification_token: string
        }
        Insert: {
          certificate_code: string
          event_id: string
          event_title: string
          full_name: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          registration_id?: string | null
          user_id: string
          verification_token: string
        }
        Update: {
          certificate_code?: string
          event_id?: string
          event_title?: string
          full_name?: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          registration_id?: string | null
          user_id?: string
          verification_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      college_payment_settings: {
        Row: {
          college_id: string
          config: Json | null
          created_at: string
          id: string
          is_active: boolean
          key_id: string | null
          mode: Database["public"]["Enums"]["payment_mode"]
          provider_code: string
          updated_at: string
        }
        Insert: {
          college_id: string
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          key_id?: string | null
          mode?: Database["public"]["Enums"]["payment_mode"]
          provider_code: string
          updated_at?: string
        }
        Update: {
          college_id?: string
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          key_id?: string | null
          mode?: Database["public"]["Enums"]["payment_mode"]
          provider_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_payment_settings_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_payment_settings_provider_code_fkey"
            columns: ["provider_code"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["code"]
          },
        ]
      }
      colleges: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          primary_color: string | null
          short_name: string | null
          slug: string
          support_email: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          primary_color?: string | null
          short_name?: string | null
          slug: string
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          primary_color?: string | null
          short_name?: string | null
          slug?: string
          support_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          banner_url: string | null
          capacity: number | null
          category: Database["public"]["Enums"]["event_category"]
          college_id: string
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          description: string | null
          end_at: string
          featured: boolean
          gallery: Json | null
          id: string
          is_paid: boolean
          organizer_contact: string | null
          organizer_name: string | null
          organizer_user_id: string | null
          price_inr: number
          registration_closes_at: string | null
          registration_opens_at: string | null
          short_description: string | null
          slug: string
          speakers: Json | null
          sponsors: Json | null
          start_at: string
          status: Database["public"]["Enums"]["event_status"]
          tags: string[] | null
          title: string
          trending_score: number
          updated_at: string
          venue: string | null
        }
        Insert: {
          banner_url?: string | null
          capacity?: number | null
          category?: Database["public"]["Enums"]["event_category"]
          college_id: string
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          description?: string | null
          end_at: string
          featured?: boolean
          gallery?: Json | null
          id?: string
          is_paid?: boolean
          organizer_contact?: string | null
          organizer_name?: string | null
          organizer_user_id?: string | null
          price_inr?: number
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          short_description?: string | null
          slug: string
          speakers?: Json | null
          sponsors?: Json | null
          start_at: string
          status?: Database["public"]["Enums"]["event_status"]
          tags?: string[] | null
          title: string
          trending_score?: number
          updated_at?: string
          venue?: string | null
        }
        Update: {
          banner_url?: string | null
          capacity?: number | null
          category?: Database["public"]["Enums"]["event_category"]
          college_id?: string
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          description?: string | null
          end_at?: string
          featured?: boolean
          gallery?: Json | null
          id?: string
          is_paid?: boolean
          organizer_contact?: string | null
          organizer_name?: string | null
          organizer_user_id?: string | null
          price_inr?: number
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          short_description?: string | null
          slug?: string
          speakers?: Json | null
          sponsors?: Json | null
          start_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          tags?: string[] | null
          title?: string
          trending_score?: number
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_providers: {
        Row: {
          code: string
          created_at: string
          display_name: string
          id: string
          is_enabled: boolean
          supports_subscription: boolean
        }
        Insert: {
          code: string
          created_at?: string
          display_name: string
          id?: string
          is_enabled?: boolean
          supports_subscription?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          display_name?: string
          id?: string
          is_enabled?: boolean
          supports_subscription?: boolean
        }
        Relationships: []
      }
      payment_webhooks: {
        Row: {
          error: string | null
          event_type: string | null
          id: string
          payload: Json
          payment_id: string | null
          processed: boolean
          provider_code: string
          received_at: string
          signature_valid: boolean
        }
        Insert: {
          error?: string | null
          event_type?: string | null
          id?: string
          payload: Json
          payment_id?: string | null
          processed?: boolean
          provider_code: string
          received_at?: string
          signature_valid?: boolean
        }
        Update: {
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json
          payment_id?: string | null
          processed?: boolean
          provider_code?: string
          received_at?: string
          signature_valid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhooks_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_inr: number
          college_id: string | null
          created_at: string
          currency: string
          event_id: string | null
          id: string
          idempotency_key: string | null
          provider_code: string | null
          provider_order_id: string | null
          provider_payment_id: string | null
          provider_signature: string | null
          raw_response: Json | null
          registration_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_inr: number
          college_id?: string | null
          created_at?: string
          currency?: string
          event_id?: string | null
          id?: string
          idempotency_key?: string | null
          provider_code?: string | null
          provider_order_id?: string | null
          provider_payment_id?: string | null
          provider_signature?: string | null
          raw_response?: Json | null
          registration_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          college_id?: string | null
          created_at?: string
          currency?: string
          event_id?: string | null
          id?: string
          idempotency_key?: string | null
          provider_code?: string | null
          provider_order_id?: string | null
          provider_payment_id?: string | null
          provider_signature?: string | null
          raw_response?: Json | null
          registration_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_provider_code_fkey"
            columns: ["provider_code"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          college_id: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          prn: string | null
          student_id: string | null
          updated_at: string
          verified: boolean
          verified_at: string | null
          year_of_study: number | null
        }
        Insert: {
          avatar_url?: string | null
          college_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          prn?: string | null
          student_id?: string | null
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          year_of_study?: number | null
        }
        Update: {
          avatar_url?: string | null
          college_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          prn?: string | null
          student_id?: string | null
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          year_of_study?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          amount_paid: number
          created_at: string
          custom_responses: Json | null
          department: string | null
          email: string
          event_id: string
          full_name: string
          id: string
          payment_id: string | null
          phone: string | null
          prn: string | null
          status: Database["public"]["Enums"]["registration_status"]
          student_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          custom_responses?: Json | null
          department?: string | null
          email: string
          event_id: string
          full_name: string
          id?: string
          payment_id?: string | null
          phone?: string | null
          prn?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          student_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          custom_responses?: Json | null
          department?: string | null
          email?: string
          event_id?: string
          full_name?: string
          id?: string
          payment_id?: string | null
          phone?: string | null
          prn?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          student_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount_inr: number
          college_id: string | null
          created_at: string
          fees_inr: number | null
          id: string
          provider_code: string | null
          provider_settlement_id: string | null
          raw: Json | null
          settled_at: string | null
          status: string
          tax_inr: number | null
        }
        Insert: {
          amount_inr: number
          college_id?: string | null
          created_at?: string
          fees_inr?: number | null
          id?: string
          provider_code?: string | null
          provider_settlement_id?: string | null
          raw?: Json | null
          settled_at?: string | null
          status?: string
          tax_inr?: number | null
        }
        Update: {
          amount_inr?: number
          college_id?: string | null
          created_at?: string
          fees_inr?: number | null
          id?: string
          provider_code?: string | null
          provider_settlement_id?: string | null
          raw?: Json | null
          settled_at?: string | null
          status?: string
          tax_inr?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_provider_code_fkey"
            columns: ["provider_code"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["code"]
          },
        ]
      }
      students: {
        Row: {
          college_id: string
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          prn: string
          updated_at: string
          user_id: string | null
          verified_at: string | null
          year_of_study: number | null
        }
        Insert: {
          college_id: string
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          prn: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          year_of_study?: number | null
        }
        Update: {
          college_id?: string
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          prn?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          year_of_study?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          event_id: string
          id: string
          issued_at: string
          qr_token: string
          registration_id: string
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_code: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          event_id: string
          id?: string
          issued_at?: string
          qr_token: string
          registration_id: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_code: string
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          event_id?: string
          id?: string
          issued_at?: string
          qr_token?: string
          registration_id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          college_id: string | null
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          college_id?: string | null
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          college_id?: string | null
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      verify_and_link_prn: {
        Args: { _prn: string; _user_id: string }
        Returns: Json
      }
      verify_certificate: {
        Args: { _token: string }
        Returns: {
          certificate_code: string
          event_title: string
          full_name: string
          issued_at: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "college_admin"
        | "organizer"
        | "scanner"
        | "student"
      event_category:
        | "technical"
        | "cultural"
        | "sports"
        | "workshop"
        | "placement"
        | "pharmacy"
        | "seminar"
        | "other"
      event_status: "draft" | "published" | "cancelled" | "completed"
      payment_mode: "platform" | "college"
      payment_status: "created" | "pending" | "success" | "failed" | "refunded"
      registration_status:
        | "pending_payment"
        | "confirmed"
        | "cancelled"
        | "refunded"
      ticket_status: "active" | "used" | "cancelled"
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
      app_role: [
        "super_admin",
        "college_admin",
        "organizer",
        "scanner",
        "student",
      ],
      event_category: [
        "technical",
        "cultural",
        "sports",
        "workshop",
        "placement",
        "pharmacy",
        "seminar",
        "other",
      ],
      event_status: ["draft", "published", "cancelled", "completed"],
      payment_mode: ["platform", "college"],
      payment_status: ["created", "pending", "success", "failed", "refunded"],
      registration_status: [
        "pending_payment",
        "confirmed",
        "cancelled",
        "refunded",
      ],
      ticket_status: ["active", "used", "cancelled"],
    },
  },
} as const
