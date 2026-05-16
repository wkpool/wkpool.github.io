jsimport { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://jqomnywegtyvgnxtbnjl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxb21ueXdlZ3R5dmdueHRibmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTc2OTUsImV4cCI6MjA5NDQ3MzY5NX0.VjOXsDHRcDrXO2EaZPTLzw5iBSlHFan9FrNW2HJO2cY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
