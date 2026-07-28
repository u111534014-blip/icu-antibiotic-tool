import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

const ACCENT = "#0D9488";

type SepsisSectionId = "bundle" | "antimicrobial" | "hemodynamics" | "steroids" | "monitoring";

type KeyCard = {
  title: string;
  body: string;
  bullets?: string[];
  badge?: string;
  source: string;
};

type SimpleTable = {
  title: string;
  source: string;
  columns: string[];
  rows: string[][];
  notes?: string[];
};

const sections: { id: SepsisSectionId; label: string; short: string }[] = [
  { id: "bundle", label: "1 小時 bundle", short: "初始處置" },
  { id: "antimicrobial", label: "抗生素", short: "coverage" },
  { id: "hemodynamics", label: "輸液/升壓劑", short: "MAP 目標" },
  { id: "steroids", label: "類固醇/輔助", short: "refractory" },
  { id: "monitoring", label: "追蹤與降階", short: "reassess" },
];

const bundleCards: KeyCard[] = [
  {
    title: "辨識 septic shock 後立即啟動",
    badge: "T0",
    body: "Sepsis / septic shock 是 medical emergency；疑似感染合併急性器官功能惡化、低血壓或 hypoperfusion 時，不要等所有檢查回來才開始處置。",
    bullets: [
      "Sepsis-3：感染造成 life-threatening organ dysfunction，常以 SOFA 增加 >=2 分代表。",
      "Septic shock：足量輸液後仍需 vasopressor 維持 MAP >=65 mmHg，且 lactate >2 mmol/L。",
      "qSOFA 不能單獨用來 rule in / rule out sepsis；較適合提醒高風險。",
    ],
    source: "Sepsis-3；SSC 2026 Screening / Biomarkers",
  },
  {
    title: "抽血培養與 lactate",
    badge: "0-1 hr",
    body: "盡快抽 blood cultures，理想上在抗生素前完成；若會明顯延誤給藥，抗生素不應被培養卡住。",
    bullets: [
      "至少抽 lactate；若 elevated lactate 或 shock，後續以 serial lactate 搭配臨床灌流評估。",
      "同步評估 CBC、SCr、LFT、bilirubin、PT/INR、ABG/VBG、urine output、感染源相關檢體。",
      "血液培養建議兩套；已置入 central line 且疑似 catheter-related BSI 時，可考慮周邊與導管各抽。",
    ],
    source: "SSC 2026 Blood culture / Blood lactate / Serial lactate",
  },
  {
    title: "抗生素不要等",
    badge: "<=1 hr",
    body: "Septic shock、probable/definite sepsis 建議立即給 antimicrobial therapy，理想上在辨識後 1 小時內。",
    bullets: [
      "先給足 loading dose，腎功能不全通常不應延誤第一劑。",
      "依感染源、院內抗藥風險、近期培養與 colonization 調整 MRSA / MDR GNB / anaerobe / fungal coverage。",
      "維持劑量可依腎功能、RRT、PK/PD 與 TDM 後續調整。",
    ],
    source: "SSC 2026 Antibiotic initiation / Multidrug resistance / Drug monitoring",
  },
  {
    title: "輸液與升壓劑可並行",
    badge: "0-3 hr",
    body: "Sepsis-induced hypoperfusion 或 septic shock 可給至少 30 mL/kg crystalloid 於前 3 小時，但要反覆評估，不是一路灌到 lactate 正常。",
    bullets: [
      "Crystalloid 為第一線，SSC 2026 偏好 balanced crystalloids；TBI 情境可考慮 0.9% saline。",
      "若 unstable shock，可在輸液同時啟動 vasopressor；不必等 central line 才開始。",
      "周邊 vasopressor 應短期使用，選擇大條近端靜脈並嚴密觀察 extravasation。",
    ],
    source: "SSC 2026 Fluid resuscitation / Fluid type / Vasopressor administration",
  },
  {
    title: "找 source control",
    badge: "<=6 hr",
    body: "需要 source control 的感染源要快速辨識或排除；若已確認需要處置，建議在 medically/logistically practical 下盡早進行，理想上 6 小時內。",
    bullets: [
      "常見包括膿瘍引流、阻塞性泌尿感染解除阻塞、感染導管移除、壞死性軟組織感染清創、膽道感染 ERCP/PTCD。",
      "source control 前後都要回頭調整抗生素與療程長度。",
    ],
    source: "SSC 2026 Source control",
  },
];

