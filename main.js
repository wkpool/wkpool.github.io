import { supabase } from './supabase.js'

let currentParticipant = null
const shirtStore = {} // participantId → { type, c1, c2 }
let _clipId = 0

async function fetchAllPredictions(query = {}) {
  const all = []
  let from = 0
  const pageSize = 1000
  while (true) {
    let q = supabase.from('predictions').select('*').range(from, from + pageSize - 1)
    if (query.participant_id) q = q.eq('participant_id', query.participant_id)
    const { data } = await q
    if (data) all.push(...data)
    if (!data || data.length < pageSize) break
    from += pageSize
  }
  return all
}

const EN_TO_NL = {
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
  "Côte d'Ivoire": 'Ivoorkust', "Cote d'Ivoire": 'Ivoorkust', 'Ivory Coast': 'Ivoorkust',
  'Algeria': 'Algerije', 'Tunisia': 'Tunesië', 'South Africa': 'Zuid-Afrika',
  'Ghana': 'Ghana', 'Nigeria': 'Nigeria', 'Senegal': 'Senegal', 'Mali': 'Mali',
  'DR Congo': 'Congo', 'Congo DR': 'Congo', 'Democratic Republic of Congo': 'Congo', 'Republic of Congo': 'Congo', 'Costa Rica': 'Costa Rica', 'Haiti': 'Haïti',
  'Curaçao': 'Curaçao', 'Cape Verde': 'Kaapverdië', 'Cabo Verde': 'Kaapverdië', 'Cabo Verde Islands': 'Kaapverdië', 'Cape Verde Islands': 'Kaapverdië',
  'Mexico': 'Mexico', 'Canada': 'Canada', 'Japan': 'Japan',
  'Uruguay': 'Uruguay', 'Colombia': 'Colombia', 'Ecuador': 'Ecuador',
  'Venezuela': 'Venezuela', 'Paraguay': 'Paraguay', 'Bolivia': 'Bolivia',
  'Peru': 'Peru', 'Chile': 'Chili', 'Panama': 'Panama', 'Honduras': 'Honduras',
  'Wales': 'Wales', 'Northern Ireland': 'Noord-Ierland', 'Ireland': 'Ierland',
  'Finland': 'Finland', 'Norway': 'Noorwegen', 'Sweden': 'Zweden',
  'Iceland': 'IJsland', 'Greece': 'Griekenland', 'Israel': 'Israël',
  'Russia': 'Rusland', 'China PR': 'China', 'China': 'China',
  'South Korea': 'Zuid-Korea', 'Korea Republic': 'Zuid-Korea',
  'Bosnia and Herzegovina': 'Bosnië-Herzegovina', 'Bosnia & Herzegovina': 'Bosnië-Herzegovina', 'Bosnia-Herzegovina': 'Bosnië-Herzegovina',
  'Portugal': 'Portugal', 'Qatar': 'Qatar',
}

function nlName(name) { return (name && EN_TO_NL[name]) || name }
function normMatches(arr) {
  return (arr || []).map(m => (EN_TO_NL[m.home] || EN_TO_NL[m.away])
    ? { ...m, home: nlName(m.home), away: nlName(m.away) } : m)
}

const CODES = {
  'nederland': 'nl', 'duitsland': 'de', 'frankrijk': 'fr', 'engeland': 'gb-eng',
  'spanje': 'es', 'portugal': 'pt', 'belgie': 'be', 'belgië': 'be',
  'argentinie': 'ar', 'argentinië': 'ar', 'brazilie': 'br', 'brazilië': 'br',
  'verenigde staten': 'us', 'denemarken': 'dk', 'zwitserland': 'ch', 'polen': 'pl',
  'turkije': 'tr', 'kroatie': 'hr', 'kroatië': 'hr', 'servie': 'rs', 'servië': 'rs',
  'oekraine': 'ua', 'oekraïne': 'ua', 'schotland': 'gb-sct', 'albanie': 'al', 'albanië': 'al',
  'slovenie': 'si', 'slovenië': 'si', 'roemenie': 'ro', 'roemenië': 'ro',
  'georgie': 'ge', 'georgië': 'ge', 'oostenrijk': 'at', 'hongarije': 'hu',
  'slowakije': 'sk', 'tsjechie': 'cz', 'tsjechië': 'cz',
  'saoedi-arabie': 'sa', 'saoedi-arabië': 'sa', 'saoediarabie': 'sa',
  'iran': 'ir', 'irak': 'iq', 'jordanie': 'jo', 'jordanië': 'jo', 'oezbekistan': 'uz',
  'australie': 'au', 'australië': 'au', 'nieuw-zeeland': 'nz',
  'marokko': 'ma', 'egypte': 'eg', 'kameroen': 'cm', 'ivoorkust': 'ci',
  'algerije': 'dz', 'tunesie': 'tn', 'tunesië': 'tn', 'mali': 'ml',
  'zuid-afrika': 'za', 'zuidafrika': 'za', 'ghana': 'gh', 'costa rica': 'cr',
  'haiti': 'ht', 'haïti': 'ht', 'curacao': 'cw', 'curaçao': 'cw',
  'kaapverdie': 'cv', 'kaapverdië': 'cv', 'cape verde': 'cv', 'cabo verde': 'cv', 'cabo verde islands': 'cv', 'cape verde islands': 'cv',
  'congo': 'cd', 'dr congo': 'cd', 'congo dr': 'cd', 'congo-kinshasa': 'cd', 'democratische republiek congo': 'cd', 'democratic republic of congo': 'cd', 'republic of congo': 'cd',
  'bosnie': 'ba', 'bosnië': 'ba', 'bosnie-herzegovina': 'ba', 'bosnië-herzegovina': 'ba', 'bosnia-herzegovina': 'ba',
  'qatar': 'qa', 'mexico': 'mx', 'canada': 'ca', 'japan': 'jp',
  'nigeria': 'ng', 'senegal': 'sn', 'uruguay': 'uy', 'colombia': 'co',
  'ecuador': 'ec', 'venezuela': 've', 'paraguay': 'py', 'bolivia': 'bo',
  'peru': 'pe', 'chile': 'cl', 'panama': 'pa', 'honduras': 'hn',
  'wales': 'gb-wls', 'wales (cymru)': 'gb-wls', 'north ireland': 'gb-nir', 'northern ireland': 'gb-nir',
  'ireland': 'ie', 'ierland': 'ie', 'finland': 'fi', 'noorwegen': 'no',
  'zweden': 'se', 'ijsland': 'is', 'griekenland': 'gr', 'israël': 'il',
  'rusland': 'ru', 'china pr': 'cn', 'india': 'in', 'zuid-korea': 'kr', 'zuidkorea': 'kr',
  // English names
  'netherlands': 'nl', 'germany': 'de', 'france': 'fr', 'england': 'gb-eng',
  'spain': 'es', 'belgium': 'be', 'argentina': 'ar', 'brazil': 'br',
  'usa': 'us', 'united states': 'us', 'south korea': 'kr', 'korea': 'kr',
  'morocco': 'ma', 'egypt': 'eg', 'cameroon': 'cm', 'ivory coast': 'ci',
  "cote d'ivoire": 'ci', 'algeria': 'dz', 'tunisia': 'tn', 'south africa': 'za',
  'australia': 'au', 'new zealand': 'nz', 'denmark': 'dk', 'switzerland': 'ch',
  'poland': 'pl', 'turkey': 'tr', 'croatia': 'hr', 'serbia': 'rs', 'ukraine': 'ua',
  'scotland': 'gb-sct', 'albania': 'al', 'slovenia': 'si', 'romania': 'ro',
  'georgia': 'ge', 'austria': 'at', 'hungary': 'hu', 'slovakia': 'sk',
  'czech republic': 'cz', 'czechia': 'cz', 'saudi arabia': 'sa',
  'iraq': 'iq', 'jordan': 'jo', 'uzbekistan': 'uz', 'nigeria': 'ng',
  'senegal': 'sn', 'bosnia': 'ba', 'bosnia and herzegovina': 'ba', 'bosnia & herzegovina': 'ba',
  'wales': 'gb-wls', 'scotland': 'gb-sct', 'northern ireland': 'gb-nir',
  'ireland': 'ie', 'finland': 'fi', 'norway': 'no', 'sweden': 'se',
  'iceland': 'is', 'greece': 'gr', 'israel': 'il', 'russia': 'ru', 'china': 'cn',
}

function flag(name, stored) {
  if (!name) return '🏳️'
  const key = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const code = CODES[name.toLowerCase().trim()] || CODES[key]
  if (!code) return stored || '🏳️'
  return `<img src="https://flagcdn.com/${code}.svg" class="flag-img" loading="lazy">`
}

const TLA = {
  'mexico': 'MEX', 'zuid-afrika': 'RSA', 'zuid-korea': 'KOR', 'tsjechië': 'CZE',
  'canada': 'CAN', 'bosnië-herzegovina': 'BIH', 'verenigde staten': 'USA', 'paraguay': 'PAR',
  'qatar': 'QAT', 'zwitserland': 'SUI', 'brazilië': 'BRA', 'marokko': 'MAR',
  'haïti': 'HAI', 'schotland': 'SCO', 'australië': 'AUS', 'turkije': 'TUR',
  'duitsland': 'GER', 'curaçao': 'CUW', 'nederland': 'NED', 'japan': 'JPN',
  'ivoorkust': 'CIV', 'ecuador': 'ECU', 'zweden': 'SWE', 'tunesië': 'TUN',
  'spanje': 'ESP', 'kaapverdië': 'CPV', 'belgië': 'BEL', 'egypte': 'EGY',
  'saoedi-arabië': 'KSA', 'uruguay': 'URU', 'iran': 'IRN', 'nieuw-zeeland': 'NZL',
  'frankrijk': 'FRA', 'senegal': 'SEN', 'irak': 'IRQ', 'noorwegen': 'NOR',
  'argentinië': 'ARG', 'algerije': 'ALG', 'oostenrijk': 'AUT', 'jordanië': 'JOR',
  'portugal': 'POR', 'congo': 'COD', 'engeland': 'ENG', 'kroatië': 'CRO',
  'ghana': 'GHA', 'panama': 'PAN', 'oezbekistan': 'UZB', 'colombia': 'COL',
}

function tla(name) {
  return TLA[(name || '').toLowerCase()] || (name || '').slice(0, 3).toUpperCase()
}

const AVATAR_COLORS = [
  'linear-gradient(135deg,#7c5cbf,#5a3fa0)',
  'linear-gradient(135deg,#ff4d6d,#e84393)',
  'linear-gradient(135deg,#1db68a,#0d8a65)',
  'linear-gradient(135deg,#9b6de8,#7c5cbf)',
  'linear-gradient(135deg,#22c55e,#16a34a)',
  'linear-gradient(135deg,#f97316,#ea580c)',
  'linear-gradient(135deg,#0ea5e9,#0284c7)',
  'linear-gradient(135deg,#ec4899,#be185d)',
]

const TILE_COLORS = [
  'linear-gradient(135deg,#7c5cbf,#5a3fa0)',
  'linear-gradient(135deg,#1db68a,#0d8a65)',
  'linear-gradient(135deg,#e84393,#c2185b)',
  'linear-gradient(135deg,#ff4d6d,#c0392b)',
  'linear-gradient(135deg,#0ea5e9,#0284c7)',
]

const CHART_COLORS = [
  '#ff4d6d', '#9b6de8', '#00d4aa', '#ffb800', '#0ea5e9',
  '#f97316', '#22c55e', '#ec4899', '#a78bfa', '#38bdf8',
  '#34d399', '#fb923c', '#f472b6', '#818cf8',
]

function strHash(s) {
  let h = 0
  for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return Math.abs(h)
}

function avatarColor(name) { return AVATAR_COLORS[strHash(name) % AVATAR_COLORS.length] }
function tileColor(id)     { return TILE_COLORS[strHash(id) % TILE_COLORS.length] }

function initials(name) {
  const parts = (name || '??').trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (name || '??').slice(0, 2).toUpperCase()
}

