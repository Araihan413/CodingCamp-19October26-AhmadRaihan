# Implementation Plan: To-Do List Life Dashboard

## Overview

Implement a single-page, client-side web application with a Glassmorphism aesthetic. The app delivers a live clock, personalized greeting, Pomodoro focus timer, persistent task list, and quick-links panel — all stored in `localStorage`. Built with plain HTML, CSS, and Vanilla JavaScript; no frameworks, no build tools, no backend.

## Tasks

- [x] 1. Project scaffolding — folder structure, HTML shell, and base CSS tokens
  - [x] 1.1 Create the project directory structure and HTML shell
    - Create `index.html` with the semantic markup shell: `<html>`, `<head>`, `<body>`, and all panel placeholders (`.panel-clock`, `.panel-timer`, `.panel-tasks`, `.panel-links`, `.panel-theme`)
    - Add `<template>` tags for task items, quick-link buttons, and toast notifications
    - Add `<audio>` element for the Pomodoro completion cue
    - Link `css/style.css` and `js/app.js` in the correct order; no inline scripts or styles
    - _Requirements: 8.5_

  - [x] 1.2 Create `css/style.css` with all design tokens and CSS custom properties
    - Declare all `:root` CSS custom properties: color palette (`--glass-bg`, `--text-primary`, `--accent`, etc.), typography scale, spacing scale, border radius, shadow/glow tokens, animation/transition tokens
    - Add `[data-theme="dark"]` overrides for all color tokens
    - Apply `body { background: var(--bg-gradient); min-height: 100vh; }` and the `::before` pseudo-element for smooth theme cross-fade
    - Apply `.glass-panel` base styles (backdrop-filter, border, box-shadow, transition)
    - _Requirements: 6.5, 6.6, 6.7, 8.5_

  - [x] 1.3 Create `js/app.js` with module skeleton and `init()` entry point
    - Define empty IIFE/object literals for all eight modules: `StorageManager`, `Renderer`, `ClockModule`, `TimerModule`, `TaskListModule`, `QuickLinksModule`, `GreetingModule`, `ThemeManager`
    - Wire the `DOMContentLoaded` event to an `init()` function that bootstraps modules in dependency order
    - _Requirements: 8.5_

- [x] 2. StorageManager module
  - [x] 2.1 Implement `StorageManager` with `KEYS`, `isAvailable()`, `load()`, and `save()`
    - Define `KEYS` object: `TASKS: 'tld_tasks'`, `LINKS: 'tld_links'`, `NAME: 'tld_name'`, `DURATION: 'tld_duration'`, `THEME: 'tld_theme'`
    - Implement `isAvailable()`: attempt a test write/read/delete inside a try/catch; return boolean
    - Implement `load(key)`: call `JSON.parse(localStorage.getItem(key))`; return `null` on any error (missing key, `SyntaxError`, security error)
    - Implement `save(key, value)`: call `localStorage.setItem(key, JSON.stringify(value))` inside try/catch; return `{ ok: true }` on success or `{ ok: false, error }` on failure
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3. ThemeManager module
  - [x] 3.1 Implement `ThemeManager` with `load()`, `apply()`, and `toggle()`
    - Implement `load()`: call `StorageManager.load(KEYS.THEME)`; fall back to `'light'` if result is null; call `apply()`
    - Implement `apply(theme)`: set `document.documentElement.setAttribute('data-theme', theme)`; update `ThemeManager.current`; call `Renderer.renderTheme(theme)` to update the toggle control's `aria-pressed` attribute
    - Implement `toggle()`: flip `current` between `'light'` and `'dark'`; call `apply()`; call `StorageManager.save(KEYS.THEME, current)`; handle save failure with `Renderer.showToast()`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.7, 6.8_

- [x] 4. ClockModule + `Renderer.renderClock`
  - [x] 4.1 Implement `Renderer.renderClock(date)` to update the DOM clock and date displays
    - Format time as HH:MM:SS (24-hour, zero-padded) using the local timezone
    - Format date as "Weekday, DD Month YYYY" (e.g., "Monday, 19 October 2026") using `Intl.DateTimeFormat` or equivalent
    - Update `.clock-time` and `.clock-date` elements; only write to DOM if values changed to avoid unnecessary repaints
    - _Requirements: 1.1, 1.3_

  - [x] 4.2 Implement `ClockModule` with `start()`, `stop()`, and `tick()`
    - Implement `tick()`: create `new Date()` and call `Renderer.renderClock(now)`
    - Implement `start()`: call `tick()` immediately, then set a `setInterval` of 1000 ms
    - Implement `stop()`: clear the interval
    - Handle `visibilitychange` event: on `document.visibilityState === 'visible'`, immediately call `tick()` to re-synchronize
    - _Requirements: 1.2, 1.4, 1.5_

