import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronRight, ChevronDown, ChevronLeft,
  FileText, Search, Menu, Sun, Moon, Layers,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: FileNode[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const FOLDER_ICONS: Record<string, string> = {
  'business-rules': '⚖️',
  'ios-implementation': '📱', 'ios-impl': '📱',
  'ios-architecture': '🏗️', 'ios-arch': '🏗️',
  'backend-implementation': '⚙️', 'backend-impl': '⚙️',
  'backend-architecture': '🔧', 'backend-arch': '🔧',
  'android-implementation': '🤖', 'android-impl': '🤖',
  'android-architecture': '🤖', 'android-arch': '🤖',
  'infrastructure': '🌐',
  'web-implementation': '🖥️', 'web-impl': '🖥️',
  'web-architecture': '🖥️', 'web-arch': '🖥️',
  'sprints': '🏃',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function humanize(name: string): string {
  return name.replace(/^\d+-/, '').replace(/-/g, ' ');
}

function getFolderIcon(name: string): string {
  return FOLDER_ICONS[name] ?? '📁';
}

// ── External scripts hook ──────────────────────────────────────────────────────

function useExternalScripts() {
  const [ready, setReady] = useState({ marked: false, mermaid: false, prism: false, panzoom: false });

  useEffect(() => {
    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src; s.async = true;
        s.onload = () => resolve(); s.onerror = reject;
        document.head.appendChild(s);
      });

    const loadLink = (href: string) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = href;
      document.head.appendChild(l);
    };

    (async () => {
      loadLink('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js');
      setReady(p => ({ ...p, marked: true }));

      await loadScript('https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js');
      (window as any).mermaid?.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
      setReady(p => ({ ...p, mermaid: true }));

      await loadScript('https://cdn.jsdelivr.net/npm/@panzoom/panzoom@4.5.1/dist/panzoom.min.js');
      setReady(p => ({ ...p, panzoom: true }));

      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js');
      for (const lang of ['json', 'javascript', 'typescript', 'bash', 'yaml', 'swift', 'kotlin', 'sql']) {
        try { await loadScript(`https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-${lang}.min.js`); } catch { /* ignore */ }
      }
      setReady(p => ({ ...p, prism: true }));
    })();
  }, []);

  return ready;
}

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const libs = useExternalScripts();

  const [tree, setTree] = useState<FileNode[]>([]);
  const [modifiedSet, setModifiedSet] = useState<Set<string>>(new Set());
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [toc, setToc] = useState<{ id: string; text: string; level: string }[]>([]);

  // Dark mode class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Initial data fetch
  useEffect(() => {
    Promise.all([
      fetch('/api/tree').then(r => r.json()),
      fetch('/api/git-status').then(r => r.json()),
    ]).then(([t, g]: [FileNode[], string[]]) => {
      setTree(t);
      setModifiedSet(new Set(g));
    });
  }, []);

  // Flat file list for prev/next
  const allFiles = useMemo(() => {
    const flat: FileNode[] = [];
    const walk = (nodes: FileNode[]) => nodes.forEach(n => {
      if (n.type === 'file') flat.push(n);
      else walk(n.children ?? []);
    });
    walk(tree);
    return flat;
  }, [tree]);

  const currentIndex = allFiles.findIndex(f => f.path === activeFile);
  const prevFile = currentIndex > 0 ? allFiles[currentIndex - 1] : null;
  const nextFile = currentIndex < allFiles.length - 1 ? allFiles[currentIndex + 1] : null;

  // Open file
  const openFile = useCallback(async (filePath: string) => {
    setLoading(true);
    setActiveFile(filePath);
    setToc([]);
    const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
    const md = await res.text();
    setContent(md);
    setLoading(false);
    document.getElementById('doc-scroll')?.scrollTo(0, 0);
  }, []);

  // Render markdown → HTML string
  const renderedHtml = useMemo(() => {
    if (!libs.marked || !(window as any).marked || !content) return '';
    const w = window as any;
    const renderer = new w.marked.Renderer();
    renderer.code = (code: string, language: string) => {
      if (language === 'mermaid') return `<div class="mermaid">${code}</div>`;
      const lang = language || 'text';
      const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<div class="code-block">
        <div class="code-header">
          <span class="code-lang">${lang.toUpperCase()}</span>
          <button class="code-copy" data-code="${encodeURIComponent(code)}">Copiar</button>
        </div>
        <pre class="language-${lang}"><code class="language-${lang}">${escaped}</code></pre>
      </div>`;
    };
    try {
      return w.marked.parse(content, { renderer, gfm: true, breaks: true });
    } catch {
      return '<p>Error al renderizar el documento.</p>';
    }
  }, [content, libs.marked]);

  // Post-render: mermaid, prism, TOC
  useEffect(() => {
    if (!renderedHtml) return;
    const t = setTimeout(async () => {
      // Mermaid
      if (libs.mermaid && (window as any).mermaid) {
        const nodes = Array.from(document.querySelectorAll<HTMLElement>('.mermaid:not([data-processed])'));
        if (nodes.length) {
          try {
            (window as any).mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'neutral' });
            await (window as any).mermaid.run({ nodes });
          } catch { /* ignore parse errors */ }

          // Panzoom on rendered SVGs
          if ((window as any).Panzoom) {
            document.querySelectorAll<HTMLElement>('.mermaid').forEach(wrapper => {
              if (wrapper.dataset.panzoom === 'true') return;
              const svg = wrapper.querySelector<SVGElement>('svg');
              if (!svg) return;
              wrapper.dataset.panzoom = 'true';
              const pz = (window as any).Panzoom(svg, { maxScale: 8, minScale: 0.2, step: 0.3, contain: 'outside' });
              wrapper.addEventListener('wheel', (e: WheelEvent) => { e.preventDefault(); pz.zoomWithWheel(e); }, { passive: false });

              const controls = document.createElement('div');
              controls.className = 'mermaid-controls';
              controls.innerHTML = '<button class="mermaid-btn" data-action="zoom-in" title="Acercar">+</button><button class="mermaid-btn" data-action="zoom-out" title="Alejar">−</button><button class="mermaid-btn" data-action="reset" title="Restablecer">⊙</button>';
              wrapper.appendChild(controls);
              controls.addEventListener('click', (e: MouseEvent) => {
                const btn = (e.target as Element).closest('[data-action]') as HTMLElement | null;
                if (!btn) return;
                const action = btn.dataset.action;
                if (action === 'zoom-in') pz.zoomIn();
                else if (action === 'zoom-out') pz.zoomOut();
                else if (action === 'reset') pz.reset();
              });
            });
          }
        }
      }
      // Prism
      if (libs.prism && (window as any).Prism) (window as any).Prism.highlightAll();
      // TOC
      const container = document.querySelector('.prose-container');
      if (container) {
        const headings = Array.from(container.querySelectorAll<HTMLElement>('h2, h3')).map(h => {
          const id = h.innerText.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
          h.id = id;
          return { id, text: h.innerText, level: h.tagName };
        });
        setToc(headings);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [renderedHtml, libs, isDark]);

  // Copy code button handler
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const btn = (e.target as Element).closest('.code-copy') as HTMLElement | null;
      if (!btn) return;
      const code = decodeURIComponent(btn.dataset.code ?? '');
      navigator.clipboard.writeText(code).then(() => {
        const orig = btn.innerText;
        btn.innerText = '✓ Copiado';
        setTimeout(() => (btn.innerText = orig), 2000);
      });
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Filtered tree for search
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;
    const q = searchQuery.toLowerCase();
    const filterNodes = (nodes: FileNode[]): FileNode[] =>
      nodes.flatMap(n => {
        if (n.type === 'file') return n.name.toLowerCase().includes(q) || n.path.toLowerCase().includes(q) ? [n] : [];
        const children = filterNodes(n.children ?? []);
        return children.length ? [{ ...n, children }] : [];
      });
    return filterNodes(tree);
  }, [tree, searchQuery]);

  // Check if folder has modified descendants
  const folderHasModified = useCallback((node: FileNode): boolean => {
    if (node.type === 'file') return modifiedSet.has(node.path);
    return (node.children ?? []).some(folderHasModified);
  }, [modifiedSet]);

  // ── Render tree ──────────────────────────────────────────────────────────────

  const renderNode = useCallback((node: FileNode): React.ReactNode => {
    if (node.type === 'dir') {
      const isCollapsed = collapsed[node.path] ?? false;
      const hasMod = folderHasModified(node);
      return (
        <div key={node.path}>
          <button
            onClick={() => setCollapsed(prev => ({ ...prev, [node.path]: !isCollapsed }))}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors group
              ${isDark ? 'text-[#8E8E93] hover:bg-[#3D3D3F] hover:text-white' : 'text-[#86868B] hover:bg-[#E8E8ED] hover:text-black'}`}
          >
            {isCollapsed ? <ChevronRight size={10} className="flex-shrink-0" /> : <ChevronDown size={10} className="flex-shrink-0" />}
            <span>{getFolderIcon(node.name)}</span>
            <span className="flex-1 text-left truncate">{humanize(node.name)}</span>
            {hasMod && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" title="Cambios pendientes" />}
          </button>
          {!isCollapsed && (
            <div className="pl-3 mt-0.5 space-y-0.5">
              {(node.children ?? []).map(renderNode)}
            </div>
          )}
        </div>
      );
    }

    const isActive = activeFile === node.path;
    const isMod = modifiedSet.has(node.path);

    return (
      <button
        key={node.path}
        onClick={() => openFile(node.path)}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] transition-all text-left
          ${isActive
            ? 'bg-[#0071E3] text-white shadow-md'
            : isDark
              ? 'text-[#AEAEB2] hover:bg-[#3D3D3F] hover:text-white'
              : 'text-[#3C3C43] hover:bg-[#E8E8ED]'
          }`}
      >
        <FileText size={13} className={`flex-shrink-0 ${isActive ? 'text-white' : 'opacity-40'}`} />
        <span className="flex-1 truncate font-medium">{humanize(node.name)}</span>
        {isMod && (
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-amber-300' : 'bg-amber-500'}`}
            title="Cambios sin commitear"
          />
        )}
      </button>
    );
  }, [activeFile, collapsed, isDark, modifiedSet, folderHasModified, openFile]);

  // ── Breadcrumb ───────────────────────────────────────────────────────────────

  const breadcrumb = activeFile
    ? activeFile.split('/').map((part, i, arr) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={11} className="opacity-30 flex-shrink-0" />}
          <span className={i === arr.length - 1 ? 'font-semibold text-inherit' : 'opacity-50'}>
            {humanize(part.replace(/\.md$/, ''))}
          </span>
        </React.Fragment>
      ))
    : null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-200 ${isDark ? 'bg-[#1C1C1E] text-[#F5F5F7]' : 'bg-[#FBFBFD] text-[#1D1D1F]'}`}>

      {/* ── Sidebar ── */}
      <aside
        className={`${sidebarOpen ? 'w-72' : 'w-0'} flex-shrink-0 overflow-hidden transition-all duration-300 flex flex-col border-r
          ${isDark ? 'bg-[#2C2C2E] border-[#3D3D3F]' : 'bg-[#F5F5F7] border-[#D2D2D7]'}`}
      >
        <div className="min-w-[18rem] flex flex-col h-full">

          {/* Sidebar header */}
          <div className="p-5 pb-3 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-[#0071E3] rounded-lg flex items-center justify-center shadow-sm">
                  <Layers size={15} className="text-white" />
                </div>
                <span className="font-bold text-[15px] tracking-tight">Docs Viewer</span>
              </div>
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-[#3D3D3F]' : 'hover:bg-[#E8E8ED]'}`}
              >
                {isDark
                  ? <Sun size={14} className="text-amber-400" />
                  : <Moon size={14} className="text-[#86868B]" />}
              </button>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium
                ${isDark ? 'bg-[#3D3D3F] text-[#8E8E93]' : 'bg-[#E3E3E8] text-[#86868B]'}`}>
                {allFiles.length} archivos
              </span>
              {modifiedSet.size > 0 && (
                <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                  ● {modifiedSet.size} pendientes
                </span>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" size={13} />
              <input
                type="text"
                placeholder="Buscar archivo..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-[13px] outline-none transition-all
                  focus:ring-2 focus:ring-[#0071E3]/25
                  ${isDark
                    ? 'bg-[#1C1C1E] text-white placeholder-[#636366]'
                    : 'bg-[#E3E3E8] text-black placeholder-[#86868B]'}`}
              />
            </div>
          </div>

          {/* File tree */}
          <nav className="flex-1 overflow-y-auto px-3 pb-6 space-y-0.5">
            {filteredTree.map(renderNode)}
          </nav>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className={`flex-1 flex flex-col min-w-0 transition-colors duration-200 ${isDark ? 'bg-[#1C1C1E]' : 'bg-white'}`}>

        {/* Header */}
        <header className={`h-12 border-b flex items-center gap-4 px-5 sticky top-0 z-30 backdrop-blur-xl flex-shrink-0
          ${isDark ? 'bg-[#1C1C1E]/90 border-[#3D3D3F]' : 'bg-white/90 border-[#D2D2D7]'}`}>
          <button
            onClick={() => setSidebarOpen(s => !s)}
            className={`p-1.5 rounded-lg transition-colors flex-shrink-0
              ${isDark ? 'hover:bg-[#2C2C2E]' : 'hover:bg-[#F5F5F7]'}`}
          >
            <Menu size={17} className="opacity-50" />
          </button>

          {activeFile && (
            <div className="flex items-center gap-1 text-[12px] min-w-0 overflow-hidden">
              {breadcrumb}
              {modifiedSet.has(activeFile) && (
                <span className="ml-2 flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-semibold border border-amber-500/30">
                  ● sin commitear
                </span>
              )}
            </div>
          )}
        </header>

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">

          {/* Article scroll area */}
          <div id="doc-scroll" className={`flex-1 overflow-y-auto ${isDark ? 'bg-[#1C1C1E]' : 'bg-white'}`}>
            {!activeFile ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
                <span className="text-5xl opacity-20">📖</span>
                <p className="text-sm opacity-30">Selecciona un documento</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm opacity-30">Cargando...</p>
              </div>
            ) : (
              <article className={`max-w-[860px] mx-auto px-12 py-16 apple-docs fade-in ${isDark ? 'text-[#F5F5F7]' : 'text-[#1D1D1F]'}`}>
                <div
                  className="prose-container"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />

                {/* Prev / Next navigation */}
                {(prevFile || nextFile) && (
                  <div className={`mt-24 pt-8 border-t flex items-center justify-between
                    ${isDark ? 'border-[#3D3D3F]' : 'border-[#D2D2D7]'}`}>
                    {prevFile ? (
                      <button onClick={() => openFile(prevFile.path)} className="flex flex-col items-start gap-1 group">
                        <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest flex items-center gap-1">
                          <ChevronLeft size={11} /> Anterior
                        </span>
                        <span className="text-sm font-semibold text-[#0071E3] group-hover:underline">
                          {humanize(prevFile.name)}
                        </span>
                      </button>
                    ) : <div />}
                    {nextFile ? (
                      <button onClick={() => openFile(nextFile.path)} className="flex flex-col items-end gap-1 group">
                        <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest flex items-center gap-1">
                          Siguiente <ChevronRight size={11} />
                        </span>
                        <span className="text-sm font-semibold text-[#0071E3] group-hover:underline">
                          {humanize(nextFile.name)}
                        </span>
                      </button>
                    ) : <div />}
                  </div>
                )}
              </article>
            )}
          </div>

          {/* TOC sidebar */}
          {toc.length > 0 && (
            <aside className={`w-56 hidden xl:flex flex-col flex-shrink-0 border-l overflow-y-auto p-6
              ${isDark ? 'bg-[#1C1C1E] border-[#3D3D3F]' : 'bg-white border-[#D2D2D7]'}`}>
              <span className="text-[10px] font-extrabold opacity-40 uppercase tracking-widest mb-5 block">
                En esta página
              </span>
              <nav className={`space-y-3 border-l-2 pl-4 ${isDark ? 'border-[#3D3D3F]' : 'border-[#E5E5EA]'}`}>
                {toc.map((item, i) => (
                  <a
                    key={i}
                    href={`#${item.id}`}
                    className={`block text-[12px] leading-snug transition-colors hover:text-[#0071E3]
                      ${item.level === 'H3' ? 'pl-3 opacity-50' : 'font-medium opacity-80'}`}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
