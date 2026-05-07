const STORAGE_KEY = "quiet-pomo-state-v1";

const THEMES = {
  paper: {
    bg: "#ffffff",
    accent: "#242424",
    accentStrong: "#242424",
    control: "#242424",
  },
  sage: {
    bg: "#dfe8dc",
    accent: "#5f7e67",
    accentStrong: "#3f614a",
    control: "#5f7e67",
  },
  clay: {
    bg: "#efd6cb",
    accent: "#b96555",
    accentStrong: "#914539",
    control: "#b96555",
  },
  ink: {
    bg: "#202124",
    accent: "#d9a441",
    accentStrong: "#e5bf69",
    control: "#d9a441",
  },
};

const MODES = ["pomodoro", "shortBreak", "longBreak"];
const MODE_LABELS = {
  pomodoro: "Pomodoro",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

const DEFAULT_STATE = {
  mode: "pomodoro",
  isRunning: false,
  remainingSeconds: 25 * 60,
  settings: {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakInterval: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    alarmSound: "assets/notification/victory.mp3",
    ambientSound: "assets/audio/fire-burning.m4a",
    ambientVolume: 45,
    notificationText: "Waktunya berpindah mode. Ambil napas sebentar.",
    theme: "paper",
    customColor: "#ffffff",
    useCustomColor: false,
  },
  stats: {
    sessions: 0,
    focusSeconds: 0,
  },
  tasks: [],
  activeTaskId: null,
};

let state = loadState();
let timerId = null;
let lastTickAt = null;
let audioContext = null;
let ambientAudio = null;

const ICONS = {
  bell: `
    <svg viewBox="0 0 24 24" role="img">
      <path d="M10.27 21a2 2 0 0 0 3.46 0" />
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    </svg>
  `,
  bellOff: `
    <svg viewBox="0 0 24 24" role="img">
      <path d="m2 2 20 20" />
      <path d="M10.27 21a2 2 0 0 0 3.46 0" />
      <path d="M7.7 4.7A6 6 0 0 1 18 8c0 1.7.18 3.02.46 4.04" />
      <path d="M17 17H3c0-2 3-2 3-9 0-.55.07-1.08.2-1.58" />
    </svg>
  `,
};

const elements = {
  timerDisplay: document.querySelector("#timerDisplay"),
  progressFill: document.querySelector("#progressFill"),
  currentTask: document.querySelector("#currentTask"),
  startPause: document.querySelector("#startPause"),
  resetTimer: document.querySelector("#resetTimer"),
  skipMode: document.querySelector("#skipMode"),
  modeTabs: document.querySelectorAll(".mode-tab"),
  sessionCount: document.querySelector("#sessionCount"),
  focusMinutes: document.querySelector("#focusMinutes"),
  finishEstimate: document.querySelector("#finishEstimate"),
  taskForm: document.querySelector("#taskForm"),
  taskInput: document.querySelector("#taskInput"),
  taskEstimate: document.querySelector("#taskEstimate"),
  taskList: document.querySelector("#taskList"),
  taskSummary: document.querySelector("#taskSummary"),
  pomodoroDuration: document.querySelector("#pomodoroDuration"),
  shortBreakDuration: document.querySelector("#shortBreakDuration"),
  longBreakDuration: document.querySelector("#longBreakDuration"),
  longBreakInterval: document.querySelector("#longBreakInterval"),
  autoStartBreaks: document.querySelector("#autoStartBreaks"),
  autoStartPomodoros: document.querySelector("#autoStartPomodoros"),
  alarmSound: document.querySelector("#alarmSound"),
  alarmSelect: document.querySelector("#alarmSelect"),
  alarmSoundButton: document.querySelector("#alarmSoundButton"),
  alarmSoundLabel: document.querySelector("#alarmSoundLabel"),
  alarmSoundMenu: document.querySelector("#alarmSoundMenu"),
  alarmSoundOptions: document.querySelectorAll("#alarmSoundMenu [data-value]"),
  ambientSound: document.querySelector("#ambientSound"),
  ambientSelect: document.querySelector("#ambientSelect"),
  ambientSoundButton: document.querySelector("#ambientSoundButton"),
  ambientSoundLabel: document.querySelector("#ambientSoundLabel"),
  ambientSoundMenu: document.querySelector("#ambientSoundMenu"),
  ambientSoundOptions: document.querySelectorAll("#ambientSoundMenu [data-value]"),
  ambientVolume: document.querySelector("#ambientVolume"),
  notificationText: document.querySelector("#notificationText"),
  customColor: document.querySelector("#customColor"),
  themeSwatches: document.querySelectorAll(".theme-swatch"),
  settingsToggle: document.querySelector("#settingsToggle"),
  settingsDrawer: document.querySelector("#settingsDrawer"),
  settingsClose: document.querySelector("#settingsClose"),
  drawerBackdrop: document.querySelector("#drawerBackdrop"),
  notificationPermission: document.querySelector("#notificationPermission"),
  resetDay: document.querySelector("#resetDay"),
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? mergeState(DEFAULT_STATE, saved) : cloneDefaultState();
  } catch {
    return cloneDefaultState();
  }
}

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function mergeState(base, saved) {
  return {
    ...base,
    ...saved,
    settings: { ...base.settings, ...(saved.settings || {}) },
    stats: { ...base.stats, ...(saved.stats || {}) },
    tasks: Array.isArray(saved.tasks) ? saved.tasks : [],
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, isRunning: false }));
}

