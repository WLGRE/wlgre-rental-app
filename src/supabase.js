import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hoouyjfsavketbdeipcb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvb3V5amZzYXZrZXRiZGVpcGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NzQwMDIsImV4cCI6MjA5MjE1MDAwMn0.mGcba3rJFNRyQrnFrcs-KOdMP3x_2yNhmYSBx6QFhmk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
