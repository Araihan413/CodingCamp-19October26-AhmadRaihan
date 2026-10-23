# Design Document

## Overview

The To-Do List Life Dashboard is a single-page, client-side web application with a Glassmorphism aesthetic. It delivers a live clock, personalized greeting, Pomodoro focus timer, persistent task list, and quick-links panel — all stored in the browser's `localStorage` with no server dependency.

The Glassmorphism visual language creates the impression of frosted glass panels floating above a vivid gradient background. Every panel is semi-transparent with a `backdrop-filter: blur()` effect, a subtle white-tinted border, and layered soft shadows. This aesthetic works in both a warm-light daytime theme and a cool-dark nighttime theme.

### Design Goals

- **Zero backend**: 100 % client-side; runs from any static file server or directly from the filesystem.
- **Progressive disclosure**: each panel is self-contained and only reveals controls when needed (e.g., inline edit fields appear on demand).
- **Accessibility**: meets WCAG 2.1 AA contrast requirements in both themes; all interactive controls have visible focus rings.
- **Resilience**: graceful fallback to in-memory state when `localStorage` is unavailable.

---

## Architecture

The application is split into a single HTML shell plus one CSS file and one JavaScript module file.

```
/
├── index.html        ← markup shell; no inline scripts or styles
├── css/
│   └── style.css     ← all styles, custom properties, responsive rules
└── js/
    └── app.js        ← all logic, organized into ES-module-style IIFEs / objects
```

### Module Topology

```mermaid
graph TD
    APP[app.js — init()] --> SM[StorageManager]
    APP --> TM[ThemeManager]
    APP --> CK[ClockModule]
    APP --> TI[TimerModule]
    APP --> TL[TaskListModule]
    APP --> QL[QuickLinksModule]
    APP --> GR[GreetingModule]
    APP --> RN[Renderer]

    SM -->|read/write| LS[(localStorage)]
    TM --> RN
    CK --> RN
    TI --> RN
    TL --> SM
    TL --> RN
    QL --> SM
    QL --> RN
    GR --> SM
    GR --> RN
```

The `init()` function in `app.js` is the single entry point, called on `DOMContentLoaded`. It bootstraps every module in dependency order: `StorageManager` first, then `ThemeManager`, then all display modules, and finally `Renderer`.

---

## Components and Interfaces

### StorageManager

Responsible for all `localStorage` reads and writes. Every other module calls `StorageManager` — no module touches `localStorage` directly.

```
StorageManager = {
  KEYS: {
    TASKS:     'tld_tasks',
    LINKS:     'tld_links',
    NAME:      'tld_name',
    DURATION:  'tld_duration',
    THEME:     'tld_theme',
  },
  load(key)          → any | null    // JSON.parse; returns null on error
  save(key, value)   → { ok: bool, error?: string }
  isAvailable()      → bool
}
```

`load()` catches `JSON.SyntaxError` and returns `null`, triggering the caller's fallback to the documented default value. `save()` wraps `localStorage.setItem` in a try/catch and returns `{ ok: false, error }` on quota or security errors.

### Renderer

The Renderer owns all DOM mutations. Other modules call `Renderer.render*()` methods; they never manipulate the DOM directly.

```
Renderer = {
  renderClock(time: Date)               → void
  renderGreeting(name: string, hour: number) → void
  renderTimer(remaining: number, running: bool) → void
  renderTaskList(tasks: Task[])         → void
  renderQuickLinks(links: QuickLink[])  → void
  renderTheme(theme: 'light'|'dark')    → void
  showValidation(fieldId, message)      → void
  clearValidation(fieldId)              → void
  showToast(message, level)             → void  // 'info'|'warning'|'error'
}
```

The Renderer builds DOM nodes from templates (`<template>` tags in `index.html`) and diffs against the current DOM only when data changes to avoid unnecessary repaints.

### ClockModule

```
ClockModule = {
  start()     → void   // sets 1-second setInterval
  stop()      → void
  tick()      → void   // called by interval; calls Renderer.renderClock
}
```

Handles the `visibilitychange` event: on page re-focus it immediately calls `tick()` to re-synchronize before the next interval fires.

### TimerModule

