/* global React, ReactDOM */
const { useState, useEffect, useRef, useMemo, useCallback, Fragment } = React;

// AI assistant identity — bilingual, surfaces in tooltips
const AGENT_NAME_CN = "陈襄";
const AGENT_NAME_EN = "Shawn Chan";
const AGENT_TITLE = `${AGENT_NAME_CN} · ${AGENT_NAME_EN}`;

// Line-portrait SVG for the agent — matches index.html author-portrait style
function AgentAvatar({ size = 22 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-label={AGENT_TITLE} style={{ flexShrink: 0 }}>
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <ellipse cx="50" cy="44" rx="20" ry="24"/>
        <path d="M30 32 Q40 18 50 18 Q62 18 70 30"/>
        <path d="M34 36 L48 26"/>
        <circle cx="42" cy="46" r="5"/>
        <circle cx="58" cy="46" r="5"/>
        <line x1="47" y1="46" x2="53" y2="46"/>
        <path d="M46 60 Q50 58 54 60"/>
        <path d="M22 95 Q24 76 50 70 Q76 76 78 95"/>
        <path d="M44 72 L50 84 L56 72"/>
      </g>
    </svg>
  );
}

// ────────────────────────────────────────────────────────────
// Mock content
// ────────────────────────────────────────────────────────────

const INITIAL_DOC = [
  { id: "h1", type: "h1", text: "美国 4 月 CPI 解构：核心服务粘性与租金传导" },
  { id: "meta", type: "meta", text: "Brief #2026-05-10 · 林知衡 · Macro · Draft v3" },
  { id: "h2-1", type: "h2", text: "Executive Summary" },
  { id: "p1", type: "p", text: "美国 4 月 CPI 同比 3.4%，环比 0.31%，连续第三个月低于市场一致预期。核心商品继续通缩，而核心服务粘性主要来自业主等价租金（OER）与机动车保险两条线。本期我们用拆分模型把通胀回归到「房租 + 保险 + 其余」三段，量化每条对联储 9 月会议表态的边际影响。" },
  { id: "kpi", type: "kpi" },
  { id: "h2-2", type: "h2", text: "1. 核心因素拆解" },
  { id: "p2", type: "p", text: "把 CPI 同比拆为商品、住房、其余服务三段后可见：住房贡献 1.6 个百分点，仍占核心 CPI 同比的近一半；其余服务 1.0 个百分点，环比开始走平；核心商品已在零附近徘徊四个月。" },
  { id: "chart-line", type: "chart", kind: "line", title: "美国核心 CPI 同比贡献分解 · 2023–2026" },
  { id: "p3", type: "p", text: "OER 滞后市场租金约 11–13 个月，按 Zillow 与 ApartmentList 序列推算，OER 同比将在 2026 Q3 前回到 4% 以内，但很难单凭这一项把核心 CPI 拉回 2%。" },
  { id: "h2-3", type: "h2", text: "2. 波动率曲面：期权市场如何定价 9 月会议" },
  { id: "p4", type: "p", text: "SOFR 期权 9 月行权周围的隐含波动率高于前后期限，市场已部分定价「9 月降息或不降息」的二元情形。我们取 2026 年 5–10 月期限的期权点构造波动率曲面：" },
  { id: "chart-3d", type: "chart", kind: "surface", title: "SOFR 期权隐含波动率曲面 · 2026 May–Oct" },
  { id: "h2-4", type: "h2", text: "3. 结论与持仓建议" },
  { id: "p5", type: "p", text: "保留 2 年期 vs 10 年期的陡峭化倾斜；对 9 月会议日 SOFR 跨式做多波动率；权益端继续低配利率敏感的小盘成长，超配现金流稳定的大盘价值。" },
];

