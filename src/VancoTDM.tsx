import { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
// Vancomycin TDM 計算器
// Phase 1：初始劑量推薦（population PK）
// Phase 2：Bayesian MAP estimation（個人化 PK）
// ═══════════════════════════════════════════════════════════════

// ── Types ────────────────────────────────────────────────────
type PKModelDef = {
  name: string; desc: string;
  getCL: (crcl: number, tbw: number, ht: number) => number;
  getV: (tbw: number) => number;
  omegaCL2: number; omegaV2: number; sigma2: number;
};
type DoseHistory = {
  hasLD: boolean; ldDose: string; ldDatetime: string;
  mdDose: string; mdInterval: string; mdInfusion: string;
  mdStartDatetime: string; mdCount: string;
};
type DrugLevel = { conc: string; datetime: string };
type DoseOption = {
  dose: number; interval: number; infusion: number;
  peak: number; trough: number; auc24: number;
  dailyDose: number; inRange: boolean;
};

// ── BSA (DuBois) ────────────────────────────────────────────
function calcBSA(tbw: number, ht: number): number {
  return 0.007184 * Math.pow(ht, 0.725) * Math.pow(tbw, 0.425);
}

// ── PK Models ────────────────────────────────────────────────
const MODELS: Record<string, PKModelDef> = {
  buelga: {
    name: "Buelga 2005（一般）", desc: "適用於一般成人（血液腫瘤）",
    getCL: (crcl) => 1.08 * (crcl * 60 / 1000), getV: (tbw) => 0.98 * tbw,
    omegaCL2: 0.0793, omegaV2: 0.138, sigma2: 0.04,
  },
  roberts: {
    name: "Roberts 2011（重症）", desc: "適用於 ICU 重症（CrCl BSA-normalized）",
    getCL: (crcl, tbw, ht) => {
      const bsa = calcBSA(tbw, ht);
      const crclNorm = crcl / bsa * 1.73; // mL/min/1.73m²
      return 4.58 * (crclNorm / 100);
    },
    getV: (tbw) => 1.53 * tbw,
    omegaCL2: 0.151, omegaV2: 0.140, sigma2: 0.04,
  },
};

// ── Helpers ──────────────────────────────────────────────────
function calcCrCl(age: number, tbw: number, scr: number, isFemale: boolean): number {
  return ((140 - age) * tbw) / (72 * scr) * (isFemale ? 0.85 : 1);
}
function roundTo250(mg: number): number { return Math.round(mg / 250) * 250; }
function r(n: number): number { return Math.round(n); }

// ── datetime-local → Date → 計算時間差（小時）────────────────
function dtToDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60);
}
function formatDT(s: string): string {
  const d = dtToDate(s);
  if (!d) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

// ── 1-compartment PK ────────────────────────────────────────
function concAfterInfusion(dose: number, infTime: number, CL: number, V: number, tSinceStart: number): number {
  const kel = CL / V;
  const ko = dose / infTime;
  if (tSinceStart <= 0) return 0;
  if (tSinceStart <= infTime) return (ko / CL) * (1 - Math.exp(-kel * tSinceStart));
  const cEnd = (ko / CL) * (1 - Math.exp(-kel * infTime));
  return cEnd * Math.exp(-kel * (tSinceStart - infTime));
}

function predictConc(doseEvents: { dose: number; startTime: number; infTime: number }[], CL: number, V: number, tPredict: number): number {
  let total = 0;
  for (const ev of doseEvents) {
    const tSince = tPredict - ev.startTime;
    if (tSince > 0) total += concAfterInfusion(ev.dose, ev.infTime, CL, V, tSince);
  }
  return total;
}

// ── 建立給藥事件（用小時差）────────────────────────────────
function buildDoseEvents(hist: DoseHistory, t0: Date): { dose: number; startTime: number; infTime: number }[] {
  const events: { dose: number; startTime: number; infTime: number }[] = [];
  const ldDose = parseFloat(hist.ldDose) || 0;
  const mdDose = parseFloat(hist.mdDose) || 0;
  const mdInterval = parseFloat(hist.mdInterval) || 12;
  const mdInfusion = parseFloat(hist.mdInfusion) || 1;
  const mdCount = parseInt(hist.mdCount) || 0;

  if (hist.hasLD && ldDose > 0) {
    const ldDate = dtToDate(hist.ldDatetime);
    if (ldDate) {
      const ldInf = Math.max(1, ldDose / 1000);
      events.push({ dose: ldDose, startTime: hoursBetween(t0, ldDate), infTime: ldInf });
    }
  }

  const mdStartDate = dtToDate(hist.mdStartDatetime);
  if (mdStartDate && mdDose > 0) {
    const mdStartHr = hoursBetween(t0, mdStartDate);
    for (let i = 0; i < mdCount; i++) {
      events.push({ dose: mdDose, startTime: mdStartHr + i * mdInterval, infTime: mdInfusion });
    }
  }

  return events;
}

// ── 找 T=0（所有時間中最早的）────────────────────────────
function findT0(hist: DoseHistory, lev1: DrugLevel, lev2: DrugLevel, hasLev2: boolean): Date | null {
  const candidates: Date[] = [];
  if (hist.hasLD && hist.ldDatetime) { const d = dtToDate(hist.ldDatetime); if (d) candidates.push(d); }
  if (hist.mdStartDatetime) { const d = dtToDate(hist.mdStartDatetime); if (d) candidates.push(d); }
  if (lev1.datetime) { const d = dtToDate(lev1.datetime); if (d) candidates.push(d); }
  if (hasLev2 && lev2.datetime) { const d = dtToDate(lev2.datetime); if (d) candidates.push(d); }
  if (candidates.length === 0) return null;
  return new Date(Math.min(...candidates.map(d => d.getTime())));
}

// ── Bayesian MAP ────────────────────────────────────────────
function bayesianMAP(
  CLpop: number, Vpop: number, omegaCL2: number, omegaV2: number, sigma2: number,
  doseEvents: { dose: number; startTime: number; infTime: number }[],
  levels: { conc: number; time: number }[]
): { CL: number; V: number } {
  if (levels.length === 0 || doseEvents.length === 0) return { CL: CLpop, V: Vpop };
  const lnCLpop = Math.log(CLpop);
  const lnVpop = Math.log(Vpop);

  function objective(lnCL: number, lnV: number): number {
    const cl = Math.exp(lnCL); const v = Math.exp(lnV);
    let obj = ((lnCL - lnCLpop) ** 2) / omegaCL2 + ((lnV - lnVpop) ** 2) / omegaV2;
    for (const lev of levels) {
      const cPred = predictConc(doseEvents, cl, v, lev.time);
      if (cPred <= 0) { obj += 1000; continue; }
      obj += ((Math.log(lev.conc) - Math.log(cPred)) ** 2) / sigma2;
    }
    return obj;
  }

  let bestLnCL = lnCLpop, bestLnV = lnVpop, bestObj = objective(bestLnCL, bestLnV);
  const sdCL = Math.sqrt(omegaCL2), sdV = Math.sqrt(omegaV2);

  // 3 passes: coarse → medium → fine (21×21 grid each)
  const passes = [
    { range: 3.0, steps: 20 },   // coarse: ±3 SD
    { range: 0.6, steps: 20 },   // medium: ±0.6 SD around best
    { range: 0.12, steps: 20 },  // fine: ±0.12 SD around best
  ];

  for (const { range, steps } of passes) {
    const startLnCL = bestLnCL - range * sdCL;
    const startLnV = bestLnV - range * sdV;
    const stepCL = (2 * range * sdCL) / steps;
    const stepV = (2 * range * sdV) / steps;
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        const lnCL = startLnCL + i * stepCL;
        const lnV = startLnV + j * stepV;
        const o = objective(lnCL, lnV);
        if (o < bestObj) { bestObj = o; bestLnCL = lnCL; bestLnV = lnV; }
      }
    }
  }
  return { CL: Math.exp(bestLnCL), V: Math.exp(bestLnV) };
}

