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
  prepCards,
  prepFollowUpTable,
  prepRegimens,
  specialCards,
  stiTables,
  type AidsKeyPoint,
  type AidsRegimen,
  type AidsSectionId,
  type AidsTable,
} from "./aidsGuidelineData";

const ACCENT = "#7C3AED";
type ArtDrugFilter = "all" | "firstLine" | "secondLine";

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
  const componentFullNames = (regimen.components || [])
    .filter((component) => component.generic)
    .map((component) => `${component.abbr} = ${component.generic}`);
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
      {componentFullNames.length > 0 && (
        <div style={S.fullNameBox}>
          <span style={S.fullNameLabel}>成分全名</span>
          <span style={S.fullNameText}>{componentFullNames.join("; ")}</span>
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
  return (
    <div>
      <SectionHeader title="初始 ART 與快速治療" subtitle="以台灣第一線處方、開始治療前檢查與處方架構為核心。" />
      {artPrinciples.map((item) => <KeyPointCard key={item.title} item={item} />)}
      <div style={S.subhead}>處方選擇架構</div>
      {artSelectionTables.map((table) => <SimpleTableCard key={table.title} table={table} />)}
      <SimpleTableCard table={artDrugClassTable} />
      <div style={S.subhead}>縮寫原文</div>
      <SimpleTableCard table={artAbbreviationTable} />
    </div>
  );
}

function ArtDrugsView() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ArtDrugFilter>("all");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialArtRegimens.filter((regimen) => {
      const isFirstLine = regimen.category.includes("第一線");
      if (filter === "firstLine" && !isFirstLine) return false;
      if (filter === "secondLine" && isFirstLine) return false;
      if (!q) return true;
      return (
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
    });
  }, [filter, query]);

  const filterOptions: Array<{ id: ArtDrugFilter; label: string; hint: string }> = [
    { id: "all", label: "全部", hint: `${initialArtRegimens.length} 種` },
    { id: "firstLine", label: "第一線", hint: `${initialArtRegimens.filter((regimen) => regimen.category.includes("第一線")).length} 種` },
    { id: "secondLine", label: "第二線 / 轉換", hint: `${initialArtRegimens.filter((regimen) => !regimen.category.includes("第一線")).length} 種` },
  ];

  return (
    <div>
      <SectionHeader title="ART 藥物速查" subtitle="用搜尋或第一線/第二線篩選，快速找到單錠處方與常見轉換處方。" />
      <div style={S.filterRow}>
        {filterOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setFilter(option.id)}
            style={{ ...S.filterButton, ...(filter === option.id ? S.filterButtonActive : {}) }}
          >
            <span style={S.filterLabel}>{option.label}</span>
            <span style={S.filterHint}>{option.hint}</span>
          </button>
        ))}
      </div>
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

