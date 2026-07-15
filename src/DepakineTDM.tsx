import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

const ACCENT = "#0D9488";
const FREE_LOW = 5;
const FREE_HIGH = 17;

type LevelCategory = "low" | "target" | "high" | "unknown";
type LevelTiming = "trough" | "random" | "postLoad";
type Formulation = "IV" | "IR_DR" | "ER";

type DoseRecommendation = {
  title: string;
  tone: "blue" | "green" | "amber" | "red" | "gray";
  summary: string;
  detail: string[];
  suggestedDailyDose?: number;
  suggestedPerDose?: number;
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

function n(value: string): number {
  return parseFloat(value) || 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundTo250(value: number): number {
  return Math.max(250, Math.round(value / 250) * 250);
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

function calcFraserFree(total: number, albumin: number, bun: number, propofol: boolean, aspirin: boolean): number {
  return 10.74 + (0.34 * total) - (4.6 * albumin) + (0.02 * bun) + (propofol ? 2.14 : 0) + (aspirin ? 1.51 : 0);
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
  if (!dailyDose || !interval) {
    return {
      title: "尚未產生劑量建議",
      tone: "gray",
      summary: "輸入目前每次劑量與頻率後，note 會加入 dose recommendation。",
      detail: ["目前仍可使用濃度判讀；劑量建議需要 current regimen。"],
    };
  }

  const levelSource = usingMeasuredFree ? "measured free VPA" : "Fraser estimated free VPA";
  const commonCaution = usingMeasuredFree
    ? "Dose adjustment is based on measured free VPA."
    : "Measured free VPA is preferred when available; this recommendation uses Fraser estimated free VPA as a surrogate.";

  if (!steadyState || levelTiming !== "trough") {
    return {
      title: "先不直接調整維持劑量",
      tone: "amber",
      summary: "濃度抽血條件不適合直接用比例法調整。",
      detail: [
        `Current regimen: ${dailyDose} mg/day.`,
        `Active level: ${round1(activeFree)} mcg/mL (${levelSource}).`,
        steadyState ? "Steady state: yes." : "Steady state: no/unknown.",
        `Level timing: ${TIMING_LABELS[levelTiming]}.`,
        "建議先確認抽血時間、最後一次給藥時間與臨床狀態；若仍需 TDM 調整，建議補 trough/free VPA 後再評估。",
      ],
    };
  }

  if (activeFree > FREE_HIGH) {
    const target = toxicityConcern ? 12 : 15;
    const rawDaily = dailyDose * target / activeFree;
    const suggestedDailyDose = Math.min(dailyDose - 250, roundTo250(rawDaily));
    const safeDailyDose = Math.max(250, suggestedDailyDose);
    const suggestedPerDose = round1(safeDailyDose / (24 / interval));
    return {
      title: toxicityConcern ? "建議暫停/降低劑量並評估毒性" : "建議降低劑量",
      tone: toxicityConcern ? "red" : "amber",
      summary: `${levelSource} ${round1(activeFree)} mcg/mL > ${FREE_HIGH} mcg/mL。`,
      suggestedDailyDose: safeDailyDose,
      suggestedPerDose,
      detail: [
        `Current regimen: ${dailyDose} mg/day.`,
        `Suggested maintenance target for calculation: free VPA ~${target} mcg/mL.`,
        `Estimated new total daily dose: about ${safeDailyDose} mg/day (${suggestedPerDose} mg q${interval}h if same interval).`,
        toxicityConcern ? "若有 encephalopathy、marked sedation、tremor、thrombocytopenia 或 hyperammonemia，建議先 hold dose/通知醫師並檢查 ammonia、LFT、platelet。" : "若無毒性，可考慮保守降劑量後 2-4 天或達 steady state 時複測 trough/free VPA。",
        commonCaution,
      ],
    };
  }

  if (activeFree < FREE_LOW) {
    const target = seizureConcern ? 10 : 8;
    const rawDaily = dailyDose * target / activeFree;
    const cappedDaily = Math.min(rawDaily, dailyDose * 1.25);
    const suggestedDailyDose = Math.max(dailyDose + 250, roundTo250(cappedDaily));
    const suggestedPerDose = round1(suggestedDailyDose / (24 / interval));
    return {
      title: "可考慮增加劑量",
      tone: "blue",
      summary: `${levelSource} ${round1(activeFree)} mcg/mL < ${FREE_LOW} mcg/mL。`,
      suggestedDailyDose,
      suggestedPerDose,
      detail: [
        `Current regimen: ${dailyDose} mg/day.`,
        `Suggested maintenance target for calculation: free VPA ~${target} mcg/mL.`,
        `Conservative new total daily dose: about ${suggestedDailyDose} mg/day (${suggestedPerDose} mg q${interval}h if same interval).`,
        rawDaily > dailyDose * 1.25 ? `Proportional estimate would be ${roundTo250(rawDaily)} mg/day, but the displayed recommendation caps the increase at ~25% for safety.` : "建議依 seizure control / indication 與可用劑型調整。",
        "Dose increase後建議達 steady state 再複測 trough/free VPA；若 seizure uncontrolled，可依臨床需要更積極處理。",
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
      toxicityConcern ? "雖 free VPA 在參考範圍內，但有毒性疑慮時仍建議評估其他原因、ammonia、LFT、platelet，必要時可考慮降劑量。" : "若臨床反應穩定且無毒性，建議維持目前 regimen。",
      seizureConcern ? "若仍有 seizure 或目標症狀控制不佳，可依臨床狀態考慮較高目標區間或其他抗癲癇藥調整。" : "建議依 indication、clinical response 與 adverse effects 持續追蹤。",
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
    if (result.estimatedFree < 0) items.push("估算 free VPA 為負值，代表輸入資料或模型適用性可能有問題，請以實測 free VPA 為準。");
    if (albuminNum < 3.5) items.push("低白蛋白會增加 free fraction，total VPA 可能低估活性濃度。");
    if (bunNum >= 25) items.push("BUN 偏高時可能有 uremic toxin 競爭 albumin binding，free fraction 可能上升。");
    if (totalNum > 100) items.push("total VPA >100 mcg/mL 時可能出現 protein binding saturation；Fraser cohort 多數 total VPAC 較低，解讀要保守。");
    if (propofol) items.push("Propofol 或其他 lipid-containing therapy 可能增加 valproate free fraction。");
    if (aspirin) items.push("Aspirin 可能 displacement valproate albumin binding，使 free VPA 上升。");
    if (measuredFreeNum > 0 && Math.abs(measuredFreeNum - result.estimatedFree) >= 5) {
      items.push("實測 free VPA 與估算值差距 >=5 mcg/mL，劑量調整請優先採用實測值。");
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
      `Level timing: ${TIMING_LABELS[levelTiming]}; steady state: ${steadyState ? "Yes" : "No/unknown"}`,
      `Clinical concern: ${toxicityConcern ? "toxicity concern; " : ""}${seizureConcern ? "ongoing seizure/poor control" : ""}${!toxicityConcern && !seizureConcern ? "none entered" : ""}`,
      "",
      "--- Concentrations / Binding Risk ---",
      `Total VPA: ${totalNum} mcg/mL (${totalInterp.label})`,
      `Albumin: ${albuminNum} g/dL`,
      `BUN: ${bunNum} mg/dL`,
      `Propofol exposure within 24h: ${propofol ? "Yes" : "No"}`,
      `Aspirin exposure within 24h: ${aspirin ? "Yes" : "No"}`,
      "",
      "Fraser 2023 estimated free VPA:",
      `${round1(result.estimatedFree)} mcg/mL (${freeInterp.label}; reference category 5-17 mcg/mL)`,
      `Estimated free fraction: ${round1(result.freeFraction)}%`,
    ];
    if (measuredFreeNum > 0) {
      lines.push("");
      lines.push(`Measured free VPA: ${measuredFreeNum} mcg/mL (${interpretFree(measuredFreeNum).label})`);
      lines.push(`Estimated vs measured difference: ${round1(result.estimatedFree - measuredFreeNum)} mcg/mL`);
    }
    lines.push("");
    lines.push("--- Assessment & Recommendation ---");
    if (doseRecommendation) {
      lines.push(doseRecommendation.summary);
      doseRecommendation.detail.forEach(item => lines.push(`- ${item}`));
      if (doseRecommendation.suggestedDailyDose) {
        lines.push("");
        lines.push(`>> Suggested regimen: valproate ~${doseRecommendation.suggestedDailyDose} mg/day`);
        if (doseRecommendation.suggestedPerDose && currentIntervalNum > 0) {
          lines.push(`   If keeping q${currentIntervalNum}h: ~${doseRecommendation.suggestedPerDose} mg/dose; round to available formulation and clinical context.`);
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
                {doseRecommendation.suggestedDailyDose && (
                  <div style={S.suggestedDose}>
                    建議約 {doseRecommendation.suggestedDailyDose} mg/day
                    {doseRecommendation.suggestedPerDose ? `（若維持 q${currentIntervalNum}h：約 ${doseRecommendation.suggestedPerDose} mg/dose）` : ""}
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

      <div style={S.referenceBox}>
        <div style={S.referenceTitle}>臨床提醒</div>
        <div>
          Fraser 2023 是 ICU adult cohort 衍生並驗證的估算式；文中指出模型 bias 低但 precision 不佳。若可送檢 free VPA，劑量調整仍應優先依實測 free level、臨床反應與毒性表現判斷。
        </div>
      </div>

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
  suggestedDose: { marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.65)", fontSize: 13, color: "#0F172A", fontWeight: 800, lineHeight: 1.5 },
  warning: { background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 8, padding: "10px 12px", marginTop: 10, fontSize: 13, color: "#92400E", lineHeight: 1.55 },
  formulaBox: { marginTop: 14, padding: 12, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0" },
  formulaTitle: { fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 6 },
  formulaText: { fontSize: 12, color: "#334155", lineHeight: 1.6 },
  notePreviewTitle: { marginTop: 14, marginBottom: 6, fontSize: 12, fontWeight: 800, color: "#475569" },
  notePreview: { background: "#1E293B", color: "#E2E8F0", padding: 14, borderRadius: 8, fontSize: 11, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 360, overflowY: "auto", margin: 0 },
  copyBtn: { width: "100%", marginTop: 14, padding: "12px 0", borderRadius: 8, border: "none", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", transition: "background 0.2s" },
  referenceBox: { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, fontSize: 13, color: "#475569", lineHeight: 1.65 },
  referenceTitle: { fontSize: 13, fontWeight: 800, color: "#0F172A", marginBottom: 4 },
  resetBtn: { width: "100%", marginTop: 20, padding: "14px 0", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: 15, fontWeight: 600, cursor: "pointer" },
};