const SHIRT_DESIGNS = [
  { type: 'solid',    c1: '#e63950', c2: '#ffffff', collar: '#a8001e' },
  { type: 'hstripes', c1: '#0369a1', c2: '#ffffff', collar: '#075985' },
  { type: 'vstripes', c1: '#1c1c24', c2: '#ffffff', collar: '#333' },
  { type: 'sash',     c1: '#22c55e', c2: '#ffffff', collar: '#15803d' },
  { type: 'half',     c1: '#9b6de8', c2: '#f97316', collar: '#6a3bc4' },
  { type: 'solid',    c1: '#f59e0b', c2: '#b45309', collar: '#92400e' },
  { type: 'hstripes', c1: '#e84393', c2: '#ffffff', collar: '#9d1c5e' },
  { type: 'panel',    c1: '#38bdf8', c2: '#0369a1', collar: '#075985' },
  { type: 'vstripes', c1: '#e63950', c2: '#1c1c24', collar: '#a8001e' },
  { type: 'sash',     c1: '#1c1c24', c2: '#f59e0b', collar: '#92400e' },
  { type: 'hoops',    c1: '#e63950', c2: '#ffffff', collar: '#a8001e' },
  { type: 'panel',    c1: '#a78bfa', c2: '#4338ca', collar: '#3730a3' },
  { type: 'chevron',  c1: '#0ea5e9', c2: '#ffffff', collar: '#0369a1' },
  { type: 'hoops',    c1: '#f97316', c2: '#1c1c24', collar: '#c2410c' },
  { type: 'chevron',  c1: '#22c55e', c2: '#f59e0b', collar: '#15803d' },
  { type: 'half',     c1: '#14b8a6', c2: '#6366f1', collar: '#0f766e' },
]

function shirtPattern(type, c1, c2) {
  switch (type) {
    case 'solid':
      return `<rect width="100" height="100" fill="${c1}"/>`
    case 'hstripes':
      return `<rect width="100" height="100" fill="${c1}"/>
        <rect width="100" y="20" height="15" fill="${c2}"/>
        <rect width="100" y="50" height="15" fill="${c2}"/>
        <rect width="100" y="80" height="15" fill="${c2}"/>`
    case 'vstripes':
      return `<rect width="100" height="100" fill="${c1}"/>
        <rect x="18" width="11" height="100" fill="${c2}"/>
        <rect x="40" width="11" height="100" fill="${c2}"/>
        <rect x="62" width="11" height="100" fill="${c2}"/>
        <rect x="84" width="11" height="100" fill="${c2}"/>`
    case 'sash':
      return `<rect width="100" height="100" fill="${c1}"/>
        <polygon points="22,0 62,0 78,100 38,100" fill="${c2}"/>`
    case 'half':
      return `<rect width="50" height="100" fill="${c1}"/>
        <rect x="50" width="50" height="100" fill="${c2}"/>`
    case 'panel':
      return `<rect width="100" height="100" fill="${c2}"/>
        <rect x="27" width="46" height="100" fill="${c1}"/>`
    case 'hoops':
      return `<rect width="100" height="100" fill="${c1}"/>
        <rect width="100" y="28" height="16" fill="${c2}"/>
        <rect width="100" y="60" height="16" fill="${c2}"/>`
    case 'chevron':
      return `<rect width="100" height="100" fill="${c1}"/>
        <polygon points="0,48 50,68 100,48 100,62 50,82 0,62" fill="${c2}"/>`
    default:
      return `<rect width="100" height="100" fill="${c1}"/>`
  }
}

function shirtSvg(name, custom = null) {
  const ini = initials(name)
  let design
  if (custom && custom.type && custom.c1) {
    design = { type: custom.type, c1: custom.c1, c2: custom.c2 || '#ffffff', collar: custom.c2 || '#ffffff' }
  } else {
    design = SHIRT_DESIGNS[strHash(name) % SHIRT_DESIGNS.length]
  }
  const clipId = 'sc' + (++_clipId)
  const shirtPath = 'M35,12 L10,24 L16,42 L28,36 L28,88 L72,88 L72,36 L84,42 L90,24 L65,12 Q50,22 35,12 Z'
  return `<svg viewBox="-10 -10 120 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">
    <rect x="-10" y="-10" width="120" height="120" rx="60" fill="#1a1a28"/>
    <defs><clipPath id="${clipId}"><path d="${shirtPath}"/></clipPath></defs>
    <g clip-path="url(#${clipId})">${shirtPattern(design.type, design.c1, design.c2)}</g>
    <path d="M35,12 Q50,22 65,12 L57,27 Q50,33 43,27 Z" fill="${design.collar}"/>
    <text x="50" y="67" text-anchor="middle" dominant-baseline="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="20" fill="white" stroke="rgba(0,0,0,0.5)" stroke-width="3" paint-order="stroke">${ini}</text>
  </svg>`
}

function shirtSvgForP(p) { return shirtSvg(p.name, p.shirt || shirtStore[p.id] || null) }

// DB dates are stored as CEST (UTC+2) without timezone suffix — always parse as such
function parseMatchDate(str) {
  return str ? new Date(str.includes('+') || str.endsWith('Z') ? str : str + '+02:00') : null
}

