import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

const ACCENT = "#0D9488";
const FREE_LOW = 5;
const FREE_HIGH = 17;
const FREE_DOSE_TARGET_HIGH = 15;

type LevelCategory = "low" | "target" | "high" | "unknown";
type LevelTiming = "trough" | "random" | "postLoad";
type Formulation = "IV" | "IR_DR" | "ER";

type DoseRecommendation = {
  title: string;
  tone: "blue" | "green" | "amber" | "red" | "gray";
  summary: string;
  detail: string[];
  holdPlan?: {
    dosesMin: number;
    dosesMax: number;
    hoursMin: number;
    hoursMax: number;
    restartTarget: number;
  };
  suggestedDailyDoseRange?: {
    min: number;
    max: number;
    perDoseMin: number;
    perDoseMax: number;
    proportionalMin: number;
    proportionalMax: number;
    capped?: boolean;
  };
};

const FORMULATION_LABELS: Record<Formulation, string> = {
  IV: "IV valproate",
  IR_DR: "PO immediate/delayed-release",
  ER: "PO ER/Chrono",
};

const TIMING_LABELS: Record<LevelTiming, string> = {
  trough: "Trough / pre-dose",
  random: "Random level",
  postLoad: "Post-load / distribution 未完成",
};

const TIMING_NOTE_LABELS: Record<LevelTiming, string> = {
  trough: "Trough / pre-dose",
  random: "Random level",
  postLoad: "Post-load / incomplete distribution phase",
};