const antimicrobialTables: SimpleTable[] = [
  {
    title: "經驗性 coverage 決策",
    columns: ["問題", "建議做法", "常見監測/備註"],
    rows: [
      ["是否要 cover MRSA", "有 MRSA colonization/previous infection、皮膚軟組織或導管相關、院內肺炎、重症 shock 且風險高時考慮。", "Vancomycin 需 LD 與 TDM；若 AKI/high MIC/肺炎治療反應差，需重新評估。"],
      ["是否要 cover MDR GNB / Pseudomonas", "依近期培養、抗生素暴露、長期住院、ICU/照護機構、當地 antibiogram、結構性肺病或 neutropenia 判斷。", "重症 beta-lactam 建議 LD 後 prolonged infusion；腎功能變動/RRT 要早期回頭調整。"],
      ["是否要 anaerobe coverage", "腹腔、婦產科深部感染、壞死性軟組織感染、頭頸感染、CNS abscess/empyema 等需納入。", "若使用 pip/tazo 或 carbapenem 通常已涵蓋；若 cefepime/ceftazidime 需另加 metronidazole。"],
      ["是否要 empiric antifungal", "不建議 routine；免疫低下、長期廣效抗生素、長住院、腹腔感染、TPN、HD、近期手術或 Candida colonization 多處時個別評估。", "echinocandin 常作為不穩定或 critically ill candidemia 經驗治療；4-5 天無證據且改善可考慮停。"],
    ],
    notes: [
      "不要因為 septic shock 就自動把所有 coverage 都加滿；coverage 要跟感染源與 MDR/fungal 風險連動。",
      "抗生素一開始要快且足量，後面要每日降階。",
    ],
    source: "SSC 2026 Multidrug resistance / Anaerobic coverage / Antifungal coverage / Beta-lactam antibiotics",
  },
  {
    title: "抗生素 timing",
    columns: ["臨床情境", "建議時間", "重點"],
    rows: [
      ["Septic shock", "立即，理想上辨識後 1 hr 內", "抽 culture 但不可明顯延誤。"],
      ["Probable / definite sepsis 無 shock", "立即，理想上 1 hr 內", "若 infection likelihood 高，不要等待完整檢查。"],
      ["Possible sepsis 無 shock", "快速限時評估；若仍疑似感染，3 hr 內給藥", "低感染可能且無 shock，可密切監測並暫緩抗生素。"],
    ],
    source: "SSC 2026 Antibiotic initiation",
  },
];

const vasopressorTable: SimpleTable = {
  title: "升壓劑與 inotrope 速查",
  columns: ["藥物", "角色", "常用劑量/範圍", "監測與提醒"],
  rows: [
    ["Norepinephrine", "第一線 vasopressor", "標示劑量：起始 8-12 mcg/min，常見維持 2-4 mcg/min；依 MAP/灌流 titrate。", "MAP、HR/arrhythmia、末梢灌流、extravasation；避免突然停藥。"],
    ["Vasopressin", "NE 升高仍 MAP 不足時 add-on", "Septic shock：0.01 units/min 起始，每 10-15 min 增 0.005；max 0.07 units/min。ICU add-on 常用固定 0.03 units/min。", "缺血、腸胃道/皮膚灌流、Na；通常不是單獨第一線。"],
    ["Epinephrine", "NE + vasopressin 後仍不足，或需較多 inotropy 時", "0.05-2 mcg/kg/min，依 MAP titrate。", "HR/arrhythmia、lactate 可能上升、高血糖、末梢灌流。"],
    ["Dobutamine", "心肌功能差且 adequate MAP/volume 後仍 hypoperfusion", "0.5-1 mcg/kg/min 起始；常用 2-20 mcg/kg/min，依反應調整。", "可能低血壓、tachyarrhythmia；需搭配 vasopressor 維持 MAP，不是用來替代 NE。"],
  ],
  notes: [
    "SSC 2026：NE 為第一線；NE escalation 時加 vasopressin；NE + vasopressin 仍 MAP 不足時加 epinephrine。",
    "有 cardiac dysfunction 且 despite adequate volume/MAP 仍 hypoperfusion，可加 inotrope；可選 dobutamine 加 NE 或 epinephrine alone。",
  ],
  source: "SSC 2026 Vasopressors / Inotropes；DailyMed norepinephrine, vasopressin, epinephrine, dobutamine labels",
};