function formatDate(dateStr) {
  return parseMatchDate(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

// ── Match Detail ──────────────────────────────────────────

async function openMatchDetail(match) {
  const overlay = document.getElementById('match-detail-overlay')
  const body    = document.getElementById('match-detail-body')

  overlay.classList.remove('hidden')
  document.body.style.overflow = 'hidden'
  body.innerHTML = `<p style="color:var(--text-dim);text-align:center;padding:4rem 0;font-size:14px">Laden…</p>`

  const [{ data: participants }, { data: predictions }, { data: firstRows }] = await Promise.all([
    supabase.from('participants').select('*').order('name'),
    supabase.from('predictions').select('*').eq('match_id', match.id),
    supabase.from('matches').select('date').not('date', 'is', null).order('date').limit(1),
  ])

  const now = new Date()
  const firstMatchDate = firstRows?.[0]?.date ? parseMatchDate(firstRows[0].date) : null
  const globalLocked   = firstMatchDate ? now >= firstMatchDate : false
  const matchLocked    = isKnockout(match)
    ? (match.date ? now >= parseMatchDate(match.date) : false)
    : globalLocked
  const isPlayed       = match.score_home !== null && match.score_away !== null
  const maxExact       = isKnockout(match) ? 10 : 5

  const myPred = (predictions || []).find(p => p.participant_id === currentParticipant.id)
  const predMap = {}
  ;(predictions || []).forEach(p => { predMap[p.participant_id] = p })

  let html = `
    <div class="md-close-row">
      <div class="md-eyebrow">Wedstrijd</div>
      <button class="md-close-btn" id="md-close-btn">✕ Sluit</button>
    </div>

    <div class="md-match-header">
      <div class="md-team">
        <div class="md-flag">${flag(match.home, match.home_flag)}</div>
        <div class="md-team-name">${match.home || '?'}</div>
      </div>
      <div class="md-vs-label">vs</div>
      <div class="md-team">
        <div class="md-flag">${flag(match.away, match.away_flag)}</div>
        <div class="md-team-name">${match.away || '?'}</div>
      </div>
    </div>

    ${isPlayed ? `<div class="md-score-result">${match.score_home} – ${match.score_away}</div>` : ''}

    <div class="md-meta">
      ${match.poule ? `<span class="md-pill" style="background:rgba(180,138,245,0.15);color:#b48af5;border:1px solid rgba(180,138,245,0.3)">Groep ${match.poule}</span>` : ''}
      ${isKnockout(match) ? `<span class="md-pill" style="background:rgba(255,107,138,0.12);color:#ff6b8a;border:1px solid rgba(255,107,138,0.25)">${match.phase}</span>` : ''}
      ${match.date ? `<span style="font-size:12px;color:var(--text-dim)">${formatDate(match.date)}</span>` : ''}
    </div>
  `

  if (match.notes) {
    html += `
      <div class="md-notes">
        <div class="md-notes-label">Info</div>
        <div class="md-notes-text">${match.notes.replace(/\n/g, '<br>')}</div>
      </div>
    `
  }

  html += `<div class="md-section"><div class="md-section-label">Jouw voorspelling</div>`
  if (myPred?.pred_home != null) {
    html += `<div style="font-size:26px;font-weight:800;letter-spacing:-0.02em">${myPred.pred_home} – ${myPred.pred_away}</div>`
    if (isPlayed) {
      const pts   = calcPoints(match, myPred)
      const color = pts >= maxExact ? 'var(--teal)' : pts === 4 ? '#38bdf8' : pts > 0 ? 'var(--purple-l)' : 'var(--text-dim)'
      html += `<div style="font-size:13px;color:${color};font-weight:600;margin-top:4px">${pts} ptn</div>`
    }
  } else {
    html += `<div style="font-size:13px;color:var(--text-dim)">Geen voorspelling ingevoerd</div>`
  }
  html += `</div>`

  const myToto = myPred?.pred_home != null ? Math.sign(myPred.pred_home - myPred.pred_away) : null

  const rankOrder = sbCache?.scores?.map(s => s.id) ?? []
  const sortedParticipants = (participants || []).filter(p => p.id !== 22)
    .sort((a, b) => {
      if (isPlayed) {
        const pa = predMap[a.id]?.pred_home != null ? calcPoints(match, predMap[a.id]) : -1
        const pb = predMap[b.id]?.pred_home != null ? calcPoints(match, predMap[b.id]) : -1
        if (pa !== pb) return pb - pa
      }
      const ra = rankOrder.indexOf(a.id)
      const rb = rankOrder.indexOf(b.id)
      if (ra === -1 && rb === -1) return a.name.localeCompare(b.name, 'nl')
      if (ra === -1) return 1
      if (rb === -1) return -1
      return ra - rb
    })

  html += `<div class="md-section"><div class="md-section-label">Alle voorspellingen</div>`
  sortedParticipants.forEach(p => {
    const pred    = predMap[p.id]
    const hasPred = pred?.pred_home != null
    const isMe    = p.id === currentParticipant.id
    const visible  = matchLocked || isPlayed || isMe
    const pts     = isPlayed && hasPred ? calcPoints(match, pred) : null
    const ptsColor = pts !== null
      ? pts >= maxExact ? 'var(--teal)' : pts === 4 ? '#38bdf8' : pts > 0 ? 'var(--purple-l)' : 'var(--text-dim)'
      : ''

    let scoreColor = ''
    if (!isPlayed) {
      if (isMe) {
        scoreColor = 'var(--text)'
      } else if (visible && hasPred && myPred?.pred_home != null) {
        const exact    = pred.pred_home === myPred.pred_home && pred.pred_away === myPred.pred_away
        const sameToto = Math.sign(pred.pred_home - pred.pred_away) === myToto
        scoreColor = exact ? 'var(--teal)' : sameToto ? '#38bdf8' : 'var(--pink)'
      }
    }

    const nameLabel = `${p.name}${isMe ? ' ★' : ''}`
    html += `
      <div class="md-pred-row">
        <div class="md-pred-name${isMe ? ' is-me' : ''}">${nameLabel}</div>
        <div style="text-align:right">
          ${visible && hasPred
            ? `<div class="md-pred-score"${scoreColor ? ` style="color:${scoreColor}"` : ''}>${pred.pred_home} – ${pred.pred_away}</div>${pts !== null ? `<div class="md-pred-pts" style="color:${ptsColor}">${pts} ptn</div>` : ''}`
            : `<div style="color:var(--text-dim);font-size:13px">🔒</div>`
          }
        </div>
      </div>
    `
  })
  html += `</div>`
  if (!matchLocked && !isPlayed) {
    html += `<div style="font-size:11px;color:var(--text-dim);text-align:center;padding:4px 0 8px">Andere voorspellingen zijn zichtbaar na de eerste wedstrijd.</div>`
  }

  body.innerHTML = html
  document.getElementById('md-close-btn').addEventListener('click', closeMatchDetail)
  document.getElementById('md-backdrop').addEventListener('click', closeMatchDetail, { once: true })
}

function closeMatchDetail() {
  document.getElementById('match-detail-overlay').classList.add('hidden')
  document.body.style.overflow = ''
}

function openParticipantDetail(player) {
  const overlay = document.getElementById('participant-detail-overlay')
  const body    = document.getElementById('participant-detail-body')
  overlay.classList.remove('hidden')
  document.body.style.overflow = 'hidden'

  const { matches, predictions, scores } = sbCache
  const rank = scores.findIndex(s => s.id === player.id) + 1

  const predMap = {}
  predictions.filter(p => p.participant_id === player.id)
    .forEach(p => { predMap[p.match_id] = p })

  const played = [...matches]
    .filter(m => m.score_home !== null && m.score_away !== null)
    .sort((a, b) => {
      const da = a.date ? parseMatchDate(a.date) : 0
      const db = b.date ? parseMatchDate(b.date) : 0
      return db - da
    })

  const miss = played.filter(m => {
    const pred = predMap[m.id]
    return pred && calcPoints(m, pred) === 0
  }).length

  const isMe = player.id === currentParticipant.id

  let html = `
    <div class="md-close-row">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#9b6de8,#ff4d6d);padding:2px;flex-shrink:0">
          <div style="width:100%;height:100%;border-radius:50%;background:#1a1a24;overflow:hidden">${shirtSvgForP(player)}</div>
        </div>
        <div>
          <div style="font-size:17px;font-weight:800;letter-spacing:-0.02em">${player.name}${isMe ? ' <span style="font-size:11px;color:var(--pink);font-weight:700">(jij)</span>' : ''}</div>
          <div style="font-size:12px;color:var(--text-mid);margin-top:1px">${rank}e positie · ${player.points} punten</div>
        </div>
      </div>
      <button class="md-close-btn" id="pd-close-btn">✕ Sluit</button>
    </div>

    <div class="pd-stat-row">
      <div class="pd-stat" style="background:rgba(0,212,170,0.1);border:1px solid rgba(0,212,170,0.2)">
        <div class="pd-stat-val" style="color:var(--teal)">${player.exact}</div>
        <div class="pd-stat-lbl">exact</div>
      </div>
      <div class="pd-stat" style="background:rgba(180,138,245,0.1);border:1px solid rgba(180,138,245,0.2)">
        <div class="pd-stat-val" style="color:var(--purple-l)">${player.goed}</div>
        <div class="pd-stat-lbl">toto goed</div>
      </div>
      <div class="pd-stat" style="background:rgba(255,77,109,0.1);border:1px solid rgba(255,77,109,0.2)">
        <div class="pd-stat-val" style="color:var(--pink)">${miss}</div>
        <div class="pd-stat-lbl">mis</div>
      </div>
      ${player.streak > 0 ? `<div class="pd-stat" style="background:rgba(255,140,0,0.1);border:1px solid rgba(255,140,0,0.2)">
        <div class="pd-stat-val" style="color:#ff8c00">${player.streak}🔥</div>
        <div class="pd-stat-lbl">op rij</div>
      </div>` : ''}
    </div>
  `

  if (played.length === 0) {
    html += `<div class="md-section"><p style="color:var(--text-dim);font-size:13px;text-align:center;padding:1rem 0">Nog geen gespeelde wedstrijden</p></div>`
  } else {
    html += `<div class="md-section"><div class="md-section-label">Gespeelde wedstrijden</div>`
    played.forEach(match => {
      const pred = predMap[match.id]
      const pts  = pred ? calcPoints(match, pred) : null
      const ko   = isKnockout(match)
      const maxExact = ko ? 10 : 5
      const base     = ko ? 6  : 3

      const ptsColor = pts === null ? 'var(--text-dim)'
        : pts >= maxExact ? 'var(--teal)' : pts === 4 ? '#38bdf8' : pts > 0 ? 'var(--purple-l)' : 'var(--pink)'
      const ptsLabel = pts === null ? '—'
        : pts >= maxExact ? `⚡ +${pts}` : pts > 0 ? `✓ +${pts}` : '✗ 0'
      const predStr = pred?.pred_home != null ? `${pred.pred_home}–${pred.pred_away}` : '—'
      const matchLabel = `${tla(match.home)} – ${tla(match.away)}`
      const groupLabel = match.poule ? `Groep ${match.poule}` : match.phase || ''

      html += `
        <div class="pd-match-row">
          <div class="pd-match-info">
            <div class="pd-match-name">${matchLabel}</div>
            <div class="pd-match-sub">Voorspelling: ${predStr}${groupLabel ? ' · ' + groupLabel : ''}</div>
          </div>
          <div class="pd-match-right">
            <div class="pd-match-result">${match.score_home}–${match.score_away}</div>
            <div class="pd-match-pts" style="color:${ptsColor}">${ptsLabel} ptn</div>
          </div>
        </div>
      `
    })
    html += `</div>`
  }

  body.innerHTML = html
  document.getElementById('pd-close-btn').addEventListener('click', closeParticipantDetail)
  document.getElementById('pd-backdrop').addEventListener('click', closeParticipantDetail, { once: true })
}

function closeParticipantDetail() {
  document.getElementById('participant-detail-overlay').classList.add('hidden')
  document.body.style.overflow = ''
}

const KNOCKOUT_PHASES = new Set(['zestiende finale', 'achtste finale', 'kwartfinale', 'halve finale', 'kleine finale', 'finale', 'knockout'])
function isKnockout(match) { return KNOCKOUT_PHASES.has(match.phase) }

function koTeamShort(name) {
  if (!name) return '?'
  return name
    .replace(/Winnaar Groep/gi, 'Win.')
    .replace(/Tweede Groep/gi, '2e')
    .replace(/Derde Groep/gi, '3e')
    .replace(/Beste derde/gi, 'Beste 3e')
}

const PHASE_COLORS = {
  'zestiende finale':    { bg: 'rgba(14,165,233,0.15)',  border: 'rgba(14,165,233,0.4)',  text: '#38bdf8' },
  'achtste finale':{ bg: 'rgba(29,182,138,0.15)',  border: 'rgba(29,182,138,0.4)',  text: '#34d399' },
  'kwartfinale':   { bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.4)',  text: '#fb923c' },
  'halve finale':  { bg: 'rgba(255,77,109,0.15)',  border: 'rgba(255,77,109,0.4)',  text: '#ff6b8a' },
  'kleine finale': { bg: 'rgba(180,138,245,0.15)', border: 'rgba(180,138,245,0.4)', text: '#b48af5' },
  'finale':        { bg: 'rgba(255,184,0,0.2)',    border: 'rgba(255,184,0,0.5)',   text: '#ffb800' },
}

function calcPoints(match, pred) {
  if (pred.pred_home == null || pred.pred_away == null) return 0
  const ko = isKnockout(match)
  const base = ko ? 6 : 3
  if (match.score_home === pred.pred_home && match.score_away === pred.pred_away) return base + (ko ? 4 : 2)
  const mw = Math.sign(match.score_home - match.score_away)
  const pw = Math.sign(pred.pred_home  - pred.pred_away)
  if (mw !== pw) return 0
  const mDiff = match.score_home - match.score_away
  const pDiff = pred.pred_home  - pred.pred_away
  return base + (mDiff === pDiff ? (ko ? 2 : 1) : 0)
}

// ── Auth ──────────────────────────────────────────────────

async function init() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  if (token) {
    await loginWithToken(token)
  } else {
    const stored = localStorage.getItem('wkpool_participant')
    if (stored) {
      currentParticipant = JSON.parse(stored)
      showApp()
    } else {
      showLogin()
    }
  }
}

async function loginWithToken(token) {
  const { data, error } = await supabase
    .from('participants').select('*').eq('token', token).single()

  if (error || !data) {
    document.getElementById('login-section').innerHTML = `
      <div class="login-card">
        <div class="login-logo">⚠️</div>
        <div class="login-title">Ongeldige link</div>
        <p class="login-subtitle">Neem contact op met de beheerder voor een geldige uitnodigingslink.</p>
      </div>
    `
    return
  }

  currentParticipant = data
  localStorage.setItem('wkpool_participant', JSON.stringify(data))
  window.history.replaceState({}, '', window.location.pathname)
  showApp()
}

function showLogin() {
  document.getElementById('login-section').classList.remove('hidden')
  document.getElementById('app-section').classList.add('hidden')
}

function showApp() {
  document.getElementById('login-section').classList.add('hidden')
  document.getElementById('app-section').classList.remove('hidden')

  const name = currentParticipant.name
  if (currentParticipant.shirt) shirtStore[currentParticipant.id] = currentParticipant.shirt
  document.getElementById('greeting-name').textContent = `Hoi ${name.split(' ')[0]} 👋`
  document.getElementById('nav-avatar').innerHTML = shirtSvgForP(currentParticipant)

  switchTab('home')
  loadScoreboard(true)
}

// ── Tabs ──────────────────────────────────────────────────

function switchTab(tab) {
  if (tab !== 'matches') {
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null }
    activeGroupFilter = null
  }
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'))
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'))
  document.getElementById(`tab-${tab}`).classList.remove('hidden')
  document.querySelector(`.nav-item[data-tab="${tab}"]`)?.classList.add('active')
  document.getElementById('app-content')?.scrollTo(0, 0)

  if (tab === 'home')       loadHome()
  if (tab === 'scoreboard') loadScoreboard()
  if (tab === 'matches')    loadMatches()
  if (tab === 'bonus')      loadBonus()
}

// ── Home ──────────────────────────────────────────────────

