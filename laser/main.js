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
      <div class="login-content" style="position:relative;z-index:2;">
        <div class="login-eyebrow">fout</div>
        <div class="login-title" style="font-size:60px;">ONGEL<br>DIGE<br>LINK</div>
        <div class="login-text">Neem contact op met de beheerder voor een geldige uitnodigingslink.</div>
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

  const nameEl = document.getElementById('user-name')
  nameEl.textContent = currentParticipant.name

  // Set avatar initials
  const avatarEl = document.getElementById('user-avatar-initials')
  if (avatarEl) {
    const parts = currentParticipant.name.trim().split(' ')
    avatarEl.textContent = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : currentParticipant.name.slice(0, 2).toUpperCase()
  }

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
    container.innerHTML = '<p class="empty-state">Nog geen wedstrijden toegevoegd</p>'
    return
  }

  const predMap = {}
  predictions?.forEach(p => { predMap[p.match_id] = p })

  const now = new Date()
  const volgende = matches.find(m => m.date && new Date(m.date) > now)
  renderCountdown(volgende)

  const groepen = [...new Set(matches.map(m => m.poule).filter(Boolean))].sort()

  let actieveFilter = null

  function renderMatches() {
    container.innerHTML = ''

    // Filter bar
    const filterBar = document.createElement('div')
    filterBar.className = 'filter-bar'

    const alleBtn = document.createElement('button')
    alleBtn.className = `filter-btn${actieveFilter === null ? ' active' : ''}`
    alleBtn.textContent = 'Alle groepen'
    alleBtn.addEventListener('click', () => { actieveFilter = null; renderMatches() })
    filterBar.appendChild(alleBtn)

    groepen.forEach(poule => {
      const btn = document.createElement('button')
      btn.className = `filter-btn${actieveFilter === poule ? ' active' : ''}`
      btn.textContent = poule
      btn.addEventListener('click', () => { actieveFilter = poule; renderMatches() })
      filterBar.appendChild(btn)
    })

    container.appendChild(filterBar)

    const zichtbaar = actieveFilter
      ? matches.filter(m => m.poule === actieveFilter)
      : matches

    zichtbaar.forEach(match => {
      const pred = predMap[match.id] || {}
      const isPlayed = match.score_home !== null && match.score_away !== null
      const isLocked = match.date ? now >= new Date(match.date) : false
      container.appendChild(buildMatchCard(match, pred, isPlayed, isLocked))
    })
  }

  renderMatches()
}

