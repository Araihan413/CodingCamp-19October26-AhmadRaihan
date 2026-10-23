/**
 * To-Do List Life Dashboard
 * js/app.js — application entry point and all module definitions
 *
 * Architecture: all modules are plain objects; no framework, no build tools.
 * The single entry point is init(), called on DOMContentLoaded.
 *
 * Module dependency order (also bootstrap order in init()):
 *   StorageManager → ThemeManager → ClockModule → GreetingModule
 *   → TimerModule → TaskListModule → QuickLinksModule → Renderer
 *
 * Rules:
 *   - No module touches localStorage directly — all reads/writes go through StorageManager.
 *   - No module touches the DOM directly — all DOM mutations go through Renderer.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════
 * StorageManager
 * Responsible for all localStorage reads and writes.
 * Every other module calls StorageManager — no module touches
 * localStorage directly.
 * ═══════════════════════════════════════════════════════════════════ */
const StorageManager = {
  /** localStorage key constants */
  KEYS: {
    TASKS:    'tld_tasks',
    LINKS:    'tld_links',
    NAME:     'tld_name',
    DURATION: 'tld_duration',
    THEME:    'tld_theme',
  },

  /**
   * Check whether localStorage is available for reading and writing.
   * @returns {boolean}
   */
  isAvailable() {
    const testKey = '__tld_test__';
    try {
      localStorage.setItem(testKey, '1');
      const val = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      return val === '1';
    } catch (e) {
      return false;
    }
  },

  /**
   * Read and JSON-parse the value stored under `key`.
   * Returns null on missing key, SyntaxError, or any security error.
   * @param {string} key
   * @returns {any|null}
   */
  load(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  },

  /**
   * JSON-stringify `value` and write it to localStorage under `key`.
   * @param {string} key
   * @param {any} value
   * @returns {{ ok: boolean, error?: string }}
   */
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  /**
   * Remove a key from localStorage.
   * @param {string} key
   * @returns {{ ok: boolean, error?: string }}
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },
};

/* ═══════════════════════════════════════════════════════════════════
 * Renderer
 * Owns all DOM mutations.  Other modules call Renderer.render*()
 * methods; they never manipulate the DOM directly.
 * ═══════════════════════════════════════════════════════════════════ */
const Renderer = {
  /**
   * Update the clock and date display elements.
   * @param {Date} date
   */
  renderClock(date) {
    // Format HH:MM:SS (24-hour, zero-padded) using local timezone
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    const timeStr = `${hh}:${mm}:${ss}`;

    // Format "Weekday, DD Month YYYY" using Intl.DateTimeFormat
    const dateStr = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day:     'numeric',
      month:   'long',
      year:    'numeric',
    }).format(date)
      // Intl produces "Monday, 19 October 2026" in en-GB already; normalize separators just in case
      .replace(/(\w+) (\d+) (\w+) (\d+)/, '$1, $2 $3 $4');

    // Only write to DOM when the value has actually changed (avoids unnecessary repaints)
    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');

    if (timeEl && timeEl.textContent !== timeStr) {
      timeEl.textContent = timeStr;
    }
    if (dateEl && dateEl.textContent !== dateStr) {
      dateEl.textContent = dateStr;
    }
  },

  /**
   * Update the greeting line with the appropriate time-of-day prefix and name.
   * @param {string} name  — stored name, or empty string to display "Friend"
   * @param {number} hour  — current hour (0–23)
   */
  renderGreeting(name, hour = new Date().getHours()) {
    const prefix = GreetingModule.getPrefix(hour);
    const displayName = (name && name.trim()) ? name.trim() : 'Friend';
    const greetingText = `Good ${prefix}, ${displayName}`;

    const greetingEl = document.getElementById('greeting-line');
    if (greetingEl && greetingEl.textContent !== greetingText) {
      greetingEl.textContent = greetingText;
    }
  },

  /**
   * Update the timer display (MM:SS countdown + SVG ring + button states).
   * @param {number}  remaining — seconds remaining
   * @param {boolean} running   — whether the timer is currently counting down
   */
  renderTimer(remaining, running) {
    const CIRCUMFERENCE = 427.26;

    // 1. Format MM:SS from remaining seconds
    const totalSeconds = Math.max(0, Math.floor(remaining));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // 2. Update #timer-display only when the text has changed
    const displayEl = document.getElementById('timer-display');
    if (displayEl && displayEl.textContent !== timeStr) {
      displayEl.textContent = timeStr;
    }

    // 3. Update SVG ring stroke-dashoffset
    //    offset = circumference × (1 − remaining / (duration × 60))
    //    remaining = duration×60 → offset 0 (ring fully drawn)
    //    remaining = 0          → offset 427.26 (ring fully consumed)
    const ringEl = document.getElementById('timer-ring-progress');
    if (ringEl) {
      const totalDuration = TimerModule.state.duration * 60;
      const ratio = totalDuration > 0 ? remaining / totalDuration : 0;
      const dashOffset = CIRCUMFERENCE * (1 - ratio);
      ringEl.style.strokeDashoffset = String(dashOffset);
    }

    // 4. Toggle Start/Stop button visibility
    const startBtn = document.getElementById('timer-start-btn');
    const stopBtn  = document.getElementById('timer-stop-btn');
    if (startBtn && stopBtn) {
      if (running) {
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
      } else {
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
      }
    }
  },

  /**
   * Re-render the entire task list from the provided tasks array.
   * @param {Array<{id: string, text: string, completed: boolean, createdAt: number}>} tasks
   */
  renderTaskList(tasks) {
    const taskListEl  = document.getElementById('task-list');
    const taskCountEl = document.getElementById('task-count');
    const tpl         = document.getElementById('tpl-task-item');

    if (!taskListEl || !tpl) return;

    // 1. Clear existing items
    taskListEl.innerHTML = '';

    // 2. Build each task row from the template
    tasks.forEach((task) => {
      const clone = tpl.content.cloneNode(true);
      const li = clone.querySelector('.task-item');

      // Set task id and completion class
      li.dataset.id = task.id;
      li.classList.toggle('completed', task.completed);

      // Set checkbox aria state
      const checkboxBtn = li.querySelector('.task-checkbox-btn');
      checkboxBtn.setAttribute('aria-checked', String(task.completed));
      checkboxBtn.setAttribute('aria-label', task.completed ? 'Mark task incomplete' : 'Mark task complete');

      // Set task text
      const taskTextEl = li.querySelector('.task-text');
      taskTextEl.textContent = task.text;

      // Inline-edit elements
      const editInput      = li.querySelector('.task-edit-input');
      const editActions    = li.querySelector('.task-edit-actions');
      const editConfirmBtn = li.querySelector('.task-edit-confirm-btn');
      const editCancelBtn  = li.querySelector('.task-edit-cancel-btn');
      const editBtn        = li.querySelector('.task-edit-btn');
      const deleteBtn      = li.querySelector('.task-delete-btn');

      // ── Checkbox: toggle completion ──────────────────────────────
      checkboxBtn.addEventListener('click', () => {
        TaskListModule.toggle(task.id);
      });

      // ── Edit button: enter inline edit mode ───────────────────────
      editBtn.addEventListener('click', () => {
        // Visually enter edit mode
        li.classList.add('editing');
        taskTextEl.hidden = true;
        editInput.hidden = false;
        editActions.hidden = false;
        editInput.value = task.text;
        editInput.focus();
        editInput.select();
      });

      // ── Edit confirm ─────────────────────────────────────────────
      const confirmEdit = () => {
        const result = TaskListModule.edit(task.id, editInput.value);
        if (!result.ok) {
          // If empty/whitespace — restore original (req 4.7)
          // re-render will close the edit field with original text
          Renderer.renderTaskList(TaskListModule.tasks);
        }
        // On success, TaskListModule.edit already calls renderTaskList
      };

      editConfirmBtn.addEventListener('click', confirmEdit);
      editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmEdit();
        }
        if (e.key === 'Escape') {
          Renderer.renderTaskList(TaskListModule.tasks);
        }
      });

      // ── Edit cancel ──────────────────────────────────────────────
      editCancelBtn.addEventListener('click', () => {
        Renderer.renderTaskList(TaskListModule.tasks);
      });

      // ── Delete button ────────────────────────────────────────────
      deleteBtn.addEventListener('click', () => {
        TaskListModule.remove(task.id);
      });

      taskListEl.appendChild(clone);
    });

    // 3. Update task count badge
    if (taskCountEl) {
      if (tasks.length === 0) {
        taskCountEl.textContent = '0 tasks';
      } else {
        const done = tasks.filter(t => t.completed).length;
        taskCountEl.textContent = `${done} / ${tasks.length} done`;
      }
    }
  },

  /**
   * Re-render the quick-links panel from the provided links array.
   * @param {Array<{id: string, label: string, url: string}>} links
   */
  renderQuickLinks(links) {
    const gridEl     = document.getElementById('links-grid');
    const limitMsgEl = document.getElementById('links-limit-msg');
    const addBtn     = document.getElementById('add-link-btn');
    const tpl        = document.getElementById('tpl-quick-link');

    if (!gridEl || !tpl) return;

    // 1. Clear existing link items
    gridEl.innerHTML = '';

    // 2. Clone template for each link
    links.forEach((link) => {
      const clone   = tpl.content.cloneNode(true);
      const item    = clone.querySelector('.quick-link-item');
      const anchor  = clone.querySelector('.quick-link-btn');
      const labelEl = clone.querySelector('.quick-link-label');
      const delBtn  = clone.querySelector('.quick-link-delete-btn');

      item.dataset.id        = link.id;
      anchor.href            = link.url;
      anchor.setAttribute('aria-label', link.label);
      labelEl.textContent    = link.label;

      // Delete handler
      delBtn.addEventListener('click', () => {
        QuickLinksModule.remove(link.id);
      });

      gridEl.appendChild(clone);
    });

    // 3. Show/hide limit message and add button
    const atLimit = links.length >= QuickLinksModule.MAX;
    if (limitMsgEl) limitMsgEl.hidden = !atLimit;
    if (addBtn)     addBtn.hidden     = atLimit;
  },

  /**
   * Sync the theme toggle control's aria-pressed state with the active theme.
   * @param {'light'|'dark'} theme
   */
  renderTheme(theme) {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      const isDark = theme === 'dark';
      toggleBtn.setAttribute('aria-pressed', String(isDark));
      toggleBtn.setAttribute('aria-checked', String(isDark));
    }
  },

  /**
   * Insert or update an inline validation message adjacent to `fieldId`.
   * Applies (and re-triggers) the `slideInDown` CSS animation each call.
   * @param {string} fieldId   — id of the form field
   * @param {string} message   — human-readable validation error text
   */
  showValidation(fieldId, message) {
    const msgEl = document.getElementById(`validation-${fieldId}`);
    if (!msgEl) return;

    // Re-trigger animation: force a reflow between class removals
    msgEl.style.animation = 'none';
    // eslint-disable-next-line no-unused-expressions
    msgEl.offsetHeight;           // trigger reflow
    msgEl.style.animation = '';

    msgEl.textContent = message;
    msgEl.removeAttribute('hidden');
  },

  /**
   * Clear and hide the inline validation message adjacent to `fieldId`.
   * @param {string} fieldId
   */
  clearValidation(fieldId) {
    const msgEl = document.getElementById(`validation-${fieldId}`);
    if (!msgEl) return;
    msgEl.textContent = '';
    msgEl.setAttribute('hidden', '');
  },

  /**
   * Display a non-blocking toast notification.
   * Auto-dismisses after 5 seconds with a fade-out animation;
   * also has an ✕ close button for early dismissal.
   * @param {string} message
   * @param {'info'|'warning'|'error'} level
   */
  showToast(message, level = 'info') {
    const container = document.getElementById('toast-container');
    const tpl       = document.getElementById('tpl-toast');
    if (!container || !tpl) return;

    const clone    = tpl.content.cloneNode(true);
    const toast    = clone.querySelector('.toast');
    const msgEl    = clone.querySelector('.toast-message');
    const closeBtn = clone.querySelector('.toast-close-btn');

    toast.dataset.level = level;
    msgEl.textContent   = message;

    // Append first so the element is in the DOM before we reference it
    container.appendChild(clone);

    // Get the live reference after appending (DocumentFragment empties after append)
    const liveToast = container.lastElementChild;

    const dismiss = () => {
      // Play fade-out, then remove
      liveToast.style.animation = 'fadeOut 300ms ease-in-out forwards';
      liveToast.addEventListener('animationend', () => liveToast.remove(), { once: true });
    };

    const timerId = setTimeout(dismiss, 5000);

    liveToast.querySelector('.toast-close-btn').addEventListener('click', () => {
      clearTimeout(timerId);
      dismiss();
    }, { once: true });
  },
};