function n(value: string): number {
  return parseFloat(value) || 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundTo250(value: number): number {
  return Math.max(250, Math.round(value / 250) * 250);
}

function doseRangeText(min: number, max: number, unit = "mg/day"): string {
  return min === max ? `${min} ${unit}` : `${min}-${max} ${unit}`;
}

function estimateMaintenanceRange(activeFree: number, dailyDose: number, interval: number, capIncrease = false): DoseRecommendation["suggestedDailyDoseRange"] {
  const dosesPerDay = 24 / Math.max(1, interval || 24);
  const proportionalMin = roundTo250(dailyDose * FREE_LOW / activeFree);
  const proportionalMax = roundTo250(dailyDose * FREE_DOSE_TARGET_HIGH / activeFree);
  let min = Math.min(proportionalMin, proportionalMax);
  let max = Math.max(proportionalMin, proportionalMax);
  let capped = false;

  if (capIncrease) {
    const cappedMax = roundTo250(dailyDose * 1.25);
    if (max > cappedMax) {
      max = cappedMax;
      capped = true;
    }
    min = Math.min(Math.max(dailyDose + 250, min), max);
  }

  return {
    min,
    max,
    perDoseMin: round1(min / dosesPerDay),
    perDoseMax: round1(max / dosesPerDay),
    proportionalMin,
    proportionalMax,
    capped,
  };
}

function toneColor(tone: DoseRecommendation["tone"]): { color: string; bg: string; border: string } {
  if (tone === "red") return { color: "#B91C1C", bg: "#FEF2F2", border: "#FECACA" };
  if (tone === "amber") return { color: "#92400E", bg: "#FEF3C7", border: "#F59E0B" };
  if (tone === "green") return { color: "#047857", bg: "#ECFDF5", border: "#A7F3D0" };
  if (tone === "blue") return { color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" };
  return { color: "#475569", bg: "#F8FAFC", border: "#E2E8F0" };
}

function interpretFree(value: number): { category: LevelCategory; label: string; color: string; bg: string; border: string } {
  if (!Number.isFinite(value)) return { category: "unknown", label: "尚未計算", color: "#64748B", bg: "#F8FAFC", border: "#E2E8F0" };
  if (value < FREE_LOW) return { category: "low", label: "偏低", color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" };
  if (value > FREE_HIGH) return { category: "high", label: "偏高 / 毒性風險", color: "#B91C1C", bg: "#FEF2F2", border: "#FECACA" };
  return { category: "target", label: "落在參考範圍", color: "#047857", bg: "#ECFDF5", border: "#A7F3D0" };
}

function interpretTotal(value: number): { label: string; color: string } {
  if (!value) return { label: "尚未輸入", color: "#64748B" };
  if (value < 50) return { label: "total VPA 偏低", color: "#1D4ED8" };
  if (value > 125) return { label: "total VPA 偏高", color: "#B91C1C" };
  return { label: "total VPA 50-125 mcg/mL", color: "#047857" };
}

function interpretFreeNote(value: number): string {
  if (!Number.isFinite(value)) return "not available";
  if (value < FREE_LOW) return "below reference range";
  if (value > FREE_HIGH) return "above reference range / toxicity risk";
  return "within reference range";
}

function interpretTotalNote(value: number): string {
  if (!value) return "not entered";
  if (value < 50) return "below usual total VPA range";
  if (value > 125) return "above usual total VPA range";
  return "within usual total VPA range 50-125 mcg/mL";
}

function calcFraserFree(total: number, albumin: number, bun: number, propofol: boolean, aspirin: boolean): number {
  return 10.74 + (0.34 * total) - (4.6 * albumin) + (0.02 * bun) + (propofol ? 2.14 : 0) + (aspirin ? 1.51 : 0);
}

function estimateHoldPlan(activeFree: number, restartTarget: number, interval: number): DoseRecommendation["holdPlan"] {
  const intervalHours = Math.max(6, interval || 12);
  const halfLifeMin = 9;
  const halfLifeMax = 16;
  const ratio = Math.max(activeFree / restartTarget, 1.01);
  const halfLivesToTarget = Math.log(ratio) / Math.log(2);
  const hoursMin = Math.ceil(halfLivesToTarget * halfLifeMin);
  const hoursMax = Math.ceil(halfLivesToTarget * halfLifeMax);
  return {
    dosesMin: Math.max(1, Math.ceil(hoursMin / intervalHours)),
    dosesMax: Math.max(1, Math.ceil(hoursMax / intervalHours)),
    hoursMin,
    hoursMax,
    restartTarget,
  };
}

function buildDoseRecommendation({
  activeFree,
  dailyDose,
  interval,
  steadyState,
  levelTiming,
  usingMeasuredFree,
  toxicityConcern,
  seizureConcern,
}: {
  activeFree: number;
  dailyDose: number;
  interval: number;
  steadyState: boolean;
  levelTiming: LevelTiming;
  usingMeasuredFree: boolean;
  toxicityConcern: boolean;
  seizureConcern: boolean;
}): DoseRecommendation {
  const levelSource = usingMeasuredFree ? "measured free VPA" : "Fraser estimated free VPA";
  const commonCaution = usingMeasuredFree
    ? "Dose adjustment is based on measured free VPA."
    : "Measured free VPA is preferred when available; this recommendation uses Fraser estimated free VPA as a surrogate.";

  if (!dailyDose || !interval) {
    if (activeFree >= 25 || toxicityConcern) {
      return {
        title: "建議先 hold 並評估毒性",
        tone: "red",
        summary: `${levelSource} ${round1(activeFree)} mcg/mL markedly exceeds target range.`,
        detail: [
          "Current regimen not entered, so dose-specific hold count cannot be estimated.",
          "Hold the next scheduled dose and notify the prescriber; assess mental status, ammonia, liver function tests, platelet count, and pancreatitis symptoms.",
          "If valproate is being used for seizure control, avoid prolonged abrupt discontinuation without alternative antiepileptic coverage; assess need for rescue/bridge therapy.",
          commonCaution,
        ],
      };
    }
    return {
      title: "尚未產生劑量建議",
      tone: "gray",
      summary: "Current dose and interval are required to generate a dose recommendation.",
      detail: ["Concentration interpretation is available, but dose adjustment requires the current regimen."],
    };
  }

  const needsHold = activeFree >= 25 || toxicityConcern;
  if ((!steadyState || levelTiming !== "trough") && !needsHold) {
    return {
      title: "先不直接調整維持劑量",
      tone: "amber",
      summary: "The level is not appropriate for direct proportional maintenance-dose adjustment.",
      detail: [
        `Current regimen: ${dailyDose} mg/day.`,
        `Active level: ${round1(activeFree)} mcg/mL (${levelSource}).`,
        steadyState ? "Steady state: yes." : "Steady state: no/unknown.",
        `Level timing: ${TIMING_NOTE_LABELS[levelTiming]}.`,
        "Confirm sampling time, last dose time, and clinical status. If TDM-guided adjustment is still needed, repeat a steady-state trough/free VPA level before adjusting maintenance therapy.",
      ],
    };
  }

  if (activeFree > FREE_HIGH) {
    const restartTarget = FREE_DOSE_TARGET_HIGH;
    const holdPlan = needsHold ? estimateHoldPlan(activeFree, restartTarget, interval) : undefined;
    const suggestedDailyDoseRange = estimateMaintenanceRange(activeFree, dailyDose, interval);
    return {
      title: needsHold ? "建議先 hold，再以較低劑量重啟" : "建議降低劑量",
      tone: needsHold ? "red" : "amber",
      summary: `${levelSource} ${round1(activeFree)} mcg/mL is above ${FREE_HIGH} mcg/mL.`,
      holdPlan,
      suggestedDailyDoseRange,
      detail: [
        `Current regimen: ${dailyDose} mg/day.`,
        holdPlan ? `Hold valproate for approximately ${holdPlan.dosesMin}${holdPlan.dosesMin === holdPlan.dosesMax ? "" : `-${holdPlan.dosesMax}`} scheduled dose(s) (~${holdPlan.hoursMin}-${holdPlan.hoursMax} hours) before restart consideration.` : "",
        holdPlan ? `Recheck trough/free VPA before restart when feasible; consider restarting once free VPA is within/near ${FREE_LOW}-${FREE_DOSE_TARGET_HIGH} mcg/mL and toxicity is improving.` : "",
        `Maintenance calculation target range: free VPA ${FREE_LOW}-${FREE_DOSE_TARGET_HIGH} mcg/mL (mg/L).`,
        suggestedDailyDoseRange ? `Estimated new total daily dose range: about ${doseRangeText(suggestedDailyDoseRange.min, suggestedDailyDoseRange.max)} (${doseRangeText(suggestedDailyDoseRange.perDoseMin, suggestedDailyDoseRange.perDoseMax, `mg q${interval}h`)} if same interval).` : "",
        toxicityConcern ? "If encephalopathy, marked sedation, tremor, thrombocytopenia, or hyperammonemia is present, notify the prescriber and check ammonia, liver function tests, and platelet count. If ammonia is elevated or pancreatitis/hepatic dysfunction is suspected, reassess whether valproate should be continued." : "If there is no clinical toxicity but free VPA is clearly elevated, consider holding then restarting at a lower dose. If elevation is mild, a conservative dose reduction with repeat trough/free VPA monitoring may be reasonable.",
        "Hold estimate uses adult valproate half-life ~9-16 hr and is approximate; ICU, hepatic disease, interacting drugs, overdose, or ER formulation may prolong decline.",
        "If valproate is used for major seizure prevention, avoid prolonged abrupt discontinuation without alternative antiepileptic coverage; assess need for bridge/rescue therapy.",
        commonCaution,
      ].filter(Boolean),
    };
  }

  if (activeFree < FREE_LOW) {
    const suggestedDailyDoseRange = estimateMaintenanceRange(activeFree, dailyDose, interval, true);
    return {
      title: "可考慮增加劑量",
      tone: "blue",
      summary: `${levelSource} ${round1(activeFree)} mcg/mL is below ${FREE_LOW} mcg/mL.`,
      suggestedDailyDoseRange,
      detail: [
        `Current regimen: ${dailyDose} mg/day.`,
        `Maintenance calculation target range: free VPA ${FREE_LOW}-${FREE_DOSE_TARGET_HIGH} mcg/mL (mg/L).`,
        suggestedDailyDoseRange ? `Conservative new total daily dose range: about ${doseRangeText(suggestedDailyDoseRange.min, suggestedDailyDoseRange.max)} (${doseRangeText(suggestedDailyDoseRange.perDoseMin, suggestedDailyDoseRange.perDoseMax, `mg q${interval}h`)} if same interval).` : "",
        suggestedDailyDoseRange?.capped ? `Full proportional estimate to ${FREE_LOW}-${FREE_DOSE_TARGET_HIGH} mcg/mL would be ${doseRangeText(suggestedDailyDoseRange.proportionalMin, suggestedDailyDoseRange.proportionalMax)}, but the displayed recommendation caps the increase at ~25% for safety.` : "Adjust based on seizure control, indication, available formulation, and clinical context.",
        "After dose increase, repeat trough/free VPA after steady state is reached. If seizures remain uncontrolled, more urgent clinical management may be needed.",
        commonCaution,
      ],
    };
  }

  return {
    title: "建議維持目前劑量",
    tone: "green",
    summary: `${levelSource} ${round1(activeFree)} mcg/mL is within ${FREE_LOW}-${FREE_HIGH} mcg/mL.`,
    detail: [
      `Current regimen: ${dailyDose} mg/day.`,
      toxicityConcern ? "Although free VPA is within the reference range, ongoing toxicity concern should prompt evaluation for other causes and review of ammonia, liver function tests, and platelet count; dose reduction may still be considered if clinically appropriate." : "If clinical response is stable and there is no toxicity concern, continue the current regimen.",
      seizureConcern ? "If seizures persist or target symptoms remain uncontrolled, consider whether a higher target within the reference range or additional antiepileptic adjustment is clinically appropriate." : "Continue monitoring based on indication, clinical response, and adverse effects.",
      commonCaution,
    ],
  };
}

function Input({ label, value, onChange, placeholder, suffix }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div style={{ marginBottom: 14, minWidth: 0 }}>
      <label style={S.label}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={S.input}
        />
        {suffix && <span style={S.suffix}>{suffix}</span>}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ marginBottom: 14, minWidth: 0 }}>
      <label style={S.label}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={S.select}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, value, onChange, hint }: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  return (
    <div style={S.toggleRow}>
      <div style={{ minWidth: 0 }}>
        <div style={S.toggleLabel}>{label}</div>
        {hint && <div style={S.hint}>{hint}</div>}
      </div>
      <button onClick={() => onChange(!value)} style={{ ...S.switch, backgroundColor: value ? ACCENT : "#CBD5E1" }}>
        <div style={{ ...S.knob, left: value ? 27 : 3 }} />
      </button>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={S.row}>
      <span style={S.rowLabel}>{label}</span>
      <span style={{ ...S.rowValue, color: tone || "#334155" }}>{value}</span>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return <div style={S.warning}>{children}</div>;
}

function ClinicalReferenceBox() {
  const [open, setOpen] = useState(false);

  const sections = [
    {
      heading: "濃度參考範圍",
      body: "Total VPA：常用 trough plasma concentration 50-125 mcg/mL；不同 indication、院內 lab 與臨床目標可能略有差異。\nFree VPA：本工具採 Fraser 2023 使用的分類：<5 mcg/mL 偏低、5-17 mcg/mL 為參考範圍、>17 mcg/mL 偏高。用比例法推算維持劑量時，本工具以 free VPA 5-15 mcg/mL（mg/L）作為計算目標範圍，不預設單一 target。\n一般 free fraction 約 5-10%，但 ICU、低白蛋白、uremia、propofol/lipid therapy、aspirin 等情境可明顯上升。",
    },
    {
      heading: "半衰期與 hold 估算",
      body: "Depakote label：成人 oral valproate monotherapy terminal half-life 約 9-16 小時；肝病時半衰期可能延長，且 free clearance 下降。\n本工具的 hold 劑數是粗估：需要下降的半衰期數 = log(目前 active free VPA / restart target) / log(2)；hold 小時數 = 半衰期數 x 9-16 小時；hold 劑數 = ceiling(hold 小時數 / 原本給藥間隔)。\nICU、肝病、overdose、交互作用或 ER 劑型都可能讓下降變慢，因此建議以複測 trough/free VPA 與毒性改善作為 restart 依據。",
    },
    {
      heading: "抽血與解讀",
      body: "用於調整維持劑量時，最好使用 steady-state trough / pre-dose level。\n剛 loading、剛調劑量、post-load 或 random level 比較適合做安全性判讀，不建議直接用比例法調整維持劑量。\n若可送檢 free VPA，劑量調整應優先依實測 free level；Fraser equation 只是 free level 未回來時的 surrogate。",
    },
    {
      heading: "高濃度或疑似毒性時",
      body: "建議評估 mental status、sedation/tremor、platelet、LFT、ammonia、pancreatitis symptoms。\n若有 unexplained lethargy/vomiting/mental status change，應測 ammonia；若 ammonia 上升或懷疑 hyperammonemic encephalopathy，需評估停用 valproate。\n若 valproate 用於預防 major seizure，避免在沒有替代抗癲癇 coverage 下長時間 abrupt discontinuation，需同步評估 bridge/rescue AED。",
    },
    {
      heading: "主要來源",
      body: "Fraser 2023：Liu JT et al. Crit Care Explor. 2023;5(10):e0987. PMID 37868026。\nDailyMed Depakote label：therapeutic concentration、half-life、thrombocytopenia、hyperammonemia 與 abrupt discontinuation warnings。",
    },
  ];

  return (
    <div style={S.referenceBox}>
      <button onClick={() => setOpen(!open)} style={S.referenceHeader}>
        <span>📖 臨床參考</span>
        <svg
          width="14" height="14" viewBox="0 0 16 16" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}
        >
          <path d="M4 6L8 10L12 6" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={S.referenceContent}>
          {sections.map((section, idx) => (
            <div key={section.heading} style={{ marginBottom: idx < sections.length - 1 ? 14 : 0 }}>
              <div style={S.referenceSectionTitle}>{section.heading}</div>
              <div style={S.referenceText}>{section.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DepakineTDM() {
  const [total, setTotal] = useState("");
  const [albumin, setAlbumin] = useState("");
  const [bun, setBun] = useState("");
  const [currentDose, setCurrentDose] = useState("");
  const [currentInterval, setCurrentInterval] = useState("12");
  const [formulation, setFormulation] = useState<Formulation>("IV");
  const [levelTiming, setLevelTiming] = useState<LevelTiming>("trough");
  const [steadyState, setSteadyState] = useState(true);
  const [toxicityConcern, setToxicityConcern] = useState(false);
  const [seizureConcern, setSeizureConcern] = useState(false);
  const [propofol, setPropofol] = useState(false);
  const [aspirin, setAspirin] = useState(false);
  const [measuredFree, setMeasuredFree] = useState("");
  const [copied, setCopied] = useState(false);

  const totalNum = n(total);
  const albuminNum = n(albumin);
  const bunNum = n(bun);
  const currentDoseNum = n(currentDose);
  const currentIntervalNum = n(currentInterval);
  const measuredFreeNum = n(measuredFree);
  const canCalc = totalNum > 0 && albuminNum > 0 && bunNum > 0;
  const dailyDose = currentDoseNum > 0 && currentIntervalNum > 0 ? roundTo250(currentDoseNum * (24 / currentIntervalNum)) : 0;

  const result = useMemo(() => {
    if (!canCalc) return null;
    const estimatedFree = calcFraserFree(totalNum, albuminNum, bunNum, propofol, aspirin);
    const freeFraction = totalNum > 0 ? estimatedFree / totalNum * 100 : 0;
    return { estimatedFree, freeFraction };
  }, [canCalc, totalNum, albuminNum, bunNum, propofol, aspirin]);

  const freeInterp = result ? interpretFree(result.estimatedFree) : interpretFree(Number.NaN);
  const activeFree = measuredFreeNum > 0 ? measuredFreeNum : (result?.estimatedFree ?? 0);
  const usingMeasuredFree = measuredFreeNum > 0;
  const activeFreeInterp = activeFree > 0 ? interpretFree(activeFree) : interpretFree(Number.NaN);
  const totalInterp = interpretTotal(totalNum);

  const doseRecommendation = useMemo(() => {
    if (!result || activeFree <= 0) return null;
    return buildDoseRecommendation({
      activeFree,
      dailyDose,
      interval: currentIntervalNum,
      steadyState,
      levelTiming,
      usingMeasuredFree,
      toxicityConcern,
      seizureConcern,
    });
  }, [result, activeFree, dailyDose, currentIntervalNum, steadyState, levelTiming, usingMeasuredFree, toxicityConcern, seizureConcern]);

  const warnings = useMemo(() => {
    const items: string[] = [];
    if (!result) return items;
    if (result.estimatedFree < 0) items.push("Estimated free VPA is negative, which suggests possible input error or poor model fit; use measured free VPA when available.");
    if (albuminNum < 3.5) items.push("Hypoalbuminemia can increase the free fraction; total VPA may underestimate active exposure.");
    if (bunNum >= 25) items.push("Elevated BUN may reflect uremic toxin competition for albumin binding and can increase the free fraction.");
    if (totalNum > 100) items.push("Total VPA >100 mcg/mL may be associated with protein-binding saturation; interpret the Fraser estimate conservatively.");
    if (propofol) items.push("Propofol or other lipid-containing therapy may increase the valproate free fraction.");
    if (aspirin) items.push("Aspirin may displace valproate from albumin binding and increase free VPA.");
    if (measuredFreeNum > 0 && Math.abs(measuredFreeNum - result.estimatedFree) >= 5) {
      items.push("Measured free VPA differs from the Fraser estimate by >=5 mcg/mL; prioritize measured free VPA for dose adjustment.");
    }
    return items;
  }, [result, albuminNum, bunNum, totalNum, propofol, aspirin, measuredFreeNum]);

  const noteText = useMemo(() => {
    if (!result) return "";
    const lines = [
      "=== Depakine / Valproate TDM Note ===",
      "",
      "--- Current Regimen ---",
      currentDoseNum > 0 && currentIntervalNum > 0
        ? `${FORMULATION_LABELS[formulation]} ${currentDoseNum} mg q${currentIntervalNum}h (TDD ~${dailyDose} mg/day)`
        : "Current regimen not entered.",
      `Level timing: ${TIMING_NOTE_LABELS[levelTiming]}; steady state: ${steadyState ? "Yes" : "No/unknown"}`,
      `Clinical concern: ${toxicityConcern ? "toxicity concern; " : ""}${seizureConcern ? "ongoing seizure/poor control" : ""}${!toxicityConcern && !seizureConcern ? "none entered" : ""}`,
      "",
      "--- Concentrations / Binding Risk ---",
      `Total VPA: ${totalNum} mcg/mL (${interpretTotalNote(totalNum)})`,
      `Albumin: ${albuminNum} g/dL`,
      `BUN: ${bunNum} mg/dL`,
      `Propofol exposure within 24h: ${propofol ? "Yes" : "No"}`,
      `Aspirin exposure within 24h: ${aspirin ? "Yes" : "No"}`,
      "",
      "Fraser 2023 estimated free VPA:",
      `${round1(result.estimatedFree)} mcg/mL (${interpretFreeNote(result.estimatedFree)}; reference category 5-17 mcg/mL)`,
      `Estimated free fraction: ${round1(result.freeFraction)}%`,
    ];
    if (measuredFreeNum > 0) {
      lines.push("");
      lines.push(`Measured free VPA: ${measuredFreeNum} mcg/mL (${interpretFreeNote(measuredFreeNum)})`);
      lines.push(`Estimated vs measured difference: ${round1(result.estimatedFree - measuredFreeNum)} mcg/mL`);
    }
    lines.push("");
    lines.push("--- Assessment & Recommendation ---");
    if (doseRecommendation) {
      lines.push(doseRecommendation.summary);
      if (doseRecommendation.holdPlan) {
        const hp = doseRecommendation.holdPlan;
        lines.push("");
        lines.push(`>> Hold plan: hold ${hp.dosesMin}${hp.dosesMin === hp.dosesMax ? "" : `-${hp.dosesMax}`} scheduled dose(s) (~${hp.hoursMin}-${hp.hoursMax} hr).`);
        lines.push(`   Recheck trough/free VPA before restart if feasible; consider restart when free VPA is within/near ${FREE_LOW}-${FREE_DOSE_TARGET_HIGH} mcg/mL and toxicity is improving.`);
      }
      doseRecommendation.detail.forEach(item => lines.push(`- ${item}`));
      if (doseRecommendation.suggestedDailyDoseRange) {
        const range = doseRecommendation.suggestedDailyDoseRange;
        lines.push("");
        lines.push(`>> Suggested restart/maintenance range: valproate ~${doseRangeText(range.min, range.max)}`);
        if (currentIntervalNum > 0) {
          lines.push(`   If keeping q${currentIntervalNum}h: ~${doseRangeText(range.perDoseMin, range.perDoseMax, "mg/dose")}; round to available formulation and clinical context.`);
        }
      }
    } else {
      lines.push("Dose recommendation not generated.");
    }
    if (warnings.length > 0) {
      lines.push("");
      lines.push("Clinical cautions:");
      warnings.forEach(w => lines.push(`- ${w}`));
    }
    lines.push("");
    lines.push("Use measured free VPA for dose adjustment when available; Fraser equation is an estimate for critically ill adults and may be imprecise.");
    lines.push("Reference: Liu JT et al. Crit Care Explor. 2023;5(10):e0987. PMID 37868026.");
    return lines.join("\n");
  }, [result, currentDoseNum, currentIntervalNum, formulation, dailyDose, levelTiming, steadyState, toxicityConcern, seizureConcern, totalNum, totalInterp.label, albuminNum, bunNum, propofol, aspirin, freeInterp.label, measuredFreeNum, doseRecommendation, warnings]);

  function resetAll() {
    setTotal("");
    setAlbumin("");
    setBun("");
    setCurrentDose("");
    setCurrentInterval("12");
    setFormulation("IV");
    setLevelTiming("trough");
    setSteadyState(true);
    setToxicityConcern(false);
    setSeizureConcern(false);
    setPropofol(false);
    setAspirin(false);
    setMeasuredFree("");
    setCopied(false);
  }

  function copyNote() {
    if (!noteText) return;
    navigator.clipboard.writeText(noteText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div>
      <div style={S.header}>
        <div style={S.title}>Depakine TDM</div>
        <div style={S.subtitle}>Free valproate estimation · Fraser 2023</div>
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>檢驗數值</div>
        <Input label="Total valproate concentration" value={total} onChange={setTotal} placeholder="例：60" suffix="mcg/mL" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <Input label="Albumin" value={albumin} onChange={setAlbumin} placeholder="例：2.8" suffix="g/dL" />
          <Input label="BUN" value={bun} onChange={setBun} placeholder="例：30" suffix="mg/dL" />
        </div>
        <Input label="實測 free VPA（選填）" value={measuredFree} onChange={setMeasuredFree} placeholder="例：14" suffix="mcg/mL" />
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>目前給藥</div>
        <Select
          label="劑型 / Route"
          value={formulation}
          onChange={value => setFormulation(value as Formulation)}
          options={[
            { value: "IV", label: FORMULATION_LABELS.IV },
            { value: "IR_DR", label: FORMULATION_LABELS.IR_DR },
            { value: "ER", label: FORMULATION_LABELS.ER },
          ]}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <Input label="每次劑量" value={currentDose} onChange={setCurrentDose} placeholder="例：500" suffix="mg" />
          <Select
            label="頻率"
            value={currentInterval}
            onChange={setCurrentInterval}
            options={[
              { value: "6", label: "q6h" },
              { value: "8", label: "q8h" },
              { value: "12", label: "q12h" },
              { value: "24", label: "q24h" },
            ]}
          />
        </div>
        <Select
          label="抽血型態"
          value={levelTiming}
          onChange={value => setLevelTiming(value as LevelTiming)}
          options={[
            { value: "trough", label: TIMING_LABELS.trough },
            { value: "random", label: TIMING_LABELS.random },
            { value: "postLoad", label: TIMING_LABELS.postLoad },
          ]}
        />
        <Toggle label="已達 steady state" value={steadyState} onChange={setSteadyState} hint="若剛 loading、剛調劑量、或抽血時間不明，建議先關閉" />
        <Toggle label="疑似毒性" value={toxicityConcern} onChange={setToxicityConcern} hint="如嗜睡/意識改變、tremor、血小板下降、hyperammonemia" />
        <Toggle label="仍有 seizure / 控制不佳" value={seizureConcern} onChange={setSeizureConcern} hint="低濃度時會用較積極但仍保守的目標估算" />
        {dailyDose > 0 && (
          <div style={S.summaryBox}>
            目前 total daily dose 約 {dailyDose} mg/day
          </div>
        )}
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>24 小時內併用藥物</div>
        <Toggle label="Propofol" value={propofol} onChange={setPropofol} hint="Fraser equation 使用 propofol exposure 變項" />
        <Toggle label="Aspirin" value={aspirin} onChange={setAspirin} hint="包含抗血小板或解熱鎮痛用途皆需留意" />
      </div>

      {!canCalc && (
        <div style={S.empty}>
          輸入 total VPA、albumin、BUN 後會自動估算 free VPA。
        </div>
      )}

      {result && (
        <div style={{ ...S.resultCard, borderLeft: `4px solid ${freeInterp.color}` }}>
          <div style={S.resultEyebrow}>Fraser 2023 Estimated Free VPA</div>
          <div style={S.bigResult}>{round1(result.estimatedFree)} <span style={S.unit}>mcg/mL</span></div>
          <div style={{ ...S.badge, color: freeInterp.color, background: freeInterp.bg, border: `1px solid ${freeInterp.border}` }}>
            {freeInterp.label}
          </div>

          <div style={{ marginTop: 14 }}>
            <Row label="Free fraction" value={`${round1(result.freeFraction)}%`} tone={result.freeFraction > 20 ? "#B91C1C" : "#334155"} />
            <Row label="Free VPA reference" value="5-17 mcg/mL" />
            <Row label="Dose adjustment level" value={`${round1(activeFree)} mcg/mL (${usingMeasuredFree ? "measured free" : "estimated free"})`} tone={activeFreeInterp.color} />
            <Row label="Total VPA interpretation" value={totalInterp.label} tone={totalInterp.color} />
            {dailyDose > 0 && <Row label="Current regimen" value={`${FORMULATION_LABELS[formulation]} ${dailyDose} mg/day`} />}
            {measuredFreeNum > 0 && (
              <Row
                label="實測 vs 估算"
                value={`${measuredFreeNum} vs ${round1(result.estimatedFree)} mcg/mL`}
                tone={Math.abs(measuredFreeNum - result.estimatedFree) >= 5 ? "#B91C1C" : "#047857"}
              />
            )}
          </div>

          {doseRecommendation && (() => {
            const tone = toneColor(doseRecommendation.tone);
            return (
              <div style={{ ...S.recommendationBox, background: tone.bg, border: `1px solid ${tone.border}` }}>
                <div style={{ ...S.recommendationTitle, color: tone.color }}>{doseRecommendation.title}</div>
                <div style={{ ...S.recommendationSummary, color: tone.color }}>{doseRecommendation.summary}</div>
                {doseRecommendation.holdPlan && (
                  <div style={S.holdPlan}>
                    Hold {doseRecommendation.holdPlan.dosesMin}
                    {doseRecommendation.holdPlan.dosesMin === doseRecommendation.holdPlan.dosesMax ? "" : `-${doseRecommendation.holdPlan.dosesMax}`} 劑
                    <span style={S.holdPlanSub}>約 {doseRecommendation.holdPlan.hoursMin}-{doseRecommendation.holdPlan.hoursMax} 小時後複測/評估重啟</span>
                  </div>
                )}
                {doseRecommendation.suggestedDailyDoseRange && (
                  <div style={S.suggestedDose}>
                    重啟/維持約 {doseRangeText(doseRecommendation.suggestedDailyDoseRange.min, doseRecommendation.suggestedDailyDoseRange.max)}
                    {currentIntervalNum > 0 ? `（若維持 q${currentIntervalNum}h：約 ${doseRangeText(doseRecommendation.suggestedDailyDoseRange.perDoseMin, doseRecommendation.suggestedDailyDoseRange.perDoseMax, "mg/dose")}）` : ""}
                  </div>
                )}
              </div>
            );
          })()}

          {warnings.map((w, i) => <Warning key={i}>{w}</Warning>)}

          <div style={S.formulaBox}>
            <div style={S.formulaTitle}>模型公式</div>
            <div style={S.formulaText}>
              Free VPA = 10.74 + 0.34 x total - 4.60 x albumin + 0.02 x BUN + 2.14 if propofol + 1.51 if aspirin
            </div>
          </div>

          <div style={S.notePreviewTitle}>TDM Note Preview</div>
          <pre style={S.notePreview}>{noteText}</pre>

          <button onClick={copyNote} style={{ ...S.copyBtn, background: copied ? "#059669" : ACCENT }}>
            {copied ? "已複製 TDM note" : "複製 TDM note"}
          </button>
        </div>
      )}

      <ClinicalReferenceBox />

      {(total || albumin || bun || measuredFree || currentDose || propofol || aspirin || toxicityConcern || seizureConcern) && (
        <button onClick={resetAll} style={S.resetBtn}>重新評估</button>
      )}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  header: { textAlign: "center", padding: "16px 0 24px" },
  title: { fontSize: 26, fontWeight: 800, color: "#0F172A" },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 4 },
  section: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", boxSizing: "border-box", overflow: "hidden" },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 },
  select: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", appearance: "auto" as const, boxSizing: "border-box" },
  input: { flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", outline: "none", boxSizing: "border-box", width: "100%" },
  suffix: { color: "#64748B", fontSize: 13, whiteSpace: "nowrap", flexShrink: 0 },
  toggleRow: { marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  toggleLabel: { fontSize: 14, fontWeight: 700, color: "#334155" },
  hint: { fontSize: 12, color: "#94A3B8", marginTop: 2, lineHeight: 1.4 },
  switch: { width: 52, height: 28, borderRadius: 14, border: "none", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", position: "absolute", top: 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" },
  summaryBox: { background: "#F0FDFA", border: "1px solid #99F6E4", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#0F766E", fontWeight: 700 },
  empty: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, color: "#64748B", fontSize: 14, textAlign: "center", border: "1px dashed #CBD5E1" },
  resultCard: { background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  resultEyebrow: { fontSize: 12, fontWeight: 800, color: ACCENT, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  bigResult: { fontSize: 36, fontWeight: 800, color: "#0F172A", lineHeight: 1.1 },
  unit: { fontSize: 16, fontWeight: 700, color: "#64748B" },
  badge: { display: "inline-block", marginTop: 8, padding: "4px 10px", borderRadius: 8, fontSize: 13, fontWeight: 700 },
  row: { display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderBottom: "1px solid #F1F5F9", gap: 10 },
  rowLabel: { color: "#64748B", fontSize: 14, flexShrink: 0 },
  rowValue: { fontWeight: 700, fontSize: 15, textAlign: "right", minWidth: 0 },
  recommendationBox: { marginTop: 14, padding: 12, borderRadius: 8 },
  recommendationTitle: { fontSize: 14, fontWeight: 800, marginBottom: 4 },
  recommendationSummary: { fontSize: 13, lineHeight: 1.55 },
  holdPlan: { marginTop: 8, padding: "10px 12px", borderRadius: 8, background: "#fff", fontSize: 15, color: "#B91C1C", fontWeight: 900, lineHeight: 1.45 },
  holdPlanSub: { display: "block", marginTop: 2, fontSize: 12, color: "#7F1D1D", fontWeight: 700 },
  suggestedDose: { marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.65)", fontSize: 13, color: "#0F172A", fontWeight: 800, lineHeight: 1.5 },
  warning: { background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 8, padding: "10px 12px", marginTop: 10, fontSize: 13, color: "#92400E", lineHeight: 1.55 },
  formulaBox: { marginTop: 14, padding: 12, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0" },
  formulaTitle: { fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 6 },
  formulaText: { fontSize: 12, color: "#334155", lineHeight: 1.6 },
  notePreviewTitle: { marginTop: 14, marginBottom: 6, fontSize: 12, fontWeight: 800, color: "#475569" },
  notePreview: { background: "#1E293B", color: "#E2E8F0", padding: 14, borderRadius: 8, fontSize: 11, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 360, overflowY: "auto", margin: 0 },
  copyBtn: { width: "100%", marginTop: 14, padding: "12px 0", borderRadius: 8, border: "none", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", transition: "background 0.2s" },
  referenceBox: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, marginTop: 16, overflow: "hidden" },
  referenceHeader: { width: "100%", padding: "14px 16px", background: "#F8FAFC", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, fontWeight: 800, color: "#475569", textAlign: "left" },
  referenceContent: { padding: "16px 16px 18px" },
  referenceSectionTitle: { fontSize: 13, fontWeight: 800, color: "#0F172A", marginBottom: 6, paddingBottom: 4, borderBottom: "2px solid #F0FDFA" },
  referenceText: { fontSize: 13, color: "#475569", lineHeight: 1.7, whiteSpace: "pre-wrap" },
  resetBtn: { width: "100%", marginTop: 20, padding: "14px 0", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: 15, fontWeight: 600, cursor: "pointer" },
};
