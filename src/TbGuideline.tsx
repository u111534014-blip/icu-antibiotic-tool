import { useMemo, useState } from "react";
import {
  activeTbCards,
  activeTbNewPatientRegimens,
  activeTbRetreatmentRegimens,
  adverseReactionRules,
  diagnosisCards,
  drugResistantTbTables,
  ltbiPrinciples,
  ltbiRegimens,
  monitoringTimeline,
  rechallengeProtocols,
  regimenAdjustmentRows,
  specialPopulationCards,
  tbDrugCards,
  tbGuidelineMeta,
  tbSections,
  tbTermCards,
  type TbKeyPoint,
  type TbActiveRegimen,
  type TbLtbiRegimen,
  type TbSectionId,
  type TbSimpleTable,
} from "./tbGuidelineData";

const ACCENT = "#0D9488";

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

function KeyPointCard({ item }: { item: TbKeyPoint }) {
  return (
    <section style={S.card}>
      <div style={S.cardTitle}>{item.title}</div>
      <div style={S.cardBody}>{item.body}</div>
      <Bullets items={item.bullets} />
      <Source text={item.source} />
    </section>
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

function DiagnosisView() {
  return (
    <div>
      <SectionHeader title="疑似 TB 診斷流程" subtitle="從症狀與影像出發，盡量取得細菌學證據。" />
      <div style={S.subhead}>常用檢驗名詞</div>
      {tbTermCards.map((item) => <KeyPointCard key={item.title} item={item} />)}
      <div style={S.subhead}>診斷判讀</div>
      {diagnosisCards.map((item) => <KeyPointCard key={item.title} item={item} />)}
    </div>
  );
}

function ActiveRegimenCard({ regimen }: { regimen: TbActiveRegimen }) {
  return (
    <section style={S.card}>
      <div style={S.rowTop}>
        <div>
          <div style={S.cardTitle}>{regimen.phase}：{regimen.regimen}</div>
          <div style={S.muted}>{regimen.duration} · 首選複方：{regimen.preferredFdc}</div>
        </div>
        <span style={S.badge}>{regimen.phase}</span>
      </div>
      <div style={S.noteBox}>{regimen.tabletStrength}</div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>體重</th>
              <th style={S.th}>建議顆數</th>
              <th style={S.th}>備註</th>
            </tr>
          </thead>
          <tbody>
            {regimen.doseRows.map((row) => (
              <tr key={row.weight}>
                <td style={S.tdStrong}>{row.weight}</td>
                <td style={S.td}>{row.tablets}</td>
                <td style={S.td}>{row.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Bullets items={[...regimen.alternatives, ...regimen.notes]} />
      <Source text={regimen.source} />
    </section>
  );
}

function ActiveTbView() {
  return (
    <div>
      <SectionHeader title="活動性 TB 治療" subtitle="新病人與再治處方直接列在這裡，不用再跳到藥物速查。" />
      <div style={S.subhead}>新病人標準處方</div>
      {activeTbNewPatientRegimens.map((regimen) => <ActiveRegimenCard key={regimen.id} regimen={regimen} />)}
      <div style={S.subhead}>曾接受治療病人（再治）</div>
      {activeTbRetreatmentRegimens.map((regimen) => <ActiveRegimenCard key={regimen.id} regimen={regimen} />)}
      <div style={S.subhead}>治療原則與延長療程</div>
      {activeTbCards.map((item) => <KeyPointCard key={item.title} item={item} />)}
    </div>
  );
}

function MonitoringView() {
  return (
    <div>
      <SectionHeader title="治療監測與副作用處理" subtitle="第五章整理成回診追蹤、停藥門檻、重新試藥與處方調整。" />

      <div style={S.subhead}>治療期間追蹤</div>
      {monitoringTimeline.map((item) => (
        <section key={item.title} style={S.compactCard}>
          <div style={S.rowTop}>
            <div style={S.cardTitle}>{item.title}</div>
            {item.timing && <span style={S.badge}>{item.timing}</span>}
          </div>
          <div style={S.cardBody}>{item.action}</div>
          <Source text={item.source} />
        </section>
      ))}

      <div style={S.subhead}>常見停藥與處理門檻</div>
      {adverseReactionRules.map((item) => (
        <section key={item.title} style={S.compactCard}>
          <div style={S.cardTitle}>{item.title}</div>
          <div style={S.cardBody}>{item.action}</div>
          {item.stopRule && <div style={S.noteBox}>{item.stopRule}</div>}
          <Source text={item.source} />
        </section>
      ))}

      <div style={S.subhead}>重新試藥 / 減敏流程</div>
      {rechallengeProtocols.map((protocol) => (
        <section key={protocol.title} style={S.card}>
          <div style={S.cardTitle}>{protocol.title}</div>
          <Bullets items={protocol.notes} />
          <ol style={S.stepList}>
            {protocol.steps.map((step) => (
              <li key={step} style={S.stepItem}>{step}</li>
            ))}
          </ol>
          <Source text={protocol.source} />
        </section>
      ))}

      <div style={S.subhead}>不良反應後處方調整速查</div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>無法使用</th>
              <th style={S.th}>同類替代</th>
              <th style={S.th}>無藥敏結果</th>
              <th style={S.th}>藥敏已知</th>
            </tr>
          </thead>
          <tbody>
            {regimenAdjustmentRows.map((row) => (
              <tr key={row.unavailable}>
                <td style={S.tdStrong}>{row.unavailable}</td>
                <td style={S.td}>{row.substitute}</td>
                <td style={S.td}>{row.unknownDst}</td>
                <td style={S.td}>{row.knownDst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={S.footnote}>
        縮寫：H INH、R RMP、B RFB、E EMB、Z PZA、Q fluoroquinolone、S streptomycin、K kanamycin、T prothionamide。
        此表為常用情境摘錄；複雜副作用或治療反應不佳時應與 TB 專家討論。
      </div>
    </div>
  );
}

function DrugsView() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tbDrugCards;
    return tbDrugCards.filter((drug) =>
      [drug.name, drug.abbr, drug.role, ...drug.toxicities, ...drug.notes]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query]);

  return (
    <div>
      <SectionHeader title="抗結核藥物速查" subtitle="第一線藥物、常用替代藥與監測重點。" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜尋藥名、縮寫、副作用..."
        style={S.searchInput}
      />
      {filtered.map((drug) => (
        <section key={drug.abbr} style={S.card}>
          <div style={S.rowTop}>
            <div>
              <div style={S.cardTitle}>{drug.name}</div>
              <div style={S.muted}>{drug.abbr} · {drug.role}</div>
            </div>
          </div>
          <div style={S.doseGrid}>
            <div><span style={S.label}>成人劑量</span>{drug.adultDose}</div>
            <div><span style={S.label}>最大劑量</span>{drug.maxDose}</div>
            <div><span style={S.label}>腎功能</span>{drug.renal}</div>
          </div>
          <div style={S.tagWrap}>
            {drug.toxicities.map((toxicity) => <span key={toxicity} style={S.tag}>{toxicity}</span>)}
          </div>
          <Bullets items={drug.notes} />
          <Source text={drug.source} />
        </section>
      ))}
      {filtered.length === 0 && <div style={S.empty}>找不到符合的藥物資料</div>}
    </div>
  );
}

function LtbiRegimenCard({ regimen }: { regimen: TbLtbiRegimen }) {
  return (
    <section style={S.card}>
      <div style={S.rowTop}>
        <div>
          <div style={S.cardTitle}>{regimen.regimen}</div>
          <div style={S.muted}>{regimen.duration} · {regimen.frequency} · {regimen.doses}</div>
        </div>
        <span style={S.badge}>完治 {regimen.completionWindow}</span>
      </div>
      <div style={S.ltbiMeta}>
        <div><span style={S.label}>都治</span>{regimen.dot}</div>
        <div><span style={S.label}>對象</span>{regimen.candidates}</div>
        <div><span style={S.label}>成人劑量</span>{regimen.adultDose}</div>
        {regimen.pediatricDose && <div><span style={S.label}>兒童</span>{regimen.pediatricDose}</div>}
      </div>
      <Bullets items={regimen.cautions} />
      <Source text={regimen.source} />
    </section>
  );
}

function LtbiView() {
  const [selected, setSelected] = useState("all");
  const shown = selected === "all" ? ltbiRegimens : ltbiRegimens.filter((r) => r.id === selected);

  return (
    <div>
      <SectionHeader title="LTBI 診斷與治療" subtitle="以短程處方、完治期限與監測重點為核心。" />
      {ltbiPrinciples.map((item) => <KeyPointCard key={item.title} item={item} />)}

      <div style={S.subhead}>LTBI 處方速查</div>
      <div style={S.segmentRow}>
        <button onClick={() => setSelected("all")} style={{ ...S.segment, ...(selected === "all" ? S.segmentActive : {}) }}>全部</button>
        {ltbiRegimens.map((regimen) => (
          <button
            key={regimen.id}
            onClick={() => setSelected(regimen.id)}
            style={{ ...S.segment, ...(selected === regimen.id ? S.segmentActive : {}) }}
          >
            {regimen.regimen}
          </button>
        ))}
      </div>

      {shown.map((regimen) => <LtbiRegimenCard key={regimen.id} regimen={regimen} />)}
    </div>
  );
}

function SimpleTableCard({ table }: { table: TbSimpleTable }) {
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

function SpecialView() {
  return (
    <div>
      <SectionHeader title="特殊族群與抗藥性 TB" subtitle="包含第 12 章 MDR/RR-TB 表格與特殊族群入口。" />
      {specialPopulationCards.map((item) => <KeyPointCard key={item.title} item={item} />)}
      <div style={S.subhead}>第 12 章抗藥性 TB 表格</div>
      {drugResistantTbTables.map((table) => <SimpleTableCard key={table.title} table={table} />)}
    </div>
  );
}

function CurrentView({ active }: { active: TbSectionId }) {
  if (active === "diagnosis") return <DiagnosisView />;
  if (active === "active") return <ActiveTbView />;
  if (active === "monitoring") return <MonitoringView />;
  if (active === "drugs") return <DrugsView />;
  if (active === "ltbi") return <LtbiView />;
  return <SpecialView />;
}

export default function TbGuideline() {
  const [active, setActive] = useState<TbSectionId>("monitoring");

  return (
    <div>
      <header style={S.header}>
        <div style={S.kicker}>Taiwan CDC Guideline</div>
        <h1 style={S.title}>{tbGuidelineMeta.title}</h1>
        <div style={S.subtitle}>{tbGuidelineMeta.subtitle}</div>
      </header>

      <section style={S.notice}>
        <div style={S.noticeTitle}>資料來源</div>
        <div>{tbGuidelineMeta.source}</div>
        <div style={{ marginTop: 6 }}>{tbGuidelineMeta.notice}</div>
      </section>

      <nav style={S.tabRow} aria-label="TB guideline sections">
        {tbSections.map((section) => (
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

const S: Record<string, React.CSSProperties> = {
  header: { textAlign: "center", padding: "16px 0 18px" },
  kicker: { fontSize: 12, fontWeight: 800, color: ACCENT, textTransform: "uppercase", letterSpacing: 0, marginBottom: 6 },
  title: { fontSize: 26, lineHeight: 1.2, fontWeight: 850, color: "#0F172A", margin: 0, letterSpacing: 0 },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 4 },
  notice: { background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, padding: 12, color: "#065F46", fontSize: 12, lineHeight: 1.55, marginBottom: 14 },
  noticeTitle: { fontWeight: 800, marginBottom: 4 },
  tabRow: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 12 },
  tab: { flex: "0 0 auto", border: "1.5px solid #DDE7EE", background: "#fff", borderRadius: 8, padding: "9px 10px", color: "#475569", cursor: "pointer", minWidth: 92, textAlign: "left" as const },
  tabActive: { border: `1.5px solid ${ACCENT}`, background: "#F0FDFA", color: "#0F766E" },
  tabLabel: { display: "block", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" },
  tabShort: { display: "block", fontSize: 11, color: "#94A3B8", marginTop: 2, whiteSpace: "nowrap" },
  sectionHeader: { margin: "10px 0 12px" },
  sectionTitle: { fontSize: 18, fontWeight: 850, color: "#0F172A", lineHeight: 1.3 },
  sectionSubtitle: { fontSize: 13, color: "#64748B", lineHeight: 1.5, marginTop: 4 },
  subhead: { fontSize: 13, fontWeight: 850, color: "#0F766E", textTransform: "uppercase", letterSpacing: 0, margin: "18px 0 10px" },
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" },
  compactCard: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: 12, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: 850, color: "#0F172A", lineHeight: 1.35 },
  cardBody: { fontSize: 13, color: "#334155", lineHeight: 1.6, marginTop: 7 },
  muted: { fontSize: 12, color: "#64748B", marginTop: 3, lineHeight: 1.45 },
  bulletList: { margin: "9px 0 0", paddingLeft: 18, color: "#334155", fontSize: 13, lineHeight: 1.55 },
  bulletItem: { marginBottom: 4 },
  source: { marginTop: 10, fontSize: 11, color: "#94A3B8", lineHeight: 1.45 },
  rowTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  badge: { flexShrink: 0, display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "4px 8px", background: "#E0F2FE", color: "#0369A1", fontSize: 11, fontWeight: 750, lineHeight: 1.2 },
  noteBox: { marginTop: 9, padding: 10, borderRadius: 8, background: "#FFF7ED", color: "#9A3412", fontSize: 12, lineHeight: 1.5 },
  stepList: { margin: "10px 0 0", paddingLeft: 18, color: "#334155", fontSize: 13, lineHeight: 1.55 },
  stepItem: { marginBottom: 5 },
  tableWrap: { overflowX: "auto", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, marginBottom: 8 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 520 },
  th: { padding: "9px 8px", borderBottom: "2px solid #E2E8F0", textAlign: "left", color: "#475569", fontWeight: 850, background: "#F8FAFC" },
  td: { padding: "9px 8px", borderBottom: "1px solid #F1F5F9", color: "#334155", whiteSpace: "nowrap" },
  tdStrong: { padding: "9px 8px", borderBottom: "1px solid #F1F5F9", color: "#0F172A", fontWeight: 850, whiteSpace: "nowrap" },
  footnote: { fontSize: 11, color: "#64748B", lineHeight: 1.55, marginBottom: 14 },
  searchInput: { width: "100%", padding: "11px 12px", borderRadius: 8, border: "1.5px solid #DDE7EE", background: "#fff", color: "#0F172A", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 },
  doseGrid: { display: "grid", gap: 8, marginTop: 10, color: "#334155", fontSize: 13, lineHeight: 1.45 },
  label: { display: "block", color: "#94A3B8", fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: 0, marginBottom: 2 },
  tagWrap: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: { borderRadius: 999, padding: "4px 8px", background: "#F1F5F9", color: "#475569", fontSize: 11, fontWeight: 700 },
  empty: { textAlign: "center", color: "#94A3B8", fontSize: 13, padding: 18 },
  segmentRow: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10, marginBottom: 2 },
  segment: { flex: "0 0 auto", border: "1.5px solid #DDE7EE", background: "#fff", color: "#475569", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 800, cursor: "pointer" },
  segmentActive: { border: `1.5px solid ${ACCENT}`, background: "#F0FDFA", color: "#0F766E" },
  ltbiMeta: { display: "grid", gap: 8, marginTop: 10, color: "#334155", fontSize: 13, lineHeight: 1.45 },
};
