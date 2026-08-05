import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const ACCENT = "#0D9488";

type Sex = "F" | "M";
type Route = "IV" | "PO";
type Indication = "af" | "hf";
type MaintenanceRoute = "PO" | "IV";
type LoadingStatus = "given" | "none";
type CurrentRoute = "PO" | "IV";
type CurrentFrequency = "QD" | "Q48H" | "QOD" | "BID" | "other";

function n(value: string): number {
  return parseFloat(value) || 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundDose(value: number): number {
  return Math.max(62.5, Math.round(value / 62.5) * 62.5);
}

function fmtMcg(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "--";
  const mcg = Number.isInteger(value) ? `${value}` : `${value.toFixed(1)}`;
  const mgValue = value / 1000;
  const mg = mgValue < 0.1
    ? mgValue.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")
    : mgValue.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return `${mcg} mcg (${mg} mg)`;
}

function mgToMcg(value: string): number {
  return n(value) * 1000;
}

function frequencyText(freq: CurrentFrequency, custom: string): string {
  if (freq === "other") return custom || "custom interval";
  if (freq === "QOD") return "QOD";
  return freq;
}

function dtToDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60);
}

function formatDT(value: string): string {
  const date = dtToDate(value);
  if (!date) return "";
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

function calcIbw(heightCm: number, sex: Sex): number | null {
  if (!heightCm) return null;
  return round1((sex === "M" ? 50 : 45.5) + 0.91 * (heightCm - 152.4));
}

function calcCrCl(age: number, sex: Sex, scr: number, weight: number): number | null {
  if (!age || !scr || !weight) return null;
  const base = ((140 - age) * weight) / (72 * scr);
  return round1(sex === "F" ? base * 0.85 : base);
}

function targetRange(indication: Indication) {
  if (indication === "hf") {
    return { label: "HF: 0.5-0.9 ng/mL（避免 ≥1.0；≥1.2 風險更高）", low: 0.5, high: 0.9, caution: 1.0 };
  }
  return { label: "AF: 優先 0.5-0.9 ng/mL；若測濃度，2023 AF guideline 建議 <1.2 ng/mL", low: 0.5, high: 0.9, caution: 1.2 };
}

function toneColor(tone: "green" | "blue" | "amber" | "red" | "gray") {
  if (tone === "green") return { bg: "#ECFDF5", border: "#A7F3D0", color: "#047857" };
  if (tone === "blue") return { bg: "#EFF6FF", border: "#BFDBFE", color: "#1D4ED8" };
  if (tone === "amber") return { bg: "#FEF3C7", border: "#FBBF24", color: "#92400E" };
  if (tone === "red") return { bg: "#FEF2F2", border: "#FECACA", color: "#B91C1C" };
  return { bg: "#F8FAFC", border: "#E2E8F0", color: "#475569" };
}

export default function DigoxinTDM() {
  const [sex, setSex] = useState<Sex>("F");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [tbw, setTbw] = useState("");
  const [scr, setScr] = useState("");
  const [directCrCl, setDirectCrCl] = useState("");
  const [useDirectCrCl, setUseDirectCrCl] = useState(false);
  const [indication, setIndication] = useState<Indication>("af");
  const [route, setRoute] = useState<Route>("IV");
  const [maintenanceRoute, setMaintenanceRoute] = useState<MaintenanceRoute>("PO");
  const [level, setLevel] = useState("");
  const [levelDatetime, setLevelDatetime] = useState("");
  const [lastDoseDatetime, setLastDoseDatetime] = useState("");
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>("given");
  const [steadyState, setSteadyState] = useState(false);
  const [currentDoseMg, setCurrentDoseMg] = useState("");
  const [currentRoute, setCurrentRoute] = useState<CurrentRoute>("PO");
  const [currentFrequency, setCurrentFrequency] = useState<CurrentFrequency>("QD");
  const [customFrequency, setCustomFrequency] = useState("");
  const [currentlyHeld, setCurrentlyHeld] = useState(false);
  const [loadDose1Mg, setLoadDose1Mg] = useState("");
  const [loadDose1Datetime, setLoadDose1Datetime] = useState("");
  const [loadDose2Mg, setLoadDose2Mg] = useState("");
  const [loadDose2Datetime, setLoadDose2Datetime] = useState("");
  const [loadDose3Mg, setLoadDose3Mg] = useState("");
  const [loadDose3Datetime, setLoadDose3Datetime] = useState("");
  const [loadingCompleted, setLoadingCompleted] = useState(true);
  const [copied, setCopied] = useState(false);

  const patient = useMemo(() => {
    const weight = n(tbw);
    const h = n(height);
    const patientAge = n(age);
    const ibw = calcIbw(h, sex);
    const dosingWeight = ibw ? Math.min(weight || ibw, ibw) : weight;
    const autoCrCl = calcCrCl(patientAge, sex, n(scr), dosingWeight);
    const crcl = useDirectCrCl ? (n(directCrCl) || null) : autoCrCl;
    const weightNote = weight && ibw
      ? weight < ibw
        ? `TBW < IBW，使用實際體重 ${round1(weight)} kg`
        : `使用 IBW/lean BW ${ibw} kg（digoxin 分布較符合 lean/ideal body weight）`
      : weight
        ? `使用 TBW ${round1(weight)} kg；輸入身高後可估 IBW`
        : "尚未輸入體重";

    return { age: patientAge, ibw, dosingWeight, crcl, weightNote };
  }, [age, directCrCl, height, scr, sex, tbw, useDirectCrCl]);

  const loading = useMemo(() => {
    if (!patient.dosingWeight) return null;
    const renalOrElderly = patient.age >= 70 || (patient.crcl !== null && patient.crcl < 50) || patient.dosingWeight <= 50;
    const range = route === "IV" ? [8, 12] : [10, 15];
    const suggestedMcgPerKg = renalOrElderly ? range[0] : (route === "IV" ? 10 : 12.5);
    const low = roundDose(range[0] * patient.dosingWeight);
    const high = roundDose(range[1] * patient.dosingWeight);
    const total = roundDose(suggestedMcgPerKg * patient.dosingWeight);
    const first = roundDose(total * 0.5);
    const second = roundDose(total * 0.25);
    const third = Math.max(62.5, total - first - second);
    return {
      renalOrElderly,
      rangeText: `${range[0]}-${range[1]} mcg/kg`,
      low,
      high,
      suggestedMcgPerKg,
      total,
      first,
      second,
      third,
    };
  }, [patient, route]);

  const maintenance = useMemo(() => {
    if (!patient.dosingWeight || patient.crcl === null || !loading) return null;
    const bodyStores = (loading.renalOrElderly ? 8 : 10) * patient.dosingWeight;
    const dailyLossPct = 14 + patient.crcl / 5;
    const bioavailability = maintenanceRoute === "PO" ? 0.7 : 1;
    const estimated = roundDose((bodyStores * dailyLossPct / 100) / bioavailability);
    const conservative = patient.age >= 70 || patient.crcl < 50 || patient.dosingWeight <= 50;
    let practical = estimated;
    if (conservative) practical = Math.min(estimated, 125);
    if (patient.crcl < 30) practical = Math.min(practical, 62.5);
    return {
      dailyLossPct: round1(dailyLossPct),
      estimated,
      practical,
      note: patient.crcl < 30
        ? "CrCl <30：常需 62.5 mcg QD 或 Q48H，建議依濃度與心率調整"
        : conservative
          ? "高齡、腎功能下降或低 lean BW：建議從 62.5-125 mcg/day 保守起始"
          : "一般起始常見 125 mcg/day；少數需要 250 mcg/day",
    };
  }, [loading, maintenanceRoute, patient]);

  const noLoadStart = useMemo(() => {
    if (!patient.dosingWeight || patient.crcl === null) return null;
    const veryConservative = patient.age >= 70 || patient.crcl < 30 || patient.dosingWeight <= 50;
    const conservative = veryConservative || patient.crcl < 60;
    const dose = veryConservative ? 62.5 : conservative ? 125 : 125;
    const interval = veryConservative && patient.crcl < 30 ? "QD 或 Q48H" : "QD";
    return {
      dose,
      interval,
      text: veryConservative
        ? "高齡、CrCl <30 或 low lean BW：建議 62.5 mcg QD/Q48H 起始"
        : conservative
          ? "腎功能下降或較脆弱病人：建議 125 mcg QD 起始，必要時再降至 62.5 mcg"
          : "一般成人慢性起始常用 125 mcg QD；250 mcg QD 較少需要，通常不作預設起始",
    };
  }, [patient]);

  const samplingAdvice = useMemo(() => {
    const base = "不論 IV/PO，濃度判讀都要避開分布期：最好 trough（下次給藥前）；若無法，至少距最後一次給藥 6-8 小時。";
    if (loadingStatus === "given") {
      return `${base} 已給 loading 時，若急性期要確認濃度，至少最後一劑 loading 後 6-8 小時再抽；若要評估維持劑量是否累積，仍建議 3-5 天後作早期安全追蹤，或 5-7 天後較接近穩態。`;
    }
    return `${base} 未給 loading、直接從 maintenance 開始時，3-5 天可作早期安全性參考，但通常尚未完整 steady state；若是要用濃度調整維持劑量，正常腎功能較建議 7-10 天後抽 trough，腎功能差需 2-3 週或更久。`;
  }, [loadingStatus]);

  const samplingAdviceEn = useMemo(() => {
    const base = "Preferred sampling is a trough before the next dose; if not feasible, draw at least 6-8 hours after the last IV/PO dose to avoid the distribution phase.";
    if (loadingStatus === "given") {
      return `${base} If a level is needed after loading, draw at least 6-8 hours after the final loading dose. For maintenance accumulation, consider an early safety level after 3-5 days, but a 5-7 day trough is closer to steady state in normal renal function.`;
    }
    return `${base} Without a loading dose, a 3-5 day level can be used as an early safety check, but it is usually not full steady state; for maintenance dose adjustment, obtain a trough after about 7-10 days in normal renal function, and later in renal dysfunction.`;
  }, [loadingStatus]);

  const levelTiming = useMemo(() => {
    const levelDate = dtToDate(levelDatetime);
    const lastDoseDate = dtToDate(lastDoseDatetime);
    if (!levelDate || !lastDoseDate) return null;
    return round1(hoursBetween(lastDoseDate, levelDate));
  }, [lastDoseDatetime, levelDatetime]);

  const loadingHistory = useMemo(() => {
    if (loadingStatus !== "given") return null;
    const referenceDate = dtToDate(levelDatetime) || new Date();
    const referenceLabel = dtToDate(levelDatetime) ? "before level" : "ago";
    const entries = [
      { label: "1st", doseMcg: mgToMcg(loadDose1Mg), datetime: loadDose1Datetime },
      { label: "2nd", doseMcg: mgToMcg(loadDose2Mg), datetime: loadDose2Datetime },
      { label: "3rd", doseMcg: mgToMcg(loadDose3Mg), datetime: loadDose3Datetime },
    ].filter((entry) => entry.doseMcg > 0);
    const totalMcg = entries.reduce((sum, entry) => sum + entry.doseMcg, 0);
    const timedEntries = entries
      .map((entry) => {
        const doseDate = dtToDate(entry.datetime);
        return { ...entry, hours: doseDate ? round1(hoursBetween(doseDate, referenceDate)) : 0 };
      })
      .filter((entry) => entry.hours > 0);
    const lastHours = timedEntries.length ? Math.min(...timedEntries.map((entry) => entry.hours)) : 0;
    const doseText = entries.length
      ? entries.map((entry) => {
          const doseDate = dtToDate(entry.datetime);
          const hours = doseDate ? round1(hoursBetween(doseDate, referenceDate)) : 0;
          return `${entry.label} ${fmtMcg(entry.doseMcg)}${entry.datetime ? ` at ${formatDT(entry.datetime)}` : ""}${hours > 0 ? ` (${hours} hr ${referenceLabel})` : ""}`;
        }).join("; ")
      : "actual dose-time entries not entered";
    return {
      totalMcg,
      lastHours,
      text: `${doseText}; total ${totalMcg ? fmtMcg(totalMcg) : "not calculated"}; ${loadingCompleted ? "loading completed" : "loading planned/partial"}${lastHours ? `; most recent loading dose ${lastHours} hr ${referenceLabel}` : ""}`,
      timingWarning: lastHours && lastHours < 6
        ? `Most recent loading dose was <6 hours ${referenceLabel}; level may be falsely high from distribution phase.`
        : "",
    };
  }, [levelDatetime, loadDose1Datetime, loadDose1Mg, loadDose2Datetime, loadDose2Mg, loadDose3Datetime, loadDose3Mg, loadingCompleted, loadingStatus]);

  const timingBadge = loadingStatus === "given"
    ? "已給 loading：最後一劑後 ≥6-8 hr；維持劑量追蹤 3-5 或 5-7 天"
    : "未給 loading：3-5 天是早期安全參考；7-10 天較接近穩態";

  const levelInterpretation = useMemo(() => {
    const value = n(level);
    const hours = levelTiming || 0;
    if (!value) return null;
    const target = targetRange(indication);
    if (hours && hours < 6) {
      return {
        tone: "red" as const,
        title: "抽血太早，暫不建議用此濃度調整",
        summary: "Digoxin 分布期尚未完成，serum level 可能假性偏高。",
        details: ["建議至少距最後一次 IV/PO 給藥 6-8 小時；若可行，維持治療以 trough（下次給藥前）最穩。"],
      };
    }
    if (value >= 2) {
      return {
        tone: "red" as const,
        title: "高於傳統毒性風險範圍",
        summary: `${value} ng/mL ≥2 ng/mL。`,
        details: ["建議 hold digoxin，評估噁心嘔吐、視覺異常、意識、bradycardia/AV block/ventricular arrhythmia，並檢查 K/Mg/Ca、SCr。嚴重中毒需評估 digoxin immune Fab。"],
      };
    }
    if (value > target.high || value >= target.caution) {
      return {
        tone: "amber" as const,
        title: "高於建議目標",
        summary: `${value} ng/mL；${target.label}。`,
        details: [value >= 1.2 ? "濃度 ≥1.2 ng/mL 與較高風險相關；若無急性 rate control 需求，建議降低維持劑量或延長間隔。" : "濃度高於現代偏低目標；若心率已控制或合併 HF/高齡/腎功能差，建議保守降劑量或延長間隔。", "同時確認抽血時間、腎功能變化與 P-gp inhibitor 交互作用。"],
      };
    }
    if (value < target.low) {
      return {
        tone: "blue" as const,
        title: "低於常用目標",
        summary: `${value} ng/mL；${target.label}。`,
        details: ["不要只因單一濃度偏低就加量；請先確認抽血時機、服藥順從性、心率控制與臨床反應。"],
      };
    }
    return {
      tone: "green" as const,
      title: "落在目標範圍",
      summary: `${value} ng/mL；${target.label}。`,
      details: ["若心率/症狀控制佳且無毒性，通常維持目前劑量並追蹤腎功能、電解質與交互作用。"],
    };
  }, [indication, level, levelTiming]);

  const regimen = useMemo(() => {
    const doseMcg = mgToMcg(currentDoseMg);
    const freq = frequencyText(currentFrequency, customFrequency);
    if (!doseMcg && !currentlyHeld) return null;
    const dailyEquivalent = currentFrequency === "Q48H" || currentFrequency === "QOD"
      ? doseMcg / 2
      : currentFrequency === "BID"
        ? doseMcg * 2
        : currentFrequency === "QD"
          ? doseMcg
          : null;
    return {
      doseMcg,
      freq,
      dailyEquivalent,
      text: currentlyHeld
        ? `目前已 hold digoxin${doseMcg ? `；原 regimen ${fmtMcg(doseMcg)} ${currentRoute} ${freq}` : ""}`
        : `${fmtMcg(doseMcg)} ${currentRoute} ${freq}`,
    };
  }, [currentDoseMg, currentFrequency, currentRoute, currentlyHeld, customFrequency]);

  const regimenSuggestion = useMemo(() => {
    if (!levelInterpretation || !regimen || currentlyHeld) return "";
    const value = n(level);
    const target = targetRange(indication);
    if (levelTiming !== null && levelTiming < 6) {
      return "Do not adjust the maintenance regimen from this early level; repeat a post-distribution level.";
    }
    if (value >= 2) {
      return "Recommend holding digoxin and reassessing toxicity, ECG, electrolytes, renal function, and interacting drugs.";
    }
    if (value > target.high || value >= target.caution) {
      if (regimen.dailyEquivalent && regimen.dailyEquivalent > 62.5) {
        return `Consider decreasing maintenance dose or extending interval (for example, reduce toward ${fmtMcg(Math.max(62.5, regimen.dailyEquivalent / 2))}/day equivalent or hold 1 dose then resume lower), depending on HR and symptoms.`;
      }
      return "Current dose is already very low; consider extending interval, holding temporarily, or reassessing need for digoxin.";
    }
    if (value < target.low) {
      return "If HR/symptoms are not controlled and sampling/adherence are appropriate, consider cautious dose increase; avoid escalation if toxicity risk is high.";
    }
    return "Current regimen can usually be continued if HR/symptoms are controlled and no toxicity is present.";
  }, [currentlyHeld, indication, level, levelInterpretation, levelTiming, regimen]);

  const note = useMemo(() => {
    const lines = [
      "Digoxin TDM Note",
      `Indication: ${indication === "af" ? "AF rate control" : "HF"}`,
      `DW: ${patient.dosingWeight ? round1(patient.dosingWeight) : "__"} kg (${patient.weightNote})`,
      `CrCl: ${patient.crcl ?? "__"} mL/min`,
    ];
    if (regimen) {
      lines.push(`Current regimen: ${regimen.text}${regimen.dailyEquivalent ? ` (daily equivalent ${fmtMcg(regimen.dailyEquivalent)}/day)` : ""}.`);
      if (lastDoseDatetime) lines.push(`Last digoxin dose time: ${formatDT(lastDoseDatetime)}.`);
    }
    if (loadingHistory) {
      lines.push(`Loading history: ${loadingHistory.text}.`);
      if (loadingHistory.timingWarning) lines.push(`Loading timing caution: ${loadingHistory.timingWarning}`);
    }
    if (loading) {
      lines.push(`Loading (${route}): ${loading.rangeText}; suggested total ${fmtMcg(loading.total)} (${loading.suggestedMcgPerKg} mcg/kg).`);
      lines.push(`Schedule: ${fmtMcg(loading.first)} now, then ${fmtMcg(loading.second)} q6-8h x1, then ${fmtMcg(loading.third)} q6-8h x1; assess HR/ECG/toxicity before each dose.`);
    }
    if (maintenance) {
      lines.push(`Maintenance estimate (${maintenanceRoute}): ${fmtMcg(maintenance.practical)} daily-ish; ${maintenance.note}.`);
    }
    if (levelDatetime) lines.push(`Digoxin level draw time: ${formatDT(levelDatetime)}${levelTiming !== null ? ` (${levelTiming} hr after last dose)` : ""}.`);
    lines.push(`Level timing (${loadingStatus === "given" ? "loading given" : "no loading"}): ${samplingAdviceEn}`);
    if (levelInterpretation) lines.push(`Level interpretation: ${levelInterpretation.title} - ${levelInterpretation.summary}`);
    if (regimenSuggestion) lines.push(`Regimen suggestion: ${regimenSuggestion}`);
    if (!steadyState) lines.push("Steady state: not confirmed; chronic maintenance level is most interpretable after ~5 half-lives (normal renal function often ~7-10 days; renal dysfunction may require 2-3 weeks or longer).");
    return lines.join("\n");
  }, [indication, lastDoseDatetime, levelDatetime, levelInterpretation, levelTiming, loading, loadingHistory, loadingStatus, maintenance, maintenanceRoute, patient, regimen, regimenSuggestion, route, samplingAdviceEn, steadyState]);

  const copyNote = async () => {
    await navigator.clipboard.writeText(note);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div style={S.header}>
        <div style={S.title}>Digoxin TDM</div>
        <div style={S.subtitle}>IV / PO loading、maintenance estimate、正確抽血時間與濃度判讀</div>
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>治療情境</div>
        <div style={S.grid2}>
          <label>
            <span style={S.label}>適應症</span>
            <select style={S.select} value={indication} onChange={(e) => setIndication(e.target.value as Indication)}>
              <option value="af">AF rate control / 急性期需 loading</option>
              <option value="hf">HF / 慢性治療</option>
            </select>
          </label>
          <label>
            <span style={S.label}>Loading route</span>
            <select style={S.select} value={route} onChange={(e) => setRoute(e.target.value as Route)}>
              <option value="IV">IV injection</option>
              <option value="PO">PO tablet</option>
            </select>
          </label>
          <label>
            <span style={S.label}>Maintenance route</span>
            <select style={S.select} value={maintenanceRoute} onChange={(e) => setMaintenanceRoute(e.target.value as MaintenanceRoute)}>
              <option value="PO">PO</option>
              <option value="IV">IV</option>
            </select>
          </label>
          <label>
            <span style={S.label}>有無 loading dose</span>
            <select style={S.select} value={loadingStatus} onChange={(e) => setLoadingStatus(e.target.value as LoadingStatus)}>
              <option value="given">有給 loading dose</option>
              <option value="none">未給 loading，直接 maintenance</option>
            </select>
          </label>
        </div>
        {indication === "hf" && <Warning text="HF 慢性治療通常不需要 loading；多從低劑量 maintenance 開始，目標血中濃度較低。" />}
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>病人資料</div>
        <div style={S.grid2}>
          <Input label="年齡" value={age} onChange={setAge} suffix="歲" />
          <label>
            <span style={S.label}>性別</span>
            <select style={S.select} value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="F">Female</option>
              <option value="M">Male</option>
            </select>
          </label>
          <Input label="身高" value={height} onChange={setHeight} suffix="cm" />
          <Input label="TBW" value={tbw} onChange={setTbw} suffix="kg" />
          {!useDirectCrCl && <Input label="SCr" value={scr} onChange={setScr} suffix="mg/dL" />}
          {useDirectCrCl && <Input label="CrCl" value={directCrCl} onChange={setDirectCrCl} suffix="mL/min" />}
        </div>
        <label style={S.checkboxRow}>
          <input type="checkbox" checked={useDirectCrCl} onChange={(e) => setUseDirectCrCl(e.target.checked)} />
          <span>直接輸入 CrCl</span>
        </label>
        <div style={S.patientBox}>
          <span>{patient.weightNote}</span>
          {patient.ibw && <span>IBW {patient.ibw} kg</span>}
          {patient.crcl !== null && <span>CrCl {patient.crcl} mL/min</span>}
        </div>
      </div>

      {loading && (
        <InfoCard tone={loading.renalOrElderly ? "amber" : "blue"} title={`${route} loading 建議`}>
          <Row label="總 loading 範圍" value={`${loading.rangeText} = ${fmtMcg(loading.low)}-${fmtMcg(loading.high)}`} highlight />
          <Row label="建議總量" value={`${loading.suggestedMcgPerKg} mcg/kg = ${fmtMcg(loading.total)}`} highlight />
          <Row label="第 1 劑" value={`${fmtMcg(loading.first)} now（約總量 1/2）`} />
          <Row label="第 2 劑" value={`${fmtMcg(loading.second)} after 6-8 hr（約總量 1/4）`} />
          <Row label="第 3 劑" value={`${fmtMcg(loading.third)} after another 6-8 hr（約總量 1/4）`} />
          {route === "IV" && <Warning text="IV digoxin 應 over ≥5 min，避免 rapid bolus。每次追加 loading 前先評估 HR、ECG、腎功能、K/Mg 與毒性症狀。" />}
          {route === "PO" && <Warning text="PO tablet bioavailability 較 IV 低，因此成人 PO loading 為 10-15 mcg/kg，通常高於 IV 8-12 mcg/kg。" />}
        </InfoCard>
      )}

      {maintenance && (
        <InfoCard tone="green" title="Maintenance 粗估">
          <Row label="估算維持劑量" value={`${fmtMcg(maintenance.estimated)} / day`} />
          <Row label="實務起始建議" value={`${fmtMcg(maintenance.practical)} ${maintenanceRoute} QD${patient.crcl !== null && patient.crcl < 30 ? " 或 Q48H" : ""}`} highlight />
          <Row label="估算依據" value={`Daily loss 約 ${maintenance.dailyLossPct}%/day；依 renal function、lean BW 與 route bioavailability 粗估`} />
          <div style={S.muted}>{maintenance.note}</div>
        </InfoCard>
      )}

      {noLoadStart && (
        <InfoCard tone="blue" title="不 loading 時的慢性起始劑量">
          <Row label="建議起始" value={`${fmtMcg(noLoadStart.dose)} ${maintenanceRoute} ${noLoadStart.interval}`} highlight />
          <div style={S.muted}>{noLoadStart.text}</div>
          <Warning text="慢性 HF 通常不建議 loading；約 5 個半衰期後才接近 steady state，腎功能差可能需 1-3 週或更久。若要抽濃度，請等足夠時間並抽 trough/至少給藥後 6-8 小時。" />
        </InfoCard>
      )}

      {loadingStatus === "given" && (
        <div style={S.section}>
          <div style={S.sectionTitle}>實際 Loading 紀錄</div>
          <div style={S.helpText}>建議填實際每個時間點給了多少，工具會自動加總並用最後一劑時間判斷抽血是否避開分布期。</div>
          <div style={S.grid2}>
            <Input label="第 1 劑 dose" value={loadDose1Mg} onChange={setLoadDose1Mg} suffix="mg" />
            <DateTimeInput label="第 1 劑給藥時間" value={loadDose1Datetime} onChange={setLoadDose1Datetime} />
            <Input label="第 2 劑 dose" value={loadDose2Mg} onChange={setLoadDose2Mg} suffix="mg" />
            <DateTimeInput label="第 2 劑給藥時間" value={loadDose2Datetime} onChange={setLoadDose2Datetime} />
            <Input label="第 3 劑 dose" value={loadDose3Mg} onChange={setLoadDose3Mg} suffix="mg" />
            <DateTimeInput label="第 3 劑給藥時間" value={loadDose3Datetime} onChange={setLoadDose3Datetime} />
          </div>
          <label style={S.checkboxRow}>
            <input type="checkbox" checked={loadingCompleted} onChange={(e) => setLoadingCompleted(e.target.checked)} />
            <span>Loading dose 已完成</span>
          </label>
          {loadingHistory && (
            <div style={S.patientBox}>
              <span>{loadingHistory.text}</span>
              {loadingHistory.timingWarning && <span style={{ color: "#B91C1C", fontWeight: 800 }}>{loadingHistory.timingWarning}</span>}
            </div>
          )}
        </div>
      )}

      <div style={S.section}>
        <div style={S.sectionTitle}>目前給藥方式</div>
        <div style={S.grid2}>
          <Input label="目前每次劑量" value={currentDoseMg} onChange={setCurrentDoseMg} suffix="mg/dose" />
          <label>
            <span style={S.label}>目前途徑</span>
            <select style={S.select} value={currentRoute} onChange={(e) => setCurrentRoute(e.target.value as CurrentRoute)}>
              <option value="PO">PO</option>
              <option value="IV">IV</option>
            </select>
          </label>
          <label>
            <span style={S.label}>目前頻率</span>
            <select style={S.select} value={currentFrequency} onChange={(e) => setCurrentFrequency(e.target.value as CurrentFrequency)}>
              <option value="QD">QD</option>
              <option value="Q48H">Q48H</option>
              <option value="QOD">QOD</option>
              <option value="BID">BID</option>
              <option value="other">其他</option>
            </select>
          </label>
          {currentFrequency === "other" && <Input label="自訂頻率" value={customFrequency} onChange={setCustomFrequency} />}
        </div>
        <label style={S.checkboxRow}>
          <input type="checkbox" checked={currentlyHeld} onChange={(e) => setCurrentlyHeld(e.target.checked)} />
          <span>目前已 hold digoxin</span>
        </label>
        <div style={{ marginTop: 12 }}>
          <DateTimeInput label="最後一次 digoxin 給藥時間" value={lastDoseDatetime} onChange={setLastDoseDatetime} />
        </div>
        {regimen && (
          <div style={S.patientBox}>
            <span>{regimen.text}</span>
            {regimen.dailyEquivalent !== null && regimen.dailyEquivalent !== undefined && <span>Daily equivalent：約 {fmtMcg(regimen.dailyEquivalent)} / day</span>}
          </div>
        )}
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>濃度判讀</div>
        <div style={S.grid2}>
          <Input label="Digoxin level" value={level} onChange={setLevel} suffix="ng/mL" />
          <DateTimeInput label="抽血時間" value={levelDatetime} onChange={setLevelDatetime} />
        </div>
        <label style={S.checkboxRow}>
          <input type="checkbox" checked={steadyState} onChange={(e) => setSteadyState(e.target.checked)} />
          <span>已達 steady state（維持劑量後通常約 1-3 週；腎功能差更久）</span>
        </label>
        <div style={S.timingBox}>
          <strong>正確抽血時間：</strong>{samplingAdvice}
          {levelTiming !== null && <div style={S.timingBadge}>距最後一次給藥：{levelTiming} hr</div>}
          <div style={S.timingBadge}>{timingBadge}</div>
        </div>
        {levelInterpretation && (
          <InfoCard tone={levelInterpretation.tone} title={levelInterpretation.title}>
            <div style={S.summary}>{levelInterpretation.summary}</div>
            {levelInterpretation.details.map((detail) => <Warning key={detail} text={detail} />)}
            {regimenSuggestion && <div style={S.regimenSuggestion}>{regimenSuggestion}</div>}
          </InfoCard>
        )}
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>TDM Note 預覽</div>
        <pre style={S.note}>{note}</pre>
        <button style={S.copyBtn} onClick={copyNote}>{copied ? "已複製" : "複製 TDM Note"}</button>
      </div>

      <ClinicalReference />
    </div>
  );
}

function Input({ label, value, onChange, suffix }: { label: string; value: string; onChange: (value: string) => void; suffix?: string }) {
  return (
    <label>
      <span style={S.label}>{label}</span>
      <div style={S.inputWrap}>
        <input style={S.input} value={value} inputMode="decimal" onChange={(e) => onChange(e.target.value)} />
        {suffix && <span style={S.suffix}>{suffix}</span>}
      </div>
    </label>
  );
}

function DateTimeInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span style={S.label}>{label}</span>
      <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} style={S.dateTimeInput} />
    </label>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ ...S.row, ...(highlight ? S.rowHighlight : {}) }}>
      <span style={S.rowLabel}>{label}</span>
      <span style={S.rowValue}>{value}</span>
    </div>
  );
}