- [x] 5. GreetingModule + name input + `Renderer.renderGreeting`
  - [x] 5.1 Implement `GreetingModule.getPrefix(hour)` and `load()`/`setName()`
    - Implement `getPrefix(hour)`: pure function; `[5,12)→'Morning'`, `[12,18)→'Afternoon'`, `[18,22)→'Evening'`, `[22,5)→'Night'`
    - Implement `load()`: read `StorageManager.load(KEYS.NAME)`; call `Renderer.renderGreeting(name, hour)`
    - Implement `setName(name)`: if trimmed value is empty, remove storage key and render with "Friend"; otherwise save to storage and render with the new name; enforce max 50 characters at the input level
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 5.2 Implement `Renderer.renderGreeting(name, hour)` and wire name input events
    - Update `.greeting-line` text to `"Good ${prefix}, ${name || 'Friend'}"`
    - Attach `keydown` (Enter) and click events to the name confirm button; call `GreetingModule.setName()`
    - Set `maxlength="50"` on the name `<input>` element in HTML
    - _Requirements: 2.1, 2.2, 2.7, 2.8, 2.9, 2.10_

- [x] 6. TimerModule + SVG progress ring + controls + `Renderer.renderTimer`
  - [x] 6.1 Add SVG progress ring markup and implement `Renderer.renderTimer(remaining, running)`
    - Add `<svg>` with a background circle and a progress `<circle>` whose `stroke-dasharray` and `stroke-dashoffset` are driven by `remaining / (duration * 60)`
    - Update `.timer-display` with MM:SS formatted remaining time (zero-padded)
    - Toggle Start/Stop button visibility/label based on `running` state
    - _Requirements: 3.1, 3.4, 3.5_

  - [x] 6.2 Implement `TimerModule` with `load()`, `start()`, `pause()`, `reset()`, `setDuration()`, `tick()`, and `onComplete()`
    - Implement `load()`: read `StorageManager.load(KEYS.DURATION)`; fall back to 25; set `state.duration` and `state.remaining = duration * 60`
    - Implement `start()`: guard against double-start (`if running, return`); set `running = true`; create 1-second `setInterval` calling `tick()`
    - Implement `pause()`: clear interval; set `running = false`; call `Renderer.renderTimer`
    - Implement `reset()`: clear interval; set `running = false`; set `remaining = duration * 60`; call `Renderer.renderTimer`
    - Implement `tick()`: decrement `remaining`; call `Renderer.renderTimer`; if `remaining === 0` call `onComplete()`
    - Implement `onComplete()`: clear interval; set `running = false`; call `audioEl.play()` inside try/catch (silent on autoplay failure); call `Renderer.renderTimer`
    - Implement `setDuration(minutes)`: validate integer in [1, 120]; on invalid input show validation message via `Renderer.showValidation()` and return; on valid: save to storage, reset timer to new duration
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

  - [x] 6.3 Wire timer control buttons (Start, Stop, Reset) and duration input events
    - Attach click handlers to Start/Stop/Reset buttons calling `TimerModule.start()`, `TimerModule.pause()`, `TimerModule.reset()`
    - Attach `change`/`keydown` (Enter) event on duration input calling `TimerModule.setDuration()`
    - _Requirements: 3.4, 3.5, 3.6, 3.8, 3.9_

- [ ] 7. Checkpoint — clock, greeting, and timer
  - Ensure `ClockModule`, `GreetingModule`, and `TimerModule` all render correctly in the browser. Verify `localStorage` read/write works for name and duration. Ask the user if questions arise.