```
TimerModule = {
  state: { duration: number, remaining: number, running: bool }
  load()                  → void   // reads from StorageManager
  start()                 → void
  pause()                 → void
  reset()                 → void
  setDuration(minutes)    → void
  tick()                  → void   // called by 1-second setInterval
  onComplete()            → void   // plays audio cue, calls Renderer
}
```

`tick()` decrements `remaining` by 1 and calls `Renderer.renderTimer`. When `remaining === 0` it calls `onComplete()` which plays the `<audio>` element and stops the interval.

### TaskListModule

```
TaskListModule = {
  tasks: Task[]
  load()                          → void
  add(text: string)               → Result
  toggle(id: string)              → void
  edit(id: string, newText: string) → Result
  remove(id: string)              → void
  persist()                       → void   // calls StorageManager.save
}

Task = {
  id:        string,   // crypto.randomUUID() or Date.now().toString()
  text:      string,
  completed: boolean,
  createdAt: number    // Unix timestamp ms
}
```

`add()` and `edit()` return a `Result` object (`{ ok: bool, message?: string }`) so the caller can drive validation UI without the module knowing about the DOM.

### QuickLinksModule

```
QuickLinksModule = {
  links: QuickLink[]
  MAX:   20
  load()                      → void
  add(label, url)             → Result
  remove(id: string)          → void
  persist()                   → void
}

QuickLink = {
  id:    string,
  label: string,   // 1–50 chars
  url:   string    // starts with http:// or https://, max 2048 chars
}
```

### GreetingModule

```
GreetingModule = {
  load()               → void
  setName(name: string) → void
  getPrefix(hour: number) → string   // 'Morning'|'Afternoon'|'Evening'|'Night'
}
```

`getPrefix()` is a pure function: `[5,12)→Morning`, `[12,18)→Afternoon`, `[18,22)→Evening`, `[22,5)→Night`.

### ThemeManager

```
ThemeManager = {
  current: 'light' | 'dark'
  load()      → void
  toggle()    → void
  apply(theme) → void   // sets data-theme attribute on <html>; calls Renderer
}
```

CSS custom properties respond to `[data-theme="dark"]` on the root element, so a single attribute change drives the entire visual switch within the 300 ms CSS transition window.

---

## Data Models

### Local Storage Schema

| Key | Type | Default | Example |
|---|---|---|---|
| `tld_tasks` | `Task[]` JSON | `[]` | `[{"id":"abc","text":"Write tests","completed":false,"createdAt":1700000000000}]` |
| `tld_links` | `QuickLink[]` JSON | `[]` | `[{"id":"lnk1","label":"GitHub","url":"https://github.com"}]` |
| `tld_name` | `string` JSON | `""` | `"Ahmad"` |
| `tld_duration` | `number` JSON | `25` | `25` |
| `tld_theme` | `"light"\|"dark"` JSON | `"light"` | `"dark"` |

All values are serialized with `JSON.stringify` and deserialized with `JSON.parse`. A missing key and a key containing malformed JSON are treated identically — both trigger the documented default.

### Validation Rules (enforced in modules, surfaced by Renderer)

| Field | Rule |
|---|---|
| Task text | 1–200 non-whitespace-only characters |
| Custom name | 0–50 characters; empty/whitespace → reverts to "Friend" |
| Timer duration | Integer 1–120 (minutes) |
| Link label | 1–50 non-empty characters |
| Link URL | Starts with `http://` or `https://`; max 2048 characters |

---

## Glassmorphism Design System

### Design Tokens (CSS Custom Properties)

All tokens are declared on `:root` for the light theme and overridden under `[data-theme="dark"]`.

#### Color Palette

