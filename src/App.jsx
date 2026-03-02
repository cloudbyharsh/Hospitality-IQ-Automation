import { useState, useEffect } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Cell
} from "recharts";

// ── Fonts ────────────────────────────────────────────────────────────────────
const FontLoader = () => {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
  return null;
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  navy: "#0d1f3c",
  navyMid: "#162d52",
  navyLight: "#1e3a6e",
  gold: "#c8a96e",
  goldLight: "#e8d5a3",
  cream: "#faf8f4",
  white: "#ffffff",
  text: "#0d1f3c",
  textMid: "#4a5568",
  textLight: "#718096",
  success: "#2d7a4f",
  warn: "#b7791f",
  error: "#c53030",
  border: "#e2ddd6",
};

const s = {
  display: { fontFamily: "'Playfair Display', Georgia, serif" },
  body: { fontFamily: "'DM Sans', 'Trebuchet MS', sans-serif" },
};

// ── API ───────────────────────────────────────────────────────────────────────
// Calls /api/analyze (Vercel serverless proxy) so API key stays on the server.
// Falls back to direct Anthropic call in local dev if VITE_DEV_API_KEY is set.
const SYS = `You are an expert hospitality marketing analyst for the US market. 
You research businesses and competitors using web search, then return concise, accurate analysis.
CRITICAL: Respond ONLY with valid JSON. No markdown, no explanation, no code blocks. Just raw JSON.`;

async function claude(prompt, maxTokens = 4000) {
  const isLocal = import.meta.env.DEV;
  const endpoint = isLocal
    ? "https://api.anthropic.com/v1/messages"
    : "/api/analyze";

  const headers = { "Content-Type": "application/json" };
  if (isLocal) {
    headers["x-api-key"] = import.meta.env.VITE_DEV_API_KEY || "";
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: SYS,
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.content.filter(b => b.type === "text").map(b => b.text).join("\n");
}

function parseJSON(text) {
  const clean = text.trim();
  // Try direct parse
  try { return JSON.parse(clean); } catch {}
  // Strip markdown fences
  const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) try { return JSON.parse(fenced[1].trim()); } catch {}
  // Find first { ... }
  const braced = clean.match(/(\{[\s\S]*\})/s);
  if (braced) try { return JSON.parse(braced[1]); } catch {}
  return null;
}

// ── Score badge ───────────────────────────────────────────────────────────────
const SCORE_COLORS = { Excellent: C.success, Good: "#2b6cb0", Fair: C.warn, Poor: C.error };
const Badge = ({ label }) => (
  <span style={{
    background: SCORE_COLORS[label] || C.textMid,
    color: "#fff",
    padding: "2px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    ...s.body,
  }}>{label}</span>
);

const PriorityBadge = ({ p }) => {
  const colors = { High: C.error, Medium: C.warn, Low: C.success };
  return (
    <span style={{ background: colors[p] || C.textMid, color: "#fff", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, ...s.body }}>
      {p}
    </span>
  );
};

// ── Section card ──────────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{
    background: C.white, borderRadius: 12, padding: "28px 32px",
    border: `1px solid ${C.border}`, marginBottom: 20, ...style
  }}>
    {children}
  </div>
);

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ ...s.display, fontSize: 20, fontWeight: 700, color: C.navy }}>{children}</div>
    {sub && <div style={{ ...s.body, fontSize: 13, color: C.textLight, marginTop: 4 }}>{sub}</div>}
  </div>
);