async function loadHome() {
  const [{ data: rawParticipants }, { data: rawMatches }, predictions, { data: bonusPreds }] = await Promise.all([
    supabase.from('participants').select('*'),
    supabase.from('matches').select('*').order('date'),
    fetchAllPredictions(),
    supabase.from('bonus_predictions').select('*'),
  ])
  const participants = rawParticipants
  const matches = normMatches(rawMatches)

  const now = new Date()
  const played = (matches || []).filter(m => m.score_home !== null && m.score_away !== null)
  const datedMatches = (matches || []).filter(m => m.date)
  const firstMatchDate = datedMatches.length > 0 ? new Date(Math.min(...datedMatches.map(m => parseMatchDate(m.date)))) : null
  const globalLocked = firstMatchDate ? now >= firstMatchDate : false

  ;(participants || []).forEach(p => { if (p.shirt) shirtStore[p.id] = p.shirt })
  const freshMe = (participants || []).find(p => p.id === currentParticipant.id)
  if (freshMe?.shirt) { currentParticipant.shirt = freshMe.shirt; localStorage.setItem('wkpool_participant', JSON.stringify(currentParticipant)) }
  document.getElementById('nav-avatar').innerHTML = shirtSvgForP(currentParticipant)

  const actualBonus = calcActualBonus(matches)
  const scores = calcScores((participants || []).filter(p => p.id !== 22), played, predictions)
  scores.forEach(s => {
    const bp = (bonusPreds || []).find(b => b.participant_id === s.id)
    s.bonusPoints = calcBonusPoints(bp, actualBonus)
    s.points += s.bonusPoints
  })
  scores.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'nl'))
  const myScore = scores.find(p => p.id === currentParticipant.id) || { points: 0, exact: 0 }
  let myRank = 1, _r = 1
  scores.forEach((p, i) => {
    if (i > 0 && p.points < scores[i - 1].points) _r = i + 1
    if (p.id === myScore.id) myRank = _r
  })

  document.getElementById('hero-ptn').textContent  = myScore.points
  document.getElementById('hero-rank').textContent = `${myRank}e`

  // Aankondiging knockout & bonus
  const announceEl = document.getElementById('home-announce')
  announceEl.innerHTML = ''
  const koMatches  = (matches || []).filter(m => isKnockout(m) && m.date)
  const firstKo    = koMatches.sort((a, b) => parseMatchDate(a.date) - parseMatchDate(b.date))[0]
  const koLocked   = firstKo ? now >= parseMatchDate(firstKo.date) : false
  const myBonus    = (bonusPreds || []).find(b => b.participant_id === currentParticipant.id)
  if (!koLocked) {
    announceEl.innerHTML = `
      <div class="announce-chips">
        <button class="announce-chip announce-chip-ko" data-tab="matches">
          <div class="announce-chip-icon">⚽</div>
          <div class="announce-chip-label">Knock-outfase</div>
          <div class="announce-chip-sub">Voorspel de zestiende finales</div>
        </button>
        <button class="announce-chip announce-chip-bonus" data-tab="bonus">
          <div class="announce-chip-icon">⭐</div>
          <div class="announce-chip-label">Extraatjes</div>
          <div class="announce-chip-sub">Wie haalt de (halve) finales, en wie wint het WK?</div>
        </button>
      </div>`
    announceEl.querySelectorAll('.announce-chip[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab))
    })
  }

  // Day winners
  const dayWinnerEl = document.getElementById('home-daywinner')
  dayWinnerEl.innerHTML = ''
  const parseDt = str => str instanceof Date ? str : new Date(typeof str === 'string' && !str.includes('+') && !str.endsWith('Z') ? str + '+02:00' : str)
  const pstDate  = dt => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(parseDt(dt))
  const pstToday = pstDate(new Date())
  const pstYday  = pstDate(new Date(Date.now() - 86400000))
  const localToday = new Intl.DateTimeFormat('en-CA').format(new Date())
  const localYday  = new Intl.DateTimeFormat('en-CA').format(new Date(Date.now() - 86400000))

  const playedWithDate = played.filter(m => m.date)
  if (playedWithDate.length > 0) {
    const byDate = {}
    playedWithDate.forEach(m => {
      const key = pstDate(m.date)
      if (!byDate[key]) byDate[key] = []
      byDate[key].push(m)
    })

    const completeDates = Object.keys(byDate).sort().filter(date => {
      const allOnDate = (matches || []).filter(m => m.date && pstDate(m.date) === date)
      return allOnDate.length > 0 && allOnDate.every(m => m.score_home !== null)
    })

    if (completeDates.length > 0) {
      const predsByP = {}
      ;(predictions || []).forEach(p => {
        if (!predsByP[p.participant_id]) predsByP[p.participant_id] = {}
        predsByP[p.participant_id][p.match_id] = p
      })
      const activeP = (participants || []).filter(p => p.id !== 22)

      const tilesHtml = [...completeDates].reverse().map(date => {
        const dayMatches = byDate[date]
        const dayScores = activeP.map(p => {
          let pts = 0
          dayMatches.forEach(m => { const pr = predsByP[p.id]?.[m.id]; if (pr) pts += calcPoints(m, pr) })
          return { ...p, dayPts: pts }
        }).sort((a, b) => b.dayPts - a.dayPts)

        const maxPts = dayScores[0]?.dayPts
        if (!maxPts) return ''
        const winners = dayScores.filter(p => p.dayPts === maxPts)

        const dateLabel = date === localToday ? 'Vandaag'
          : date === localYday ? 'Gisteren'
          : new Date(date + 'T12:00:00Z').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })

        const winnersHtml = winners.map(w => `
          <div class="dw-tile-winner">
            <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#9b6de8,#ff4d6d);padding:2px;flex-shrink:0">
              <div style="width:100%;height:100%;border-radius:50%;background:#1a1a24;overflow:hidden">${shirtSvgForP(w)}</div>
            </div>
            <span class="dw-tile-name">${w.name.split(' ')[0]}${w.id === currentParticipant.id ? ' ★' : ''}</span>
          </div>`).join('')
        const extra = ''

        return `
          <div class="dw-tile">
            <div class="dw-tile-date">${dateLabel}</div>
            ${winnersHtml}${extra}
            <div class="dw-tile-pts">+${maxPts} <span>ptn</span></div>
          </div>`
      }).join('')

      if (tilesHtml.trim()) {
        dayWinnerEl.innerHTML = `
          <div class="section-title" style="margin-bottom:4px"><span>🏆 Dagwinnaars</span></div>
          <div class="dw-scroll">${tilesHtml}</div>`
      }
    }
  }

  const myPredMap = {}
  ;(predictions || []).filter(p => p.participant_id === currentParticipant.id)
    .forEach(p => { myPredMap[p.match_id] = p })

  // Match tiles: open + recently played
  const tilesEl = document.getElementById('home-tiles')
  tilesEl.innerHTML = ''

  const openMatches = (matches || []).filter(m => m.score_home === null && m.score_away === null && m.date)
  const nextDate = openMatches.length > 0
    ? parseMatchDate(openMatches[0].date).toDateString()
    : null
  const tileMatches = nextDate
    ? openMatches.filter(m => parseMatchDate(m.date).toDateString() === nextDate)
    : []

  if (tileMatches.length === 0) {
    tilesEl.innerHTML = '<p style="color:var(--text-dim);font-size:13px;padding:4px 0">Geen wedstrijden</p>'
  } else {
    tileMatches.forEach(m => {
      const isLocked = globalLocked || (m.date && now >= parseMatchDate(m.date))
      const isPlayed = m.score_home !== null && m.score_away !== null
      tilesEl.appendChild(buildMatchTile(m, myPredMap[m.id] || {}, isLocked, isPlayed))
    })
  }

  // Laatste resultaten
  const allResults = [...played].reverse()
  const resultsEl = document.getElementById('home-results')
  resultsEl.innerHTML = ''

  if (allResults.length === 0) {
    resultsEl.innerHTML = '<p class="empty-state">Nog geen gespeelde wedstrijden</p>'
  } else {
    const initial = 3
    allResults.slice(0, initial).forEach(m => resultsEl.appendChild(buildResultItem(m, myPredMap[m.id])))

    if (allResults.length > initial) {
      const more = allResults.slice(initial)
      const moreBtn = document.createElement('button')
      moreBtn.className = 'detail-btn'
      moreBtn.style.cssText = 'width:100%;margin-top:6px;text-align:center'
      moreBtn.textContent = `Toon meer (${more.length})`
      moreBtn.addEventListener('click', () => {
        more.forEach(m => resultsEl.insertBefore(buildResultItem(m, myPredMap[m.id]), moreBtn))
        moreBtn.remove()
      })
      resultsEl.appendChild(moreBtn)
    }
  }
}

// ── Scoreboard ────────────────────────────────────────────

async function loadScoreboard(silent = false) {
  const [{ data: participants }, { data: rawSbMatches }, predictions, { data: bonusPreds }] = await Promise.all([
    supabase.from('participants').select('*'),
    supabase.from('matches').select('*'),
    fetchAllPredictions(),
    supabase.from('bonus_predictions').select('*'),
  ])
  const matches = normMatches(rawSbMatches)
  const actualBonus = calcActualBonus(matches)

  ;(participants || []).forEach(p => { if (p.shirt) shirtStore[p.id] = p.shirt })
  const played = (matches || []).filter(m => m.score_home !== null && m.score_away !== null)
    .sort((a, b) => (a.date ? parseMatchDate(a.date) : 0) - (b.date ? parseMatchDate(b.date) : 0))
  const scores = calcScores((participants || []).filter(p => p.id !== 22), played, predictions)
  scores.forEach(s => {
    const bp = (bonusPreds || []).find(b => b.participant_id === s.id)
    s.bonusPoints = calcBonusPoints(bp, actualBonus)
    s.points += s.bonusPoints
  })
  scores.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'nl'))

  // Previous ranks: standings without the last played match
  const prevRankMap = {}
  if (played.length > 1) {
    const prevScores = calcScores((participants || []).filter(p => p.id !== 22), played.slice(0, -1), predictions)
    let pr = 1
    prevScores.forEach((p, i) => {
      if (i > 0 && p.points < prevScores[i - 1].points) pr = i + 1
      prevRankMap[p.id] = pr
    })
  }

  sbCache = { participants: participants || [], matches: matches || [], played, predictions: predictions || [], scores }
  if (silent) return

  switchSbTab('stand')
  document.getElementById('sb-sub').textContent = `WK Pool 2026 · ${scores.length} deelnemers`

  // Podium: order [2nd, 1st, 3rd]
  const podPositions = [
    { player: scores[1], rank: 2, cls: 'pod-2nd' },
    { player: scores[0], rank: 1, cls: 'pod-1st' },
    { player: scores[2], rank: 3, cls: 'pod-3rd' },
  ]

  const podiumEl = document.getElementById('podium-row')
  podiumEl.innerHTML = ''

  podPositions.forEach(({ player, rank, cls }) => {
    const pod = document.createElement('div')
    pod.className = `pod ${cls}`

    if (!player) {
      pod.innerHTML = `
        <div class="pod-avatar" style="background:var(--bg3);border:1px dashed var(--border)">—</div>
        <div class="pod-name" style="color:var(--text-dim)">—</div>
        <div class="pod-pts" style="color:var(--text-dim)">—</div>
        <div class="pod-base"></div>
      `
    } else {
      pod.style.cursor = 'pointer'
      pod.addEventListener('click', () => openParticipantDetail(player))
      const isMe    = player.id === currentParticipant.id
      const crown   = rank === 1 ? '<span class="pod-crown">👑</span>' : ''
      const ptColor = rank === 1 ? 'var(--amber)' : rank === 2 ? 'var(--purple-l)' : 'var(--pink)'

      pod.innerHTML = `
        <div class="pod-avatar" style="background:linear-gradient(135deg,#9b6de8,#ff4d6d);padding:2px;position:relative">
          <div style="width:100%;height:100%;border-radius:50%;background:#1a1a24;overflow:hidden">${shirtSvgForP(player)}</div>
          ${crown}
        </div>
        <div class="pod-name">${player.name.split(' ')[0]}${isMe ? ' (jij)' : ''}</div>
        <div class="pod-pts" style="color:${ptColor}">${player.points}</div>
        <div class="pod-base"></div>
      `
    }
    podiumEl.appendChild(pod)
  })

  // Global max/min per round across all players
  const roundGlobal = {}
  scores.forEach(p => {
    if (!p.roundPts) return
    Object.entries(p.roundPts).forEach(([r, v]) => {
      if (!roundGlobal[r]) roundGlobal[r] = { max: v, min: v }
      else { roundGlobal[r].max = Math.max(roundGlobal[r].max, v); roundGlobal[r].min = Math.min(roundGlobal[r].min, v) }
    })
  })

  // Leaderboard list (all, with tied ranks)
  const lbEl = document.getElementById('lb-list')
  lbEl.innerHTML = ''
  let rank = 1
  scores.forEach((p, i) => {
    if (i > 0 && p.points < scores[i - 1].points) rank = i + 1
    const prevRank = prevRankMap[p.id]
    const rankDelta = prevRank != null ? prevRank - rank : 0
    lbEl.appendChild(buildLbItem(p, rank, rankDelta, roundGlobal))
  })
}

function switchMatchTab(tab) {
  document.querySelectorAll('.sb-tab-btn[data-mtab]').forEach(b => b.classList.toggle('active', b.dataset.mtab === tab))
  document.getElementById('mtab-poule')?.classList.toggle('hidden', tab !== 'poule')
  document.getElementById('mtab-knockout')?.classList.toggle('hidden', tab !== 'knockout')
}

function switchSbTab(tab) {
  document.querySelectorAll('.sb-tab-btn[data-sbtab]').forEach(b => b.classList.toggle('active', b.dataset.sbtab === tab))
  document.getElementById('sbtab-stand')?.classList.toggle('hidden', tab !== 'stand')
  document.getElementById('sbtab-historie')?.classList.toggle('hidden', tab !== 'historie')
  document.getElementById('sbtab-regels')?.classList.toggle('hidden', tab !== 'regels')
  if (tab === 'historie' && sbCache) renderHistorieChart(sbCache)
}

