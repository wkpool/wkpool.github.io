import { supabase } from './supabase.js'

let currentParticipant = null

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

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

function calcPoints(match, pred) {
  if (pred.pred_home == null || pred.pred_away == null) return 0
  if (match.score_home === pred.pred_home && match.score_away === pred.pred_away) return 2
  const mw = Math.sign(match.score_home - match.score_away)
  const pw = Math.sign(pred.pred_home  - pred.pred_away)
  return mw === pw ? 1 : 0
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
  const [{ data: participants }, { data: matches }, { data: predictions }] = await Promise.all([
    supabase.from('participants').select('*'),
    supabase.from('matches').select('*').order('date'),
    supabase.from('predictions').select('*'),
  ])

  const now = new Date()
  const played = (matches || []).filter(m => m.score_home !== null && m.score_away !== null)

  const scores = calcScores(participants, played, predictions)
  const myScore = scores.find(p => p.id === currentParticipant.id) || { points: 0, exact: 0 }
  const myRank  = scores.indexOf(myScore) + 1

  document.getElementById('hero-pts').textContent       = myScore.points
  document.getElementById('hero-rank').textContent      = `${myRank}e`
  document.getElementById('hero-rank-total').textContent = `${scores.length} deeln.`

  const myPredMap = {}
  ;(predictions || []).filter(p => p.participant_id === currentParticipant.id)
    .forEach(p => { myPredMap[p.match_id] = p })

  // Match tiles: open + recently played
  const tilesEl = document.getElementById('home-tiles')
  tilesEl.innerHTML = ''

  const openMatches = (matches || []).filter(m => m.score_home === null && m.score_away === null)
  const recentPlayed = played.slice(-2)
  const tileMatches = [...openMatches.slice(0, 5), ...recentPlayed]

  if (tileMatches.length === 0) {
    tilesEl.innerHTML = '<p style="color:var(--text-dim);font-size:13px;padding:4px 0">Geen wedstrijden</p>'
  } else {
    tileMatches.forEach(m => {
      const isLocked = m.score_home === null && m.score_away === null && m.date && now >= new Date(m.date)
      const isPlayed = m.score_home !== null && m.score_away !== null
      tilesEl.appendChild(buildMatchTile(m, myPredMap[m.id] || {}, isLocked, isPlayed))
    })
  }

  // Upcoming list: next 3 future matches not yet played
  const upcoming = (matches || [])
    .filter(m => m.date && new Date(m.date) > now && m.score_home === null && m.score_away === null)
    .slice(0, 3)

  const upcomingEl = document.getElementById('home-upcoming')
  upcomingEl.innerHTML = ''

  if (upcoming.length === 0) {
    upcomingEl.innerHTML = '<p class="empty-state">Geen aankomende wedstrijden</p>'
  } else {
    upcoming.forEach(m => {
      const pred = myPredMap[m.id]
      const hasPred = pred?.pred_home != null
      upcomingEl.appendChild(buildUpcomingItem(m, hasPred))
    })
  }
}

// ── Scoreboard ────────────────────────────────────────────

async function loadScoreboard() {
  const [{ data: participants }, { data: matches }, { data: predictions }] = await Promise.all([
    supabase.from('participants').select('*'),
    supabase.from('matches').select('*'),
    supabase.from('predictions').select('*'),
  ])

  const played = (matches || []).filter(m => m.score_home !== null && m.score_away !== null)
  const scores = calcScores(participants, played, predictions)

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

  const predMap = {}
  predictions?.forEach(p => { predMap[p.match_id] = p })

  const now = new Date()
  container.innerHTML = ''
  matches.forEach(match => {
    const pred     = predMap[match.id] || {}
    const isPlayed = match.score_home !== null && match.score_away !== null
    const isLocked = !isPlayed && match.date && now >= new Date(match.date)
    container.appendChild(buildMatchCard(match, pred, isPlayed, isLocked))
  })
}

// ── Builders ──────────────────────────────────────────────

function buildMatchTile(match, pred, isLocked, isPlayed) {
  const tile = document.createElement('div')
  let statusCls, badgeHtml

  if (isPlayed) {
    statusCls = 't-played'
    const pts = calcPoints(match, pred)
    badgeHtml = `<div class="tile-badge">${pts === 2 ? '⚡ Exact' : pts === 1 ? '✓ Goed' : '✗ Mis'}</div>`
  } else if (isLocked) {
    statusCls = 't-locked'
    badgeHtml = '<div class="tile-badge">⏸ Gesloten</div>'
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
      <div class="tile-flag">${match.home_flag || '🏳'}</div>
      <div class="tile-vs">-</div>
      <div class="tile-flag">${match.away_flag || '🏳'}</div>
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
  tile.addEventListener('click', () => switchTab('matches'))
  return tile
}

function buildUpcomingItem(match, hasPred) {
  const item = document.createElement('div')
  item.className = 'upcoming-item'
  item.innerHTML = `
    <div class="upcoming-icon" style="background:${tileColor(match.id)}">${match.home_flag || '⚽'}</div>
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

  const homeFlag = match.home_flag ? `<div class="match-flag">${match.home_flag}</div>` : ''
  const awayFlag = match.away_flag ? `<div class="match-flag">${match.away_flag}</div>` : ''

  card.innerHTML = `
    <div class="match-card-top">
      <span class="match-group">${match.poule || ''}</span>
      <span class="match-status ${statusClass}">${statusText}</span>
    </div>
    <div class="match-teams-row">
      <div class="match-team">
        ${homeFlag}
        <div class="match-team-name">${match.home || '?'}</div>
      </div>
      <div class="match-vs">
        <div class="match-vs-label">VS</div>
        <div class="match-vs-time">${match.date ? formatDate(match.date) : ''}</div>
      </div>
      <div class="match-team">
        ${awayFlag}
        <div class="match-team-name">${match.away || '?'}</div>
      </div>
    </div>
    <div class="match-bottom" id="mb-${match.id}"></div>
  `

  const bottom = card.querySelector(`#mb-${match.id}`)

  if (isPlayed) {
    const pts = calcPoints(match, pred)
    const ptClass = `pts-${pts}`
    const ptLabel = pts === 2 ? '⚡ Exact' : pts === 1 ? '✓ Winnaar goed' : '✗ 0 punten'
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
        if (pts === 2) exact++
        if (pts === 1) goed++
      }
    })
    return { ...p, points, exact, goed }
  }).sort((a, b) => b.points - a.points)
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