const INITIAL_CHAT = [
  { who: "user", t: "14:32", text: "美国 4 月 CPI 出来了，帮我从核心服务粘性角度起一份研报，重点讲 OER 和保险。" },
  { who: "agent", t: "14:32", text: "已抓 BLS 4 月发布、Zillow 月度租金序列、CME SOFR 期权链 5–10 月。已起草执行摘要、§1 核心因素拆解，并在文档里留了一张 .chart line 占位。" },
  { who: "user", t: "14:38", text: "把 9 月联储会议的市场定价用波动率曲面画出来。" },
  { who: "agent", t: "14:39", text: "已写入 §2，调用 .chart surface_3d 渲染 SOFR 期权 IV 曲面（2026 May–Oct × strike），右栏新增数据源 cme_sofr_opt_chain。" },
  { who: "user", t: "14:55", text: "§1 第二段读起来太学术，能更口语吗？" },
];

const DATA_SOURCES = [
  { id: "bls_cpi_apr26", label: "bls_cpi_apr26", desc: "BLS · CPI Detailed Report Apr 2026", fresh: "2 小时前" },
  { id: "zillow_orr_msa", label: "zillow_orr_msa", desc: "Zillow Observed Rent · MSA", fresh: "1 天前" },
  { id: "cme_sofr_opt", label: "cme_sofr_opt_chain", desc: "CME SOFR 期权链 May–Oct 2026", fresh: "37 分钟前" },
  { id: "fred_cpi_yoy", label: "fred_cpi_yoy", desc: "FRED CPIAUCSL 同比序列", fresh: "今日" },
];

const CITATIONS = [
  { id: "c1", label: "BLS Detailed Report", page: "Table 2 · CPI by category" },
  { id: "c2", label: "FOMC Minutes · Mar 26", page: "p.7 关于 services ex-housing" },
  { id: "c3", label: "Zillow Research", page: "Apr Rent Forecast" },
];

const TASKS = [
  { id: "t1", label: "拉取 BLS 4 月明细", done: true },
  { id: "t2", label: "构造核心服务回归模型", done: true },
  { id: "t3", label: "渲染 IV 曲面 (3D)", done: true },
  { id: "t4", label: "起草持仓建议", done: false },
  { id: "t5", label: "事实核查通过 LLM 闸口", done: false },
];

const STAGES = ["Brief", "Research", "Draft", "Visualize", "Review", "Publish"];

// ────────────────────────────────────────────────────────────
// Workflow strip
// ────────────────────────────────────────────────────────────