```css
/* ── Light Theme (default) ── */
:root {
  /* Background gradient painted on <body> */
  --bg-gradient: linear-gradient(135deg, #ffecd2 0%, #fcb69f 30%, #a18cd1 70%, #fbc2eb 100%);

  /* Glass panel surface */
  --glass-bg:          rgba(255, 255, 255, 0.25);
  --glass-bg-hover:    rgba(255, 255, 255, 0.35);
  --glass-bg-active:   rgba(255, 255, 255, 0.45);

  /* Glass border */
  --glass-border:      rgba(255, 255, 255, 0.30);
  --glass-border-focus:rgba(255, 255, 255, 0.70);

  /* Text */
  --text-primary:      rgba(30,  20,  60,  1.00);   /* deep indigo – contrast ≥ 7:1 on glass */
  --text-secondary:    rgba(30,  20,  60,  0.65);
  --text-placeholder:  rgba(30,  20,  60,  0.40);
  --text-inverse:      rgba(255, 255, 255, 0.95);

  /* Semantic colors */
  --color-success:     #2d9e6b;
  --color-warning:     #e08a00;
  --color-error:       #c0392b;
  --color-info:        #2980b9;

  /* Accent (Pomodoro timer ring, primary buttons) */
  --accent:            #7c5cbf;
  --accent-glow:       rgba(124, 92, 191, 0.35);
}

/* ── Dark Theme ── */
[data-theme="dark"] {
  /* Background gradient */
  --bg-gradient: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);

  /* Glass panel surface */
  --glass-bg:          rgba(255, 255, 255, 0.06);
  --glass-bg-hover:    rgba(255, 255, 255, 0.10);
  --glass-bg-active:   rgba(255, 255, 255, 0.14);

  /* Glass border */
  --glass-border:      rgba(255, 255, 255, 0.12);
  --glass-border-focus:rgba(255, 255, 255, 0.40);

  /* Text */
  --text-primary:      rgba(240, 235, 255, 1.00);   /* near-white violet – contrast ≥ 7:1 */
  --text-secondary:    rgba(240, 235, 255, 0.65);
  --text-placeholder:  rgba(240, 235, 255, 0.35);
  --text-inverse:      rgba(20,  15,  40,  0.95);

  /* Accent */
  --accent:            #a78bfa;
  --accent-glow:       rgba(167, 139, 250, 0.35);
}
```

#### Glass Effect Properties

```css
/* Applied to every .glass-panel */
.glass-panel {
  background:    var(--glass-bg);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border:        1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.18),       /* drop shadow */
    inset 0 1px 0 rgba(255,255,255,0.25); /* inner top highlight */
  transition:
    background var(--transition-theme),
    border-color var(--transition-theme),
    box-shadow var(--transition-fast);
}

.glass-panel:hover {
  background: var(--glass-bg-hover);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.24),
    inset 0 1px 0 rgba(255,255,255,0.30);
}
```

#### Typography

```css
:root {
  --font-family:       'Inter', 'Segoe UI', system-ui, sans-serif;
  --font-mono:         'JetBrains Mono', 'Fira Code', 'Courier New', monospace;

  /* Scale (Major Third – 1.250) */
  --text-xs:    0.64rem;   /* 10.24px */
  --text-sm:    0.80rem;   /* 12.80px */
  --text-base:  1.00rem;   /* 16px    */
  --text-md:    1.25rem;   /* 20px    */
  --text-lg:    1.563rem;  /* 25px    */
  --text-xl:    1.953rem;  /* 31px    */
  --text-2xl:   2.441rem;  /* 39px    */
  --text-3xl:   3.052rem;  /* 49px    */

  /* Weights */
  --weight-regular: 400;
  --weight-medium:  500;
  --weight-semibold:600;
  --weight-bold:    700;

  /* Line heights */
  --lh-tight:   1.2;
  --lh-snug:    1.35;
  --lh-normal:  1.5;
  --lh-relaxed: 1.65;
}
```

#### Spacing Scale

```css
:root {
  --space-1:   0.25rem;  /*  4px */
  --space-2:   0.50rem;  /*  8px */
  --space-3:   0.75rem;  /* 12px */
  --space-4:   1.00rem;  /* 16px */
  --space-5:   1.25rem;  /* 20px */
  --space-6:   1.50rem;  /* 24px */
  --space-8:   2.00rem;  /* 32px */
  --space-10:  2.50rem;  /* 40px */
  --space-12:  3.00rem;  /* 48px */
  --space-16:  4.00rem;  /* 64px */
}
```

#### Border Radius

```css
:root {
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   16px;
  --radius-xl:   20px;
  --radius-2xl:  28px;
  --radius-full: 9999px;
}
```

#### Shadow / Glow Tokens

