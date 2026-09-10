import { Request, Response } from 'express';

import { logEmitter, LogEntry, logRingBuffer } from '@celebs/shared-utils';

import { config } from '@/config/app.config';

function isAuthorized(req: Request): boolean {
  if (config.NODE_ENV === 'development') {
    return true;
  }
  const secret = (req.query.secret as string) || (req.headers['x-dev-secret'] as string);
  return Boolean(secret && secret === config.SETUP_SECRET);
}

export const devLogsController = {
  getLogsDashboard(req: Request, res: Response): void {
    if (!isAuthorized(req)) {
      res.status(401).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Celebs Dev Logs — Authorization Required</title>
  <style>
    body { background: #0f172a; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #1e293b; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 100%; max-width: 400px; text-align: center; border: 1px solid #334155; }
    h2 { margin-top: 0; color: #38bdf8; font-size: 1.25rem; }
    p { color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem; }
    input { width: 100%; padding: 0.75rem; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #fff; font-size: 0.875rem; box-sizing: border-box; margin-bottom: 1rem; }
    button { width: 100%; padding: 0.75rem; border-radius: 6px; border: none; background: #38bdf8; color: #0f172a; font-weight: 600; cursor: pointer; }
    button:hover { background: #0284c7; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Celebs Staging Logs</h2>
    <p>Please enter the setup secret to access real-time staging telemetry.</p>
    <form onsubmit="event.preventDefault(); const s = document.getElementById('sec').value; if(s){ localStorage.setItem('celebs_dev_secret', s); window.location.href = window.location.pathname + '?secret=' + encodeURIComponent(s); }">
      <input id="sec" type="password" placeholder="Enter SETUP_SECRET" required autofocus />
      <button type="submit">Unlock Dashboard</button>
    </form>
  </div>
</body>
</html>`);
      return;
    }

    const secretParam = req.query.secret ? String(req.query.secret) : '';

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Celebs Live Dev Logs</title>
  <style>
    :root {
      --bg: #090d16;
      --card: #111827;
      --border: #1f293d;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --success: #10b981;
      --warn: #f59e0b;
      --error: #ef4444;
      --info: #0ea5e9;
      --debug: #64748b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    header {
      background: var(--card);
      border-bottom: 1px solid var(--border);
      padding: 0.75rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .header-left { display: flex; align-items: center; gap: 1rem; }
    .brand { font-weight: 700; font-size: 1rem; color: #fff; display: flex; align-items: center; gap: 0.5rem; }
    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-status.disconnected {
      background: rgba(239, 68, 68, 0.15);
      color: var(--error);
      border-color: rgba(239, 68, 68, 0.3);
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
    }
    .header-right { display: flex; align-items: center; gap: 0.75rem; }
    button.btn {
      background: #1e293b;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.15s;
    }
    button.btn:hover { background: #334155; }
    button.btn-primary { background: #0284c7; border-color: #0284c7; color: #fff; }
    button.btn-primary:hover { background: #0369a1; }
    .toolbar {
      background: #0b1120;
      border-bottom: 1px solid var(--border);
      padding: 0.5rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .filters { display: flex; gap: 0.35rem; align-items: center; }
    .filter-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      cursor: pointer;
      font-weight: 500;
    }
    .filter-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
    .filter-btn.active {
      background: rgba(56, 189, 248, 0.15);
      color: var(--primary);
      border-color: rgba(56, 189, 248, 0.4);
    }
    .search-box {
      position: relative;
      flex: 1;
      max-width: 320px;
    }
    .search-box input {
      width: 100%;
      background: #131d31;
      border: 1px solid var(--border);
      color: #fff;
      padding: 0.35rem 0.65rem 0.35rem 1.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      outline: none;
    }
    .search-box input:focus { border-color: var(--primary); }
    .search-icon {
      position: absolute;
      left: 0.5rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .container {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem 1.25rem;
      font-family: 'JetBrains Mono', 'Fira Code', Menlo, monospace;
      font-size: 0.8rem;
    }
    .log-row {
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid rgba(255,255,255,0.03);
      padding: 0.35rem 0;
      transition: background 0.1s;
    }
    .log-row:hover { background: rgba(255,255,255,0.02); }
    .log-summary {
      display: flex;
      align-items: baseline;
      gap: 0.65rem;
      cursor: pointer;
      line-height: 1.5;
    }
    .log-time { color: var(--text-muted); font-size: 0.75rem; flex-shrink: 0; }
    .log-level {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .level-20 { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }
    .level-30 { background: rgba(14, 165, 233, 0.2); color: #38bdf8; }
    .level-40 { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .level-50 { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .level-60 { background: rgba(239, 68, 68, 0.3); color: #fca5a5; font-weight: 900; }
    .log-msg { color: #f8fafc; word-break: break-all; flex: 1; }
    .log-detail {
      display: none;
      background: #060911;
      border: 1px solid var(--border);
      border-radius: 6px;
      margin: 0.4rem 0 0.4rem 2rem;
      padding: 0.65rem;
      font-size: 0.75rem;
      color: #cbd5e1;
      overflow-x: auto;
      white-space: pre-wrap;
    }
    .log-detail.open { display: block; }
    .duration-badge {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      font-size: 0.7rem;
    }
    .empty-state { text-align: center; color: var(--text-muted); margin-top: 5rem; font-size: 0.9rem; }
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      <div class="brand">
        <span>⚡</span> Celebs Telemetry Live
      </div>
      <div id="statusBadge" class="badge-status">
        <span class="pulse-dot"></span> <span id="statusText">CONNECTING</span>
      </div>
    </div>
    <div class="header-right">
      <button id="btnPause" class="btn" onclick="togglePause()">⏸ Pause</button>
      <button id="btnClear" class="btn" onclick="clearLogs()">🗑 Clear</button>
      <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: var(--text-muted); cursor: pointer;">
        <input type="checkbox" id="chkAutoScroll" checked /> Auto-scroll
      </label>
    </div>
  </header>

  <div class="toolbar">
    <div class="filters">
      <button class="filter-btn active" data-filter="all" onclick="setFilter('all')">All (<span id="cntAll">0</span>)</button>
      <button class="filter-btn" data-filter="http" onclick="setFilter('http')">HTTP (<span id="cntHttp">0</span>)</button>
      <button class="filter-btn" data-filter="slow" onclick="setFilter('slow')">Slow Queries (<span id="cntSlow">0</span>)</button>
      <button class="filter-btn" data-filter="errors" onclick="setFilter('errors')">Errors & Warnings (<span id="cntErrors">0</span>)</button>
      <button class="filter-btn" data-filter="workers" onclick="setFilter('workers')">Workers (<span id="cntWorkers">0</span>)</button>
    </div>
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input type="text" id="searchInput" placeholder="Search URL, requestId, query..." oninput="onSearchChange()" />
    </div>
  </div>

  <div id="logContainer" class="container">
    <div id="emptyMsg" class="empty-state">Listening for real-time application logs...</div>
  </div>

  <script>
    let logs = [];
    let isPaused = false;
    let currentFilter = 'all';
    let searchQuery = '';
    const secret = "${secretParam}";

    const container = document.getElementById('logContainer');
    const emptyMsg = document.getElementById('emptyMsg');
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    const btnPause = document.getElementById('btnPause');
    const chkAutoScroll = document.getElementById('chkAutoScroll');

    function formatTime(timestamp) {
      if (!timestamp) return '';
      const d = new Date(timestamp);
      return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
    }

    function getLevelClass(level) {
      if (level >= 60) return 'level-60';
      if (level >= 50) return 'level-50';
      if (level >= 40) return 'level-40';
      if (level >= 30) return 'level-30';
      return 'level-20';
    }

    function getLevelLabel(level) {
      if (level >= 60) return 'FATAL';
      if (level >= 50) return 'ERROR';
      if (level >= 40) return 'WARN';
      if (level >= 30) return 'INFO';
      return 'DEBUG';
    }

    function isHttpLog(item) {
      return Boolean(item.req || (item.msg && item.msg.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/)));
    }

    function isSlowLog(item) {
      return Boolean(item.durationMs && item.durationMs >= 200) || (item.msg && item.msg.includes('Slow database query'));
    }

    function isErrorLog(item) {
      return (item.level >= 40) || (item.res && item.res.statusCode >= 400);
    }

    function isWorkerLog(item) {
      const msg = item.msg || '';
      return msg.includes('Worker') || msg.includes('reservation') || msg.includes('session') || msg.includes('queue');
    }

    function matchesFilter(item) {
      if (currentFilter === 'http') return isHttpLog(item);
      if (currentFilter === 'slow') return isSlowLog(item);
      if (currentFilter === 'errors') return isErrorLog(item);
      if (currentFilter === 'workers') return isWorkerLog(item);
      return true;
    }

    function matchesSearch(item) {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const str = JSON.stringify(item).toLowerCase();
      return str.includes(q);
    }

    function updateCounts() {
      document.getElementById('cntAll').innerText = logs.length;
      document.getElementById('cntHttp').innerText = logs.filter(isHttpLog).length;
      document.getElementById('cntSlow').innerText = logs.filter(isSlowLog).length;
      document.getElementById('cntErrors').innerText = logs.filter(isErrorLog).length;
      document.getElementById('cntWorkers').innerText = logs.filter(isWorkerLog).length;
    }

    function renderRow(item) {
      const row = document.createElement('div');
      row.className = 'log-row';

      const summary = document.createElement('div');
      summary.className = 'log-summary';

      const timeSpan = document.createElement('span');
      timeSpan.className = 'log-time';
      timeSpan.innerText = formatTime(item.time);

      const levelSpan = document.createElement('span');
      levelSpan.className = 'log-level ' + getLevelClass(item.level);
      levelSpan.innerText = getLevelLabel(item.level);

      const msgSpan = document.createElement('span');
      msgSpan.className = 'log-msg';
      msgSpan.innerText = item.msg || JSON.stringify(item);

      summary.appendChild(timeSpan);
      summary.appendChild(levelSpan);

      if (item.durationMs) {
        const durSpan = document.createElement('span');
        durSpan.className = 'duration-badge';
        durSpan.innerText = item.durationMs + 'ms';
        summary.appendChild(durSpan);
      }

      summary.appendChild(msgSpan);

      const detail = document.createElement('pre');
      detail.className = 'log-detail';
      detail.innerText = JSON.stringify(item, null, 2);

      summary.onclick = () => {
        detail.classList.toggle('open');
      };

      row.appendChild(summary);
      row.appendChild(detail);

      return row;
    }

    function renderAll() {
      container.innerHTML = '';
      const visible = logs.filter(item => matchesFilter(item) && matchesSearch(item));
      if (visible.length === 0) {
        container.appendChild(emptyMsg);
        emptyMsg.style.display = 'block';
      } else {
        emptyMsg.style.display = 'none';
        visible.forEach(item => {
          container.appendChild(renderRow(item));
        });
      }
      updateCounts();
      if (chkAutoScroll.checked) {
        container.scrollTop = container.scrollHeight;
      }
    }

    function addLogEntry(item) {
      logs.push(item);
      if (logs.length > 500) logs.shift();
      updateCounts();

      if (isPaused) return;

      if (matchesFilter(item) && matchesSearch(item)) {
        emptyMsg.style.display = 'none';
        const row = renderRow(item);
        container.appendChild(row);
        if (chkAutoScroll.checked) {
          container.scrollTop = container.scrollHeight;
        }
      }
    }

    function setFilter(filter) {
      currentFilter = filter;
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
      });
      renderAll();
    }

    function onSearchChange() {
      searchQuery = document.getElementById('searchInput').value.trim();
      renderAll();
    }

    function togglePause() {
      isPaused = !isPaused;
      btnPause.innerText = isPaused ? '▶ Resume' : '⏸ Pause';
      btnPause.classList.toggle('btn-primary', isPaused);
      if (!isPaused) renderAll();
    }

    function clearLogs() {
      logs = [];
      renderAll();
    }

    // Initialize EventSource
    const streamUrl = window.location.pathname.replace(/\\/$/, '') + '/stream' + (secret ? '?secret=' + encodeURIComponent(secret) : '');
    const es = new EventSource(streamUrl);

    es.onopen = () => {
      statusBadge.classList.remove('disconnected');
      statusText.innerText = 'LIVE';
    };

    es.onerror = () => {
      statusBadge.classList.add('disconnected');
      statusText.innerText = 'RECONNECTING';
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'init' && Array.isArray(data.logs)) {
          logs = data.logs;
          renderAll();
        } else if (data.type === 'log' && data.log) {
          addLogEntry(data.log);
        }
      } catch (err) {
        // ignore raw pings
      }
    };
  </script>
</body>
</html>`);
  },

  streamLogs(req: Request, res: Response): void {
    if (!isAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send existing ring buffer history on initial client connection
    res.write(`data: ${JSON.stringify({ type: 'init', logs: logRingBuffer })}\n\n`);

    const onLog = (entry: LogEntry) => {
      res.write(`data: ${JSON.stringify({ type: 'log', log: entry })}\n\n`);
    };

    logEmitter.on('log', onLog);

    // Keep connection alive across reverse proxies (Render / Cloudflare)
    const keepAlive = setInterval(() => {
      res.write(': ping\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAlive);
      logEmitter.off('log', onLog);
    });
  },
};
