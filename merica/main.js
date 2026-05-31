import { supabase } from './supabase.js'

let currentParticipant = null
const stepperState = {} // { [matchId]: { home: 0, away: 0 } }

function initialen(naam) {
  const parts = (naam || '??').trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (naam || '??').slice(0, 2).toUpperCase()
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    weekday: 'short', day: 'numeric', month: 'short'
  })
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

// ── Init ─────────────────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(window.location.search)
  const token  = params.get('token')

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
    document.querySelector('.login-card').innerHTML =
      'Ongeldige link — neem contact op met de beheerder.'
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

  document.getElementById('nav-user-name').textContent = currentParticipant.name
  document.getElementById('nav-avatar').textContent    = initialen(currentParticipant.name)[0]

  showHome()
}

// ── Views ─────────────────────────────────────────────────────
function showHome() {
  document.getElementById('home-view').classList.remove('hidden')
  document.getElementById('matches-view').classList.add('hidden')
  loadHome()
}

function showMatches() {
  document.getElementById('home-view').classList.add('hidden')
  document.getElementById('matches-view').classList.remove('hidden')
  loadAllMatches()
}

// ── Home ─────────────────────────────────────────────────────
async function loadHome() {
  const [{ data: participants }, { data: matches }, { data: predictions }] = await Promise.all([
    supabase.from('participants').select('*'),
    supabase.from('matches').select('*').order('date'),
    supabase.from('predictions').select('*')
  ])

  const now          = new Date()
  const playedMatches = (matches || []).filter(m => m.score_home !== null && m.score_away !== null)

  const scores = (participants || []).map(p => {
    const preds = (predictions || []).filter(pr => pr.participant_id === p.id)
    let points = 0, exact = 0
    preds.forEach(pred => {
      const match = playedMatches.find(m => m.id === pred.match_id)
      if (match) {
        const pts = calcPoints(match, pred)
        points += pts
        if (pts === 2) exact++
      }
    })
    return { ...p, points, exact }
  }).sort((a, b) => b.points - a.points)

  const myScore  = scores.find(p => p.id === currentParticipant.id) || { points: 0, exact: 0 }
  const myRank   = scores.indexOf(myScore) + 1
  const myPredMap = {}
  ;(predictions || []).filter(p => p.participant_id === currentParticipant.id)
    .forEach(p => { myPredMap[p.match_id] = p })

  const nextMatch   = (matches || []).find(m => m.date && new Date(m.date) > now)
  const openMatches = (matches || []).filter(m =>
    (m.score_home === null || m.score_away === null) && m.date && now < new Date(m.date)
  )

  const grid = document.getElementById('home-grid')

  // Left column
  const leftCol = document.createElement('div')
  leftCol.style.display = 'flex'
  leftCol.style.flexDirection = 'column'
  leftCol.style.gap = '20px'

  // Fight card (next match)
  leftCol.appendChild(buildFightCard(nextMatch, myPredMap))

  // Upcoming tickets
  const ticketsSection = document.createElement('div')
  const upcoming = (matches || [])
    .filter(m => m.date && new Date(m.date) > now && (m.score_home === null || m.score_away === null))
    .slice(0, 4)

  if (upcoming.length > 0) {
    const lbl = document.createElement('div')
    lbl.className = 'eyebrow'
    lbl.style.cssText = 'margin-bottom:8px;display:block'
    lbl.textContent = 'Later Today'
    ticketsSection.appendChild(lbl)

    const list = document.createElement('div')
    list.className = 'match-list'
    upcoming.forEach(m => list.appendChild(buildTicket(m, myPredMap[m.id] || {}, false, false)))
    ticketsSection.appendChild(list)

    const moreBtn = document.createElement('button')
    moreBtn.className = 'btn-ghost'
    moreBtn.style.marginTop = '10px'
    moreBtn.textContent = '★ All picks ★'
    moreBtn.addEventListener('click', showMatches)
    ticketsSection.appendChild(moreBtn)
  }

  leftCol.appendChild(ticketsSection)

  // Right column
  const rightCol = document.createElement('div')
  rightCol.style.display = 'flex'
  rightCol.style.flexDirection = 'column'
  rightCol.style.gap = '20px'

  // Stats card
  rightCol.appendChild(buildSideCard(myScore, myRank, scores.length, openMatches.length, playedMatches.length))

  // Leaderboard
  rightCol.appendChild(buildLeaderboard(scores))

  grid.innerHTML = ''
  grid.appendChild(leftCol)
  grid.appendChild(rightCol)
}