/* ═══════════════════════════════════════════════════════════════════
 * ClockModule
 * Drives the live clock display.
 * ═══════════════════════════════════════════════════════════════════ */
const ClockModule = {
  /** @type {number|null} setInterval handle */
  _intervalId: null,

  /** @type {boolean} whether the visibilitychange listener has been registered */
  _visibilityListenerAdded: false,

  /** Immediately update the clock display, then keep it ticking every second. */
  start() {
    // Fire immediately so the clock is populated before the first interval fires.
    this.tick();

    // Clear any pre-existing interval to avoid duplicate ticks.
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
    }
    this._intervalId = setInterval(this.tick.bind(this), 1000);

    // Register the visibilitychange listener only once.
    // When the tab regains focus the clock re-syncs immediately (Requirement 1.5).
    if (!this._visibilityListenerAdded) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.tick();
        }
      });
      this._visibilityListenerAdded = true;
    }
  },

  /** Clear the tick interval. */
  stop() {
    clearInterval(this._intervalId);
    this._intervalId = null;
  },

  /**
   * Create a new Date and pass it to Renderer.renderClock().
   * Called by the 1-second interval and on visibilitychange.
   */
  tick() {
    const now = new Date();
    Renderer.renderClock(now);
    Renderer.renderGreeting(GreetingModule.currentName, now.getHours());
  },
};