```css
:root {
  --shadow-sm:     0 2px  8px  rgba(0,0,0,0.10);
  --shadow-md:     0 4px  16px rgba(0,0,0,0.14);
  --shadow-lg:     0 8px  32px rgba(0,0,0,0.18);
  --shadow-xl:     0 16px 48px rgba(0,0,0,0.22);
  --glow-accent:   0 0 20px var(--accent-glow);
  --glow-accent-lg:0 0 40px var(--accent-glow);
}
```

#### Animation & Transition Tokens

```css
:root {
  --transition-fast:   150ms ease-out;
  --transition-normal: 250ms ease-in-out;
  --transition-slow:   400ms ease-in-out;
  --transition-theme:  280ms ease-in-out;   /* used for theme switch */

  --ease-spring:       cubic-bezier(0.34, 1.56, 0.64, 1);  /* bouncy entrances */
  --ease-in-back:      cubic-bezier(0.36, 0, 0.66, -0.56); /* exits */
}
```

---

## Component-Level Design Specifications

### 1. Body & Background

```
<body>                 background: var(--bg-gradient); min-height: 100vh
  fixed gradient layer (::before pseudo) + subtle noise texture overlay
  transition: background var(--transition-theme)
```

The gradient is painted on `body` via `background` and also applied on a `::before` pseudo-element with `opacity: 0` for the alternate theme, then cross-faded with `transition: opacity var(--transition-theme)` to avoid jarring gradient jumps.

### 2. Layout Grid

```
.dashboard-grid                         /* wraps all panels */
  display: grid
  gap: var(--space-6)
  padding: var(--space-6)
  max-width: 1280px; margin: 0 auto

  /* ≥ 768 px — 3-column grid */
  grid-template-columns: repeat(3, 1fr)
  grid-template-areas:
    "clock    clock    clock"
    "timer    tasks    tasks"
    "links    links    theme"

  /* < 768 px — single column */
  grid-template-columns: 1fr
  grid-template-areas:
    "clock"
    "timer"
    "tasks"
    "links"
    "theme"
```

### 3. Clock & Date Panel

```
.panel-clock  (grid-area: clock)
  glass-panel
  text-align: center
  padding: var(--space-8) var(--space-6)

  .clock-time
    font: var(--weight-bold) var(--text-3xl) var(--font-mono)
    color: var(--text-primary)
    letter-spacing: 0.05em
    text-shadow: 0 2px 8px rgba(0,0,0,0.12)

  .clock-date
    font: var(--weight-medium) var(--text-md) var(--font-family)
    color: var(--text-secondary)
    margin-top: var(--space-2)

  .greeting-line
    font: var(--weight-semibold) var(--text-lg) var(--font-family)
    color: var(--text-primary)
    margin-top: var(--space-3)

  .name-input-wrapper
    display: inline-flex; gap: var(--space-2)
    margin-top: var(--space-3)

    input[type="text"]           /* glass input */
      background: var(--glass-bg-active)
      border: 1px solid var(--glass-border)
      border-radius: var(--radius-full)
      padding: var(--space-2) var(--space-4)
      font-size: var(--text-sm)
      color: var(--text-primary)
      backdrop-filter: blur(8px)
      max-length: 50 (enforced in HTML)

    button.btn-confirm            /* small pill button */
      background: var(--accent)
      color: var(--text-inverse)
      border-radius: var(--radius-full)
      padding: var(--space-2) var(--space-4)
      font-size: var(--text-sm)
      box-shadow: var(--glow-accent)
      transition: box-shadow var(--transition-fast), transform var(--transition-fast)

    button.btn-confirm:hover
      box-shadow: var(--glow-accent-lg)
      transform: translateY(-1px)
```

### 4. Focus Timer Panel

