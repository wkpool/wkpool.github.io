import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FOOTBALL_API_KEY     = Deno.env.get('FOOTBALL_API_KEY')!
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STAGE_TO_PHASE: Record<string, string> = {
  'LAST_32':      'zestiende finale',
  'ROUND_OF_32':  'zestiende finale',
  'LAST_16':      'achtste finale',
  'ROUND_OF_16':  'achtste finale',
  'QUARTER_FINALS': 'kwartfinale',
  'SEMI_FINALS':  'halve finale',
  'THIRD_PLACE':  'kleine finale',
  'FINAL':        'finale',
}

// API dates are UTC; DB dates are stored as CEST (UTC+2) without timezone suffix
function utcToCest(utcStr: string): string {
  const d = new Date(utcStr)
  const cest = new Date(d.getTime() + 2 * 60 * 60 * 1000)
  return cest.toISOString().slice(0, 19)
}

// True if the team name is a real country (not a TBD placeholder from the API)
function isRealTeam(name: string | null | undefined): boolean {
  if (!name) return false
  const n = name.toLowerCase()
  return !['tbd', 'to be decided', '?'].includes(n) &&
    !n.startsWith('winner') && !n.startsWith('loser') &&
    !n.startsWith('1st') && !n.startsWith('2nd') && !n.startsWith('3rd') &&
    !n.includes('group') && !n.includes('runner') && !n.includes('place')
}

// Translate API placeholder text to Dutch
function translatePlaceholder(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .replace(/1st Place Group/gi, 'Winnaar Groep')
    .replace(/2nd Place Group/gi, 'Tweede Groep')
    .replace(/3rd Place Group/gi, 'Derde Groep')
    .replace(/Winner Group/gi, 'Winnaar Groep')
    .replace(/Loser Group/gi, 'Verliezer Groep')
    .replace(/Runner-up Group/gi, 'Tweede Groep')
    .replace(/Best Third/gi, 'Beste derde')
    .replace(/TBD/gi, '?')
}

// Translate English API team names to Dutch
const EN_TO_NL: Record<string, string> = {
  'Netherlands': 'Nederland', 'Germany': 'Duitsland', 'France': 'Frankrijk',
  'England': 'Engeland', 'Spain': 'Spanje', 'Belgium': 'België',
  'Argentina': 'Argentinië', 'Brazil': 'Brazilië',
  'United States': 'Verenigde Staten', 'USA': 'Verenigde Staten',
  'Denmark': 'Denemarken', 'Switzerland': 'Zwitserland', 'Poland': 'Polen',
  'Turkey': 'Turkije', 'Croatia': 'Kroatië', 'Serbia': 'Servië',
  'Ukraine': 'Oekraïne', 'Scotland': 'Schotland', 'Albania': 'Albanië',
  'Slovenia': 'Slovenië', 'Romania': 'Roemenië', 'Georgia': 'Georgië',
  'Austria': 'Oostenrijk', 'Hungary': 'Hongarije', 'Slovakia': 'Slowakije',
  'Czech Republic': 'Tsjechië', 'Czechia': 'Tsjechië',
  'Saudi Arabia': 'Saoedi-Arabië', 'Iran': 'Iran', 'Iraq': 'Irak',
  'Jordan': 'Jordanië', 'Uzbekistan': 'Oezbekistan',
  'Australia': 'Australië', 'New Zealand': 'Nieuw-Zeeland',
  'Morocco': 'Marokko', 'Egypt': 'Egypte', 'Cameroon': 'Kameroen',
  "Côte d'Ivoire": 'Ivoorkust', "Cote d'Ivoire": 'Ivoorkust',
  'Algeria': 'Algerije', 'Tunisia': 'Tunesië', 'South Africa': 'Zuid-Afrika',
  'Ghana': 'Ghana', 'Nigeria': 'Nigeria', 'Senegal': 'Senegal',
  'Mali': 'Mali', 'DR Congo': 'Congo', 'Congo DR': 'Congo', 'Congo': 'Congo',
  'Costa Rica': 'Costa Rica', 'Haiti': 'Haïti', 'Curaçao': 'Curaçao',
  'Cape Verde': 'Kaapverdië', 'Cabo Verde': 'Kaapverdië', 'Cabo Verde Islands': 'Kaapverdië', 'Cape Verde Islands': 'Kaapverdië',
  'Mexico': 'Mexico', 'Canada': 'Canada',
  'Japan': 'Japan', 'Uruguay': 'Uruguay', 'Colombia': 'Colombia',
  'Ecuador': 'Ecuador', 'Venezuela': 'Venezuela', 'Paraguay': 'Paraguay',
  'Bolivia': 'Bolivia', 'Peru': 'Peru', 'Chile': 'Chili',
  'Panama': 'Panama', 'Honduras': 'Honduras', 'Wales': 'Wales',
  'Northern Ireland': 'Noord-Ierland', 'Ireland': 'Ierland',
  'Finland': 'Finland', 'Norway': 'Noorwegen', 'Sweden': 'Zweden',
  'Iceland': 'IJsland', 'Greece': 'Griekenland', 'Israel': 'Israël',
  'Russia': 'Rusland', 'China PR': 'China', 'China': 'China',
  'South Korea': 'Zuid-Korea', 'Korea Republic': 'Zuid-Korea',
  'Bosnia and Herzegovina': 'Bosnië-Herzegovina', 'Bosnia-Herzegovina': 'Bosnië-Herzegovina',
  'Bosnia & Herzegovina': 'Bosnië-Herzegovina', 'Portugal': 'Portugal',
  'Qatar': 'Qatar',
}

