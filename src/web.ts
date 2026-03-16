import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PORT = parseInt(process.env.WEB_PORT ?? "4000");

// ── Path resolution ────────────────────────────────────────────────────────────

function resolveDocsPath(): string {
  const arg = process.argv.find((a) => a.startsWith("--path="));
  if (arg) return path.resolve(arg.split("=")[1]!);
  if (process.env.DOCS_PATH) return path.resolve(process.env.DOCS_PATH);
  return path.join(ROOT, "knowledge");
}

// ── File scanner ───────────────────────────────────────────────────────────────
// Scans disk dynamically — no hardcoded list. Add/remove .md files and reflect on reload.

interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
}

const IGNORE = new Set(["node_modules", "dist", ".git"]);

function scanDocs(dir: string, base: string): FileNode[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry): FileNode[] => {
      if (IGNORE.has(entry.name)) return [];
      const full = path.join(dir, entry.name);
      const rel = path.relative(base, full);
      if (entry.isDirectory()) {
        const children = scanDocs(full, base);
        return children.length ? [{ name: entry.name, path: rel, type: "dir", children }] : [];
      }
      if (entry.isFile() && entry.name.endsWith(".md")) {
        return [{ name: entry.name.replace(/\.md$/, ""), path: rel, type: "file" }];
      }
      return [];
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

// ── Git status ─────────────────────────────────────────────────────────────────
// Returns file paths (relative to docsPath) that have uncommitted changes.

function getGitModified(docsPath: string): string[] {
  try {
    const output = execSync("git status --porcelain", {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const docsRelToRoot = path.relative(ROOT, docsPath);
    return output
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => l.slice(3).trim())
      .filter((f) => f.startsWith(docsRelToRoot + "/") || f.startsWith(docsRelToRoot + "\\"))
      .map((f) => path.relative(docsRelToRoot, f));
  } catch {
    return [];
  }
}

// ── HTML ───────────────────────────────────────────────────────────────────────

const HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Docs Viewer</title>
  <script src="https://cdn.jsdelivr.net/npm/marked@9/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:         #0d1117;
      --surface:    #161b22;
      --surface-2:  #21262d;
      --border:     #30363d;
      --border-sub: #21262d;
      --text:       #e6edf3;
      --text-2:     #8b949e;
      --text-3:     #6e7681;
      --accent:     #58a6ff;
      --accent-dim: #1f6feb;
      --success:    #3fb950;
      --warn:       #d29922;
      --radius:     6px;
      --mono:       'SF Mono', 'Cascadia Code', Consolas, monospace;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg); color: var(--text);
      display: flex; flex-direction: column; height: 100vh; overflow: hidden;
      font-size: 14px; line-height: 1.5;
    }

    /* ─ Topnav ─ */
    #topnav {
      height: 48px; min-height: 48px;
      background: var(--surface); border-bottom: 1px solid var(--border);
      display: flex; align-items: center; padding: 0 16px; gap: 12px; z-index: 10;
    }
    .logo { font-size: 14px; font-weight: 700; color: var(--text); display: flex; align-items: center; gap: 7px; }
    .logo-icon { font-size: 18px; }
    #stat-count { font-size: 12px; color: var(--text-3); padding: 2px 8px;
                  background: var(--surface-2); border: 1px solid var(--border); border-radius: 100px; }
    #git-badge {
      display: none; align-items: center; gap: 5px;
      background: rgba(210,153,34,.1); border: 1px solid rgba(210,153,34,.35);
      color: var(--warn); font-size: 11px; font-weight: 600;
      padding: 3px 9px; border-radius: 100px; cursor: default;
    }
    #git-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--warn); }
    .spacer { flex: 1; }
    #search {
      width: 200px; padding: 5px 10px 5px 30px;
      background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius);
      color: var(--text); font-size: 12px; outline: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%236e7681' stroke-width='2.5'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: 9px center;
    }
    #search::placeholder { color: var(--text-3); }
    #search:focus { border-color: var(--accent); }

    /* ─ Layout ─ */
    #main { display: flex; flex: 1; overflow: hidden; }

    /* ─ Sidebar ─ */
    #sidebar {
      width: 256px; min-width: 256px;
      background: var(--surface); border-right: 1px solid var(--border);
      display: flex; flex-direction: column; overflow: hidden;
    }
    #sidebar-title {
      padding: 10px 12px 6px;
      font-size: 10px; font-weight: 700; color: var(--text-3);
      text-transform: uppercase; letter-spacing: 0.8px;
    }
    #tree { flex: 1; overflow-y: auto; padding: 0 4px 12px; }
    #tree::-webkit-scrollbar { width: 3px; }
    #tree::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    /* ─ Tree nodes ─ */
    .folder { margin-bottom: 1px; }
    .folder-label {
      display: flex; align-items: center; gap: 6px;
      padding: 5px 8px; cursor: pointer; border-radius: var(--radius);
      font-size: 11px; font-weight: 600; color: var(--text-2); user-select: none;
    }
    .folder-label:hover { background: var(--surface-2); color: var(--text); }
    .folder-icon { font-size: 13px; }
    .folder-name { flex: 1; text-transform: capitalize; }
    .arrow { font-size: 8px; color: var(--text-3); transition: transform .18s ease; }
    .folder-label.collapsed .arrow { transform: rotate(-90deg); }
    .folder-children { padding-left: 8px; overflow: hidden; transition: max-height .2s ease; max-height: 9999px; }
    .folder-children.hidden { max-height: 0; }

    .file {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: var(--radius);
      font-size: 12.5px; color: var(--text-2); cursor: pointer;
    }
    .file:hover { background: var(--surface-2); color: var(--text); }
    .file.active { background: rgba(88,166,255,.1); color: var(--accent); font-weight: 500; }
    .file-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mod-dot {
      width: 7px; height: 7px; min-width: 7px;
      border-radius: 50%; background: var(--warn);
    }

    /* ─ Content ─ */
    #content { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
    #breadcrumb-bar {
      padding: 8px 24px; border-bottom: 1px solid var(--border);
      font-size: 12px; color: var(--text-3); background: var(--bg);
      display: flex; align-items: center; gap: 4px;
    }
    #breadcrumb-bar .bc-part { color: var(--text-2); }
    #breadcrumb-bar .bc-sep { color: var(--text-3); padding: 0 2px; }
    #breadcrumb-bar .bc-file { color: var(--text); font-weight: 500; }
    #mod-warning {
      display: none; margin-left: auto;
      align-items: center; gap: 5px;
      font-size: 11px; font-weight: 600; color: var(--warn);
      background: rgba(210,153,34,.08); border: 1px solid rgba(210,153,34,.25);
      padding: 2px 9px; border-radius: 100px;
    }
    #doc-container { flex: 1; overflow-y: auto; padding: 40px 56px; }
    #doc-container::-webkit-scrollbar { width: 5px; }
    #doc-container::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
    #markdown { max-width: 800px; animation: fadeIn .15s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
    #empty { display: flex; flex-direction: column; align-items: center; justify-content: center;
             height: 60vh; color: var(--text-3); gap: 10px; }
    #empty .empty-icon { font-size: 44px; opacity: .3; }
    #empty p { font-size: 14px; }

    /* ─ Markdown typography ─ */
    #markdown h1 { font-size: 24px; font-weight: 700; margin-bottom: 16px;
                   padding-bottom: 10px; border-bottom: 1px solid var(--border); }
    #markdown h2 { font-size: 18px; font-weight: 600; margin: 32px 0 10px; }
    #markdown h3 { font-size: 15px; font-weight: 600; margin: 24px 0 8px; color: #cdd9e5; }
    #markdown p  { line-height: 1.75; margin-bottom: 14px; color: #cdd9e5; }
    #markdown ul, #markdown ol { padding-left: 22px; margin-bottom: 14px; }
    #markdown li { line-height: 1.75; margin-bottom: 4px; color: #cdd9e5; }
    #markdown code {
      background: rgba(110,118,129,.12); border: 1px solid var(--border-sub);
      padding: 1px 6px; border-radius: 4px;
      font-size: 12.5px; font-family: var(--mono); color: #79c0ff;
    }
    #markdown a { color: var(--accent); text-decoration: none; }
    #markdown a:hover { text-decoration: underline; }
    #markdown hr { border: none; border-top: 1px solid var(--border); margin: 28px 0; }
    #markdown blockquote {
      border-left: 3px solid var(--accent-dim); padding: 10px 16px;
      margin-bottom: 14px; background: rgba(31,111,235,.06);
      border-radius: 0 var(--radius) var(--radius) 0;
    }
    #markdown blockquote p { color: var(--text-2); margin: 0; }

    /* ─ Tables ─ */
    #markdown table { width: 100%; border-collapse: collapse; margin-bottom: 18px;
                      font-size: 13.5px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    #markdown th { background: var(--surface); padding: 8px 14px; text-align: left;
                   font-weight: 600; border-bottom: 1px solid var(--border); }
    #markdown td { padding: 8px 14px; border-bottom: 1px solid var(--border-sub); color: #cdd9e5; }
    #markdown tr:last-child td { border-bottom: none; }
    #markdown tr:hover td { background: var(--surface); }

    /* ─ Code blocks ─ */
    .code-block { border: 1px solid var(--border); border-radius: 8px;
                  overflow: hidden; margin-bottom: 18px; }
    .code-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 12px; background: var(--surface-2);
      border-bottom: 1px solid var(--border);
      font-family: var(--mono); font-size: 11px; color: var(--text-3);
    }
    .copy-btn {
      background: none; border: 1px solid var(--border); color: var(--text-3);
      font-size: 11px; padding: 2px 8px; border-radius: 4px; cursor: pointer; transition: all .15s;
      font-family: inherit;
    }
    .copy-btn:hover { border-color: var(--text-2); color: var(--text); }
    .copy-btn.copied { border-color: var(--success); color: var(--success); }
    #markdown pre { margin: 0; padding: 14px 16px; background: var(--bg); overflow-x: auto; }
    #markdown pre code { background: none; border: none; padding: 0; font-size: 13px; color: inherit; }

    /* ─ Mermaid ─ */
    .mermaid-wrapper {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 8px; padding: 24px; margin-bottom: 18px;
      display: flex; justify-content: center; overflow-x: auto;
    }
    .mermaid svg { max-width: 100%; }
  </style>