function ArtInteractionsView() {
  return (
    <div>
      <SectionHeader title="ART 重大交互作用" subtitle="把需要立即改藥、錯開、避免或加強監測的情境集中放在這裡。" />
      {artInteractionTables.map((table) => <SimpleTableCard key={table.title} table={table} />)}
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

type PrepExposure = "maleSexual" | "otherSexual" | "injection";

function PrepView() {
  const [recentExposure, setRecentExposure] = useState(false);
  const [acuteSymptoms, setAcuteSymptoms] = useState(false);
  const [exposure, setExposure] = useState<PrepExposure>("maleSexual");
  const [hbv, setHbv] = useState(false);
  const [canPlan, setCanPlan] = useState(true);
  const [crcl, setCrcl] = useState("90");
  const renal = Number(crcl);

  const decision = useMemo(() => {
    if (recentExposure) {
      return {
        tone: "urgent",
        title: "先評估 PEP，不要只開 PrEP",
        body: "若高風險暴露仍在 72 小時內，應儘快啟動 PEP 評估；完成 28 天療程並排除 HIV 後，可無縫銜接 PrEP。",
      };
    }
    if (acuteSymptoms) {
      return {
        tone: "urgent",
        title: "先排除急性 HIV 感染",
        body: "暫緩 PrEP，安排 HIV Ag/Ab 與 HIV RNA/NAAT；不能只靠快速抗體陰性就開始。",
      };
    }
    if (Number.isFinite(renal) && renal < 30) {
      return {
        tone: "caution",
        title: "不建議口服 tenofovir-based PrEP",
        body: "eCrCl <30 mL/min 時不建議 TDF/FTC 或 TAF/FTC；可由專科評估 CAB-LA、交互作用與回診可行性。",
      };
    }
    const dailyReason = exposure !== "maleSexual" || hbv || !canPlan;
    const oral = renal >= 60 ? "TDF/FTC daily" : "TAF/FTC daily（僅限適用族群）";
    if (dailyReason) {
      return {
        tone: "ok",
        title: "優先每日型 PrEP",
        body: `${oral}；若不適合口服或偏好長效，可評估 CAB-LA。${hbv ? "慢性 HBV 不採間歇 2-1-1，停藥也要規劃 HBV 追蹤。" : ""}`,
      };
    }
    return {
      tone: "ok",
      title: "每日型或 TDF/FTC 2-1-1 都可進一步評估",
      body: renal >= 60
        ? "若屬符合指引的成人、能預先安排性行為且沒有慢性 HBV，可選每日 TDF/FTC 或 2-1-1；若容易漏算，仍以每日型較直覺。"
        : "eCrCl 30-59 mL/min 不適合 TDF/FTC，因此不能用 2-1-1；僅在適用族群評估每日 TAF/FTC，或考慮 CAB-LA。",
    };
  }, [acuteSymptoms, canPlan, exposure, hbv, recentExposure, renal]);

  const toneStyle = decision.tone === "urgent" ? S.decisionUrgent : decision.tone === "caution" ? S.decisionCaution : S.decisionOk;

  return (
    <div>
      <SectionHeader title="PrEP 暴露前預防性投藥" subtitle="先排除近期暴露與急性 HIV，再依暴露型態、HBV、腎功能與服藥習慣選每日、2-1-1 或 CAB-LA。" />
      <section style={S.decisionPanel}>
        <div style={S.cardTitle}>方式判斷</div>
        <div style={S.questionGrid}>
          <label style={S.checkRow}><input type="checkbox" checked={recentExposure} onChange={(e) => setRecentExposure(e.target.checked)} />72 小時內剛發生高風險暴露</label>
          <label style={S.checkRow}><input type="checkbox" checked={acuteSymptoms} onChange={(e) => setAcuteSymptoms(e.target.checked)} />近期暴露合併疑似急性 HIV 症狀</label>
          <label style={S.fieldLabel}>主要暴露型態
            <select value={exposure} onChange={(e) => setExposure(e.target.value as PrepExposure)} style={S.select}>
              <option value="maleSexual">符合指引的成人男性性暴露</option>
              <option value="otherSexual">順性別女性 / 跨性別族群性暴露</option>
              <option value="injection">注射藥物/血液暴露</option>
            </select>
          </label>
          <label style={S.fieldLabel}>eCrCl (mL/min)
            <input type="number" min="0" value={crcl} onChange={(e) => setCrcl(e.target.value)} style={S.input} />
          </label>
          <label style={S.checkRow}><input type="checkbox" checked={hbv} onChange={(e) => setHbv(e.target.checked)} />慢性 HBV / HBsAg positive</label>
          <label style={S.checkRow}><input type="checkbox" checked={canPlan} onChange={(e) => setCanPlan(e.target.checked)} />能在性行為前 2-24 小時安排首劑</label>
        </div>
        <div style={{ ...S.decisionResult, ...toneStyle }}>
          <div style={S.decisionTitle}>{decision.title}</div>
          <div>{decision.body}</div>
        </div>
      </section>
      {prepCards.map((item) => <KeyPointCard key={item.title} item={item} />)}
      <div style={S.subhead}>處方方式</div>
      {prepRegimens.map((regimen) => <RegimenCard key={regimen.id} regimen={regimen} />)}
      <SimpleTableCard table={prepFollowUpTable} />
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
  if (active === "artDrugs") return <ArtDrugsView />;
  if (active === "artInteractions") return <ArtInteractionsView />;
  if (active === "monitoring") return <MonitoringView />;
  if (active === "oi") return <OiView />;
  if (active === "hepatitis") return <HepatitisView />;
  if (active === "prep") return <PrepView />;
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
  filterRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))", gap: 8, margin: "4px 0 14px" },
  filterButton: { border: "1.5px solid #E2E8F0", background: "#FFFFFF", borderRadius: 8, padding: "9px 10px", color: "#475569", cursor: "pointer", textAlign: "left" },
  filterButtonActive: { borderColor: ACCENT, background: "#F5F3FF", color: "#6D28D9" },
  filterLabel: { display: "block", fontSize: 14, fontWeight: 850, lineHeight: 1.25 },
  filterHint: { display: "block", fontSize: 11, color: "#94A3B8", marginTop: 3, lineHeight: 1.25 },
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
  fullNameBox: { marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "#FAF5FF", border: "1px solid #E9D5FF", color: "#4C1D95", fontSize: 12, lineHeight: 1.55 },
  fullNameLabel: { display: "block", marginBottom: 3, color: "#7C3AED", fontWeight: 850 },
  fullNameText: { display: "block", color: "#4C1D95", overflowWrap: "anywhere" },
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
  decisionPanel: { background: "#fff", border: "1px solid #DDD6FE", borderRadius: 8, padding: 14, marginBottom: 12 },
  questionGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10, marginTop: 12 },
  checkRow: { minHeight: 42, display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid #E2E8F0", borderRadius: 8, color: "#334155", fontSize: 13, fontWeight: 700 },
  fieldLabel: { display: "grid", gap: 5, color: "#475569", fontSize: 12, fontWeight: 800 },
  select: { width: "100%", minHeight: 42, padding: "8px 10px", border: "1px solid #CBD5E1", borderRadius: 8, background: "#fff", color: "#0F172A", fontSize: 13 },
  input: { width: "100%", minHeight: 42, padding: "8px 10px", border: "1px solid #CBD5E1", borderRadius: 8, background: "#fff", color: "#0F172A", fontSize: 13, boxSizing: "border-box" },
  decisionResult: { marginTop: 12, borderRadius: 8, padding: 12, fontSize: 13, lineHeight: 1.6 },
  decisionTitle: { fontWeight: 850, marginBottom: 3 },
  decisionOk: { background: "#ECFDF5", border: "1px solid #A7F3D0", color: "#065F46" },
  decisionCaution: { background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" },
  decisionUrgent: { background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" },
};
