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
  'kaapverdie': 'cv', 'kaapverdië': 'cv', 'cape verde': 'cv',
  'congo': 'cd', 'dr congo': 'cd', 'congo-kinshasa': 'cd', 'democratische republiek congo': 'cd',
  'bosnie': 'ba', 'bosnië': 'ba', 'bosnie-herzegovina': 'ba', 'bosnië-herzegovina': 'ba',
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
  const isPlayed       = match.score_home !== null && match.score_away !== null
  const maxExact       = match.phase === 'knockout' ? 10 : 5

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
      ${match.phase === 'knockout' ? `<span class="md-pill" style="background:rgba(255,107,138,0.12);color:#ff6b8a;border:1px solid rgba(255,107,138,0.25)">Knock-out</span>` : ''}
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

  html += `<div class="md-section"><div class="md-section-label">Alle voorspellingen</div>`
  ;(participants || []).filter(p => p.id !== 22).forEach(p => {
    const pred    = predMap[p.id]
    const hasPred = pred?.pred_home != null
    const isMe    = p.id === currentParticipant.id
    const visible  = globalLocked || isPlayed || isMe
    const pts     = isPlayed && hasPred ? calcPoints(match, pred) : null
    const ptsColor = pts !== null
      ? pts >= maxExact ? 'var(--teal)' : pts === 4 ? '#38bdf8' : pts > 0 ? 'var(--purple-l)' : 'var(--text-dim)'
      : ''

    let scoreColor = ''
    if (isMe) {
      scoreColor = 'var(--text)'
    } else if (visible && hasPred && myPred?.pred_home != null) {
      const exact    = pred.pred_home === myPred.pred_home && pred.pred_away === myPred.pred_away
      const sameToto = Math.sign(pred.pred_home - pred.pred_away) === myToto
      scoreColor = exact ? 'var(--teal)' : sameToto ? '#38bdf8' : 'var(--pink)'
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
  if (!globalLocked && !isPlayed) {
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

function openPechDetail(player) {
  const overlay = document.getElementById('participant-detail-overlay')
  const body    = document.getElementById('participant-detail-body')
  overlay.classList.remove('hidden')
  document.body.style.overflow = 'hidden'

  const isMe = player.id === currentParticipant.id

  let html = `
    <div class="md-close-row">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#9b6de8,#ff4d6d);padding:2px;flex-shrink:0">
          <div style="width:100%;height:100%;border-radius:50%;background:#1a1a24;overflow:hidden">${shirtSvgForP(player)}</div>
        </div>
        <div>
          <div style="font-size:17px;font-weight:800;letter-spacing:-0.02em">${player.name}${isMe ? ' <span style="font-size:11px;color:var(--pink);font-weight:700">(jij)</span>' : ''}</div>
          <div style="font-size:12px;color:var(--text-mid);margin-top:1px">${player.pech}× pech · 1 doelpunt naast exact</div>
        </div>
      </div>
      <button class="md-close-btn" id="pd-close-btn">✕ Sluit</button>
    </div>
    <div class="md-section"><div class="md-section-label">Pechwedstrijden</div>`

  if (player.pechMatches.length === 0) {
    html += `<p style="color:var(--text-dim);font-size:13px;padding:8px 0">Geen pechwedstrijden gevonden.</p>`
  } else {
    player.pechMatches.forEach(({ match, pred }) => {
      const matchLabel = `${tla(match.home)} – ${tla(match.away)}`
      const groupLabel = match.poule ? `Groep ${match.poule}` : match.phase === 'knockout' ? 'Knock-out' : ''
      html += `
        <div class="pd-match-row">
          <div class="pd-match-info">
            <div class="pd-match-name">${matchLabel}</div>
            <div class="pd-match-sub">Voorspelling: ${pred.pred_home}–${pred.pred_away}${groupLabel ? ' · ' + groupLabel : ''}</div>
          </div>
          <div class="pd-match-right">
            <div class="pd-match-result">${match.score_home}–${match.score_away}</div>
            <div class="pd-match-pts" style="color:var(--pink)">😬 pech</div>
          </div>
        </div>`
    })
  }

  html += `</div>`
  body.innerHTML = html
  document.getElementById('pd-close-btn').addEventListener('click', closeParticipantDetail)
  document.getElementById('pd-backdrop').addEventListener('click', closeParticipantDetail, { once: true })
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
      return da - db
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
    </div>
  `

  if (played.length === 0) {
    html += `<div class="md-section"><p style="color:var(--text-dim);font-size:13px;text-align:center;padding:1rem 0">Nog geen gespeelde wedstrijden</p></div>`
  } else {
    html += `<div class="md-section"><div class="md-section-label">Gespeelde wedstrijden</div>`
    played.forEach(match => {
      const pred = predMap[match.id]
      const pts  = pred ? calcPoints(match, pred) : null
      const ko   = match.phase === 'knockout'
      const maxExact = ko ? 10 : 5
      const base     = ko ? 6  : 3

      const ptsColor = pts === null ? 'var(--text-dim)'
        : pts >= maxExact ? 'var(--teal)' : pts === 4 ? '#38bdf8' : pts > 0 ? 'var(--purple-l)' : 'var(--pink)'
      const ptsLabel = pts === null ? '—'
        : pts >= maxExact ? `⚡ +${pts}` : pts > 0 ? `✓ +${pts}` : '✗ 0'
      const predStr = pred?.pred_home != null ? `${pred.pred_home}–${pred.pred_away}` : '—'
      const matchLabel = `${tla(match.home)} – ${tla(match.away)}`
      const groupLabel = match.poule ? `Groep ${match.poule}` : match.phase === 'knockout' ? 'Knock-out' : ''

      html += `
        <div class="pd-match-row">
          <div class="pd-match-info">
            <div class="pd-match-name">${matchLabel}</div>
            <div class="pd-match-sub">Jij: ${predStr}${groupLabel ? ' · ' + groupLabel : ''}</div>
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

function calcPoints(match, pred) {
  if (pred.pred_home == null || pred.pred_away == null) return 0
  const ko = match.phase === 'knockout'
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
}

// ── Home ──────────────────────────────────────────────────

async function loadHome() {
  const [{ data: participants }, { data: matches }, predictions] = await Promise.all([
    supabase.from('participants').select('*'),
    supabase.from('matches').select('*').order('date'),
    fetchAllPredictions(),
  ])

  const now = new Date()
  const played = (matches || []).filter(m => m.score_home !== null && m.score_away !== null)
  const datedMatches = (matches || []).filter(m => m.date)
  const firstMatchDate = datedMatches.length > 0 ? new Date(Math.min(...datedMatches.map(m => parseMatchDate(m.date)))) : null
  const globalLocked = firstMatchDate ? now >= firstMatchDate : false

  ;(participants || []).forEach(p => { if (p.shirt) shirtStore[p.id] = p.shirt })
  const freshMe = (participants || []).find(p => p.id === currentParticipant.id)
  if (freshMe?.shirt) { currentParticipant.shirt = freshMe.shirt; localStorage.setItem('wkpool_participant', JSON.stringify(currentParticipant)) }
  document.getElementById('nav-avatar').innerHTML = shirtSvgForP(currentParticipant)

  const scores = calcScores((participants || []).filter(p => p.id !== 22), played, predictions)
  const myScore = scores.find(p => p.id === currentParticipant.id) || { points: 0, exact: 0 }
  const myRank  = scores.indexOf(myScore) + 1

  document.getElementById('hero-ptn').textContent       = myScore.points
  document.getElementById('hero-rank').textContent      = `${myRank}e`
  document.getElementById('hero-rank-total').textContent = `${scores.length} deeln.`

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

async function loadScoreboard() {
  const [{ data: participants }, { data: matches }, predictions] = await Promise.all([
    supabase.from('participants').select('*'),
    supabase.from('matches').select('*'),
    fetchAllPredictions(),
  ])

  ;(participants || []).forEach(p => { if (p.shirt) shirtStore[p.id] = p.shirt })
  const played = (matches || []).filter(m => m.score_home !== null && m.score_away !== null)
    .sort((a, b) => (a.date ? parseMatchDate(a.date) : 0) - (b.date ? parseMatchDate(b.date) : 0))
  const scores = calcScores((participants || []).filter(p => p.id !== 22), played, predictions)

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

  // Pech klassement
  const activeP = (participants || []).filter(p => p.id !== 22)
  const predMaps = {}
  activeP.forEach(p => {
    predMaps[p.id] = {}
    ;(predictions || []).filter(pr => pr.participant_id === p.id)
      .forEach(pr => { predMaps[p.id][pr.match_id] = pr })
  })

  const pechScores = activeP.map(p => {
    const pechMatches = []
    played.forEach(match => {
      const pred = predMaps[p.id]?.[match.id]
      if (!pred || pred.pred_home == null) return
      const diff = Math.abs(pred.pred_home - match.score_home) + Math.abs(pred.pred_away - match.score_away)
      const pts  = calcPoints(match, pred)
      if (diff === 1 && pts === 0) pechMatches.push({ match, pred })
    })
    return { ...p, pech: pechMatches.length, pechMatches }
  }).sort((a, b) => b.pech - a.pech || a.name.localeCompare(b.name, 'nl'))

  const topPech = pechScores[0]?.pech ?? 0
  const pechLeaderIds = new Set(topPech > 0 ? pechScores.filter(p => p.pech === topPech).map(p => p.id) : [])

  // Leaderboard list (all, with tied ranks)
  const lbEl = document.getElementById('lb-list')
  lbEl.innerHTML = ''
  let rank = 1
  scores.forEach((p, i) => {
    if (i > 0 && p.points < scores[i - 1].points) rank = i + 1
    const prevRank = prevRankMap[p.id]
    const rankDelta = prevRank != null ? prevRank - rank : 0
    lbEl.appendChild(buildLbItem(p, rank, rankDelta, pechLeaderIds))
  })

  document.getElementById('pech-egg')?.addEventListener('click', e => {
    e.stopPropagation()
    switchSbTab('pech')
  })

  const pechEl = document.getElementById('pech-list')
  if (pechEl) {
    pechEl.innerHTML = ''
    let pechRank = 1
    pechScores.forEach((p, i) => {
      if (i > 0 && p.pech < pechScores[i - 1].pech) pechRank = i + 1
      const isMe = p.id === currentParticipant.id
      const item = document.createElement('div')
      item.className = `lb-item${isMe ? ' me' : ''}`
      item.style.cursor = 'pointer'
      const isDodoLeader = pechRank === 1 && p.pech > 0

      const pechMatchNames = p.pechMatches.map(({ match }) => `${tla(match.home)}–${tla(match.away)}`)
      const pechSub = pechMatchNames.length === 0 ? '—'
        : pechMatchNames.length <= 2 ? pechMatchNames.join(', ')
        : `${pechMatchNames.slice(0, 2).join(', ')} +${pechMatchNames.length - 2}`

      item.innerHTML = `
        <div class="lb-num${isMe ? ' is-me' : ''}">${pechRank}</div>
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#9b6de8,#ff4d6d);padding:2px;flex-shrink:0">
          <div style="width:100%;height:100%;border-radius:50%;background:#1a1a24;overflow:hidden">${shirtSvgForP(p)}</div>
        </div>
        <div class="lb-info">
          <div class="lb-nm">${p.name}${isMe ? '<span class="lb-me-tag">jij</span>' : ''}</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:1px">${pechSub}</div>
        </div>
        ${isDodoLeader ? '<span style="font-size:20px;margin-right:6px">🦤</span>' : ''}
        <div class="lb-right">
          <div class="lb-pts-val${isMe ? ' is-me' : ''}">${p.pech}×</div>
          <div class="lb-pts-lbl">keer</div>
        </div>
      `
      item.addEventListener('click', () => openPechDetail(p))
      pechEl.appendChild(item)
    })
  }
}

function switchSbTab(tab) {
  document.querySelectorAll('.sb-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.sbtab === tab))
  document.getElementById('sbtab-stand')?.classList.toggle('hidden', tab !== 'stand')
  document.getElementById('sbtab-historie')?.classList.toggle('hidden', tab !== 'historie')
  document.getElementById('sbtab-pech')?.classList.toggle('hidden', tab !== 'pech')
  if (tab === 'historie' && sbCache) renderHistorieChart(sbCache)

  const titleEl = document.querySelector('.sb-title')
  const subEl   = document.getElementById('sb-sub')
  if (tab === 'pech') {
    if (titleEl) titleEl.textContent = 'Pechvogelklassement'
    if (subEl)   subEl.textContent   = 'Zat er maar 1 doelpunt naast, maar haalde 0 punten.'
  } else {
    if (titleEl) titleEl.textContent = 'Scorebord'
    if (subEl && subEl.textContent.startsWith('Zat er maar'))
      subEl.textContent = `WK Pool 2026 · ${document.querySelectorAll('#lb-list .lb-item').length} deelnemers`
  }
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
  const PAD_L = 30, PAD_R = 30, PAD_T = 16, PAD_B = 28
  const stepX = 36
  const W = PAD_L + N * stepX + PAD_R
  const H = 260
  const drawH = H - PAD_T - PAD_B
  const maxPts = Math.max(...playerData.map(p => p.values[p.values.length - 1]), 10)

  const rawStep = maxPts / 4
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep || 1)))
  const tickStep = Math.ceil(rawStep / mag) * mag
  const yMax = Math.ceil(maxPts / tickStep) * tickStep || tickStep
  const scaleY = drawH / yMax
  const ticks = []
  for (let v = 0; v <= yMax; v += tickStep) ticks.push(v)

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">`

  ticks.forEach(v => {
    const y = (PAD_T + drawH - v * scaleY).toFixed(1)
    svg += `<line x1="${PAD_L}" y1="${y}" x2="${W - PAD_R}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`
    svg += `<text x="${PAD_L - 5}" y="${(+y + 4).toFixed(1)}" text-anchor="end" font-family="Poppins,sans-serif" font-size="9" fill="rgba(255,255,255,0.28)">${v}</text>`
    svg += `<text x="${W - PAD_R + 5}" y="${(+y + 4).toFixed(1)}" text-anchor="start" font-family="Poppins,sans-serif" font-size="9" fill="rgba(255,255,255,0.28)">${v}</text>`
  })

  const xAxisY = (PAD_T + drawH).toFixed(1)
  svg += `<line x1="${PAD_L}" y1="${xAxisY}" x2="${W - PAD_R}" y2="${xAxisY}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`

  sorted.forEach((_, i) => {
    if (N > 20 && (i + 1) % 5 !== 0 && i !== N - 1) return
    const x = (PAD_L + (i + 1) * stepX).toFixed(1)
    svg += `<text x="${x}" y="${H - 8}" text-anchor="middle" font-family="Poppins,sans-serif" font-size="9" fill="rgba(255,255,255,0.28)">${i + 1}</text>`
  })

  // Draw non-me first so current user renders on top
  const ordered = [...playerData].sort((a, b) => {
    if (a.id === currentParticipant.id) return 1
    if (b.id === currentParticipant.id) return -1
    return 0
  })

  ordered.forEach(p => {
    const isMe = p.id === currentParticipant.id
    const pts = p.values.map((v, i) => {
      const x = (PAD_L + i * stepX).toFixed(1)
      const y = (PAD_T + drawH - v * scaleY).toFixed(1)
      return `${x},${y}`
    }).join(' ')

    const lastX = (PAD_L + (p.values.length - 1) * stepX).toFixed(1)
    const lastY = (PAD_T + drawH - p.values[p.values.length - 1] * scaleY).toFixed(1)

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
  const container = document.getElementById('all-matches-list')
  container.innerHTML = '<p class="empty-state">Laden…</p>'

  const [{ data: matches }, { data: predictions }] = await Promise.all([
    supabase.from('matches').select('*').order('date'),
    supabase.from('predictions').select('*').eq('participant_id', currentParticipant.id),
  ])

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

  startCountdown(firstMatchDate, globalLocked)

  const predMap = {}
  predictions?.forEach(p => { predMap[p.match_id] = p })

  const groups = [...new Set(matches.map(m => m.poule).filter(Boolean))].sort()
  groupColorMap = {}
  groups.forEach((g, i) => { groupColorMap[g] = GROUP_COLORS[i % GROUP_COLORS.length] })
  buildGroupFilters(groups)

  container.innerHTML = ''
  let firstUpcomingCard = null
  matches.forEach(match => {
    const pred     = predMap[match.id] || {}
    const isPlayed = match.score_home !== null && match.score_away !== null
    const isLocked = !isPlayed && globalLocked
    const card = buildMatchCard(match, pred, isPlayed, isLocked)
    card.dataset.group = match.poule || ''
    if (activeGroupFilter && match.poule !== activeGroupFilter) card.classList.add('hidden')
    if (!isPlayed && !firstUpcomingCard) firstUpcomingCard = card
    container.appendChild(card)
  })

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

function startCountdown(firstMatchDate, globalLocked) {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null }

  const el = document.getElementById('matches-countdown')
  if (!el) return

  if (!firstMatchDate) { el.innerHTML = ''; return }

  if (globalLocked) {
    el.innerHTML = '<span class="countdown-locked">⛔ Voorspellingen zijn gesloten</span>'
    return
  }

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
    el.innerHTML = `⏱ Sluit over <span class="countdown-time">${timeStr}</span>`
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
    const maxExact = match.phase === 'knockout' ? 10 : 5
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
  const maxExact = match.phase === 'knockout' ? 10 : 5
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

function buildLbItem(p, rank, rankDelta = 0, pechLeaderIds = new Set()) {
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
      <div class="lb-nm">${p.name}${isMe ? '<span class="lb-me-tag">jij</span>' : ''}</div>
      ${formHtml}
    </div>
    ${pechLeaderIds.has(p.id) ? '<span style="font-size:20px;margin-right:6px;cursor:pointer" title="Pechvogel" id="pech-egg">🦤</span>' : ''}
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
  if (isPlayed)      { statusText = 'Gespeeld'; statusClass = 's-played' }
  else if (isLocked) { statusText = 'Gesloten'; statusClass = 's-closed' }
  else               { statusText = 'Open';     statusClass = 's-open'   }

  const homeFlag = `<div class="match-flag">${flag(match.home, match.home_flag)}</div>`
  const awayFlag = `<div class="match-flag">${flag(match.away, match.away_flag)}</div>`

  const vsMiddle = isPlayed
    ? `<div class="match-vs-score">${match.score_home} – ${match.score_away}</div>`
    : `<div class="match-vs-time">${match.date ? formatDate(match.date) : ''}</div>`

  card.innerHTML = `
    <div class="match-card-top">
      <span class="match-group" ${match.poule && groupColorMap[match.poule] ? `style="background:${groupColorMap[match.poule].bg};border-color:${groupColorMap[match.poule].border};color:${groupColorMap[match.poule].text}"` : ''}>${match.poule ? `Groep ${match.poule}` : ''}</span>
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
    const maxExact = match.phase === 'knockout' ? 10 : 5
    const base     = match.phase === 'knockout' ? 6 : 3
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

// ── Helpers ───────────────────────────────────────────────

function calcScores(participants, playedMatches, predictions) {
  const sorted = [...playedMatches].sort((a, b) => {
    const da = a.date ? parseMatchDate(a.date) : 0
    const db = b.date ? parseMatchDate(b.date) : 0
    return da - db
  })

  return (participants || []).map(p => {
    const predMap = {}
    ;(predictions || []).filter(pr => pr.participant_id === p.id)
      .forEach(pr => { predMap[pr.match_id] = pr })

    let points = 0, exact = 0, goed = 0
    const allPts = []

    sorted.forEach(match => {
      const pred = predMap[match.id]
      const pts = pred ? calcPoints(match, pred) : 0
      points += pts
      const ko = match.phase === 'knockout'
      const maxExact = ko ? 10 : 5
      const base     = ko ? 6  : 3
      if (pred) {
        if (pts === maxExact) exact++
        else if (pts >= base) goed++
      }
      allPts.push(pts)
    })

    return { ...p, points, exact, goed, form: allPts.slice(-5).reverse() }
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
  const btn = e.target.closest('.save-btn')
  if (btn && !btn.disabled) { savePrediction(parseInt(btn.dataset.match)); return }

  const navItem = e.target.closest('.nav-item[data-tab]')
  if (navItem) { switchTab(navItem.dataset.tab); return }

  const sbTabBtn = e.target.closest('.sb-tab-btn[data-sbtab]')
  if (sbTabBtn) { switchSbTab(sbTabBtn.dataset.sbtab); return }

  if (e.target.closest('.avatar-ring')) { openShirtEditor(); return }
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
