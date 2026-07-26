import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  aidsGuidelineMeta,
  aidsSections,
  artAbbreviationTable,
  artDrugClassTable,
  artInteractionTables,
  artPrinciples,
  artSelectionTables,
  artTimingTable,
  hepatitisCards,
  initialArtRegimens,
  irisCards,
  monitoringTables,
  oiCards,
  pepCards,
  pepFollowUpTable,
  pepRegimens,
  specialCards,
  stiTables,
  type AidsKeyPoint,
  type AidsRegimen,
  type AidsSectionId,
  type AidsTable,
} from "./aidsGuidelineData";

const ACCENT = "#7C3AED";

function Source({ text }: { text: string }) {
  return <div style={S.source}>來源：{text}</div>;
}

function Bullets({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <ul style={S.bulletList}>
      {items.map((item) => (
        <li key={item} style={S.bulletItem}>{item}</li>
      ))}
    </ul>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={S.sectionHeader}>
      <div style={S.sectionTitle}>{title}</div>
      {subtitle && <div style={S.sectionSubtitle}>{subtitle}</div>}
    </div>
  );
}

function KeyPointCard({ item }: { item: AidsKeyPoint }) {
  return (
    <section style={S.card}>
      <div style={S.cardTitle}>{item.title}</div>
      <div style={S.cardBody}>{item.body}</div>
      <Bullets items={item.bullets} />
      <Source text={item.source} />
    </section>
  );
}

function RegimenCard({ regimen }: { regimen: AidsRegimen }) {
  const metaRows = [
    ["商品中文", regimen.localName],
    ["處方架構", regimen.regimenType],
    ["Backbone", regimen.backbone],
    ["Third agent", regimen.thirdAgent],
    ["用藥建議", regimen.food],
    ["腎功能", regimen.renal],
    ["肝功能", regimen.hepatic],
    ["病毒量限制", regimen.viralLoadLimit],
    ["CD4 限制", regimen.cd4Limit],
    ["HBV", regimen.hbv],
    ["切半/磨碎", regimen.crush],
    ["常見副作用", regimen.keyAdverse],
  ].filter(([, value]) => Boolean(value));

  return (
    <section style={S.card}>
      <div style={S.rowTop}>
        <div>
          <div style={S.cardTitle}>{regimen.name}</div>
          <div style={S.muted}>{regimen.category}</div>
        </div>
        <span style={S.badge}>{regimen.dose}</span>
      </div>
      <div style={S.cardBody}>{regimen.whenToUse}</div>
      {regimen.components && (
        <div style={S.tagWrap}>
          {regimen.components.map((component) => (
            <span key={`${regimen.id}-${component.abbr}`} style={S.tag}>
              {component.abbr} <span style={S.tagMuted}>{component.drugClass}</span>
              {component.dose ? ` ${component.dose}` : ""}
            </span>
          ))}
        </div>
      )}
      {metaRows.length > 0 && (
        <div style={S.metaGrid}>
          {metaRows.map(([label, value]) => (
            <div key={`${regimen.id}-${label}`} style={S.metaItem}>
              <span style={S.label}>{label}</span>
              {value}
            </div>
          ))}
        </div>
      )}
      <Bullets items={regimen.cautions} />
      <Source text={regimen.source} />
    </section>
  );
}