const hemodynamicCards: KeyCard[] = [
  {
    title: "MAP 與灌流目標",
    body: "初始 MAP 目標以 65 mmHg 為主，不需要常規追高；65 歲以上可考慮 60-65 mmHg 範圍，仍需看慢性高血壓、腎灌流、心肌缺血與末梢灌流。",
    bullets: [
      "灌流指標：mentation、urine output、skin mottling/capillary refill、lactate trend、ScvO2/echo 視情境。",
      "血壓計讀值不穩、升壓劑中高劑量或多種升壓劑時，建議儘早 arterial line。",
    ],
    source: "SSC 2026 Mean arterial pressure / Blood pressure monitoring / Capillary refill",
  },
  {
    title: "輸液後續怎麼給",
    body: "30 mL/kg 是初始 resuscitation 起點，後續應看 fluid responsiveness 與 overload 風險，不要只看 CVP 或單次血壓。",
    bullets: [
      "可用 passive leg raise、small bolus 後 stroke volume/PPV/SVV/echo 反應來判斷 fluid responsiveness。",
      "已給大量 crystalloid 或 cirrhosis 可個別考慮 albumin；不建議 starches。",
      "若仍 hypoperfusion 但已不 fluid responsive，應轉向 vasopressor/inotrope/source control，而不是一直補液。",
    ],
    source: "SSC 2026 Resuscitation / Fluid type / Serial lactate",
  },
];

const steroidCards: KeyCard[] = [
  {
    title: "何時考慮 hydrocortisone",
    body: "成人 septic shock 若仍需要 vasopressor，可考慮 IV corticosteroid。常見觸發點是 NE 或 epinephrine >=0.25 mcg/kg/min 且已持續至少 4 小時仍需升壓。",
    bullets: [
      "常用：hydrocortisone 200 mg/day，可 50 mg IV q6h 或 continuous infusion。",
      "目標是縮短 shock duration，不是取代抗生素、source control、輸液與升壓劑。",
      "監測 glucose、Na、感染控制、GI bleeding risk、delirium/myopathy；停用時依臨床與院內習慣 taper 或停止。",
    ],
    source: "SSC 2026 IV Corticosteroids；SSC 2021 Corticosteroids remarks",
  },
  {
    title: "不建議 routine 使用的輔助治療",
    body: "不要把 sepsis cocktail 當成 routine bundle。SSC 2026 不建議常規使用 IV vitamin C、IVIG、blood purification、polymyxin B hemoperfusion 或 vitamin D 作為 sepsis 治療。",
    bullets: [
      "Antipyretic 不建議以改善 sepsis outcome 為目的常規使用；若為疼痛/舒適或其他神經重症、post-arrest 體溫管理則另論。",
      "Septic shock + lactic acidosis 不建議用 bicarbonate 改善 hemodynamics；但 pH <=7.2 且 AKI AKIN 2-3 可考慮。",
      "Glucose >=180 mg/dL 才開始 insulin；常用目標 144-180 mg/dL。",
    ],
    source: "SSC 2026 Antipyretics / IV Vitamin C / IV Immunoglobulin / Blood purification；SSC 2021 Glucose / Bicarbonate",
  },
];