function WorkflowStrip() {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a href="/" className="brand-mark">
            <div className="brand-glyph"></div>
            <div className="brand-name">Analyst</div>
          </a>
          <nav className="primary-nav">
            <a href="/">首页</a>
            <a href="/#research">研报</a>
            <a className="is-active" href="/workstation">工作台</a>
            <a href="/#authors">作者榜</a>
            <a href="/#saved">收藏</a>
          </nav>
        </div>
      </header>
      <div className="doc-context">
        <div className="doc-context-l">
          <span className="dc-eyebrow">当前文稿</span>
          <span className="dc-title">CPI · 核心服务粘性</span>
          <span className="dc-meta">v3 · 已保存 · 林知衡</span>
        </div>
        <div className="doc-context-r">
          <button className="ws-ghost">导出 ▾</button>
          <button className="ws-cta">发布</button>
        </div>
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Left: Chat Stream
// ────────────────────────────────────────────────────────────

function CollapseChevron({ dir, onClick }) {
  return <button className={"col-collapse col-collapse-" + dir} onClick={onClick} aria-label="收起">{dir === "left" ? "‹" : "›"}</button>;
}

function Section({ title, meta, defaultOpen = true, action, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={"ws-section" + (open ? "" : " is-collapsed")}>
      <header className="ws-section-h">
        <button className="ws-section-btn" onClick={() => setOpen(o => !o)}>
          <span className="ws-section-caret">{open ? "▾" : "▸"}</span>
          <span>{title}</span>
        </button>
        <span className="ws-section-side">
          {meta && <span className="ws-section-meta">{meta}</span>}
          {action}
        </span>
      </header>
      {open && <div className="ws-section-body">{children}</div>}
    </section>
  );
}

function ChatStream({ messages, collapsed, onToggle }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && !collapsed) ref.current.scrollTop = ref.current.scrollHeight; }, [messages, collapsed]);
  if (collapsed) {
    return (
      <button className="col-rail col-rail-l" onClick={onToggle} aria-label="展开对话流">
        <span className="rail-icon">›</span>
        <span className="rail-label">对话流</span>
      </button>
    );
  }
  return (
    <aside className="col-chat">
      <CollapseChevron dir="left" onClick={onToggle} />
      <div className="chat-scroll" ref={ref}>
        <div className="chat-day">2026 · 5 · 10  ·  Friday</div>
        {messages.map((m, i) => (
          <div key={i} className={"chat-msg msg-" + m.who}>
            <div className="chat-msg-head">
              {m.who === "agent" && <AgentAvatar size={18} />}
              <span className="chat-who" title={m.who === "agent" ? AGENT_TITLE : undefined}>
                {m.who === "user" ? "你" : AGENT_NAME_CN}
              </span>
              <span className="chat-time">{m.t}</span>
            </div>
            <div className="chat-body">{m.text}</div>
            {m.who === "agent" && (
              <div className="chat-trace">
                <span className="trace-pill">∎ 写入 §1.2</span>
                <span className="trace-pill">∎ +1 数据源</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────
// Center: Document Stage
// ────────────────────────────────────────────────────────────

function ChartLine({ title }) {
  // SVG line chart placeholder, themed via CSS vars
  const pts1 = [10, 22, 35, 48, 55, 60, 58, 52, 44, 36, 28, 22];
  const pts2 = [8, 15, 22, 28, 30, 28, 24, 20, 16, 14, 13, 12];
  const pts3 = [4, 8, 12, 14, 12, 8, 4, 0, -2, -3, -3, -2];
  const W = 640, H = 220, padL = 36, padR = 12, padT = 18, padB = 28;
  const xs = (i) => padL + (i * (W - padL - padR)) / (pts1.length - 1);
  const yMin = -10, yMax = 70;
  const ys = (v) => padT + ((yMax - v) * (H - padT - padB)) / (yMax - yMin);
  const path = (arr) => arr.map((v, i) => (i ? "L" : "M") + xs(i) + "," + ys(v)).join(" ");
  return (
    <figure className="doc-chart">
      <div className="chart-frame">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" width="100%">
          <line x1={padL} y1={ys(0)} x2={W - padR} y2={ys(0)} className="ch-axis" />
          {[0, 20, 40, 60].map(v => (
            <g key={v}>
              <line x1={padL} y1={ys(v)} x2={W - padR} y2={ys(v)} className="ch-grid" />
              <text x={padL - 6} y={ys(v) + 3} className="ch-tick">{v / 10}%</text>
            </g>
          ))}
          <path d={path(pts1)} className="ch-line ch-line-1" />
          <path d={path(pts2)} className="ch-line ch-line-2" />
          <path d={path(pts3)} className="ch-line ch-line-3" />
          {pts1.map((v, i) => i === 6 && <circle key={i} cx={xs(i)} cy={ys(v)} r="3" className="ch-dot ch-line-1" />)}
        </svg>
      </div>
      <figcaption className="doc-chart-cap">
        <span className="cap-num">Chart 1</span>
        <span className="cap-title">{title}</span>
        <span className="cap-legend">
          <span className="lg lg-1">住房</span>
          <span className="lg lg-2">其余服务</span>
          <span className="lg lg-3">核心商品</span>
        </span>
        <span className="cap-src">Source: BLS, FRED · 单位 % · 同比贡献</span>
      </figcaption>
    </figure>
  );
}

function ChartSurface({ title }) {
  // Faux 3D surface with isometric line grid
  const W = 640, H = 280;
  const rows = 14, cols = 18;
  const cx = W / 2, baseY = 200;
  const xStep = 16, yStep = 9, zStep = 8;
  const surface = (i, j) => {
    // rolling wave
    const x = (j - cols / 2);
    const y = (i - rows / 2);
    return 4 * Math.exp(-(x * x + y * y) / 18) + 1.5 * Math.sin(j * 0.6 + i * 0.3);
  };
  const project = (i, j) => {
    const z = surface(i, j);
    return [
      cx + (j - i) * xStep,
      baseY - (i + j) * yStep - z * zStep,
    ];
  };
  const lines = [];
  for (let i = 0; i < rows; i++) {
    let d = "";
    for (let j = 0; j < cols; j++) {
      const [x, y] = project(i, j);
      d += (j ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1) + " ";
    }
    lines.push(<path key={"r" + i} d={d} className="surf-line" style={{ opacity: 0.35 + (i / rows) * 0.5 }} />);
  }
  for (let j = 0; j < cols; j++) {
    let d = "";
    for (let i = 0; i < rows; i++) {
      const [x, y] = project(i, j);
      d += (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1) + " ";
    }
    lines.push(<path key={"c" + j} d={d} className="surf-line surf-cross" style={{ opacity: 0.25 + (j / cols) * 0.5 }} />);
  }
  return (
    <figure className="doc-chart">
      <div className="chart-frame">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%">
          <text x="20" y="22" className="ch-tick">IV</text>
          <text x={W - 60} y={H - 8} className="ch-tick">strike →</text>
          <text x="20" y={H - 8} className="ch-tick">expiry →</text>
          {lines}
        </svg>
      </div>
      <figcaption className="doc-chart-cap">
        <span className="cap-num">Chart 2 · 3D</span>
        <span className="cap-title">{title}</span>
        <span className="cap-src">Source: CME SOFR options · IV (annualized) · 2026 May–Oct</span>
      </figcaption>
    </figure>
  );
}

function KpiStrip() {
  const items = [
    { label: "CPI YoY", value: "3.4%", delta: "−0.1", trend: "down" },
    { label: "Core CPI YoY", value: "3.6%", delta: "−0.2", trend: "down" },
    { label: "Core Services ex-housing", value: "4.4%", delta: "+0.1", trend: "up" },
    { label: "OER YoY", value: "5.4%", delta: "−0.3", trend: "down" },
  ];
  return (
    <div className="kpi-strip">
      {items.map(k => (
        <div key={k.label} className="kpi-card">
          <div className="kpi-label">{k.label}</div>
          <div className="kpi-value">{k.value}</div>
          <div className={"kpi-delta is-" + k.trend}>{k.delta} vs Mar</div>
        </div>
      ))}
    </div>
  );
}

function DocumentStage({ doc, onSelect, sentMsg }) {
  const docRef = useRef(null);
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { onSelect(null); return; }
    const text = sel.toString().trim();
    if (text.length < 4 || !docRef.current?.contains(sel.anchorNode)) { onSelect(null); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = docRef.current.getBoundingClientRect();
    // find section heading
    let node = sel.anchorNode;
    while (node && node.nodeType === 3) node = node.parentNode;
    let blockEl = node;
    while (blockEl && !blockEl.dataset?.blockId) blockEl = blockEl.parentNode;
    const blockId = blockEl?.dataset?.blockId || "?";
    onSelect({
      text: text.length > 60 ? text.slice(0, 60) + "…" : text,
      blockId,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
    });
  };

  return (
    <main className="col-doc" onMouseUp={handleMouseUp} ref={docRef}>
      <div className="col-doc-inner">
        <div className="doc-toolbar">
          <span className="doc-bread">研报 · Macro · #2026-05-10</span>
          <div className="doc-toolbar-r">
            <span className="doc-status">● Draft</span>
            <span className="doc-saved">已保存 · 14:55</span>
          </div>
        </div>

        <article className="doc-article">
          {doc.map(b => {
            if (b.type === "kpi") return <div key={b.id} data-block-id={b.id}><KpiStrip /></div>;
            if (b.type === "chart") {
              return (
                <div key={b.id} data-block-id={b.id} className="doc-chart-wrap">
                  {b.kind === "line" ? <ChartLine title={b.title} /> : <ChartSurface title={b.title} />}
                  <code className="doc-chart-spec">.chart {b.kind === "line" ? "line" : "surface_3d"} {"{data: ..., title: \"" + b.title + "\"}"}</code>
                </div>
              );
            }
            const Tag = b.type === "h1" ? "h1" : b.type === "h2" ? "h2" : b.type === "meta" ? "div" : "p";
            const cls = b.type === "meta" ? "doc-meta" : "doc-" + b.type;
            return <Tag key={b.id} data-block-id={b.id} className={cls}>{b.text}</Tag>;
          })}

          {sentMsg && (
            <div className="doc-streaming">
              <span className="stream-tag" title={AGENT_TITLE}>{AGENT_NAME_CN} 正在写入 §3 第二段</span>
              <span className="stream-text">{sentMsg}</span>
              <span className="stream-cursor">▍</span>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}

// ────────────────────────────────────────────────────────────
// Right: Workspace tools
// ────────────────────────────────────────────────────────────

function WorkspacePanel({ collapsed, onToggle }) {
  if (collapsed) {
    return (
      <button className="col-rail col-rail-r" onClick={onToggle} aria-label="展开工作区">
        <span className="rail-icon">‹</span>
        <span className="rail-label">工作区</span>
      </button>
    );
  }
  return (
    <aside className="col-workspace">
      <CollapseChevron dir="right" onClick={onToggle} />

      <Section title="数据源" action={<button className="ws-mini">+ 接入</button>}>
        <ul className="ws-list">
          {DATA_SOURCES.map(d => (
            <li key={d.id} className="ws-item">
              <span className="ws-dot ws-dot-data" />
              <div className="ws-item-body">
                <div className="ws-item-label"><code>{d.label}</code></div>
                <div className="ws-item-desc">{d.desc}</div>
              </div>
              <span className="ws-item-fresh">{d.fresh}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="引用源" action={<button className="ws-mini">+</button>}>
        <ul className="ws-list">
          {CITATIONS.map(c => (
            <li key={c.id} className="ws-item">
              <span className="ws-dot ws-dot-cite" />
              <div className="ws-item-body">
                <div className="ws-item-label">{c.label}</div>
                <div className="ws-item-desc">{c.page}</div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="子任务" meta="3 / 5">
        <ul className="ws-tasks">
          {TASKS.map(t => (
            <li key={t.id} className={"ws-task" + (t.done ? " is-done" : "")}>
              <span className="ws-check">{t.done ? "✓" : "▢"}</span>
              <span>{t.label}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="已生成图表" meta="2" defaultOpen={false}>
        <div className="ws-thumbs">
          <div className="ws-thumb"><div className="thumb-mini thumb-line" /><span>Chart 1 · 同比贡献</span></div>
          <div className="ws-thumb"><div className="thumb-mini thumb-surf" /><span>Chart 2 · IV 曲面</span></div>
        </div>
      </Section>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────
// Liquid glass input + selection pill + chips
// ────────────────────────────────────────────────────────────

function SelectionPill({ sel, onAct, onClose }) {
  if (!sel) return null;
  return (
    <div
      className="sel-pill"
      style={{ left: sel.x, top: sel.y }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button onClick={() => onAct("improve", sel)}><span>✨</span> 改进</button>
      <span className="sel-sep" />
      <button onClick={() => onAct("explain", sel)}>解释</button>
      <span className="sel-sep" />
      <button onClick={() => onAct("rewrite", sel)}>口语化</button>
      <span className="sel-sep" />
      <button onClick={() => onAct("ref", sel)}>/ 命令</button>
    </div>
  );
}

function StreamPreview({ text, visible }) {
  if (!visible) return null;
  return (
    <div className="stream-preview">
      <div className="stream-preview-tag" title={AGENT_TITLE}>{AGENT_NAME_CN} · 流式写入中</div>
      <div className="stream-preview-text">{text}</div>
    </div>
  );
}

function GlassInput({ chips, onClearChip, onSend, suggesting }) {
  const [val, setVal] = useState("");
  const taRef = useRef(null);
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(160, taRef.current.scrollHeight) + "px";
    }
  }, [val]);
  const send = () => {
    if (!val.trim()) return;
    onSend(val);
    setVal("");
  };
  return (
    <div className="glass-wrap">
      <StreamPreview text={suggesting} visible={!!suggesting} />
      <div className="glass-input">
        {chips.length > 0 && (
          <div className="glass-chips">
            {chips.map((c, i) => (
              <span key={i} className="glass-chip">
                <span className="chip-icon">📎</span>
                <span className="chip-loc">{c.blockId}</span>
                <span className="chip-text">"{c.text}"</span>
                <button className="chip-x" onClick={() => onClearChip(i)}>×</button>
              </span>
            ))}
          </div>
        )}
        <div className="glass-row">
          <textarea
            ref={taRef}
            rows={1}
            className="glass-ta"
            placeholder={chips.length ? "🪄 描述如何处理选中片段，或输入 / 唤起命令…" : `问 ${AGENT_NAME_CN} — 提问、写下一段，或输入 / 唤起命令`}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button className="glass-send-mini" onClick={send} aria-label="发送">↵</button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// App
// ────────────────────────────────────────────────────────────

function App() {
  const initialTheme = (() => {
    try { return localStorage.getItem("mx_theme") || "paper"; } catch (e) { return "paper"; }
  })();
  const t = { theme: initialTheme, fontSize: 16, density: "compact", showSelectionDemo: true };
  const [doc] = useState(INITIAL_DOC);
  const [chat, setChat] = useState(INITIAL_CHAT);
  const [sel, setSel] = useState(null);
  const [chips, setChips] = useState([]);
  const [suggesting, setSuggesting] = useState("");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Apply theme + size to document root
  useEffect(() => {
    document.documentElement.dataset.theme = t.theme;
    document.documentElement.style.setProperty("--user-font-size", t.fontSize + "px");
    document.documentElement.dataset.density = t.density;
  }, [t.theme, t.fontSize, t.density]);

  // Demo: auto-show a selection pill on mount so user sees the feature
  useEffect(() => {
    if (!t.showSelectionDemo) return;
    const id = setTimeout(() => {
      const el = document.querySelector('[data-block-id="p3"]');
      if (!el) return;
      const range = document.createRange();
      const txt = el.firstChild;
      if (!txt || !txt.textContent) return;
      const start = txt.textContent.indexOf("OER");
      if (start < 0) return;
      range.setStart(txt, start);
      range.setEnd(txt, start + 38);
      const r = range.getBoundingClientRect();
      const docEl = document.querySelector(".col-doc");
      if (!docEl) return;
      const dr = docEl.getBoundingClientRect();
      setSel({
        text: range.toString(),
        blockId: "p3",
        x: r.left - dr.left + r.width / 2,
        y: r.top - dr.top - 8,
      });
    }, 1200);
    return () => clearTimeout(id);
  }, [t.showSelectionDemo]);

  const onSelectAction = (kind, s) => {
    setChips(prev => [...prev, { blockId: s.blockId, text: s.text }]);
    setSel(null);
    window.getSelection?.()?.removeAllRanges();
  };

  const onSend = (text) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChat(prev => [...prev, { who: "user", t: time, text }]);
    setChips([]);
    // stream a fake reply
    const reply = "已根据上下文重写：把术语换成投资人语言，OER 改为「业主等价租金（房东自住租金估算）」，保留环比与同比的核心数字。完整版本已落到中栏 §1.2 第二段，原文做 diff 标记，请检查接受或调整。";
    let i = 0;
    const tick = setInterval(() => {
      i += 4;
      setSuggesting(reply.slice(0, i));
      if (i >= reply.length) {
        clearInterval(tick);
        setTimeout(() => {
          setSuggesting("");
          const t2 = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          setChat(prev => [...prev, { who: "agent", t: t2, text: reply }]);
        }, 1500);
      }
    }, 28);
  };

  return (
    <div className="app-shell">
      <WorkflowStrip />
      <div className={"three-col l-" + (leftCollapsed ? "c" : "o") + " r-" + (rightCollapsed ? "c" : "o")}>
        <ChatStream messages={chat} collapsed={leftCollapsed} onToggle={() => setLeftCollapsed(c => !c)} />
        <div className="col-doc-host">
          <DocumentStage doc={doc} onSelect={setSel} sentMsg={null} />
          <div className="glass-anchor">
            <GlassInput
              chips={chips}
              onClearChip={(i) => setChips(prev => prev.filter((_, idx) => idx !== i))}
              onSend={onSend}
              suggesting={suggesting}
            />
          </div>
          <SelectionPill sel={sel} onAct={onSelectAction} onClose={() => setSel(null)} />
        </div>
        <WorkspacePanel collapsed={rightCollapsed} onToggle={() => setRightCollapsed(c => !c)} />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