function Warning({ text }: { text: string }) {
  return <div style={S.warning}>{text}</div>;
}

function InfoCard({ tone, title, children }: { tone: "green" | "blue" | "amber" | "red" | "gray"; title: string; children: ReactNode }) {
  const c = toneColor(tone);
  return (
    <div style={{ ...S.section, background: c.bg, border: `1px solid ${c.border}` }}>
      <div style={{ ...S.cardTitle, color: c.color }}>{title}</div>
      {children}
    </div>
  );
}

function ClinicalReference() {
  const [open, setOpen] = useState(false);
  return (
    <div style={S.section}>
      <button style={S.accordionBtn} onClick={() => setOpen(!open)}>
        <span>臨床參考</span>
        <span>{open ? "⌃" : "⌄"}</span>
      </button>
      {open && (
        <div style={S.refBody}>
          <h3 style={S.refHeading}>Loading 給法</h3>
          <p>成人 IV loading：8-12 mcg/kg；成人 PO loading：10-15 mcg/kg。若給 loading，先給總量 1/2，再於 6-8 小時後給 1/4、再 6-8 小時後給 1/4；每次追加前都要評估心率、ECG 與毒性。</p>
          <p>若是慢性 HF 或不急的 rate control，通常可不 loading，直接從 maintenance 開始。常見起始為 125 mcg QD；高齡、CrCl &lt;30、low lean BW 或交互作用風險高者，建議 62.5 mcg QD 或 Q48H 起始。</p>

          <h3 style={S.refHeading}>抽血時間</h3>
          <p>Digoxin 有分布期，早期高 serum concentration 不代表作用部位濃度。建議 trough（下次給藥前）；若無法，至少距最後一次給藥 6-8 小時，不分 IV 或 PO。</p>
          <p>未給 loading、直接 maintenance 時，3-5 天抽血可作早期安全性參考，但通常還不是完整 steady state；若要用濃度調整維持劑量，正常腎功能較建議 7-10 天後抽 trough，腎功能差可能需 2-3 週或更久。已給 loading 時，急性濃度至少最後一劑後 6-8 小時；若要看維持劑量是否累積，仍需後續追蹤。</p>

          <h3 style={S.refHeading}>多久達 steady state</h3>
          <p>Digoxin 約需 5 個半衰期才接近 steady state。正常腎功能時半衰期約 36-48 小時，因此常抓 7-10 天；腎功能下降時半衰期會延長，可能需要 2-3 週或更久。若只是懷疑中毒、交互作用或腎功能急變，則不必等 steady state，可先抽濃度協助安全性判讀；但仍應盡量避開分布期，至少距最後一次給藥 6-8 小時。若真的太早抽，只能當作粗略安全警訊，不能直接用來調整維持劑量。</p>

          <h3 style={S.refHeading}>體重</h3>
          <p>Digoxin 分布空間較符合 lean/ideal body weight，不跟脂肪體重等比例增加。若 TBW 低於 IBW，使用 TBW；若 TBW 高於 IBW，使用 IBW 作為 lean body weight 的近似。肥胖或水腫病人尤其要避免直接用 TBW 高估劑量。</p>

          <h3 style={S.refHeading}>目標濃度</h3>
          <p>目前趨勢是偏低目標。HF 常用目標 0.5-0.9 ng/mL，2022 HF guideline 也提醒 ≥1.2 ng/mL 風險較高。2023 AF guideline 則寫若需要測 digoxin level，target &lt;1.2 ng/mL 合理；但合併 HF、高齡、腎功能差或毒性風險高時，實務上常偏向 0.5-0.9 ng/mL。濃度 &gt;2 ng/mL 與毒性風險上升相關，但低鉀、低鎂、高鈣、腎功能惡化或交互作用時，較低濃度也可能中毒。</p>

          <h3 style={S.refHeading}>常見交互作用</h3>
          <p>Amiodarone、dronedarone、quinidine、verapamil、macrolides、azole antifungals、cyclosporine/tacrolimus 等 P-gp inhibitor 可能升高 digoxin 濃度；低鉀利尿劑也會增加毒性敏感度。</p>
        </div>
      )}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  header: { textAlign: "center", padding: "16px 0 24px" },
  title: { fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 4, lineHeight: 1.5 },
  section: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", boxSizing: "border-box", overflow: "hidden" },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 },
  helpText: { color: "#64748B", fontSize: 12, lineHeight: 1.5, marginBottom: 12 },
  select: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", boxSizing: "border-box" },
  dateTimeInput: { width: "100%", minHeight: 46, padding: "10px 12px", borderRadius: 12, border: "1.5px solid #DDE5F0", fontSize: 15, fontWeight: 600, color: "#0F172A", background: "#fff", outline: "none", boxSizing: "border-box", boxShadow: "0 1px 0 rgba(15,23,42,0.02)" },
  inputWrap: { display: "flex", alignItems: "center", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", overflow: "hidden" },
  input: { flex: 1, minWidth: 0, padding: "10px 12px", border: "none", fontSize: 15, color: "#0F172A", background: "#fff", outline: "none", boxSizing: "border-box", width: "100%" },
  suffix: { padding: "0 10px", color: "#64748B", fontSize: 12, whiteSpace: "nowrap" },
  checkboxRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, color: "#475569" },
  patientBox: { display: "flex", flexDirection: "column", gap: 4, background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", color: "#475569", fontSize: 13, marginTop: 12 },
  cardTitle: { fontWeight: 800, fontSize: 16, marginBottom: 10 },
  row: { display: "grid", gridTemplateColumns: "minmax(120px, 0.8fr) minmax(0, 1.3fr)", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(148,163,184,0.25)", alignItems: "start" },
  rowHighlight: { fontWeight: 800 },
  rowLabel: { color: "#64748B", fontSize: 13, fontWeight: 700 },
  rowValue: { color: "#0F172A", fontSize: 14, lineHeight: 1.5, wordBreak: "break-word" },
  muted: { color: "#475569", fontSize: 13, lineHeight: 1.55, marginTop: 8 },
  warning: { background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.5, marginTop: 10 },
  timingBox: { background: "#F0FDFA", border: "1px solid #99F6E4", color: "#115E59", borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.55, marginTop: 12 },
  timingBadge: { marginTop: 8, display: "inline-block", background: "#CCFBF1", color: "#0F766E", borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 800 },
  summary: { color: "#0F172A", fontSize: 14, lineHeight: 1.6, fontWeight: 700 },
  regimenSuggestion: { marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "#FFFFFF", border: "1px solid rgba(148,163,184,0.35)", color: "#0F172A", fontSize: 13, lineHeight: 1.55, fontWeight: 700 },
  note: { whiteSpace: "pre-wrap", background: "#0F172A", color: "#E2E8F0", borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.55, overflowX: "auto" },
  copyBtn: { width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 10, border: "none", background: ACCENT, color: "#fff", fontWeight: 800, cursor: "pointer" },
  accordionBtn: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", border: "none", background: "transparent", padding: 0, fontSize: 16, color: "#0F172A", fontWeight: 800, cursor: "pointer" },
  refBody: { marginTop: 12, color: "#334155", fontSize: 13, lineHeight: 1.65 },
  refHeading: { fontSize: 14, color: "#0F172A", margin: "14px 0 6px", fontWeight: 800 },
};
