import { supabase } from './supabase.js'

let currentParticipant = null

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
    .from('participants')
    .select('*')
    .eq('token', token)
    .single()

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

  const nameEl = document.getElementById('nav-user-name')
  nameEl.textContent = currentParticipant.name

  const avatarEl = document.getElementById('nav-avatar')
  const parts = currentParticipant.name.trim().split(' ')
  avatarEl.textContent = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : currentParticipant.name.slice(0, 2).toUpperCase()

  switchTab('scoreboard')
}

function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'))
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'))
  document.getElementById(`tab-${tab}`).classList.remove('hidden')
  document.querySelector(`.nav-tab[data-tab="${tab}"]`)?.classList.add('active')

  if (tab === 'scoreboard') loadDashboard()
  if (tab === 'matches') loadMatches()
}

async function loadDashboard() {
  const [{ data: participants }, { data: matches }, { data: predictions }] = await Promise.all([
    supabase.from('participants').select('*'),
    supabase.from('matches').select('*').order('date'),
    supabase.from('predictions').select('*')
  ])

  const now = new Date()
  const playedMatches = (matches || []).filter(m => m.score_home !== null && m.score_away !== null)

  const scores = (participants || []).map(p => {
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

  const myScore = scores.find(p => p.id === currentParticipant.id) || { points: 0, exact: 0, goed: 0 }
  const myRank = scores.indexOf(myScore) + 1
  const openMatches = (matches || []).filter(m => {
    const notPlayed = m.score_home === null || m.score_away === null
    const notLocked = m.date ? now < new Date(m.date) : true
    return notPlayed && notLocked
  })

  // Stats
  const statsGrid = document.getElementById('stats-grid')
  statsGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Jouw positie</div>
      <div class="stat-value">${myRank}e</div>
      <div class="stat-sub">van ${scores.length} deelnemers</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Totaal punten</div>
      <div class="stat-value">${myScore.points}</div>
      <div class="stat-sub">gespeeld: ${playedMatches.length} wedstrijden</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Exact raak</div>
      <div class="stat-value">${myScore.exact}</div>
      <div class="stat-sub">voorspellingen</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Open</div>
      <div class="stat-value">${openMatches.length}</div>
      <div class="stat-sub">wedstrijden te voorspellen</div>
      ${openMatches.length > 0 ? '<span class="stat-badge badge-green">Actief</span>' : ''}
    </div>
  `

  // Scoreboard
  const sbList = document.getElementById('scoreboard-list')
  sbList.innerHTML = ''
  const medals = ['🥇', '🥈', '🥉']

  scores.forEach((p, i) => {
    const isMe = p.id === currentParticipant.id
    const row = document.createElement('div')
    row.className = `sb-row${isMe ? ' me' : ''}`

    const parts = (p.name || '??').trim().split(' ')
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : (p.name || '??').slice(0, 2).toUpperCase()

    const rankCell = i < 3
      ? `<span style="font-size:18px;line-height:1">${medals[i]}</span>`
      : `<span class="sb-rank-num">${i + 1}</span>`

    row.innerHTML = `
      <div class="sb-rank-cell">${rankCell}</div>
      <div class="sb-avatar-sm">${initials}</div>
      <div class="sb-name-col">
        <span class="sb-name-text">${p.name}</span>
        ${isMe ? '<span class="sb-me-tag">← Jij</span>' : ''}
      </div>
      <span class="sb-pts">${p.points}</span>
      <span class="sb-exact">${p.exact}</span>
    `
    sbList.appendChild(row)
  })

  // Upcoming matches
  const myPredMap = {}
  ;(predictions || []).filter(p => p.participant_id === currentParticipant.id)
    .forEach(p => { myPredMap[p.match_id] = p })

  const upcoming = (matches || [])
    .filter(m => m.date && new Date(m.date) > now && (m.score_home === null || m.score_away === null))
    .slice(0, 3)

  const upcomingList = document.getElementById('upcoming-list')
  upcomingList.innerHTML = ''
  if (upcoming.length === 0) {
    upcomingList.innerHTML = '<p class="empty-state">Geen aankomende wedstrijden</p>'
  } else {
    upcoming.forEach(match => {
      upcomingList.appendChild(buildMatchCard(match, myPredMap[match.id] || {}, false, false, true))
    })
  }
}

async function loadMatches() {
  const container = document.getElementById('all-matches-list')
  container.innerHTML = '<p class="empty-state">Laden...</p>'

  const [{ data: matches }, { data: predictions }] = await Promise.all([
    supabase.from('matches').select('*').order('date'),
    supabase.from('predictions').select('*').eq('participant_id', currentParticipant.id)
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
    const pred = predMap[match.id] || {}
    const isPlayed = match.score_home !== null && match.score_away !== null
    const isLocked = match.date ? now >= new Date(match.date) : false
    container.appendChild(buildMatchCard(match, pred, isPlayed, isLocked, false))
  })
}

function buildMatchCard(match, pred, isPlayed, isLocked, dashboardView) {
  const card = document.createElement('div')
  card.className = 'match-card'

  const pts = isPlayed ? calcPoints(match, pred) : null

  // Header
  const top = document.createElement('div')
  top.className = 'match-card-top'
  let statusText, statusClass
  if (isPlayed)      { statusText = 'Gespeeld'; statusClass = 's-played' }
  else if (isLocked) { statusText = 'Gesloten'; statusClass = 's-closed' }
  else               { statusText = 'Open';     statusClass = 's-open'   }
  top.innerHTML = `
    <span class="match-group">${match.poule || ''}</span>
    <span class="match-status ${statusClass}">${statusText}</span>
  `
  card.appendChild(top)

  // Teams
  const teamsRow = document.createElement('div')
  teamsRow.className = 'match-teams-row'
  const homeFlag = match.home_flag ? `<div class="match-flag">${match.home_flag}</div>` : ''
  const awayFlag = match.away_flag ? `<div class="match-flag">${match.away_flag}</div>` : ''
  teamsRow.innerHTML = `
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
  `
  card.appendChild(teamsRow)

  // Bottom row
  const bottom = document.createElement('div')
  bottom.className = 'match-bottom'

  if (isPlayed) {
    const ptClass = `pts-${pts}`
    const ptLabel = pts === 2 ? 'Exact' : pts === 1 ? 'Winnaar goed' : '0 punten'
    bottom.innerHTML = `
      <span class="played-meta">Uitslag: ${match.score_home} – ${match.score_away} · Jij: ${pred.pred_home ?? '—'} – ${pred.pred_away ?? '—'}</span>
      <span class="pts-tag ${ptClass}">${ptLabel}</span>
    `
  } else if (dashboardView || isLocked) {
    const hasPred = pred.pred_home !== undefined && pred.pred_home !== null
    bottom.innerHTML = `
      <span class="pred-label">Jouw voorspelling</span>
      ${hasPred
        ? `<span class="pred-value">${pred.pred_home} – ${pred.pred_away}</span>`
        : `<span class="pred-empty">—</span>`
      }
    `
  } else {
    const hasPred = pred.pred_home !== undefined && pred.pred_home !== null
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

  card.appendChild(bottom)
  return card
}

function calcPoints(match, pred) {
  if (pred.pred_home === null || pred.pred_home === undefined) return 0
  if (pred.pred_away === null || pred.pred_away === undefined) return 0
  if (match.score_home === pred.pred_home && match.score_away === pred.pred_away) return 2
  const matchWinner = Math.sign(match.score_home - match.score_away)
  const predWinner  = Math.sign(pred.pred_home  - pred.pred_away)
  return matchWinner === predWinner ? 1 : 0
}

async function savePrediction(matchId) {
  const homeInput = document.querySelector(`input[data-match="${matchId}"][data-field="pred_home"]`)
  const awayInput = document.querySelector(`input[data-match="${matchId}"][data-field="pred_away"]`)
  const btn       = document.querySelector(`.save-btn[data-match="${matchId}"]`)

  if (homeInput.value === '' || awayInput.value === '') {
    homeInput.style.borderColor = 'var(--red)'
    awayInput.style.borderColor = 'var(--red)'
    setTimeout(() => { homeInput.style.borderColor = ''; awayInput.style.borderColor = '' }, 1500)
    return
  }

  const pred_home = parseInt(homeInput.value)
  const pred_away = parseInt(awayInput.value)

  btn.textContent = '...'
  btn.disabled = true

  const { data: existing } = await supabase
    .from('predictions')
    .select('id')
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
    btn.textContent = '✓ Opgeslagen'
    btn.classList.add('saved')
    setTimeout(() => {
      btn.textContent = 'Aanpassen'
      btn.classList.remove('saved')
      btn.classList.add('edit')
      btn.disabled = false
    }, 2000)
  }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit'
  })
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.save-btn')
  if (btn && !btn.disabled) { savePrediction(parseInt(btn.dataset.match)); return }

  const tab = e.target.closest('.nav-tab')
  if (tab) { switchTab(tab.dataset.tab); return }
})

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('hero-predictions-btn')?.addEventListener('click', () => switchTab('matches'))
  document.getElementById('hero-rules-btn')?.addEventListener('click', () => switchTab('rules'))
  document.getElementById('to-matches-btn')?.addEventListener('click', () => switchTab('matches'))
  document.getElementById('to-all-matches-btn')?.addEventListener('click', () => switchTab('matches'))
})

init()
