import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'COLLE_ICI_TON_PROJECT_URL'
const supabaseKey = 'COLLE_ICI_TA_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)