- [x] 8. TaskListModule + full CRUD UI + `Renderer.renderTaskList`
  - [x] 8.1 Implement `TaskListModule` with `load()`, `add()`, `toggle()`, `edit()`, `remove()`, and `persist()`
    - Implement `load()`: read `StorageManager.load(KEYS.TASKS)`; fall back to `[]`; store in `tasks`
    - Implement `add(text)`: trim text; if empty/whitespace-only return `{ ok: false, message: '...' }`; if text.length > 200 return `{ ok: false }`; push new `Task` (`id`, `text`, `completed: false`, `createdAt`); call `persist()`; return `{ ok: true }`
    - Implement `toggle(id)`: find task by id; flip `completed`; call `persist()`
    - Implement `edit(id, newText)`: trim; if empty/whitespace-only return `{ ok: false }`; update task text; call `persist()`; return `{ ok: true }`
    - Implement `remove(id)`: filter out task; call `persist()`
    - Implement `persist()`: call `StorageManager.save(KEYS.TASKS, tasks)`; on `ok === false` call `Renderer.showToast()`
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7, 4.9, 4.10, 4.11, 4.12_

  - [x] 8.7 Implement `Renderer.renderTaskList(tasks)` and wire all task UI events
    - Clone task `<template>` for each task; set text, completion state (strikethrough + opacity), `aria-checked` on checkbox button
    - Attach click handlers: checkbox button → `TaskListModule.toggle()`; edit button → enter inline edit mode; delete button → `TaskListModule.remove()`
    - Implement inline edit mode: show editable `<input>` with confirm/cancel buttons; on confirm call `TaskListModule.edit()`; on cancel restore original text
    - Attach task-add form submit handler: call `TaskListModule.add()`; on `ok: false` call `Renderer.showValidation()`; on `ok: true` re-render list
    - Update task count badge (e.g., "3 / 5 done")
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