// ── INPUT PAGE ────────────────────────────────────────────────────────────────
function InputPage({ form, setForm, onSubmit }) {
  const [touched, setTouched] = useState({});
  const valid = form.url.trim() && form.location.trim();

  const field = (key, label, placeholder, required = false, textarea = false) => (
    <div style={{ marginBottom: 22 }}>
      <label style={{ ...s.body, display: "block", fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 7, letterSpacing: "0.03em" }}>
        {label} {required && <span style={{ color: C.gold }}>*</span>}
      </label>
      {textarea ? (
        <textarea
          rows={3}
          placeholder={placeholder}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: `1.5px solid ${touched[key] && required && !form[key] ? C.error : C.border}`, ...s.body, fontSize: 14, color: C.text, background: C.cream, resize: "vertical", boxSizing: "border-box", outline: "none" }}
        />
      ) : (
        <input
          type="text"
          placeholder={placeholder}
          value={form[key]}
          onBlur={() => setTouched(t => ({ ...t, [key]: true }))}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: `1.5px solid ${touched[key] && required && !form[key] ? C.error : C.border}`, ...s.body, fontSize: 14, color: C.text, background: C.cream, boxSizing: "border-box", outline: "none" }}
        />
      )}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.navy, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "40px 48px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, background: C.gold, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 18 }}>⬡</span>
        </div>
        <div>
          <div style={{ ...s.display, fontSize: 15, fontWeight: 700, color: C.white }}>HospitalityIQ</div>
          <div style={{ ...s.body, fontSize: 11, color: C.goldLight, letterSpacing: "0.08em", textTransform: "uppercase" }}>Marketing Intelligence</div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "60px 24px 48px" }}>
        <div style={{ ...s.display, fontSize: 42, fontWeight: 700, color: C.white, lineHeight: 1.2, marginBottom: 16 }}>
          Know Your Market.<br />
          <span style={{ color: C.gold }}>Outperform</span> Your Competition.
        </div>
        <div style={{ ...s.body, fontSize: 16, color: C.goldLight, maxWidth: 520, margin: "0 auto" }}>
          AI-powered competitor research & LLM visibility analysis for US hospitality businesses.
        </div>
      </div>

      {/* Form card */}
      <div style={{ maxWidth: 620, margin: "0 auto 60px", width: "100%", padding: "0 24px", boxSizing: "border-box" }}>
        <div style={{ background: C.white, borderRadius: 16, padding: "40px 40px 36px", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
          <div style={{ ...s.display, fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Start Your Analysis</div>
          <div style={{ ...s.body, fontSize: 13, color: C.textMid, marginBottom: 28 }}>We'll research your market and deliver a full competitive report.</div>

          {field("url", "Client Website URL", "https://yourrestaurant.com", true)}
          {field("location", "Business Location", "Miami, FL  or  Chicago, IL", true)}

          {/* Segment */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ ...s.body, display: "block", fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 7, letterSpacing: "0.03em" }}>
              Hospitality Segment <span style={{ color: C.gold }}>*</span>
            </label>
            <select
              value={form.segment}
              onChange={e => setForm(f => ({ ...f, segment: e.target.value }))}
              style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: `1.5px solid ${C.border}`, ...s.body, fontSize: 14, color: C.text, background: C.cream, boxSizing: "border-box", outline: "none" }}
            >
              {["Restaurant & Café", "Hotel & Resort", "Spa & Wellness", "Event Venue", "Bar & Nightlife", "Catering Service"].map(o => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>

          {field("audience", "Target Audience (optional)", "e.g. Business travelers, families, millennials aged 25–40", false, true)}

          <button
            onClick={onSubmit}
            disabled={!valid}
            style={{
              width: "100%", padding: "15px 24px",
              background: valid ? C.navy : "#a0aec0",
              color: C.white,
              border: "none", borderRadius: 10, cursor: valid ? "pointer" : "not-allowed",
              ...s.body, fontSize: 15, fontWeight: 700, letterSpacing: "0.02em",
              transition: "background 0.2s",
            }}
          >
            Generate Marketing Intelligence Report →
          </button>

          <div style={{ ...s.body, fontSize: 12, color: C.textLight, textAlign: "center", marginTop: 14 }}>
            ⏱ Analysis takes 2–3 minutes &nbsp;·&nbsp; Uses web search to gather live data
          </div>
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 24 }}>
          {["Competitor Discovery", "SEO Gap Analysis", "LLM Visibility", "PDF Report", "No signup required"].map(f => (
            <span key={f} style={{ ...s.body, fontSize: 12, color: C.goldLight, background: "rgba(200,169,110,0.12)", border: "1px solid rgba(200,169,110,0.3)", padding: "6px 14px", borderRadius: 20 }}>
              ✦ {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ANALYZING PAGE ────────────────────────────────────────────────────────────
function AnalyzingPage({ steps, error, onBack }) {
  const icons = ["🔍", "🏨", "✨"];
  return (
    <div style={{ minHeight: "100vh", background: C.navy, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ ...s.display, fontSize: 28, fontWeight: 700, color: C.white, marginBottom: 10, textAlign: "center" }}>
        Analyzing Your Market
      </div>
      <div style={{ ...s.body, fontSize: 14, color: C.goldLight, marginBottom: 48, textAlign: "center" }}>
        This takes 2–3 minutes. We're searching the web in real time.
      </div>

      <div style={{ width: "100%", maxWidth: 520 }}>
        {steps.map((step, i) => {
          const isLoading = step.status === "loading";
          const isDone = step.status === "done";
          const isError = step.status === "error";
          const isPending = step.status === "pending";

          return (
            <div key={step.id} style={{
              background: isDone ? "rgba(45,122,79,0.15)" : isLoading ? "rgba(200,169,110,0.12)" : isError ? "rgba(197,48,48,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${isDone ? "rgba(45,122,79,0.4)" : isLoading ? "rgba(200,169,110,0.4)" : isError ? "rgba(197,48,48,0.4)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 12, padding: "20px 24px", marginBottom: 14,
              display: "flex", alignItems: "center", gap: 16,
              transition: "all 0.4s ease",
            }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>
                {isLoading ? (
                  <div style={{ width: 28, height: 28, border: `3px solid rgba(200,169,110,0.3)`, borderTop: `3px solid ${C.gold}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                ) : isDone ? "✅" : isError ? "❌" : <span style={{ opacity: 0.3 }}>{icons[i]}</span>}
              </div>
              <div>
                <div style={{ ...s.body, fontSize: 14, fontWeight: 600, color: isPending ? "rgba(255,255,255,0.4)" : C.white }}>{step.label}</div>
                {isLoading && <div style={{ ...s.body, fontSize: 12, color: C.goldLight, marginTop: 3 }}>Working on it…</div>}
                {isDone && <div style={{ ...s.body, fontSize: 12, color: "#68d391", marginTop: 3 }}>Complete</div>}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ maxWidth: 520, width: "100%", background: "rgba(197,48,48,0.2)", border: "1px solid rgba(197,48,48,0.5)", borderRadius: 12, padding: 20, marginTop: 16 }}>
          <div style={{ ...s.body, color: "#fc8181", fontWeight: 600, marginBottom: 6 }}>Analysis Failed</div>
          <div style={{ ...s.body, color: "#feb2b2", fontSize: 13 }}>{error}</div>
          <button onClick={onBack} style={{ marginTop: 14, padding: "10px 20px", background: "rgba(255,255,255,0.1)", color: C.white, border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer", ...s.body, fontSize: 13 }}>
            ← Try Again
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── REPORT PAGE ───────────────────────────────────────────────────────────────
const TABS = ["Executive Summary", "Client Overview", "Competitors", "Gap Analysis", "LLM Visibility", "Action Plan"];

function ReportPage({ report, onBack, onDownload, downloading }) {
  const [tab, setTab] = useState(0);
  const co = report.clientOverview || {};

  return (
    <div style={{ minHeight: "100vh", background: C.cream, ...s.body }}>
      {/* Top bar */}
      <div style={{ background: C.navy, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 64, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: C.white, padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, ...s.body }}>
            ← New Analysis
          </button>
          <div>
            <div style={{ ...s.display, color: C.white, fontSize: 16, fontWeight: 600 }}>{co.businessName || "Business Report"}</div>
            <div style={{ color: C.goldLight, fontSize: 11, letterSpacing: "0.06em" }}>Generated {report.generatedAt}</div>
          </div>
        </div>
        <button
          onClick={onDownload}
          disabled={downloading}
          style={{ background: C.gold, color: C.navy, border: "none", padding: "10px 22px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, ...s.body }}
        >
          {downloading ? "Preparing…" : "⬇ Download Report (HTML→PDF)"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "0 32px", display: "flex", gap: 4, overflowX: "auto" }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{
              padding: "14px 18px", border: "none", background: "none", cursor: "pointer",
              fontSize: 13, fontWeight: tab === i ? 700 : 400,
              color: tab === i ? C.navy : C.textMid,
              borderBottom: tab === i ? `3px solid ${C.gold}` : "3px solid transparent",
              whiteSpace: "nowrap", ...s.body,
              transition: "color 0.15s",
            }}
          >{t}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 60px" }}>
        {tab === 0 && <ExecutiveSummaryTab report={report} />}
        {tab === 1 && <ClientOverviewTab report={report} />}
        {tab === 2 && <CompetitorsTab report={report} />}
        {tab === 3 && <GapAnalysisTab report={report} />}
        {tab === 4 && <LLMVisibilityTab report={report} />}
        {tab === 5 && <ActionPlanTab report={report} />}
      </div>
    </div>
  );
}

// ── Tab: Executive Summary ────────────────────────────────────────────────────
function ExecutiveSummaryTab({ report }) {
  const co = report.clientOverview || {};
  const comps = report.competitors || [];
  const gaps = report.gapAnalysis || [];
  const llm = report.llmVisibility || {};
  const steps = report.actionableSteps || [];

  const highGaps = gaps.filter(g => g.gap === "High").length;
  const highActions = steps.filter(s => s.priority <= 3).length;

  return (
    <div>
      <Card style={{ background: C.navy, border: "none" }}>
        <div style={{ ...s.display, fontSize: 13, color: C.goldLight, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Executive Summary</div>
        <div style={{ ...s.body, fontSize: 15, color: "rgba(255,255,255,0.85)", lineHeight: 1.7 }}>
          {report.executiveSummary || `Analysis complete for ${co.businessName || "this business"} in ${report.location}.`}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Competitors Identified", value: comps.length, icon: "🏨" },
          { label: "High-Priority Gaps", value: highGaps, icon: "⚠️" },
          { label: "LLM Visibility", value: llm.currentStatus || "—", icon: "🤖" },
          { label: "Action Items", value: steps.length, icon: "✅" },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: "center", padding: "24px 20px" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ ...s.display, fontSize: 28, fontWeight: 700, color: C.navy, fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {(report.keyInsights || []).length > 0 && (
        <Card>
          <SectionTitle>Key Insights</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(report.keyInsights || []).map((ins, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ background: C.gold, color: C.navy, fontWeight: 700, fontSize: 11, minWidth: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
                <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>{ins}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Tab: Client Overview ──────────────────────────────────────────────────────
function ClientOverviewTab({ report }) {
  const co = report.clientOverview || {};
  const rows = [
    ["Business Name", co.businessName],
    ["Location", co.location],
    ["Business Type", co.businessSubType || co.category],
    ["Category", co.category],
    ["Price Range", co.priceRange],
    ["Target Audience", co.targetAudience],
    ["Unique Value Prop", co.uniqueValueProp],
    ["SEO Score", co.seoScore && <Badge label={co.seoScore} />],
    ["Social Presence", co.socialPresence && <Badge label={co.socialPresence} />],
  ].filter(r => r[1]);

  return (
    <div>
      <Card>
        <SectionTitle sub={`Source: ${report.clientUrl}`}>Client Overview</SectionTitle>
        <div style={{ ...s.body, fontSize: 14, color: C.textMid, lineHeight: 1.7, marginBottom: 20 }}>{co.description}</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "10px 0", fontSize: 13, fontWeight: 600, color: C.textMid, width: 180, verticalAlign: "top" }}>{k}</td>
                <td style={{ padding: "10px 0", fontSize: 14, color: C.text }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <SectionTitle>✅ Website Strengths</SectionTitle>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {(co.websiteStrengths || []).map((w, i) => (
              <li key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 14, color: C.text }}>
                <span style={{ color: C.success, fontWeight: 700, flexShrink: 0 }}>+</span>{w}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionTitle>⚠️ Website Weaknesses</SectionTitle>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {(co.websiteWeaknesses || []).map((w, i) => (
              <li key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 14, color: C.text }}>
                <span style={{ color: C.error, fontWeight: 700, flexShrink: 0 }}>−</span>{w}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {(co.keyServices || []).length > 0 && (
        <Card>
          <SectionTitle>Key Services & Offerings</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {co.keyServices.map((s, i) => (
              <span key={i} style={{ background: C.cream, border: `1px solid ${C.border}`, color: C.text, padding: "6px 14px", borderRadius: 20, fontSize: 13 }}>{s}</span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Tab: Competitors ──────────────────────────────────────────────────────────
function CompetitorsTab({ report }) {
  const comps = report.competitors || [];
  const co = report.clientOverview || {};
  const [selected, setSelected] = useState(0);
  const comp = comps[selected] || {};

  // Radar data
  const categories = (report.competitorComparison?.categories) || ["SEO", "Social", "Content", "Reviews", "Pricing", "UX"];
  const clientScores = report.competitorComparison?.scores?.[co.businessName] || [];
  const avgScores = report.competitorComparison?.scores?.["Industry Average"] || [];

  const radarData = categories.map((cat, i) => ({
    subject: cat,
    Client: clientScores[i] || 0,
    "Industry Avg": avgScores[i] || 0,
  }));

  return (
    <div>
      <Card>
        <SectionTitle sub={`${comps.length} competitors identified in your area`}>Competitive Landscape</SectionTitle>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {comps.map((c, i) => (
            <button key={i} onClick={() => setSelected(i)} style={{
              padding: "8px 16px", borderRadius: 8,
              background: selected === i ? C.navy : C.cream,
              color: selected === i ? C.white : C.text,
              border: `1px solid ${selected === i ? C.navy : C.border}`,
              cursor: "pointer", fontSize: 13, fontWeight: 600, ...s.body,
            }}>{c.name}</button>
          ))}
        </div>

        {/* Competitor detail */}
        <div style={{ background: C.cream, borderRadius: 10, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ ...s.display, fontSize: 18, fontWeight: 700, color: C.navy }}>{comp.name}</div>
              {comp.website && <a href={comp.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.navyLight }}>{comp.website}</a>}
              {comp.businessSubType && <div style={{ fontSize: 11, color: C.gold, fontWeight: 600, marginTop: 3 }}>📌 {comp.businessSubType}</div>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {comp.seoScore && <Badge label={comp.seoScore} />}
              {comp.socialPresence && <Badge label={comp.socialPresence} />}
            </div>
          </div>
          <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.6, marginBottom: 14 }}>{comp.description}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 8, letterSpacing: "0.05em" }}>STRENGTHS</div>
              {(comp.strengths || []).map((s, i) => <div key={i} style={{ fontSize: 13, color: C.text, marginBottom: 6 }}>✅ {s}</div>)}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 8, letterSpacing: "0.05em" }}>WEAKNESSES</div>
              {(comp.weaknesses || []).map((w, i) => <div key={i} style={{ fontSize: 13, color: C.text, marginBottom: 6 }}>⚠️ {w}</div>)}
            </div>
          </div>
          {comp.reviewScore && <div style={{ marginTop: 12, fontSize: 13, color: C.textMid }}>⭐ Reviews: <strong>{comp.reviewScore}</strong> &nbsp;·&nbsp; 💲 {comp.priceRange}</div>}
        </div>
      </Card>

      {radarData.some(d => d.Client > 0 || d["Industry Avg"] > 0) && (
        <Card>
          <SectionTitle>Performance Benchmark vs Industry Average</SectionTitle>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke={C.border} />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: C.textMid, fontFamily: "'DM Sans', sans-serif" }} />
                <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10, fill: C.textLight }} />
                <Radar name={co.businessName || "Client"} dataKey="Client" stroke={C.navy} fill={C.navy} fillOpacity={0.3} />
                <Radar name="Industry Avg" dataKey="Industry Avg" stroke={C.gold} fill={C.gold} fillOpacity={0.2} />
                <Legend wrapperStyle={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13 }} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Tab: Gap Analysis ─────────────────────────────────────────────────────────
function GapAnalysisTab({ report }) {
  const gaps = report.gapAnalysis || [];
  const gapColors = { High: C.error, Medium: C.warn, Low: C.success };

  const chartData = gaps.map(g => ({
    area: g.area,
    priority: g.gap === "High" ? 3 : g.gap === "Medium" ? 2 : 1,
    fill: gapColors[g.gap],
  }));

  return (
    <div>
      {chartData.length > 0 && (
        <Card>
          <SectionTitle>Gap Priority Overview</SectionTitle>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis type="number" domain={[0, 3]} ticks={[1, 2, 3]} tickFormatter={v => ["", "Low", "Med", "High"][v]} tick={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12 }} />
                <YAxis type="category" dataKey="area" width={140} tick={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fill: C.text }} />
                <Tooltip formatter={(v) => ["Low", "Medium", "High"][v - 1]} />
                <Bar dataKey="priority" radius={4}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle sub="Areas where competitors have an advantage">Gap & Opportunity Analysis</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {gaps.map((g, i) => (
            <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, borderLeft: `4px solid ${gapColors[g.gap] || C.textMid}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{g.area}</div>
                <PriorityBadge p={g.gap} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                <div><div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, marginBottom: 4 }}>YOUR STATUS</div><div style={{ fontSize: 13, color: C.text }}>{g.clientStatus}</div></div>
                <div><div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, marginBottom: 4 }}>COMPETITOR BENCHMARK</div><div style={{ fontSize: 13, color: C.text }}>{g.competitorBenchmark}</div></div>
              </div>
              <div style={{ background: "rgba(200,169,110,0.1)", borderRadius: 8, padding: 12, fontSize: 13, color: C.text }}>
                <strong style={{ color: C.gold }}>Opportunity: </strong>{g.opportunity}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Tab: LLM Visibility ───────────────────────────────────────────────────────
function LLMVisibilityTab({ report }) {
  const llm = report.llmVisibility || {};
  const recs = llm.recommendations || [];

  return (
    <div>
      <Card style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #1e3a6e 100%)", border: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 40 }}>🤖</div>
          <div>
            <div style={{ ...s.display, fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 4 }}>LLM Visibility Analysis</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ ...s.body, fontSize: 13, color: C.goldLight }}>Current Status:</span>
              {llm.currentStatus && <Badge label={llm.currentStatus} />}
            </div>
          </div>
        </div>
        <div style={{ ...s.body, fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.7 }}>
          {llm.summary}
        </div>
      </Card>

      <Card>
        <SectionTitle sub="How to appear in AI-generated answers (ChatGPT, Claude, Gemini, Perplexity)">Optimization Recommendations</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {recs.map((r, i) => {
            const impactColor = { High: C.success, Medium: C.warn, Low: C.textMid }[r.impact] || C.textMid;
            const effortColor = { Low: C.success, Medium: C.warn, High: C.error }[r.effort] || C.textMid;
            return (
              <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{r.category}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 11, background: `${impactColor}22`, color: impactColor, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>↑ {r.impact} Impact</span>
                    <span style={{ fontSize: 11, background: `${effortColor}22`, color: effortColor, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>⚡ {r.effort} Effort</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6 }}>{r.recommendation}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── Tab: Action Plan ──────────────────────────────────────────────────────────
function ActionPlanTab({ report }) {
  const steps = report.actionableSteps || [];

  return (
    <div>
      <Card>
        <SectionTitle sub="Prioritized list of recommended actions">Your 90-Day Action Plan</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 16, background: C.cream, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
              <div style={{
                minWidth: 36, height: 36, borderRadius: "50%",
                background: i < 3 ? C.navy : i < 6 ? C.navyLight : C.textLight,
                color: C.white, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}>{step.priority || i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{step.action}</div>
                <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6, marginBottom: 10 }}>{step.description}</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, color: C.textLight }}>📅 <strong>Timeline:</strong> {step.timeline}</div>
                  <div style={{ fontSize: 12, color: C.textLight }}>🎯 <strong>Impact:</strong> {step.expectedImpact}</div>
                </div>
                {(step.tools || []).length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {step.tools.map((t, j) => (
                      <span key={j} style={{ background: C.white, border: `1px solid ${C.border}`, color: C.textMid, padding: "3px 10px", borderRadius: 20, fontSize: 11 }}>🔧 {t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── PDF Generator (HTML print approach — works everywhere) ────────────────────
function generatePDF(report) {
  const co = report.clientOverview || {};
  const llm = report.llmVisibility || {};
  const gaps = report.gapAnalysis || [];
  const comps = report.competitors || [];
  const steps = report.actionableSteps || [];

  const gapColor = g => g === "High" ? "#c53030" : g === "Medium" ? "#b7791f" : "#2d7a4f";
  const impactColor = v => v === "High" ? "#2d7a4f" : v === "Medium" ? "#b7791f" : "#718096";
  const effortColor = v => v === "Low" ? "#2d7a4f" : v === "Medium" ? "#b7791f" : "#c53030";

  const esc = s => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${esc(co.businessName)} – Marketing Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',sans-serif;color:#1a202c;background:#fff;font-size:11pt}
  h1,h2,h3{font-family:'Playfair Display',Georgia,serif}
  .cover{background:#0d1f3c;color:#fff;min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:60px;page-break-after:always}
  .cover-accent{width:5px;height:80px;background:#c8a96e;margin-bottom:28px}
  .cover h1{font-size:36pt;line-height:1.2;margin-bottom:12px}
  .cover .biz{color:#c8a96e;font-size:18pt;margin-bottom:8px;font-family:'Playfair Display',serif}
  .cover .meta{color:#a0aec0;font-size:10pt}
  .cover-footer{margin-top:auto;padding-top:40px;border-top:1px solid rgba(255,255,255,0.15);color:#c8a96e;font-size:9pt}
  .page{padding:40px 50px;page-break-after:always}
  .page:last-child{page-break-after:auto}
  .section-header{background:#0d1f3c;color:#fff;padding:10px 16px;border-radius:6px;margin:28px 0 16px;font-size:10pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
  .summary-box{background:#0d1f3c;color:#fff;padding:24px 28px;border-radius:10px;margin-bottom:20px;line-height:1.7;font-size:11pt}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10pt}
  td,th{padding:8px 10px;border-bottom:1px solid #e2ddd6;vertical-align:top}
  th{background:#f7f6f3;font-weight:600;color:#4a5568;text-align:left;width:40%}
  .badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:9pt;font-weight:700;color:#fff}
  .gap-item{border:1px solid #e2ddd6;border-radius:8px;padding:16px;margin-bottom:12px}
  .gap-item .gap-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
  .gap-item .gap-title{font-weight:700;font-size:11pt;color:#0d1f3c}
  .gap-meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;font-size:9.5pt;color:#4a5568}
  .gap-opp{background:#faf6ec;border-left:3px solid #c8a96e;padding:10px 14px;border-radius:4px;font-size:10pt;color:#1a202c}
  .comp-item{background:#faf8f4;border:1px solid #e2ddd6;border-radius:8px;padding:16px;margin-bottom:12px}
  .comp-name{font-weight:700;font-size:12pt;color:#0d1f3c;margin-bottom:4px}
  .comp-desc{font-size:10pt;color:#4a5568;margin-bottom:10px;line-height:1.6}
  .comp-meta{font-size:9pt;color:#718096;margin-bottom:10px}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .col-label{font-size:9pt;font-weight:700;color:#4a5568;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}
  .col-item{font-size:10pt;color:#1a202c;margin-bottom:4px}
  .llm-rec{border:1px solid #e2ddd6;border-radius:8px;padding:14px;margin-bottom:10px}
  .llm-rec-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  .llm-rec-title{font-weight:700;font-size:11pt;color:#0d1f3c}
  .llm-tags{display:flex;gap:6px}
  .tag{padding:2px 8px;border-radius:20px;font-size:8.5pt;font-weight:600}
  .step-item{display:flex;gap:14px;background:#faf8f4;border:1px solid #e2ddd6;border-radius:8px;padding:16px;margin-bottom:10px}
  .step-num{min-width:30px;height:30px;border-radius:50%;background:#0d1f3c;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11pt;flex-shrink:0}
  .step-title{font-weight:700;font-size:11pt;color:#0d1f3c;margin-bottom:4px}
  .step-desc{font-size:10pt;color:#4a5568;line-height:1.6;margin-bottom:8px}
  .step-meta{font-size:9pt;color:#718096}
  .insight-item{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;font-size:10.5pt;line-height:1.6}
  .insight-dot{min-width:22px;height:22px;border-radius:50%;background:#c8a96e;color:#0d1f3c;font-weight:700;font-size:9pt;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .cover{min-height:100vh}
    .page{page-break-after:always}
  }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-accent"></div>
  <h1>Marketing Intelligence<br>Report</h1>
  <div class="biz">${esc(co.businessName)}</div>
  <div class="meta">${esc(report.location)} &nbsp;·&nbsp; Generated ${esc(report.generatedAt)}</div>
  <div class="cover-footer">HospitalityIQ &nbsp;·&nbsp; AI-Powered Marketing Intelligence for US Hospitality</div>
</div>

<!-- EXECUTIVE SUMMARY -->
<div class="page">
  <h2 style="color:#0d1f3c;font-size:22pt;margin-bottom:20px">Executive Summary</h2>
  <div class="summary-box">${esc(report.executiveSummary)}</div>

  <div class="section-header">Key Insights</div>
  ${(report.keyInsights || []).map((ins, i) => `
    <div class="insight-item">
      <div class="insight-dot">${i + 1}</div>
      <div>${esc(ins)}</div>
    </div>`).join("")}

  <div style="margin-top:28px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px;text-align:center">
    ${[
      { icon: "🏨", val: comps.length, label: "Competitors" },
      { icon: "⚠️", val: gaps.filter(g => g.gap === "High").length, label: "High-Priority Gaps" },
      { icon: "🤖", val: llm.currentStatus || "—", label: "LLM Visibility" },
      { icon: "✅", val: steps.length, label: "Action Items" },
    ].map(m => `<div style="background:#f7f6f3;border:1px solid #e2ddd6;border-radius:8px;padding:16px">
      <div style="font-size:22pt">${m.icon}</div>
      <div style="font-size:20pt;font-weight:700;color:#0d1f3c;font-family:'Playfair Display',serif;margin:4px 0">${m.val}</div>
      <div style="font-size:9pt;color:#718096">${m.label}</div>
    </div>`).join("")}
  </div>
</div>

<!-- CLIENT OVERVIEW -->
<div class="page">
  <h2 style="color:#0d1f3c;font-size:22pt;margin-bottom:20px">Client Overview</h2>
  <p style="color:#4a5568;margin-bottom:20px;line-height:1.7">${esc(co.description)}</p>

  <div class="section-header">Business Details</div>
  <table>
    ${[
      ["Business Name", co.businessName],
      ["Location", co.location],
      ["Category", co.category],
      ["Price Range", co.priceRange],
      ["Target Audience", co.targetAudience],
      ["SEO Score", co.seoScore],
      ["Social Presence", co.socialPresence],
      ["Unique Value Prop", co.uniqueValueProp],
    ].filter(r => r[1]).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}
  </table>

  <div class="cols" style="margin-top:20px">
    <div>
      <div class="section-header" style="margin-top:0">✅ Strengths</div>
      ${(co.websiteStrengths || []).map(s => `<div class="col-item" style="margin-bottom:8px;padding-left:12px;border-left:3px solid #2d7a4f">✅ ${esc(s)}</div>`).join("")}
    </div>
    <div>
      <div class="section-header" style="margin-top:0">⚠️ Weaknesses</div>
      ${(co.websiteWeaknesses || []).map(w => `<div class="col-item" style="margin-bottom:8px;padding-left:12px;border-left:3px solid #c53030">⚠️ ${esc(w)}</div>`).join("")}
    </div>
  </div>
</div>

<!-- COMPETITORS -->
<div class="page">
  <h2 style="color:#0d1f3c;font-size:22pt;margin-bottom:20px">Competitor Analysis</h2>
  ${comps.map((c, i) => `
    <div class="comp-item">
      <div class="comp-name">${i + 1}. ${esc(c.name)}</div>
      ${c.website ? `<div style="font-size:9pt;color:#718096;margin-bottom:6px">${esc(c.website)}</div>` : ""}
      <div class="comp-desc">${esc(c.description)}</div>
      <div class="comp-meta">
        ${c.priceRange ? `💲 ${esc(c.priceRange)}` : ""}
        ${c.reviewScore ? `&nbsp;·&nbsp; ⭐ ${esc(c.reviewScore)}` : ""}
        ${c.seoScore ? `&nbsp;·&nbsp; SEO: <span class="badge" style="background:#2b6cb0">${esc(c.seoScore)}</span>` : ""}
      </div>
      <div class="cols">
        <div>
          <div class="col-label">Strengths</div>
          ${(c.strengths || []).map(s => `<div class="col-item">✅ ${esc(s)}</div>`).join("")}
        </div>
        <div>
          <div class="col-label">Weaknesses</div>
          ${(c.weaknesses || []).map(w => `<div class="col-item">⚠️ ${esc(w)}</div>`).join("")}
        </div>
      </div>
    </div>`).join("")}
</div>

<!-- GAP ANALYSIS -->
<div class="page">
  <h2 style="color:#0d1f3c;font-size:22pt;margin-bottom:20px">Gap & Opportunity Analysis</h2>
  ${gaps.map(g => `
    <div class="gap-item" style="border-left:4px solid ${gapColor(g.gap)}">
      <div class="gap-header">
        <div class="gap-title">${esc(g.area)}</div>
        <span class="badge" style="background:${gapColor(g.gap)}">${esc(g.gap)} Priority</span>
      </div>
      <div class="gap-meta">
        <div><strong>Your Status:</strong><br>${esc(g.clientStatus)}</div>
        <div><strong>Competitor Benchmark:</strong><br>${esc(g.competitorBenchmark)}</div>
      </div>
      <div class="gap-opp"><strong>Opportunity:</strong> ${esc(g.opportunity)}</div>
    </div>`).join("")}
</div>

<!-- LLM VISIBILITY -->
<div class="page">
  <h2 style="color:#0d1f3c;font-size:22pt;margin-bottom:20px">LLM Visibility Recommendations</h2>
  <div class="summary-box">
    <div style="margin-bottom:8px">Current Status: <span class="badge" style="background:#c8a96e;color:#0d1f3c">${esc(llm.currentStatus)}</span></div>
    <div style="line-height:1.7">${esc(llm.summary)}</div>
  </div>
  ${(llm.recommendations || []).map(r => `
    <div class="llm-rec">
      <div class="llm-rec-header">
        <div class="llm-rec-title">${esc(r.category)}</div>
        <div class="llm-tags">
          <span class="tag" style="background:${impactColor(r.impact)}22;color:${impactColor(r.impact)}">↑ ${esc(r.impact)} Impact</span>
          <span class="tag" style="background:${effortColor(r.effort)}22;color:${effortColor(r.effort)}">⚡ ${esc(r.effort)} Effort</span>
        </div>
      </div>
      <div style="font-size:10pt;color:#4a5568;line-height:1.6">${esc(r.recommendation)}</div>
    </div>`).join("")}
</div>

<!-- ACTION PLAN -->
<div class="page">
  <h2 style="color:#0d1f3c;font-size:22pt;margin-bottom:20px">90-Day Action Plan</h2>
  ${steps.map((step, i) => `
    <div class="step-item">
      <div class="step-num">${step.priority || i + 1}</div>
      <div style="flex:1">
        <div class="step-title">${esc(step.action)}</div>
        <div class="step-desc">${esc(step.description)}</div>
        <div class="step-meta">
          📅 ${esc(step.timeline)} &nbsp;·&nbsp; 🎯 ${esc(step.expectedImpact)}
          ${(step.tools || []).length ? `&nbsp;·&nbsp; 🔧 ${step.tools.map(esc).join(", ")}` : ""}
        </div>
      </div>
    </div>`).join("")}
</div>

</body>
</html>`;

  // Encode as base64 data URI and trigger download directly — no pop-ups needed
  const b64 = btoa(unescape(encodeURIComponent(html)));
  const a = document.createElement("a");
  a.href = "data:text/html;base64," + b64;
  a.download = `${(co.businessName || "Report").replace(/\s+/g, "_")}_Marketing_Report.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("input");
  const [form, setForm] = useState({ url: "", location: "", audience: "", segment: "Restaurant & Café" });
  const [steps, setSteps] = useState([
    { id: 1, label: "Analyzing client website & extracting business data", status: "pending" },
    { id: 2, label: "Discovering & researching nearby competitors", status: "pending" },
    { id: 3, label: "Generating gap analysis & LLM recommendations", status: "pending" },
  ]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const setStepStatus = (id, status) => setSteps(p => p.map(s => s.id === id ? { ...s, status } : s));

  const runAnalysis = async () => {
    setPage("analyzing");
    setError("");
    setSteps(p => p.map(s => ({ ...s, status: "pending" })));

    try {
      // ── Step 1: Client analysis + competitor discovery
      setStepStatus(1, "loading");
      const r1 = await claude(`
You are analyzing a hospitality business for competitive intelligence.

Step 1 — Visit and analyze this website: ${form.url}
Identify the EXACT business sub-type (e.g. "luxury boutique hotel", "budget extended-stay motel", "full-service resort", "independent bed & breakfast", "business hotel", "vacation rental", "hostel", etc.)
Location: ${form.location}
${form.audience ? `Target Audience: ${form.audience}` : ""}

Step 2 — Find the top 5 DIRECT competitors.
CRITICAL RULES for competitor selection:
- Competitors MUST be the same specific sub-type as the client (e.g. if client is a luxury boutique hotel, only find other luxury boutique hotels — NOT spas, restaurants, resorts of a different tier, or any other segment)
- Competitors must be in the same city/area: ${form.location}
- Competitors must target the same customer type and price tier
- If you cannot find 5 exact matches, find fewer but keep them accurate — do NOT pad with different business types
- Use web search to verify each competitor is real, currently operating, and genuinely the same type

Return this exact JSON (no markdown, no extra text):
{
  "clientOverview": {
    "businessName": "string",
    "location": "string",
    "category": "string",
    "businessSubType": "e.g. luxury boutique hotel",
    "description": "2-3 sentence description of the business",
    "targetAudience": "string",
    "keyServices": ["string"],
    "priceRange": "$ / $$ / $$$ / $$$$",
    "uniqueValueProp": "string",
    "websiteStrengths": ["string","string","string"],
    "websiteWeaknesses": ["string","string","string"],
    "seoScore": "Poor",
    "socialPresence": "Fair"
  },
  "competitors": [
    {
      "name": "string",
      "website": "https://... or null",
      "businessSubType": "must match client sub-type exactly",
      "description": "string",
      "priceRange": "string",
      "strengths": ["string","string"],
      "weaknesses": ["string"],
      "seoScore": "Good",
      "socialPresence": "Excellent",
      "reviewScore": "4.2/5"
    }
  ]
}`);


      const d1 = parseJSON(r1);
      if (!d1 || !d1.clientOverview) throw new Error("Could not parse client data. Check the URL and try again.");
      setStepStatus(1, "done");

      // ── Step 2: Gap + competitor comparison
      setStepStatus(2, "loading");
      const r2 = await claude(`
Client business: ${JSON.stringify(d1.clientOverview)}
Competitors: ${JSON.stringify(d1.competitors)}

Perform a detailed competitive gap analysis. Use web search to find more competitor details if needed.

Return this exact JSON:
{
  "gapAnalysis": [
    { "area": "SEO & Search Visibility", "clientStatus": "string", "competitorBenchmark": "string", "gap": "High", "opportunity": "string" },
    { "area": "Social Media Presence", "clientStatus": "string", "competitorBenchmark": "string", "gap": "Medium", "opportunity": "string" },
    { "area": "Online Reviews & Reputation", "clientStatus": "string", "competitorBenchmark": "string", "gap": "Low", "opportunity": "string" },
    { "area": "Website UX & Design", "clientStatus": "string", "competitorBenchmark": "string", "gap": "Medium", "opportunity": "string" },
    { "area": "Content Marketing", "clientStatus": "string", "competitorBenchmark": "string", "gap": "High", "opportunity": "string" },
    { "area": "Pricing Transparency", "clientStatus": "string", "competitorBenchmark": "string", "gap": "Low", "opportunity": "string" }
  ],
  "competitorComparison": {
    "categories": ["SEO", "Social Media", "Content", "Reviews", "Pricing", "UX/Design"],
    "scores": {
      "${d1.clientOverview.businessName}": [4, 3, 3, 5, 4, 4],
      "Industry Average": [6, 7, 6, 7, 6, 7]
    }
  },
  "keyInsights": ["insight 1", "insight 2", "insight 3", "insight 4", "insight 5"]
}`);

      const d2 = parseJSON(r2);
      if (!d2 || !d2.gapAnalysis) throw new Error("Could not parse gap analysis. Please try again.");
      setStepStatus(2, "done");

      // ── Step 3: LLM visibility + action plan
      setStepStatus(3, "loading");
      const r3 = await claude(`
Business: ${JSON.stringify(d1.clientOverview)}
Gaps: ${JSON.stringify(d2.gapAnalysis)}
Segment: ${form.segment}

Provide LLM visibility optimization recommendations and a prioritized action plan for this US hospitality business.

Return this exact JSON:
{
  "llmVisibility": {
    "currentStatus": "Poor",
    "summary": "2-3 sentence overview of the business's current visibility in AI-generated answers (ChatGPT, Claude, Gemini, Perplexity) and why it matters.",
    "recommendations": [
      { "category": "Schema.org Markup", "recommendation": "detailed recommendation string", "impact": "High", "effort": "Low" },
      { "category": "Google Business Profile", "recommendation": "detailed recommendation string", "impact": "High", "effort": "Low" },
      { "category": "Content Authority Signals", "recommendation": "detailed recommendation string", "impact": "Medium", "effort": "Medium" },
      { "category": "Review Strategy", "recommendation": "detailed recommendation string", "impact": "High", "effort": "Medium" },
      { "category": "Structured Data & Metadata", "recommendation": "detailed recommendation string", "impact": "Medium", "effort": "Low" }
    ]
  },
  "actionableSteps": [
    { "priority": 1, "action": "string", "description": "string", "timeline": "Week 1-2", "expectedImpact": "string", "tools": ["Google Search Console"] },
    { "priority": 2, "action": "string", "description": "string", "timeline": "Week 2-4", "expectedImpact": "string", "tools": [] },
    { "priority": 3, "action": "string", "description": "string", "timeline": "Month 1-2", "expectedImpact": "string", "tools": [] },
    { "priority": 4, "action": "string", "description": "string", "timeline": "Month 2-3", "expectedImpact": "string", "tools": [] },
    { "priority": 5, "action": "string", "description": "string", "timeline": "Month 3", "expectedImpact": "string", "tools": [] }
  ],
  "executiveSummary": "3-4 sentence executive summary covering key findings, competitive position, and top recommendations."
}`);

      const d3 = parseJSON(r3);
      if (!d3 || !d3.llmVisibility) throw new Error("Could not generate recommendations. Please try again.");
      setStepStatus(3, "done");

      setReport({ ...d1, ...d2, ...d3, generatedAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), clientUrl: form.url, location: form.location });

      await new Promise(r => setTimeout(r, 600));
      setPage("report");

    } catch (err) {
      setError(err.message);
      setSteps(p => p.map(s => s.status === "loading" ? { ...s, status: "error" } : s));
    }
  };

  const handleDownload = () => {
    setDownloading(true);
    try { generatePDF(report); }
    catch (e) { alert("Could not open report. Please allow pop-ups for claude.ai and try again."); }
    finally { setTimeout(() => setDownloading(false), 1000); }
  };

  return (
    <>
      <FontLoader />
      {page === "input" && <InputPage form={form} setForm={setForm} onSubmit={runAnalysis} />}
      {page === "analyzing" && <AnalyzingPage steps={steps} error={error} onBack={() => setPage("input")} />}
      {page === "report" && <ReportPage report={report} onBack={() => setPage("input")} onDownload={handleDownload} downloading={downloading} />}
    </>
  );
}
