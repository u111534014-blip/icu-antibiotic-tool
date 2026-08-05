import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const ACCENT = "#0D9488";
const NOMOGRAM_BASE = "/icu-antibiotic-tool/nomograms/";

type Method = "auc" | "nomogram" | "traditional" | "ntm";
type Sex = "M" | "F";
type NomogramType = "hartford" | "urban";
type TraditionalTarget = "lifeThreatening" | "serious" | "uti" | "cf";
type NtmSchedule = "daily" | "tiw";

function n(value: string): number {
  return parseFloat(value) || 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundDose(value: number): number {
  return Math.max(50, Math.round(value / 50) * 50);
}

function calcIbw(heightCm: number, sex: Sex): number | null {
  if (!heightCm) return null;
  return round1((sex === "M" ? 50 : 45.5) + 0.91 * (heightCm - 152.4));
}

function calcAdjBw(tbw: number, ibw: number): number {
  return round1(ibw + 0.4 * (tbw - ibw));
}

function calcCrCl(age: number, sex: Sex, scr: number, weight: number): number | null {
  if (!age || !scr || !weight) return null;
  const base = ((140 - age) * weight) / (72 * scr);
  return round1(sex === "F" ? base * 0.85 : base);
}

function intervalByCrCl(method: NomogramType, crcl: number | null): string {
  if (crcl === null) return "請輸入 CrCl 或病人資料";
  if (method === "hartford") {
    if (crcl >= 60) return "Q24H";
    if (crcl >= 40) return "Q36H";
    if (crcl >= 30) return "Q48H";
    return "不建議使用 Hartford nomogram；改傳統 dosing by level";
  }
  if (crcl >= 60) return "Q24H";
  if (crcl >= 40) return "Q36H";
  if (crcl >= 20) return "Q48H";
  return "不建議使用 Urban/Craig nomogram；改傳統 dosing by level";
}

function traditionalDoseByCrCl(crcl: number | null): string {
  if (crcl === null) return "請輸入 CrCl 或病人資料";
  if (crcl > 60) return "7.5 mg/kg Q12H，或 5 mg/kg Q8H";
  if (crcl >= 40) return "5-7.5 mg/kg Q12H";
  if (crcl >= 20) return "5-7.5 mg/kg Q24H";
  return "5 mg/kg loading dose，之後依濃度補劑量";
}

function cfDoseByCrCl(crcl: number | null): string {
  if (crcl === null) return "請輸入 CrCl 或病人資料";
  if (crcl >= 60) return "20 mg/kg Q24H";
  if (crcl >= 40) return "20 mg/kg Q36H";
  if (crcl >= 30) return "20 mg/kg Q48H";
  return "不建議使用 extended-interval CF 方案；改 dosing by level";
}

function ntmDoseText(schedule: NtmSchedule, age: number, dosingWeight: number, crcl: number | null): string {
  if (!dosingWeight) return "請輸入體重";
  const older = age >= 50;
  const baseDose = older ? Math.min(roundDose(10 * dosingWeight), 500) : roundDose((schedule === "daily" ? 10 : 15) * dosingWeight);

  if (schedule === "tiw") {
    return older
      ? `${baseDose} mg TIW（年齡 >50 歲：10 mg/kg TIW，max 500 mg/dose）`
      : `${roundDose(10 * dosingWeight)}-${roundDose(25 * dosingWeight)} mg TIW（10-25 mg/kg TIW）`;
  }

  let interval = "Q24H";
  if (crcl !== null) {
    if (crcl >= 60) interval = "Q24H";
    else if (crcl >= 40) interval = "Q24-48H；高齡或腎功能差可考慮 Mon-Fri 5x/week";
    else if (crcl >= 30) interval = "Q48-72H";
    else interval = "dosing by level";
  }

  return older
    ? `${baseDose} mg ${interval}（年齡 >50 歲：10 mg/kg，max 500 mg/dose）`
    : `${roundDose(10 * dosingWeight)}-${roundDose(15 * dosingWeight)} mg ${interval}（10-15 mg/kg）`;
}

function targetText(target: TraditionalTarget): { peak: string; trough: string; troughNumber: number } {
  if (target === "lifeThreatening") return { peak: "25-30 mcg/mL", trough: "<4-8 mcg/mL", troughNumber: 5 };
  if (target === "serious") return { peak: "20-25 mcg/mL", trough: "<4-8 mcg/mL", troughNumber: 5 };
  if (target === "uti") return { peak: "15-20 mcg/mL", trough: "<4-8 mcg/mL", troughNumber: 5 };
  return { peak: "40-60 mcg/mL", trough: "<4 mcg/mL", troughNumber: 4 };
}

function ntmTargetText(schedule: NtmSchedule): { peak: string; trough: string; troughNumber: number } {
  if (schedule === "daily") return { peak: "20-30 mcg/mL（部分病人可接受 25-40，但常因 tolerability 採較低目標）", trough: "<4 mcg/mL", troughNumber: 4 };
  return { peak: "20-30 mcg/mL；若 tolerability 可接受可考慮 35-45 mcg/mL", trough: "<4 mcg/mL", troughNumber: 4 };
}

function toneColor(tone: "green" | "blue" | "amber" | "red" | "gray") {
  if (tone === "green") return { bg: "#ECFDF5", border: "#A7F3D0", color: "#047857" };
  if (tone === "blue") return { bg: "#EFF6FF", border: "#BFDBFE", color: "#1D4ED8" };
  if (tone === "amber") return { bg: "#FEF3C7", border: "#FBBF24", color: "#92400E" };
  if (tone === "red") return { bg: "#FEF2F2", border: "#FECACA", color: "#B91C1C" };
  return { bg: "#F8FAFC", border: "#E2E8F0", color: "#475569" };
}

function nomogramImagePath(type: NomogramType): string {
  const file = type === "hartford"
    ? "amikacin-hartford-nomogram.png"
    : "amikacin-urban-craig-nomogram.png";
  return `${NOMOGRAM_BASE}${file}`;
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

function formatDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

export default function AmikacinTDM() {
  const [method, setMethod] = useState<Method>("auc");
  const [sex, setSex] = useState<Sex>("F");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [tbw, setTbw] = useState("");
  const [scr, setScr] = useState("");
  const [directCrCl, setDirectCrCl] = useState("");
  const [useDirectCrCl, setUseDirectCrCl] = useState(false);

  const [nomogramType, setNomogramType] = useState<NomogramType>("hartford");
  const [randomLevel, setRandomLevel] = useState("");
  const [randomLevelDatetime, setRandomLevelDatetime] = useState("");

  const [aucDose, setAucDose] = useState("");
  const [aucInterval, setAucInterval] = useState("24");
  const [infusionHours, setInfusionHours] = useState("0.5");
  const [doseStartDatetime, setDoseStartDatetime] = useState("");
  const [level1, setLevel1] = useState("");
  const [level1Datetime, setLevel1Datetime] = useState("");
  const [level2, setLevel2] = useState("");
  const [level2Datetime, setLevel2Datetime] = useState("");

  const [tradTarget, setTradTarget] = useState<TraditionalTarget>("serious");
  const [tradPeak, setTradPeak] = useState("");
  const [tradTrough, setTradTrough] = useState("");
  const [tradPeakDatetime, setTradPeakDatetime] = useState("");
  const [tradTroughDatetime, setTradTroughDatetime] = useState("");

  const [ntmSchedule, setNtmSchedule] = useState<NtmSchedule>("daily");
  const [copied, setCopied] = useState(false);

  const patient = useMemo(() => {
    const weight = n(tbw);
    const h = n(height);
    const patientAge = n(age);
    const serumCr = n(scr);
    const ibw = calcIbw(h, sex);
    const bmi = weight && h ? round1(weight / Math.pow(h / 100, 2)) : null;
    const useAdj = !!ibw && weight >= 1.25 * ibw;
    const adjBw = ibw && useAdj ? calcAdjBw(weight, ibw) : null;
    const dosingWeight = adjBw || weight;
    const crclWeight = adjBw || weight;
    const autoCrCl = calcCrCl(patientAge, sex, serumCr, crclWeight);
    const crcl = useDirectCrCl ? (n(directCrCl) || null) : autoCrCl;

    return {
      age: patientAge,
      tbw: weight,
      ibw,
      bmi,
      adjBw,
      dosingWeight,
      crcl,
      weightNote: adjBw
        ? `TBW ≥125% IBW，使用 AdjBW ${adjBw} kg`
        : weight
          ? ibw && weight < ibw
            ? `TBW < IBW，使用實際體重 ${round1(weight)} kg`
            : ibw
              ? `TBW <125% IBW，使用實際體重 ${round1(weight)} kg`
              : `使用 TBW ${round1(weight)} kg`
          : "尚未輸入體重",
    };
  }, [age, directCrCl, height, scr, sex, tbw, useDirectCrCl]);

  const initialDose = useMemo(() => {
    const dw = patient.dosingWeight;
    if (!dw) return null;

    if (method === "auc") {
      const dose = roundDose(15 * dw);
      return {
        title: "IDSA 2026 AMR GNB AUC 方案",
        dose: `15 mg/kg = ${dose} mg x1；後續依 AUC / trough 調整`,
        detail: "IDSA 2026 dosing table 僅列 uUTI/cUTI；cUTI multi-dose 目標 AUC0-24 200-300 mg*h/L。單次 uUTI dose 通常不需 TDM。",
      };
    }

    if (method === "nomogram") {
      const dose = roundDose(15 * dw);
      return {
        title: nomogramType === "hartford" ? "Stanford Hartford nomogram" : "Stanford Urban/Craig nomogram",
        dose: `15 mg/kg = ${dose} mg ${intervalByCrCl(nomogramType, patient.crcl)}`,
        detail: "首劑後 8-12 小時抽 random level；amikacin 需先轉換濃度再對照 nomogram。",
      };
    }

    if (method === "traditional") {
      const dose = tradTarget === "cf" ? roundDose(20 * dw) : `${roundDose(5 * dw)}-${roundDose(7.5 * dw)}`;
      return {
        title: tradTarget === "cf" ? "Cystic fibrosis extended interval" : "Traditional peak/trough dosing",
        dose: tradTarget === "cf" ? `${dose} mg ${cfDoseByCrCl(patient.crcl)}（20 mg/kg）` : `${dose} mg；${traditionalDoseByCrCl(patient.crcl)}`,
        detail: "以 peak/trough 目標與半衰期調整，適合腎功能不穩、CrCl 低或不適合 nomogram 的病人。",
      };
    }

    return {
      title: "NTM amikacin",
      dose: ntmDoseText(ntmSchedule, patient.age, dw, patient.crcl),
      detail: "療程長，建議規律監測 peak/trough、SCr、聽力與前庭毒性。",
    };
  }, [method, nomogramType, ntmSchedule, patient, tradTarget]);

  const aucTiming = useMemo(() => {
    const start = dtToDate(doseStartDatetime);
    const lev1 = dtToDate(level1Datetime);
    const lev2 = dtToDate(level2Datetime);
    const tinf = Math.max(0.25, n(infusionHours));
    if (!start || !lev1 || !lev2) return null;
    const infusionEnd = new Date(start.getTime() + tinf * 60 * 60 * 1000);
    return {
      infusionEnd,
      t1: round2(hoursBetween(infusionEnd, lev1)),
      t2: round2(hoursBetween(infusionEnd, lev2)),
    };
  }, [doseStartDatetime, infusionHours, level1Datetime, level2Datetime]);

  const randomHour = useMemo(() => {
    const start = dtToDate(doseStartDatetime);
    const random = dtToDate(randomLevelDatetime);
    if (!start || !random) return null;
    return round2(hoursBetween(start, random));
  }, [doseStartDatetime, randomLevelDatetime]);

  const tradDelta = useMemo(() => {
    const peakDate = dtToDate(tradPeakDatetime);
    const troughDate = dtToDate(tradTroughDatetime);
    if (!peakDate || !troughDate) return null;
    return round2(hoursBetween(peakDate, troughDate));
  }, [tradPeakDatetime, tradTroughDatetime]);

  const aucResult = useMemo(() => {
    const dose = n(aucDose);
    const tau = Math.max(6, n(aucInterval));
    const tinf = Math.max(0.25, n(infusionHours));
    const c1 = n(level1);
    const c2 = n(level2);
    const t1 = aucTiming?.t1 ?? 0;
    const t2 = aucTiming?.t2 ?? 0;
    if (!dose || !c1 || !c2 || !t2 || t2 <= t1 || c1 <= c2) return null;

    const ke = Math.log(c1 / c2) / (t2 - t1);
    const halfLife = 0.693 / ke;
    const cPeakEndFirst = c1 * Math.exp(ke * t1);
    const vd = dose * (1 - Math.exp(-ke * tinf)) / (tinf * ke * cPeakEndFirst);
    const cl = ke * vd;
    const auc24 = dose * (24 / tau) / cl;
    const targetDailyDose = 250 * cl;
    const suggestedPerDose = roundDose(targetDailyDose * tau / 24);
    const cmaxSs = cPeakEndFirst / (1 - Math.exp(-ke * tau));
    const troughSs = cmaxSs * Math.exp(-ke * Math.max(0, tau - tinf));
    const tone = auc24 > 300 || troughSs >= 5 ? "red" : auc24 < 200 ? "amber" : "green";

    return {
      ke,
      halfLife,
      vd,
      cl,
      auc24,
      suggestedPerDose,
      cPeakEndFirst,
      cmaxSs,
      troughSs,
      tone,
    };
  }, [aucDose, aucInterval, aucTiming, infusionHours, level1, level2]);

  const nomogramResult = useMemo(() => {
    const level = n(randomLevel);
    const hour = randomHour ?? 0;
    if (!level || !hour) return null;
    const divisor = nomogramType === "hartford" ? 2 : 3;
    const converted = round2(level / divisor);
    return {
      converted,
      interval: intervalByCrCl(nomogramType, patient.crcl),
      warning: hour < 8 || hour > 12 ? "Random level 建議在首劑後 8-12 小時抽；目前時間不在建議範圍，請謹慎解讀。" : "",
      divisor,
    };
  }, [nomogramType, patient.crcl, randomHour, randomLevel]);

  const tradResult = useMemo(() => {
    const peak = n(tradPeak);
    const trough = n(tradTrough);
    const delta = tradDelta ?? 0;
    if (!peak || !trough || !delta || peak <= trough) return null;
    const ke = Math.log(peak / trough) / delta;
    const halfLife = 0.693 / ke;
    const target = targetText(tradTarget);
    const hoursToSafeTrough = trough > target.troughNumber ? Math.log(trough / target.troughNumber) / ke : 0;
    return { ke, halfLife, hoursToSafeTrough, target };
  }, [tradDelta, tradPeak, tradTarget, tradTrough]);

  const ntmTargets = ntmTargetText(ntmSchedule);

  const note = useMemo(() => {
    const lines = [
      "Amikacin TDM Note",
      `Method: ${method === "auc" ? "IDSA 2026 AUC" : method === "nomogram" ? `Stanford ${nomogramType}` : method === "traditional" ? "Traditional peak/trough" : "NTM dosing/TDM"}`,
      `DW: ${patient.dosingWeight ? round1(patient.dosingWeight) : "__"} kg (${patient.weightNote})`,
      `CrCl: ${patient.crcl ?? "__"} mL/min`,
    ];
    if (initialDose) lines.push(`Initial recommendation: ${initialDose.dose}`);
    if (aucResult) {
      if (doseStartDatetime) lines.push(`Dose start: ${formatDT(doseStartDatetime)}; infusion time ${infusionHours} h${aucTiming ? `; infusion end ${formatDate(aucTiming.infusionEnd)}` : ""}.`);
      if (level1Datetime) lines.push(`Level #1: ${level1} mcg/mL drawn ${formatDT(level1Datetime)}${aucTiming ? ` (${aucTiming.t1} h after infusion end)` : ""}.`);
      if (level2Datetime) lines.push(`Level #2: ${level2} mcg/mL drawn ${formatDT(level2Datetime)}${aucTiming ? ` (${aucTiming.t2} h after infusion end)` : ""}.`);
      lines.push(`AUC0-24: ${round1(aucResult.auc24)} mg*h/L (target 200-300)`);
      lines.push(`Estimated trough at current interval: ${round1(aucResult.troughSs)} mcg/mL (preferred <5)`);
      lines.push(`Suggested same-interval dose for AUC ~250: ${aucResult.suggestedPerDose} mg q${aucInterval}h`);
    }
    if (nomogramResult) {
      if (doseStartDatetime) lines.push(`Dose start: ${formatDT(doseStartDatetime)}.`);
      lines.push(`Random level: ${randomLevel} mcg/mL drawn ${randomLevelDatetime ? formatDT(randomLevelDatetime) : ""}${randomHour !== null ? ` (${randomHour} h after start of infusion)` : ""}; convert by /${nomogramResult.divisor} = ${nomogramResult.converted} for nomogram plotting.`);
      lines.push(`CrCl-based initial interval: ${nomogramResult.interval}`);
    }
    if (tradResult) {
      if (tradPeakDatetime) lines.push(`Peak: ${tradPeak} mcg/mL drawn ${formatDT(tradPeakDatetime)}.`);
      if (tradTroughDatetime) lines.push(`Trough/later level: ${tradTrough} mcg/mL drawn ${formatDT(tradTroughDatetime)}${tradDelta !== null ? ` (${tradDelta} h after peak)` : ""}.`);
      lines.push(`Calculated half-life: ${round1(tradResult.halfLife)} h; target peak ${tradResult.target.peak}, trough ${tradResult.target.trough}.`);
      if (tradResult.hoursToSafeTrough > 0) lines.push(`Estimated time to trough near goal: ${Math.ceil(tradResult.hoursToSafeTrough)} h.`);
    }
    if (method === "ntm") lines.push(`NTM target: peak ${ntmTargets.peak}; trough ${ntmTargets.trough}.`);
    lines.push("Monitor: SCr/urine output, hearing, vestibular symptoms; reassess need daily.");
    return lines.join("\n");
  }, [aucInterval, aucResult, aucTiming, doseStartDatetime, infusionHours, initialDose, level1, level1Datetime, level2, level2Datetime, method, nomogramResult, nomogramType, ntmTargets.peak, ntmTargets.trough, patient, randomHour, randomLevel, randomLevelDatetime, tradDelta, tradPeak, tradPeakDatetime, tradResult, tradTrough, tradTroughDatetime]);

  const copyNote = async () => {
    await navigator.clipboard.writeText(note);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div style={S.header}>
        <div style={S.title}>Amikacin TDM</div>
        <div style={S.subtitle}>AUC、Stanford nomogram、traditional peak/trough 與 NTM dosing</div>
      </div>

      <div style={S.section}>
        <div style={S.sectionTitle}>方法</div>
        <select style={S.select} value={method} onChange={(e) => setMethod(e.target.value as Method)}>
          <option value="auc">IDSA 2026 AUC 目標</option>
          <option value="nomogram">Stanford nomogram</option>
          <option value="traditional">Traditional peak / trough</option>
          <option value="ntm">NTM dosing / TDM</option>
        </select>
      </div>

      <MonitoringMethodGuide />

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
          {patient.ibw && <span>IBW {patient.ibw} kg{patient.bmi ? ` · BMI ${patient.bmi}` : ""}</span>}
          {patient.crcl !== null && <span>CrCl {patient.crcl} mL/min</span>}
        </div>
      </div>

      {initialDose && (
        <InfoCard tone="blue" title={initialDose.title}>
          <Row label="初始建議" value={initialDose.dose} highlight />
          <div style={S.muted}>{initialDose.detail}</div>
        </InfoCard>
      )}

      {method === "auc" && (
        <div style={S.section}>
          <div style={S.sectionTitle}>AUC 計算</div>
          <div style={S.grid2}>
            <Input label="目前/首劑 dose" value={aucDose} onChange={setAucDose} suffix="mg" />
            <Input label="給藥間隔" value={aucInterval} onChange={setAucInterval} suffix="hr" />
            <Input label="輸注時間" value={infusionHours} onChange={setInfusionHours} suffix="hr" />
            <DateTimeInput label="給藥開始時間" value={doseStartDatetime} onChange={setDoseStartDatetime} />
            <Input label="Level 1" value={level1} onChange={setLevel1} suffix="mcg/mL" />
            <DateTimeInput label="Level 1 抽血時間" value={level1Datetime} onChange={setLevel1Datetime} />
            <Input label="Level 2" value={level2} onChange={setLevel2} suffix="mcg/mL" />
            <DateTimeInput label="Level 2 抽血時間" value={level2Datetime} onChange={setLevel2Datetime} />
          </div>
          {aucTiming && (
            <div style={S.timingBox}>
              Level 1：infusion end 後 {aucTiming.t1} hr；Level 2：infusion end 後 {aucTiming.t2} hr
            </div>
          )}
          <div style={S.helpText}>建議使用分布完成後的兩點濃度；Level 2 需晚於 Level 1，且濃度較低。</div>
        </div>
      )}

      {method === "auc" && aucResult && (
        <InfoCard tone={aucResult.tone as "green" | "amber" | "red"} title="AUC 判讀">
          <Row label="AUC0-24" value={`${round1(aucResult.auc24)} mg*h/L（目標 200-300）`} highlight />
          <Row label="Ke / 半衰期" value={`${round2(aucResult.ke)} hr^-1 / ${round1(aucResult.halfLife)} hr`} />
          <Row label="Vd / CL" value={`${round2(aucResult.vd)} L / ${round2(aucResult.cl)} L/hr`} />
          <Row label="預估 steady-state trough" value={`${round1(aucResult.troughSs)} mcg/mL（建議 <5）`} />
          <Row label="同間隔建議劑量" value={`${aucResult.suggestedPerDose} mg q${aucInterval}h（以 AUC 約 250 反推）`} highlight />
          {aucResult.auc24 > 300 && <Warning text="AUC >300 的安全性資料有限，IDSA 2026 不建議 routine 追求此暴露量；建議降劑量或延長間隔並複測。" />}
          {aucResult.troughSs >= 5 && <Warning text="預估 trough ≥5 mcg/mL，腎毒性/耳毒性風險增加；若療程 <72 小時或資源有限，IDSA 2026 可接受以 trough <5 作主要監測目標。" />}
        </InfoCard>
      )}

      {method === "nomogram" && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Stanford nomogram</div>
          <select style={S.select} value={nomogramType} onChange={(e) => setNomogramType(e.target.value as NomogramType)}>
            <option value="hartford">Hartford：amikacin level / 2 後畫圖</option>
            <option value="urban">Urban/Craig：amikacin level / 3 後畫圖</option>
          </select>
          <div style={{ ...S.grid2, marginTop: 12 }}>
            <DateTimeInput label="首劑開始輸注時間" value={doseStartDatetime} onChange={setDoseStartDatetime} />
            <Input label="Random level" value={randomLevel} onChange={setRandomLevel} suffix="mcg/mL" />
            <DateTimeInput label="Random level 抽血時間" value={randomLevelDatetime} onChange={setRandomLevelDatetime} />
          </div>
          {randomHour !== null && <div style={S.timingBox}>Random level：開始輸注後 {randomHour} hr</div>}
          <div style={S.helpText}>此頁做 amikacin 專用轉換與 CrCl 起始間隔；正式判讀仍需對照 Stanford 原 nomogram 的分界線。</div>
          <div style={S.nomogramBox}>
            <div style={S.nomogramHeader}>
              {nomogramType === "hartford" ? "Hartford nomogram" : "Urban/Craig nomogram"}
            </div>
            <img
              src={nomogramImagePath(nomogramType)}
              alt={nomogramType === "hartford" ? "Hartford nomogram" : "Urban and Craig nomogram"}
              style={S.nomogramImage}
            />
            <div style={S.helpText}>
              圖為 gentamicin/tobramycin nomogram；amikacin 15 mg/kg 須先換算後畫圖：
              {nomogramType === "hartford" ? " Hartford 將 amikacin level / 2。" : " Urban/Craig 將 amikacin level / 3。"}
            </div>
          </div>
          {nomogramResult && (
            <div style={{ marginTop: 12 }}>
              <Row label="轉換後濃度" value={`${nomogramResult.converted} mcg/mL（原始 level / ${nomogramResult.divisor}）`} highlight />
              <Row label="CrCl 起始間隔" value={nomogramResult.interval} />
              {nomogramResult.warning && <Warning text={nomogramResult.warning} />}
            </div>
          )}
        </div>
      )}

      {method === "traditional" && (
        <div style={S.section}>
          <div style={S.sectionTitle}>Traditional peak / trough</div>
          <select style={S.select} value={tradTarget} onChange={(e) => setTradTarget(e.target.value as TraditionalTarget)}>
            <option value="lifeThreatening">Life-threatening GNR：peak 25-30</option>
            <option value="serious">Serious GNR：peak 20-25</option>
            <option value="uti">UTI：peak 15-20</option>
            <option value="cf">Cystic fibrosis：peak 40-60</option>
          </select>
          <div style={{ ...S.grid2, marginTop: 12 }}>
            <Input label="Peak" value={tradPeak} onChange={setTradPeak} suffix="mcg/mL" />
            <DateTimeInput label="Peak 抽血時間" value={tradPeakDatetime} onChange={setTradPeakDatetime} />
            <Input label="Trough / later level" value={tradTrough} onChange={setTradTrough} suffix="mcg/mL" />
            <DateTimeInput label="Trough / later level 抽血時間" value={tradTroughDatetime} onChange={setTradTroughDatetime} />
          </div>
          {tradDelta !== null && <div style={S.timingBox}>兩濃度間隔：{tradDelta} hr</div>}
          <div style={S.helpText}>Peak 通常於輸注結束後 30 分鐘抽；若抽血時間不同，請以實際兩點濃度間隔估算半衰期。</div>
          <div style={{ marginTop: 12 }}>
            <Row label="目標 peak" value={targetText(tradTarget).peak} highlight />
            <Row label="目標 trough" value={targetText(tradTarget).trough} />
            {tradResult && (
              <>
                <Row label="Ke / 半衰期" value={`${round2(tradResult.ke)} hr^-1 / ${round1(tradResult.halfLife)} hr`} />
                {tradResult.hoursToSafeTrough > 0 && <Row label="降到 trough 目標約需" value={`${Math.ceil(tradResult.hoursToSafeTrough)} hr`} highlight />}
              </>
            )}
          </div>
        </div>
      )}

      {method === "ntm" && (
        <div style={S.section}>
          <div style={S.sectionTitle}>NTM dosing / TDM</div>
          <select style={S.select} value={ntmSchedule} onChange={(e) => setNtmSchedule(e.target.value as NtmSchedule)}>
            <option value="daily">Daily dosing</option>
            <option value="tiw">Three-times-weekly dosing</option>
          </select>
          <div style={{ marginTop: 12 }}>
            <Row label="NTM 建議劑量" value={ntmDoseText(ntmSchedule, patient.age, patient.dosingWeight, patient.crcl)} highlight />
            <Row label="Peak 目標" value={ntmTargets.peak} />
            <Row label="Trough 目標" value={ntmTargets.trough} />
          </div>
          <Warning text="年齡 >50 歲、腎功能差、療程長或合併 ototoxic/nephrotoxic drugs 時，建議用較保守劑量與較長間隔，並更密集監測聽力、前庭症狀與 SCr。" />
        </div>
      )}

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

function InfoCard({ tone, title, children }: { tone: "green" | "blue" | "amber" | "red"; title: string; children: ReactNode }) {
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
          <h3 style={S.refHeading}>IDSA 2026 AMR GNB</h3>
          <p>Main guidance Table 1 建議 amikacin：uUTI 15 mg/kg IV x1；cUTI 15 mg/kg IV once，後續劑量與間隔依 pharmacokinetic evaluation 調整。Supplemental material 則補充 multi-dose TDM 目標 AUC0-24 200-300 mg*h/L。</p>
          <p>若 AUC 監測不可行，較次選但可接受的方式是 peak ≥40 mcg/mL 且 trough &lt;5 mcg/mL，或使用 nomogram。若療程預期 &lt;72 小時或 TDM 資源有限，可把 trough &lt;5 mcg/mL 當主要安全目標。</p>
          <p>UTI 以外：IDSA 2026 沒有提供 systemic amikacin 用於肺炎的建議劑量或 AUC 目標。DTR Pseudomonas 肺炎段落偏好 newer β-lactam（如 ceftolozane/tazobactam）；nebulized amikacin/aminoglycoside 也不建議 routine 使用，只有在沒有可用 newer β-lactam 且 systemic therapy 反應不佳時才可能 selective adjunctive use。</p>

          <h3 style={S.refHeading}>Stanford nomogram</h3>
          <p>Amikacin extended-interval 常用 15 mg/kg。Hartford nomogram 將 amikacin random level 除以 2 後畫圖；Urban/Craig 則除以 3。兩者皆建議首劑後 8-12 小時抽 random level。</p>

          <h3 style={S.refHeading}>NTM / ATS-IDSA</h3>
          <p>2020 ATS/ERS/ESCMID/IDSA NTM guideline 提到 amikacin 或 streptomycin 治療期間，可考慮 TDM 以降低耳毒性與腎毒性風險。Stanford guide 對 NTM 常用 10-15 mg/kg Q24H 或 10-25 mg/kg TIW；年齡 &gt;50 歲常用 10 mg/kg，max 500 mg/dose。</p>

          <h3 style={S.refHeading}>體重與監測</h3>
          <p>Amikacin 屬 aminoglycoside，偏水溶性，脂肪組織分布有限，但不是直接用 IBW 算所有病人。體重規則：若 TBW &lt; IBW，用實際體重；若 TBW 未達 125% IBW，用實際體重；若 TBW ≥125% IBW，IDSA 2026 supplemental material 與 Stanford guide 建議用 adjusted body weight。</p>
          <p>AdjBW = IBW + 0.4 × (TBW - IBW)。監測包含 SCr、尿量、聽力、耳鳴、眩暈/平衡感與其他 nephrotoxin。</p>
        </div>
      )}
    </div>
  );
}

