# Phase 01: Gateway UI Rebuild -- Complete Knowledge Extraction

**Source Documents:**
- `05_RUNBOOKS/PHASE_01_GATEWAY_UI.md` (runbook -- technical spec)
- `06_PLAYBOOKS/PHASE_01_PLAYBOOK.md` (playbook -- visual guide)

**Date:** 2026-03-10
**Author:** Echo Pro (MacBook, Opus 4.6)
**Status:** READY FOR EXECUTION
**Estimated Duration:** 5-7 working sessions (Phase 1A through 1E)

---

## 1. OBJECTIVE

Rebuild the Phoenix Echo Gateway dashboard from a sidebar-driven single-panel layout into a three-panel command center:

- **Left Panel (Chat):** Persistent AI chat with multi-agent rolodex. Starts collapsed at 48px, expands to 360px.
- **Center Panel (Workspace):** Tab-bar routed content area. Replaces the current sidebar + main layout.
- **Right Panel (Tools):** Hidden by default. Slides in for contextual tools, config, and status.

All 14 existing page modules survive and adapt. No functionality is lost. The system transforms from "admin panel" to "command center."

---

## 2. SHANE'S DIRECTIVES (NON-NEGOTIABLE)

- **Colors:** RED (#cc0000 / #ff1a1a), BLACK (#0a0a0a), GOLD (#d4a017)
- **Shadow elevation, NOT backdrop-filter blur** -- zero occurrences of `backdrop-filter` allowed
- **CSS concatenated into one file** (`phoenix-echo.css`), no `@import` chain
- **WebSocket in standalone** `ws-manager.js` with exponential backoff
- **cleanup() lifecycle** on all 14 page modules
- **Scope:** 35% of menus now, expand as refined
- **Metaphor:** "100,000 sq ft house, 4,000 sq ft of furniture"
- **NEVER USED colors:** Pink, purple, cyan, teal, or any color not explicitly listed. No blue-cyan radial gradients from old dashboard.html. No backdrop-filter blur effects.

---

## 3. ARCHITECTURE SPECS

### 3.1 Three-Panel CSS Grid Layout

```css
.px-shell {
    display: grid;
    grid-template-columns:
        var(--px-chat-width, var(--px-chat-collapsed))  /* Left: Chat */
        1fr                                               /* Center: Workspace */
        var(--px-tools-width-actual, 0px);               /* Right: Tools */
    grid-template-rows: 1fr;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: var(--px-black);
}
```

### 3.2 Panel States (Data Attributes on .px-shell)

```
data-chat="collapsed" -> --px-chat-width: 48px
data-chat="expanded"  -> --px-chat-width: 360px
data-tools="open"     -> --px-tools-width-actual: 320px
data-tools="closed"   -> --px-tools-width-actual: 0px
```

### 3.3 Panel Dimensions

| Panel | Collapsed | Expanded | Min (drag) | Max (drag) |
|-------|-----------|----------|------------|------------|
| Chat | 48px | 360px (desktop), 280px (tablet), full screen (phone) | 200px | 600px |
| Tools | 0px (hidden) | 320px (desktop), 480px (big screen) | 200px | 500px |
| Workspace | -- | fills remaining | 400px (always guaranteed) | -- |

### 3.4 Z-Index Layers

| Element | z-index |
|---------|---------|
| Workspace | 1 |
| Chat panel | 10 |
| Tools panel | 20 |
| Resize handle | 30 |
| Rolodex dropdown | 50 |
| Tab dropdown menu | 100 |
| Phone overlays (chat/tools) | 200 |

### 3.5 Tab Bar

- **Height:** 44px
- **Primary tabs:** 5 (always visible)
- **Dropdown items:** 9 (under "More" button)
- **Total navigable pages:** 14 (same as current sidebar)

**Primary Tabs:**

| Position | Tab | Icon | Route |
|----------|-----|------|-------|
| 1 | Overview | overview | #/overview |
| 2 | Chat | chat | Toggles left panel (does NOT navigate) |
| 3 | Agents | robot | #/agents |
| 4 | Logs | logs | #/logs |
| 5 | Sessions | sessions | #/sessions |

**"More" Dropdown Items:**

| Item | Icon | Route |
|------|------|-------|
| Channels | channels | #/channels |
| Cron Jobs | clock | #/cron |
| Skills | skills | #/skills |
| Nodes | nodes | #/nodes |
| Config | config | #/config |
| Instances | instances | #/instances |
| Usage | usage | #/usage |
| Debug | debug | #/debug |
| Docs | docs | #/docs |

**Right Side of Tab Bar:**
- Health badge (status dot + text)
- Tools panel toggle button [T]

---

## 4. TECHNOLOGY STACK

### 4.1 Languages & Frameworks

- **Frontend:** Vanilla JavaScript (ES Modules), HTML5, CSS3
- **Backend:** Node.js v22+ (no changes in Phase 1)
- **CSS Architecture:** CSS Custom Properties (variables), CSS Grid, no preprocessors
- **Module System:** ES Modules (`import`/`export`), no bundler
- **Icons:** Inline SVG (Lucide style, 24x24, stroke, 2px weight)
- **Fonts:** System font stack only -- no external web fonts

### 4.2 Font Stacks

```css
--px-font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
--px-font-mono: 'SF Mono', 'Fira Code', Monaco, Consolas, 'Courier New', monospace;
```

### 4.3 No External Dependencies

- No CDN dependencies
- No web fonts loaded externally
- No images loaded on initial page (SVG is inline, logo is CSS background)
- Icon SVGs are inline strings (zero network requests)

---

## 5. FILE MAP

### 5.1 New Files Created (12 total)

```
public-vps/
  css/
    design-system.css      (Phase 1A, Step 1)  ~250 lines
    layout.css             (Phase 1B, Step 5)  ~180 lines
    panels.css             (Phase 1B, Step 6)  ~150 lines
    chat.css               (Phase 1C, Step 11) ~200 lines
    components.css         (Phase 1D, Step 14) ~300 lines
  core/
    icon-manager.js        (Phase 1A, Step 2)  ~350 lines
    ws-manager.js          (Phase 1A, Step 3)  ~200 lines
    panel-manager.js       (Phase 1B, Step 7)  ~300 lines
    chat-manager.js        (Phase 1C, Step 12) ~350 lines
  assets/
    phoenix-logo.svg       (Phase 1D, Step 17) ~50 lines
```

### 5.2 Modified Files (16 total)

```
public-vps/
  index.html             (Phase 1B, Step 8)  -- Full rewrite
  app.js                 (Phase 1B, Step 9)  -- Rewrite routing + lifecycle
  phoenix-echo.css       (Phase 1B, Step 10) -- Concatenated from css/*.css
  pages/
    agents.js            (Phase 1D, Step 15) -- Tokens + icons + cleanup()
    channels.js          (Phase 1D, Step 15)
    chat.js              (Phase 1C, Step 13) -- Major: becomes left panel or archived
    config.js            (Phase 1D, Step 15)
    cron.js              (Phase 1D, Step 15)
    debug.js             (Phase 1D, Step 15)
    docs.js              (Phase 1D, Step 15)
    instances.js         (Phase 1D, Step 15)
    logs.js              (Phase 1D, Step 15)
    nodes.js             (Phase 1D, Step 15)
    overview.js          (Phase 1D, Step 15)
    sessions.js          (Phase 1D, Step 15)
    skills.js            (Phase 1D, Step 15)
    usage.js             (Phase 1D, Step 15)
```

### 5.3 Dependency Graph (Build Order)

```
design-system.css --> layout.css --> panels.css --> chat.css
                                                       |
icon-manager.js ----------------------------------> components.css
                                                       |
ws-manager.js --> chat-manager.js                      |
                       |                               |
panel-manager.js ------+--> index.html --> app.js --> phoenix-echo.css
                                              |
                                    14 page modules (parallel)
```

### 5.4 CSS Concatenation Order

```
phoenix-echo.css = cat(
  css/design-system.css,   /* 1. Tokens, variables, animations */
  css/layout.css,          /* 2. Three-panel grid */
  css/panels.css,          /* 3. Shadow elevation, resize handles */
  css/chat.css,            /* 4. Messages, input, rolodex */
  css/components.css       /* 5. Cards, buttons, badges, tables, forms */
)
```

**Build script:**

```bash
#!/bin/bash
# scripts/build-css.sh
cat \
  public-vps/css/design-system.css \
  public-vps/css/layout.css \
  public-vps/css/panels.css \
  public-vps/css/chat.css \
  public-vps/css/components.css \
  > public-vps/phoenix-echo.css
echo "Built phoenix-echo.css ($(wc -l < public-vps/phoenix-echo.css) lines)"
```

---

## 6. COMPLETE CSS DESIGN SYSTEM

### 6.1 Color Palette (--px-* Custom Properties)

```css
/* === PALETTE === */
--px-black:         #0a0a0a;
--px-black-soft:    #111111;
--px-black-card:    #161616;
--px-black-hover:   #1a1a1a;
--px-red:           #cc0000;
--px-red-bright:    #ff1a1a;
--px-red-glow:      rgba(255, 26, 26, 0.3);
--px-gold:          #d4a017;
--px-gold-bright:   #e8b020;
--px-gold-glow:     rgba(212, 160, 23, 0.3);
--px-text:          #e0e0e0;
--px-text-dim:      #999999;
--px-text-muted:    #606060;
--px-border:        #222222;
--px-border-hover:  #333333;
```

### 6.2 Status Colors

```css
--px-ok:    #00cc66;   /* green */
--px-warn:  #ffaa00;   /* amber */
--px-err:   #ff1a1a;   /* red -- same as accent */
--px-info:  #0099ff;   /* blue */
```

### 6.3 Layout Variables

```css
--px-chat-collapsed:  48px;
--px-chat-expanded:   360px;
--px-chat-max:        480px;
--px-tools-width:     320px;
--px-tab-height:      44px;
```

### 6.4 Border Radius Scale

```css
--px-radius-xs:     4px;
--px-radius-sm:     6px;
--px-radius:        10px;
--px-radius-lg:     14px;
--px-radius-xl:     20px;
```

### 6.5 Shadow System (NO BLUR FILTERS)

```css
--px-shadow-sm:     0 2px 4px rgba(0, 0, 0, 0.3);
--px-shadow-md:     0 4px 12px rgba(0, 0, 0, 0.4);
--px-shadow-lg:     0 8px 24px rgba(0, 0, 0, 0.5);
--px-shadow-xl:     0 16px 48px rgba(0, 0, 0, 0.6);
--px-shadow-panel:  4px 0 16px rgba(0, 0, 0, 0.4);
--px-shadow-inset:  inset 0 1px 0 rgba(255, 255, 255, 0.05);
```

### 6.6 Transitions

```css
--px-transition-fast:    0.15s ease;
--px-transition:         0.25s ease;
--px-transition-slow:    0.4s ease;
--px-transition-panel:   0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

### 6.7 Keyframe Animations

```css
@keyframes px-pulse       { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
@keyframes px-spin        { to { transform: rotate(360deg) } }
@keyframes px-breathe     { 0%,100% { box-shadow: 0 0 8px var(--px-red-glow) }
                            50% { box-shadow: 0 0 20px var(--px-red-glow) } }
@keyframes px-fade-in     { from { opacity:0 } to { opacity:1 } }
@keyframes px-slide-left  { from { transform: translateX(-100%) }
                            to { transform: translateX(0) } }
@keyframes px-slide-right { from { transform: translateX(100%) }
                            to { transform: translateX(0) } }
@keyframes px-slide-up    { from { transform: translateY(8px); opacity:0 }
                            to { transform: translateY(0); opacity:1 } }
```

---

## 7. COMPONENT CLASSES (Old -> New)

| Component | Old Class | New Class | Key Change |
|-----------|-----------|-----------|------------|
| Cards | `.card` | `.px-card` | Shadow elevation, no blur |
| Buttons | `.btn` | `.px-btn` | Gold accent on hover |
| Badges | `.badge` | `.px-badge` | Use `--px-ok/warn/err/info` |
| Tables | `.table` | `.px-table` | Monospace code cells use `--px-gold` |
| Forms | `.form-input` | `.px-input` | Red focus border |
| Stats | `.stat` | `.px-stat` | No change needed |
| Alerts | `.alert` | `.px-alert` | Solid left border |
| Empty State | `.empty-state` | `.px-empty` | SVG icon instead of emoji |
| Loading | `.loading` | `.px-loading` | Red spinner |
| Grids | `.grid` | `.px-grid` | No change |
| Tab Items | N/A (new) | `.px-tab` | New component |
| Tab Dropdown | N/A (new) | `.px-tab-dropdown` | New component |

---

## 8. JAVASCRIPT API SPECIFICATIONS

### 8.1 WSManager (core/ws-manager.js)

```javascript
export class WSManager {
    constructor(url, opts = {}) {
        // opts: initialDelay, maxDelay, backoffMultiplier,
        //       heartbeatInterval, heartbeatTimeout, maxRetries
    }

    connect() { }
    disconnect() { }
    send(type, payload) { /* returns boolean */ }
    sendRaw(data) { /* returns boolean */ }
    on(type, handler) { /* returns () => void (unsubscribe) */ }
    onStatus(event, handler) { /* returns () => void */ }
    // Lifecycle events: connected, disconnected, reconnecting, error, heartbeat
    // Wildcard: ws.on('*', (type, payload) => { ... })

    get connected() { /* boolean */ }
    get retryCount() { /* number */ }
    get latency() { /* number|null, ms */ }

    destroy() { /* remove all listeners, close socket, stop timers */ }
}
```

**WebSocket Configuration:**

| Parameter | Value |
|-----------|-------|
| Initial reconnect delay | 1,000ms |
| Max reconnect delay | 30,000ms |
| Backoff multiplier | 2x |
| Backoff sequence | 1s, 2s, 4s, 8s, 16s, 30s, 30s... |
| Heartbeat interval | 25 seconds |
| Pong timeout | 10 seconds |
| Heartbeat message | `{ type: 'ping', timestamp: Date.now() }` |

**Message Type Routing:**

```
Messages from server: { type: string, ...payload }
Examples:
  { type: 'chat:message', content: '...', role: 'assistant' }
  { type: 'chat:typing', status: true }
  { type: 'agent:status', agents: [...] }
  { type: 'log:entry', level: 'info', message: '...' }
```

### 8.2 Icons (core/icon-manager.js)

```javascript
export const Icons = {
    render(name, opts = {}) { /* returns SVG markup string */ },
    has(name) { /* returns boolean */ },
    list() { /* returns string[] of all icon names */ },
};
// Usage: Icons.render('chat', { size: 20, class: 'nav-icon' })
```

**Required Icons (minimum 40):**

| Category | Icons |
|----------|-------|
| Navigation | chat, overview, sessions, channels, cron, logs, agents, skills, nodes, config, instances, usage, debug, docs |
| Actions | send, refresh, close, expand, collapse, menu, search, filter, copy, download, upload, edit, delete, add |
| Status | online, offline, warning, error, info, loading |
| System | phoenix (logo mark), terminal, database, server, key, shield, clock, chart, user, robot |

**SVG Rules:**
- All SVGs use `viewBox="0 0 24 24"` and `stroke="currentColor"`
- `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"` (Lucide style)
- No external dependencies, no fetch calls, no lazy loading
- Default size: 20px
- Colors inherit from parent via `currentColor`

**Emoji-to-Icon Mapping:**

| Current Emoji | New Icon Name | Used In |
|---------------|---------------|---------|
| fire | phoenix | header, chat avatar |
| speech_balloon | chat | nav, chat page |
| chart_increasing | chart | overview, usage nav |
| electric_plug | sessions | sessions nav |
| satellite | channels | channels nav |
| alarm_clock | clock | cron nav |
| memo | logs | logs nav |
| robot | robot | agents nav |
| high_voltage | skills | skills nav |
| mobile_phone | nodes | nodes nav |
| gear | config | config nav |
| desktop_computer | instances | instances nav |
| bug | debug | debug nav |
| books | docs | docs nav |
| bust_in_silhouette | user | chat user avatar |

### 8.3 PanelManager (core/panel-manager.js)

```javascript
export class PanelManager {
    constructor(shell) { /* shell = the .px-shell element */ }

    toggleChat() { }
    setChatExpanded(expanded) { }
    toggleTools() { }
    setToolsOpen(open) { }
    getState() { /* returns { chat: 'collapsed'|'expanded', tools: 'open'|'closed' } */ }
    startResize(panel, startEvent) { /* panel: 'chat'|'tools' */ }
    saveState() { /* persist to localStorage */ }
    restoreState() { /* restore from localStorage */ }
    handleResponsive() { /* adjust for window resize */ }
    destroy() { /* clean up all listeners */ }
}
```

**localStorage Keys:**
- `px-chat-state`: 'collapsed' or 'expanded'
- `px-tools-state`: 'open' or 'closed'
- `px-chat-width`: number (custom resize width)
- `px-tools-width`: number (custom resize width)

### 8.4 ChatManager (core/chat-manager.js)

```javascript
export class ChatManager {
    constructor(opts) {
        // opts.ws: WSManager instance
        // opts.messagesContainer: .px-chat-messages element
        // opts.inputElement: .px-chat-input element
        // opts.sendButton: .px-chat-send element
        // opts.apiCall: API helper function
    }

    init() { }
    async send(text) { }
    addMessage(msg) { /* msg: { role, content, timestamp, agent? } */ }
    switchAgent(agentId) { }
    get activeAgent() { }
    get messages() { }
    destroy() { }
}
```

**DOM Recycling (200-node cap):**

```javascript
addMessage(msg) {
    this._messages.push(msg);
    const el = this._createMessageElement(msg);
    this._container.appendChild(el);
    // DOM recycling: keep only last 200 nodes
    while (this._container.children.length > 200) {
        this._container.removeChild(this._container.firstChild);
    }
    this._scrollToBottom();
}
```

- `_createMessageElement` MUST use safe DOM construction (createElement, textContent) to prevent XSS
- Never set untrusted content via methods that parse HTML

**Default Agents for Rolodex:**

```javascript
const DEFAULT_AGENTS = [
    { id: 'echo-main', name: 'Phoenix Echo', model: 'claude-sonnet-4-5', icon: 'phoenix' },
    { id: 'echo-coder', name: 'Echo Coder', model: 'codellama', icon: 'terminal' },
    { id: 'echo-analyst', name: 'Echo Analyst', model: 'llama3.1', icon: 'chart' },
];
```

### 8.5 App.js Routing

```javascript
import { WSManager } from './core/ws-manager.js';
import { PanelManager } from './core/panel-manager.js';
import { Icons } from './core/icon-manager.js';
import { ChatManager } from './core/chat-manager.js';

const PRIMARY_TABS = [
    { id: 'overview',  label: 'Overview',  icon: 'overview' },
    { id: 'chat',      label: 'Chat',      icon: 'chat' },
    { id: 'agents',    label: 'Agents',    icon: 'robot' },
    { id: 'logs',      label: 'Logs',      icon: 'logs' },
    { id: 'sessions',  label: 'Sessions',  icon: 'sessions' },
];

const MENU_ITEMS = [
    { id: 'channels',  label: 'Channels',  icon: 'channels' },
    { id: 'cron',      label: 'Cron Jobs', icon: 'clock' },
    { id: 'skills',    label: 'Skills',    icon: 'skills' },
    { id: 'nodes',     label: 'Nodes',     icon: 'nodes' },
    { id: 'config',    label: 'Config',    icon: 'config' },
    { id: 'instances', label: 'Instances', icon: 'instances' },
    { id: 'usage',     label: 'Usage',     icon: 'usage' },
    { id: 'debug',     label: 'Debug',     icon: 'debug' },
    { id: 'docs',      label: 'Docs',      icon: 'docs' },
];
```

**Navigation Lifecycle with Cleanup:**

```javascript
async function navigate(path) {
    // CLEANUP previous page before loading new one
    if (state.currentModule && state.currentModule.cleanup) {
        try {
            state.currentModule.cleanup();
        } catch (err) {
            console.error('Page cleanup error:', err);
        }
    }
    // Load new page module
    const module = await routes[path]();
    state.currentModule = module;
    const container = document.getElementById('page-container');
    container.textContent = '';
    const wrapper = document.createElement('div');
    wrapper.insertAdjacentHTML('afterbegin', module.render());
    while (wrapper.firstChild) {
        container.appendChild(wrapper.firstChild);
    }
    if (module.init) {
        module.init({ api: apiCall, ws: state.ws, panels: state.panels });
    }
    state.currentPage = path;
}
```

**WSManager Integration in app.js:**

```javascript
state.ws = new WSManager(CONFIG.wsUrl, {
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    heartbeatInterval: 25000,
});
state.ws.onStatus('connected', () => {
    updateHealthBadge({ status: 'online', message: 'Connected' });
});
state.ws.onStatus('disconnected', () => {
    updateHealthBadge({ status: 'error', message: 'Disconnected' });
});
state.ws.connect();
```

---

## 9. PAGE MODULE CLEANUP REQUIREMENTS

### 9.1 Cleanup Pattern

```javascript
let _state = { /* module-local state */ };
let _cleanup = [];

export function render() { return '...'; }

export function init({ api, ws }) {
    const interval = setInterval(loadData, 30000);
    _cleanup.push(() => clearInterval(interval));
    const unsub = ws.on('some:event', handler);
    _cleanup.push(unsub);
}

export function cleanup() {
    _cleanup.forEach(fn => fn());
    _cleanup = [];
    _state = { /* fresh defaults */ };
}
```

### 9.2 Per-Module Cleanup Needs

| Module | What Needs Cleanup |
|--------|-------------------|
| agents.js | Stub only (static load) |
| channels.js | Stub only |
| chat.js | WebSocket message listener, typing indicator, message handler flag |
| config.js | Stub only |
| cron.js | Possible refresh interval |
| debug.js | API test form handler |
| docs.js | Stub only |
| instances.js | Possible refresh interval |
| logs.js | WebSocket log listener, autoScroll interval |
| nodes.js | Stub only |
| overview.js | Health check data stub |
| sessions.js | Filter input handler, refresh button handler |
| skills.js | Stub only |
| usage.js | Possible refresh interval |

### 9.3 Current Module Inventory

| Module | Lines | Has cleanup() | Emoji Icons | Key Feature |
|--------|-------|---------------|-------------|-------------|
| agents.js | 125 | NO | 4 | Agent cards, fallback default |
| channels.js | 167 | NO | 3 | Channel list, status |
| chat.js | 202 | NO | 4 | WebSocket chat, main feature |
| config.js | 119 | NO | 1 | Gateway config display |
| cron.js | 179 | NO | 2 | Cron job management |
| debug.js | 208 | NO | 1 | API tester, RPC |
| docs.js | 169 | NO | 2 | Documentation viewer |
| instances.js | 177 | NO | 2 | Ollama instance management |
| logs.js | 183 | NO | 2 | Live log viewer (WebSocket) |
| nodes.js | 142 | NO | 2 | Node/device management |
| overview.js | 171 | NO | 1 | Health dashboard, stats |
| sessions.js | 184 | NO | 1 | Session list, filtering |
| skills.js | 124 | NO | 1 | Skill inventory |
| usage.js | 216 | NO | 1 | Token/cost tracking |
| **TOTAL** | **2,366** | **0/14** | **~27** | |

---

## 10. INDEX.HTML STRUCTURE

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phoenix Echo</title>
    <link rel="stylesheet" href="phoenix-echo.css">
</head>
<body>
    <div id="app" class="px-shell" data-chat="collapsed" data-tools="closed">

        <!-- LEFT: Chat Panel -->
        <aside class="px-chat-panel" id="chat-panel">
            <div class="px-chat-header">
                <button class="px-chat-toggle" id="chat-toggle"
                        aria-label="Toggle chat panel"></button>
                <span class="px-chat-title">Echo</span>
                <button class="px-chat-rolodex-btn" id="rolodex-btn"
                        aria-label="Switch agent"></button>
            </div>
            <div class="px-chat-body" id="chat-body"></div>
            <div class="px-resize-handle" data-panel="chat"></div>
        </aside>

        <!-- CENTER: Workspace -->
        <main class="px-workspace" id="workspace">
            <nav class="px-tab-bar" id="tab-bar"></nav>
            <div class="px-workspace-content" id="page-container"></div>
        </main>

        <!-- RIGHT: Tools Panel -->
        <aside class="px-tools-panel" id="tools-panel">
            <div class="px-tools-header">
                <span class="px-tools-title">Tools</span>
                <button class="px-tools-close" id="tools-close"
                        aria-label="Close tools panel"></button>
            </div>
            <div class="px-tools-body" id="tools-body"></div>
            <div class="px-resize-handle" data-panel="tools"></div>
        </aside>

    </div>
    <script type="module" src="app.js"></script>
</body>
</html>
```

**What was removed:**
- `<header class="header">` -- brand/status moves to tab bar or chat header
- `<aside class="sidebar">` -- navigation moves to tab bar
- All inline nav items with emoji

---

## 11. RESPONSIVE BEHAVIOR

### 11.1 Breakpoints

| Viewport | Device | Chat Default | Tools Default | Resize Enabled |
|----------|--------|-------------|--------------|----------------|
| < 768px (phone) | iPhone | Hidden (overlay, full screen) | Hidden (overlay, 85vw, max 360px) | No |
| 768-1200px (tablet) | iPad | Collapsed (48px), expanded to 280px | Hidden | No |
| 1200-3000px (desktop) | Laptop/Desktop | Collapsed (48px), expandable to 360px | Hidden, openable to 320px | Yes |
| 3000px+ (big screen) | 85" TV | Auto-expanded (480px) | Hidden, wider when open (480px) | Yes |

### 11.2 Phone Responsive CSS

```css
@media (max-width: 768px) {
    .px-shell { grid-template-columns: 1fr; }
    .px-chat-panel {
        position: fixed; inset: 0; z-index: 200;
        transform: translateX(-100%);
        transition: transform var(--px-transition-panel);
    }
    .px-shell[data-chat="expanded"] .px-chat-panel {
        transform: translateX(0);
    }
    .px-tools-panel {
        position: fixed; right: 0; top: 0; bottom: 0;
        width: 85vw; max-width: 360px; z-index: 200;
        transform: translateX(100%);
        transition: transform var(--px-transition-panel);
    }
    .px-shell[data-tools="open"] .px-tools-panel {
        transform: translateX(0);
    }
}
```

---

## 12. CHAT PANEL VISUAL SPECS

### 12.1 Message Styles

- **Assistant messages:** Left-aligned, dark card background (#161616, #222 border), gold avatar border, rounded corners (top-left square, others rounded)
- **User messages:** Right-aligned, red background (#cc0000), bright red border (#ff1a1a), rounded corners (top-right square, others rounded)
- **System messages:** Centered, no avatar, subtle styling, used for connection status
- **Avatar size:** 28px diameter

### 12.2 Breathing Glow Effect

When WebSocket is connected, the send button pulses:
- Animation: `px-breathe` keyframe, 3 second cycle
- Glow range: `0 0 8px` to `0 0 20px`
- Color: RED glow (#ff1a1a at 30% opacity)
- When disconnected: glow stops, button dims

### 12.3 Chat Input

- Flexible height, max 100px
- Red border on focus
- Font: 14px, system sans-serif

### 12.4 Chat Specifications

| Property | Value |
|----------|-------|
| DOM cap | 200 message nodes (older recycled) |
| Message history | Unlimited (in memory, not DOM) |
| Avatar size | 28px diameter |
| Send button size | 36px x 36px |
| Chat toggle button | 32px x 32px |

---

## 13. PHOENIX WATERMARK

```css
.px-workspace-content::before {
    content: '';
    position: fixed;
    top: 50%;
    left: 55%;  /* Offset right since chat panel is on left */
    transform: translate(-50%, -50%);
    width: 60vh;
    height: 60vh;
    background: url('../assets/phoenix-logo.svg') center/contain no-repeat;
    opacity: 0.06;
    z-index: 0;
    pointer-events: none;
}
```

**SVG Requirements:**
- Single color (white or light gray)
- Clean paths, no embedded raster images
- viewBox defined properly
- No external references
- File size under 10KB

---

## 14. CONFIGURATION VALUES

### 14.1 Environment & URLs

| Item | Value |
|------|-------|
| Studio (Source of Truth) | `~/Phoenix-Echo-Gateway/public-vps/` |
| MacBook (Mirror) | `~/GitHub/Phoenix-Echo-Gateway/public-vps/` |
| VPS IP | `93.188.161.80` |
| VPS Path | `/opt/phoenix-echo-gateway/public/` |
| VPS Service | `systemctl status phoenix-echo` |
| Dashboard URL | `https://echo.phoenixelectric.life` |
| Health endpoint | `https://echo.phoenixelectric.life/health` |
| WebSocket URL | `wss://echo.phoenixelectric.life/ws?token=...` |
| Local Gateway URL | `http://localhost:18790` |
| Node.js version | v22+ |
| Node binary (Studio) | `/opt/homebrew/bin/node` |

### 14.2 SSH Access

| Target | Tailscale IP | Direct IP |
|--------|-------------|-----------|
| Studio | 100.68.34.116 | -- |
| VPS | 100.115.141.86 | 93.188.161.80 |

### 14.3 Current CSS Variables (existing, to be migrated)

```css
--bg-primary: #0a0a0a;       /* Keep -> --px-black */
--bg-secondary: #111111;     /* Keep -> --px-black-soft */
--bg-card: #161616;          /* Keep -> --px-black-card */
--accent-dark: #cc0000;      /* Keep -> --px-red */
--accent-bright: #ff1a1a;    /* Keep -> --px-red-bright */
--gold: #d4a017;             /* Keep -> --px-gold */
--text-primary: #e0e0e0;     /* Keep -> --px-text */
--text-muted: #606060;       /* Keep -> --px-text-muted */
--border: #222222;           /* Keep -> --px-border */
--sidebar-width: 240px;      /* CHANGE to panel widths */
--header-height: 60px;       /* REMOVE -- no header */
```

---

## 15. PERFORMANCE TARGETS

| Metric | Target | How to Measure |
|--------|--------|---------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| CSS file size | < 50KB | `wc -c phoenix-echo.css` |
| JS bundle (app.js + core/) | < 100KB | Sum of file sizes |
| DOM nodes on page load | < 200 | `document.querySelectorAll('*').length` |
| Memory after 200 chat msgs | < 50MB | DevTools Memory tab |
| WebSocket reconnect time | < 2s (first attempt) | Network tab |
| Total CSS lines | ~1,100 | `wc -l phoenix-echo.css` |
| CSS variables | 30+ | All `--px-*` prefixed |
| @import count | 0 | `grep -c '@import' phoenix-echo.css` |
| backdrop-filter count | 0 | `grep -c 'backdrop-filter' phoenix-echo.css` |
| Icons total | 40+ | SVG inline, no network requests |
| Emoji remaining | 0 | Zero in any JS file |

---

## 16. SECURITY CONSIDERATIONS

- **XSS Prevention:** Chat `_createMessageElement` MUST use safe DOM construction (createElement, textContent for user text). Never set untrusted content via innerHTML or equivalent.
- **Authentication:** No changes in Phase 1. Auth flow remains unchanged.
- **WebSocket tokens:** Passed via URL query parameter (`?token=...`), no changes.
- **Backend:** No backend changes. API endpoints unchanged.
- **Gateway config:** No changes to config files.

---

## 17. TESTING REQUIREMENTS

### 17.1 Functional Tests (Step 18)

| Test | Expected |
|------|----------|
| Page loads with no console errors | Zero errors |
| All 13 page modules load via tab/dropdown | Each renders correctly |
| Chat panel toggles (collapsed/expanded) | Smooth 0.3s transition |
| Tools panel toggles (hidden/visible) | Smooth 0.3s transition |
| Chat message send via REST API | User msg + assistant response |
| Chat message receive via WebSocket | Message appears in chat |
| Chat persists across page navigation | Messages survive tab switch |
| WebSocket reconnects after disconnect | Reconnects with backoff |
| Panel resize via drag handle | Width changes smoothly |
| Panel state persists after refresh | localStorage restores state |
| Tab bar dropdown opens/closes | Click and Escape both work |
| Health badge shows connection status | Green dot when connected |
| cleanup() fires on navigation | Console.log proves it |
| 200+ chat messages | DOM stays at 200 nodes |

### 17.2 Responsive Tests (Step 19)

| Width | Device | Chat | Tools | Tab Bar | Content |
|-------|--------|------|-------|---------|---------|
| 375px | iPhone SE | Overlay | Overlay | Scroll | Full width |
| 390px | iPhone 14 | Overlay | Overlay | Scroll | Full width |
| 768px | iPad Mini | Collapsed | Hidden | Full | Adjusted |
| 1024px | iPad Pro | Collapsed | Hidden | Full | Full |
| 1280px | Laptop | Collapsed | Hidden | Full | Full |
| 1920px | Desktop | Collapsed | Hidden | Full | Full |
| 2560px | 4K | Collapsed | Hidden | Full | Full |
| 3840px | 85" TV | Expanded (480px) | Hidden | Full | Full |

### 17.3 Accessibility Tests (Step 20, WCAG 2.1 AA)

| Requirement | Implementation |
|------------|----------------|
| All buttons have aria-label | Chat toggle, tools toggle, tabs |
| Color contrast 4.5:1 minimum | Text on dark backgrounds |
| Focus visible on all interactive | `:focus-visible` ring |
| Keyboard navigation | Tab through all controls |
| Escape closes dropdown/panels | keydown listener |
| Screen reader announces page changes | aria-live region |
| No information conveyed by color alone | Icons + text, not just dots |

**Focus visibility CSS:**

```css
*:focus-visible {
    outline: 2px solid var(--px-gold);
    outline-offset: 2px;
}
```

**Keyboard navigation order:**
1. Chat toggle button
2. Tab bar items (left to right)
3. "More" dropdown button
4. Health badge
5. Tools toggle
6. Page content (form fields, buttons, links)

### 17.4 Gauntlet Adversarial Tests

- Resize browser from 375px to 3840px -- no overflow or panel overlap
- Rapidly toggle chat panel 20 times -- no visual glitches or stuck states
- Drag chat panel to min (200px) and max (600px) -- content reflows or scrolls
- Open both chat AND tools on 1920px -- workspace must remain >= 400px
- Send 250 messages programmatically -- DOM cap at 200 enforced
- XSS injection: send `<script>` tags in chat -- must render as text
- Send 10,000 character message -- must wrap, scroll, not break layout
- Navigate to `#/nonexistent` -- fallback to overview, must not crash
- Open dashboard in 3 tabs -- all connect independently
- Memory: heap snapshot before/after 10 page navigations -- growth < 5MB

---

## 18. DEPLOYMENT PROCEDURES

### 18.1 Pre-Flight

```bash
# 1. Verify current Gateway is running on VPS
ssh phoenix-echo "systemctl status phoenix-echo"

# 2. Verify current dashboard loads
curl -s https://echo.phoenixelectric.life/health | jq .status

# 3. Create git tag for rollback point
cd ~/Phoenix-Echo-Gateway
git tag pre-phase1-ui-rebuild
git push origin pre-phase1-ui-rebuild

# 4. Backup current public-vps/ to timestamped archive
cp -r public-vps/ public-vps-backup-$(date +%Y%m%d)/

# 5. Verify MacBook mirror is in sync
diff -rq ~/GitHub/Phoenix-Echo-Gateway/public-vps/ ~/Phoenix-Echo-Gateway/public-vps/
```

### 18.2 Deploy Steps

```bash
# 1. Build concatenated CSS on Studio
cd ~/Phoenix-Echo-Gateway
bash scripts/build-css.sh

# 2. Verify locally on Studio
# Open http://localhost:18790 in Safari/Chrome

# 3. SCP to VPS
scp -r public-vps/ phoenix-echo:/opt/phoenix-echo-gateway/public/

# 4. Restart service on VPS
ssh phoenix-echo "sudo systemctl restart phoenix-echo"

# 5. Verify on VPS
curl -s https://echo.phoenixelectric.life/health | jq .status

# 6. Test dashboard in browser
# Open https://echo.phoenixelectric.life in Chrome
```

### 18.3 Rollback

**Full Rollback:**

```bash
# Studio:
cd ~/Phoenix-Echo-Gateway
git checkout pre-phase1-ui-rebuild -- public-vps/

# VPS:
ssh phoenix-echo "
    rm -rf /opt/phoenix-echo-gateway/public/
    cp -r /opt/phoenix-echo-gateway/public-pre-phase1/ \
        /opt/phoenix-echo-gateway/public/
    sudo systemctl restart phoenix-echo
"
```

**Partial Rollback (keep foundation, revert layout):**

```bash
cd ~/Phoenix-Echo-Gateway
git checkout pre-phase1-ui-rebuild -- \
    public-vps/index.html \
    public-vps/app.js \
    public-vps/phoenix-echo.css
# Core modules (ws-manager, icon-manager) stay -- they do not break anything
```

---

## 19. INTEGRATION POINTS WITH OTHER PHASES

- **Phase 02 (Twin Peaks):** Phase 1 Gateway UI provides the dashboard foundation. Phase 2 adds fleet status panels, model attribution badges, and routing transparency to this UI.
- **Phase 03 (Security & MCP):** MCP server deployment depends on Phase 1 complete.
- **Phase 04 (Dashboard):** HTTP API streaming and fleet monitoring UI build on Phase 1 layout.
- **Phase 05 (Benchmarking):** Not dependent on Phase 1.
- **Phase 06 (Data Pipeline):** Not dependent on Phase 1.

**What stays unchanged from pre-Phase 1:**
- Backend (src/*.js) -- no changes
- API endpoints -- no changes
- WebSocket server -- no changes (client refactored only)
- Authentication flow -- no changes
- Gateway config files -- no changes

---

## 20. PHASE EXECUTION TIMELINE

### Phase 1A: Foundation (1 session)
- `css/design-system.css` -- 30+ `--px-*` variables
- `core/icon-manager.js` -- 40+ SVGs
- `core/ws-manager.js` -- Exponential backoff + heartbeat
- All 14 modules get `cleanup()` exports
- **Visual change: NONE** -- dashboard looks identical

### Phase 1B: Layout & Routing (1-2 sessions)
- `css/layout.css` -- Three-panel grid
- `css/panels.css` -- Shadow elevation
- `core/panel-manager.js` -- Toggle, resize, responsive
- `index.html` -- Full rewrite
- `app.js` -- Tab bar routing
- `phoenix-echo.css` -- Concatenated
- **Visual change: MASSIVE** -- sidebar and header gone, three-panel layout

### Phase 1C: Chat (1 session)
- `css/chat.css` -- Messages, input, rolodex
- `core/chat-manager.js` -- Persistent chat engine
- `pages/chat.js` -- Archived or repurposed
- **Visual change:** Chat panel is alive, breathing glow, rolodex

### Phase 1D: Visual Polish (1-2 sessions)
- `css/components.css` -- All components restyled
- 14 page modules updated with `px-*` classes, SVG icons
- Tab bar finalized (5 primary + dropdown)
- `assets/phoenix-logo.svg` -- Watermark
- **Visual change:** Professional, no emoji, clean icons, watermark

### Phase 1E: Harden (1 session)
- 14 functional tests
- 8 responsive breakpoints tested
- Accessibility (keyboard, focus, ARIA)
- Performance audit (FCP, CSS size, memory)
- Deploy to VPS (SCP + restart)
- Gauntlet handoff documentation
- **Visual change: NONE** -- everything just works better

---

## 21. SHANE'S REVIEW GATES

| Phase | Shane Action |
|-------|-------------|
| 1A | Review tokens/icons if desired. Say GO for 1B. |
| 1B | LOOK AT THE LAYOUT. Does three-panel feel right? Is 48px too narrow/wide? Right 5 tabs? "More" feel natural? Say GO or request adjustments. |
| 1C | TEST THE CHAT. Do messages persist across tabs? Rolodex work? Breathing glow look good? 360px comfortable? Say GO or adjust. |
| 1D | REVIEW THE LOOK. SVG icons recognizable? RED/BLACK/GOLD palette right? Watermark too visible/faint? Cards clean without blur? Say GO or adjust. |
| 1E | DEPLOY AND TEST. Open on phone, open on VPS URL, try to break it (Gauntlet mindset). SHIP or request fixes. |