function renderHistorieChart({ participants, played, predictions }) {
  const legendEl = document.getElementById('chart-legend')
  const wrapEl   = document.getElementById('chart-wrap')
  if (!legendEl || !wrapEl) return

  const sorted = [...played].sort((a, b) => {
    const da = a.date ? parseMatchDate(a.date) : 0
    const db = b.date ? parseMatchDate(b.date) : 0
    return da - db
  })

  if (sorted.length === 0) {
    wrapEl.innerHTML = '<p style="color:var(--text-dim);font-size:13px;padding:12px 0">Nog geen gespeelde wedstrijden.</p>'
    legendEl.innerHTML = ''
    return
  }

  const players = participants.filter(p => p.id !== 22)

  const predMaps = {}
  players.forEach(p => {
    predMaps[p.id] = {}
    predictions.filter(pr => pr.participant_id === p.id)
      .forEach(pr => { predMaps[p.id][pr.match_id] = pr })
  })

  const colorStride = Math.ceil(CHART_COLORS.length / 3) // 5 for 14 colors — coprime, so all are used
  const playerData = players.map(p => {
    let cum = 0
    const values = [0]
    sorted.forEach(match => {
      const pred = predMaps[p.id][match.id]
      cum += pred ? calcPoints(match, pred) : 0
      values.push(cum)
    })
    return { ...p, values }
  }).sort((a, b) => b.values.at(-1) - a.values.at(-1) || a.name.localeCompare(b.name, 'nl'))
    .map((p, pi) => ({ ...p, color: CHART_COLORS[(pi * colorStride) % CHART_COLORS.length] }))

  const N = sorted.length
  const MAX_VISIBLE = 15
  const startIdx = Math.max(0, N - MAX_VISIBLE)
  const visibleN = N - startIdx

  const PAD_L = 30, PAD_R = 30, PAD_T = 16, PAD_B = 28
  const stepX = 36
  const W = PAD_L + visibleN * stepX + PAD_R
  const H = 260
  const drawH = H - PAD_T - PAD_B

  const visibleMax = Math.max(...playerData.map(p => p.values[N]), 10)
  const visibleMin = Math.min(...playerData.map(p => p.values[startIdx]))
  const range = visibleMax - visibleMin || 10
  const scaleY = drawH / (range * 1.05)
  const yBottom = visibleMin - range * 0.025

  const rawStep = range / 4
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep || 1)))
  const tickStep = Math.ceil(rawStep / mag) * mag
  const yMax = Math.ceil(visibleMax / tickStep) * tickStep || tickStep
  const yMinTick = Math.floor(yBottom / tickStep) * tickStep
  const ticks = []
  for (let v = yMinTick; v <= yMax; v += tickStep) ticks.push(v)

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">`

  ticks.forEach(v => {
    const y = (PAD_T + drawH - (v - yBottom) * scaleY).toFixed(1)
    if (+y < PAD_T || +y > PAD_T + drawH) return
    svg += `<line x1="${PAD_L}" y1="${y}" x2="${W - PAD_R}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`
    svg += `<text x="${PAD_L - 5}" y="${(+y + 4).toFixed(1)}" text-anchor="end" font-family="Poppins,sans-serif" font-size="9" fill="rgba(255,255,255,0.28)">${v}</text>`
    svg += `<text x="${W - PAD_R + 5}" y="${(+y + 4).toFixed(1)}" text-anchor="start" font-family="Poppins,sans-serif" font-size="9" fill="rgba(255,255,255,0.28)">${v}</text>`
  })

  const xAxisY = (PAD_T + drawH).toFixed(1)
  svg += `<line x1="${PAD_L}" y1="${xAxisY}" x2="${W - PAD_R}" y2="${xAxisY}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`

  for (let j = 0; j <= visibleN; j++) {
    const i = startIdx + j
    if (j === 0 || j === visibleN || j % 5 === 0) {
      const x = (PAD_L + j * stepX).toFixed(1)
      svg += `<text x="${x}" y="${H - 8}" text-anchor="middle" font-family="Poppins,sans-serif" font-size="9" fill="rgba(255,255,255,0.28)">${i}</text>`
    }
  }

  // Draw non-me first so current user renders on top
  const ordered = [...playerData].sort((a, b) => {
    if (a.id === currentParticipant.id) return 1
    if (b.id === currentParticipant.id) return -1
    return 0
  })

  ordered.forEach(p => {
    const isMe = p.id === currentParticipant.id
    const pts = p.values.slice(startIdx).map((v, j) => {
      const x = (PAD_L + j * stepX).toFixed(1)
      const y = (PAD_T + drawH - (v - yBottom) * scaleY).toFixed(1)
      return `${x},${y}`
    }).join(' ')

    const lastX = (PAD_L + visibleN * stepX).toFixed(1)
    const lastV = p.values[N]
    const lastY = (PAD_T + drawH - (lastV - yBottom) * scaleY).toFixed(1)

    svg += `<polyline points="${pts}" fill="none" stroke="${p.color}" stroke-width="${isMe ? 2.5 : 1.5}" stroke-opacity="${isMe ? 1 : 0.6}" stroke-linejoin="round" stroke-linecap="round"/>`
    svg += `<circle cx="${lastX}" cy="${lastY}" r="${isMe ? 4 : 3}" fill="${p.color}" opacity="${isMe ? 1 : 0.75}"/>`
  })

  svg += '</svg>'
  wrapEl.innerHTML = svg
  wrapEl.scrollLeft = wrapEl.scrollWidth

  legendEl.innerHTML = playerData.map(p => {
    const isMe = p.id === currentParticipant.id
    return `<div class="chart-legend-item">
      <div class="chart-legend-dot" style="background:${p.color}${isMe ? ';box-shadow:0 0 5px ' + p.color : ''}"></div>
      <span style="${isMe ? 'color:var(--text);font-weight:700' : 'color:var(--text-mid)'}">${p.name.split(' ')[0]}${isMe ? ' (jij)' : ''}</span>
    </div>`
  }).join('')
}

// ── Matches ───────────────────────────────────────────────

let countdownInterval = null
let activeGroupFilter = null
let groupColorMap = {}
let sbCache = null

const GROUP_COLORS = [
  { bg: 'rgba(155,109,232,0.15)', border: 'rgba(155,109,232,0.4)', text: '#b48af5' }, // purple
  { bg: 'rgba(255,77,109,0.15)',  border: 'rgba(255,77,109,0.4)',  text: '#ff6b8a' }, // pink
  { bg: 'rgba(0,212,170,0.15)',   border: 'rgba(0,212,170,0.4)',   text: '#00d4aa' }, // teal
  { bg: 'rgba(255,184,0,0.15)',   border: 'rgba(255,184,0,0.4)',   text: '#ffb800' }, // amber
  { bg: 'rgba(14,165,233,0.15)',  border: 'rgba(14,165,233,0.4)',  text: '#38bdf8' }, // blue
  { bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.4)',  text: '#fb923c' }, // orange
  { bg: 'rgba(29,182,138,0.15)',  border: 'rgba(29,182,138,0.4)',  text: '#34d399' }, // green
  { bg: 'rgba(236,72,153,0.15)',  border: 'rgba(236,72,153,0.4)',  text: '#f472b6' }, // rose
  { bg: 'rgba(124,92,191,0.15)',  border: 'rgba(124,92,191,0.4)',  text: '#a78bfa' }, // violet
  { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)',   text: '#f87171' }, // red
  { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.4)',  text: '#6ee7b7' }, // emerald
  { bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.4)',  text: '#818cf8' }, // indigo
]

async function loadMatches() {
  switchMatchTab('knockout')
  const container = document.getElementById('all-matches-list')
  container.innerHTML = '<p class="empty-state">Laden…</p>'

  const [{ data: rawMatchData }, { data: predictions }] = await Promise.all([
    supabase.from('matches').select('*').order('date'),
    supabase.from('predictions').select('*').eq('participant_id', currentParticipant.id),
  ])
  const matches = normMatches(rawMatchData)

  if (!matches || matches.length === 0) {
    container.innerHTML = '<p class="empty-state">Nog geen wedstrijden toegevoegd</p>'
    return
  }

  const datedMatches = matches.filter(m => m.date)
  const firstMatchDate = datedMatches.length > 0
    ? new Date(Math.min(...datedMatches.map(m => parseMatchDate(m.date))))
    : null

  const now = new Date()
  const globalLocked = firstMatchDate ? now >= firstMatchDate : false

  const predMap = {}
  predictions?.forEach(p => { predMap[p.match_id] = p })

  const groups = [...new Set(matches.map(m => m.poule).filter(Boolean))].sort()
  groupColorMap = {}
  groups.forEach((g, i) => { groupColorMap[g] = GROUP_COLORS[i % GROUP_COLORS.length] })
  buildGroupFilters(groups)

  const groupMatches    = matches.filter(m => m.poule)
  const knockoutMatches = matches.filter(m => isKnockout(m))

  const KO_PHASE_ORDER = ['zestiende finale', 'achtste finale', 'kwartfinale', 'halve finale', 'kleine finale', 'finale']
  const phaseLockDate = {}
  const phaseFirstMatch = {}
  KO_PHASE_ORDER.forEach(phase => {
    const sorted = knockoutMatches.filter(m => m.phase === phase && m.date).sort((a, b) => parseMatchDate(a.date) - parseMatchDate(b.date))
    if (sorted.length) { phaseFirstMatch[phase] = sorted[0]; phaseLockDate[phase] = parseMatchDate(sorted[0].date) }
  })
  const isPhaseLockedFor = m => m.phase && phaseLockDate[m.phase] ? now >= phaseLockDate[m.phase] : false

  const nextOpenPhase = KO_PHASE_ORDER.find(phase => phaseLockDate[phase] && now < phaseLockDate[phase])
  const nextOpenKo    = nextOpenPhase ? phaseFirstMatch[nextOpenPhase] : null
  const knockoutLockDate = nextOpenKo ? phaseLockDate[nextOpenPhase] : null
  const knockoutLocked   = !nextOpenKo && knockoutMatches.length > 0
  const _flagSm = (name, stored) => flag(name, stored).replace('class="flag-img"', 'style="height:15px;vertical-align:middle;border-radius:2px;margin-right:3px"')
  const PHASE_NL = { 'zestiende finale': 'de Zestiende finale', 'achtste finale': 'de Achtste Finales', 'kwartfinale': 'de Kwartfinales', 'halve finale': 'de Halve Finales', 'kleine finale': 'de Kleine Finale', 'finale': 'de Finale' }
  const KO_PHASE_LABEL = { 'zestiende finale': 'de 16e finales','achtste finale': 'de achtste finales', 'kwartfinale': 'de kwartfinales', 'halve finale': 'de halve finales', 'kleine finale': 'de kleine finale', 'finale': 'de finale' }
  const nextKoLabel = nextOpenPhase ? (KO_PHASE_LABEL[nextOpenPhase] || nextOpenPhase) : null

  startCountdown(firstMatchDate, globalLocked, 'matches-countdown')
  startCountdown(knockoutLockDate, knockoutLocked, 'ko-countdown', nextKoLabel)

  container.innerHTML = ''
  let firstUpcomingCard = null
  groupMatches.forEach(match => {
    const pred     = predMap[match.id] || {}
    const isPlayed = match.score_home !== null && match.score_away !== null
    const isLocked = !isPlayed && globalLocked
    const card = buildMatchCard(match, pred, isPlayed, isLocked)
    card.dataset.group = match.poule || ''
    if (activeGroupFilter && match.poule !== activeGroupFilter) card.classList.add('hidden')
    if (!isPlayed && !firstUpcomingCard) firstUpcomingCard = card
    container.appendChild(card)
  })

  const koContainer = document.getElementById('knockout-matches-list')
  if (koContainer) {
    koContainer.innerHTML = ''
    if (knockoutMatches.length === 0) {
      koContainer.innerHTML = '<p class="empty-state" style="padding:24px 16px">Knock-outwedstrijden worden hier getoond zodra de poulefase klaar is.</p>'
    } else {
      knockoutMatches.forEach(match => {
        const pred     = predMap[match.id] || {}
        const isPlayed = match.score_home !== null && match.score_away !== null
        const matchStarted = isPhaseLockedFor(match)
        const teamsKnown = match.home && match.home !== '?' && match.away && match.away !== '?'
        const isLocked = !isPlayed && (matchStarted || !teamsKnown)
        const card = buildMatchCard(match, pred, isPlayed, isLocked)
        koContainer.appendChild(card)
      })
    }
  }

  if (firstUpcomingCard) {
    requestAnimationFrame(() => {
      const appContent = document.getElementById('app-content')
      if (!appContent) return
      const cardRect = firstUpcomingCard.getBoundingClientRect()
      const containerRect = appContent.getBoundingClientRect()
      appContent.scrollTo({ top: appContent.scrollTop + cardRect.top - containerRect.top - 16, behavior: 'smooth' })
    })
  }
}

function buildGroupFilters(groups) {
  const el = document.getElementById('group-filters')
  if (!el) return
  el.innerHTML = ''


  const allBtn = document.createElement('button')
  allBtn.className = `gf-btn${activeGroupFilter === null ? ' active' : ''}`
  allBtn.textContent = 'Alle'
  allBtn.addEventListener('click', () => setGroupFilter(null, groupColorMap))
  el.appendChild(allBtn)

  groups.forEach(group => {
    const c = groupColorMap[group]
    const btn = document.createElement('button')
    btn.className = `gf-btn${activeGroupFilter === group ? ' active' : ''}`
    btn.textContent = `Groep ${group}`
    btn.dataset.group = group
    if (activeGroupFilter === group) {
      btn.style.cssText = `background:${c.bg};border-color:${c.border};color:${c.text}`
    }
    btn.addEventListener('click', () => setGroupFilter(group, groupColorMap))
    el.appendChild(btn)
  })
}

