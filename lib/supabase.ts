import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Student = {
  id: number
  student_id: string
  has_voted: boolean
}

export type StudentDetails = {
  id: number
  student_id: string
  name: string
  phone: string
  email: string
  programme: string
  level: number
  degree_type: string
}

export type VotingCategory = {
  id: number
  name: string
  display_order: number
}

export type Candidate = {
  id: number
  name: string
  category_id: number
  photo_url: string
}

export type Vote = {
  id: number
  student_id: string
  candidate_id: number
  category_id: number
}
