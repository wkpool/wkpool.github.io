jsimport { supabase } from './supabase.js'

// Voorspelling opslaan
await supabase.from('predictions').insert({
  participant_id: 1,
  match_id: 3,
  pred_thuis: 2,
  pred_uit: 1
})

// Voorspellingen ophalen
const { data } = await supabase
  .from('predictions')
  .select('*')
  .eq('participant_id', 1)