</head>
<body>
  <div id="topnav">
    <div class="logo"><span class="logo-icon">📚</span> Docs Viewer</div>
    <span id="stat-count">...</span>
    <div id="git-badge"><div class="dot"></div><span id="git-count"></span></div>
    <div class="spacer"></div>
    <input id="search" type="text" placeholder="Buscar archivo..." autocomplete="off">
  </div>

  <div id="main">
    <div id="sidebar">
      <div id="sidebar-title">Documentación</div>
      <div id="tree"></div>
    </div>
    <div id="content">
      <div id="breadcrumb-bar">
        <span id="breadcrumb-content">Selecciona un documento</span>
        <span id="mod-warning">● Cambios sin commitear</span>
      </div>
      <div id="doc-container">
        <div id="markdown">
          <div id="empty">
            <div class="empty-icon">📖</div>
            <p>Selecciona un documento para comenzar</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // ── State ──
    var fullTree = [];
    var modifiedSet = new Set();
    var activeEl = null;
    var activeFilePath = null;

    // ── Mermaid config ──
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#1f2937',
        primaryTextColor: '#e6edf3',
        primaryBorderColor: '#58a6ff',
        lineColor: '#58a6ff',
        background: '#161b22',
        nodeBorder: '#30363d',
        clusterBkg: '#161b22',
        titleColor: '#e6edf3',
        edgeLabelBackground: '#161b22',
      }
    });

    // ── Init ──
    async function init() {
      var results = await Promise.all([fetch('/api/tree'), fetch('/api/git-status')]);
      fullTree = await results[0].json();
      var modified = await results[1].json();
      modifiedSet = new Set(modified);
      updateTopStats();
      renderTree(fullTree, document.getElementById('tree'));
    }

    function updateTopStats() {
      var total = flatFiles(fullTree).length;
      document.getElementById('stat-count').textContent = total + ' archivos';
      var badge = document.getElementById('git-badge');
      if (modifiedSet.size > 0) {
        badge.style.display = 'flex';
        document.getElementById('git-count').textContent = modifiedSet.size + ' pendientes';
      } else {
        badge.style.display = 'none';
      }
    }

    // ── Folder icons ──
    var FOLDER_ICONS = {
      'business-rules': '⚖️',
      'ios-implementation': '📱', 'ios-impl': '📱', 'ios-architecture': '🏗️', 'ios-arch': '🏗️',
      'backend-implementation': '⚙️', 'backend-impl': '⚙️', 'backend-architecture': '🔧', 'backend-arch': '🔧',
      'android-implementation': '🤖', 'android-impl': '🤖', 'android-architecture': '🤖', 'android-arch': '🤖',
      'infrastructure': '🌐', 'web-implementation': '🖥️', 'web-impl': '🖥️',
      'web-architecture': '🖥️', 'web-arch': '🖥️', 'sprints': '🏃'
    };

    // ── Tree rendering ──
    function renderTree(nodes, container) {
      container.innerHTML = '';
      nodes.forEach(function(node) {
        container.appendChild(node.type === 'dir' ? buildFolder(node) : buildFile(node));
      });
    }

    function folderHasModified(node) {
      if (node.type === 'file') return modifiedSet.has(node.path);
      return (node.children || []).some(folderHasModified);
    }

    function buildFolder(node) {
      var wrap = document.createElement('div');
      wrap.className = 'folder';

      var label = document.createElement('div');
      label.className = 'folder-label';
      var icon = FOLDER_ICONS[node.name] || '📁';
      var hasMod = folderHasModified(node);

      label.innerHTML =
        '<span class="folder-icon">' + icon + '</span>' +
        '<span class="folder-name">' + humanize(node.name) + '</span>' +
        (hasMod ? '<span class="mod-dot" title="Archivos con cambios pendientes"></span>' : '') +
        '<span class="arrow">&#9660;</span>';

      var children = document.createElement('div');
      children.className = 'folder-children';
      renderTree(node.children || [], children);

      label.onclick = function() {
        label.classList.toggle('collapsed');
        children.classList.toggle('hidden');
      };

      wrap.append(label, children);
      return wrap;
    }

    function buildFile(node) {
      var el = document.createElement('div');
      el.className = 'file' + (node.path === activeFilePath ? ' active' : '');
      el.dataset.path = node.path;
      var isMod = modifiedSet.has(node.path);
      el.innerHTML =
        '<span class="file-name">' + humanize(node.name) + '</span>' +
        (isMod ? '<span class="mod-dot" title="Cambios sin commitear"></span>' : '');
      el.onclick = function() { openFile(node.path, el); };
      return el;
    }

    function humanize(name) {
      return name.replace(/^[0-9]+-/, '').replace(/-/g, ' ');
    }

    // ── Open file ──
    async function openFile(filePath, el) {
      if (activeEl) activeEl.classList.remove('active');
      activeEl = el;
      activeFilePath = filePath;
      el.classList.add('active');

      // Breadcrumb
      var parts = filePath.split('/');
      var bcEl = document.getElementById('breadcrumb-content');
      bcEl.innerHTML = parts.map(function(p, i) {
        var label = humanize(p.replace('.md', ''));
        var cls = i === parts.length - 1 ? 'bc-file' : 'bc-part';
        return (i > 0 ? '<span class="bc-sep">›</span>' : '') + '<span class="' + cls + '">' + label + '</span>';
      }).join('');

      // Modified warning
      var warn = document.getElementById('mod-warning');
      warn.style.display = modifiedSet.has(filePath) ? 'flex' : 'none';

      // Fetch markdown
      var res = await fetch('/api/file?path=' + encodeURIComponent(filePath));
      var md = await res.text();

      // Set up marked renderer: intercept mermaid blocks BEFORE marked HTML-encodes them.
      // This way we get raw text and mermaid can parse it correctly.
      marked.use({
        renderer: {
          code: function(token) {
            if (token.lang === 'mermaid') {
              return '<div class="mermaid-wrapper"><pre class="mermaid">' + token.text + '</pre></div>';
            }
            return false;
          }
        }
      });

      // Parse markdown
      var html = marked.parse(md, { breaks: true, gfm: true });

      var container = document.getElementById('markdown');
      container.innerHTML = html;

      // Wrap pre blocks: add header with language + copy button
      container.querySelectorAll('pre').forEach(function(pre) {
        if (pre.closest('.mermaid-wrapper')) return;
        var code = pre.querySelector('code');
        var langMatch = code && code.className.match(/language-([a-z]+)/);
        var lang = langMatch ? langMatch[1] : 'text';

        var wrapper = document.createElement('div');
        wrapper.className = 'code-block';

        var header = document.createElement('div');
        header.className = 'code-header';

        var langLabel = document.createElement('span');
        langLabel.textContent = lang;

        var btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = 'Copiar';
        btn.onclick = function() {
          navigator.clipboard.writeText(code ? code.textContent : pre.textContent).then(function() {
            btn.textContent = '✓ Copiado';
            btn.classList.add('copied');
            setTimeout(function() { btn.textContent = 'Copiar'; btn.classList.remove('copied'); }, 2000);
          });
        };

        header.append(langLabel, btn);
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.append(header, pre);
      });

      // Syntax highlight
      container.querySelectorAll('pre code').forEach(function(b) { hljs.highlightElement(b); });

      // Render mermaid — requestAnimationFrame ensures the DOM is painted before mermaid measures elements
      var mermaidNodes = Array.from(container.querySelectorAll('.mermaid'));
      if (mermaidNodes.length > 0) {
        requestAnimationFrame(function() {
          mermaid.run({ nodes: mermaidNodes });
        });
      }

      document.getElementById('doc-container').scrollTop = 0;
    }

    // ── Search ──
    document.getElementById('search').addEventListener('input', function() {
      var q = this.value.trim().toLowerCase();
      var container = document.getElementById('tree');
      if (!q) { renderTree(fullTree, container); return; }
      var matches = flatFiles(fullTree).filter(function(f) {
        return f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q);
      });
      container.innerHTML = '';
      matches.forEach(function(f) { container.appendChild(buildFile(f)); });
    });

    function flatFiles(nodes, acc) {
      if (!acc) acc = [];
      nodes.forEach(function(n) {
        if (n.type === 'file') acc.push(n);
        else flatFiles(n.children || [], acc);
      });
      return acc;
    }

    init();
  </script>
