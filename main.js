import { supabase } from './supabase.js'

let currentParticipant = null

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

// Flag emoji lookup — covers all WC 2026 participants + common variants (Dutch & English)
const FLAGS = {
  // Dutch names
  'nederland':        '🇳🇱',
  'duitsland':        '🇩🇪',
  'frankrijk':        '🇫🇷',
  'engeland':         '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'spanje':           '🇪🇸',
  'portugal':         '🇵🇹',
  'belgie':           '🇧🇪',
  'belgië':           '🇧🇪',
  'argentinie':       '🇦🇷',
  'argentinië':       '🇦🇷',
  'brazilie':         '🇧🇷',
  'brazilië':         '🇧🇷',
  'verenigde staten': '🇺🇸',
  'denemarken':       '🇩🇰',
  'zwitserland':      '🇨🇭',
  'polen':            '🇵🇱',
  'turkije':          '🇹🇷',
  'kroatie':          '🇭🇷',
  'kroatië':          '🇭🇷',
  'servie':           '🇷🇸',
  'servië':           '🇷🇸',
  'oekraine':         '🇺🇦',
  'oekraïne':         '🇺🇦',
  'schotland':        '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'albanie':          '🇦🇱',
  'albanië':          '🇦🇱',
  'slovenie':         '🇸🇮',
  'slovenië':         '🇸🇮',
  'roemenie':         '🇷🇴',
  'roemenië':         '🇷🇴',
  'georgie':          '🇬🇪',
  'georgië':          '🇬🇪',
  'oostenrijk':       '🇦🇹',
  'hongarije':        '🇭🇺',
  'slowakije':        '🇸🇰',
  'tsjechie':         '🇨🇿',
  'tsjechië':         '🇨🇿',
  'saoedi-arabie':    '🇸🇦',
  'saoedi-arabië':    '🇸🇦',
  'saoediarabie':     '🇸🇦',
  'iran':             '🇮🇷',
  'irak':             '🇮🇶',
  'jordanie':         '🇯🇴',
  'jordanië':         '🇯🇴',
  'oezbekistan':      '🇺🇿',
  'australie':        '🇳🇿',
  'australië':        '🇳🇿',
  'nieuw-zeeland':    '🇦🇺',
  'marokko':          '🇲🇦',
  'egypte':           '🇪🇬',
  'kameroen':         '🇨🇲',
  'ivoorkust':        '🇨🇮',
  'algerije':         '🇩🇿',
  'tunesie':          '🇹🇳',
  'tunesië':          '🇹🇳',
  'mali':             '🇲🇱',
  'zuid-afrika':      '🇿🇦',
  'zuidafrika':       '🇿🇦',
  'ghana':            '🇬🇭',
  'costa rica':       '🇨🇷',
  // English / universal names
  'netherlands':      '🇳🇱',
  'germany':          '🇩🇪',
  'france':           '🇫🇷',
  'england':          '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'spain':            '🇪🇸',
  'belgium':          '🇧🇪',
  'argentina':        '🇦🇷',
  'brazil':           '🇧🇷',
  'usa':              '🇺🇸',
  'united states':    '🇺🇸',
  'mexico':           '🇲🇽',
  'canada':           '🇨🇦',
  'japan':            '🇯🇵',
  'south korea':      '🇰🇷',
  'korea':            '🇰🇷',
  'zuid-korea':       '🇰🇷',
  'zuid-kore':        '🇰🇷',
  'zuidkorea':        '🇰🇷',
  'bosnie':           '🇧🇦',
  'bosnië':           '🇧🇦',
  'bosnie-herzegovina': '🇧🇦',
  'bosnië-herzegovina': '🇧🇦',
  'bosnia':           '🇧🇦',
  'bosnia and herzegovina': '🇧🇦',
  'bosnia & herzegovina': '🇧🇦',
  'qatar':            '<span style="display:inline-block;transform:scaleX(-1)">🇶🇦</span>',
  'haiti':            '🇭🇹',
  'haïti':            '🇭🇹',
  'curacao':          '🇨🇼',
  'curaçao':          '🇨🇼',
  'kaapverdie':       '🇨🇻',
  'kaapverdië':       '🇨🇻',
  'cape verde':       '🇨🇻',
  'congo':            '🇨🇩',
  'dr congo':         '🇨🇩',
  'congo-kinshasa':   '🇨🇩',
  'democratische republiek congo': '🇨🇩',
  'australia':        '🇳🇿',
  'new zealand':      '🇦🇺',
  'denmark':          '🇩🇰',
  'switzerland':      '🇨🇭',
  'poland':           '🇵🇱',
  'turkey':           '🇹🇷',
  'croatia':          '🇭🇷',
  'serbia':           '🇷🇸',
  'ukraine':          '🇺🇦',
  'scotland':         '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'albania':          '🇦🇱',
  'slovenia':         '🇸🇮',
  'romania':          '🇷🇴',
  'georgia':          '🇬🇪',
  'austria':          '🇦🇹',
  'hungary':          '🇭🇺',
  'slovakia':         '🇸🇰',
  'czech republic':   '🇨🇿',
  'czechia':          '🇨🇿',
  'saudi arabia':     '🇸🇦',
  'iraq':             '🇮🇶',
  'jordan':           '🇯🇴',
  'uzbekistan':       '🇺🇿',
  'morocco':          '🇲🇦',
  'egypt':            '🇪🇬',
  'nigeria':          '🇳🇬',
  'cameroon':         '🇨🇲',
  'senegal':          '🇸🇳',
  'ivory coast':      '🇨🇮',
  "cote d'ivoire":    '🇨🇮',
  'algeria':          '🇩🇿',
  'tunisia':          '🇹🇳',
  'south africa':     '🇿🇦',
  'uruguay':          '🇺🇾',
  'colombia':         '🇨🇴',
  'ecuador':          '🇪🇨',
  'venezuela':        '🇻🇪',
  'paraguay':         '🇵🇾',
  'bolivia':          '🇧🇴',
  'peru':             '🇵🇪',
  'chile':            '🇨🇱',
  'panama':           '<span style="display:inline-block;transform:rotate(180deg)">🇵🇦</span>',
  'honduras':         '🇭🇳',
  'wales':            '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'wales (cymru)':    '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'north ireland':    '🇬🇧',
  'northern ireland': '🇬🇧',
  'ireland':          '🇮🇪',
  'ierland':          '🇮🇪',
  'finland':          '🇫🇮',
  'finland':          '🇫🇮',
  'noorwegen':        '🇳🇴',
  'norway':           '🇳🇴',
  'sweden':           '🇸🇪',
  'zweden':           '🇸🇪',
  'iceland':          '🇮🇸',
  'ijsland':          '🇮🇸',
  'greece':           '🇬🇷',
  'griekenland':      '🇬🇷',
  'israel':           '🇮🇱',
  'israël':           '🇮🇱',
  'russia':           '🇷🇺',
  'rusland':          '🇷🇺',
  'japan':            '🇯🇵',
  'china':            '🇨🇳',
  'china pr':         '🇨🇳',
  'india':            '🇮🇳',
}