function setGroupFilter(group, groupColorMap) {
  activeGroupFilter = group
  document.querySelectorAll('#all-matches-list .match-card').forEach(card => {
    const show = group === null || card.dataset.group === group
    card.classList.toggle('hidden', !show)
  })
  document.querySelectorAll('.gf-btn').forEach(btn => {
    const isActive = (btn.dataset.group ?? null) === group ||
                     (btn.textContent === 'Alle' && group === null)
    btn.classList.toggle('active', isActive)
    if (btn.dataset.group && groupColorMap) {
      const c = groupColorMap[btn.dataset.group]
      btn.style.cssText = isActive ? `background:${c.bg};border-color:${c.border};color:${c.text}` : ''
    } else if (!btn.dataset.group) {
      btn.style.cssText = ''
    }
  })
}

function startCountdown(firstMatchDate, globalLocked, elementId = 'matches-countdown', matchLabel = null) {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null }

  const el = document.getElementById(elementId)
  if (!el) return

  if (globalLocked) {
    el.innerHTML = '<span class="countdown-locked">⛔ Voorspellingen zijn gesloten</span>'
    return
  }

  if (!firstMatchDate) { el.innerHTML = ''; return }

  const labelPrefix = matchLabel ? `Zo lang kun je ${matchLabel} nog voorspellen` : ''
  const sluitVerb   = matchLabel ? ':' : '⏱ Sluit over'

  function tick() {
    const diff = firstMatchDate - new Date()
    if (diff <= 0) {
      clearInterval(countdownInterval)
      countdownInterval = null
      el.innerHTML = '<span class="countdown-locked">⛔ Voorspellingen zijn gesloten</span>'
      loadMatches()
      return
    }
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000)  / 60000)
    const s = Math.floor((diff % 60000)    / 1000)
    const pad = n => String(n).padStart(2, '0')
    const timeStr = d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`
    el.innerHTML = `${labelPrefix}${sluitVerb} <span class="countdown-time">${timeStr}</span>`
  }

  tick()
  countdownInterval = setInterval(tick, 1000)
}

// ── Builders ──────────────────────────────────────────────

function buildMatchTile(match, pred, isLocked, isPlayed) {
  const tile = document.createElement('div')
  let statusCls, badgeHtml

  if (isPlayed) {
    statusCls = 't-played'
    const pts = calcPoints(match, pred)
    const maxExact = isKnockout(match) ? 10 : 5
    badgeHtml = `<div class="tile-badge">${pts === maxExact ? '⚡ Exact' : pts > 0 ? '✓ Goed' : '✗ Mis'}</div>`
  } else if (isLocked) {
    statusCls = 't-locked'
    badgeHtml = ''
  } else {
    statusCls = 't-open'
    badgeHtml = '<div class="tile-badge"><span class="live-dot"></span> Open</div>'
  }

  tile.className = `match-tile ${statusCls}`

  const hasPred = pred.pred_home != null

  let homeScore = '?', awayScore = '?'
  if (isPlayed) { homeScore = match.score_home; awayScore = match.score_away }
  else if (hasPred) { homeScore = pred.pred_home; awayScore = pred.pred_away }

  tile.innerHTML = `
    ${badgeHtml}
    <div class="tile-teams">
      <div class="tile-flag">${flag(match.home, match.home_flag)}</div>
      <div class="tile-vs">-</div>
      <div class="tile-flag">${flag(match.away, match.away_flag)}</div>
    </div>
    <div class="tile-scores">
      <div>
        <div class="tile-score-num">${homeScore}</div>
        <div class="tile-score-lbl">${tla(match.home)}</div>
      </div>
      <div style="text-align:right">
        <div class="tile-score-num">${awayScore}</div>
        <div class="tile-score-lbl">${tla(match.away)}</div>
      </div>
    </div>
  `
  tile.addEventListener('click', () => openMatchDetail(match))
  return tile
}

function buildResultItem(match, pred) {
  const item = document.createElement('div')
  item.className = 'upcoming-item'
  const pts      = pred?.pred_home != null ? calcPoints(match, pred) : null
  const maxExact = isKnockout(match) ? 10 : 5
  const ptsColor = pts === null ? 'var(--text-dim)'
    : pts >= maxExact ? 'var(--teal)' : pts === 4 ? '#38bdf8' : pts > 0 ? 'var(--purple-l)' : 'var(--pink)'
  const ptsLabel = pts === null ? '—' : `+${pts}`
  const predStr  = pred?.pred_home != null ? `${pred.pred_home}–${pred.pred_away}` : '—'

  const draw = match.score_home === match.score_away
  const homeWon = match.score_home > match.score_away
  const iconContent = draw
    ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;clip-path:polygon(0 0,100% 0,0 100%)">${flag(match.home, match.home_flag)}</div>
       <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;clip-path:polygon(100% 0,100% 100%,0 100%)">${flag(match.away, match.away_flag)}</div>`
    : homeWon
      ? flag(match.home, match.home_flag)
      : flag(match.away, match.away_flag)

  item.innerHTML = `
    <div class="upcoming-icon${draw ? ' icon-draw' : ' icon-result'}" style="background:${tileColor(match.id)};${draw ? 'position:relative;overflow:hidden' : 'display:flex;align-items:center;justify-content:center'}">${iconContent}</div>
    <div class="upcoming-info">
      <div class="upcoming-name">${match.home || '?'} vs ${match.away || '?'}</div>
      <div class="upcoming-sub">Uitslag: ${match.score_home}–${match.score_away} · Jij: ${predStr}</div>
    </div>
    <div class="upcoming-right" style="align-items:flex-end">
      <span style="font-size:15px;font-weight:800;color:${ptsColor}">${ptsLabel}</span>
      <span style="font-size:10px;color:var(--text-dim)">ptn</span>
    </div>
  `
  item.addEventListener('click', () => openMatchDetail(match))
  return item
}

function buildUpcomingItem(match, hasPred) {
  const item = document.createElement('div')
  item.className = 'upcoming-item'
  item.innerHTML = `
    <div class="upcoming-icon" style="background:${tileColor(match.id)}">${flag(match.home, match.home_flag)}</div>
    <div class="upcoming-info">
      <div class="upcoming-name">${match.home || '?'} vs ${match.away || '?'}</div>
      <div class="upcoming-sub">${match.date ? formatDate(match.date) : ''} · ${match.poule || 'Groepsfase'}</div>
    </div>
    <div class="upcoming-right">
      <span>${hasPred ? '✓' : 'Open'}</span>
      <div class="upcoming-dot${hasPred ? ' done' : ''}"></div>
    </div>
  `
  item.addEventListener('click', () => switchTab('matches'))
  return item
}

function buildLbItem(p, rank, rankDelta = 0, roundGlobal = {}) {
  const isMe = p.id === currentParticipant.id
  const item = document.createElement('div')
  item.className = `lb-item${isMe ? ' me' : ''}`
  item.addEventListener('click', () => openParticipantDetail(p))

  let formHtml = ''
  if (p.form && p.form.length > 0) {
    const dots = p.form.map(pts => {
      const cls = pts === 0 ? 'lfd-miss' : pts >= 5 ? 'lfd-great' : pts === 4 ? 'lfd-blue' : 'lfd-some'
      return `<div class="lb-form-dot ${cls}">${pts}</div>`
    }).join('')
    formHtml = `<div class="lb-form">${dots}</div>`
  }

  const ROUND_ORDER = ['GF R1', 'GF R2', 'GF R3', 'zestiende finale', 'achtste finale', 'kwartfinale', 'halve finale', 'kleine finale', 'finale']
  const ROUND_LABEL = { 'GF R1': 'R1', 'GF R2': 'R2', 'GF R3': 'R3', 'zestiende finale': 'ZF', 'achtste finale': 'AF', 'kwartfinale': 'KF', 'halve finale': 'HF', 'kleine finale': 'KL', 'finale': 'F' }
  const activeRounds = p.roundPts ? ROUND_ORDER.filter(r => p.roundPts[r] != null) : []
  const roundVals = activeRounds.map(r => p.roundPts[r])
  const maxVal = activeRounds.length > 1 ? Math.max(...roundVals) : null
  const minVal = activeRounds.length > 1 ? Math.min(...roundVals) : null
  const roundRows = activeRounds.map(r => {
    const v = p.roundPts[r]
    const color = v === maxVal ? 'var(--teal)' : v === minVal ? 'var(--pink)' : 'rgba(255,255,255,0.7)'
    const g = roundGlobal[r]
    const badge = g && g.max !== g.min ? (v === g.max ? '🔥' : v === g.min ? '🧊' : '') : ''
    return `<div class="lb-rnd-row"><span>${ROUND_LABEL[r]}</span><b style="color:${color}">${v}</b>${badge ? `<span style="font-size:10px;line-height:1;color:initial">${badge}</span>` : ''}</div>`
  }).join('')
  const roundHtml = roundRows ? `<div class="lb-rnd-stack">${roundRows}</div>` : ''

  const arrowHtml = rankDelta > 0
    ? `<span style="font-size:10px;color:var(--teal);line-height:1">▲</span>`
    : rankDelta < 0
    ? `<span style="font-size:10px;color:var(--pink);line-height:1">▼</span>`
    : ''

  item.innerHTML = `
    <div class="lb-num${isMe ? ' is-me' : ''}" style="display:flex;flex-direction:column;align-items:center;gap:1px">${rank}${arrowHtml}</div>
    <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#9b6de8,#ff4d6d);padding:2px;flex-shrink:0">
      <div style="width:100%;height:100%;border-radius:50%;background:#1a1a24;overflow:hidden">${shirtSvgForP(p)}</div>
    </div>
    <div class="lb-info">
      <div class="lb-nm">${p.name}${isMe ? '<span class="lb-me-tag">jij</span>' : ''}${(p.rocket ? `<span style="font-size:13px;margin-left:3px">🚀</span>` : '') + (p.flames ? `<span style="font-size:13px;margin-left:3px">${'🔥'.repeat(p.flames)}</span>` : p.iceCount ? `<span style="font-size:13px;margin-left:3px">${'🧊'.repeat(p.iceCount)}</span>` : '')}</div>
      ${formHtml}
    </div>
    ${roundHtml}
    <div class="lb-right">
      <div class="lb-pts-val${isMe ? ' is-me' : ''}">${p.points}</div>
      <div class="lb-pts-lbl">punten</div>
    </div>
  `
  return item
}

function buildMatchCard(match, pred, isPlayed, isLocked) {
  const card = document.createElement('div')
  card.className = 'match-card'

  let statusText, statusClass
  const teamsUnknown = !match.home || match.home === '?' || !match.away || match.away === '?'
  if (isPlayed)                    { statusText = 'Gespeeld';     statusClass = 's-played' }
  else if (isLocked && teamsUnknown) { statusText = 'In afwachting'; statusClass = 's-closed' }
  else if (isLocked)               { statusText = 'Gesloten';     statusClass = 's-closed' }
  else                             { statusText = 'Open';         statusClass = 's-open'   }

  const homeFlag = `<div class="match-flag">${flag(match.home, match.home_flag)}</div>`
  const awayFlag = `<div class="match-flag">${flag(match.away, match.away_flag)}</div>`

  const vsMiddle = isPlayed
    ? `<div class="match-vs-score">${match.score_home} – ${match.score_away}</div>`
    : `<div class="match-vs-time">${match.date ? formatDate(match.date) : ''}</div>`

  const _phaseLabel = match.poule ? `Groep ${match.poule}` : match.phase || ''
  const _gc = match.poule && groupColorMap[match.poule] ? groupColorMap[match.poule] : null
  const _pc = !match.poule && match.phase ? PHASE_COLORS[match.phase] : null
  const _phaseCss = (_gc || _pc) ? `style="background:${(_gc||_pc).bg};border-color:${(_gc||_pc).border};color:${(_gc||_pc).text}"` : ''

  card.innerHTML = `
    <div class="match-card-top">
      <span class="match-group" ${_phaseCss}>${_phaseLabel}</span>
      <span class="match-status ${statusClass}">${statusText}</span>
    </div>
    <div class="match-teams-row">
      <div class="match-team">
        ${homeFlag}
        <div class="match-team-name">${match.home || '?'}</div>
      </div>
      <div class="match-vs">
        ${vsMiddle}
      </div>
      <div class="match-team">
        ${awayFlag}
        <div class="match-team-name">${match.away || '?'}</div>
      </div>
    </div>
    <div class="match-bottom" id="mb-${match.id}"></div>
    <button class="detail-btn match-detail-trigger" style="margin-top:10px;width:100%;text-align:center;padding:6px 0;border-top:1px solid rgba(255,255,255,0.05)">Andere voorspellingen →</button>
  `

  card.querySelector('.match-detail-trigger').addEventListener('click', e => {
    e.stopPropagation()
    openMatchDetail(match)
  })

  const bottom = card.querySelector(`#mb-${match.id}`)

  if (isPlayed) {
    const pts = calcPoints(match, pred)
    const maxExact = isKnockout(match) ? 10 : 5
    const base     = isKnockout(match) ? 6 : 3
    const ptLabel  = pts === maxExact ? `⚡ Exact · ${pts} ptn` : pts >= base ? `✓ Goed · ${pts} ptn` : '✗ 0 punten'
    const predStr  = pred.pred_home != null ? `${pred.pred_home}–${pred.pred_away}` : '—'
    bottom.innerHTML = `
      <span class="pts-tag pts-pred">Jouw voorspelling: ${predStr}</span>
      <span class="pts-tag pts-${pts >= maxExact ? 'good' : pts === 4 ? 'blue' : pts > 0 ? 'some' : 'miss'}">${ptLabel}</span>
    `
  } else if (isLocked) {
    const hasPred = pred.pred_home != null
    bottom.innerHTML = `
      <span class="pred-label">Jouw voorspelling</span>
      ${hasPred
        ? `<span class="pred-value">${pred.pred_home} – ${pred.pred_away}</span>`
        : `<span class="pred-empty">—</span>`
      }
    `
  } else {
    const hasPred = pred.pred_home != null
    bottom.innerHTML = `
      <span class="pred-label">Jouw voorspelling</span>
      <div class="pred-form">
        <input type="number" min="0" max="20" value="${pred.pred_home ?? ''}"
          class="score-input" data-match="${match.id}" data-field="pred_home">
        <span class="score-dash">–</span>
        <input type="number" min="0" max="20" value="${pred.pred_away ?? ''}"
          class="score-input" data-match="${match.id}" data-field="pred_away">
        <button class="save-btn${hasPred ? ' edit' : ''}" data-match="${match.id}">
          ${hasPred ? 'Aanpassen' : 'Opslaan'}
        </button>
      </div>
    `
  }

  return card
}

