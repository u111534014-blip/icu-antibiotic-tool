import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const ACCENT = "#0D9488";
const STOCK_UNITS_PER_ML = 5000;

type Indication = "vte" | "acs" | "bridge" | "lowIntensity";
type Monitor = "antiXa" | "aptt" | "act";
type ProtamineWindow = "2" | "3";
type PccInr = "2to39" | "4to6" | "gt6";
type XaAgent = "apixaban" | "rivaroxaban" | "edoxaban" | "enoxaparin" | "unknown";
type XaTiming = "lt8" | "ge8" | "unknown";
type ToolTab = "heparin" | "transition" | "reversal" | "reference";

function n(value: string): number {
  return parseFloat(value) || 0;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function roundUnits(value: number): number {
  return Math.max(0, Math.round(value / 50) * 50);
}

function cap(value: number, max?: number): number {
  if (!max) return value;
  return Math.min(value, max);
}

const INDICATIONS: Record<Indication, {
  label: string;
  short: string;
  bolusPerKg: number;
  infusionPerKgHr: number;
  bolusMax?: number;
  infusionMax?: number;
  target: string;
  apttTarget: string;
  duration: string;
  note: string;
}> = {
  vte: {
    label: "DVT / PE acute treatment",
    short: "DVT / PE",
    bolusPerKg: 80,
    infusionPerKgHr: 18,
    bolusMax: 10000,
    target: "anti-Xa 0.3-0.7 IU/mL",
    apttTarget: "anti-Xa preferred；若使用 aPTT，依院內校正 therapeutic range。若院內未建立，可暫以約 control 1.5-2.5 倍作粗略參考。",
    duration: "通常至少 3 個月；provoked VTE 常 3 個月，unprovoked 或持續危險因子需評估延長治療。",
    note: "UFH 適合腎功能差、出血風險高、可能需要 procedure、massive/submassive PE 或需要快速停藥的病人。",
  },
  acs: {
    label: "ACS / NSTEMI / unstable angina",
    short: "ACS",
    bolusPerKg: 60,
    infusionPerKgHr: 12,
    bolusMax: 4000,
    infusionMax: 1000,
    target: "anti-Xa 0.3-0.7 IU/mL（若院內 ACS protocol 另有規範，以院內為準）",
    apttTarget: "anti-Xa preferred；若使用 aPTT，依院內 ACS/UFH therapeutic range。若院內未建立，可暫以約 control 1.5-2.5 倍作粗略參考。",
    duration: "通常用到 PCI 完成、改用其他抗凝策略，或缺血風險穩定；需配合 cardiology / cath lab protocol。",
    note: "PCI 期間常依 ACT 調整；若合併 GP IIb/IIIa inhibitor 或 procedure，劑量需依院內 ACS/PCI protocol。",
  },
  bridge: {
    label: "Warfarin bridge / high thrombotic risk",
    short: "Bridge",
    bolusPerKg: 0,
    infusionPerKgHr: 18,
    target: "anti-Xa 0.3-0.7 IU/mL",
    apttTarget: "anti-Xa preferred；若使用 aPTT，依院內校正 therapeutic range。若院內未建立，可暫以約 control 1.5-2.5 倍作粗略參考。",
    duration: "Warfarin bridge 至少 overlap 5 天，且 INR 達治療目標後才停 heparin。",
    note: "不是所有 AF 都需要 bridge；常見考量包含 mechanical valve、近期 VTE、近期 stroke/TIA 或極高血栓風險。",
  },
  lowIntensity: {
    label: "Low-intensity / high bleeding risk",
    short: "Low intensity",
    bolusPerKg: 0,
    infusionPerKgHr: 12,
    target: "anti-Xa 0.3-0.5 IU/mL",
    apttTarget: "低強度 aPTT 需依院內對照表；若未建立，避免用固定秒數硬判讀，建議優先看 anti-Xa 0.3-0.5 IU/mL。",
    duration: "依適應症與出血風險每日重評；若血栓風險高且出血穩定，可再升回 standard intensity。",
    note: "適合高出血風險、術後早期、暫時不適合 bolus，或醫師指定低強度抗凝血的病人。",
  },
};

const HIGH_BLEEDING_RISK = [
  "活動性出血或近期重大出血",
  "近期大手術、侵入性處置、外傷，或短期內可能需要 procedure",
  "近期顱內出血、缺血性中風、顱內病灶或神經外科術後",
  "血小板低下，尤其 <50,000/uL，或凝血功能明顯異常",
  "嚴重肝病、DIC、baseline INR/aPTT 明顯延長",
  "未控制高血壓、近期 GI bleeding、嚴重貧血",
  "併用 DAPT、NSAID、thrombolytic 或其他抗凝血藥",
  "高齡、低體重、跌倒風險高或其他臨床判斷出血風險高",
];

const DOAC_ROWS = [
  {
    drug: "Apixaban",
    regimen: "10 mg PO BID x 7 days，之後 5 mg PO BID；完成至少 6 個月後若需 extended prevention，可考慮 2.5 mg PO BID。",
    overlap: "不需 overlap。LMWH：下一次原本該給 LMWH 的時間開始；UFH infusion：停 infusion 後開始。",
    caveat: "若前面已先用 UFH 數天，lead-in 7 天是否折抵需依院內/醫師判斷；嚴重腎功能差、APS、吸收問題或極端體重需個別評估。",
  },
  {
    drug: "Rivaroxaban",
    regimen: "15 mg PO BID x 21 days with food，之後 20 mg PO QD with food；完成至少 6 個月後若需 extended prevention，可考慮 10 mg PO QD。",
    overlap: "不需 overlap。LMWH：下一次原本該給 LMWH 前 0-2 hr 開始；UFH infusion：停 infusion 同時開始。",
    caveat: "若前面已先用 UFH/LMWH 數天，lead-in 21 天是否折抵需依院內/醫師判斷；CrCl <30 mL/min、APS、吸收問題或極端體重需個別評估。",
  },
  {
    drug: "Dabigatran",
    regimen: "先 UFH/LMWH/fondaparinux 至少 5 days，之後 150 mg PO BID。",
    overlap: "不需 overlap。LMWH：下一次原本該給 LMWH 前 0-2 hr 開始；UFH infusion：停 infusion 時開始。",
    caveat: "CrCl <30 mL/min 通常避免；P-gp inhibitor、GI bleeding risk 或吞嚥/吸收問題需注意。",
  },
  {
    drug: "Edoxaban",
    regimen: "先 UFH/LMWH/fondaparinux 至少 5 days，之後 60 mg PO QD；CrCl 15-50 mL/min、體重 <=60 kg 或特定 P-gp inhibitor 任一條件符合時 30 mg PO QD。",
    overlap: "不需 overlap。LMWH：下一次原本該給 LMWH 的時間開始；UFH infusion → edoxaban：依 US Savaysa label 為停 infusion 4 hr 後開始。",
    caveat: "CrCl <15 mL/min 通常避免；劑量下降條件要逐項確認。",
  },
  {
    drug: "Warfarin",
    regimen: "與 UFH/LMWH 同時開始；常見 VTE 目標 INR 2-3。",
    overlap: "Heparin overlap 至少 5 days，且 INR therapeutic 後才停 heparin。",
    caveat: "Mechanical valve、APS、嚴重腎功能不全或 DOAC 不適合時常需考慮 warfarin。",
  },
];

const WARFARIN_TO_DOAC_ROWS = [
  { drug: "Apixaban", start: "Stop warfarin；INR <2.0 時開始 apixaban", note: "不需 overlap。" },
  { drug: "Rivaroxaban", start: "Stop warfarin；INR <3.0 時開始 rivaroxaban", note: "避免 INR 降太低造成抗凝空窗。" },
  { drug: "Dabigatran", start: "Stop warfarin；INR <2.0 時開始 dabigatran", note: "DVT/PE 治療需已完成至少 5 days parenteral anticoagulant。" },
  { drug: "Edoxaban", start: "Stop warfarin；INR <=2.5 時開始 edoxaban", note: "DVT/PE 治療需已完成 5-10 days parenteral anticoagulant。" },
];

const DOAC_TO_WARFARIN_ROWS = [
  {
    drug: "Apixaban",
    method: "常用方式：停 apixaban，在下一次原本該給 apixaban 的時間，同時開始 parenteral anticoagulant + warfarin；INR therapeutic 後停 parenteral anticoagulant。",
    note: "Apixaban 會影響 INR，transition 期間 INR 不完全代表 warfarin effect。",
  },
  {
    drug: "Rivaroxaban",
    method: "常用方式：停 rivaroxaban，在下一次原本該給 rivaroxaban 的時間，同時開始 parenteral anticoagulant + warfarin；INR therapeutic 後停 parenteral anticoagulant。",
    note: "Rivaroxaban 會影響 INR；停藥後約 24 hr 的 INR 較能反映 warfarin。",
  },
  {
    drug: "Dabigatran",
    method: "依 CrCl 決定 warfarin 開始時間：CrCl >50：停 dabigatran 前 3 days 開始 warfarin；CrCl 31-50：前 2 days；CrCl 15-30：前 1 day。",
    note: "Dabigatran 會影響 INR；停 dabigatran 至少 2 days 後 INR 較能反映 warfarin。",
  },
  {
    drug: "Edoxaban",
    method: "可改成 parenteral anticoagulant + warfarin；或將 edoxaban 劑量減半並與 warfarin 併用，至少每週、且在下一次 edoxaban dose 前測 INR，INR >=2 後停 edoxaban。",
    note: "實務上若病人高風險或腎功能差，常用 parenteral bridge 較直觀。",
  },
];

const DOAC_RENAL_ROWS = [
  {
    drug: "Apixaban",
    acute: "10 mg BID x 7 days，之後 5 mg BID",
    renal: "VTE treatment 不因 renal impairment 單獨降成 2.5 mg BID；CrCl <15 或 dialysis 的 VTE outcome data 有限，需個別評估。",
    extended: "完成至少 6 個月治療後，extended prevention 可 2.5 mg BID。",
  },
  {
    drug: "Rivaroxaban",
    acute: "15 mg BID x 21 days with food，之後 20 mg QD with food",
    renal: "CrCl 15-30 exposure 增加但 VTE 劑量通常不降；需密切觀察出血。CrCl <15 或 dialysis 避免使用。",
    extended: "完成至少 6 個月治療後，extended prevention 可 10 mg QD。",
  },
  {
    drug: "Dabigatran",
    acute: "先 parenteral anticoagulant 至少 5 days，之後 150 mg BID",
    renal: "DVT/PE 治療通常 CrCl <=30 避免；CrCl <15 無建議。",
    extended: "仍需依腎功能與出血風險評估，不常作為腎功能差病人的首選。",
  },
  {
    drug: "Edoxaban",
    acute: "先 parenteral anticoagulant 5-10 days，之後 60 mg QD",
    renal: "CrCl 15-50、體重 <=60 kg、或特定 P-gp inhibitor 任一條件符合：30 mg QD；CrCl <15 避免。",
    extended: "VTE 治療劑量依上述條件調整。",
  },
];

const ALGORITHMS = [
  {
    title: "DVT / PE acute treatment",
    tag: "Full treatment",
    rows: [
      ["何時用 UFH", "腎功能差、出血風險需快速停藥、可能近期 procedure、massive/submassive PE、ICU unstable 病人，或暫時不適合 DOAC/LMWH。"],
      ["起始算法", "若出血風險可接受：80 units/kg IV bolus，之後 18 units/kg/hr continuous infusion。若高出血風險：考慮 no bolus 或 low-intensity。"],
      ["監測", "開始後約 6 hr 抽 anti-Xa/aPTT；每次調整後 6 hr 再抽。目標 standard anti-Xa 0.3-0.7 IU/mL。"],
      ["轉藥", "Apixaban/rivaroxaban 不需 heparin lead-in；dabigatran/edoxaban 需 parenteral anticoagulation 至少 5 days；warfarin 需 overlap 至少 5 days 且 INR therapeutic。"],
      ["療程", "急性 DVT/PE primary treatment 通常 3-6 個月；暫時危險因子常 3 個月，unprovoked 或慢性危險因子再評估延長。"],
    ],
  },
  {
    title: "ACS / NSTEMI / unstable angina",
    tag: "ACS initial",
    rows: [
      ["何時用 UFH", "疑似/確診 NSTE-ACS、準備 invasive strategy 或需住院抗凝血時；需與 antiplatelet/PCI 策略一起看。"],
      ["起始算法", "常見：60 units/kg IV bolus（max 4000 units），之後 12 units/kg/hr（max 1000 units/hr）。"],
      ["監測", "非 PCI infusion 期間可用 anti-Xa/aPTT；若進 cath lab，PCI 期間多依 ACT 與 cath lab protocol 調整。"],
      ["用多久", "通常用到 PCI 完成、改其他抗凝血策略，或缺血風險穩定；若 CABG/出血/procedure 計畫需提早重評。"],
      ["注意", "合併 GP IIb/IIIa inhibitor、thrombolytic、DAPT、近期出血或 procedure 時，bolus/infusion 需依 cardiology protocol 調整。"],
    ],
  },
  {
    title: "Warfarin bridge / high thrombotic risk",
    tag: "Bridge",
    rows: [
      ["何時需要", "不是所有 AF 都需要 bridge。較常考慮：mechanical valve、近期 VTE、近期 stroke/TIA、極高血栓風險或醫師指定。"],
      ["起始算法", "通常不一定給 bolus；可用 therapeutic UFH infusion 18 units/kg/hr，或高出血風險時 no bolus / lower intensity。"],
      ["Warfarin overlap", "開始/重啟 warfarin 後，UFH 至少 overlap 5 days，且 INR 達治療目標後才停。"],
      ["Procedure timing", "若是 peri-procedure bridge，warfarin 通常術前約 5 days 停；UFH 在 procedure 前約 4-6 hr 停，術後依止血狀況重啟。"],
      ["注意", "術後早期、近期出血或 procedure bleeding risk 高時，避免 routine bolus，並每日重評是否仍需 bridge。"],
    ],
  },
  {
    title: "Low-intensity / high bleeding risk",
    tag: "Lower target",
    rows: [
      ["何時用", "高出血風險但仍需抗凝血、術後早期、暫時不能承受 full intensity，或醫師指定 lower target。"],
      ["起始算法", "通常 no bolus；常見起始 12 units/kg/hr。"],
      ["監測", "優先 anti-Xa 0.3-0.5 IU/mL；若只能用 aPTT，需要院內低強度對照表，不建議用固定秒數硬套。"],
      ["升階/降階", "若血栓風險高且出血穩定，可考慮升回 standard intensity；若出血或濃度過高，hold/降速並重評。"],
      ["注意", "Low-intensity 是折衷策略，不等於完整治療強度；需每日確認 indication 與出血風險。"],
    ],
  },
];

const ADJUSTMENT_ROWS = [
  { antiXa: "0.00-0.09", apttExample: "<40 sec", action: "Bolus 25 units/kg；infusion +3 units/kg/hr", next: "6 hr 後重抽" },
  { antiXa: "0.10-0.19", apttExample: "40-49 sec", action: "infusion +2 units/kg/hr", next: "6 hr 後重抽" },
  { antiXa: "0.20-0.29", apttExample: "50-69 sec", action: "infusion +1 units/kg/hr", next: "6 hr 後重抽" },
  { antiXa: "0.30-0.70", apttExample: "70-110 sec", action: "No change", next: "6 hr 後重抽；連續 2 次 therapeutic 後可改每日" },
  { antiXa: "0.71-0.79", apttExample: "111-120 sec", action: "infusion -1 units/kg/hr", next: "6 hr 後重抽" },
  { antiXa: "0.80-0.89", apttExample: "121-130 sec", action: "Hold 1 hr；restart 後 infusion -2 units/kg/hr", next: "restart 6 hr 後重抽" },
  { antiXa: "0.90-0.99", apttExample: "131-140 sec", action: "Hold 1 hr；restart 後 infusion -3 units/kg/hr", next: "restart 6 hr 後重抽" },
  { antiXa: "1.00-1.09", apttExample: "141-150 sec", action: "Hold 2 hr；restart 後 infusion -4 units/kg/hr", next: "restart 6 hr 後重抽" },
  { antiXa: ">=1.10", apttExample: ">150 sec", action: "Hold 2 hr；restart 後 infusion -5 units/kg/hr，並通知醫師評估出血", next: "restart 6 hr 後重抽" },
];

const MICU_ACT_ROWS = [
  { range: "121-140 sec", action: "Heparin pump 上調 1 mL/hr" },
  { range: "140-160 sec", action: "滴速不變" },
  { range: "160-180 sec", action: "Heparin pump 下調 1 mL/hr" },
  { range: "181-200 sec", action: "Heparin pump 下調 2 mL/hr" },
  { range: "201-220 sec", action: "Hold heparin 1 hr，then call Dr. / NP" },
];

const MICU_APTT_ROWS = [
  { range: ">100 sec", action: "Hold heparin pump 1 hr，再下調 2 mL/hr" },
  { range: "90-100 sec", action: "Heparin pump 下調 2 mL/hr" },
  { range: "70-90 sec", action: "Heparin pump 下調 1 mL/hr" },
  { range: "50-70 sec", action: "滴速不變" },
  { range: "40-50 sec", action: "Heparin pump 上調 1 mL/hr" },
  { range: "<40 sec", action: "Heparin pump 上調 2 mL/hr" },
];

const MICU_PREP_ROWS = [
  { order: "Heparin 25ku in N/S 500 mL IVD as titration", concentration: "50 U/mL", note: "CV-Heparin pump 可選泡法" },
  { order: "Heparin 25ku in N/S 250 mL IVD as titration", concentration: "100 U/mL", note: "CV-Heparin pump / IABP 常見泡法" },
];

const PCC_INR_OPTIONS: Record<PccInr, { label: string; dosePerKg: number; max: number }> = {
  "2to39": { label: "INR 2.0-3.9", dosePerKg: 25, max: 2500 },
  "4to6": { label: "INR 4.0-6.0", dosePerKg: 35, max: 3500 },
  "gt6": { label: "INR >6.0", dosePerKg: 50, max: 5000 },
};

const XA_AGENT_LABELS: Record<XaAgent, string> = {
  apixaban: "Apixaban",
  rivaroxaban: "Rivaroxaban",
  edoxaban: "Edoxaban",
  enoxaparin: "Enoxaparin",
  unknown: "Unknown Xa inhibitor",
};

function pumpRate(unitsPerHr: number, totalUnits: number, totalMl: number): number | null {
  if (!unitsPerHr || !totalUnits || !totalMl) return null;
  const concentration = totalUnits / totalMl;
  if (!concentration) return null;
  return round(unitsPerHr / concentration, 1);
}

function andexanetDose(agent: XaAgent, dose: number, timing: XaTiming): "low" | "high" {
  if (agent === "unknown" || timing === "unknown") return "high";
  if (timing === "ge8" && (agent === "apixaban" || agent === "rivaroxaban")) return "low";
  if (agent === "apixaban") return dose > 0 && dose <= 5 ? "low" : "high";
  if (agent === "rivaroxaban") return dose > 0 && dose <= 10 ? "low" : "high";
  if (agent === "enoxaparin") return dose > 0 && dose <= 40 ? "low" : "high";
  if (agent === "edoxaban") return dose > 0 && dose < 30 ? "low" : "high";
  return "high";
}

function pccAlternativeDose(weight: number, dosePerKg = 50): number {
  if (!weight) return 0;
  return roundUnits(Math.min(weight, 100) * dosePerKg);
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      {children}
      {hint && <div style={S.fieldHint}>{hint}</div>}
    </div>
  );
}