</body>
</html>`;

// ── Static file serving (Vite build) ──────────────────────────────────────────

const VIEWER_DIST = path.join(ROOT, "viewer", "dist");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".ico":  "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

function serveViewer(req: http.IncomingMessage, res: http.ServerResponse, pathname: string) {
  const distIndex = path.join(VIEWER_DIST, "index.html");
  if (!fs.existsSync(distIndex)) {
    // Viewer not built yet — serve fallback HTML
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><html><body style="font-family:system-ui;padding:2rem">
      <h2>⚠️ Viewer no compilado</h2>
      <p>Ejecuta <code>cd viewer && npm install && npm run build</code> para compilar el viewer.</p>
      <p>O usa <code>npm run dev:viewer</code> para desarrollo con hot reload.</p>
    </body></html>`);
    return;
  }

  // Try to serve the exact asset
  const assetPath = path.join(VIEWER_DIST, pathname);
  if (pathname !== "/" && fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
    const ext = path.extname(assetPath);
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
    res.end(fs.readFileSync(assetPath));
    return;
  }

  // SPA fallback — always serve index.html
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(fs.readFileSync(distIndex, "utf8"));
}

// ── HTTP server ────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const docsPath = resolveDocsPath();
  const url = new URL(req.url!, `http://localhost:${PORT}`);

  if (!url.pathname.startsWith("/api")) {
    serveViewer(req, res, url.pathname);
    return;
  }

  if (url.pathname === "/api/tree") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(scanDocs(docsPath, docsPath)));
    return;
  }

  if (url.pathname === "/api/git-status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(getGitModified(docsPath)));
    return;
  }

  if (url.pathname === "/api/file") {
    const rel = url.searchParams.get("path") ?? "";
    const full = path.resolve(docsPath, rel);
    if (!full.startsWith(path.resolve(docsPath))) { res.writeHead(403); res.end("Forbidden"); return; }
    if (!fs.existsSync(full)) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(fs.readFileSync(full, "utf8"));
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`\n📚 Docs viewer → http://localhost:${PORT}`);
  console.log(`   Path: ${resolveDocsPath()}\n`);
});