/* ═══════════════════════════════════════════════════════════════════
 * TimerModule
 * Pomodoro countdown timer.
 * ═══════════════════════════════════════════════════════════════════ */
const TimerModule = {
  state: {
    /** Timer duration in minutes (1–120). */
    duration:  25,
    /** Seconds remaining in the current session. */
    remaining: 25 * 60,
    /** Whether the timer is currently counting down. */
    running:   false,
  },

  /** @type {number|null} setInterval handle */
  _intervalId: null,

  /**
   * Read stored duration from StorageManager; fall back to 25 minutes.
   * Initialise remaining to duration × 60 and render.
   */
  load() {
    const stored = StorageManager.load(StorageManager.KEYS.DURATION);
    this.state.duration  = (stored !== null && Number.isInteger(stored) && stored >= 1 && stored <= 120) ? stored : 25;
    this.state.remaining = this.state.duration * 60;
    this.state.running   = false;
    Renderer.renderTimer(this.state.remaining, this.state.running);
  },

  /** Begin counting down (no-op if already running). */
  start() {
    if (this.state.running) return;
    this.state.running = true;
    this._intervalId = setInterval(() => this.tick(), 1000);
    Renderer.renderTimer(this.state.remaining, this.state.running);
  },

  /** Pause the countdown, retaining remaining time. */
  pause() {
    clearInterval(this._intervalId);
    this._intervalId = null;
    this.state.running = false;
    Renderer.renderTimer(this.state.remaining, this.state.running);
  },

  /** Stop and restore display to the current duration. */
  reset() {
    clearInterval(this._intervalId);
    this._intervalId = null;
    this.state.running   = false;
    this.state.remaining = this.state.duration * 60;
    Renderer.renderTimer(this.state.remaining, this.state.running);
  },

  /**
   * Validate and apply a new duration; persist to storage; reset timer.
   * @param {number} minutes — must be an integer in [1, 120]
   */
  setDuration(minutes) {
    const mins = parseInt(minutes, 10);
    if (!Number.isInteger(mins) || mins < 1 || mins > 120) {
      Renderer.showValidation('timer-duration-input', 'Duration must be a whole number between 1 and 120 minutes.');
      return;
    }
    Renderer.clearValidation('timer-duration-input');
    StorageManager.save(StorageManager.KEYS.DURATION, mins);
    this.state.duration = mins;
    this.reset();
    const el = document.getElementById('timer-duration-input');
    if (el) el.value = mins;
  },

  /**
   * Decrement remaining by 1 second and update the display.
   * Called by the 1-second interval set up in start().
   */
  tick() {
    this.state.remaining--;
    Renderer.renderTimer(this.state.remaining, this.state.running);
    if (this.state.remaining <= 0) this.onComplete();
  },

  /**
   * Called when remaining reaches 0.
   * Stops the timer, plays the audio cue (silent failure on autoplay block),
   * and updates the display.
   */
  onComplete() {
    clearInterval(this._intervalId);
    this._intervalId = null;
    this.state.running = false;
    try {
      const audioEl = document.getElementById('timer-audio');
      if (audioEl) audioEl.play();
    } catch (e) {
      /* silent — autoplay policy */
    }
    Renderer.renderTimer(this.state.remaining, this.state.running);
  },
};

