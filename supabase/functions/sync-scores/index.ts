import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FOOTBALL_API_KEY = Deno.env.get('FOOTBALL_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Fetch all finished WC matches from football-data.org (1 API call)
  const apiRes = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED',
    { headers: { 'X-Auth-Token': FOOTBALL_API_KEY } }
  )

  if (!apiRes.ok) {
    return new Response(JSON.stringify({ error: `API error ${apiRes.status}` }), { status: 500, headers: CORS })
  }

  const { matches: apiMatches } = await apiRes.json()

  if (!apiMatches?.length) {
    return new Response(JSON.stringify({ updated: 0, message: 'no finished matches yet' }), { headers: CORS })
  }

  // Build lookup: external_id -> fullTime scores
  const scoreMap: Record<number, { home: number; away: number }> = {}
  for (const m of apiMatches) {
    if (m.score?.fullTime?.home != null && m.score?.fullTime?.away != null) {
      scoreMap[m.id] = { home: m.score.fullTime.home, away: m.score.fullTime.away }
    }
  }

  // Get our DB matches that have an external_id but no score yet
  const { data: dbMatches, error } = await supabase
    .from('matches')
    .select('id, external_id, score_home')
    .not('external_id', 'is', null)
    .is('score_home', null)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
  }

  let updated = 0
  for (const dbMatch of dbMatches ?? []) {
    const score = scoreMap[dbMatch.external_id]
    if (score) {
      const { error: updateError } = await supabase
        .from('matches')
        .update({ score_home: score.home, score_away: score.away })
        .eq('id', dbMatch.id)

      if (!updateError) updated++
    }
  }

  return new Response(
    JSON.stringify({
      updated,
      checked: (dbMatches ?? []).length,
      finished_in_api: apiMatches.length,
    }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } }
  )
})