```
.panel-timer  (grid-area: timer)
  glass-panel
  padding: var(--space-8) var(--space-6)
  display: flex; flex-direction: column; align-items: center; gap: var(--space-4)

  .timer-ring-wrapper
    position: relative; width: 160px; height: 160px
    SVG circle with stroke-dasharray driven by remaining/duration ratio
    stroke: var(--accent); filter: drop-shadow(var(--glow-accent))

  .timer-display
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center
    font: var(--weight-bold) var(--text-2xl) var(--font-mono)
    color: var(--text-primary)

  .timer-controls               /* Start / Stop / Reset */
    display: flex; gap: var(--space-3)

    button.btn-icon-primary      /* Start */
      width: 48px; height: 48px; border-radius: var(--radius-full)
      background: var(--accent); color: var(--text-inverse)
      box-shadow: var(--glow-accent)
      transition: transform var(--transition-fast), box-shadow var(--transition-fast)

    button.btn-icon-secondary    /* Stop / Reset */
      width: 44px; height: 44px; border-radius: var(--radius-full)
      background: var(--glass-bg-active)
      border: 1px solid var(--glass-border)
      color: var(--text-primary)

  .timer-duration-input-wrapper
    display: flex; align-items: center; gap: var(--space-2)
    font-size: var(--text-sm); color: var(--text-secondary)

    input[type="number"]
      width: 64px
      glass input styles (same as name input above)
      text-align: center

  .timer-validation-msg
    font-size: var(--text-sm); color: var(--color-error)
    min-height: 1.2em
```

### 5. To-Do List Panel

```
.panel-tasks  (grid-area: tasks)
  glass-panel
  padding: var(--space-6)
  display: flex; flex-direction: column; gap: var(--space-4)

  .tasks-header
    display: flex; align-items: center; justify-content: space-between
    h2: font var(--weight-semibold) var(--text-md); color: var(--text-primary)
    .task-count: font var(--text-sm); color: var(--text-secondary)

  .task-add-form
    display: flex; gap: var(--space-2)
    input[type="text"]
      flex: 1; glass input styles; border-radius: var(--radius-full)
      placeholder color: var(--text-placeholder)
    button[type="submit"]
      glass accent button; border-radius: var(--radius-full)
      padding: var(--space-2) var(--space-4)

  .task-add-validation            /* inline, below the input */
    font-size: var(--text-xs); color: var(--color-error)
    min-height: 1.1em

  .task-list                      /* <ul> with no list-style */
    display: flex; flex-direction: column; gap: var(--space-2)
    max-height: 420px; overflow-y: auto
    scrollbar-width: thin; scrollbar-color: var(--glass-border) transparent

  .task-item                      /* <li> */
    display: flex; align-items: center; gap: var(--space-3)
    padding: var(--space-3) var(--space-4)
    background: var(--glass-bg); border: 1px solid var(--glass-border)
    border-radius: var(--radius-lg)
    transition: background var(--transition-fast), opacity var(--transition-normal)

  .task-item.completed
    opacity: 0.55
    .task-text: text-decoration: line-through; color: var(--text-secondary)

  .task-item:hover
    background: var(--glass-bg-hover)

  .task-checkbox-btn              /* custom toggle button */
    width: 22px; height: 22px; border-radius: var(--radius-sm)
    border: 2px solid var(--glass-border-focus)
    background: transparent
    transition: background var(--transition-fast), border-color var(--transition-fast)

  .task-checkbox-btn[aria-checked="true"]
    background: var(--accent); border-color: var(--accent)
    box-shadow: var(--glow-accent)
    icon: checkmark SVG

  .task-text
    flex: 1; font-size: var(--text-base); color: var(--text-primary)
    line-height: var(--lh-normal)

  /* Inline edit state */
  .task-item.editing
    background: var(--glass-bg-active)
    .task-text: hidden
    .task-edit-input: visible (full-width glass input)
    .task-edit-actions: confirm + cancel mini buttons

  .task-action-btn               /* edit / delete icons */
    opacity: 0; transition: opacity var(--transition-fast)
    width: 30px; height: 30px; border-radius: var(--radius-sm)
    color: var(--text-secondary)
  .task-item:hover .task-action-btn
    opacity: 1
```

### 6. Quick Links Panel

