export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      measurements: {
        Row: {
          id: string
          user_id: string | null
          image_url: string | null
          annotated_image_url: string | null
          reference_object: string
          custom_width: number | null
          custom_height: number | null
          target_width: number
          target_height: number
          confidence: number | null
          processing_time: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          image_url?: string | null
          annotated_image_url?: string | null
          reference_object: string
          custom_width?: number | null
          custom_height?: number | null
          target_width: number
          target_height: number
          confidence?: number | null
          processing_time?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          image_url?: string | null
          annotated_image_url?: string | null
          reference_object?: string
          custom_width?: number | null
          custom_height?: number | null
          target_width?: number
          target_height?: number
          confidence?: number | null
          processing_time?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      measurement_objects: {
        Row: {
          id: string
          measurement_id: string | null
          object_name: string | null
          width_cm: number
          height_cm: number
          width_px: number | null
          height_px: number | null
          bbox_x: number | null
          bbox_y: number | null
          bbox_width: number | null
          bbox_height: number | null
          created_at: string
        }
        Insert: {
          id?: string
          measurement_id?: string | null
          object_name?: string | null
          width_cm: number
          height_cm: number
          width_px?: number | null
          height_px?: number | null
          bbox_x?: number | null
          bbox_y?: number | null
          bbox_width?: number | null
          bbox_height?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          measurement_id?: string | null
          object_name?: string | null
          width_cm?: number
          height_cm?: number
          width_px?: number | null
          height_px?: number | null
          bbox_x?: number | null
          bbox_y?: number | null
          bbox_width?: number | null
          bbox_height?: number | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
