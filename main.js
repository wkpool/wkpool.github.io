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
      <main>
        <h2>Ongeldige link</h2>
        <p>Neem contact op met de beheerder.</p>
      </main>
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
  document.getElementById('user-name').textContent = currentParticipant.name
  showTab('predictions')
}

function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'))
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'))
  document.getElementById(`tab-${tab}`).classList.remove('hidden')
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active')

  if (tab === 'predictions') loadPredictions()
  if (tab === 'scoreboard') loadScoreboard()
}

async function loadPredictions() {
  const container = document.getElementById('matches-list')
  container.innerHTML = '<p class="empty-state">Laden...</p>'

  const [{ data: matches }, { data: predictions }] = await Promise.all([
    supabase.from('matches').select('*').order('date'),
    supabase.from('predictions').select('*').eq('participant_id', currentParticipant.id)
  ])

  if (!matches || matches.length === 0) {
    container.innerHTML = '<p class="empty-state">Nog geen wedstrijden toegevoegd.</p>'
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
    container.appendChild(buildMatchCard(match, pred, isPlayed, isLocked))
  })
}

function buildMatchCard(match, pred, isPlayed, isLocked) {
  const card = document.createElement('div')
  card.className = 'match-card'
  const pts = isPlayed ? calcPoints(match, pred) : null

  card.innerHTML = `
    <div class="match-teams">
      <span class="team home">${match.home || '?'}</span>
      <span class="vs">-</span>
      <span class="team away">${match.away || '?'}</span>
    </div>
    ${match.date ? `<div class="match-date">${formatDate(match.date)}</div>` : ''}
    ${isPlayed ? `
      <div class="match-result">${match.score_home} - ${match.score_away}</div>
      <div class="pred-summary">
        <span>Jouw voorspelling: ${pred.pred_home ?? '—'} - ${pred.pred_away ?? '—'}</span>
        <span class="points-badge points-${pts}">${pts} pt</span>
      </div>
    ` : `
      <div class="prediction-form">
        <input type="number" min="0" max="20" value="${pred.pred_home ?? ''}"
          class="score-input" data-match="${match.id}" data-field="pred_home"
          ${isLocked ? 'disabled' : ''}>
        <span>-</span>
        <input type="number" min="0" max="20" value="${pred.pred_away ?? ''}"
          class="score-input" data-match="${match.id}" data-field="pred_away"
          ${isLocked ? 'disabled' : ''}>
        ${isLocked
          ? '<span class="locked-label">Gesloten</span>'
          : `<button class="save-btn" data-match="${match.id}">Opslaan</button>`
        }
      </div>
    `}
  `
  return card
}

function calcPoints(match, pred) {
  if (pred.pred_home === null || pred.pred_home === undefined) return 0
  if (pred.pred_away === null || pred.pred_away === undefined) return 0
  if (match.score_home === pred.pred_home && match.score_away === pred.pred_away) return 2
  const matchWinner = Math.sign(match.score_home - match.score_away)
  const predWinner = Math.sign(pred.pred_home - pred.pred_away)
  return matchWinner === predWinner ? 1 : 0
}

async function savePrediction(matchId) {
  const homeInput = document.querySelector(`input[data-match="${matchId}"][data-field="pred_home"]`)
  const awayInput = document.querySelector(`input[data-match="${matchId}"][data-field="pred_away"]`)
  const btn = document.querySelector(`.save-btn[data-match="${matchId}"]`)

  if (homeInput.value === '' || awayInput.value === '') {
    alert('Vul beide scores in.')
    return
  }

  const pred_home = parseInt(homeInput.value)
  const pred_away = parseInt(awayInput.value)

  btn.textContent = 'Opslaan...'
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
    btn.style.background = '#e53935'
    setTimeout(() => {
      btn.textContent = 'Opslaan'
      btn.style.background = ''
      btn.disabled = false
    }, 2000)
  } else {
    btn.textContent = 'Opgeslagen!'
    btn.classList.add('saved')
    setTimeout(() => {
      btn.textContent = 'Opslaan'
      btn.classList.remove('saved')
      btn.disabled = false
    }, 2000)
  }
}

async function loadScoreboard() {
  const container = document.getElementById('scoreboard-list')
  container.innerHTML = '<p class="empty-state">Laden...</p>'

  const [{ data: participants }, { data: matches }, { data: predictions }] = await Promise.all([
    supabase.from('participants').select('*'),
    supabase.from('matches').select('*'),
    supabase.from('predictions').select('*')
  ])

  const playedMatches = (matches || []).filter(m => m.score_home !== null && m.score_away !== null)

  const scores = (participants || []).map(p => {
    const preds = (predictions || []).filter(pr => pr.participant_id === p.id)
    let points = 0
    preds.forEach(pred => {
      const match = playedMatches.find(m => m.id === pred.match_id)
      if (match) points += calcPoints(match, pred)
    })
    return { ...p, points }
  }).sort((a, b) => b.points - a.points)

  container.innerHTML = ''
  scores.forEach((p, i) => {
    const row = document.createElement('div')
    row.className = `scoreboard-row${p.id === currentParticipant.id ? ' current-user' : ''}`
    const rankClass = i < 3 ? ` rank-${i + 1}` : ''
    row.innerHTML = `
      <span class="rank${rankClass}">${i + 1}</span>
      <span class="sb-name">${p.name}</span>
      <span class="sb-points">${p.points} pt</span>
    `
    container.appendChild(row)
  })
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit'
  })
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.save-btn')
  if (btn) savePrediction(parseInt(btn.dataset.match))

  const tab = e.target.closest('.tab-btn')
  if (tab) showTab(tab.dataset.tab)
})

init()
