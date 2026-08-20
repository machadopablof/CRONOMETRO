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
  };

  function activateTab(name) {
    tabs.forEach((t) => {
      const active = t.dataset.tab === name;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    });
    Object.entries(panels).forEach(([key, el]) => el.classList.toggle('active', key === name));
    document.title = name === 'timer' ? 'Temporizador · Conometro' : 'Cronômetro · Conometro';
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
   *  TEMPORIZADOR
   * ========================================================== */
  const tm = {
    running: false,
    totalMs: 0,
    remainingMs: 0,
    endAt: 0,
    interval: null,
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
    tmInputs.classList.add('locked');
    tmInputs.querySelectorAll('input').forEach((i) => (i.disabled = true));
    tmWrap.classList.add('pulsing');
    tmStartBtn.textContent = 'Pausar';
    tmStartBtn.classList.add('is-running');
    setTmStatus('Em andamento', 'running');

    tickTimer();
    tm.interval = setInterval(tickTimer, 200);
  }

  function pauseTimer() {
    tm.running = false;
    clearInterval(tm.interval);
    tmWrap.classList.remove('pulsing');
    tmStartBtn.textContent = 'Continuar';
    tmStartBtn.classList.remove('is-running');
    setTmStatus('Pausado', 'paused');
  }

  function resetTimer() {
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
    showToast('⏰ Tempo esgotado!');
    notify('Conometro', 'O temporizador chegou a zero.');
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