const monitoringTables: SimpleTable[] = [
  {
    title: "前 6-24 小時追蹤",
    columns: ["項目", "建議追蹤", "目的"],
    rows: [
      ["Hemodynamics", "MAP、vasopressor dose trend、HR/arrhythmia、末梢灌流、capillary refill", "確認 shock 是否改善，避免只盯著單一 MAP。"],
      ["Perfusion", "lactate trend、urine output、mentation、skin mottling、ABG/VBG", "lactate 要看趨勢與臨床背景，不是唯一目標。"],
      ["Organ function", "SCr/UO、bilirubin/LFT、platelet、PT/INR、氧合、SOFA trend", "評估 organ dysfunction 與藥物腎肝調整。"],
      ["Drug safety", "vancomycin/aminoglycoside TDM、beta-lactam prolonged infusion、QTc、K/Mg、C. difficile risk", "早期足量，後續安全降階。"],
    ],
    source: "SSC 2026 Serial lactate / Drug monitoring / Antimicrobial therapy",
  },
  {
    title: "每日抗生素 time-out",
    columns: ["問題", "處理方向", "提醒"],
    rows: [
      ["有 pathogen / susceptibility 嗎？", "有結果就 narrow 或停掉不必要 coverage。", "SSC 2026 建議有微生物結果時 de-escalation。"],
      ["culture final negative 嗎？", "若臨床改善且感染證據不足，考慮停用或縮窄。", "持續尋找 noninfectious mimic。"],
      ["source control 完成了嗎？", "完成後可用較短療程；未完成時應優先處理 source。", "療程長短取決於感染源、菌種、免疫狀態與控制程度。"],
      ["需要 PCT 嗎？", "若最佳療程不明，可用 PCT + clinical evaluation 輔助停藥。", "不要用 PCT 單獨決定是否開始抗生素。"],
    ],
    source: "SSC 2026 Antimicrobial therapy / Source control / Biomarkers",
  },
];

function Bullets({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <ul style={S.bulletList}>
      {items.map((item) => <li key={item} style={S.bulletItem}>{item}</li>)}
    </ul>
  );
}

function Source({ text }: { text: string }) {
  return <div style={S.source}>來源：{text}</div>;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={S.sectionHeader}>
      <div style={S.sectionTitle}>{title}</div>
      {subtitle && <div style={S.sectionSubtitle}>{subtitle}</div>}
    </div>
  );
}

function KeyPointCard({ item }: { item: KeyCard }) {
  return (
    <section style={S.card}>
      <div style={S.rowTop}>
        <div style={S.cardTitle}>{item.title}</div>
        {item.badge && <span style={S.badge}>{item.badge}</span>}
      </div>
      <div style={S.cardBody}>{item.body}</div>
      <Bullets items={item.bullets} />
      <Source text={item.source} />
    </section>
  );
}