function buildMatchCard(match, pred, isPlayed, isLocked) {
  const card = document.createElement('div')
  card.className = 'match-card'

  const pts = isPlayed ? calcPoints(match, pred) : null

  // Accent bar
  const accent = document.createElement('div')
  accent.className = `match-card-accent${isLocked && !isPlayed ? ' locked-accent' : isPlayed ? ' played-accent' : ''}`
  card.appendChild(accent)

  // Teams
  const teams = document.createElement('div')
  teams.className = 'match-teams'
  teams.innerHTML = `
    <span class="team-name">${match.home || '?'}</span>
    <span class="vs-sep">×</span>
    <span class="team-name">${match.away || '?'}</span>
  `
  card.appendChild(teams)

  // Date / meta
  if (match.date) {
    const meta = document.createElement('div')
    meta.className = 'match-meta'
    const pouleStr = match.poule ? `${match.poule} · ` : ''
    meta.textContent = pouleStr + formatDate(match.date)
    card.appendChild(meta)
  }

  if (isPlayed) {
    // Result
    const resultDiv = document.createElement('div')
    resultDiv.className = 'match-result'
    resultDiv.innerHTML = `
      <span class="result-score">${match.score_home} — ${match.score_away}</span>
      <span class="result-label">eindstand</span>
    `
    card.appendChild(resultDiv)

    // Prediction summary
    const summary = document.createElement('div')
    summary.className = 'pred-summary'
    const ptClass = `points-${pts}`
    const ptLabel = pts === 2 ? '✓ exact' : pts === 1 ? '~ winnaar' : '✗ mis'
    summary.innerHTML = `
      <span>Jouw tip: ${pred.pred_home ?? '—'} — ${pred.pred_away ?? '—'}</span>
      <span class="points-badge ${ptClass}">${pts} pt · ${ptLabel}</span>
    `
    card.appendChild(summary)

  } else {
    // Prediction form
    const form = document.createElement('div')
    form.className = 'prediction-form'

    const hasPred = pred.pred_home !== undefined && pred.pred_home !== null

    form.innerHTML = `
      <input type="number" min="0" max="20" value="${pred.pred_home ?? ''}"
        class="score-input" data-match="${match.id}" data-field="pred_home"
        ${isLocked ? 'disabled' : ''}>
      <span class="score-dash">—</span>
      <input type="number" min="0" max="20" value="${pred.pred_away ?? ''}"
        class="score-input" data-match="${match.id}" data-field="pred_away"
        ${isLocked ? 'disabled' : ''}>
      ${isLocked
        ? '<span class="locked-label">// gesloten</span>'
        : `<button class="save-btn${hasPred ? ' aanpassen' : ''}" data-match="${match.id}">${hasPred ? 'Pas aan' : 'Opslaan'}</button>`
      }
    `
    card.appendChild(form)
  }

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
    // Flash input borders instead of alert
    homeInput.style.borderColor = 'var(--magenta)'
    awayInput.style.borderColor = 'var(--magenta)'
    setTimeout(() => {
      homeInput.style.borderColor = ''
      awayInput.style.borderColor = ''
    }, 1500)
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
    btn.style.background = 'var(--magenta)'
    setTimeout(() => {
      btn.textContent = 'Opslaan'
      btn.style.background = ''
      btn.disabled = false
    }, 2000)
  } else {
    btn.textContent = '✓ Opgeslagen'
    btn.classList.add('saved')
    setTimeout(() => {
      btn.textContent = 'Pas aan'
      btn.classList.remove('saved')
      btn.classList.add('aanpassen')
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
    const rankClass = i === 0 ? 'rank-first' : ''
    const isMe = p.id === currentParticipant.id
    row.className = `scoreboard-row ${rankClass}${isMe ? ' current-user' : ''}`

    const sbRankClass = i < 3 ? ` rank-${i + 1}` : ''
    const rankLabel = String(i + 1).padStart(2, '0')

    // Avatar initials
    const nameParts = (p.name || '??').trim().split(' ')
    const initials = nameParts.length >= 2
      ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
      : (p.name || '??').slice(0, 2).toUpperCase()

    row.innerHTML = `
      <span class="sb-rank${sbRankClass}">${rankLabel}</span>
      <div class="sb-avatar">${initials}</div>
      <span class="sb-name">${p.name}${isMe ? ' <span style="color:var(--magenta);font-size:11px;font-family:var(--mono);">// jij</span>' : ''}</span>
      <span class="sb-points">${p.points}<small>pts</small></span>
    `
    container.appendChild(row)
  })
}

let countdownInterval = null

function renderCountdown(match) {
  if (countdownInterval) clearInterval(countdownInterval)

  const container = document.getElementById('countdown-container')
  container.innerHTML = ''
  if (!match) return

  const card = document.createElement('div')
  card.className = 'countdown-card'
  card.innerHTML = `
    <div class="grid-bg"></div>
    <div class="countdown-inner">
      <div class="countdown-label-top">volgende wedstrijd</div>
      <div class="countdown-match-name">${match.home} × ${match.away}</div>
      <div class="countdown-timer">
        <div class="countdown-unit">
          <span class="countdown-value" id="cd-days">0</span>
          <span class="countdown-unit-label">dagen</span>
        </div>
        <div class="countdown-sep">:</div>
        <div class="countdown-unit">
          <span class="countdown-value" id="cd-hours">00</span>
          <span class="countdown-unit-label">uur</span>
        </div>
        <div class="countdown-sep">:</div>
        <div class="countdown-unit">
          <span class="countdown-value" id="cd-mins">00</span>
          <span class="countdown-unit-label">min</span>
        </div>
        <div class="countdown-sep">:</div>
        <div class="countdown-unit">
          <span class="countdown-value" id="cd-secs">00</span>
          <span class="countdown-unit-label">sec</span>
        </div>
      </div>
    </div>
  `
  container.appendChild(card)

  const kickoff = new Date(match.date)

  function tick() {
    const diff = kickoff - new Date()
    if (diff <= 0) {
      clearInterval(countdownInterval)
      card.innerHTML = `
        <div class="countdown-inner">
          <div class="countdown-label-top">bezig!</div>
          <div class="countdown-match-name">${match.home} × ${match.away} — afgetrapt!</div>
        </div>
      `
      return
    }
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    document.getElementById('cd-days').textContent = days
    document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0')
    document.getElementById('cd-mins').textContent = String(mins).padStart(2, '0')
    document.getElementById('cd-secs').textContent = String(secs).padStart(2, '0')
  }

  tick()
  countdownInterval = setInterval(tick, 1000)
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