function Segmented<T extends string>({ value, options, onChange }: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div style={S.segmentWrap}>
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          style={{ ...S.segment, ...(value === option.id ? S.segmentActive : {}) }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function NumberInput({ value, onChange, suffix, placeholder }: {
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div style={S.inputWrap}>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={S.input}
      />
      {suffix && <span style={S.suffix}>{suffix}</span>}
    </div>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: ReactNode; highlight?: boolean }) {
  return (
    <div style={{ ...S.resultRow, ...(highlight ? S.resultRowHighlight : {}) }}>
      <div style={S.resultLabel}>{label}</div>
      <div style={S.resultValue}>{value}</div>
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section style={S.section}>
      <button onClick={() => setOpen(!open)} style={S.accordionBtn}>
        <span>{title}</span>
        <span>{open ? "⌃" : "⌄"}</span>
      </button>
      {open && <div style={S.accordionBody}>{children}</div>}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={S.bulletList}>
      {items.map((item) => <li key={item} style={S.bulletItem}>{item}</li>)}
    </ul>
  );
}

function AlgorithmCard({ title, tag, rows }: { title: string; tag: string; rows: string[][] }) {
  return (
    <div style={S.algorithmCard}>
      <div style={S.algorithmTop}>
        <div style={S.algorithmTitle}>{title}</div>
        <span style={S.algorithmTag}>{tag}</span>
      </div>
      <div>
        {rows.map(([label, value]) => (
          <div key={label} style={S.algorithmRow}>
            <div style={S.algorithmLabel}>{label}</div>
            <div style={S.algorithmValue}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function monitorTargetText(monitor: Monitor, protocol: (typeof INDICATIONS)[Indication]): string {
  if (monitor === "antiXa") return protocol.target;
  if (monitor === "act") return "MICU / IABP protocol：ACT 140-160 sec；routine DVT/PE 或 ACS infusion 通常不以 ACT 監測，除非 procedure / device protocol 指定。";
  return protocol.apttTarget;
}

export default function HeparinTool() {
  const [indication, setIndication] = useState<Indication>("vte");
  const [monitor, setMonitor] = useState<Monitor>("antiXa");
  const [weight, setWeight] = useState("");
  const [highBleedRisk, setHighBleedRisk] = useState(false);
  const [useBolus, setUseBolus] = useState(true);
  const [customProtocol, setCustomProtocol] = useState(false);
  const [customBolusPerKg, setCustomBolusPerKg] = useState("");
  const [customInfusionPerKgHr, setCustomInfusionPerKgHr] = useState("");
  const [totalUnits, setTotalUnits] = useState("25000");
  const [totalMl, setTotalMl] = useState("250");
  const [protamineWindow, setProtamineWindow] = useState<ProtamineWindow>("3");
  const [recentBolusUnits, setRecentBolusUnits] = useState("");
  const [manualInfusionUnitsHr, setManualInfusionUnitsHr] = useState("");
  const [reversalWeight, setReversalWeight] = useState("");
  const [pccInr, setPccInr] = useState<PccInr>("2to39");
  const [fibrinogenLevel, setFibrinogenLevel] = useState("");
  const [fibrinogenTarget, setFibrinogenTarget] = useState("1.5");
  const [xaAgent, setXaAgent] = useState<XaAgent>("apixaban");
  const [xaDose, setXaDose] = useState("");
  const [xaTiming, setXaTiming] = useState<XaTiming>("lt8");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<ToolTab>("heparin");

  const protocol = INDICATIONS[indication];
  const selectedAlgorithm = ALGORITHMS.find((item) => {
    if (indication === "vte") return item.title.startsWith("DVT");
    if (indication === "acs") return item.title.startsWith("ACS");
    if (indication === "bridge") return item.title.startsWith("Warfarin");
    return item.title.startsWith("Low-intensity");
  }) || ALGORITHMS[0];

  const dose = useMemo(() => {
    const w = n(weight);
    const bolusPerKg = customProtocol ? n(customBolusPerKg) : protocol.bolusPerKg;
    const infusionPerKgHr = customProtocol ? n(customInfusionPerKgHr) : protocol.infusionPerKgHr;
    const effectiveBolus = highBleedRisk || !useBolus ? 0 : bolusPerKg;
    const bolus = roundUnits(cap(effectiveBolus * w, protocol.bolusMax));
    const infusion = roundUnits(cap(infusionPerKgHr * w, protocol.infusionMax));
    const concentration = n(totalUnits) && n(totalMl) ? round(n(totalUnits) / n(totalMl), 1) : null;
    const mlHr = pumpRate(infusion, n(totalUnits), n(totalMl));
    const bolusStockMl = bolus ? round(bolus / STOCK_UNITS_PER_ML, 2) : 0;
    const infusionStockMlHr = infusion ? round(infusion / STOCK_UNITS_PER_ML, 2) : 0;
    return { weight: w, bolusPerKg, infusionPerKgHr, bolus, infusion, concentration, mlHr, bolusStockMl, infusionStockMlHr };
  }, [customBolusPerKg, customInfusionPerKgHr, customProtocol, highBleedRisk, indication, protocol, totalMl, totalUnits, useBolus, weight]);

  const protamine = useMemo(() => {
    const infusionUnitsHr = n(manualInfusionUnitsHr) || dose.infusion;
    const windowHours = n(protamineWindow);
    const heparinToReverse = infusionUnitsHr * windowHours + n(recentBolusUnits);
    const calculated = heparinToReverse / 100;
    const recommended = Math.min(50, Math.ceil(calculated));
    return {
      infusionUnitsHr,
      windowHours,
      heparinToReverse: Math.round(heparinToReverse),
      calculated: round(calculated, 1),
      recommended,
    };
  }, [dose.infusion, manualInfusionUnitsHr, protamineWindow, recentBolusUnits]);

  const pcc = useMemo(() => {
    const w = n(reversalWeight) || n(weight);
    const option = PCC_INR_OPTIONS[pccInr];
    const cappedWeight = Math.min(w, 100);
    const units = roundUnits(Math.min(cappedWeight * option.dosePerKg, option.max));
    return {
      weight: w,
      cappedWeight,
      option,
      units,
      vials: units ? Math.ceil(units / 500) : 0,
    };
  }, [pccInr, reversalWeight, weight]);

  const fibrinogen = useMemo(() => {
    const w = n(reversalWeight) || n(weight);
    const current = n(fibrinogenLevel);
    const target = n(fibrinogenTarget);
    const increase = Math.max(0, target - current);
    const mgPerKg = increase ? increase / 0.017 : 0;
    const grams = mgPerKg && w ? round((mgPerKg * w) / 1000, 1) : 0;
    return {
      weight: w,
      current,
      target,
      increase: round(increase, 2),
      mgPerKg: round(mgPerKg, 1),
      grams,
      vials: grams ? Math.ceil(grams) : 0,
    };
  }, [fibrinogenLevel, fibrinogenTarget, reversalWeight, weight]);

  const andexanet = useMemo(() => {
    const regimen = andexanetDose(xaAgent, n(xaDose), xaTiming);
    const pcc50 = pccAlternativeDose(n(reversalWeight) || n(weight), 50);
    return {
      regimen,
      bolus: regimen === "low" ? 400 : 800,
      infusionRate: regimen === "low" ? 4 : 8,
      infusionTotal: regimen === "low" ? 480 : 960,
      total: regimen === "low" ? 880 : 1760,
      pcc50,
      pccVials: pcc50 ? Math.ceil(pcc50 / 500) : 0,
    };
  }, [reversalWeight, weight, xaAgent, xaDose, xaTiming]);

  const tdmNote = [
    "Heparin dosing note",
    `Indication: ${protocol.label}`,
    `Weight: ${dose.weight || "--"} kg`,
    `Bleeding risk: ${highBleedRisk ? "high bleeding risk; consider no bolus / lower intensity" : "standard"}`,
    `Initial bolus: ${dose.bolus ? `${dose.bolus} units IV x1 (stock ${dose.bolusStockMl} mL; 5000 units/mL)` : "No bolus"}`,
    `Initial infusion: ${dose.infusion || "--"} units/hr${dose.infusionStockMlHr ? ` (stock equivalent ${dose.infusionStockMlHr} mL/hr; 5000 units/mL)` : ""}${dose.mlHr ? `; pump ${dose.mlHr} mL/hr` : ""}`,
    `Infusion concentration: ${dose.concentration ? `${dose.concentration} units/mL` : "not provided"}`,
    `Monitoring target: ${monitorTargetText(monitor, protocol)}`,
    "Monitoring timing: check level about 6 hours after initiation and 6 hours after each rate change; once therapeutic and stable, follow daily or institutional protocol.",
    `Clinical plan: ${protocol.duration}`,
  ].join("\n");

  const copyNote = async () => {
    await navigator.clipboard.writeText(tdmNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div>
      <div style={S.header}>
        <div style={S.title}>抗凝血 / 逆轉工具</div>
        <div style={S.subtitle}>UFH pump、DVT/PE 轉藥、PCC / fibrinogen / DOAC reversal 速查</div>
      </div>

      <div style={S.tabBar}>
        {[
          { id: "heparin", label: "Heparin" },
          { id: "transition", label: "轉藥" },
          { id: "reversal", label: "逆轉" },
          { id: "reference", label: "參考" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ToolTab)}
            style={{ ...S.tabButton, ...(activeTab === tab.id ? S.tabButtonActive : {}) }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "heparin" && (<>
      <section style={S.section}>
        <div style={S.sectionTitle}>病人與適應症</div>
        <div style={S.grid2}>
          <Field label="適應症">
            <select value={indication} onChange={(e) => {
              const next = e.target.value as Indication;
              setIndication(next);
              setUseBolus(INDICATIONS[next].bolusPerKg > 0);
              if (next === "lowIntensity") setHighBleedRisk(true);
            }} style={S.select}>
              {Object.entries(INDICATIONS).map(([id, item]) => (
                <option key={id} value={id}>{item.label}</option>
              ))}
            </select>
          </Field>
          <Field label="體重">
            <NumberInput value={weight} onChange={setWeight} suffix="kg" />
          </Field>
          <Field label="監測方式">
            <Segmented<Monitor>
              value={monitor}
              options={[
                { id: "antiXa", label: "anti-Xa" },
                { id: "aptt", label: "aPTT" },
                { id: "act", label: "ACT" },
              ]}
              onChange={setMonitor}
            />
          </Field>
          <Field label="治療強度">
            <label style={S.checkboxRow}>
              <input type="checkbox" checked={highBleedRisk} onChange={(e) => setHighBleedRisk(e.target.checked)} />
              <span>高出血風險 / 考慮 lower intensity</span>
            </label>
            <label style={S.checkboxRow}>
              <input type="checkbox" checked={useBolus} disabled={highBleedRisk || protocol.bolusPerKg === 0} onChange={(e) => setUseBolus(e.target.checked)} />
              <span>給 heparin bolus</span>
            </label>
          </Field>
        </div>

        {highBleedRisk && (
          <div style={S.warning}>
            高出血風險時通常考慮不給 bolus、使用 low-intensity target，並更密集評估出血與血栓風險。若仍需 full-dose，請依醫師/院內 protocol 決定。
          </div>
        )}

        <Accordion title="哪些算高出血風險？">
          <BulletList items={HIGH_BLEEDING_RISK} />
        </Accordion>

        <Accordion title="什麼時候該給 bolus？">
          <div style={S.refBlock}>
            <h3 style={S.refHeading}>比較會給 bolus</h3>
            <p>需要快速達到治療性抗凝血，且出血風險可接受時，通常會考慮 bolus。</p>
            <BulletList items={[
              "急性 DVT / PE full treatment，尤其血栓明確、症狀明顯，且無明顯高出血風險",
              "ACS / NSTEMI / unstable angina 初始治療，依 cardiology 或院內 protocol",
              "Massive / submassive PE 或血栓風險很高的情境，但需同時考慮 thrombolysis / procedure 計畫",
              "治療中 anti-Xa/aPTT 明顯偏低，且需要快速回到 therapeutic range 時，可依院內調整表考慮 re-bolus",
            ]} />

            <h3 style={S.refHeading}>通常避免或考慮不給 bolus</h3>
            <BulletList items={[
              "活動性出血、近期重大出血、近期 GI bleeding 或嚴重貧血",
              "近期手術、外傷、侵入性處置，或短期內可能需要 procedure",
              "近期顱內出血、缺血性中風、顱內病灶或神經外科術後",
              "血小板低下、DIC、嚴重肝病或 baseline coagulation test 明顯異常",
              "已使用 DAPT、thrombolytic、其他抗凝血藥，或整體出血風險高",
              "Warfarin bridge / peri-procedure bridge，尤其術後早期或高出血風險時，常選 no bolus infusion",
            ]} />
            <div style={S.infoNote}>
              實務判斷：DVT/PE full treatment 且出血風險不高，常給 bolus；若高出血風險，優先考慮 no bolus 或 low-intensity target。Bridge 情境則不一定需要 bolus。
            </div>
          </div>
        </Accordion>
      </section>

      <section style={S.section}>
        <div style={S.sectionTitle}>Heparin 泡法 / Pump 換算</div>
        <div style={S.productBox}>
          院內品項：Heparin 抗凝血針 25,000 IU/Vial（5,000 IU/mL）。MICU protocol 可見 25,000 U in NS 500 mL（50 U/mL）或 25,000 U in NS 250 mL（100 U/mL）as titration；下面濃度仍可自行改成實際病房泡法。
        </div>
        <div style={S.grid2}>
          <Field label="輸注袋總 heparin">
            <NumberInput value={totalUnits} onChange={setTotalUnits} suffix="units" />
          </Field>
          <Field label="輸注袋總體積">
            <NumberInput value={totalMl} onChange={setTotalMl} suffix="mL" />
          </Field>
        </div>
        <div style={S.patientBox}>
          <span>目前濃度：{dose.concentration ? `${dose.concentration} units/mL` : "請輸入總 units 與總體積"}</span>
          <span>範例：25,000 units / 500 mL = 50 units/mL；25,000 units / 250 mL = 100 units/mL。若院內另有標準泡法，請改成院內實際濃度。</span>
        </div>
      </section>

      <section style={S.section}>
        <div style={S.sectionTitle}>目前適應症流程</div>
        <AlgorithmCard title={selectedAlgorithm.title} tag={selectedAlgorithm.tag} rows={selectedAlgorithm.rows} />
      </section>

      <section style={S.section}>
        <div style={S.sectionTitle}>起始劑量</div>
        <label style={S.checkboxRow}>
          <input type="checkbox" checked={customProtocol} onChange={(e) => setCustomProtocol(e.target.checked)} />
          <span>自訂 units/kg protocol</span>
        </label>
        {customProtocol && (
          <div style={{ ...S.grid2, marginTop: 12 }}>
            <Field label="Bolus">
              <NumberInput value={customBolusPerKg} onChange={setCustomBolusPerKg} suffix="units/kg" />
            </Field>
            <Field label="Infusion">
              <NumberInput value={customInfusionPerKgHr} onChange={setCustomInfusionPerKgHr} suffix="units/kg/hr" />
            </Field>
          </div>
        )}

        <div style={S.resultCard}>
          <div style={S.cardTitle}>{protocol.short} 起始建議</div>
          <ResultRow label="Bolus" value={dose.bolus ? `${dose.bolus} units IV x1（原液約 ${dose.bolusStockMl} mL；5000 units/mL）` : "No bolus"} highlight />
          <ResultRow label="Infusion" value={dose.infusion ? `${dose.infusion} units/hr（原液約 ${dose.infusionStockMlHr} mL/hr；5000 units/mL）` : "請輸入體重"} highlight />
          <ResultRow label="Pump rate" value={dose.mlHr ? `${dose.mlHr} mL/hr（稀釋後 ${dose.concentration} units/mL）` : "請輸入體重與泡法"} highlight />
          <ResultRow label="Protocol" value={`${highBleedRisk || !useBolus ? 0 : dose.bolusPerKg} units/kg bolus；${dose.infusionPerKgHr || "--"} units/kg/hr`} />
          <ResultRow label="監測目標" value={monitorTargetText(monitor, protocol)} />
          <ResultRow label="抽血時間" value="開始後約 6 小時抽 anti-Xa/aPTT；每次調整後約 6 小時再抽；穩定 therapeutic 後可每日追蹤。" />
          <ResultRow label="療程 / 轉銜" value={protocol.duration} />
        </div>

        <div style={S.infoNote}>{protocol.note}</div>
      </section>

      <section style={S.section}>
        <div style={S.sectionTitle}>監測後如何調整</div>
        <div style={S.subsectionTitle}>MICU / CV-Heparin pump 院內 protocol</div>
        <div style={S.productBox}>
          MICU CV-Heparin pump 醫囑：Heparin 25ku in NS 500 mL 或 250 mL IVD as titration，Keep aPTT 50-70 sec；Check aPTT 可依醫囑 Q6H 或 Q8H。這是院內 heparin pump 調整表，不直接取代 DVT/PE 或 ACS full systemic anticoagulation protocol。
        </div>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>泡法</th>
                <th style={S.th}>濃度</th>
                <th style={S.th}>備註</th>
              </tr>
            </thead>
            <tbody>
              {MICU_PREP_ROWS.map((row) => (
                <tr key={row.order}>
                  <td style={S.tdStrong}>{row.order}</td>
                  <td style={S.td}>{row.concentration}</td>
                  <td style={S.td}>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ ...S.tableWrap, marginTop: 10 }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>監測</th>
                <th style={S.th}>目標 / 範圍</th>
                <th style={S.th}>調整方式</th>
              </tr>
            </thead>
            <tbody>
              {MICU_APTT_ROWS.map((row) => (
                <tr key={`cv-aptt-${row.range}`}>
                  <td style={S.tdStrong}>aPTT</td>
                  <td style={S.td}>{row.range}</td>
                  <td style={S.td}>{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={S.subsectionTitle}>MICU / IABP 院內 protocol</div>
        <div style={S.productBox}>
          MICU IABP 醫囑：Heparin 25,000 U in NS 250 mL IVD as titration，Keep ACT 140-160 sec 或 Keep aPTT 50-70 sec；ACT 或 aPTT 擇一監測 Q6H，並請與 VS / 醫囑確認。這張表適用 IABP/device heparinization 情境，不直接取代 DVT/PE 或 ACS full systemic anticoagulation protocol。
        </div>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>監測</th>
                <th style={S.th}>目標 / 範圍</th>
                <th style={S.th}>調整方式</th>
              </tr>
            </thead>
            <tbody>
              {MICU_ACT_ROWS.map((row) => (
                <tr key={`act-${row.range}`}>
                  <td style={S.tdStrong}>ACT</td>
                  <td style={S.td}>{row.range}</td>
                  <td style={S.td}>{row.action}</td>
                </tr>
              ))}
              {MICU_APTT_ROWS.map((row) => (
                <tr key={`aptt-${row.range}`}>
                  <td style={S.tdStrong}>aPTT</td>
                  <td style={S.td}>{row.range}</td>
                  <td style={S.td}>{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={S.subsectionTitle}>一般 adult therapeutic UFH 範例 nomogram</div>
        <div style={S.warning}>
          這是 adult therapeutic UFH 的範例 nomogram，適合用來理解調整方向。anti-Xa 分界相對可參考；aPTT 秒數需由院內檢驗試劑/儀器校正後才能正式使用，若院內未建立，請避免只用固定秒數調整。
        </div>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>anti-Xa IU/mL</th>
                <th style={S.th}>aPTT 範例</th>
                <th style={S.th}>建議調整</th>
                <th style={S.th}>下次監測</th>
              </tr>
            </thead>
            <tbody>
              {ADJUSTMENT_ROWS.map((row) => (
                <tr key={row.antiXa}>
                  <td style={S.tdStrong}>{row.antiXa}</td>
                  <td style={S.td}>{row.apttExample}</td>
                  <td style={S.td}>{row.action}</td>
                  <td style={S.td}>{row.next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={S.infoNote}>
          Low-intensity 目標通常較低（例如 anti-Xa 0.3-0.5 IU/mL），不應直接套用 standard intensity 的 supratherapeutic 分界。若有出血、急需手術、抽血疑似污染，或 anti-Xa/aPTT 與臨床不一致，請優先臨床評估並通知醫師。
        </div>
      </section>

      <section style={S.section}>
        <div style={S.sectionTitle}>TDM Note 預覽</div>
        <pre style={S.note}>{tdmNote}</pre>
        <button onClick={copyNote} style={{ ...S.copyBtn, background: copied ? "#059669" : ACCENT }}>
          {copied ? "已複製" : "複製 Heparin Note"}
        </button>
      </section>
      </>)}

      {activeTab === "transition" && (<>
      <Accordion title="DVT / PE 轉口服抗凝血劑" defaultOpen>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>藥物</th>
                <th style={S.th}>VTE regimen</th>
                <th style={S.th}>是否需 heparin / overlap</th>
                <th style={S.th}>注意</th>
              </tr>
            </thead>
            <tbody>
              {DOAC_ROWS.map((row) => (
                <tr key={row.drug}>
                  <td style={S.tdStrong}>{row.drug}</td>
                  <td style={S.td}>{row.regimen}</td>
                  <td style={S.td}>{row.overlap}</td>
                  <td style={S.td}>{row.caveat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={S.infoNote}>
          Apixaban / rivaroxaban 可直接作為 acute VTE 初始治療，不一定需要先用 heparin 或 LMWH；dabigatran / edoxaban 則需先完成至少 5 天 parenteral anticoagulation。
        </div>
      </Accordion>

      <Accordion title="Warfarin 轉 DOAC" defaultOpen>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>DOAC</th>
                <th style={S.th}>何時開始</th>
                <th style={S.th}>注意</th>
              </tr>
            </thead>
            <tbody>
              {WARFARIN_TO_DOAC_ROWS.map((row) => (
                <tr key={row.drug}>
                  <td style={S.tdStrong}>{row.drug}</td>
                  <td style={S.td}>{row.start}</td>
                  <td style={S.td}>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Accordion>

      <Accordion title="DOAC 轉 Warfarin" defaultOpen>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>原本 DOAC</th>
                <th style={S.th}>轉換方式</th>
                <th style={S.th}>注意</th>
              </tr>
            </thead>
            <tbody>
              {DOAC_TO_WARFARIN_ROWS.map((row) => (
                <tr key={row.drug}>
                  <td style={S.tdStrong}>{row.drug}</td>
                  <td style={S.td}>{row.method}</td>
                  <td style={S.td}>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={S.warning}>
          DOAC 轉 warfarin 時最怕抗凝空窗。Apixaban/rivaroxaban 會干擾 INR，單看 transition 期間 INR 容易誤判；高血栓風險病人通常要有 parenteral anticoagulant cover。
        </div>
      </Accordion>

      <Accordion title="DOAC 的 VTE 劑量與腎功能" defaultOpen>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>DOAC</th>
                <th style={S.th}>急性 DVT/PE 治療</th>
                <th style={S.th}>腎功能重點</th>
                <th style={S.th}>Extended prevention</th>
              </tr>
            </thead>
            <tbody>
              {DOAC_RENAL_ROWS.map((row) => (
                <tr key={row.drug}>
                  <td style={S.tdStrong}>{row.drug}</td>
                  <td style={S.td}>{row.acute}</td>
                  <td style={S.td}>{row.renal}</td>
                  <td style={S.td}>{row.extended}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Accordion>
      </>)}

      {activeTab === "reversal" && (<>
      <section style={S.section}>
        <div style={S.sectionTitle}>抗凝血逆轉 / Hemostatic agents</div>
        <div style={S.productBox}>
          院內品項：Beriplex P/N 500、Haemocomplettan P 1 g、Idarucizumab。Andexanet 目前院內沒有，但保留劑量速查；若無 andexanet，Xa inhibitor life-threatening bleeding 常見替代為 4F-PCC 25-50 units/kg，需依醫師與院內流程。
        </div>

        <div style={S.subsectionTitle}>Warfarin / VKA major bleeding：Beriplex P/N + Vitamin K</div>
        <div style={S.grid2}>
          <Field label="體重">
            <NumberInput value={reversalWeight} onChange={setReversalWeight} suffix="kg" placeholder={weight || ""} />
          </Field>
          <Field label="INR">
            <select value={pccInr} onChange={(e) => setPccInr(e.target.value as PccInr)} style={S.select}>
              {Object.entries(PCC_INR_OPTIONS).map(([id, item]) => (
                <option key={id} value={id}>{item.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div style={S.resultCard}>
          <div style={S.cardTitle}>Beriplex 估算</div>
          <ResultRow label="Dose" value={pcc.units ? `${pcc.option.dosePerKg} units/kg（以 Factor IX units 計）` : "請輸入體重"} />
          <ResultRow label="建議總量" value={pcc.units ? `${pcc.units} units（體重計算上限 100 kg；max ${pcc.option.max} units）` : "請輸入體重"} highlight />
          <ResultRow label="約需瓶數" value={pcc.units ? `約 ${pcc.vials} 瓶 Beriplex P/N 500` : "請輸入體重"} highlight />
          <ResultRow label="合併處置" value="Major/life-threatening bleeding 需同時給 Vitamin K 5-10 mg slow IV；PCC 作用快，但 Vitamin K 才能維持後續凝血因子生成。" />
        </div>
        <div style={S.warning}>
          Beriplex 每瓶標示為 500 IU，但各凝血因子實際 potency 有範圍，請依瓶身/批號確認。PCC 有血栓風險，通常只用於 major 或 life-threatening bleeding、critical site bleeding 或 urgent surgery/procedure。
        </div>

        <div style={S.subsectionTitle}>Dabigatran：Idarucizumab</div>
        <div style={S.resultCard}>
          <div style={S.cardTitle}>院內可用：Idarucizumab</div>
          <ResultRow label="適用情境" value="Dabigatran 使用者需要緊急手術/urgent procedure，或 life-threatening / uncontrolled bleeding。" />
          <ResultRow label="Dose" value="5 g IV = 2.5 g/50 mL x 2 vials，兩瓶連續給予" highlight />
          <ResultRow label="監測" value="可參考 thrombin time、dilute thrombin time、ECT、aPTT 與臨床止血；12-24 hr 可能 rebound，若再出血或需第二次 procedure，需重新評估。" />
        </div>

        <div style={S.subsectionTitle}>Factor Xa inhibitor：Andexanet / PCC 替代</div>
        <div style={S.grid2}>
          <Field label="藥物">
            <select value={xaAgent} onChange={(e) => setXaAgent(e.target.value as XaAgent)} style={S.select}>
              {Object.entries(XA_AGENT_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="最後一次劑量">
            <NumberInput value={xaDose} onChange={setXaDose} suffix="mg" />
          </Field>
          <Field label="距離最後一次給藥">
            <select value={xaTiming} onChange={(e) => setXaTiming(e.target.value as XaTiming)} style={S.select}>
              <option value="lt8">&lt;8 hr</option>
              <option value="ge8">≥8 hr</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>
        </div>
        <div style={S.resultCard}>
          <div style={S.cardTitle}>Andexanet alfa 速查（院內目前無）</div>
          <ResultRow label="Regimen" value={andexanet.regimen === "low" ? "Low dose" : "High dose"} highlight />
          <ResultRow label="Bolus" value={`${andexanet.bolus} mg IV bolus（30 mg/min）`} />
          <ResultRow label="Infusion" value={`${andexanet.infusionRate} mg/min x 120 min（infusion total ${andexanet.infusionTotal} mg；total ${andexanet.total} mg）`} />
          <ResultRow label="若無 Andexanet" value={andexanet.pcc50 ? `可考慮 4F-PCC 50 units/kg：${andexanet.pcc50} units，約 ${andexanet.pccVials} 瓶 Beriplex P/N 500（需醫師評估）` : "輸入體重後可估 4F-PCC 50 units/kg"} highlight />
        </div>
        <div style={S.infoNote}>
          Andexanet 主要用於 apixaban/rivaroxaban 相關 life-threatening 或 uncontrolled bleeding；edoxaban/enoxaparin 的劑量表多來自研究/仿單延伸。若只是不嚴重出血，多數情境先 hold anticoagulant、局部止血與支持治療，不一定需要 reversal agent。
        </div>

        <div style={S.subsectionTitle}>低 fibrinogen / 大出血：Haemocomplettan P</div>
        <div style={S.grid2}>
          <Field label="目前 fibrinogen">
            <NumberInput value={fibrinogenLevel} onChange={setFibrinogenLevel} suffix="g/L" />
          </Field>
          <Field label="目標 fibrinogen">
            <NumberInput value={fibrinogenTarget} onChange={setFibrinogenTarget} suffix="g/L" />
          </Field>
        </div>
        <div style={S.resultCard}>
          <div style={S.cardTitle}>Haemocomplettan P 估算</div>
          <ResultRow label="院內規格" value="Haemocomplettan P 1 g/Vial" />
          <ResultRow label="需提升" value={fibrinogen.current ? `${fibrinogen.increase} g/L` : "請輸入目前 fibrinogen"} />
          <ResultRow label="估算劑量" value={fibrinogen.grams ? `${fibrinogen.grams} g（${fibrinogen.mgPerKg} mg/kg）` : "輸入體重、目前值與目標值後估算"} highlight />
          <ResultRow label="約需瓶數" value={fibrinogen.vials ? `約 ${fibrinogen.vials} 瓶` : "尚無法估算"} highlight />
          <ResultRow label="經驗起始" value="重大出血且 fibrinogen ≤1.5 g/L 時，常見初始 fibrinogen concentrate 3-4 g，之後依 fibrinogen / VEM 與臨床止血重評。" />
        </div>
        <div style={S.warning}>
          Haemocomplettan 公式採 dose (mg/kg) = [target - measured fibrinogen (g/L)] / 0.017。實際仍需依出血位置、VEM/TEG、輸血策略與後續 fibrinogen 濃度調整。
        </div>
      </section>

      <section style={S.section}>
        <div style={S.sectionTitle}>Protamine 逆轉 UFH</div>
        <div style={S.grid2}>
          <Field label="目前 heparin infusion">
            <NumberInput value={manualInfusionUnitsHr} onChange={setManualInfusionUnitsHr} suffix="units/hr" placeholder={dose.infusion ? `${dose.infusion}` : ""} />
          </Field>
          <Field label="估算需中和時間">
            <Segmented<ProtamineWindow>
              value={protamineWindow}
              options={[
                { id: "2", label: "2 hr" },
                { id: "3", label: "3 hr" },
              ]}
              onChange={setProtamineWindow}
            />
          </Field>
          <Field label="近期 bolus / flush 劑量" hint="若過去 2-3 小時內有額外 bolus，填入 units；沒有可留空。">
            <NumberInput value={recentBolusUnits} onChange={setRecentBolusUnits} suffix="units" />
          </Field>
        </div>

        <div style={S.resultCard}>
          <div style={S.cardTitle}>Protamine 估算</div>
          <ResultRow label="Heparin to reverse" value={`${protamine.heparinToReverse} units`} />
          <ResultRow label="Calculated dose" value={`${protamine.calculated} mg`} />
          <ResultRow label="Practical max" value={`建議不超過 ${protamine.recommended} mg；單次通常 max 50 mg`} highlight />
          <ResultRow label="給法" value="Protamine slow IV；常見上限為 50 mg over 10 minutes，過快可能造成嚴重低血壓或 anaphylactoid reaction。" />
        </div>

        <div style={S.warning}>
          Protamine 1 mg 約中和 UFH 100 units；因 UFH 半衰期短，通常只計算過去 2-3 小時內的 heparin。若是 life-threatening bleeding，請同步處理出血來源、輸血/凝血因子與醫師評估。
        </div>
      </section>
      </>)}

      {activeTab === "reference" && (<>
      <section style={S.section}>
        <div style={S.sectionTitle}>臨床參考</div>
        <div style={S.referenceBody}>
        <h3 style={S.refHeading}>監測</h3>
        <p>Baseline 建議看 CBC/platelet、PT/INR、aPTT、SCr、肝功能、出血史與是否併用 antiplatelet/NSAID/其他抗凝血藥。UFH 開始後約 6 小時抽 anti-Xa 或 aPTT；每次調整後約 6 小時再抽。</p>
        <p>anti-Xa 常見 therapeutic range：standard intensity 0.3-0.7 IU/mL；low intensity 0.3-0.5 IU/mL。若使用 aPTT，目標應由院內 reagent/coagulometer 校正到 anti-Xa 0.3-0.7 IU/mL；若院內未建立，可暫以約 control 1.5-2.5 倍作粗略參考，但不建議用固定秒數硬判讀。</p>
        <p>不同試劑差異可能很大，文獻中 anti-Xa 0.3 IU/mL 對應的 aPTT 可落在約 48-108 秒。因此若 aPTT 與臨床狀況不一致，或病人有 lupus anticoagulant、factor deficiency、DIC、嚴重發炎、肝病等干擾，建議優先改用 anti-Xa 判讀。</p>

        <h3 style={S.refHeading}>逆轉劑使用原則</h3>
        <p>逆轉劑通常保留給 life-threatening bleeding、critical site bleeding、持續 major bleeding，或不能延後的 urgent surgery/procedure。非重大出血多先 hold anticoagulant、局部止血、補充輸液/血品並處理出血來源。</p>
        <p>Warfarin / VKA major bleeding：優先使用 4-factor PCC（院內 Beriplex P/N）合併 Vitamin K slow IV；PCC 起效快，但仍需 Vitamin K 維持後續凝血因子生成。使用後需追蹤 INR 與血栓風險。</p>
        <p>UFH 相關嚴重出血：protamine 依過去 2-3 小時 heparin 暴露量估算，常用 1 mg protamine 中和 UFH 100 units，slow IV 給藥並留意 hypotension、bradycardia 與 anaphylactoid reaction。</p>
        <p>Dabigatran：特異性逆轉劑為 idarucizumab 5 g IV。Factor Xa inhibitors（apixaban / rivaroxaban 等）：若有 andexanet alfa 可作為特異性逆轉；若無，重大出血常以 4F-PCC 25-50 units/kg 作替代選項，需依醫師與院內流程評估。</p>
        <p>大量出血合併低 fibrinogen 時，可考慮 fibrinogen concentrate（院內 Haemocomplettan P）或其他血品策略；給藥後應回頭追蹤 fibrinogen、凝血數據與臨床止血狀況。</p>

        <h3 style={S.refHeading}>Heparin-induced thrombocytopenia（HIT，肝素誘發性血小板低下）</h3>
        <p>UFH 使用第 5-10 天若 platelet 下降、出現新血栓或皮膚壞死，需考慮 heparin-induced thrombocytopenia（HIT）。可用 4Ts score 初步評估；若中高機率，應停 heparin 並改非 heparin anticoagulant。</p>

        <h3 style={S.refHeading}>ACS 與 PCI</h3>
        <p>ACS 起始常見 UFH 60 units/kg bolus（max 4000 units）後 12 units/kg/hr（max 1000 units/hr）。PCI 期間多依 ACT 與 cath lab protocol 調整，app 只提供初始治療參考。</p>

        <h3 style={S.refHeading}>VTE 療程</h3>
        <p>急性 DVT/PE 通常至少治療 3 個月。若是暫時危險因子造成，常以 3 個月為主；若 unprovoked、active cancer、APS 或持續危險因子，需評估延長治療與出血風險。</p>
        </div>
      </section>
      </>)}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  header: { textAlign: "center", padding: "16px 0 24px" },
  title: { fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: 0 },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 4, lineHeight: 1.5 },
  tabBar: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, background: "#E2E8F0", padding: 4, borderRadius: 12, marginBottom: 16 },
  tabButton: { border: "none", borderRadius: 9, background: "transparent", color: "#475569", padding: "10px 6px", fontSize: 13, fontWeight: 900, cursor: "pointer" },
  tabButtonActive: { background: "#FFFFFF", color: "#0F766E", boxShadow: "0 1px 3px rgba(15,23,42,0.12)" },
  section: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", boxSizing: "border-box", overflow: "hidden" },
  sectionTitle: { fontSize: 13, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0, marginBottom: 14 },
  subsectionTitle: { fontSize: 14, fontWeight: 900, color: "#0F172A", margin: "18px 0 10px" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 },
  label: { display: "block", fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 6 },
  fieldHint: { color: "#64748B", fontSize: 12, lineHeight: 1.5, marginTop: 6 },
  select: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", boxSizing: "border-box" },
  inputWrap: { display: "flex", alignItems: "center", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", overflow: "hidden" },
  input: { flex: 1, minWidth: 0, padding: "10px 12px", border: "none", fontSize: 15, color: "#0F172A", background: "#fff", outline: "none", boxSizing: "border-box", width: "100%" },
  suffix: { padding: "0 10px", color: "#64748B", fontSize: 12, whiteSpace: "nowrap" },
  segmentWrap: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(86px, 1fr))", gap: 8 },
  segment: { border: "1.5px solid #E2E8F0", borderRadius: 8, background: "#fff", color: "#475569", padding: "9px 8px", fontSize: 13, fontWeight: 800, cursor: "pointer" },
  segmentActive: { border: `1.5px solid ${ACCENT}`, background: "#F0FDFA", color: "#0F766E" },
  checkboxRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, color: "#475569", lineHeight: 1.45 },
  warning: { background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.55, marginTop: 10 },
  productBox: { background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#334155", borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.55, marginBottom: 12 },
  patientBox: { display: "flex", flexDirection: "column", gap: 4, background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", color: "#475569", fontSize: 13, marginTop: 12, lineHeight: 1.5 },
  resultCard: { marginTop: 14, border: "1px solid #DDE5F0", borderRadius: 10, padding: 14, background: "#FAFCFF" },
  cardTitle: { fontWeight: 800, fontSize: 16, color: "#0F172A", marginBottom: 10 },
  resultRow: { display: "grid", gridTemplateColumns: "minmax(110px, 0.65fr) minmax(0, 1.35fr)", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(148,163,184,0.25)", alignItems: "start" },
  resultRowHighlight: { background: "#F0FDFA", marginLeft: -8, marginRight: -8, paddingLeft: 8, paddingRight: 8, borderRadius: 6, borderBottom: "none" },
  resultLabel: { color: "#64748B", fontSize: 13, fontWeight: 800 },
  resultValue: { color: "#0F172A", fontSize: 14, lineHeight: 1.55, wordBreak: "break-word", fontWeight: 700 },
  infoNote: { color: "#475569", fontSize: 13, lineHeight: 1.6, marginTop: 10 },
  note: { whiteSpace: "pre-wrap", background: "#0F172A", color: "#E2E8F0", borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.55, overflowX: "auto" },
  copyBtn: { width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 10, border: "none", background: ACCENT, color: "#fff", fontWeight: 800, cursor: "pointer" },
  accordionBtn: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", border: "none", background: "transparent", padding: 0, fontSize: 16, color: "#0F172A", fontWeight: 800, cursor: "pointer" },
  accordionBody: { marginTop: 12, color: "#334155", fontSize: 13, lineHeight: 1.65 },
  referenceBody: { color: "#334155", fontSize: 13, lineHeight: 1.65 },
  bulletList: { margin: "0 0 0 18px", padding: 0, color: "#334155", fontSize: 13, lineHeight: 1.65 },
  bulletItem: { marginBottom: 4 },
  algorithmGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 },
  algorithmCard: { border: "1px solid #E2E8F0", borderRadius: 10, background: "#FFFFFF", padding: 14, boxSizing: "border-box" },
  algorithmTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 },
  algorithmTitle: { color: "#0F172A", fontSize: 15, fontWeight: 900, lineHeight: 1.35 },
  algorithmTag: { flexShrink: 0, borderRadius: 999, background: "#F0FDFA", color: "#0F766E", padding: "4px 8px", fontSize: 11, fontWeight: 900 },
  algorithmRow: { display: "grid", gridTemplateColumns: "82px minmax(0, 1fr)", gap: 10, borderTop: "1px solid #F1F5F9", paddingTop: 8, marginTop: 8 },
  algorithmLabel: { color: "#64748B", fontSize: 12, fontWeight: 900, lineHeight: 1.5 },
  algorithmValue: { color: "#334155", fontSize: 13, lineHeight: 1.6 },
  tableWrap: { overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 760 },
  th: { textAlign: "left", padding: "10px 12px", background: "#F8FAFC", color: "#475569", fontSize: 12, fontWeight: 800, borderBottom: "1px solid #E2E8F0", verticalAlign: "top" },
  td: { padding: "10px 12px", borderBottom: "1px solid #EEF2F7", color: "#334155", fontSize: 13, lineHeight: 1.55, verticalAlign: "top" },
  tdStrong: { padding: "10px 12px", borderBottom: "1px solid #EEF2F7", color: "#0F172A", fontSize: 13, lineHeight: 1.55, verticalAlign: "top", fontWeight: 800 },
  refHeading: { fontSize: 14, color: "#0F172A", margin: "14px 0 6px", fontWeight: 800 },
};