function SimpleTableCard({ table }: { table: SimpleTable }) {
  return (
    <section style={S.card}>
      <div style={S.cardTitle}>{table.title}</div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              {table.columns.map((column) => <th key={column} style={S.th}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={`${table.title}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${table.title}-${rowIndex}-${cellIndex}`} style={cellIndex === 0 ? S.tdStrong : S.td}>
                    {cell}
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

function FluidCalculator() {
  const [weight, setWeight] = useState("");
  const [useObesityNote, setUseObesityNote] = useState(false);
  const weightNum = Number(weight);
  const fluidMl = Number.isFinite(weightNum) && weightNum > 0 ? Math.round(weightNum * 30) : null;

  return (
    <section style={S.calcCard}>
      <div style={S.cardTitle}>30 mL/kg 初始輸液粗估</div>
      <div style={S.calcGrid}>
        <label style={S.inputLabel}>
          <span>計算體重</span>
          <div style={S.inputWrap}>
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              inputMode="decimal"
              placeholder="kg"
              style={S.input}
            />
            <span style={S.inputSuffix}>kg</span>
          </div>
        </label>
        <button
          type="button"
          onClick={() => setUseObesityNote(!useObesityNote)}
          style={{ ...S.toggle, ...(useObesityNote ? S.toggleActive : {}) }}
        >
          BMI &gt;=30 / 限水提醒
        </button>
      </div>
      <div style={S.resultBox}>
        {fluidMl ? (
          <>
            <span style={S.resultLabel}>前 3 小時 crystalloid 起點</span>
            <strong style={S.resultValue}>{fluidMl.toLocaleString()} mL</strong>
          </>
        ) : (
          <span style={S.resultPlaceholder}>輸入體重後顯示 30 mL/kg 粗估量</span>
        )}
      </div>
      <div style={S.calcNote}>
        SSC 2026 提醒 BMI &gt;30 時可依實際體重、adjusted 或 ideal body weight 計算；心衰、ESRD、ARDS、肝硬化或明顯 overload 風險者需更密集 reassessment。
        {useObesityNote && <div style={{ marginTop: 6 }}>這個數字是起始 resuscitation 參考，不是硬性必達量；若不 fluid responsive，應及早轉向 vasopressor / inotrope / source control。</div>}
      </div>
    </section>
  );
}

function BundleView() {
  return (
    <div>
      <SectionHeader title="Septic shock 初始處置" subtitle="把抽檢、抗生素、輸液、升壓劑與 source control 放在同一張臨床地圖上。" />
      {bundleCards.map((item) => <KeyPointCard key={item.title} item={item} />)}
    </div>
  );
}

function AntimicrobialView() {
  return (
    <div>
      <SectionHeader title="抗生素與感染源控制" subtitle="快、準、後續每日降階。這頁先不替代各藥物劑量頁，而是告訴你何時該 cover 什麼。" />
      {antimicrobialTables.map((table) => <SimpleTableCard key={table.title} table={table} />)}
    </div>
  );
}

function HemodynamicsView() {
  return (
    <div>
      <SectionHeader title="輸液、升壓劑與灌流目標" subtitle="MAP 只是其中一個目標；真正要看器官灌流是否改善。" />
      <FluidCalculator />
      {hemodynamicCards.map((item) => <KeyPointCard key={item.title} item={item} />)}
      <SimpleTableCard table={vasopressorTable} />
    </div>
  );
}

function SteroidsView() {
  return (
    <div>
      <SectionHeader title="類固醇與輔助治療" subtitle="重點是 refractory shock 何時加 hydrocortisone，以及哪些東西不要 routine 做。" />
      {steroidCards.map((item) => <KeyPointCard key={item.title} item={item} />)}
    </div>
  );
}

function MonitoringView() {
  return (
    <div>
      <SectionHeader title="追蹤、降階與停藥" subtitle="Sepsis 不是第一小時做完就結束；後面每日 reassessment 才是抗菌藥 stewardship 的核心。" />
      {monitoringTables.map((table) => <SimpleTableCard key={table.title} table={table} />)}
    </div>
  );
}

function CurrentView({ active }: { active: SepsisSectionId }) {
  if (active === "bundle") return <BundleView />;
  if (active === "antimicrobial") return <AntimicrobialView />;
  if (active === "hemodynamics") return <HemodynamicsView />;
  if (active === "steroids") return <SteroidsView />;
  return <MonitoringView />;
}

export default function SepticShock() {
  const [active, setActive] = useState<SepsisSectionId>("bundle");

  const sourceText = useMemo(
    () => "Surviving Sepsis Campaign 2026 adult guidelines；Sepsis-3；SSC 2021 corticosteroid dosing remarks；DailyMed vasoactive drug labels。",
    []
  );

  return (
    <div>
      <header style={S.header}>
        <div style={S.kicker}>Critical Care Quick Reference</div>
        <h1 style={S.title}>Sepsis / Septic shock 速查</h1>
        <div style={S.subtitle}>1 小時 bundle、抗生素、升壓劑、類固醇與每日 reassessment</div>
      </header>

      <section style={S.notice}>
        <div style={S.noticeTitle}>資料來源</div>
        <div>{sourceText}</div>
        <div style={{ marginTop: 6 }}>
          本頁為成人 ICU 快速參考；需依院內 sepsis protocol、antibiogram、升壓劑濃度、感染源與病人限制水分/心腎功能調整。
        </div>
      </section>

      <nav style={S.tabRow} aria-label="Septic shock sections">
        {sections.map((section) => (
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
  notice: { background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, padding: 12, color: "#065F46", fontSize: 12, lineHeight: 1.55, marginBottom: 14 },
  noticeTitle: { fontWeight: 800, marginBottom: 4 },
  tabRow: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 12 },
  tab: { flex: "0 0 auto", border: "1.5px solid #DDE7EE", background: "#fff", borderRadius: 8, padding: "9px 10px", color: "#475569", cursor: "pointer", minWidth: 98, textAlign: "left" },
  tabActive: { border: `1.5px solid ${ACCENT}`, background: "#F0FDFA", color: "#0F766E" },
  tabLabel: { display: "block", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" },
  tabShort: { display: "block", fontSize: 11, color: "#94A3B8", marginTop: 2, whiteSpace: "nowrap" },
  sectionHeader: { margin: "10px 0 12px" },
  sectionTitle: { fontSize: 18, fontWeight: 850, color: "#0F172A", lineHeight: 1.3 },
  sectionSubtitle: { fontSize: 13, color: "#64748B", lineHeight: 1.5, marginTop: 4 },
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" },
  calcCard: { background: "#fff", border: "1px solid #B6E4DA", borderRadius: 8, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" },
  rowTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: 850, color: "#0F172A", lineHeight: 1.35 },
  cardBody: { fontSize: 13, color: "#334155", lineHeight: 1.6, marginTop: 7 },
  bulletList: { margin: "9px 0 0", paddingLeft: 18, color: "#334155", fontSize: 13, lineHeight: 1.55 },
  bulletItem: { marginBottom: 4 },
  source: { marginTop: 10, fontSize: 11, color: "#94A3B8", lineHeight: 1.45 },
  badge: { flexShrink: 0, display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "4px 8px", background: "#E0F2FE", color: "#0369A1", fontSize: 11, fontWeight: 750, lineHeight: 1.2 },
  tableWrap: { overflowX: "auto", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, marginTop: 10, marginBottom: 8 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 620 },
  th: { padding: "9px 8px", borderBottom: "2px solid #E2E8F0", textAlign: "left", color: "#475569", fontWeight: 850, background: "#F8FAFC", verticalAlign: "top" },
  td: { padding: "9px 8px", borderBottom: "1px solid #F1F5F9", color: "#334155", verticalAlign: "top", lineHeight: 1.5 },
  tdStrong: { padding: "9px 8px", borderBottom: "1px solid #F1F5F9", color: "#0F172A", fontWeight: 850, verticalAlign: "top", lineHeight: 1.5, whiteSpace: "nowrap" },
  calcGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "end", marginTop: 12 },
  inputLabel: { display: "block", color: "#475569", fontSize: 12, fontWeight: 800 },
  inputWrap: { display: "flex", alignItems: "center", marginTop: 5, border: "1.5px solid #DDE7EE", borderRadius: 8, background: "#fff", overflow: "hidden" },
  input: { flex: 1, minWidth: 0, border: "none", outline: "none", padding: "10px 10px", fontSize: 14, color: "#0F172A" },
  inputSuffix: { padding: "0 10px", color: "#94A3B8", fontSize: 12, fontWeight: 800 },
  toggle: { border: "1.5px solid #DDE7EE", borderRadius: 8, background: "#fff", color: "#475569", padding: "10px 12px", cursor: "pointer", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" },
  toggleActive: { border: `1.5px solid ${ACCENT}`, color: "#0F766E", background: "#F0FDFA" },
  resultBox: { marginTop: 12, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 12, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 },
  resultLabel: { color: "#64748B", fontSize: 12, fontWeight: 800 },
  resultValue: { color: "#0F766E", fontSize: 24, lineHeight: 1 },
  resultPlaceholder: { color: "#94A3B8", fontSize: 13 },
  calcNote: { marginTop: 9, color: "#64748B", fontSize: 12, lineHeight: 1.55 },
};
