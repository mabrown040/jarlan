/**
 * Type definitions for the Supabase `public` schema.
 *
 * Kept hand-authored (not generated) because the schema is small and
 * stable. If the schema grows, switch to generated types via:
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 *
 * Schema shape follows @supabase/postgrest-js GenericSchema — each table
 * needs { Row, Insert, Update, Relationships } for the query builder's
 * type inference to work correctly.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          plan: "free" | "pro";
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          plan?: "free" | "pro";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          plan?: "free" | "pro";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      scenarios: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          data: Json;
          schema_ver: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          owner_id: string;
          name: string;
          data: Json;
          schema_ver?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          data?: Json;
          schema_ver?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