/* ═══════════════════════════════════════════════════════════════════
 * TaskListModule
 * Manages the in-memory task array and all CRUD operations.
 * ═══════════════════════════════════════════════════════════════════ */
const TaskListModule = {
  /** @type {Array<{id: string, text: string, completed: boolean, createdAt: number}>} */
  tasks: [],

  /**
   * Read tasks from StorageManager; fall back to [].
   * Triggers a full re-render of the task list.
   */
  load() {
    const stored = StorageManager.load(StorageManager.KEYS.TASKS);
    this.tasks = Array.isArray(stored) ? stored : [];
    Renderer.renderTaskList(this.tasks);
  },

  /**
   * Add a new task with `text`.
   * @param {string} text
   * @returns {{ ok: boolean, message?: string }}
   */
  add(text) {
    const trimmed = (typeof text === 'string') ? text.trim() : '';
    if (!trimmed) {
      return { ok: false, message: 'Task cannot be empty' };
    }
    if (trimmed.length > 200) {
      return { ok: false, message: 'Task cannot exceed 200 characters' };
    }
    this.tasks.push({
      id:        crypto.randomUUID(),
      text:      trimmed,
      completed: false,
      createdAt: Date.now(),
    });
    this.persist();
    Renderer.renderTaskList(this.tasks);
    return { ok: true };
  },

  /**
   * Toggle the completed state of the task with the given id.
   * @param {string} id
   */
  toggle(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      this.persist();
      Renderer.renderTaskList(this.tasks);
    }
  },

  /**
   * Update the text of the task with the given id.
   * @param {string} id
   * @param {string} newText
   * @returns {{ ok: boolean, message?: string }}
   */
  edit(id, newText) {
    const trimmed = (typeof newText === 'string') ? newText.trim() : '';
    if (!trimmed) {
      return { ok: false, message: 'Task cannot be empty' };
    }
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.text = trimmed;
      this.persist();
      Renderer.renderTaskList(this.tasks);
    }
    return { ok: true };
  },

  /**
   * Remove the task with the given id.
   * @param {string} id
   */
  remove(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.persist();
    Renderer.renderTaskList(this.tasks);
  },

  /** Write the current tasks array to localStorage via StorageManager. */
  persist() {
    const result = StorageManager.save(StorageManager.KEYS.TASKS, this.tasks);
    if (!result.ok) {
      Renderer.showToast('Could not save tasks — data may be lost', 'error');
    }
  },
};