function MonitoringMethodGuide() {
  return (
    <div style={S.section}>
      <div style={S.sectionTitle}>監測方式怎麼選</div>
      <div style={S.methodGrid}>
        <MethodTile
          title="AUC"
          badge="IDSA 2026 preferred"
          body="適合 AMR GNB 的 cUTI 多劑治療，且院內能及時抽兩點濃度、回報並調整劑量時。目標 AUC0-24 200-300 mg*h/L；IDSA 2026 未提供肺炎的 systemic amikacin AUC dosing 建議。"
        />
        <MethodTile
          title="Nomogram"
          badge="Random level"
          body="適合 extended-interval aminoglycoside、腎功能相對穩定、首劑後 8-12 小時可抽 random level 的 GNR 感染。CrCl 低、RRT 或腎功能快速變動時不適合。"
        />
        <MethodTile
          title="Peak / trough"
          badge="個別化"
          body="適合 traditional dosing、腎功能不穩、CrCl 低、RRT、特殊族群，或肺炎等 UTI 以外情境需要用 peak 目標調整療效、trough 目標控制毒性的病人。"
        />
        <MethodTile
          title="Trough only"
          badge="安全監測"
          body="若療程預期 <72 小時、AUC 太耗資源或只能先顧安全性，可先以 trough <5 mcg/mL 作為主要安全目標。"
        />
        <MethodTile
          title="NTM"
          badge="長療程"
          body="NTM 療程較長，通常需要 peak/trough、SCr、聽力與前庭毒性追蹤；高齡或腎功能差時劑量與間隔要更保守。"
        />
      </div>
    </div>
  );
}