function modeDuration(mode = state.mode) {
  return Math.max(1, Number(state.settings[mode] || DEFAULT_STATE.settings[mode])) * 60;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function activeTask() {
  return state.tasks.find((task) => task.id === state.activeTaskId) || null;
}

function remainingPomodoros() {
  return state.tasks.reduce((total, task) => total + Math.max(0, task.estimate - task.done), 0);
}

function updateDocumentTitle() {
  const status = state.isRunning ? MODE_LABELS[state.mode] : "Paused";
  document.title = `${formatTime(state.remainingSeconds)} - ${status} | Quiet Pomo`;
}

function render() {
  const duration = modeDuration();
  const elapsed = Math.max(0, duration - state.remainingSeconds);
  const progress = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;
  const task = activeTask();

  elements.timerDisplay.textContent = formatTime(state.remainingSeconds);
  elements.progressFill.style.width = `${progress}%`;
  elements.currentTask.textContent = task ? task.name : state.mode === "pomodoro" ? "Time to focus" : "Enjoy your break";
  elements.startPause.textContent = state.isRunning ? "Pause" : "Start";
  elements.sessionCount.textContent = String(state.stats.sessions);
  elements.focusMinutes.textContent = `${Math.floor(state.stats.focusSeconds / 60)}m`;
  elements.taskSummary.textContent = `${remainingPomodoros()} left`;

  elements.modeTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === state.mode);
    tab.setAttribute("aria-selected", String(tab.dataset.mode === state.mode));
  });

  renderTasks();
  renderSettings();
  renderTheme();
  renderNotificationButton();
  renderFinishEstimate();
  updateDocumentTitle();
  saveState();
}

function renderNotificationButton() {
  const allowed = "Notification" in window && Notification.permission === "granted";
  elements.notificationPermission.querySelector(".button-icon").innerHTML = allowed ? ICONS.bell : ICONS.bellOff;
  elements.notificationPermission.title = allowed ? "Notifikasi aktif" : "Aktifkan notifikasi";
  elements.notificationPermission.setAttribute("aria-label", allowed ? "Notifikasi aktif" : "Aktifkan notifikasi");
}

function renderSettings() {
  elements.pomodoroDuration.value = state.settings.pomodoro;
  elements.shortBreakDuration.value = state.settings.shortBreak;
  elements.longBreakDuration.value = state.settings.longBreak;
  elements.longBreakInterval.value = state.settings.longBreakInterval;
  elements.autoStartBreaks.checked = state.settings.autoStartBreaks;
  elements.autoStartPomodoros.checked = state.settings.autoStartPomodoros;
  elements.alarmSound.value = state.settings.alarmSound;
  renderAlarmSelect();
  elements.ambientSound.value = state.settings.ambientSound;
  renderAmbientSelect();
  elements.ambientVolume.value = state.settings.ambientVolume;
  elements.ambientVolume.style.setProperty("--ambient-level", `${state.settings.ambientVolume}%`);
  elements.notificationText.value = state.settings.notificationText;
  elements.customColor.value = state.settings.customColor;
}

