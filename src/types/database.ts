export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      buyer_contacts: {
        Row: {
          buyer_id: string | null
          created_at: string | null
          designation: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string | null
          designation?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string | null
          created_at?: string | null
          designation?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_contacts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_designations: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      buyers: {
        Row: {
          business_type: string | null
          contact_name: string | null
          county: string | null
          created_at: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
          value_chain: string | null
          value_chains: string[] | null
        }
        Insert: {
          business_type?: string | null
          contact_name?: string | null
          county?: string | null
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
          value_chain?: string | null
          value_chains?: string[] | null
        }
        Update: {
          business_type?: string | null
          contact_name?: string | null
          county?: string | null
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
          value_chain?: string | null
          value_chains?: string[] | null
        }
        Relationships: []
      }
      profile_access: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          role: string
          counties: string[] | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          phone_number?: string | null
          role: string
          counties?: string[] | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          role?: string
          counties?: string[] | null
        }
        Relationships: []
      }
      visits: {
        Row: {
          agent_id: string
          buyer_name: string
          buyer_type: string | null
          activity_type: string | null
          check_in_location: unknown | null
          checked_in_at: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          polygon_coords: Json | null
          scheduled_date: string
          status: string
          visit_details: Json | null
        }
        Insert: {
          agent_id: string
          buyer_name: string
          buyer_type?: string | null
          activity_type?: string | null
          check_in_location?: unknown | null
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          polygon_coords?: Json | null
          scheduled_date: string
          status?: string
          visit_details?: Json | null
          visit_category?: string | null
        }
        Update: {
          agent_id?: string
          buyer_name?: string
          buyer_type?: string | null
          activity_type?: string | null
          check_in_location?: unknown | null
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          polygon_coords?: Json | null
          scheduled_date?: string
          status?: string
          visit_details?: Json | null
          visit_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      route_audits: {
        Row: {
          id: string
          agent_id: string
          action: string
          reason: string
          route_date: string
          details: Json
          created_at: string | null
        }
        Insert: {
          id?: string
          agent_id: string
          action: string
          reason: string
          route_date: string
          details?: Json
          created_at?: string | null
        }
        Update: {
          id?: string
          agent_id?: string
          action?: string
          reason?: string
          route_date?: string
          details?: Json
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_audits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