/* ═══════════════════════════════════════════════════════════════════
 * QuickLinksModule
 * Manages the in-memory quick-links array.
 * ═══════════════════════════════════════════════════════════════════ */
const QuickLinksModule = {
  /** @type {Array<{id: string, label: string, url: string}>} */
  links: [],

  /** Maximum number of quick links allowed. */
  MAX: 20,

  /**
   * Read links from StorageManager; fall back to [].
   * Triggers a full re-render of the links panel.
   */
  load() {
    const stored = StorageManager.load(StorageManager.KEYS.LINKS);
    this.links = Array.isArray(stored) ? stored : [];
    Renderer.renderQuickLinks(this.links);
  },

  /**
   * Validate and add a new quick link.
   * @param {string} label — 1–50 characters, non-empty
   * @param {string} url   — starts with http:// or https://, ≤ 2048 characters
   * @returns {{ ok: boolean, message?: string, field?: string }}
   */
  add(label, url) {
    const trimLabel = (typeof label === 'string') ? label.trim() : '';
    const trimUrl   = (typeof url   === 'string') ? url.trim()   : '';

    if (!trimLabel) {
      return { ok: false, message: 'Label cannot be empty', field: 'link-label-input' };
    }
    if (trimLabel.length > 50) {
      return { ok: false, message: 'Label cannot exceed 50 characters', field: 'link-label-input' };
    }
    if (!trimUrl.startsWith('http://') && !trimUrl.startsWith('https://')) {
      return { ok: false, message: 'URL must start with http:// or https://', field: 'link-url-input' };
    }
    if (trimUrl.length > 2048) {
      return { ok: false, message: 'URL is too long (max 2048 characters)', field: 'link-url-input' };
    }
    if (this.links.length >= this.MAX) {
      return { ok: false, message: 'Maximum 20 links reached', field: null };
    }

    this.links.push({
      id:    crypto.randomUUID(),
      label: trimLabel,
      url:   trimUrl,
    });
    this.persist();
    Renderer.renderQuickLinks(this.links);
    return { ok: true };
  },

  /**
   * Remove the quick link with the given id.
   * @param {string} id
   */
  remove(id) {
    this.links = this.links.filter(l => l.id !== id);
    this.persist();
    Renderer.renderQuickLinks(this.links);
  },

  /** Write the current links array to localStorage via StorageManager. */
  persist() {
    const result = StorageManager.save(StorageManager.KEYS.LINKS, this.links);
    if (!result.ok) {
      Renderer.showToast('Could not save links — data may be lost', 'error');
    }
  },
};