function renderAlarmSelect() {
  const value = state.settings.alarmSound;
  const selectedOption = [...elements.alarmSound.options].find((option) => option.value === value);
  elements.alarmSoundLabel.textContent = selectedOption ? selectedOption.textContent : "Victory";
  elements.alarmSoundOptions.forEach((option) => {
    const selected = option.dataset.value === value;
    option.classList.toggle("selected", selected);
    option.setAttribute("aria-selected", String(selected));
  });
}

function renderAmbientSelect() {
  const value = state.settings.ambientSound;
  const selectedOption = [...elements.ambientSound.options].find((option) => option.value === value);
  elements.ambientSoundLabel.textContent = selectedOption ? selectedOption.textContent : "Off";
  elements.ambientSoundOptions.forEach((option) => {
    const selected = option.dataset.value === value;
    option.classList.toggle("selected", selected);
    option.setAttribute("aria-selected", String(selected));
  });
}

function renderTheme() {
  document.body.dataset.theme = state.settings.theme;
  const theme = THEMES[state.settings.theme] || THEMES.paper;
  const bg = state.settings.useCustomColor ? state.settings.customColor : theme.bg;
  document.documentElement.style.setProperty("--bg", bg);
  document.documentElement.style.setProperty("--accent", theme.accent);
  document.documentElement.style.setProperty("--accent-strong", theme.accentStrong);
  document.documentElement.style.setProperty("--control", theme.control || theme.accent);

  elements.themeSwatches.forEach((swatch) => {
    swatch.classList.toggle("active", !state.settings.useCustomColor && swatch.dataset.theme === state.settings.theme);
  });
}