```
.panel-links  (grid-area: links)
  glass-panel
  padding: var(--space-6)
  display: flex; flex-direction: column; gap: var(--space-4)

  .links-grid
    display: flex; flex-wrap: wrap; gap: var(--space-3)

  .quick-link-btn
    display: inline-flex; align-items: center; gap: var(--space-2)
    padding: var(--space-2) var(--space-4)
    background: var(--glass-bg-active)
    border: 1px solid var(--glass-border)
    border-radius: var(--radius-full)
    font-size: var(--text-sm); color: var(--text-primary)
    text-decoration: none; cursor: pointer
    transition: background var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast)

  .quick-link-btn:hover
    background: var(--glass-bg-hover)
    box-shadow: var(--shadow-md)
    transform: translateY(-2px)

  .quick-link-btn .delete-icon
    opacity: 0; margin-left: var(--space-1)
    transition: opacity var(--transition-fast)
  .quick-link-btn:hover .delete-icon
    opacity: 1

  .add-link-form
    display: grid; grid-template-columns: 1fr 2fr auto; gap: var(--space-2)
    align-items: start

    input[type="text"], input[type="url"]  /* glass inputs */
      glass input styles; border-radius: var(--radius-md)

    button[type="submit"]        /* small glass accent pill */
      glass accent button styles

  .add-link-validation           /* per-field inline messages */
    font-size: var(--text-xs); color: var(--color-error)

  .links-limit-msg               /* shown when count === 20 */
    font-size: var(--text-sm); color: var(--color-warning); text-align: center
```

### 7. Theme Toggle Control

```
.panel-theme  (grid-area: theme)
  glass-panel
  padding: var(--space-5) var(--space-6)
  display: flex; align-items: center; justify-content: space-between

  span                           /* "Theme" label */
    font-size: var(--text-sm); color: var(--text-secondary)

  .theme-toggle                  /* pill switch */
    width: 52px; height: 28px
    background: var(--glass-bg-active)
    border: 1px solid var(--glass-border)
    border-radius: var(--radius-full)
    position: relative; cursor: pointer
    transition: background var(--transition-theme)

  .theme-toggle[aria-pressed="true"]  /* dark active */
    background: var(--accent)
    box-shadow: var(--glow-accent)

  .theme-toggle::after           /* knob */
    content: ''; position: absolute; top: 3px; left: 3px
    width: 22px; height: 22px; border-radius: var(--radius-full)
    background: white
    transition: transform var(--transition-normal) var(--ease-spring)
    box-shadow: var(--shadow-sm)

  .theme-toggle[aria-pressed="true"]::after
    transform: translateX(24px)

  .theme-icon                    /* ☀️ / 🌙 decorative label */
    font-size: var(--text-md)
    transition: transform var(--transition-normal) var(--ease-spring)
```

### 8. Validation & Toast Components

```
/* Inline field validation — appears below the offending input */
.validation-msg
  font-size: var(--text-xs)
  color: var(--color-error)
  display: flex; align-items: center; gap: var(--space-1)
  animation: slideInDown var(--transition-fast) var(--ease-spring)

/* Toast notifications — non-blocking, top-right */
.toast-container
  position: fixed; top: var(--space-4); right: var(--space-4)
  z-index: 9999; display: flex; flex-direction: column; gap: var(--space-2)

.toast
  glass-panel styles (blur 12px)
  padding: var(--space-3) var(--space-5)
  border-radius: var(--radius-lg)
  font-size: var(--text-sm); color: var(--text-primary)
  border-left: 3px solid var(--color-*)   /* color keyed to level */
  animation:
    slideInRight var(--transition-normal) var(--ease-spring),
    fadeOut      var(--transition-slow)   var(--ease-in-back) forwards 4.5s
  max-width: 320px
```

---

## Data Models

*(already defined above in Components and Interfaces; summarized here for completeness)*

```
Task        = { id, text, completed, createdAt }
QuickLink   = { id, label, url }
AppState    = {
  tasks:     Task[]
  links:     QuickLink[]
  name:      string
  duration:  number          // minutes 1–120
  theme:     'light'|'dark'
}
```

All state is held in memory and mirrored to `localStorage` on every mutation.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Greeting Prefix Coverage

*For any* hour of the day (0–23), `GreetingModule.getPrefix(hour)` SHALL return exactly one of "Morning", "Afternoon", "Evening", or "Night" — never an empty string or an unrecognized value.

**Validates: Requirements 2.3, 2.4, 2.5, 2.6**

### Property 2: Whitespace-only Name Reverts to Default

*For any* string composed entirely of whitespace characters (or the empty string), calling `GreetingModule.setName()` with that value SHALL result in the displayed greeting showing "Friend" and `localStorage` SHALL contain no stored name key.

**Validates: Requirements 2.9**

### Property 3: Whitespace-only Task Is Rejected