/* ═══════════════════════════════════════════════════════════════════
 * GreetingModule
 * Manages the personalized greeting display and name persistence.
 * ═══════════════════════════════════════════════════════════════════ */
const GreetingModule = {
  /** @type {string} In-memory cache of currently set name */
  currentName: '',

  /**
   * Read stored name from StorageManager and render the greeting.
   * Falls back to "" (displays "Friend") when no name is stored.
   */
  load() {
    const stored = StorageManager.load(StorageManager.KEYS.NAME);
    // load() may return null (missing key) or a non-string on corrupt data; normalise to string
    const name = (typeof stored === 'string') ? stored : '';
    this.currentName = name;
    const hour = new Date().getHours();
    Renderer.renderGreeting(name, hour);
  },

  /**
   * Save a new display name (or clear it if empty/whitespace-only).
   * Enforces max 50 characters (matching the maxlength="50" on the input).
   * @param {string} name
   */
  setName(name) {
    const trimmed = (typeof name === 'string') ? name.trim() : '';

    if (!trimmed) {
      // Empty / whitespace-only → remove any stored name so "Friend" is shown (Req 2.9)
      this.currentName = '';
      StorageManager.remove(StorageManager.KEYS.NAME);
    } else {
      // Clamp to 50 characters as a safety net (HTML maxlength is the primary guard, Req 2.10)
      const clamped = trimmed.slice(0, 50);
      this.currentName = clamped;
      const result = StorageManager.save(StorageManager.KEYS.NAME, clamped);
      if (!result.ok) {
        Renderer.showToast('Name preference could not be saved', 'warning');
      }
    }

    // Re-render greeting immediately — no page reload needed (Req 2.8)
    const hour = new Date().getHours();
    Renderer.renderGreeting(this.currentName, hour);
  },

  /**
   * Pure function — maps an hour (0–23) to a time-of-day prefix string.
   * [5, 12)  → 'Morning'
   * [12, 18) → 'Afternoon'
   * [18, 22) → 'Evening'
   * [22, 5)  → 'Night'   (wraps around midnight)
   * @param {number} [hour] — integer 0–23
   * @returns {'Morning'|'Afternoon'|'Evening'|'Night'}
   */
  getPrefix(hour = new Date().getHours()) {
    if (hour >= 5  && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 18) return 'Afternoon';
    if (hour >= 18 && hour < 22) return 'Evening';
    return 'Night';   // covers 22–23 and 0–4 (Req 2.6)
  },
};