function renderTasks() {
  elements.taskList.innerHTML = "";

  if (!state.tasks.length) {
    const empty = document.createElement("div");
    empty.className = "task-item";
    empty.innerHTML = `
      <span class="task-check" aria-hidden="true">+</span>
      <div>
        <span class="task-name">Belum ada tugas</span>
        <span class="task-meta">Tambahkan satu tugas untuk mulai fokus.</span>
      </div>
    `;
    elements.taskList.append(empty);
    return;
  }

  state.tasks.forEach((task) => {
    const item = document.createElement("article");
    item.className = `task-item${task.id === state.activeTaskId ? " active" : ""}`;

    const check = document.createElement("button");
    check.className = "task-check";
    check.type = "button";
    check.title = "Pilih tugas";
    check.textContent = task.id === state.activeTaskId ? "\u2713" : "";
    check.addEventListener("click", () => {
      state.activeTaskId = task.id;
      render();
    });

    const copy = document.createElement("div");
    const remaining = Math.max(0, task.estimate - task.done);
    copy.innerHTML = `
      <span class="task-name">${escapeHtml(task.name)}</span>
      <span class="task-meta">${task.done}/${task.estimate} selesai - ${remaining} tersisa</span>
    `;

    const stepper = document.createElement("div");
    stepper.className = "stepper";
    stepper.innerHTML = `
      <button type="button" title="Kurangi estimasi">-</button>
      <strong>${task.estimate}</strong>
      <button type="button" title="Tambah estimasi">+</button>
    `;
    const [minus, plus] = stepper.querySelectorAll("button");
    minus.addEventListener("click", () => {
      task.estimate = Math.max(1, task.estimate - 1);
      task.done = Math.min(task.done, task.estimate);
      render();
    });
    plus.addEventListener("click", () => {
      task.estimate = Math.min(20, task.estimate + 1);
      render();
    });

    const remove = document.createElement("button");
    remove.className = "task-delete";
    remove.type = "button";
    remove.title = "Hapus tugas";
    remove.textContent = "x";
    remove.addEventListener("click", () => deleteTask(task.id));

    item.append(check, copy, stepper, remove);
    elements.taskList.append(item);
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}

function renderFinishEstimate() {
  const left = remainingPomodoros();
  if (!left) {
    elements.finishEstimate.textContent = "--:--";
    return;
  }

  const focus = left * state.settings.pomodoro;
  const breaks = Math.max(0, left - 1) * state.settings.shortBreak;
  const longBreaks = Math.floor(Math.max(0, left - 1) / state.settings.longBreakInterval) * state.settings.longBreak;
  const date = new Date(Date.now() + (focus + breaks + longBreaks) * 60 * 1000);
  elements.finishEstimate.textContent = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function setMode(mode, options = {}) {
  if (!MODES.includes(mode)) return;
  state.mode = mode;
  state.isRunning = false;
  state.remainingSeconds = options.keepRemaining ? state.remainingSeconds : modeDuration(mode);
  stopTimer();
  render();
}

function startTimer() {
  ensureAudio();
  state.isRunning = true;
  lastTickAt = Date.now();
  timerId = window.setInterval(runSecond, 250);
  updateAmbientSound();
  render();
}

function pauseTimer() {
  state.isRunning = false;
  stopTimer();
  render();
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  stopAmbientSound();
}

function runSecond() {
  const now = Date.now();
  const delta = Math.floor((now - lastTickAt) / 1000);
  if (delta < 1) return;

  lastTickAt += delta * 1000;
  state.remainingSeconds = Math.max(0, state.remainingSeconds - delta);

  if (state.mode === "pomodoro") {
    state.stats.focusSeconds += delta;
  }

  if (state.remainingSeconds <= 0) {
    completeMode();
    return;
  }

  render();
}

function completeMode() {
  const completedMode = state.mode;
  stopTimer();
  state.isRunning = false;
  state.remainingSeconds = 0;

  if (completedMode === "pomodoro") {
    state.stats.sessions += 1;
    completeActiveTaskStep();
  }

  playAlarm();
  notifyUser(completedMode);

  const nextMode = nextModeAfter(completedMode);
  const shouldAutoStart =
    completedMode === "pomodoro" ? state.settings.autoStartBreaks : state.settings.autoStartPomodoros;

  state.mode = nextMode;
  state.remainingSeconds = modeDuration(nextMode);
  render();

  if (shouldAutoStart) {
    startTimer();
  }
}

function nextModeAfter(mode) {
  if (mode !== "pomodoro") return "pomodoro";
  return shouldUseLongBreak(state.stats.sessions) ? "longBreak" : "shortBreak";
}

function shouldUseLongBreak(sessionCount) {
  const interval = Math.max(2, Number(state.settings.longBreakInterval) || DEFAULT_STATE.settings.longBreakInterval);
  return sessionCount > 0 && sessionCount % interval === 0;
}

function completeActiveTaskStep() {
  const task = activeTask();
  if (!task) return;
  task.done = Math.min(task.estimate, task.done + 1);
  if (task.done >= task.estimate) {
    const nextTask = state.tasks.find((item) => item.id !== task.id && item.done < item.estimate);
    state.activeTaskId = nextTask ? nextTask.id : task.id;
  }
}

function skipMode() {
  const skippedMode = state.mode;
  const wasRunning = state.isRunning;
  const shouldAutoStart =
    wasRunning || (skippedMode === "pomodoro" ? state.settings.autoStartBreaks : state.settings.autoStartPomodoros);

  stopTimer();
  state.isRunning = false;

  if (skippedMode === "pomodoro") {
    state.stats.sessions += 1;
    state.mode = shouldUseLongBreak(state.stats.sessions) ? "longBreak" : "shortBreak";
  } else {
    state.mode = "pomodoro";
  }

  state.remainingSeconds = modeDuration(state.mode);
  render();

  if (shouldAutoStart) {
    startTimer();
  }
}

function addTask(name, estimate) {
  const task = {
    id: window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name,
    estimate: Math.max(1, Math.min(20, Number(estimate) || 1)),
    done: 0,
  };
  state.tasks.push(task);
  if (!state.activeTaskId) state.activeTaskId = task.id;
  render();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  if (state.activeTaskId === id) {
    const nextTask = state.tasks.find((task) => task.done < task.estimate) || state.tasks[0];
    state.activeTaskId = nextTask ? nextTask.id : null;
  }
  render();
}

function applyDurationChange(key, value) {
  const previousDuration = modeDuration(state.mode);
  state.settings[key] = Math.max(1, Number(value) || DEFAULT_STATE.settings[key]);
  if (key === state.mode && !state.isRunning) {
    state.remainingSeconds = modeDuration(state.mode);
  } else if (key === state.mode) {
    state.remainingSeconds = Math.min(state.remainingSeconds, previousDuration);
  }
  render();
}

function ensureAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function beep(frequency, duration, volume = 0.08, type = "sine", delay = 0) {
  if (!audioContext) return;
  const start = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playAlarm() {
  const sound = state.settings.alarmSound;
  if (!sound) return;
  const alarmAudio = new Audio(sound);
  alarmAudio.volume = 1;
  alarmAudio.play().catch(() => {});
}

function updateAmbientSound() {
  if (!state.isRunning || !state.settings.ambientSound) {
    stopAmbientSound();
    return;
  }

  if (!ambientAudio) {
    ambientAudio = new Audio();
    ambientAudio.loop = true;
  }

  const source = state.settings.ambientSound;
  if (!ambientAudio.src.endsWith(source)) {
    ambientAudio.pause();
    ambientAudio.src = source;
    ambientAudio.currentTime = 0;
  }

  ambientAudio.volume = Math.max(0, Math.min(100, Number(state.settings.ambientVolume))) / 100;
  ambientAudio.play().catch(() => {
    state.settings.ambientSound = "";
    render();
  });
}

function stopAmbientSound() {
  if (!ambientAudio) return;
  ambientAudio.pause();
}

function notifyUser(completedMode) {
  const message = state.settings.notificationText.trim() || "Timer selesai.";
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(completedMode === "pomodoro" ? "Focus selesai" : "Break selesai", {
      body: message,
    });
  }
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    alert("Browser ini belum mendukung notifikasi.");
    return;
  }
  await Notification.requestPermission();
  renderNotificationButton();
}

function resetDay() {
  const confirmed = window.confirm("Yakin ingin menghapus semua sesi, waktu fokus, tugas, dan pengaturan tersimpan?");
  if (!confirmed) return;

  stopTimer();
  localStorage.removeItem(STORAGE_KEY);
  state = cloneDefaultState();
  render();
}

function openSettingsDrawer() {
  elements.settingsDrawer.classList.add("open");
  elements.settingsDrawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeSettingsDrawer() {
  elements.settingsDrawer.classList.remove("open");
  elements.settingsDrawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  closeAlarmSelect();
  closeAmbientSelect();
  elements.settingsToggle.focus();
}

function openAlarmSelect() {
  closeAmbientSelect();
  elements.alarmSelect.classList.add("open");
  elements.alarmSoundButton.setAttribute("aria-expanded", "true");
}

function closeAlarmSelect() {
  elements.alarmSelect.classList.remove("open");
  elements.alarmSoundButton.setAttribute("aria-expanded", "false");
}

function toggleAlarmSelect() {
  if (elements.alarmSelect.classList.contains("open")) {
    closeAlarmSelect();
    return;
  }
  openAlarmSelect();
}

function openAmbientSelect() {
  closeAlarmSelect();
  elements.ambientSelect.classList.add("open");
  elements.ambientSoundButton.setAttribute("aria-expanded", "true");
}

function closeAmbientSelect() {
  elements.ambientSelect.classList.remove("open");
  elements.ambientSoundButton.setAttribute("aria-expanded", "false");
}

function toggleAmbientSelect() {
  if (elements.ambientSelect.classList.contains("open")) {
    closeAmbientSelect();
    return;
  }
  openAmbientSelect();
}

elements.startPause.addEventListener("click", () => {
  state.isRunning ? pauseTimer() : startTimer();
});

elements.resetTimer.addEventListener("click", () => {
  state.remainingSeconds = modeDuration();
  pauseTimer();
});

elements.skipMode.addEventListener("click", skipMode);

elements.modeTabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

elements.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.taskInput.value.trim();
  if (!name) return;
  addTask(name, elements.taskEstimate.value);
  elements.taskInput.value = "";
  elements.taskEstimate.value = "1";
  elements.taskInput.focus();
});

[
  ["pomodoroDuration", "pomodoro"],
  ["shortBreakDuration", "shortBreak"],
  ["longBreakDuration", "longBreak"],
  ["longBreakInterval", "longBreakInterval"],
].forEach(([elementKey, settingKey]) => {
  elements[elementKey].addEventListener("change", (event) => {
    if (settingKey === "longBreakInterval") {
      state.settings.longBreakInterval = Math.max(2, Number(event.target.value) || 4);
      render();
      return;
    }
    applyDurationChange(settingKey, event.target.value);
  });
});

["autoStartBreaks", "autoStartPomodoros"].forEach((key) => {
  elements[key].addEventListener("change", (event) => {
    state.settings[key] = event.target.checked;
    render();
  });
});

elements.alarmSoundButton.addEventListener("click", toggleAlarmSelect);

elements.alarmSoundOptions.forEach((option) => {
  option.addEventListener("click", () => {
    state.settings.alarmSound = option.dataset.value;
    elements.alarmSound.value = state.settings.alarmSound;
    closeAlarmSelect();
    playAlarm();
    render();
  });
});

elements.alarmSound.addEventListener("change", () => {
  state.settings.alarmSound = elements.alarmSound.value;
  playAlarm();
  render();
});

elements.ambientSoundButton.addEventListener("click", toggleAmbientSelect);

elements.ambientSoundOptions.forEach((option) => {
  option.addEventListener("click", () => {
    state.settings.ambientSound = option.dataset.value;
    elements.ambientSound.value = state.settings.ambientSound;
    closeAmbientSelect();
    updateAmbientSound();
    render();
  });
});

document.addEventListener("click", (event) => {
  if (!elements.alarmSelect.contains(event.target)) {
    closeAlarmSelect();
  }
  if (!elements.ambientSelect.contains(event.target)) {
    closeAmbientSelect();
  }
});

elements.ambientSound.addEventListener("change", () => {
  state.settings.ambientSound = elements.ambientSound.value;
  updateAmbientSound();
  render();
});

elements.ambientVolume.addEventListener("input", (event) => {
  state.settings.ambientVolume = Number(event.target.value);
  elements.ambientVolume.style.setProperty("--ambient-level", `${state.settings.ambientVolume}%`);
  updateAmbientSound();
  saveState();
});

elements.notificationText.addEventListener("input", (event) => {
  state.settings.notificationText = event.target.value;
  saveState();
});

elements.themeSwatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    state.settings.theme = swatch.dataset.theme;
    state.settings.useCustomColor = false;
    render();
  });
});