*For any* string composed entirely of whitespace characters (or the empty string), `TaskListModule.add()` SHALL return `{ ok: false }` and the `tasks` array SHALL remain unchanged.

**Validates: Requirements 4.2**

### Property 4: Task Addition Round-Trip

*For any* valid task text (1–200 non-whitespace-only characters), after calling `TaskListModule.add(text)` and `StorageManager.save()`, deserializing the stored value for key `tld_tasks` SHALL yield an array whose last entry has the same `text` value.

**Validates: Requirements 4.1, 4.11, 7.1**

### Property 5: Task Toggle Idempotence of State

*For any* task in the task list, calling `TaskListModule.toggle(id)` twice in a row SHALL leave the task's `completed` state equal to its original state before the first toggle.

**Validates: Requirements 4.3**

### Property 6: Task Edit Preserves Other Tasks

*For any* task list with N tasks and any valid edit operation on one task, the resulting task list SHALL still contain exactly N tasks and all other tasks SHALL be unchanged.

**Validates: Requirements 4.6**

### Property 7: Invalid Task Edit Preserves Original Text

*For any* task, calling `TaskListModule.edit(id, text)` with an empty or whitespace-only `text` SHALL return `{ ok: false }` and the task's `text` SHALL remain equal to its pre-edit value.

**Validates: Requirements 4.7**

### Property 8: Quick Link Validation Round-Trip

*For any* label (1–50 chars) and URL beginning with `http://` or `https://` (≤ 2048 chars), `QuickLinksModule.add(label, url)` SHALL return `{ ok: true }` and the link SHALL appear in `links` with the same label and url values.

**Validates: Requirements 5.1, 5.2**

### Property 9: Quick Link Rejection for Invalid Input

*For any* combination of label or URL that violates at least one validation rule (empty label, label > 50 chars, URL not starting with `http://`/`https://`, URL > 2048 chars), `QuickLinksModule.add()` SHALL return `{ ok: false }` and the `links` array length SHALL remain unchanged.

**Validates: Requirements 5.3, 5.4**

### Property 10: Quick Links Maximum Capacity

*For any* sequence of valid `add()` calls that brings the `links` array to exactly 20 entries, any subsequent `add()` call SHALL return `{ ok: false }` and `links.length` SHALL remain 20.

**Validates: Requirements 5.5**

### Property 11: Timer Duration Persistence Round-Trip

*For any* integer N in [1, 120], calling `TimerModule.setDuration(N)` followed by a page-reload simulation (re-running `TimerModule.load()` from storage) SHALL restore `state.duration` to N and `state.remaining` to N × 60.

**Validates: Requirements 3.3, 3.9, 3.10**

### Property 12: Timer Duration Rejection Outside Range

*For any* number outside [1, 120] (e.g., 0, 121, −5, 1.5), `TimerModule.setDuration()` SHALL reject the input and leave `state.duration` unchanged.

**Validates: Requirements 3.11**

### Property 13: Storage Serialization Round-Trip

*For any* valid `AppState` object, serializing each field to its `localStorage` key and then deserializing via `StorageManager.load()` SHALL produce values equal to the originals.

**Validates: Requirements 7.1, 7.2**

### Property 14: Storage Fallback on Malformed JSON

*For any* key whose stored value is not valid JSON, `StorageManager.load(key)` SHALL return `null` and the calling module SHALL use its documented default value.

**Validates: Requirements 7.3**

### Property 15: Theme Toggle Involution

*For any* current theme T, calling `ThemeManager.toggle()` twice SHALL leave the active theme equal to T (i.e., toggle is its own inverse).

**Validates: Requirements 6.3**

---

## Error Handling

| Scenario | Module | User-Visible Response |
|---|---|---|
| `localStorage` unavailable on load | StorageManager | Toast "warning" — data won't be saved this session; all defaults used |
| `localStorage` write fails | StorageManager | Non-blocking toast warning; in-memory state kept intact |
| Malformed JSON in a key | StorageManager | Silent fallback to default; no error shown to user |
| Task add / edit validation failure | TaskListModule → Renderer | Inline red validation message below input; no toast |
| Timer duration out of range | TimerModule → Renderer | Inline red validation message below duration input |
| Quick-link validation failure | QuickLinksModule → Renderer | Inline per-field validation messages |
| Quick-links at maximum (20) | QuickLinksModule → Renderer | Inline info message replacing the add-form button |
| Audio cue play() fails (autoplay policy) | TimerModule | Silent catch; timer still marks completion visually |
| Panel render exceeds 3 s (slow device) | Renderer | Loading skeleton in the panel until paint completes |

