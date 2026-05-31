import { supabase } from './supabase.js'

let currentParticipant = null

const AVATAR_COLORS = ['#FF6600','#7B5EA7','#1B4FD8','#2AAC60','#E84040','#0099CC','#C87D00']

function avatarColor(id) {
  return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length]
}

function initialen(naam) {
  const parts = (naam || '??').trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (naam || '??').slice(0, 2).toUpperCase()
}

// ── Init ────────────────────────────────────────────────────
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
    document.querySelector('.login-title').textContent = 'ONGELDIGE LINK'
    document.querySelector('.login-card-text').textContent =
      'Neem contact op met de beheerder voor een geldige uitnodigingslink.'
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

  document.getElementById('user-name').textContent = currentParticipant.name
  document.getElementById('user-initial').textContent = initialen(currentParticipant.name)[0]

  showHome()
}

// ── Views ───────────────────────────────────────────────────
function showHome() {
  document.getElementById('home-view').classList.remove('hidden')
  document.getElementById('matches-view').classList.add('hidden')
  loadHome()
}

function showMatches() {
  document.getElementById('home-view').classList.add('hidden')
  document.getElementById('matches-view').classList.remove('hidden')
  loadMatches()
}

// ── Home ────────────────────────────────────────────────────
async function loadHome() {
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
  const myRank  = scores.indexOf(myScore) + 1
  const leader  = scores[0]

  const openMatches = (matches || []).filter(m => {
    const notPlayed = m.score_home === null || m.score_away === null
    const notLocked = m.date ? now < new Date(m.date) : true
    return notPlayed && notLocked
  })

  const myPredMap = {}
  ;(predictions || []).filter(p => p.participant_id === currentParticipant.id)
    .forEach(p => { myPredMap[p.match_id] = p })

  // Orange stats strip
  document.getElementById('stat-rank').textContent  = myRank + 'e'
  document.getElementById('stat-pts').textContent   = myScore.points
  document.getElementById('stat-exact').textContent = myScore.exact
  document.getElementById('stat-open').textContent  = openMatches.length

  // Navy stats
  const gap = leader && leader.id !== currentParticipant.id
    ? leader.points - myScore.points
    : 0
  document.getElementById('navy-gap').textContent     = gap
  document.getElementById('navy-gap-sub').textContent = leader ? `${leader.name} heeft ${leader.points}` : ''
  document.getElementById('navy-played').textContent  = playedMatches.length
  document.getElementById('navy-played-sub').textContent = `van de ${(matches || []).length}`

  const totalPreds = (predictions || []).filter(p => p.participant_id === currentParticipant.id
    && playedMatches.find(m => m.id === p.match_id))
  const correctWinner = totalPreds.filter(p => {
    const m = playedMatches.find(m => m.id === p.match_id)
    return m && calcPoints(m, p) > 0
  })
  const winPct = totalPreds.length > 0
    ? Math.round((correctWinner.length / totalPreds.length) * 100)
    : 0
  document.getElementById('navy-pct').textContent = winPct + '%'

  // Scoreboard
  renderScoreboard(scores)

  // Upcoming
  const upcoming = (matches || [])
    .filter(m => m.date && new Date(m.date) > now && (m.score_home === null || m.score_away === null))
    .slice(0, 3)

  const upcomingList = document.getElementById('upcoming-list')
  upcomingList.innerHTML = ''
  if (upcoming.length === 0) {
    upcomingList.innerHTML = '<p style="color:rgba(0,0,0,0.3);font-size:14px;padding:1rem 0">Geen aankomende wedstrijden</p>'
  } else {
    upcoming.forEach(m => upcomingList.appendChild(buildMatchCard(m, myPredMap[m.id] || {}, false, false, true)))
  }
}

function renderScoreboard(scores) {
  const list = document.getElementById('sb-list')
  list.innerHTML = ''
  scores.forEach((p, i) => {
    const isMe = p.id === currentParticipant.id
    const row  = document.createElement('div')
    row.className = `sb-row${i === 0 ? ' rank-1' : ''}${isMe ? ' me' : ''}`

    row.innerHTML = `
      <div class="sb-rank">${i + 1}</div>
      <div class="sb-av" style="background:${avatarColor(p.id)}">${initialen(p.name)[0]}</div>
      <div class="sb-name-col">
        <span class="sb-name">${p.name}</span>
        ${isMe ? '<span class="sb-me-tag">← jij</span>' : ''}
      </div>
      <span class="sb-pts">${p.points}</span>
      <span class="sb-ext">${p.exact}</span>
    `
    list.appendChild(row)
  })
}

// ── Matches ─────────────────────────────────────────────────
async function loadMatches() {
  const container = document.getElementById('all-matches-list')
  container.innerHTML = '<p class="empty-state">Laden...</p>'

  const [{ data: matches }, { data: predictions }] = await Promise.all([
    supabase.from('matches').select('*').order('date'),
    supabase.from('predictions').select('*').eq('participant_id', currentParticipant.id)
  ])

  if (!matches || matches.length === 0) {
    container.innerHTML = '<p class="empty-state">Nog geen wedstrijden</p>'
    return
  }

  const predMap = {}
  predictions?.forEach(p => { predMap[p.match_id] = p })

  const now = new Date()
  container.innerHTML = ''
  matches.forEach(match => {
    const pred     = predMap[match.id] || {}
    const isPlayed = match.score_home !== null && match.score_away !== null
    const isLocked = match.date ? now >= new Date(match.date) : false
    container.appendChild(buildMatchCard(match, pred, isPlayed, isLocked, false))
  })
}