// ── Bonus ─────────────────────────────────────────────────

let _bracketGroups = null

function buildBracketGroups(matches) {
  const isReal = name => name && !/^\?|Win\.|2e |3e |Beste/.test(name)
  const r32 = (matches || [])
    .filter(m => m.phase === 'zestiende finale')
    .sort((a, b) => (a.external_id || 0) - (b.external_id || 0))
  if (r32.length < 8) return null
  const perQ = Math.ceil(r32.length / 4)
  const result = {}
  ;['semi_1', 'semi_2', 'semi_3', 'semi_4'].forEach((key, i) => {
    const s = new Set()
    r32.slice(i * perQ, (i + 1) * perQ).forEach(m => {
      if (isReal(m.home)) s.add(m.home)
      if (isReal(m.away)) s.add(m.away)
    })
    result[key] = s
  })
  return result
}

function buildTeamList(matches) {
  const koMatches = (matches || []).filter(m => isKnockout(m))
  const source = koMatches.length > 0 ? koMatches : matches
  const s = new Set()
  ;(source || []).forEach(m => {
    if (m.home && !/^\?|Win\.|2e |3e |Beste/.test(m.home)) s.add(m.home)
    if (m.away && !/^\?|Win\.|2e |3e |Beste/.test(m.away)) s.add(m.away)
  })
  return [...s].sort((a, b) => a.localeCompare(b, 'nl'))
}

function calcActualBonus(matches) {
  const finale = (matches || []).filter(m => m.phase === 'finale')
  const halve  = (matches || []).filter(m => m.phase === 'halve finale')
  let winner = null
  const finalists = new Set()
  const semis = new Set()
  halve.forEach(m => {
    if (m.home && m.home !== '?') semis.add(m.home)
    if (m.away && m.away !== '?') semis.add(m.away)
  })
  finale.forEach(m => {
    if (m.home && m.home !== '?') { finalists.add(m.home); semis.add(m.home) }
    if (m.away && m.away !== '?') { finalists.add(m.away); semis.add(m.away) }
    if (m.score_home !== null && m.score_away !== null && m.score_home !== m.score_away) {
      winner = m.score_home > m.score_away ? m.home : m.away
    }
  })
  return { winner, finalists, semis }
}

function calcBonusPoints(pred, actual) {
  if (!pred) return 0
  let pts = 0
  if (actual.winner && pred.winner === actual.winner) pts += 8
  ;['finalist_1', 'finalist_2'].forEach(f => { if (pred[f] && actual.finalists.has(pred[f])) pts += 8 })
  ;['semi_1', 'semi_2', 'semi_3', 'semi_4'].forEach(f => { if (pred[f] && actual.semis.has(pred[f])) pts += 5 })
  return pts
}

const BONUS_SLOTS = [
  { key: 'semi_1',      label: '1',  section: '⚽ Halvefinalisten · 5 ptn per team', emoji: '⚽', pts: 5 },
  { key: 'semi_2',      label: '2',  section: null, emoji: '4️⃣', pts: 5 },
  { key: 'semi_3',      label: '3',  section: null, emoji: '4️⃣', pts: 5 },
  { key: 'semi_4',      label: '4',  section: null, emoji: '4️⃣', pts: 5 },
  { key: 'finalist_1',  label: '1',  section: '🎖️ Finalisten · 8 ptn per team', emoji: '🥈', pts: 8 },
  { key: 'finalist_2',  label: '2',  section: null, emoji: '🥈', pts: 8 },
  { key: 'winner',      label: 'Toernooi winnaar', section: '🏆 Winnaar · 8 ptn', emoji: '🏆', pts: 8 },
]

async function loadBonus() {
  const container = document.getElementById('bonus-content')
  container.innerHTML = '<div class="loading-text">Laden…</div>'

  const [{ data: rawMatches }, { data: allBonus }, { data: rawParticipants }] = await Promise.all([
    supabase.from('matches').select('*').order('date'),
    supabase.from('bonus_predictions').select('*'),
    supabase.from('participants').select('*'),
  ])

  const matches = normMatches(rawMatches || [])
  const koMatches = matches.filter(m => isKnockout(m))
  const now = new Date()
  const firstKo = koMatches.filter(m => m.date).sort((a, b) => parseMatchDate(a.date) - parseMatchDate(b.date))[0]
  const lockDate = firstKo ? parseMatchDate(firstKo.date) : null
  const isLocked = lockDate ? now >= lockDate : false

  startCountdown(lockDate, isLocked, 'bonus-countdown')

  const myBonus = (allBonus || []).find(b => b.participant_id === currentParticipant.id) || null
  const actual  = calcActualBonus(matches)
  const teams   = buildTeamList(matches)
  _bonusAllTeams = teams
  _bracketGroups = buildBracketGroups(matches)

  const participantMap = {}
  ;(rawParticipants || []).forEach(p => { participantMap[p.id] = p })

  let html = ''

  // Group BONUS_SLOTS by section
  const sectionGroups = []
  BONUS_SLOTS.forEach(slot => {
    if (slot.section) sectionGroups.push({ title: slot.section, slots: [] })
    sectionGroups[sectionGroups.length - 1].slots.push(slot)
  })

  if (isLocked) {
    sectionGroups.forEach(({ title, slots }) => {
      let slotsHtml = ''
      slots.forEach(({ key, pts }) => {
        const val = myBonus ? myBonus[key] : null
        let tagClass = 'bonus-pts-pending', tagLabel = `${pts} ptn`
        const known = key === 'winner' ? actual.winner
          : key.startsWith('finalist') ? (actual.finalists.size > 0 ? true : false)
          : actual.semis.size > 0
        if (val && known) {
          const hit = key === 'winner' ? actual.winner === val
            : key.startsWith('finalist') ? actual.finalists.has(val)
            : actual.semis.has(val)
          tagClass = hit ? 'bonus-pts-earned' : 'bonus-pts-miss'
          tagLabel = hit ? `+${pts}` : '0'
        }
        const flagHtml = val ? flag(val) + ' ' : ''
        slotsHtml += `<div class="bonus-slot"><div class="bonus-locked-val">${flagHtml}${val || '—'}<span class="bonus-pts-tag ${tagClass}">${tagLabel}</span></div></div>`
      })
      html += `<div class="bonus-card">
        <div class="bonus-card-title">${title}</div>
        ${slotsHtml}
      </div>`
    })
  } else {
    const SEMI_LABELS = { semi_1: 'Halve finale 1 · kant A', semi_2: 'Halve finale 1 · kant B', semi_3: 'Halve finale 2 · kant A', semi_4: 'Halve finale 2 · kant B' }
    const FINALIST_LABELS = { finalist_1: 'Winnaar halve finale 1', finalist_2: 'Winnaar halve finale 2' }
    sectionGroups.forEach(({ title, slots }, gi) => {
      let slotsHtml = ''
      slots.forEach(({ key }) => {
        const subLabel = SEMI_LABELS[key] || FINALIST_LABELS[key]
        if (subLabel) slotsHtml += `<div class="bonus-sub-label">${subLabel}</div>`
        slotsHtml += `<div id="bonus-picks-${key}" class="bonus-pick-grid"></div>`
      })
      const isLast = gi === sectionGroups.length - 1
      html += `<div class="bonus-card">
        <div class="bonus-card-title">${title}</div>
        ${slotsHtml}
        ${isLast ? '<button class="bonus-save-btn" id="bonus-save-btn">Opslaan</button>' : ''}
      </div>`
    })
    setTimeout(() => {
      currentBonusPicks = {
        semi_1: myBonus?.semi_1 || null, semi_2: myBonus?.semi_2 || null,
        semi_3: myBonus?.semi_3 || null, semi_4: myBonus?.semi_4 || null,
        finalist_1: myBonus?.finalist_1 || null, finalist_2: myBonus?.finalist_2 || null,
        winner: myBonus?.winner || null,
      }
      renderAllBonusPickSlots()
    }, 0)
  }

  const bonusRows = (allBonus || [])
    .map(b => { const p = participantMap[b.participant_id]; return p ? { p, b, pts: calcBonusPoints(b, actual) } : null })
    .filter(Boolean)
    .sort((a, c) => c.pts - a.pts || a.p.name.localeCompare(c.p.name, 'nl'))

  if (bonusRows.length > 0 && isLocked) {
    const rows = bonusRows.map(({ p, b, pts }) => {
      const preds = [
        b.winner      && `🏆 ${b.winner}`,
        b.finalist_1  && `🥈 ${b.finalist_1}`,
        b.finalist_2  && `🥈 ${b.finalist_2}`,
        b.semi_1      && `4️⃣ ${b.semi_1}`,
        b.semi_2      && `4️⃣ ${b.semi_2}`,
        b.semi_3      && `4️⃣ ${b.semi_3}`,
        b.semi_4      && `4️⃣ ${b.semi_4}`,
      ].filter(Boolean).join('<br>')
      return `<div class="bonus-all-row">
        <div class="bonus-all-name">${p.name}</div>
        <div class="bonus-all-preds">${preds || '—'}</div>
        <div class="bonus-all-pts">${pts > 0 ? `+${pts}` : '—'}</div>
      </div>`
    }).join('')
    html += `<div class="bonus-all-section">
      <div class="bonus-all-title">Alle voorspellingen</div>
      ${rows}
    </div>`
  }

  container.innerHTML = html
}

let currentBonusPicks = {}

function availableForSlot(key) {
  const p = currentBonusPicks
  if (key === 'finalist_1') return [p.semi_1, p.semi_2].filter(Boolean)
  if (key === 'finalist_2') return [p.semi_3, p.semi_4].filter(Boolean)
  if (key === 'winner')     return [p.finalist_1, p.finalist_2].filter(Boolean)
  if (_bracketGroups?.[key]) return _bonusAllTeams.filter(t => _bracketGroups[key].has(t))
  return _bonusAllTeams
}

function renderBonusPickSlot(key) {
  const el = document.getElementById(`bonus-picks-${key}`)
  if (!el) return
  const available = availableForSlot(key)
  const current = currentBonusPicks[key]
  if (available.length === 0) {
    el.innerHTML = `<span class="bonus-pick-empty">— kies eerst de ronde hierboven —</span>`
    return
  }
  el.innerHTML = available.map(t =>
    `<div class="bonus-pick-chip${t === current ? ' selected' : ''}" data-slot="${key}" data-value="${t}">${flag(t)}${t}</div>`
  ).join('')
}