**Toast dismissal**: Toasts auto-dismiss after 5 seconds; users can also click an ✕ button to dismiss early.

**No unhandled Promise rejections**: every async path (e.g., `Audio.play()`) is wrapped in try/catch or `.catch()`.

---

## Testing Strategy

### Unit Tests (example-based)

Focused on specific behaviors and edge cases. Each module is tested in isolation with a fake/stubbed `StorageManager`.

| Module | Key test scenarios |
|---|---|
| GreetingModule | Hour boundaries: 4→Night, 5→Morning, 11→Morning, 12→Afternoon, 17→Afternoon, 18→Evening, 21→Evening, 22→Night |
| TaskListModule | Add valid task; add empty task; add whitespace task; toggle once; toggle twice; edit valid; edit empty; delete |
| QuickLinksModule | Add valid; add empty label; add bad URL; add 20 then 21st; delete; delete non-existent |
| TimerModule | setDuration valid; setDuration(0); setDuration(121); tick decrements; tick at 0 fires onComplete |
| StorageManager | save then load; load missing key; load malformed JSON; save when localStorage throws |
| ThemeManager | toggle light→dark; toggle dark→light; toggle twice = identity |

### Property-Based Tests

Using **fast-check** (JavaScript) or equivalent. Each property test runs a minimum of **100 iterations** with randomly generated inputs.

Each test is tagged with: `// Feature: todo-life-dashboard, Property N: <property_text>`

| Property | Generator inputs | Assertion |
|---|---|---|
| P1: Greeting prefix coverage | `fc.integer({ min: 0, max: 23 })` | result ∈ {"Morning","Afternoon","Evening","Night"} |
| P2: Whitespace name reverts | `fc.stringOf(fc.constantFrom(' ','\t','\n'))` | greeting shows "Friend"; no storage key |
| P3: Whitespace task rejected | `fc.stringOf(fc.constantFrom(' ','\t','\n'))` | `ok === false`; list unchanged |
| P4: Task add round-trip | `fc.string({ minLength:1, maxLength:200 })` (filtered non-whitespace-only) | stored then loaded text matches |
| P5: Toggle idempotence | `fc.boolean()` (initial state) + task record | double toggle restores original |
| P6: Edit preserves other tasks | `fc.array(taskArb)` + valid edit on one | N tasks remain; others unchanged |
| P7: Invalid edit preserves text | whitespace strings | `ok === false`; text unchanged |
| P8: Valid link add round-trip | label arb (1–50) + valid URL arb | `ok === true`; link in array with same values |
| P9: Invalid link rejected | union of invalid label + invalid URL arbs | `ok === false`; length unchanged |
| P10: Capacity cap at 20 | 21 valid link arbs | 21st add returns `ok === false`; length stays 20 |
| P11: Timer duration round-trip | `fc.integer({ min: 1, max: 120 })` | after load, duration and remaining match |
| P12: Timer rejects out-of-range | `fc.oneof(fc.integer({max:0}), fc.integer({min:121}))` | duration unchanged |
| P13: AppState serialization round-trip | arbitrary AppState | loaded values equal originals |
| P14: Malformed JSON fallback | `fc.string()` (random non-JSON) | `load()` returns null |
| P15: Theme toggle involution | `fc.constantFrom('light','dark')` | two toggles return to start |

### Integration Tests

Verify DOM rendering, `visibilitychange` re-sync, and end-to-end flows using a headless browser (Playwright or jsdom):

1. Full load cycle: populate `localStorage` → load page → assert all panels render with stored data.
2. Clock re-sync: mock `Date.now()`, background the tab, re-focus, assert displayed time updated.
3. Theme switch within 300 ms: click toggle, assert `data-theme` attribute changes, measure transition.
4. Audio cue: mock `HTMLAudioElement.play`, run timer to 0, assert `play()` was called.
5. `localStorage` unavailable: delete `localStorage`, reload page, assert defaults shown and toast visible.