function SimpleTableCard({ table }: { table: AidsTable }) {
  return (
    <section style={S.card}>
      <div style={S.cardTitle}>{table.title}</div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              {table.columns.map((column) => (
                <th key={column} style={S.th}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={`${table.title}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${table.title}-${rowIndex}-${cellIndex}`} style={cellIndex === 0 ? S.tdStrong : S.td}>
                    {cell || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Bullets items={table.notes} />
      <Source text={table.source} />
    </section>
  );
}

function ArtView() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialArtRegimens;
    return initialArtRegimens.filter((regimen) =>
      [
        regimen.name,
        regimen.localName,
        regimen.category,
        regimen.regimenType,
        regimen.backbone,
        regimen.thirdAgent,
        regimen.renal,
        regimen.hbv,
        regimen.whenToUse,
        ...(regimen.components || []).map((component) => `${component.abbr} ${component.generic} ${component.drugClass}`),
        ...regimen.cautions,
      ].join(" ").toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div>
      <SectionHeader title="初始 ART 與快速治療" subtitle="以台灣第一線處方與開始治療前檢查為核心。" />
      {artPrinciples.map((item) => <KeyPointCard key={item.title} item={item} />)}
      <div style={S.subhead}>處方選擇架構</div>
      {artSelectionTables.map((table) => <SimpleTableCard key={table.title} table={table} />)}
      <SimpleTableCard table={artDrugClassTable} />
      <div style={S.subhead}>ART 重大交互作用</div>
      {artInteractionTables.map((table) => <SimpleTableCard key={table.title} table={table} />)}
      <div style={S.subhead}>第一線與常見轉換處方</div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜尋 Biktarvy、HBV、eGFR、NRTI、RPV、Dovato..."
        style={S.searchInput}
      />
      {filtered.map((regimen) => <RegimenCard key={regimen.id} regimen={regimen} />)}
      {filtered.length === 0 && <div style={S.empty}>找不到符合的 ART 處方</div>}
      <div style={S.subhead}>縮寫原文</div>
      <SimpleTableCard table={artAbbreviationTable} />
    </div>
  );
}

function MonitoringView() {
  return (
    <div>
      <SectionHeader title="病毒量、CD4 與初次評估" subtitle="把第 2 章表 2-1、2-2、2-3 整理成追蹤時程。" />
      {monitoringTables.map((table) => <SimpleTableCard key={table.title} table={table} />)}
    </div>
  );
}

function OiView() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return oiCards;
    return oiCards.filter((card) => [card.title, card.body, ...(card.bullets || [])].join(" ").toLowerCase().includes(q));
  }, [query]);

  return (
    <div>
      <SectionHeader title="伺機性感染預防與治療" subtitle="常用 CD4 門檻、首選處方、停用預防條件。" />
      <div style={S.subhead}>IRIS 與 ART 時機</div>
      {irisCards.map((item) => <KeyPointCard key={item.title} item={item} />)}
      <SimpleTableCard table={artTimingTable} />
      <div style={S.subhead}>OI 預防與治療速查</div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜尋 PJP、Toxo、MAC、CMV、TB..."
        style={S.searchInput}
      />
      {filtered.map((item) => <KeyPointCard key={item.title} item={item} />)}
      {filtered.length === 0 && <div style={S.empty}>找不到符合的 OI 資料</div>}
    </div>
  );
}

function HepatitisView() {
  return (
    <div>
      <SectionHeader title="HIV 與病毒性肝炎共病" subtitle="HBV active ART、HCV reflex testing 與停藥 flare 風險。" />
      {hepatitisCards.map((item) => <KeyPointCard key={item.title} item={item} />)}
    </div>
  );
}

function PepView() {
  return (
    <div>
      <SectionHeader title="職業 / 非職業暴露後預防" subtitle="24 小時內最佳，不得晚於 72 小時，療程 28 天。" />
      {pepCards.map((item) => <KeyPointCard key={item.title} item={item} />)}
      <div style={S.subhead}>建議處方</div>
      {pepRegimens.map((regimen) => <RegimenCard key={regimen.id} regimen={regimen} />)}
      <SimpleTableCard table={pepFollowUpTable} />
    </div>
  );
}

function StiView() {
  return (
    <div>
      <SectionHeader title="性傳染病篩檢與治療" subtitle="第 12 章常用表格，包含篩檢頻次與高頻處方。" />
      {stiTables.map((table) => <SimpleTableCard key={table.title} table={table} />)}
    </div>
  );
}

function SpecialView() {
  return (
    <div>
      <SectionHeader title="特殊情境入口" subtitle="先整理成提醒卡；可再依需求拆成母嬰、腫瘤、物質使用等細頁。" />
      {specialCards.map((item) => <KeyPointCard key={item.title} item={item} />)}
    </div>
  );
}

function CurrentView({ active }: { active: AidsSectionId }) {
  if (active === "art") return <ArtView />;
  if (active === "monitoring") return <MonitoringView />;
  if (active === "oi") return <OiView />;
  if (active === "hepatitis") return <HepatitisView />;
  if (active === "pep") return <PepView />;
  if (active === "sti") return <StiView />;
  return <SpecialView />;
}

