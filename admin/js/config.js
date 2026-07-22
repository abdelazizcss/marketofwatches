import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = "https://shybnvruiojqlcdvbgzo.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_T3Rv7KgqaZ59UT2FbauSMA_z9z7pRyr";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