// ── Steady-state PK ─────────────────────────────────────────
function calcSteadyStatePK(dose: number, interval: number, infusion: number, CL: number, V: number) {
  const kel = CL / V;
  const ko = dose / infusion;
  const peak = (ko / CL) * (1 - Math.exp(-kel * infusion)) / (1 - Math.exp(-kel * interval));
  const trough = peak * Math.exp(-kel * (interval - infusion));
  const auc24 = (dose * (24 / interval)) / CL;
  return { peak, trough, auc24, halflife: 0.693 / kel, kel };
}

// ── 劑量選項 ────────────────────────────────────────────────
function generateOptions(CL: number, V: number, targetMin: number, targetMax: number): DoseOption[] {
  const intervals = [8, 12, 24, 36, 48];
  const doses = [500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500];
  const results: DoseOption[] = [];
  for (const interval of intervals) {
    for (const dose of doses) {
      const infusion = Math.max(1, dose / 1000);
      const pk = calcSteadyStatePK(dose, interval, infusion, CL, V);
      const dailyDose = dose * (24 / interval);
      if (dailyDose > 4500) continue;
      results.push({ dose, interval, infusion, peak: pk.peak, trough: pk.trough, auc24: pk.auc24, dailyDose, inRange: pk.auc24 >= targetMin && pk.auc24 <= targetMax });
    }
  }
  results.sort((a, b) => {
    // 1. 在目標範圍內的優先
    if (a.inRange !== b.inRange) return a.inRange ? -1 : 1;
    // 2. 偏好常用頻率（Q8H > Q12H > Q24H >> Q36H > Q48H）
    const freqScore: Record<number, number> = { 8: 0, 12: 1, 24: 2, 36: 4, 48: 5 };
    const fa = freqScore[a.interval] ?? 3;
    const fb = freqScore[b.interval] ?? 3;
    if (fa !== fb) return fa - fb;
    // 3. AUC 最接近 500
    return Math.abs(a.auc24 - 500) - Math.abs(b.auc24 - 500);
  });
  return results;
}

// ── PK 曲線 ─────────────────────────────────────────────────
function generateCurveData(doseEvents: { dose: number; startTime: number; infTime: number }[], CL: number, V: number, tEnd: number): { t: number; c: number }[] {
  const points: { t: number; c: number }[] = [];
  const step = Math.max(0.25, tEnd / 300);
  for (let t = 0; t <= tEnd; t += step) points.push({ t, c: predictConc(doseEvents, CL, V, t) });
  return points;
}

// ── SVG PK Curve Component ──────────────────────────────────
function PKCurve({ curveData, levels, t0, width = 360, height = 200 }: {
  curveData: { t: number; c: number }[];
  levels: { conc: number; time: number }[];
  t0: Date | null;
  width?: number; height?: number;
}) {
  if (curveData.length === 0) return null;
  const pad = { top: 20, right: 20, bottom: 45, left: 45 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const tMax = curveData[curveData.length - 1].t;
  const cMax = Math.max(...curveData.map(d => d.c), ...levels.map(l => l.conc), 30) * 1.15;
  const xScale = (t: number) => pad.left + (t / tMax) * w;
  const yScale = (c: number) => pad.top + h - (c / cMax) * h;

  const pathD = curveData.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(d.t).toFixed(1)},${yScale(d.c).toFixed(1)}`).join(" ");

  // X ticks：用時間點標示
  const xTicks: { t: number; label: string }[] = [];
  const xStep = tMax <= 48 ? 6 : (tMax <= 96 ? 12 : 24);
  for (let t = 0; t <= tMax; t += xStep) {
    let label = `${t}h`;
    if (t0) {
      const d = new Date(t0.getTime() + t * 3600000);
      label = `${String(d.getMonth() + 1)}/${String(d.getDate())} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    xTicks.push({ t, label });
  }

  const yTicks: number[] = [];
  const yStep = cMax <= 30 ? 5 : (cMax <= 60 ? 10 : 20);
  for (let c = 0; c <= cMax; c += yStep) yTicks.push(c);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", maxWidth: width, display: "block", margin: "0 auto" }}>
      {yTicks.map(c => <line key={`yg${c}`} x1={pad.left} x2={width - pad.right} y1={yScale(c)} y2={yScale(c)} stroke="#E2E8F0" strokeWidth={0.5} />)}
      <rect x={pad.left} y={yScale(20)} width={w} height={yScale(10) - yScale(20)} fill="#D1FAE5" opacity={0.3} />
      <path d={pathD} fill="none" stroke="#0D9488" strokeWidth={2} />
      {levels.map((lev, i) => (
        <g key={i}>
          <circle cx={xScale(lev.time)} cy={yScale(lev.conc)} r={5} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
          <text x={xScale(lev.time) + 7} y={yScale(lev.conc) - 5} fontSize={9} fill="#DC2626" fontWeight={600}>{lev.conc.toFixed(1)}</text>
        </g>
      ))}
      <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + h} stroke="#94A3B8" strokeWidth={1} />
      <line x1={pad.left} x2={pad.left + w} y1={pad.top + h} y2={pad.top + h} stroke="#94A3B8" strokeWidth={1} />
      {xTicks.map((tick, i) => (
        <text key={`x${i}`} x={xScale(tick.t)} y={height - 5} textAnchor="middle" fontSize={t0 ? 7 : 9} fill="#64748B"
          transform={t0 ? `rotate(-30,${xScale(tick.t)},${height - 5})` : undefined}>{tick.label}</text>
      ))}
      {yTicks.map(c => <text key={`y${c}`} x={pad.left - 5} y={yScale(c) + 3} textAnchor="end" fontSize={9} fill="#64748B">{c}</text>)}
      <text x={12} y={pad.top + h / 2} textAnchor="middle" fontSize={9} fill="#94A3B8" transform={`rotate(-90,12,${pad.top + h / 2})`}>mcg/mL</text>
    </svg>
  );
}