// ── Match card builder ───────────────────────────────────────
function buildMatchCard(match, pred, isPlayed, isLocked, readOnly) {
  const card = document.createElement('div')
  card.className = 'match-card'

  const pts = isPlayed ? calcPoints(match, pred) : null

  let statusText, statusClass
  if (isPlayed)      { statusText = 'Gespeeld'; statusClass = 'badge-played' }
  else if (isLocked) { statusText = 'Gesloten'; statusClass = 'badge-closed' }
  else               { statusText = 'Open';     statusClass = 'badge-open'   }

  const homeFlag = match.home_flag ? `<div class="mc-flag">${match.home_flag}</div>` : ''
  const awayFlag = match.away_flag ? `<div class="mc-flag">${match.away_flag}</div>` : ''

  card.innerHTML = `
    <div class="mc-head">
      <span class="mc-group">⚽ ${match.poule || ''}</span>
      <span class="mc-badge ${statusClass}">${statusText}</span>
    </div>
    <div class="mc-teams">
      <div class="mc-team">${homeFlag}<div class="mc-name">${match.home || '?'}</div></div>
      <div class="mc-vs">
        <div class="mc-vs-sym">-</div>
        <div class="mc-date">${match.date ? formatDate(match.date) : ''}</div>
      </div>
      <div class="mc-team">${awayFlag}<div class="mc-name">${match.away || '?'}</div></div>
    </div>
    <div class="mc-bottom" id="mc-bottom-${match.id}"></div>
  `

  const bottom = card.querySelector(`#mc-bottom-${match.id}`)

  if (isPlayed) {
    const ptClass = `pts-${pts}`
    const ptLabel = pts === 2 ? 'Exact' : pts === 1 ? 'Winnaar goed' : '0 punten'
    bottom.innerHTML = `
      <div>
        <div class="played-meta">Uitslag: ${match.score_home} – ${match.score_away}</div>
        <div class="played-meta">Jij: ${pred.pred_home ?? '—'} – ${pred.pred_away ?? '—'}</div>
      </div>
      <span class="pts-tag ${ptClass}">${ptLabel}</span>
    `
  } else if (readOnly || isLocked) {
    const hasPred = pred.pred_home !== undefined && pred.pred_home !== null
    bottom.innerHTML = `
      <span class="mc-pred-lbl">Jouw voorspelling</span>
      ${hasPred
        ? `<span class="mc-pred-val">${pred.pred_home} - ${pred.pred_away}</span>`
        : `<span class="mc-pred-empty">—</span>`
      }
    `
  } else {
    const hasPred = pred.pred_home !== undefined && pred.pred_home !== null
    bottom.innerHTML = `
      <span class="mc-pred-lbl">Jouw voorspelling</span>
      <div class="pred-form">
        <input type="number" min="0" max="20" value="${pred.pred_home ?? ''}"
          class="score-in" data-match="${match.id}" data-field="pred_home">
        <span class="score-dash">-</span>
        <input type="number" min="0" max="20" value="${pred.pred_away ?? ''}"
          class="score-in" data-match="${match.id}" data-field="pred_away">
        <button class="save-btn${hasPred ? ' edit' : ''}" data-match="${match.id}">
          ${hasPred ? 'Aanpassen' : 'Opslaan'}
        </button>
      </div>
    `
  }

  return card
}

// ── Save prediction ──────────────────────────────────────────
async function savePrediction(matchId) {
  const homeInput = document.querySelector(`input[data-match="${matchId}"][data-field="pred_home"]`)
  const awayInput = document.querySelector(`input[data-match="${matchId}"][data-field="pred_away"]`)
  const btn       = document.querySelector(`.save-btn[data-match="${matchId}"]`)

  if (homeInput.value === '' || awayInput.value === '') {
    homeInput.style.borderColor = '#FF3B30'
    awayInput.style.borderColor = '#FF3B30'
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

// ── Helpers ──────────────────────────────────────────────────
function calcPoints(match, pred) {
  if (pred.pred_home === null || pred.pred_home === undefined) return 0
  if (pred.pred_away === null || pred.pred_away === undefined) return 0
  if (match.score_home === pred.pred_home && match.score_away === pred.pred_away) return 2
  const mw = Math.sign(match.score_home - match.score_away)
  const pw = Math.sign(pred.pred_home  - pred.pred_away)
  return mw === pw ? 1 : 0
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit'
  })
}

// ── Event listeners ──────────────────────────────────────────
document.addEventListener('click', e => {
  const saveBtn = e.target.closest('.save-btn')
  if (saveBtn && !saveBtn.disabled) { savePrediction(parseInt(saveBtn.dataset.match)); return }
})

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-voorspellingen')?.addEventListener('click', showMatches)
  document.getElementById('btn-alles-wedstrijden')?.addEventListener('click', showMatches)
  document.getElementById('btn-alles-sb')?.addEventListener('click', showMatches)
  document.getElementById('btn-scorebord')?.addEventListener('click', () => {
    document.getElementById('scoreboard-section')?.scrollIntoView({ behavior: 'smooth' })
  })
  document.getElementById('btn-back')?.addEventListener('click', showHome)
})

init()