/* ═══════════════════════════════════════════════════════════════════
 * ThemeManager
 * Manages the light/dark theme state, persistence, and DOM application.
 * ═══════════════════════════════════════════════════════════════════ */
const ThemeManager = {
  /** @type {'light'|'dark'} */
  current: 'light',

  /**
   * Read stored theme from StorageManager; fall back to 'light'.
   * Apply the theme immediately to prevent a flash of unstyled content.
   */
  load() {
    const stored = StorageManager.load(StorageManager.KEYS.THEME);
    this.current = (stored === 'dark') ? 'dark' : 'light';
    this.apply(this.current);
  },

  /**
   * Flip the active theme and persist the new choice.
   */
  toggle() {
    this.current = (this.current === 'light') ? 'dark' : 'light';
    this.apply(this.current);
    const result = StorageManager.save(StorageManager.KEYS.THEME, this.current);
    if (!result.ok) {
      Renderer.showToast('Theme preference could not be saved', 'warning');
    }
  },

  /**
   * Apply a theme by setting the data-theme attribute on <html> and
   * calling Renderer.renderTheme() to sync the toggle control.
   * @param {'light'|'dark'} theme
   */
  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.current = theme;
    Renderer.renderTheme(theme);
  },
};

/* ═══════════════════════════════════════════════════════════════════
 * init()
 * Single entry point — bootstraps all modules in dependency order.
 * Called on DOMContentLoaded.
 * ═══════════════════════════════════════════════════════════════════ */