function renderAllBonusPickSlots() {
  BONUS_SLOTS.forEach(({ key }) => renderBonusPickSlot(key))
}

let _bonusAllTeams = []

async function saveBonusPred() {
  const btn = document.getElementById('bonus-save-btn')
  btn.disabled = true
  btn.textContent = 'Opslaan…'

  const pred = { participant_id: currentParticipant.id, ...currentBonusPicks }

  const { data: existing } = await supabase
    .from('bonus_predictions').select('id')
    .eq('participant_id', currentParticipant.id)
    .maybeSingle()

  const { error } = existing
    ? await supabase.from('bonus_predictions').update(pred).eq('id', existing.id)
    : await supabase.from('bonus_predictions').insert(pred)

  if (error) {
    btn.textContent = 'Fout! Probeer opnieuw'
    setTimeout(() => { btn.textContent = 'Opslaan'; btn.disabled = false }, 2000)
  } else {
    btn.textContent = '✓ Opgeslagen!'
    setTimeout(() => { btn.textContent = 'Aanpassen'; btn.disabled = false }, 1500)
  }
}

// ── Helpers ───────────────────────────────────────────────

function calcScores(participants, playedMatches, predictions) {
  const sorted = [...playedMatches].sort((a, b) => {
    const da = a.date ? parseMatchDate(a.date) : 0
    const db = b.date ? parseMatchDate(b.date) : 0
    return da - db
  })

  // Build roundMap: match_id → round key
  const roundMap = {}
  const groupMatches = sorted.filter(m => m.poule)
  groupMatches.forEach((m, i) => {
    roundMap[m.id] = i < 24 ? 'GF R1' : i < 48 ? 'GF R2' : 'GF R3'
  })
  sorted.filter(m => !m.poule && m.phase).forEach(m => { roundMap[m.id] = m.phase })

  return (participants || []).map(p => {
    const predMap = {}
    ;(predictions || []).filter(pr => pr.participant_id === p.id)
      .forEach(pr => { predMap[pr.match_id] = pr })

    let points = 0, exact = 0, goed = 0
    const allPts = []
    const roundPts = {}

    sorted.forEach(match => {
      const pred = predMap[match.id]
      const pts = pred ? calcPoints(match, pred) : 0
      points += pts
      const ko = isKnockout(match)
      const maxExact = ko ? 10 : 5
      const base     = ko ? 6  : 3
      if (pred) {
        if (pts === maxExact) exact++
        else if (pts >= base) goed++
      }
      allPts.push(pts)
      const rnd = roundMap[match.id]
      if (rnd) roundPts[rnd] = (roundPts[rnd] || 0) + pts
    })

    let streak = 0
    for (let i = sorted.length - 1; i >= 0; i--) {
      const pred = predMap[sorted[i].id]
      if (!pred) break
      if (calcPoints(sorted[i], pred) >= 3) streak++
      else break
    }
    const flames = Math.max(0, Math.floor((streak - 3) / 2))

    let coldStreak = 0
    for (let i = sorted.length - 1; i >= 0; i--) {
      const pred = predMap[sorted[i].id]
      if (pred && calcPoints(sorted[i], pred) === 0) coldStreak++
      else break
    }
    const iceCount = coldStreak >= 2 ? coldStreak - 1 : 0

    let rocketStreak = 0
    for (let i = sorted.length - 1; i >= 0; i--) {
      const pred = predMap[sorted[i].id]
      if (pred && calcPoints(sorted[i], pred) === 5) rocketStreak++
      else break
    }
    const rocket = rocketStreak >= 3

    return { ...p, points, exact, goed, form: allPts.slice(-5).reverse(), flames, iceCount, rocket, streak, roundPts }
  }).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'nl'))
}

async function savePrediction(matchId) {
  const homeInput = document.querySelector(`input[data-match="${matchId}"][data-field="pred_home"]`)
  const awayInput = document.querySelector(`input[data-match="${matchId}"][data-field="pred_away"]`)
  const btn       = document.querySelector(`.save-btn[data-match="${matchId}"]`)

  if (homeInput.value === '' || awayInput.value === '') {
    homeInput.style.borderColor = '#ff4d6d'
    awayInput.style.borderColor = '#ff4d6d'
    setTimeout(() => { homeInput.style.borderColor = ''; awayInput.style.borderColor = '' }, 1500)
    return
  }

  const pred_home = parseInt(homeInput.value)
  const pred_away = parseInt(awayInput.value)

  btn.textContent = '…'
  btn.disabled = true

  const { data: existing } = await supabase
    .from('predictions').select('id')
    .eq('participant_id', currentParticipant.id)
    .eq('match_id', matchId)
    .maybeSingle()

  const { error } = existing
    ? await supabase.from('predictions').update({ pred_home, pred_away }).eq('id', existing.id)
    : await supabase.from('predictions').insert({ participant_id: currentParticipant.id, match_id: matchId, pred_home, pred_away })

  if (error) {
    btn.textContent = 'Fout!'
    setTimeout(() => { btn.textContent = 'Opslaan'; btn.disabled = false }, 2000)
  } else {
    btn.textContent = '✓'
    btn.classList.add('saved')
    setTimeout(() => {
      btn.textContent = 'Aanpassen'
      btn.classList.remove('saved')
      btn.classList.add('edit')
      btn.disabled = false
    }, 1500)
  }
}

// ── Events ────────────────────────────────────────────────

document.addEventListener('click', e => {
  const bonusBtn = e.target.closest('#bonus-save-btn')
  if (bonusBtn && !bonusBtn.disabled) { saveBonusPred(); return }

  const chip = e.target.closest('.bonus-pick-chip')
  if (chip) {
    const { slot, value } = chip.dataset
    currentBonusPicks[slot] = currentBonusPicks[slot] === value ? null : value
    // Cascade resets
    if (slot === 'semi_1' || slot === 'semi_2') {
      if (!availableForSlot('finalist_1').includes(currentBonusPicks.finalist_1)) { currentBonusPicks.finalist_1 = null; currentBonusPicks.winner = null }
    }
    if (slot === 'semi_3' || slot === 'semi_4') {
      if (!availableForSlot('finalist_2').includes(currentBonusPicks.finalist_2)) { currentBonusPicks.finalist_2 = null; currentBonusPicks.winner = null }
    }
    if (slot === 'finalist_1' || slot === 'finalist_2') {
      if (!availableForSlot('winner').includes(currentBonusPicks.winner)) currentBonusPicks.winner = null
    }
    renderAllBonusPickSlots()
    return
  }

  const btn = e.target.closest('.save-btn')
  if (btn && !btn.disabled) { savePrediction(parseInt(btn.dataset.match)); return }

  const navItem = e.target.closest('.nav-item[data-tab]')
  if (navItem) { switchTab(navItem.dataset.tab); return }

  const sbTabBtn = e.target.closest('.sb-tab-btn[data-sbtab]')
  if (sbTabBtn) { switchSbTab(sbTabBtn.dataset.sbtab); return }

  const mTabBtn = e.target.closest('.sb-tab-btn[data-mtab]')
  if (mTabBtn) { switchMatchTab(mTabBtn.dataset.mtab); return }

  if (e.target.closest('.avatar-ring')) { openShirtEditor(); return }

  if (e.target.closest('#hero-card')) { switchTab('scoreboard'); return }
})

// ── Shirt Editor ──────────────────────────────────────────

const SHIRT_PALETTE = [
  '#ff4d6d', '#e84393', '#9b6de8', '#b48af5',
  '#6366f1', '#0ea5e9', '#38bdf8', '#14b8a6',
  '#00d4aa', '#22c55e', '#f59e0b', '#ffb800',
  '#f97316', '#ef4444', '#ffffff', '#1c1c24',
]

const PATTERN_NAMES = { solid: 'Effen', hstripes: 'H-Strepen', vstripes: 'V-Strepen', sash: 'Sash', half: 'Half', panel: 'Panel', hoops: 'Hoops', chevron: 'Chevron' }
const PATTERNS = ['solid', 'hstripes', 'vstripes', 'sash', 'half', 'panel', 'hoops', 'chevron']

let editorShirt = { type: 'solid', c1: '#ff4d6d', c2: '#ffffff' }

function openShirtEditor() {
  const stored = shirtStore[currentParticipant.id]
  if (stored) {
    editorShirt = { type: stored.type || 'solid', c1: stored.c1 || '#ff4d6d', c2: stored.c2 || '#ffffff' }
  } else {
    const d = SHIRT_DESIGNS[strHash(currentParticipant.name) % SHIRT_DESIGNS.length]
    editorShirt = { type: d.type, c1: d.c1, c2: d.c2 }
  }
  renderShirtEditor()
  document.getElementById('shirt-editor-overlay').classList.remove('hidden')
  document.body.style.overflow = 'hidden'
  document.getElementById('se-save-btn').onclick = saveShirt
  document.getElementById('se-close-btn').onclick = closeShirtEditor
  document.getElementById('se-backdrop').onclick = closeShirtEditor
}

function closeShirtEditor() {
  document.getElementById('shirt-editor-overlay').classList.add('hidden')
  document.body.style.overflow = ''
}

function renderShirtEditor() {
  document.getElementById('se-preview').innerHTML = shirtSvg(currentParticipant.name, editorShirt)

  const patsEl = document.getElementById('se-patterns')
  patsEl.innerHTML = ''
  PATTERNS.forEach(type => {
    const shirtPath = 'M35,12 L10,24 L16,42 L28,36 L28,88 L72,88 L72,36 L84,42 L90,24 L65,12 Q50,22 35,12 Z'
    const clipId = 'sthe_' + type
    const btn = document.createElement('button')
    btn.className = `se-pat-btn${editorShirt.type === type ? ' active' : ''}`
    btn.innerHTML = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">
      <rect width="100" height="100" fill="#14141e"/>
      <defs><clipPath id="${clipId}"><path d="${shirtPath}"/></clipPath></defs>
      <g clip-path="url(#${clipId})">${shirtPattern(type, editorShirt.c1, editorShirt.c2)}</g>
      <path d="M35,12 Q50,22 65,12 L57,27 Q50,33 43,27 Z" fill="${editorShirt.c2}"/>
    </svg>
    <div class="se-pat-lbl">${PATTERN_NAMES[type]}</div>`
    btn.addEventListener('click', () => { editorShirt.type = type; renderShirtEditor() })
    patsEl.appendChild(btn)
  })

  const c1El = document.getElementById('se-colors-1')
  c1El.innerHTML = ''
  SHIRT_PALETTE.forEach(hex => {
    const sw = document.createElement('div')
    sw.className = `se-swatch${editorShirt.c1 === hex ? ' active' : ''}`
    sw.style.background = hex
    if (hex === '#1c1c24') sw.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,0.15)'
    sw.addEventListener('click', () => { editorShirt.c1 = hex; renderShirtEditor() })
    c1El.appendChild(sw)
  })

  const c2El = document.getElementById('se-colors-2')
  c2El.innerHTML = ''
  SHIRT_PALETTE.forEach(hex => {
    const sw = document.createElement('div')
    sw.className = `se-swatch${editorShirt.c2 === hex ? ' active' : ''}`
    sw.style.background = hex
    if (hex === '#1c1c24') sw.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,0.15)'
    sw.addEventListener('click', () => { editorShirt.c2 = hex; renderShirtEditor() })
    c2El.appendChild(sw)
  })
}

async function saveShirt() {
  const btn = document.getElementById('se-save-btn')
  btn.disabled = true
  btn.textContent = 'Opslaan…'

  const shirt = { type: editorShirt.type, c1: editorShirt.c1, c2: editorShirt.c2 }

  const { error } = await supabase.rpc('update_participant_shirt', { participant_id: currentParticipant.id, shirt_data: shirt })

  if (error) {
    btn.textContent = 'Fout! Probeer opnieuw'
    setTimeout(() => { btn.textContent = 'Shirt opslaan'; btn.disabled = false }, 2000)
    return
  }

  shirtStore[currentParticipant.id] = shirt
  currentParticipant.shirt = shirt
  localStorage.setItem('wkpool_participant', JSON.stringify(currentParticipant))
  document.getElementById('nav-avatar').innerHTML = shirtSvgForP(currentParticipant)

  btn.textContent = '✓ Opgeslagen!'
  setTimeout(() => { closeShirtEditor(); btn.textContent = 'Shirt opslaan'; btn.disabled = false }, 900)
}

init()