- [x] 9. QuickLinksModule + add/delete UI + `Renderer.renderQuickLinks`
  - [x] 9.1 Implement `QuickLinksModule` with `load()`, `add()`, `remove()`, and `persist()`
    - Implement `load()`: read `StorageManager.load(KEYS.LINKS)`; fall back to `[]`
    - Implement `add(label, url)`: validate label (non-empty, ≤ 50 chars), url (starts with `http://` or `https://`, ≤ 2048 chars), and `links.length < 20`; on failure return `{ ok: false, message }`; push new `QuickLink`; call `persist()`; return `{ ok: true }`
    - Implement `remove(id)`: filter out link; call `persist()`
    - Implement `persist()`: call `StorageManager.save(KEYS.LINKS, links)`; on failure call `Renderer.showToast()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 5.8, 5.9, 5.10_

  - [x] 9.5 Implement `Renderer.renderQuickLinks(links)` and wire add/delete events
    - Clone quick-link `<template>` for each link; set label text and `href`; open in new tab (`target="_blank" rel="noopener noreferrer"`)
    - Attach delete icon click handler → `QuickLinksModule.remove()`; re-render
    - Attach add-link form submit handler: call `QuickLinksModule.add(label, url)`; on failure show per-field `Renderer.showValidation()` messages; if count reaches 20 show `.links-limit-msg` and hide the add form submit button
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 10. Validation messages and Toast notifications in `Renderer`
  - [x] 10.1 Implement `Renderer.showValidation(fieldId, message)` and `Renderer.clearValidation(fieldId)`
    - Insert or update a `.validation-msg` element adjacent to the field identified by `fieldId`; apply `slideInDown` CSS animation
    - `clearValidation()`: remove or hide the message element
    - _Requirements: 4.2, 3.11, 5.3, 5.4_

  - [x] 10.2 Implement `Renderer.showToast(message, level)` with auto-dismiss
    - Append a `.toast` element to `.toast-container` with left-border color keyed to level (`'info'`, `'warning'`, `'error'`)
    - Auto-dismiss after 5 seconds using `setTimeout`; attach ✕ close button for early dismissal
    - _Requirements: 7.4, 6.8, 4.12, 5.10_

- [x] 11. Responsive layout and theme CSS
  - [x] 11.1 Implement `.dashboard-grid` responsive CSS with media query breakpoint
    - Apply `grid-template-columns: repeat(3, 1fr)` and named `grid-template-areas` for ≥ 768 px
    - Apply `grid-template-columns: 1fr` and single-column `grid-template-areas` for < 768 px
    - Set `max-width: 1280px; margin: 0 auto; padding: var(--space-6); gap: var(--space-6)`
    - _Requirements: 8.2, 8.3, 8.4_

  - [x] 11.2 Complete all component-level CSS for all panels
    - Style `.panel-clock`, `.panel-timer`, `.panel-tasks`, `.panel-links`, `.panel-theme` per the component-level design specifications
    - Style `.theme-toggle` pill switch with `::after` knob and spring transition; `aria-pressed="true"` shifts knob with `translateX(24px)`
    - Style `.task-item`, `.task-item.completed`, `.task-item.editing`, `.task-action-btn` (reveal on hover)
    - Style `.quick-link-btn` pill with hover lift effect; `.add-link-form` three-column grid
    - Style `.toast-container` fixed top-right and `.toast` with `slideInRight`/`fadeOut` animations
    - _Requirements: 6.5, 6.6, 6.7, 4.4_

- [x] 12. localStorage error handling and `StorageManager.isAvailable()` fallback
  - [x] 12.1 Wire `isAvailable()` check at `init()` startup and propagate error toasts
    - In `init()`, call `StorageManager.isAvailable()`; if false, call `Renderer.showToast('Data cannot be saved in this session', 'warning')` and continue with all defaults
    - Ensure every module's `persist()` and `save()` path passes `{ ok: false }` results to `Renderer.showToast()`
    - Verify `StorageManager.load()` returns `null` on malformed JSON so every module's fallback-to-default path is exercised
    - _Requirements: 7.3, 7.4, 5.10, 6.8_

- [ ] 13. Checkpoint — full module integration
  - Run all modules end-to-end in the browser. Verify all `localStorage` round-trips (tasks, links, name, duration, theme). Verify theme toggle switches within 300 ms. Ensure all tests pass, ask the user if questions arise.

- [x] 14. Final integration — wire `init()` and complete cross-browser pass
  - [x] 14.1 Complete `init()` bootstrap sequence in `app.js`
    - Bootstrap modules in this exact order: `StorageManager.isAvailable()` check → `ThemeManager.load()` → `ClockModule.start()` → `GreetingModule.load()` → `TimerModule.load()` → `TaskListModule.load()` → `QuickLinksModule.load()` → wire all remaining event listeners (theme toggle click, timer controls, task form, links form, name input)
    - Ensure `Renderer` methods are called by each module during load so all panels display stored data before any user interaction
    - _Requirements: 7.2, 8.5_

  - [x] 14.2 Add loading skeleton fallback for panels that exceed 3-second render threshold
    - Insert a CSS-animated skeleton placeholder inside each panel container
    - Remove the skeleton once the panel's content is rendered by the `Renderer`
    - _Requirements: 8.6, 8.7_

- [ ] 15. Final checkpoint — all tests pass and browser compatibility verified
  - Run all unit, property, and integration tests. Manually verify layout in Chrome, Firefox, Edge, and Safari (latest stable). Confirm single-column layout below 768 px and multi-column above. Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional — they add correctness confidence but can be skipped for a faster MVP
- All 15 correctness properties from `design.md` are covered by property-test sub-tasks (2.2, 2.3, 3.2, 5.3, 5.4, 6.4, 6.5, 8.2–8.6, 9.2–9.4, 14.3)
- No module touches `localStorage` directly — all reads/writes go through `StorageManager`
- No module touches the DOM directly — all DOM mutations go through `Renderer`
- The `init()` bootstrap order in task 14.1 is intentional: `ThemeManager` runs before content modules to prevent a flash of unstyled theme
- Property tests use **fast-check** as the PBT library; each test must run a minimum of 100 iterations
- Each property test file must include the comment `// Feature: todo-life-dashboard, Property N: <property_text>`
- Unit tests for individual modules use a stubbed/fake `StorageManager` to avoid real `localStorage` dependency

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4", "6.1"] },
    { "id": 6, "tasks": ["6.2"] },
    { "id": 7, "tasks": ["6.3", "6.4", "6.5"] },
    { "id": 8, "tasks": ["8.1"] },
    { "id": 9, "tasks": ["8.2", "8.3", "8.4", "8.5", "8.6", "8.7"] },
    { "id": 10, "tasks": ["9.1"] },
    { "id": 11, "tasks": ["9.2", "9.3", "9.4", "9.5"] },
    { "id": 12, "tasks": ["10.1", "10.2", "11.1", "11.2"] },
    { "id": 13, "tasks": ["12.1"] },
    { "id": 14, "tasks": ["14.1", "14.2"] },
    { "id": 15, "tasks": ["14.3"] }
  ]
}
```
