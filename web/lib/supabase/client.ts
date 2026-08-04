import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

console.log("URL:", supabaseUrl)
console.log("KEY:", supabasePublishableKey)

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
)