function flag(name, stored) {
  if (stored) return stored
  if (!name) return '🏳'
  const key = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  return FLAGS[key] || FLAGS[name.toLowerCase().trim()] || '🏳'
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
      const color = pts >= maxExact ? 'var(--teal)' : pts > 0 ? 'var(--purple-l)' : 'var(--text-dim)'
      html += `<div style="font-size:13px;color:${color};font-weight:600;margin-top:4px">${pts} ptn</div>`
    }
  } else {
    html += `<div style="font-size:13px;color:var(--text-dim)">Geen voorspelling ingevoerd</div>`
  }
  html += `</div>`

  html += `<div class="md-section"><div class="md-section-label">Alle voorspellingen</div>`
  ;(participants || []).filter(p => p.id !== 22).forEach(p => {
    const pred    = predMap[p.id]
    const hasPred = pred?.pred_home != null
    const isMe    = p.id === currentParticipant.id
    const visible  = globalLocked || isPlayed || isMe
    const pts     = isPlayed && hasPred ? calcPoints(match, pred) : null
    const color   = pts !== null
      ? pts >= maxExact ? 'var(--teal)' : pts > 0 ? 'var(--purple-l)' : 'var(--text-dim)'
      : ''
    const nameLabel = `${p.name}${isMe ? ' ★' : ''}`
    html += `
      <div class="md-pred-row">
        <div class="md-pred-name${isMe ? ' is-me' : ''}">${nameLabel}</div>
        <div style="text-align:right">
          ${visible && hasPred
            ? `<div class="md-pred-score">${pred.pred_home} – ${pred.pred_away}</div>${pts !== null ? `<div class="md-pred-pts" style="color:${color}">${pts} ptn</div>` : ''}`
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
  document.getElementById('greeting-name').textContent = `Hoi ${name.split(' ')[0]} 👋`
  document.getElementById('nav-avatar').textContent = initials(name)

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

  const scores = calcScores((participants || []).filter(p => p.id !== 22), played, predictions)
  const myScore = scores.find(p => p.id === currentParticipant.id) || { points: 0, exact: 0 }
  const myRank  = scores.indexOf(myScore) + 1

  document.getElementById('hero-ptn').textContent       = myScore.points
  document.getElementById('hero-rank').textContent      = `${myRank}e`
  document.getElementById('hero-rank-total').textContent = `${scores.length} deeln.`

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

  // Laatste resultaten: last 3 played matches
  const recentResults = played.slice(-3).reverse()
  const resultsEl = document.getElementById('home-results')
  resultsEl.innerHTML = ''

  if (recentResults.length === 0) {
    resultsEl.innerHTML = '<p class="empty-state">Nog geen gespeelde wedstrijden</p>'
  } else {
    recentResults.forEach(m => {
      const pred = myPredMap[m.id]
      resultsEl.appendChild(buildResultItem(m, pred))
    })
  }
}

// ── Scoreboard ────────────────────────────────────────────

async function loadScoreboard() {
  const [{ data: participants }, { data: matches }, predictions] = await Promise.all([
    supabase.from('participants').select('*'),
    supabase.from('matches').select('*'),
    fetchAllPredictions(),
  ])

  const played = (matches || []).filter(m => m.score_home !== null && m.score_away !== null)
  const scores = calcScores((participants || []).filter(p => p.id !== 22), played, predictions)

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
      const isMe    = player.id === currentParticipant.id
      const crown   = rank === 1 ? '<span class="pod-crown">👑</span>' : ''
      const ptColor = rank === 1 ? 'var(--amber)' : rank === 2 ? 'var(--purple-l)' : 'var(--pink)'

      pod.innerHTML = `
        <div class="pod-avatar" style="background:${avatarColor(player.name)}">
          ${crown}${initials(player.name)}
        </div>
        <div class="pod-name">${player.name.split(' ')[0]}${isMe ? ' (jij)' : ''}</div>
        <div class="pod-pts" style="color:${ptColor}">${player.points}</div>
        <div class="pod-base"></div>
      `
    }
    podiumEl.appendChild(pod)
  })

  // Leaderboard list (4th+)
  const lbEl = document.getElementById('lb-list')
  lbEl.innerHTML = ''
  scores.slice(3).forEach((p, i) => {
    lbEl.appendChild(buildLbItem(p, i + 4))
  })
}

// ── Matches ───────────────────────────────────────────────

let countdownInterval = null
let activeGroupFilter = null
let groupColorMap = {}

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
  matches.forEach(match => {
    const pred     = predMap[match.id] || {}
    const isPlayed = match.score_home !== null && match.score_away !== null
    const isLocked = !isPlayed && globalLocked
    const card = buildMatchCard(match, pred, isPlayed, isLocked)
    card.dataset.group = match.poule || ''
    if (activeGroupFilter && match.poule !== activeGroupFilter) card.classList.add('hidden')
    container.appendChild(card)
  })
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
        <div class="tile-score-lbl">${(match.home || '').slice(0, 8)}</div>
      </div>
      <div style="text-align:right">
        <div class="tile-score-num">${awayScore}</div>
        <div class="tile-score-lbl">${(match.away || '').slice(0, 8)}</div>
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
    : pts >= maxExact ? 'var(--teal)' : pts > 0 ? 'var(--purple-l)' : 'var(--pink)'
  const ptsLabel = pts === null ? '—' : `+${pts}`
  const predStr  = pred?.pred_home != null ? `${pred.pred_home}–${pred.pred_away}` : '—'

  item.innerHTML = `
    <div class="upcoming-icon" style="background:${tileColor(match.id)}">${flag(match.home, match.home_flag)}</div>
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

function buildLbItem(p, rank) {
  const isMe = p.id === currentParticipant.id
  const item = document.createElement('div')
  item.className = `lb-item${isMe ? ' me' : ''}`
  item.innerHTML = `
    <div class="lb-num${isMe ? ' is-me' : ''}">${rank}</div>
    <div class="lb-av" style="background:${avatarColor(p.name)}">${initials(p.name)}</div>
    <div class="lb-info">
      <div class="lb-nm">${p.name}${isMe ? '<span class="lb-me-tag">jij</span>' : ''}</div>
      <div class="lb-detail">${p.exact} exact · ${p.goed} goed</div>
    </div>
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
        <div class="match-vs-time">${match.date ? formatDate(match.date) : ''}</div>
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
    const ptClass = `pts-${pts}`
    const maxExact = match.phase === 'knockout' ? 10 : 5
    const base     = match.phase === 'knockout' ? 6 : 3
    const ptLabel  = pts === maxExact ? `⚡ Exact · ${pts} ptn` : pts >= base ? `✓ Goed · ${pts} ptn` : '✗ 0 punten'
    bottom.innerHTML = `
      <span class="played-meta">Uitslag: ${match.score_home}–${match.score_away} · Jij: ${pred.pred_home ?? '—'}–${pred.pred_away ?? '—'}</span>
      <span class="pts-tag ${ptClass}">${ptLabel}</span>
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
  return (participants || []).map(p => {
    const preds = (predictions || []).filter(pr => pr.participant_id === p.id)
    let points = 0, exact = 0, goed = 0
    preds.forEach(pred => {
      const match = playedMatches.find(m => m.id === pred.match_id)
      if (match) {
        const pts = calcPoints(match, pred)
        points += pts
        const ko = match.phase === 'knockout'
        const maxExact = ko ? 10 : 5
        const base     = ko ? 6  : 3
        if (pts === maxExact) exact++
        else if (pts >= base) goed++
      }
    })
    return { ...p, points, exact, goed }
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
})

init()