// ── DateTime Input Component ────────────────────────────────
function DateTimeInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      <input type="datetime-local" value={value} onChange={e => onChange(e.target.value)}
        style={{ ...S.input, fontSize: 13 }} placeholder={placeholder} />
    </div>
  );
}

// ── TDM Note Component ──────────────────────────────────────
function TDMNote({ mode, currentDose, currentInterval, currentPK, best, activeCL, activeV, halflife,
  crcl, tbw, scr, age, isFemale, modelName, targetMin, targetMax, ldMg,
  level1Conc, level1Time, level2Conc, level2Time,
}: {
  mode: string; currentDose: number; currentInterval: number;
  currentPK: { peak: number; trough: number; auc24: number } | null;
  best: DoseOption | null; activeCL: number; activeV: number; halflife: number;
  crcl: number; tbw: number; scr: number; age: number; isFemale: boolean;
  modelName: string; targetMin: number; targetMax: number; ldMg: number;
  level1Conc: number; level1Time: string; level2Conc: number; level2Time: string;
}) {
  const [copied, setCopied] = useState(false);
  const [tdmMethod, setTdmMethod] = useState<"auc" | "trough">("auc");

  if (!best) return null;

  // Trough targets
  const troughMin = 10;
  const troughMax = 20;

  // ── Build note text ──
  const lines: string[] = [];

  lines.push("=== Vancomycin TDM Note ===");
  lines.push("");
  lines.push(`Patient: ${r(age)}y/${isFemale ? "F" : "M"}, ${r(tbw)} kg, Scr ${scr} mg/dL, CrCl ${r(crcl)} mL/min (CG)`);
  lines.push(`PK Model: ${modelName}`);

  if (tdmMethod === "auc") {
    lines.push(`Monitoring method: AUC-guided dosing`);
    lines.push(`Target AUC24/MIC: ${targetMin}-${targetMax} (MIC = 1 mcg/mL)`);
  } else {
    lines.push(`Monitoring method: Trough-guided dosing`);
    lines.push(`Target trough: ${troughMin}-${troughMax} mcg/mL`);
  }
  lines.push("");

  if (mode === "bayesian" && currentPK && currentDose > 0) {
    // ── Bayesian mode ──
    lines.push("--- Current Regimen ---");
    lines.push(`Vancomycin ${currentDose} mg IV Q${currentInterval}H`);

    if (level1Conc > 0) {
      lines.push("");
      lines.push("--- Measured Levels ---");
      lines.push(`Level #1: ${level1Conc} mcg/mL (drawn ${level1Time})`);
      if (level2Conc > 0) {
        lines.push(`Level #2: ${level2Conc} mcg/mL (drawn ${level2Time})`);
      }
    }

    lines.push("");
    lines.push("--- Bayesian PK Estimates ---");
    lines.push(`CL: ${activeCL.toFixed(2)} L/h | Vd: ${activeV.toFixed(1)} L (${(activeV / tbw).toFixed(2)} L/kg) | t1/2: ${halflife.toFixed(1)} h`);
    lines.push(`Estimated AUC24/MIC: ${r(currentPK.auc24)} mcg*h/mL`);
    lines.push(`Estimated Css,peak: ${currentPK.peak.toFixed(1)} mcg/mL | Css,trough: ${currentPK.trough.toFixed(1)} mcg/mL`);

    lines.push("");
    lines.push("--- Assessment & Recommendation ---");

    if (tdmMethod === "auc") {
      // ── AUC-guided assessment ──
      const curAUC = currentPK.auc24;
      if (curAUC >= targetMin && curAUC <= targetMax) {
        lines.push(`AUC24/MIC ${r(curAUC)} is WITHIN target range (${targetMin}-${targetMax}).`);
        lines.push(`Estimated trough: ${currentPK.trough.toFixed(1)} mcg/mL.`);
        lines.push("");
        lines.push(`>> Keep current dose: Vancomycin ${currentDose} mg IV Q${currentInterval}H.`);
        lines.push(`   Estimated steady-state AUC24/MIC: ${r(curAUC)}, trough: ${currentPK.trough.toFixed(1)} mcg/mL.`);
      } else if (curAUC > targetMax) {
        lines.push(`AUC24/MIC ${r(curAUC)} is ABOVE target range (${targetMin}-${targetMax}).`);
        lines.push(`Estimated trough: ${currentPK.trough.toFixed(1)} mcg/mL.`);
        lines.push(`Risk of nephrotoxicity. Dose reduction recommended.`);
        lines.push("");

        // Hold dose calculation if trough is significantly elevated
        const curTr = currentPK.trough;
        const targetTr = 15; // target trough to resume
        if (curTr > 25 && halflife > 0) {
          const holdHours = halflife * Math.log(curTr / targetTr) / Math.log(2);
          const holdDoses = Math.ceil(holdHours / currentInterval);
          lines.push(`>> HOLD vancomycin for approximately ${r(holdHours)} hours (~${holdDoses} dose(s)).`);
          lines.push(`   Rationale: Estimated trough ${curTr.toFixed(1)} mcg/mL, half-life ${halflife.toFixed(1)} hr.`);
          lines.push(`   Expected trough after holding ~${r(holdHours)} hr: ~${targetTr} mcg/mL.`);
          lines.push(`   Recheck vancomycin level before resuming.`);
          lines.push("");
        }

        lines.push(`>> Suggest adjusting Vancomycin to ${best.dose} mg IV Q${best.interval}H.`);
        lines.push(`   Expected AUC24/MIC: ${r(best.auc24)}, peak: ${best.peak.toFixed(1)}, trough: ${best.trough.toFixed(1)} mcg/mL.`);
        lines.push(`   Daily dose: ${best.dailyDose} mg/day.`);
      } else {
        lines.push(`AUC24/MIC ${r(curAUC)} is BELOW target range (${targetMin}-${targetMax}).`);
        lines.push(`Estimated trough: ${currentPK.trough.toFixed(1)} mcg/mL.`);
        lines.push(`Subtherapeutic. Dose increase recommended.`);
        lines.push("");
        lines.push(`>> Suggest adjusting Vancomycin to ${best.dose} mg IV Q${best.interval}H.`);
        lines.push(`   Expected AUC24/MIC: ${r(best.auc24)}, peak: ${best.peak.toFixed(1)}, trough: ${best.trough.toFixed(1)} mcg/mL.`);
        lines.push(`   Daily dose: ${best.dailyDose} mg/day.`);
      }
    } else {
      // ── Trough-guided assessment ──
      const curTrough = currentPK.trough;
      if (curTrough >= troughMin && curTrough <= troughMax) {
        lines.push(`Estimated trough: ${curTrough.toFixed(1)} mcg/mL is WITHIN target range (${troughMin}-${troughMax} mcg/mL).`);
        lines.push(`Estimated AUC24/MIC: ${r(currentPK.auc24)} (for reference).`);
        lines.push("");
        lines.push(`>> Keep current dose: Vancomycin ${currentDose} mg IV Q${currentInterval}H.`);
        lines.push(`   Estimated steady-state trough: ${curTrough.toFixed(1)} mcg/mL, AUC24/MIC: ${r(currentPK.auc24)}.`);
      } else if (curTrough > troughMax) {
        lines.push(`Estimated trough: ${curTrough.toFixed(1)} mcg/mL is ABOVE target range (${troughMin}-${troughMax} mcg/mL).`);
        lines.push(`Estimated AUC24/MIC: ${r(currentPK.auc24)} (for reference).`);
        lines.push(`Risk of nephrotoxicity. Dose reduction recommended.`);
        lines.push("");

        // Hold dose calculation if trough is significantly elevated
        const targetTr = 15; // midpoint of 10-20 range
        if (curTrough > 25 && halflife > 0) {
          const holdHours = halflife * Math.log(curTrough / targetTr) / Math.log(2);
          const holdDoses = Math.ceil(holdHours / currentInterval);
          lines.push(`>> HOLD vancomycin for approximately ${r(holdHours)} hours (~${holdDoses} dose(s)).`);
          lines.push(`   Rationale: Estimated trough ${curTrough.toFixed(1)} mcg/mL, half-life ${halflife.toFixed(1)} hr.`);
          lines.push(`   Expected trough after holding ~${r(holdHours)} hr: ~${targetTr} mcg/mL.`);
          lines.push(`   Recheck vancomycin level before resuming.`);
          lines.push("");
        }

        lines.push(`>> Suggest adjusting Vancomycin to ${best.dose} mg IV Q${best.interval}H.`);
        lines.push(`   Expected trough: ${best.trough.toFixed(1)} mcg/mL, AUC24/MIC: ${r(best.auc24)}.`);
        lines.push(`   Daily dose: ${best.dailyDose} mg/day.`);
      } else {
        lines.push(`Estimated trough: ${curTrough.toFixed(1)} mcg/mL is BELOW target range (${troughMin}-${troughMax} mcg/mL).`);
        lines.push(`Estimated AUC24/MIC: ${r(currentPK.auc24)} (for reference).`);
        lines.push(`Subtherapeutic. Dose increase recommended.`);
        lines.push("");
        lines.push(`>> Suggest adjusting Vancomycin to ${best.dose} mg IV Q${best.interval}H.`);
        lines.push(`   Expected trough: ${best.trough.toFixed(1)} mcg/mL, AUC24/MIC: ${r(best.auc24)}.`);
        lines.push(`   Daily dose: ${best.dailyDose} mg/day.`);
      }
    }

    lines.push("");
    lines.push("Recommend repeat vancomycin level in 24-48 hours after dose adjustment.");

  } else {
    // ── Initial dose mode ──
    lines.push("--- Initial Dose Recommendation ---");
    lines.push(`Loading dose: ${ldMg} mg IV (infuse over ${Math.max(1, ldMg / 1000)} hr)`);
    lines.push(`Maintenance dose: ${best.dose} mg IV Q${best.interval}H (infuse over ${best.infusion} hr)`);
    lines.push(`Daily dose: ${best.dailyDose} mg/day`);
    lines.push("");
    lines.push("--- Expected Steady-State PK ---");
    lines.push(`AUC24/MIC: ${r(best.auc24)} mcg*h/mL ${best.inRange ? "(within target)" : "(outside target)"}`);
    lines.push(`Css,peak: ${best.peak.toFixed(1)} mcg/mL | Css,trough: ${best.trough.toFixed(1)} mcg/mL`);
    lines.push("");
    if (tdmMethod === "trough") {
      lines.push(`Recommend vancomycin trough level before 4th dose (target: ${troughMin}-${troughMax} mcg/mL).`);
    } else {
      lines.push("Recommend vancomycin AUC monitoring within 24-48h (target AUC24/MIC: 400-600).");
    }
  }

  lines.push("");
  lines.push(`PK parameters: CL ${activeCL.toFixed(2)} L/h, Vd ${activeV.toFixed(1)} L, t1/2 ${halflife.toFixed(1)} h`);
  lines.push(`Infusion rate should not exceed 10-15 mg/min to avoid Red Man Syndrome.`);
  lines.push("");
  lines.push(`Calculated by Vancomycin TDM Calculator (${mode === "bayesian" ? "Bayesian MAP" : "Population PK"}, 1-compartment model).`);
  lines.push(`References: Buelga et al. AAC 2005;49:4934 / Roberts et al. AAC 2011;55:3208`);

  const noteText = lines.join("\n");

  function handleCopy() {
    navigator.clipboard.writeText(noteText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      {/* TDM Method Toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {([["auc", "AUC-guided（AUC 400-600）"], ["trough", "Trough-guided（Trough 10-20）"]] as const).map(([m, label]) => (
          <button key={m} onClick={() => setTdmMethod(m)}
            style={{ ...S.toggleBtn, fontSize: 11, padding: "8px 4px", ...(tdmMethod === m ? S.toggleBtnActive : {}) }}>
            {label}
          </button>
        ))}
      </div>

      <pre style={{
        background: "#1E293B", color: "#E2E8F0", padding: 14, borderRadius: 8,
        fontSize: 11, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
        maxHeight: 400, overflowY: "auto",
      }}>
        {noteText}
      </pre>
      <button onClick={handleCopy} style={{
        width: "100%", marginTop: 8, padding: "12px 0", borderRadius: 8,
        border: "none", background: copied ? "#059669" : "#0D9488",
        color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
        transition: "background 0.2s",
      }}>
        {copied ? "✅ 已複製到剪貼簿" : "📋 複製 TDM Note"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════
export default function VancoTDM() {
  const [tbw, setTbw] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [scr, setScr] = useState("");
  const [crclMode, setCrclMode] = useState<"auto" | "direct">("auto");
  const [directCrcl, setDirectCrcl] = useState("");
  const [modelKey, setModelKey] = useState("buelga");
  const [targetMin, setTargetMin] = useState("400");
  const [targetMax, setTargetMax] = useState("600");
  const [mode, setMode] = useState<"initial" | "bayesian">("initial");

  const [doseHist, setDoseHist] = useState<DoseHistory>({
    hasLD: false, ldDose: "", ldDatetime: "",
    mdDose: "1000", mdInterval: "12", mdInfusion: "1", mdStartDatetime: "", mdCount: "3",
  });
  const [level1, setLevel1] = useState<DrugLevel>({ conc: "", datetime: "" });
  const [level2, setLevel2] = useState<DrugLevel>({ conc: "", datetime: "" });
  const [hasLevel2, setHasLevel2] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const w = parseFloat(tbw) || 0;
  const ht = parseFloat(height) || 0;
  const ag = parseFloat(age) || 0;
  const sc = parseFloat(scr) || 0;
  const isFemale = gender === "female";
  const bmi = (w > 0 && ht > 0) ? w / ((ht / 100) ** 2) : 0;

  // IBW
  const ibw = (w > 0 && ht > 0) ? (isFemale ? 45.5 + 0.91 * (ht - 152.4) : 50 + 0.91 * (ht - 152.4)) : 0;
  // AdjBW
  const adjBw = ibw > 0 ? ibw + 0.4 * (w - ibw) : w;

  // CrCl：自動或直接輸入
  const crclWeight = (bmi >= 30 && adjBw > 0) ? adjBw : w;
  const crcl = crclMode === "direct"
    ? (parseFloat(directCrcl) || 0)
    : ((crclWeight > 0 && ag > 0 && sc > 0) ? calcCrCl(ag, crclWeight, sc, isFemale) : 0);

  const model = MODELS[modelKey];
  const CLpop = crcl > 0 ? model.getCL(crcl, w, ht) : 0;
  const Vpop = w > 0 ? model.getV(w) : 0;
  const canCalcBasic = crclMode === "direct"
    ? (w > 0 && ht > 0 && parseFloat(directCrcl) > 0)
    : (w > 0 && ag > 0 && sc > 0 && ht > 0);

  // ── Bayesian ──
  const t0 = useMemo(() => findT0(doseHist, level1, level2, hasLevel2), [doseHist, level1, level2, hasLevel2]);

  const bayesResult = useMemo(() => {
    if (mode !== "bayesian" || !canCalcBasic || CLpop <= 0 || Vpop <= 0 || !t0) return null;

    const doseEvents = buildDoseEvents(doseHist, t0);
    if (doseEvents.length === 0) return null;

    const levels: { conc: number; time: number }[] = [];
    const c1 = parseFloat(level1.conc);
    const d1 = dtToDate(level1.datetime);
    if (c1 > 0 && d1) levels.push({ conc: c1, time: hoursBetween(t0, d1) });
    const c2 = parseFloat(level2.conc);
    const d2 = dtToDate(level2.datetime);
    if (hasLevel2 && c2 > 0 && d2) levels.push({ conc: c2, time: hoursBetween(t0, d2) });

    if (levels.length === 0) return null;

    const { CL, V } = bayesianMAP(CLpop, Vpop, model.omegaCL2, model.omegaV2, model.sigma2, doseEvents, levels);
    const mdDose = parseFloat(doseHist.mdDose) || 1000;
    const mdInterval = parseFloat(doseHist.mdInterval) || 12;
    const mdInfusion = parseFloat(doseHist.mdInfusion) || 1;
    const currentPK = calcSteadyStatePK(mdDose, mdInterval, mdInfusion, CL, V);
    const lastEvent = doseEvents[doseEvents.length - 1];
    const tEnd = lastEvent.startTime + lastEvent.infTime + mdInterval * 2;
    const curveData = generateCurveData(doseEvents, CL, V, tEnd);

    return { CL, V, currentPK, curveData, doseEvents, levels };
  }, [mode, canCalcBasic, CLpop, Vpop, modelKey, doseHist, level1, level2, hasLevel2, showResults, t0]);

  const activeCL = bayesResult ? bayesResult.CL : CLpop;
  const activeV = bayesResult ? bayesResult.V : Vpop;
  const tMin = parseFloat(targetMin) || 400;
  const tMax = parseFloat(targetMax) || 600;
  const options = (canCalcBasic && activeCL > 0) ? generateOptions(activeCL, activeV, tMin, tMax) : [];
  const best = options.length > 0 ? options[0] : null;

  const ldMgPerKg = crcl >= 130 ? 30 : (crcl >= 50 ? 25 : 22.5);
  const ldMg = Math.min(roundTo250(ldMgPerKg * w), 3000);

  function handleCalc() { if (canCalcBasic) setShowResults(true); }
  function handleReset() {
    setShowResults(false);
    setTbw(""); setHeight(""); setAge(""); setScr(""); setGender("male");
    setCrclMode("auto"); setDirectCrcl("");
    setModelKey("buelga"); setTargetMin("400"); setTargetMax("600"); setMode("initial");
    setDoseHist({ hasLD: false, ldDose: "", ldDatetime: "", mdDose: "1000", mdInterval: "12", mdInfusion: "1", mdStartDatetime: "", mdCount: "3" });
    setLevel1({ conc: "", datetime: "" }); setLevel2({ conc: "", datetime: "" }); setHasLevel2(false);
  }
  function updateHist(key: keyof DoseHistory, val: string | boolean) {
    setDoseHist(prev => ({ ...prev, [key]: val })); setShowResults(false);
  }

  // ── 時間摘要（Bayesian 模式顯示）──
  const timeSummary = useMemo(() => {
    if (!t0) return null;
    const items: { label: string; dt: string; hr: string }[] = [];
    if (doseHist.hasLD && doseHist.ldDatetime) {
      const d = dtToDate(doseHist.ldDatetime);
      if (d) items.push({ label: "LD", dt: formatDT(doseHist.ldDatetime), hr: `T=${hoursBetween(t0, d).toFixed(1)}h` });
    }
    if (doseHist.mdStartDatetime) {
      const d = dtToDate(doseHist.mdStartDatetime);
      if (d) {
        items.push({ label: "MD #1", dt: formatDT(doseHist.mdStartDatetime), hr: `T=${hoursBetween(t0, d).toFixed(1)}h` });
        const cnt = parseInt(doseHist.mdCount) || 0;
        const intv = parseFloat(doseHist.mdInterval) || 12;
        if (cnt > 1) {
          const lastT = new Date(d.getTime() + (cnt - 1) * intv * 3600000);
          items.push({ label: `MD #${cnt}`, dt: `${String(lastT.getMonth() + 1)}/${String(lastT.getDate())} ${String(lastT.getHours()).padStart(2, "0")}:${String(lastT.getMinutes()).padStart(2, "0")}`, hr: `T=${hoursBetween(t0, lastT).toFixed(1)}h` });
        }
      }
    }
    if (level1.datetime) {
      const d = dtToDate(level1.datetime);
      if (d) items.push({ label: "Level #1", dt: formatDT(level1.datetime), hr: `T=${hoursBetween(t0, d).toFixed(1)}h` });
    }
    if (hasLevel2 && level2.datetime) {
      const d = dtToDate(level2.datetime);
      if (d) items.push({ label: "Level #2", dt: formatDT(level2.datetime), hr: `T=${hoursBetween(t0, d).toFixed(1)}h` });
    }
    return items;
  }, [t0, doseHist, level1, level2, hasLevel2]);

  return (
    <div>
      <div style={S.header}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>💊</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0F766E", margin: 0 }}>Vancomycin TDM</h1>
        <p style={{ fontSize: 12, color: "#94A3B8", margin: "4px 0 0" }}>
          {mode === "initial" ? "初始劑量推薦" : "Bayesian TDM（個人化劑量調整）"}
        </p>
      </div>

      {/* ── Mode ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {([["initial", "初始劑量"], ["bayesian", "Bayesian TDM"]] as const).map(([m, label]) => (
          <button key={m} onClick={() => { setMode(m); setShowResults(false); }}
            style={{ ...S.modeBtn, ...(mode === m ? S.modeBtnActive : {}) }}>{label}</button>
        ))}
      </div>

      {/* ── 病人資料 ── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>病人資料</div>

        {/* CrCl 模式切換 */}
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>CrCl 來源</label>
          <div style={{ display: "flex", gap: 6 }}>
            {([["auto", "自動計算"], ["direct", "直接輸入 CrCl"]] as const).map(([m, label]) => (
              <button key={m} onClick={() => { setCrclMode(m); setShowResults(false); }}
                style={{ ...S.toggleBtn, fontSize: 12, padding: "8px 0", ...(crclMode === m ? S.toggleBtnActive : {}) }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {crclMode === "auto" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={S.label}>體重 (kg)</label><input type="number" value={tbw} onChange={e => { setTbw(e.target.value); setShowResults(false); }} style={S.input} placeholder="70" /></div>
              <div><label style={S.label}>身高 (cm)</label><input type="number" value={height} onChange={e => { setHeight(e.target.value); setShowResults(false); }} style={S.input} placeholder="170" /></div>
              <div><label style={S.label}>年齡</label><input type="number" value={age} onChange={e => { setAge(e.target.value); setShowResults(false); }} style={S.input} placeholder="55" /></div>
              <div><label style={S.label}>Scr (mg/dL)</label><input type="number" value={scr} onChange={e => { setScr(e.target.value); setShowResults(false); }} style={S.input} placeholder="1.0" /></div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={S.label}>性別</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ id: "male", label: "男" }, { id: "female", label: "女" }].map(opt => (
                  <button key={opt.id} onClick={() => { setGender(opt.id); setShowResults(false); }}
                    style={{ ...S.toggleBtn, ...(gender === opt.id ? S.toggleBtnActive : {}) }}>{opt.label}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {crclMode === "direct" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={S.label}>體重 (kg)</label><input type="number" value={tbw} onChange={e => { setTbw(e.target.value); setShowResults(false); }} style={S.input} placeholder="70" /></div>
              <div><label style={S.label}>身高 (cm)</label><input type="number" value={height} onChange={e => { setHeight(e.target.value); setShowResults(false); }} style={S.input} placeholder="170" /></div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={S.label}>CrCl（醫院系統或實測值）</label>
              <input type="number" value={directCrcl} onChange={e => { setDirectCrcl(e.target.value); setShowResults(false); }}
                style={S.input} placeholder="mL/min" />
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>直接輸入 CrCl，不需填年齡、性別、Scr</div>
            </div>
          </>
        )}

        {canCalcBasic && (
          <div style={{ marginTop: 12, padding: 10, background: "#F0FDFA", borderRadius: 8, fontSize: 12, color: "#475569" }}>
            <div>CrCl：<strong>{Math.round(crcl)} mL/min</strong>（{crclMode === "direct" ? "直接輸入" : `CG，${bmi >= 30 ? `用 AdjBW ${Math.round(adjBw)} kg` : `用 TBW ${Math.round(w)} kg`}`}）</div>
            {modelKey === "roberts" && ht > 0 && w > 0 && (
              <div>CrCl（BSA-normalized）：<strong>{Math.round(crcl / calcBSA(w, ht) * 1.73)} mL/min/1.73m²</strong></div>
            )}
            <div>BMI：<strong>{bmi.toFixed(1)}</strong>{bmi >= 30 ? " ⚖️ 肥胖" : ""}</div>
            {crcl >= 130 && <div style={{ color: "#D97706", fontWeight: 600 }}>⚡ ARC（CrCl ≥130）</div>}
          </div>
        )}
      </div>

      {/* ── PK Model ── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>PK Model</div>
        {Object.entries(MODELS).map(([key, m]) => (
          <button key={key} onClick={() => { setModelKey(key); setShowResults(false); }}
            style={{ ...S.modelBtn, ...(modelKey === key ? S.modelBtnActive : {}) }}>
            <div style={{ fontWeight: 600 }}>{m.name}</div>
            <div style={{ fontSize: 11, color: modelKey === key ? "#0F766E" : "#94A3B8" }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* ── AUC 目標 ── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>AUC24/MIC 目標</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="number" value={targetMin} onChange={e => { setTargetMin(e.target.value); setShowResults(false); }} style={{ ...S.input, width: 70, textAlign: "center" as const }} />
          <span style={{ color: "#94A3B8" }}>—</span>
          <input type="number" value={targetMax} onChange={e => { setTargetMax(e.target.value); setShowResults(false); }} style={{ ...S.input, width: 70, textAlign: "center" as const }} />
          <span style={{ fontSize: 12, color: "#94A3B8" }}>（MIC=1）</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* Bayesian 模式：給藥歷史 + Drug Levels                     */}
      {/* ══════════════════════════════════════════════════════════ */}
      {mode === "bayesian" && (
        <>
          <div style={S.section}>
            <div style={S.sectionTitle}>給藥歷史</div>
            <div style={{ marginBottom: 10 }}>
              <label style={S.label}>有無 Loading Dose？</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ v: true, l: "有" }, { v: false, l: "無" }].map(opt => (
                  <button key={String(opt.v)} onClick={() => updateHist("hasLD", opt.v)}
                    style={{ ...S.toggleBtn, ...(doseHist.hasLD === opt.v ? S.toggleBtnActive : {}) }}>{opt.l}</button>
                ))}
              </div>
            </div>
            {doseHist.hasLD && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={S.label}>LD 劑量 (mg)</label><input type="number" value={doseHist.ldDose} onChange={e => updateHist("ldDose", e.target.value)} style={S.input} placeholder="2000" /></div>
                <DateTimeInput label="LD 給藥時間" value={doseHist.ldDatetime} onChange={v => updateHist("ldDatetime", v)} />
              </div>
            )}
            <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>維持劑量</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={S.label}>MD 劑量 (mg)</label><input type="number" value={doseHist.mdDose} onChange={e => updateHist("mdDose", e.target.value)} style={S.input} placeholder="1000" /></div>
              <div><label style={S.label}>間隔 (hr)</label><input type="number" value={doseHist.mdInterval} onChange={e => updateHist("mdInterval", e.target.value)} style={S.input} placeholder="12" /></div>
              <div><label style={S.label}>輸注時間 (hr)</label><input type="number" value={doseHist.mdInfusion} onChange={e => updateHist("mdInfusion", e.target.value)} style={S.input} placeholder="1" /></div>
              <div><label style={S.label}>已給 MD 幾劑</label><input type="number" value={doseHist.mdCount} onChange={e => updateHist("mdCount", e.target.value)} style={S.input} placeholder="3" /></div>
              <div style={{ gridColumn: "1 / -1" }}>
                <DateTimeInput label="首劑 MD 開始輸注時間" value={doseHist.mdStartDatetime} onChange={v => updateHist("mdStartDatetime", v)} />
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>⚠️ 請輸入實際給藥時間（非醫囑開立時間）。後續劑量以等距推算（首劑 + interval × n）</div>
              </div>
            </div>
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}>藥物濃度</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label style={S.label}>Level #1 (mcg/mL)</label><input type="number" value={level1.conc} onChange={e => { setLevel1(p => ({ ...p, conc: e.target.value })); setShowResults(false); }} style={S.input} placeholder="15.2" /></div>
              <DateTimeInput label="抽血時間" value={level1.datetime} onChange={v => { setLevel1(p => ({ ...p, datetime: v })); setShowResults(false); }} />
            </div>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => setHasLevel2(!hasLevel2)} style={{ background: "none", border: "none", color: "#0D9488", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                {hasLevel2 ? "— 移除第二個 Level" : "+ 新增第二個 Level"}
              </button>
            </div>
            {hasLevel2 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                <div><label style={S.label}>Level #2 (mcg/mL)</label><input type="number" value={level2.conc} onChange={e => { setLevel2(p => ({ ...p, conc: e.target.value })); setShowResults(false); }} style={S.input} placeholder="28.5" /></div>
                <DateTimeInput label="抽血時間" value={level2.datetime} onChange={v => { setLevel2(p => ({ ...p, datetime: v })); setShowResults(false); }} />
              </div>
            )}
          </div>

          {/* 時間摘要 */}
          {timeSummary && timeSummary.length > 0 && (
            <div style={{ ...S.section, background: "#F8FAFC" }}>
              <div style={S.sectionTitle}>時間軸摘要</div>
              {timeSummary.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, borderBottom: "1px solid #F1F5F9" }}>
                  <span style={{ fontWeight: 600, color: "#475569" }}>{item.label}</span>
                  <span style={{ color: "#64748B" }}>{item.dt}　<span style={{ color: "#94A3B8" }}>{item.hr}</span></span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── 計算按鈕 ── */}
      {canCalcBasic && !showResults && (
        <button onClick={handleCalc} style={S.calcBtn}>
          {mode === "initial" ? "計算建議劑量" : "Bayesian 分析"}
        </button>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* 結果                                                      */}
      {/* ══════════════════════════════════════════════════════════ */}
      {showResults && best && (
        <div>
          {mode === "bayesian" && bayesResult && (
            <>
              <div style={S.section}>
                <div style={S.sectionTitle}>PK 曲線（Bayesian 個人化）</div>
                <PKCurve curveData={bayesResult.curveData} levels={bayesResult.levels} t0={t0} />
                <div style={{ fontSize: 10, color: "#94A3B8", textAlign: "center", marginTop: 6 }}>綠色帶 = Trough 10-20 ｜ 紅點 = 實測</div>
              </div>
              <div style={S.section}>
                <div style={S.sectionTitle}>目前方案分析</div>
                <div style={S.resultCard}>
                  <div style={S.resultRow}><span>目前方案</span><strong>{doseHist.mdDose} mg Q{doseHist.mdInterval}H</strong></div>
                  <div style={S.resultRow}><span>預估 AUC24/MIC</span>
                    <strong style={{ color: bayesResult.currentPK.auc24 >= tMin && bayesResult.currentPK.auc24 <= tMax ? "#059669" : "#DC2626" }}>
                      {r(bayesResult.currentPK.auc24)} {bayesResult.currentPK.auc24 >= tMin && bayesResult.currentPK.auc24 <= tMax ? "✅" : "⚠️"}
                    </strong>
                  </div>
                  <div style={S.resultRow}><span>預估 Peak</span><strong>{bayesResult.currentPK.peak.toFixed(1)} mcg/mL</strong></div>
                  <div style={S.resultRow}><span>預估 Trough</span><strong>{bayesResult.currentPK.trough.toFixed(1)} mcg/mL</strong></div>
                </div>
              </div>
            </>
          )}

          <div style={S.section}>
            <div style={S.sectionTitle}>{mode === "bayesian" ? "Bayesian 建議劑量" : "建議劑量（Population PK）"}</div>
            <div style={S.resultCard}>
              {mode === "initial" && <div style={S.resultRow}><span>Loading Dose</span><strong>{ldMg} mg（{ldMgPerKg} mg/kg）</strong></div>}
              <div style={S.resultRow}><span>Maintenance Dose</span><strong>{best.dose} mg Q{best.interval}H</strong></div>
              <div style={S.resultRow}><span>輸注時間</span><strong>{best.infusion} hr</strong></div>
              <div style={S.resultRow}><span>每日總劑量</span><strong>{best.dailyDose} mg/day</strong></div>
              <div style={S.resultRow}><span>預估 AUC24</span><strong style={{ color: best.inRange ? "#059669" : "#DC2626" }}>{r(best.auc24)} {best.inRange ? "✅" : "⚠️"}</strong></div>
              <div style={S.resultRow}><span>Peak / Trough</span><strong>{best.peak.toFixed(1)} / {best.trough.toFixed(1)}</strong></div>
            </div>
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}>Kinetic Parameters{mode === "bayesian" ? "（Bayesian）" : `（${model.name}）`}</div>
            <div style={S.resultCard}>
              <div style={S.resultRow}><span>CL</span><strong>{activeCL.toFixed(2)} L/h</strong></div>
              <div style={S.resultRow}><span>Vd</span><strong>{activeV.toFixed(1)} L（{(activeV / w).toFixed(2)} L/kg）</strong></div>
              <div style={S.resultRow}><span>Kel</span><strong>{(activeCL / activeV).toFixed(4)} h⁻¹</strong></div>
              <div style={S.resultRow}><span>t½</span><strong>{(0.693 / (activeCL / activeV)).toFixed(1)} h</strong></div>
              {mode === "bayesian" && bayesResult && (
                <>
                  <div style={{ ...S.resultRow, background: "#FEF3C7" }}>
                    <span>Pop → Bayes CL</span><span>{CLpop.toFixed(2)} → <strong>{activeCL.toFixed(2)}</strong>（{((activeCL / CLpop - 1) * 100).toFixed(0)}%）</span>
                  </div>
                  <div style={{ ...S.resultRow, background: "#FEF3C7" }}>
                    <span>Pop → Bayes Vd</span><span>{Vpop.toFixed(1)} → <strong>{activeV.toFixed(1)}</strong>（{((activeV / Vpop - 1) * 100).toFixed(0)}%）</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}>劑量比較（前 10 選項）</div>
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead><tr><th style={S.th}></th><th style={S.th}>劑量</th><th style={S.th}>頻率</th><th style={S.th}>AUC24</th><th style={S.th}>Peak</th><th style={S.th}>Trough</th></tr></thead>
                <tbody>
                  {options.slice(0, 10).map((opt, i) => (
                    <tr key={i} style={opt.inRange ? { background: "#F0FDF4" } : {}}>
                      <td style={{ ...S.td, width: 30, textAlign: "center" as const }}>{i === 0 && opt.inRange ? "⭐" : ""}</td>
                      <td style={S.td}>{opt.dose} mg</td><td style={S.td}>Q{opt.interval}H</td>
                      <td style={{ ...S.td, fontWeight: 600, color: opt.inRange ? "#059669" : "#94A3B8" }}>{r(opt.auc24)}</td>
                      <td style={S.td}>{opt.peak.toFixed(1)}</td><td style={S.td}>{opt.trough.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 6 }}>⭐ = 推薦 | 綠底 = AUC24 在目標範圍 | MIC = 1 | 每日 ≤4.5 g</div>
          </div>

          {/* ── TDM Note（英文，可複製）── */}
          <div style={S.section}>
            <div style={S.sectionTitle}>📋 TDM Note</div>
            <TDMNote
              mode={mode}
              currentDose={parseFloat(doseHist.mdDose) || 0}
              currentInterval={parseFloat(doseHist.mdInterval) || 0}
              currentPK={bayesResult?.currentPK ?? null}
              best={best}
              activeCL={activeCL}
              activeV={activeV}
              halflife={activeCL > 0 && activeV > 0 ? 0.693 / (activeCL / activeV) : 0}
              crcl={crcl}
              tbw={w}
              scr={sc}
              age={ag}
              isFemale={isFemale}
              modelName={model.name}
              targetMin={tMin}
              targetMax={tMax}
              ldMg={ldMg}
              level1Conc={parseFloat(level1.conc) || 0}
              level1Time={level1.datetime ? formatDT(level1.datetime) : ""}
              level2Conc={hasLevel2 ? (parseFloat(level2.conc) || 0) : 0}
              level2Time={hasLevel2 && level2.datetime ? formatDT(level2.datetime) : ""}
            />
          </div>

          <div style={S.section}>
            <div style={S.warningBox}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠️ 注意事項</div>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                {mode === "bayesian" ? <>• Bayesian 估算基於 1-compartment model，建議調整後 24-48hr 再抽血確認<br />• 時間點務必準確<br /></> : <>• Population PK 預估，個體差異大，務必搭配 TDM<br /></>}
                • 輸注速率 ≤10-15 mg/min（避免 Red Man Syndrome）<br />
                • 每日 &gt;4.5 g 建議提早頻繁監測<br />
                {bmi >= 30 && <>• 肥胖（BMI {bmi.toFixed(1)}）：用 TBW，LD max 3 g<br /></>}
                {crcl >= 130 && <>• ARC：需頻繁 TDM<br /></>}
              </div>
            </div>
          </div>

          <button onClick={handleReset} style={S.resetBtn}>重新計算</button>
        </div>
      )}

      <div style={{ textAlign: "center", padding: "24px 0 8px", fontSize: 11, color: "#94A3B8" }}>
        Buelga et al. AAC 2005;49:4934 / Roberts et al. AAC 2011;55:3208<br />
        Bayesian MAP: 1-compartment, proportional error model<br />
        僅供臨床參考，請依實際 TDM 結果調整
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════
const S: Record<string, React.CSSProperties> = {
  header: { textAlign: "center", padding: "16px 0 20px" },
  section: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", boxSizing: "border-box" },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 },
  input: { width: "100%", padding: "9px 10px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 14, color: "#0F172A", background: "#fff", outline: "none", boxSizing: "border-box" as const },
  toggleBtn: { flex: 1, padding: "9px 0", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  toggleBtnActive: { background: "#0D9488", color: "#fff", borderColor: "#0D9488" },
  modeBtn: { flex: 1, padding: "10px 0", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  modeBtnActive: { background: "#0D9488", color: "#fff", borderColor: "#0D9488" },
  modelBtn: { width: "100%", padding: 12, borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", textAlign: "left" as const, cursor: "pointer", marginBottom: 8 },
  modelBtnActive: { borderColor: "#0D9488", background: "#F0FDFA" },
  calcBtn: { width: "100%", padding: "14px 0", borderRadius: 10, border: "none", background: "#0D9488", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 16 },
  resetBtn: { width: "100%", marginTop: 12, padding: "14px 0", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: 15, fontWeight: 600, cursor: "pointer" },
  resultCard: { borderRadius: 8, overflow: "hidden" },
  resultRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #F1F5F9", fontSize: 13 },
  warningBox: { padding: 12, background: "#FEF3C7", borderRadius: 8, color: "#78350F", fontSize: 13 },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12 },
  th: { padding: "8px 6px", background: "#F1F5F9", fontWeight: 700, color: "#475569", textAlign: "left" as const, borderBottom: "2px solid #E2E8F0" },
  td: { padding: "8px 6px", borderBottom: "1px solid #F1F5F9", color: "#334155" },
};