elements.customColor.addEventListener("input", (event) => {
  state.settings.customColor = event.target.value;
  state.settings.useCustomColor = true;
  render();
});

elements.notificationPermission.addEventListener("click", requestNotificationPermission);
elements.resetDay.addEventListener("click", resetDay);
elements.settingsToggle.addEventListener("click", openSettingsDrawer);
elements.settingsClose.addEventListener("click", closeSettingsDrawer);
elements.drawerBackdrop.addEventListener("click", closeSettingsDrawer);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && elements.alarmSelect.classList.contains("open")) {
    closeAlarmSelect();
    elements.alarmSoundButton.focus();
    return;
  }
  if (event.key === "Escape" && elements.ambientSelect.classList.contains("open")) {
    closeAmbientSelect();
    elements.ambientSoundButton.focus();
    return;
  }
  if (event.key === "Escape" && elements.settingsDrawer.classList.contains("open")) {
    closeSettingsDrawer();
  }
});

window.addEventListener("beforeunload", saveState);

function hasOption(select, value) {
  return [...select.options].some((option) => option.value === value);
}

if (!MODES.includes(state.mode)) state.mode = "pomodoro";
if (!state.remainingSeconds || state.remainingSeconds < 0) state.remainingSeconds = modeDuration();
if (!hasOption(elements.alarmSound, state.settings.alarmSound)) {
  state.settings.alarmSound = DEFAULT_STATE.settings.alarmSound;
}
if (!hasOption(elements.ambientSound, state.settings.ambientSound)) {
  state.settings.ambientSound = DEFAULT_STATE.settings.ambientSound;
}
render();