function MethodTile({ title, badge, body }: { title: string; badge: string; body: string }) {
  return (
    <div style={S.methodTile}>
      <div style={S.methodTileHeader}>
        <span style={S.methodTitle}>{title}</span>
        <span style={S.methodBadge}>{badge}</span>
      </div>
      <div style={S.methodBody}>{body}</div>
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
  select: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", boxSizing: "border-box" },
  dateTimeInput: { width: "100%", minHeight: 46, padding: "10px 12px", borderRadius: 12, border: "1.5px solid #DDE5F0", fontSize: 15, fontWeight: 600, color: "#0F172A", background: "#fff", outline: "none", boxSizing: "border-box", boxShadow: "0 1px 0 rgba(15,23,42,0.02)" },
  inputWrap: { display: "flex", alignItems: "center", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", overflow: "hidden" },
  input: { flex: 1, minWidth: 0, padding: "10px 12px", border: "none", fontSize: 15, color: "#0F172A", background: "#fff", outline: "none", boxSizing: "border-box", width: "100%" },
  suffix: { padding: "0 10px", color: "#64748B", fontSize: 12, whiteSpace: "nowrap" },
  checkboxRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, color: "#475569" },
  patientBox: { display: "flex", flexDirection: "column", gap: 4, background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", color: "#475569", fontSize: 13, marginTop: 12 },
  cardTitle: { fontWeight: 800, fontSize: 16, marginBottom: 10 },
  row: { display: "grid", gridTemplateColumns: "minmax(110px, 0.8fr) minmax(0, 1.3fr)", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(148,163,184,0.25)", alignItems: "start" },
  rowHighlight: { fontWeight: 800 },
  rowLabel: { color: "#64748B", fontSize: 13, fontWeight: 700 },
  rowValue: { color: "#0F172A", fontSize: 14, lineHeight: 1.5, wordBreak: "break-word" },
  muted: { color: "#475569", fontSize: 13, lineHeight: 1.55, marginTop: 8 },
  helpText: { color: "#64748B", fontSize: 12, lineHeight: 1.5, marginTop: 8 },
  timingBox: { background: "#F0FDFA", border: "1px solid #99F6E4", color: "#115E59", borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.55, marginTop: 12 },
  warning: { background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.5, marginTop: 10 },
  note: { whiteSpace: "pre-wrap", background: "#0F172A", color: "#E2E8F0", borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.55, overflowX: "auto" },
  copyBtn: { width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 10, border: "none", background: ACCENT, color: "#fff", fontWeight: 800, cursor: "pointer" },
  accordionBtn: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", border: "none", background: "transparent", padding: 0, fontSize: 16, color: "#0F172A", fontWeight: 800, cursor: "pointer" },
  refBody: { marginTop: 12, color: "#334155", fontSize: 13, lineHeight: 1.65 },
  refHeading: { fontSize: 14, color: "#0F172A", margin: "14px 0 6px", fontWeight: 800 },
  nomogramBox: { marginTop: 12, padding: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10 },
  nomogramHeader: { fontSize: 14, fontWeight: 800, color: "#0F172A", marginBottom: 8 },
  nomogramImage: { display: "block", width: "100%", maxWidth: 760, margin: "0 auto", borderRadius: 8, border: "1px solid #CBD5E1", background: "#fff" },
  methodGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 },
  methodTile: { border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, background: "#F8FAFC" },
  methodTileHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 },
  methodTitle: { fontWeight: 800, color: "#0F172A", fontSize: 14 },
  methodBadge: { fontSize: 11, fontWeight: 800, color: "#0F766E", background: "#CCFBF1", borderRadius: 999, padding: "3px 7px", whiteSpace: "nowrap" },
  methodBody: { fontSize: 13, lineHeight: 1.55, color: "#475569" },
};
