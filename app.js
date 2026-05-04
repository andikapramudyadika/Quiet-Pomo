const STORAGE_KEY = "quiet-pomo-state-v1";

const THEMES = {
  paper: {
    bg: "#f6f6f4",
    accent: "#cf5f4b",
    accentStrong: "#ab4333",
  },
  sage: {
    bg: "#dfe8dc",
    accent: "#5f7e67",
    accentStrong: "#3f614a",
  },
  clay: {
    bg: "#efd6cb",
    accent: "#b96555",
    accentStrong: "#914539",
  },
  ink: {
    bg: "#202124",
    accent: "#d9a441",
    accentStrong: "#e5bf69",
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
    tickSound: false,
    tickVolume: 35,
    alarmSound: "bell",
    notificationText: "Waktunya berpindah mode. Ambil napas sebentar.",
    theme: "paper",
    customColor: "#f6f6f4",
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
let tickInterval = null;

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
  tickSound: document.querySelector("#tickSound"),
  tickVolume: document.querySelector("#tickVolume"),
  alarmSound: document.querySelector("#alarmSound"),
  notificationText: document.querySelector("#notificationText"),
  customColor: document.querySelector("#customColor"),
  themeSwatches: document.querySelectorAll(".theme-swatch"),
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
  renderFinishEstimate();
  updateDocumentTitle();
  saveState();
}

function renderSettings() {
  elements.pomodoroDuration.value = state.settings.pomodoro;
  elements.shortBreakDuration.value = state.settings.shortBreak;
  elements.longBreakDuration.value = state.settings.longBreak;
  elements.longBreakInterval.value = state.settings.longBreakInterval;
  elements.autoStartBreaks.checked = state.settings.autoStartBreaks;
  elements.autoStartPomodoros.checked = state.settings.autoStartPomodoros;
  elements.tickSound.checked = state.settings.tickSound;
  elements.tickVolume.value = state.settings.tickVolume;
  elements.alarmSound.value = state.settings.alarmSound;
  elements.notificationText.value = state.settings.notificationText;
  elements.customColor.value = state.settings.customColor;
}

function renderTheme() {
  document.body.dataset.theme = state.settings.theme;
  const theme = THEMES[state.settings.theme] || THEMES.paper;
  const bg = state.settings.useCustomColor ? state.settings.customColor : theme.bg;
  document.documentElement.style.setProperty("--bg", bg);
  document.documentElement.style.setProperty("--accent", theme.accent);
  document.documentElement.style.setProperty("--accent-strong", theme.accentStrong);

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
    check.textContent = task.id === state.activeTaskId ? "✓" : "";
    check.addEventListener("click", () => {
      state.activeTaskId = task.id;
      render();
    });

    const copy = document.createElement("div");
    const remaining = Math.max(0, task.estimate - task.done);
    copy.innerHTML = `
      <span class="task-name">${escapeHtml(task.name)}</span>
      <span class="task-meta">${task.done}/${task.estimate} selesai · ${remaining} tersisa</span>
    `;

    const stepper = document.createElement("div");
    stepper.className = "stepper";
    stepper.innerHTML = `
      <button type="button" title="Kurangi estimasi">−</button>
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
    remove.textContent = "×";
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
  updateTickSound();
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
  stopTickSound();
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
  return state.stats.sessions > 0 && state.stats.sessions % state.settings.longBreakInterval === 0
    ? "longBreak"
    : "shortBreak";
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
  completeMode();
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
  ensureAudio();
  const sound = state.settings.alarmSound;
  if (sound === "soft") {
    beep(660, 0.22, 0.07, "sine", 0);
    beep(880, 0.28, 0.06, "sine", 0.24);
    return;
  }
  if (sound === "digital") {
    beep(920, 0.12, 0.07, "square", 0);
    beep(720, 0.12, 0.07, "square", 0.16);
    beep(920, 0.12, 0.07, "square", 0.32);
    return;
  }
  beep(520, 0.18, 0.08, "triangle", 0);
  beep(700, 0.2, 0.08, "triangle", 0.22);
  beep(520, 0.24, 0.08, "triangle", 0.46);
}

function updateTickSound() {
  if (!state.isRunning || !state.settings.tickSound) {
    stopTickSound();
    return;
  }
  ensureAudio();
  if (tickInterval) return;
  tick();
  tickInterval = window.setInterval(tick, 1000);
}

function tick() {
  const volume = Math.max(0, Math.min(100, Number(state.settings.tickVolume))) / 1000;
  beep(1150, 0.025, volume, "square");
}

function stopTickSound() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
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
  const permission = await Notification.requestPermission();
  elements.notificationPermission.textContent = permission === "granted" ? "✓" : "!";
}

function resetDay() {
  state.stats = { sessions: 0, focusSeconds: 0 };
  state.tasks = state.tasks.map((task) => ({ ...task, done: 0 }));
  render();
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

["autoStartBreaks", "autoStartPomodoros", "tickSound"].forEach((key) => {
  elements[key].addEventListener("change", (event) => {
    state.settings[key] = event.target.checked;
    updateTickSound();
    render();
  });
});

elements.tickVolume.addEventListener("input", (event) => {
  state.settings.tickVolume = Number(event.target.value);
  saveState();
});

elements.alarmSound.addEventListener("change", (event) => {
  state.settings.alarmSound = event.target.value;
  playAlarm();
  render();
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

window.addEventListener("beforeunload", saveState);

if (!MODES.includes(state.mode)) state.mode = "pomodoro";
if (!state.remainingSeconds || state.remainingSeconds < 0) state.remainingSeconds = modeDuration();
elements.notificationPermission.textContent =
  "Notification" in window && Notification.permission === "granted" ? "✓" : "!";
render();