export default function AidsGuideline() {
  const [active, setActive] = useState<AidsSectionId>("art");

  return (
    <div>
      <header style={S.header}>
        <div style={S.kicker}>Taiwan HIV Guideline</div>
        <h1 style={S.title}>{aidsGuidelineMeta.title}</h1>
        <div style={S.subtitle}>{aidsGuidelineMeta.subtitle}</div>
      </header>

      <section style={S.notice}>
        <div style={S.noticeTitle}>資料來源</div>
        <div>{aidsGuidelineMeta.source}</div>
        <div style={{ marginTop: 6 }}>{aidsGuidelineMeta.notice}</div>
      </section>

      <nav style={S.tabRow} aria-label="AIDS guideline sections">
        {aidsSections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActive(section.id)}
            style={{ ...S.tab, ...(active === section.id ? S.tabActive : {}) }}
          >
            <span style={S.tabLabel}>{section.label}</span>
            <span style={S.tabShort}>{section.short}</span>
          </button>
        ))}
      </nav>

      <CurrentView active={active} />
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  header: { textAlign: "center", padding: "16px 0 18px" },
  kicker: { fontSize: 12, fontWeight: 800, color: ACCENT, textTransform: "uppercase", letterSpacing: 0, marginBottom: 6 },
  title: { fontSize: 26, lineHeight: 1.2, fontWeight: 850, color: "#0F172A", margin: 0, letterSpacing: 0 },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 4 },
  notice: { background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 8, padding: 12, color: "#4C1D95", fontSize: 12, lineHeight: 1.55, marginBottom: 14 },
  noticeTitle: { fontWeight: 850, marginBottom: 4 },
  tabRow: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 12 },
  tab: { flex: "0 0 auto", border: "1.5px solid #DDE7EE", background: "#fff", borderRadius: 8, padding: "9px 10px", color: "#475569", cursor: "pointer", minWidth: 92, textAlign: "left" },
  tabActive: { border: `1.5px solid ${ACCENT}`, background: "#F5F3FF", color: "#6D28D9" },
  tabLabel: { display: "block", fontSize: 13, fontWeight: 850, whiteSpace: "nowrap" },
  tabShort: { display: "block", fontSize: 11, color: "#94A3B8", marginTop: 2, whiteSpace: "nowrap" },
  sectionHeader: { margin: "10px 0 12px" },
  sectionTitle: { fontSize: 18, fontWeight: 850, color: "#0F172A", lineHeight: 1.3 },
  sectionSubtitle: { fontSize: 13, color: "#64748B", lineHeight: 1.5, marginTop: 4 },
  subhead: { fontSize: 13, fontWeight: 850, color: "#6D28D9", textTransform: "uppercase", letterSpacing: 0, margin: "18px 0 10px" },
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" },
  cardTitle: { fontSize: 15, fontWeight: 850, color: "#0F172A", lineHeight: 1.35 },
  cardBody: { fontSize: 13, color: "#334155", lineHeight: 1.6, marginTop: 7 },
  muted: { fontSize: 12, color: "#64748B", marginTop: 3, lineHeight: 1.45 },
  bulletList: { margin: "9px 0 0", paddingLeft: 18, color: "#334155", fontSize: 13, lineHeight: 1.55 },
  bulletItem: { marginBottom: 4 },
  source: { marginTop: 10, fontSize: 11, color: "#94A3B8", lineHeight: 1.45 },
  rowTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  badge: { flexShrink: 0, display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "4px 8px", background: "#EDE9FE", color: "#5B21B6", fontSize: 11, fontWeight: 750, lineHeight: 1.2, maxWidth: 150, textAlign: "center" },
  tagWrap: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: { borderRadius: 999, padding: "5px 8px", background: "#F5F3FF", color: "#5B21B6", border: "1px solid #DDD6FE", fontSize: 11, fontWeight: 850, lineHeight: 1.2 },
  tagMuted: { color: "#7C3AED", fontWeight: 700 },
  metaGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 8, marginTop: 11 },
  metaItem: { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 9, color: "#334155", fontSize: 12, lineHeight: 1.45 },
  label: { display: "block", color: "#64748B", fontSize: 10, fontWeight: 850, textTransform: "uppercase", letterSpacing: 0, marginBottom: 3 },
  tableWrap: { overflowX: "auto", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, margin: "10px 0 8px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 560 },
  th: { padding: "9px 8px", borderBottom: "2px solid #E2E8F0", textAlign: "left", color: "#475569", fontWeight: 850, background: "#F8FAFC" },
  td: { padding: "9px 8px", borderBottom: "1px solid #F1F5F9", color: "#334155", verticalAlign: "top", minWidth: 140 },
  tdStrong: { padding: "9px 8px", borderBottom: "1px solid #F1F5F9", color: "#0F172A", fontWeight: 850, verticalAlign: "top", minWidth: 120 },
  searchInput: { width: "100%", padding: "11px 12px", borderRadius: 8, border: "1.5px solid #DDE7EE", background: "#fff", color: "#0F172A", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 },
  empty: { textAlign: "center", color: "#94A3B8", fontSize: 13, padding: 18 },
};