function init() {
  // 1. Check localStorage availability early.
  //    Capture the result now so all modules below use their in-memory fallbacks
  //    when storage is unavailable. The warning toast is shown after all modules
  //    have rendered (deferred with setTimeout) so the toast container exists.
  const storageAvailable = StorageManager.isAvailable();
  if (!storageAvailable) {
    // Defer so Renderer / toast-container is in the DOM before we call showToast
    setTimeout(() => {
      Renderer.showToast('Data cannot be saved in this session', 'warning');
    }, 0);
  }

  // 1b. Skeleton safety net (Req 8.6, 8.7): if JS takes > 3 s, force-hide
  //     skeletons so users never see a frozen loading placeholder.
  const skeletonFallbackTimer = setTimeout(() => {
    document.body.classList.add('is-loaded');
  }, 3000);

  // 2. Apply the stored (or default) theme before any content renders to
  //    prevent a flash of the wrong theme.
  ThemeManager.load();

  // 3. Start the live clock; tick() fires immediately so the display is
  //    populated before the user sees the page.
  ClockModule.start();

  // 4. Load the stored greeting name and render the greeting line.
  GreetingModule.load();

  // 5. Load the stored Pomodoro duration and initialise the timer display.
  TimerModule.load();

  // 6. Load persisted tasks and render the task list.
  TaskListModule.load();

  // 7. Load persisted quick links and render the links panel.
  QuickLinksModule.load();

  // 8. Wire event listeners for all interactive controls.

  // Theme toggle
  document.getElementById('theme-toggle')?.addEventListener('click', () => ThemeManager.toggle());

  // Name input — confirm button and Enter key (Req 2.7, 2.8)
  const nameInput = document.getElementById('name-input');
  const nameConfirmBtn = document.getElementById('name-confirm-btn');

  function submitName() {
    if (nameInput) {
      GreetingModule.setName(nameInput.value);
      nameInput.value = '';
      Renderer.clearValidation('name-input');
    }
  }

  if (nameConfirmBtn) {
    nameConfirmBtn.addEventListener('click', submitName);
  }
  if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitName();
      }
    });
  }

  // Timer controls — Start, Stop, Reset, duration input
  const timerStartBtn           = document.getElementById('timer-start-btn');
  const timerStopBtn            = document.getElementById('timer-stop-btn');
  const timerResetBtn           = document.getElementById('timer-reset-btn');
  const timerDurationInput      = document.getElementById('timer-duration-input');
  const timerDurationConfirmBtn = document.getElementById('timer-duration-confirm-btn');

  if (timerStartBtn) {
    timerStartBtn.addEventListener('click', () => TimerModule.start());
  }
  if (timerStopBtn) {
    timerStopBtn.addEventListener('click', () => TimerModule.pause());
  }
  if (timerResetBtn) {
    timerResetBtn.addEventListener('click', () => TimerModule.reset());
  }

  function submitDuration() {
    if (timerDurationInput) {
      TimerModule.setDuration(timerDurationInput.value);
    }
  }

  if (timerDurationConfirmBtn) {
    timerDurationConfirmBtn.addEventListener('click', submitDuration);
  }
  if (timerDurationInput) {
    timerDurationInput.addEventListener('change', submitDuration);
    timerDurationInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitDuration();
      }
    });
  }

  // Task add form
  const taskAddForm = document.getElementById('task-add-form');
  const taskInput   = document.getElementById('task-input');

  if (taskAddForm) {
    taskAddForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const result = TaskListModule.add(taskInput ? taskInput.value : '');
      if (!result.ok) {
        Renderer.showValidation('task-input', result.message || 'Invalid task');
      } else {
        Renderer.clearValidation('task-input');
        if (taskInput) taskInput.value = '';
      }
    });
  }

  // Quick links add form
  const addLinkForm       = document.getElementById('add-link-form');
  const linkLabelInput    = document.getElementById('link-label-input');
  const linkUrlInput      = document.getElementById('link-url-input');

  if (addLinkForm) {
    addLinkForm.addEventListener('submit', (e) => {
      e.preventDefault();
      Renderer.clearValidation('link-label-input');
      Renderer.clearValidation('link-url-input');

      const result = QuickLinksModule.add(
        linkLabelInput ? linkLabelInput.value : '',
        linkUrlInput   ? linkUrlInput.value   : ''
      );

      if (!result.ok) {
        if (result.field) {
          Renderer.showValidation(result.field, result.message || 'Invalid input');
        } else {
          // Max-links reached — toast
          Renderer.showToast(result.message || 'Cannot add more links', 'warning');
        }
      } else {
        // Clear inputs on success
        if (linkLabelInput) linkLabelInput.value = '';
        if (linkUrlInput)   linkUrlInput.value   = '';
      }
    });
  }

  // Mark the page as fully loaded — CSS uses .is-loaded to hide skeleton blocks.
  // Cancel the 3-second fallback timer since we finished before it fired.
  clearTimeout(skeletonFallbackTimer);
  document.body.classList.add('is-loaded');
}

/* ── Bootstrap ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);