function buildFightCard(match, predMap) {
  const card = document.createElement('div')
  card.className = 'fight-card'

  if (!match) {
    card.innerHTML = `<div class="empty-fight"><em>No upcoming matches — all picks locked in.</em></div>`
    return card
  }

  const pred    = predMap[match.id] || {}
  const now     = new Date()
  const isLocked = match.date ? now >= new Date(match.date) : false

  card.innerHTML = `
    <div class="fight-top">
      <span class="stamp">★ Next Match ★</span>
      <span class="fight-date">— ${match.date ? formatDate(match.date) : ''} —</span>
    </div>
    <div style="position:relative;z-index:2;text-align:center;font-family:var(--tickets);font-size:13px;letter-spacing:0.14em;color:var(--ink-soft);">— in this corner —</div>
    <div class="vs-block">
      <span class="vs-team">${match.home || '?'}</span>
      <span class="vs-sep">— versus —</span>
      <span class="vs-team">${match.away || '?'}</span>
    </div>
    <div class="fight-footer">
      <div class="fight-when">
        <span>${match.poule ? `// ${match.poule}` : ''}</span>
        <strong>${match.date ? formatTime(match.date) : ''}</strong>
      </div>
      ${!isLocked
        ? `<button class="btn-primary" id="fc-pick-btn" data-match="${match.id}">Make your pick</button>`
        : `<span class="chip">★ locked ★</span>`
      }
    </div>
  `

  if (!isLocked) {
    card.querySelector('#fc-pick-btn')?.addEventListener('click', () => {
      showMatches()
    })
  }

  return card
}

function buildSideCard(myScore, myRank, total, openCount, playedCount) {
  const card = document.createElement('div')
  card.className = 'side-card'
  card.innerHTML = `
    <svg class="seal" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="44" fill="none" stroke="#e7c069" stroke-width="2"/>
      <circle cx="50" cy="50" r="36" fill="none" stroke="#e7c069" stroke-width="1.5" stroke-dasharray="2 2"/>
      <polygon points="50,22 53,40 71,40 56,50 62,68 50,57 38,68 44,50 29,40 47,40" fill="#e7c069"/>
      <text x="50" y="84" text-anchor="middle" font-family="Stardos Stencil, monospace" font-size="6" fill="#e7c069" letter-spacing="2">DEPT OF PICKS</text>
    </svg>
    <span class="eyebrow" style="color:#e7c069;font-size:11px;">★ Your record ★</span>
    <h3>Pool: Eagle Pick '26</h3>
    <div class="stat-grid">
      <div class="stat gold"><div class="v">${myScore.points}</div><div class="k">// points</div></div>
      <div class="stat"><div class="v">#${myRank}</div><div class="k">// rank · of ${total}</div></div>
      <div class="stat red"><div class="v">${myScore.exact}×</div><div class="k">// exact bingo</div></div>
      <div class="stat"><div class="v">${openCount}</div><div class="k">// open picks</div></div>
    </div>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
      <span class="chip gold">${playedCount} gespeeld</span>
      ${openCount > 0 ? `<span class="chip" style="background:var(--red);color:var(--cream);border-color:var(--cream);outline:2px solid var(--navy)">★ ${openCount} open ★</span>` : ''}
    </div>
  `
  return card
}

function buildLeaderboard(scores) {
  const lb = document.createElement('div')
  lb.className = 'lb'
  lb.innerHTML = `
    <div class="lb-title">Wanted: Top Pickers<small>★ Eagle Pick '26 Pool ★</small></div>
  `
  scores.forEach((p, i) => {
    const isMe  = p.id === currentParticipant.id
    const row   = document.createElement('div')
    row.className = `lb-row${i === 0 ? ' first' : ''}${isMe ? ' me' : ''}`
    row.innerHTML = `
      <span class="lb-rank">${String(i + 1).padStart(2, '0')}</span>
      <div class="lb-who">
        <div class="lb-avatar">${initialen(p.name)}</div>
        <div>
          <div class="lb-name">${p.name}</div>
          ${isMe ? '<div class="lb-me-tag">← jij</div>' : ''}
        </div>
      </div>
      <span class="lb-pts">${p.points}<small>pts</small></span>
    `
    lb.appendChild(row)
  })
  return lb
}

// ── All Matches ───────────────────────────────────────────────
async function loadAllMatches() {
  const container = document.getElementById('all-matches-list')
  container.innerHTML = '<p class="empty-state">Loading picks...</p>'

  const [{ data: matches }, { data: predictions }] = await Promise.all([
    supabase.from('matches').select('*').order('date'),
    supabase.from('predictions').select('*').eq('participant_id', currentParticipant.id)
  ])

  if (!matches || matches.length === 0) {
    container.innerHTML = '<p class="empty-state">No matches yet, folks.</p>'
    return
  }

  const predMap = {}
  predictions?.forEach(p => { predMap[p.match_id] = p })

  const now    = new Date()
  const groepen = [...new Set(matches.map(m => m.poule).filter(Boolean))].sort()

  container.innerHTML = ''

  groepen.forEach(poule => {
    const header = document.createElement('div')
    header.className = 'match-group-header'
    header.textContent = poule
    container.appendChild(header)

    const list = document.createElement('div')
    list.className = 'match-list'
    matches.filter(m => m.poule === poule).forEach(m => {
      const pred     = predMap[m.id] || {}
      const isPlayed = m.score_home !== null && m.score_away !== null
      const isLocked = m.date ? now >= new Date(m.date) : false
      list.appendChild(buildTicket(m, pred, isPlayed, isLocked))
    })
    container.appendChild(list)
  })

  const noPoulems = matches.filter(m => !m.poule)
  if (noPoulems.length > 0) {
    const header = document.createElement('div')
    header.className = 'match-group-header'
    header.textContent = 'Overig'
    container.appendChild(header)
    const list = document.createElement('div')
    list.className = 'match-list'
    noPoulems.forEach(m => {
      const pred     = predMap[m.id] || {}
      const isPlayed = m.score_home !== null && m.score_away !== null
      const isLocked = m.date ? now >= new Date(m.date) : false
      list.appendChild(buildTicket(m, pred, isPlayed, isLocked))
    })
    container.appendChild(list)
  }
}

// ── Match ticket ──────────────────────────────────────────────
function buildTicket(match, pred, isPlayed, isLocked) {
  const wrapper = document.createElement('div')

  const ticket  = document.createElement('div')
  ticket.className = `match-ticket${isLocked && !isPlayed ? ' locked' : ''}`

  const main = document.createElement('div')
  main.className = 'ticket-main'

  // Time col
  const timeDiv = document.createElement('div')
  timeDiv.className = 'ticket-time'
  if (match.date) {
    timeDiv.innerHTML = `${formatTime(match.date)}<small>${formatDate(match.date)}</small>`
    if (isLocked && !isPlayed) {
      timeDiv.innerHTML += `<span class="locked-tag">★ locked ★</span>`
    }
  }

  // Teams col
  const pairDiv = document.createElement('div')
  pairDiv.className = 'ticket-pair'
  pairDiv.innerHTML = `
    <span class="ticket-codes">${match.home || '?'} <span class="x">×</span> ${match.away || '?'}</span>
    ${match.poule ? `<span class="ticket-group">${match.poule}</span>` : ''}
  `

  // Action col
  const actionDiv = document.createElement('div')

  if (isPlayed) {
    const pts = calcPoints(match, pred)
    const ptClass = `pts-${pts}`
    const ptLabel = pts === 2 ? '★ Exact' : pts === 1 ? 'Winnaar' : 'Mis'
    actionDiv.className = 'ticket-result'
    actionDiv.innerHTML = `
      <div class="score-line">${match.score_home} — ${match.score_away}</div>
      <div class="pts-line ${ptClass}">${ptLabel}</div>
      <div style="font-family:var(--tickets);font-size:11px;color:var(--ink-soft)">jij: ${pred.pred_home ?? '—'} — ${pred.pred_away ?? '—'}</div>
    `
  } else if (isLocked) {
    const hasPred = pred.pred_home !== undefined && pred.pred_home !== null
    actionDiv.className = 'ticket-result'
    if (hasPred) {
      actionDiv.innerHTML = `<div class="ticket-pred">${pred.pred_home} — ${pred.pred_away}</div>`
    } else {
      actionDiv.innerHTML = `<span style="font-family:var(--tickets);font-size:11px;color:var(--ink-soft);font-style:italic">no pick</span>`
    }
  } else {
    const hasPred = pred.pred_home !== undefined && pred.pred_home !== null
    if (hasPred) {
      // Show current prediction with edit option
      actionDiv.innerHTML = `
        <div class="ticket-pred">${pred.pred_home} — ${pred.pred_away}</div>
        <button class="btn-ghost" style="font-size:10px;padding:4px 8px;margin-top:4px" data-edit="${match.id}">Edit ★</button>
      `
    } else {
      actionDiv.innerHTML = `<span class="ticket-action" style="cursor:pointer" data-open="${match.id}">Make pick →</span>`
    }
  }

  main.appendChild(timeDiv)
  main.appendChild(pairDiv)
  main.appendChild(actionDiv)
  ticket.appendChild(main)

  // Stepper strip (shown when open)
  if (!isPlayed && !isLocked) {
    const strip = buildStepperStrip(match, pred)
    strip.classList.add('hidden')
    strip.id = `stepper-${match.id}`
    ticket.appendChild(strip)

    // Toggle stepper on "Make pick" or "Edit"
    ticket.addEventListener('click', e => {
      const openTrigger = e.target.closest('[data-open]') || e.target.closest('[data-edit]')
      if (openTrigger) {
        strip.classList.toggle('hidden')
      }
    })
  }

  wrapper.appendChild(ticket)
  return wrapper
}

function buildStepperStrip(match, pred) {
  const strip = document.createElement('div')
  strip.className = 'stepper-strip'

  const homeScore = pred.pred_home ?? 0
  const awayScore = pred.pred_away ?? 0

  if (!stepperState[match.id]) {
    stepperState[match.id] = { home: homeScore, away: awayScore }
  }

  strip.innerHTML = `
    <div class="stepper-label">// Official Prediction · ${match.home || '?'} × ${match.away || '?'}</div>
    <div class="stepper-row">
      <div class="stepper">
        <div>
          <div class="stepper-team">${match.home || '?'}</div>
        </div>
        <div class="stepper-controls">
          <button class="step-btn" data-match="${match.id}" data-side="home" data-delta="-1">−</button>
          <div class="step-score" id="score-${match.id}-home">${stepperState[match.id].home}</div>
          <button class="step-btn" data-match="${match.id}" data-side="home" data-delta="1">+</button>
        </div>
      </div>
      <div class="stepper-dash">★</div>
      <div class="stepper">
        <div>
          <div class="stepper-team">${match.away || '?'}</div>
        </div>
        <div class="stepper-controls">
          <button class="step-btn" data-match="${match.id}" data-side="away" data-delta="-1">−</button>
          <div class="step-score" id="score-${match.id}-away">${stepperState[match.id].away}</div>
          <button class="step-btn" data-match="${match.id}" data-side="away" data-delta="1">+</button>
        </div>
      </div>
    </div>
    <div class="stepper-footer">
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <span class="chip gold">+2 op exact</span>
        <span class="chip">+1 op winnaar</span>
      </div>
      <button class="btn-primary lock-btn" data-match="${match.id}">Lock it in</button>
    </div>
  `

  return strip
}

function adjustScore(matchId, side, delta) {
  if (!stepperState[matchId]) stepperState[matchId] = { home: 0, away: 0 }
  stepperState[matchId][side] = Math.max(0, Math.min(20, (stepperState[matchId][side] || 0) + delta))
  const el = document.getElementById(`score-${matchId}-${side}`)
  if (el) el.textContent = stepperState[matchId][side]
}

async function savePrediction(matchId) {
  const state = stepperState[matchId]
  if (!state) return

  const btn = document.querySelector(`.lock-btn[data-match="${matchId}"]`)
  if (!btn) return

  btn.textContent = '...'
  btn.disabled = true

  const { data: existing } = await supabase
    .from('predictions').select('id')
    .eq('participant_id', currentParticipant.id)
    .eq('match_id', matchId)
    .maybeSingle()

  const { error } = existing
    ? await supabase.from('predictions').update({ pred_home: state.home, pred_away: state.away }).eq('id', existing.id)
    : await supabase.from('predictions').insert({ participant_id: currentParticipant.id, match_id: matchId, pred_home: state.home, pred_away: state.away })

  if (error) {
    btn.textContent = 'Error!'
    setTimeout(() => { btn.textContent = 'Lock it in'; btn.disabled = false }, 2000)
  } else {
    btn.textContent = 'Locked! ★'
    btn.classList.add('saved')
    setTimeout(() => {
      btn.textContent = 'Lock it in'
      btn.classList.remove('saved')
      btn.disabled = false
    }, 2000)
  }
}

// ── Scoring ───────────────────────────────────────────────────
function calcPoints(match, pred) {
  if (pred.pred_home === null || pred.pred_home === undefined) return 0
  if (pred.pred_away === null || pred.pred_away === undefined) return 0
  if (match.score_home === pred.pred_home && match.score_away === pred.pred_away) return 2
  const mw = Math.sign(match.score_home - match.score_away)
  const pw = Math.sign(pred.pred_home  - pred.pred_away)
  return mw === pw ? 1 : 0
}

// ── Events ────────────────────────────────────────────────────
document.addEventListener('click', e => {
  const stepBtn = e.target.closest('.step-btn')
  if (stepBtn) {
    adjustScore(parseInt(stepBtn.dataset.match), stepBtn.dataset.side, parseInt(stepBtn.dataset.delta))
    return
  }
  const lockBtn = e.target.closest('.lock-btn')
  if (lockBtn) {
    savePrediction(parseInt(lockBtn.dataset.match))
    return
  }
})

document.getElementById('btn-back')?.addEventListener('click', showHome)

init()
