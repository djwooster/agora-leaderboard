import { createClient } from '@supabase/supabase-js'

// Use placeholder values during build/SSR — all actual DB calls happen
// exclusively in useEffect/event handlers (client-side only).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
