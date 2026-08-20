(() => {
  'use strict';

  const RING_CIRCUMFERENCE = 2 * Math.PI * 138; // ~867.08

  const $ = (id) => document.getElementById(id);

  /* ============================================================
   *  Tema
   * ========================================================== */
  const themeToggle = $('themeToggle');
  const savedTheme = localStorage.getItem('conometro-theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggle.textContent = document.documentElement.getAttribute('data-theme') === 'light' ? '☀️' : '🌙';

  themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const next = isLight ? 'dark' : 'light';
    if (next === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('conometro-theme', next);
    themeToggle.textContent = next === 'light' ? '☀️' : '🌙';
  });

  /* ============================================================
   *  Abas
   * ========================================================== */
  const tabs = document.querySelectorAll('.tab');
  const panels = {
    stopwatch: $('panel-stopwatch'),
    timer: $('panel-timer'),
    history: $('panel-history'),
  };

  const TAB_TITLES = {
    stopwatch: 'Cronômetro · Conometro',
    timer: 'Temporizador · Conometro',
    history: 'Estudos · Conometro',
  };

  function activateTab(name) {
    tabs.forEach((t) => {
      const active = t.dataset.tab === name;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    });
    Object.entries(panels).forEach(([key, el]) => el.classList.toggle('active', key === name));
    document.title = TAB_TITLES[name] || 'Conometro';
    if (name === 'history') renderHistory();
  }

  tabs.forEach((t) => t.addEventListener('click', () => activateTab(t.dataset.tab)));

  /* ============================================================
   *  Áudio (bip sintetizado, sem arquivos externos)
   * ========================================================== */
  let audioCtx = null;
  function beep(freq = 880, duration = 0.15, delay = 0) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + duration);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + duration + 0.05);
    } catch (e) { /* áudio indisponível */ }
  }

  function playAlarm() {
    beep(1046, 0.18, 0);
    beep(1318, 0.18, 0.2);
    beep(1568, 0.28, 0.4);
  }

  /* ============================================================
   *  Toast
   * ========================================================== */
  const toastEl = $('toast');
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }

  function notify(title, body) {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }

  function pad(n, len = 2) { return String(n).padStart(len, '0'); }

  /* ============================================================
   *  CRONÔMETRO
   * ========================================================== */
  const sw = {
    running: false,
    startedAt: 0,
    elapsed: 0,
    raf: null,
    laps: [],
  };

  const swTimeEl = $('swTime');
  const swMsEl = $('swMs');
  const swStatusEl = $('swStatus');
  const swRing = $('swRing');
  const swWrap = swRing.closest('.ring-wrap');
  const swStartBtn = $('swStartBtn');
  const swLapBtn = $('swLapBtn');
  const swResetBtn = $('swResetBtn');
  const lapsList = $('lapsList');
  const lapsCount = $('lapsCount');

  swRing.style.strokeDasharray = RING_CIRCUMFERENCE;

  function formatStopwatch(ms) {
    const totalCs = Math.floor(ms / 10); // centésimos
    const cs = totalCs % 100;
    const totalSec = Math.floor(totalCs / 100);
    const s = totalSec % 60;
    const m = Math.floor(totalSec / 60) % 60;
    const h = Math.floor(totalSec / 3600);
    return {
      main: `${pad(h)}:${pad(m)}:${pad(s)}`,
      cs: `.${pad(cs)}`,
    };
  }

  function renderStopwatch() {
    const now = sw.running ? sw.elapsed + (performance.now() - sw.startedAt) : sw.elapsed;
    const { main, cs } = formatStopwatch(now);
    swTimeEl.textContent = main;
    swMsEl.textContent = cs;

    // O anel completa uma volta por minuto
    const secInCycle = (now / 1000) % 60;
    const frac = secInCycle / 60;
    swRing.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - frac);

    if (sw.running) sw.raf = requestAnimationFrame(renderStopwatch);
  }

  function setSwStatus(text, cls) {
    swStatusEl.textContent = text;
    swStatusEl.className = 'status-pill' + (cls ? ` ${cls}` : '');
  }

  function startStopwatch() {
    sw.running = true;
    sw.startedAt = performance.now();
    swWrap.classList.add('pulsing');
    swStartBtn.textContent = 'Pausar';
    swStartBtn.classList.add('is-running');
    swLapBtn.disabled = false;
    swResetBtn.disabled = false;
    setSwStatus('Em andamento', 'running');
    renderStopwatch();
  }

  function pauseStopwatch() {
    sw.running = false;
    sw.elapsed += performance.now() - sw.startedAt;
    cancelAnimationFrame(sw.raf);
    swWrap.classList.remove('pulsing');
    swStartBtn.textContent = 'Continuar';
    swStartBtn.classList.remove('is-running');
    swLapBtn.disabled = true;
    setSwStatus('Pausado', 'paused');
  }

  function resetStopwatch() {
    sw.running = false;
    sw.elapsed = 0;
    sw.laps = [];
    cancelAnimationFrame(sw.raf);
    swWrap.classList.remove('pulsing');
    swTimeEl.textContent = '00:00:00';
    swMsEl.textContent = '.00';
    swRing.style.strokeDashoffset = RING_CIRCUMFERENCE;
    swStartBtn.textContent = 'Iniciar';
    swStartBtn.classList.remove('is-running');
    swLapBtn.disabled = true;
    swResetBtn.disabled = true;
    setSwStatus('Pronto');
    renderLaps();
  }

  function lapStopwatch() {
    if (!sw.running) return;
    const total = sw.elapsed + (performance.now() - sw.startedAt);
    const prevTotal = sw.laps.length ? sw.laps[sw.laps.length - 1].total : 0;
    sw.laps.push({ total, split: total - prevTotal });
    renderLaps();
  }

  function renderLaps() {
    lapsCount.textContent = sw.laps.length;
    if (!sw.laps.length) {
      lapsList.innerHTML = '<li class="laps-empty">Nenhuma volta registrada ainda.</li>';
      return;
    }

    const splits = sw.laps.map((l) => l.split);
    const best = Math.min(...splits);
    const worst = Math.max(...splits);
    const showBestWorst = sw.laps.length > 1;

    lapsList.innerHTML = sw.laps
      .map((lap, i) => {
        const num = i + 1;
        const { main: splitMain, cs: splitCs } = formatStopwatch(lap.split);
        const { main: totalMain, cs: totalCs } = formatStopwatch(lap.total);
        let cls = '';
        if (showBestWorst && lap.split === best) cls = 'best';
        else if (showBestWorst && lap.split === worst) cls = 'worst';
        return `<li class="${cls}">
          <span>Volta ${num}</span>
          <span>${splitMain}${splitCs}</span>
          <span>${totalMain}${totalCs}</span>
        </li>`;
      })
      .reverse()
      .join('');
  }

  swStartBtn.addEventListener('click', () => (sw.running ? pauseStopwatch() : startStopwatch()));
  swLapBtn.addEventListener('click', lapStopwatch);
  swResetBtn.addEventListener('click', resetStopwatch);

  /* ============================================================
   *  HISTÓRICO DE ESTUDOS
   * ========================================================== */
  const STUDY_LOG_KEY = 'conometro-study-log';
  const MIN_SESSION_MS = 3000; // ignora sessões residuais menores que 3s

  function loadStudyLog() {
    try {
      const raw = JSON.parse(localStorage.getItem(STUDY_LOG_KEY));
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveStudyLog() {
    localStorage.setItem(STUDY_LOG_KEY, JSON.stringify(studyLog));
  }

  let studyLog = loadStudyLog();

  const todayTotalEl = $('todayTotal');
  const todayListEl = $('todayList');
  const histTodayEl = $('histToday');
  const histWeekEl = $('histWeek');
  const histTotalEl = $('histTotal');
  const historyDaysEl = $('historyDays');
  const histClearBtn = $('histClearBtn');

  function localDateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function formatDuration(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const s = totalSec % 60;
    const m = Math.floor(totalSec / 60) % 60;
    const h = Math.floor(totalSec / 3600);
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function formatClock(ms) {
    return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function dayLabel(dateKey) {
    const [y, mo, d] = dateKey.split('-').map(Number);
    const date = new Date(y, mo - 1, d);
    if (dateKey === localDateKey(new Date())) return 'Hoje';
    if (dateKey === localDateKey(new Date(Date.now() - 86400000))) return 'Ontem';
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  }

  // Tempo ainda não persistido da sessão de estudo em andamento (contando o trecho ativo atual)
  function liveSessionMs() {
    if (!tm.sessionStart) return 0;
    let ms = tm.studiedMs;
    if (tm.lastResumeAt) ms += Date.now() - tm.lastResumeAt;
    return ms;
  }

  function computeTodayMs() {
    const todayKey = localDateKey(new Date());
    let ms = studyLog.filter((s) => s.date === todayKey).reduce((sum, s) => sum + s.durationMs, 0);
    if (tm.sessionStart && localDateKey(new Date(tm.sessionStart)) === todayKey) ms += liveSessionMs();
    return ms;
  }

  function computeWeekMs() {
    const weekAgo = Date.now() - 7 * 86400000;
    let ms = studyLog.filter((s) => s.start >= weekAgo).reduce((sum, s) => sum + s.durationMs, 0);
    ms += liveSessionMs();
    return ms;
  }

  function computeTotalMs() {
    return studyLog.reduce((sum, s) => sum + s.durationMs, 0) + liveSessionMs();
  }

  function sessionRowHtml(s) {
    return `<li>
      <span class="session-range">${formatClock(s.start)}–${formatClock(s.end)}</span>
      <span class="session-duration${s.partial ? ' partial' : ''}">${formatDuration(s.durationMs)}</span>
    </li>`;
  }

  function addStudySession(startMs, endMs, durationMs, partial) {
    if (durationMs < MIN_SESSION_MS) return;
    studyLog.push({
      date: localDateKey(new Date(startMs)),
      start: startMs,
      end: endMs,
      durationMs: Math.round(durationMs),
      partial: !!partial,
    });
    saveStudyLog();
    renderTodayCard();
    renderHistory();
    if (partial && durationMs >= 60000) {
      showToast(`📚 Sessão de estudo registrada: ${formatDuration(durationMs)}`);
    }
  }

  function renderTodayCard() {
    const todayKey = localDateKey(new Date());
    const sessions = studyLog.filter((s) => s.date === todayKey).sort((a, b) => a.start - b.start);
    todayTotalEl.textContent = formatDuration(computeTodayMs());

    const hasLive = tm.sessionStart && localDateKey(new Date(tm.sessionStart)) === todayKey;
    if (!sessions.length && !hasLive) {
      todayListEl.innerHTML = '<li class="laps-empty">Nenhuma sessão registrada hoje.</li>';
      return;
    }

    let html = sessions.slice().reverse().map(sessionRowHtml).join('');
    if (hasLive) {
      html = `<li>
        <span class="session-range">${formatClock(tm.sessionStart)}–agora</span>
        <span class="session-duration partial">${formatDuration(liveSessionMs())}</span>
      </li>` + html;
    }
    todayListEl.innerHTML = html;
  }

  function renderHistory() {
    histTodayEl.textContent = formatDuration(computeTodayMs());
    histWeekEl.textContent = formatDuration(computeWeekMs());
    histTotalEl.textContent = formatDuration(computeTotalMs());

    if (!studyLog.length) {
      historyDaysEl.innerHTML = '<p class="laps-empty history-empty">Nenhum estudo registrado ainda. Use o Temporizador para começar a estudar — cada sessão concluída ou interrompida é salva aqui automaticamente.</p>';
      return;
    }

    const groups = {};
    studyLog.forEach((s) => {
      (groups[s.date] = groups[s.date] || []).push(s);
    });

    const dateKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    historyDaysEl.innerHTML = dateKeys
      .map((key) => {
        const sessions = groups[key].slice().sort((a, b) => a.start - b.start);
        const dayTotal = sessions.reduce((sum, s) => sum + s.durationMs, 0);
        const rows = sessions.slice().reverse().map(sessionRowHtml).join('');
        return `<div class="day-group">
          <div class="day-head">
            <span class="day-name">${dayLabel(key)}</span>
            <span class="day-total">${formatDuration(dayTotal)}</span>
          </div>
          <ul class="day-sessions">${rows}</ul>
        </div>`;
      })
      .join('');
  }

  function updateLiveStudyStats() {
    todayTotalEl.textContent = formatDuration(computeTodayMs());
    histTodayEl.textContent = formatDuration(computeTodayMs());
    histWeekEl.textContent = formatDuration(computeWeekMs());
    histTotalEl.textContent = formatDuration(computeTotalMs());
  }

  histClearBtn.addEventListener('click', () => {
    if (!studyLog.length) {
      showToast('Histórico já está vazio.');
      return;
    }
    if (confirm('Apagar todo o histórico de estudos? Essa ação não pode ser desfeita.')) {
      studyLog = [];
      saveStudyLog();
      renderTodayCard();
      renderHistory();
      showToast('Histórico apagado.');
    }
  });

  /* ============================================================
   *  TEMPORIZADOR
   * ========================================================== */
  const tm = {
    running: false,
    totalMs: 0,
    remainingMs: 0,
    endAt: 0,
    interval: null,
    sessionStart: null, // timestamp (ms) de quando a sessão de estudo atual começou
    studiedMs: 0,        // tempo ativo acumulado da sessão atual (exclui pausas)
    lastResumeAt: null,  // timestamp do último "iniciar/continuar"
  };

  const tmTimeEl = $('tmTime');
  const tmStatusEl = $('tmStatus');
  const tmRing = $('tmRing');
  const tmWrap = tmRing.closest('.ring-wrap');
  const tmStartBtn = $('tmStartBtn');
  const tmResetBtn = $('tmResetBtn');
  const tmAddBtn = $('tmAddBtn');
  const tmInputs = $('tmInputs');
  const hoursInput = $('tmHours');
  const minutesInput = $('tmMinutes');
  const secondsInput = $('tmSeconds');

  tmRing.style.strokeDasharray = RING_CIRCUMFERENCE;
  tmRing.style.strokeDashoffset = 0;

  function clampInput(el, max) {
    let v = parseInt(el.value, 10);
    if (isNaN(v) || v < 0) v = 0;
    if (v > max) v = max;
    el.value = v;
  }

  [ [hoursInput, 23], [minutesInput, 59], [secondsInput, 59] ].forEach(([el, max]) => {
    el.addEventListener('change', () => clampInput(el, max));
  });

  function readInputsMs() {
    const h = parseInt(hoursInput.value, 10) || 0;
    const m = parseInt(minutesInput.value, 10) || 0;
    const s = parseInt(secondsInput.value, 10) || 0;
    return ((h * 3600) + (m * 60) + s) * 1000;
  }

  function writeInputsFromMs(ms) {
    const totalSec = Math.round(ms / 1000);
    hoursInput.value = Math.floor(totalSec / 3600);
    minutesInput.value = Math.floor((totalSec % 3600) / 60);
    secondsInput.value = totalSec % 60;
  }

  function formatTimer(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const s = totalSec % 60;
    const m = Math.floor(totalSec / 60) % 60;
    const h = Math.floor(totalSec / 3600);
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function setTmStatus(text, cls) {
    tmStatusEl.textContent = text;
    tmStatusEl.className = 'status-pill' + (cls ? ` ${cls}` : '');
  }

  function renderTimerRing() {
    const frac = tm.totalMs > 0 ? tm.remainingMs / tm.totalMs : 0;
    tmRing.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - frac);
    tmRing.classList.toggle('warn', tm.remainingMs > 0 && tm.remainingMs <= 10000);
  }

  function tickTimer() {
    tm.remainingMs = Math.max(0, tm.endAt - Date.now());
    tmTimeEl.textContent = formatTimer(tm.remainingMs);
    renderTimerRing();
    updateLiveStudyStats();

    if (tm.remainingMs <= 0) {
      finishTimer();
    }
  }

  function startTimer() {
    if (!tm.running && tm.remainingMs <= 0) {
      tm.totalMs = readInputsMs();
      tm.remainingMs = tm.totalMs;
      if (tm.totalMs <= 0) {
        showToast('Defina um tempo maior que zero.');
        return;
      }
    } else if (!tm.totalMs) {
      tm.totalMs = readInputsMs();
      tm.remainingMs = tm.totalMs;
    }

    tm.running = true;
    tm.endAt = Date.now() + tm.remainingMs;
    if (!tm.sessionStart) tm.sessionStart = Date.now();
    tm.lastResumeAt = Date.now();
    tmInputs.classList.add('locked');
    tmInputs.querySelectorAll('input').forEach((i) => (i.disabled = true));
    tmWrap.classList.add('pulsing');
    tmStartBtn.textContent = 'Pausar';
    tmStartBtn.classList.add('is-running');
    setTmStatus('Em andamento', 'running');

    tickTimer();
    tm.interval = setInterval(tickTimer, 200);
  }

  function accumulateStudiedMs() {
    if (tm.lastResumeAt) {
      tm.studiedMs += Date.now() - tm.lastResumeAt;
      tm.lastResumeAt = null;
    }
  }

  function pauseTimer() {
    tm.running = false;
    clearInterval(tm.interval);
    accumulateStudiedMs();
    tmWrap.classList.remove('pulsing');
    tmStartBtn.textContent = 'Continuar';
    tmStartBtn.classList.remove('is-running');
    setTmStatus('Pausado', 'paused');
    renderTodayCard();
  }

  function endStudySession(partial) {
    accumulateStudiedMs();
    const start = tm.sessionStart;
    const duration = tm.studiedMs;
    tm.sessionStart = null;
    tm.studiedMs = 0;
    if (start && duration > 0) {
      addStudySession(start, Date.now(), duration, partial);
    }
  }

  function resetTimer() {
    endStudySession(true);
    renderTodayCard();
    tm.running = false;
    tm.totalMs = 0;
    tm.remainingMs = 0;
    clearInterval(tm.interval);
    tmWrap.classList.remove('pulsing', 'shake');
    tmRing.classList.remove('warn', 'danger-flash');
    tmRing.style.strokeDashoffset = 0;
    tmTimeEl.textContent = '00:00:00';
    tmInputs.querySelectorAll('input').forEach((i) => (i.disabled = false));
    tmStartBtn.textContent = 'Iniciar';
    tmStartBtn.classList.remove('is-running');
    setTmStatus('Defina o tempo');
  }

  function finishTimer() {
    endStudySession(false);
    renderTodayCard();
    tm.running = false;
    clearInterval(tm.interval);
    tm.remainingMs = 0;
    tmTimeEl.textContent = '00:00:00';
    tmInputs.querySelectorAll('input').forEach((i) => (i.disabled = false));
    tmWrap.classList.remove('pulsing');
    tmWrap.classList.add('shake');
    tmRing.classList.add('danger-flash');
    tmStartBtn.textContent = 'Iniciar';
    tmStartBtn.classList.remove('is-running');
    setTmStatus('Concluído!', 'done');
    setTimeout(() => tmWrap.classList.remove('shake'), 500);
    playAlarm();
    showToast('⏰ Tempo esgotado! Sessão de estudo registrada.');
    notify('Conometro', 'O temporizador chegou a zero. Sessão de estudo registrada.');
    tm.totalMs = 0;
  }

  tmStartBtn.addEventListener('click', () => (tm.running ? pauseTimer() : startTimer()));
  tmResetBtn.addEventListener('click', resetTimer);

  tmAddBtn.addEventListener('click', () => {
    if (tm.running) {
      tm.endAt += 60000;
      tm.totalMs += 60000;
      tickTimer();
    } else {
      const ms = readInputsMs() + 60000;
      writeInputsFromMs(ms);
    }
  });

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      if (tm.running) return;
      writeInputsFromMs(parseInt(chip.dataset.secs, 10) * 1000);
    });
  });

  renderTodayCard();
  renderHistory();

  /* ============================================================
   *  Atalhos de teclado
   * ========================================================== */
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT') {
      if (e.code === 'Enter') document.activeElement.blur();
      return;
    }

    const activeTab = document.querySelector('.tab.active').dataset.tab;
    if (activeTab === 'history') return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (activeTab === 'stopwatch') {
        sw.running ? pauseStopwatch() : startStopwatch();
      } else {
        tm.running ? pauseTimer() : startTimer();
      }
    } else if (e.key.toLowerCase() === 'l' && activeTab === 'stopwatch') {
      lapStopwatch();
    } else if (e.key.toLowerCase() === 'r') {
      activeTab === 'stopwatch' ? resetStopwatch() : resetTimer();
    }
  });

  /* Pede permissão de notificação de forma discreta na primeira interação */
  document.addEventListener('click', function askOnce() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    document.removeEventListener('click', askOnce);
  }, { once: true });
})();