// Returns the best Dutch name for an API team name
function toNl(name: string | null | undefined): string {
  if (!name) return '?'
  if (isRealTeam(name)) return EN_TO_NL[name] ?? name
  return translatePlaceholder(name)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Fetch all WC 2026 matches
  const apiRes = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches',
    { headers: { 'X-Auth-Token': FOOTBALL_API_KEY } }
  )

  if (!apiRes.ok) {
    return new Response(JSON.stringify({ error: `API error ${apiRes.status}` }), { status: 500, headers: CORS })
  }

  const { matches: apiMatches } = await apiRes.json()

  if (!apiMatches?.length) {
    return new Response(JSON.stringify({ updated: 0, inserted: 0 }), { headers: CORS })
  }

  // Load all DB matches that have an external_id
  const { data: dbMatches } = await supabase
    .from('matches')
    .select('id, external_id, score_home, home, away')
    .not('external_id', 'is', null)

  const existingByExtId: Record<number, { id: number; score_home: number | null; home: string; away: string }> = {}
  for (const m of dbMatches ?? []) {
    existingByExtId[m.external_id] = m
  }

  let updated = 0
  let inserted = 0
  const errors: string[] = []
  const skipped: string[] = []
  const last32debug: unknown[] = []

  for (const m of apiMatches) {
    const existing = existingByExtId[m.id]
    const isFinished = m.status === 'FINISHED' && m.score?.fullTime?.home != null
    const homeName = m.homeTeam?.name || null
    const awayName = m.awayTeam?.name || null

    if (STAGE_TO_PHASE[m.stage] === 'zestiende finale') {
      last32debug.push({ ext: m.id, stage: m.stage, status: m.status, api_home: homeName, api_away: awayName, raw_home: m.homeTeam, raw_away: m.awayTeam, db_home: existing?.home, db_away: existing?.away })
    }

    if (existing) {
      const changes: Record<string, unknown> = {}

      if (isFinished && existing.score_home === null) {
        changes.score_home = m.score.fullTime.home
        changes.score_away = m.score.fullTime.away
      }

      const newHome = toNl(homeName)
      const newAway = toNl(awayName)
      if (newHome !== '?' && newHome !== existing.home) changes.home = newHome
      if (newAway !== '?' && newAway !== existing.away) changes.away = newAway

      const fixedHome = EN_TO_NL[existing.home]
      const fixedAway = EN_TO_NL[existing.away]
      if (fixedHome && fixedHome !== existing.home && !changes.home) changes.home = fixedHome
      if (fixedAway && fixedAway !== existing.away && !changes.away) changes.away = fixedAway

      if (Object.keys(changes).length > 0) {
        const { error } = await supabase.from('matches').update(changes).eq('id', existing.id)
        if (error) errors.push(`update ${existing.id}: ${error.message}`)
        else updated++
      }
    } else if (STAGE_TO_PHASE[m.stage]) {
      const { error } = await supabase.from('matches').insert({
        external_id: m.id,
        home:        toNl(homeName),
        away:        toNl(awayName),
        date:        m.utcDate ? utcToCest(m.utcDate) : null,
        phase:       STAGE_TO_PHASE[m.stage],
        score_home:  isFinished ? m.score.fullTime.home  : null,
        score_away:  isFinished ? m.score.fullTime.away  : null,
      })
      if (error) errors.push(`insert ext:${m.id} ${homeName}-${awayName}: ${error.message}`)
      else inserted++
    } else if (m.stage && !STAGE_TO_PHASE[m.stage]) {
      skipped.push(`unknown stage: ${m.stage}`)
    }
  }

  return new Response(
    JSON.stringify({ updated, inserted, total_api: apiMatches.length, errors, skipped: [...new Set(skipped)], last32debug }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } }
  )
})
