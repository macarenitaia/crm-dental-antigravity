
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

// Admin client for backend operations (Bypasses RLS)
// This code MUST ONLY run on the server
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
