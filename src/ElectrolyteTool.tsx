import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const ACCENT = "#0D9488";
const KCL_MEQ_PER_AMP = 20;
const KCL_ML_PER_AMP = 10;
const KCL_MEQ_PER_ML = 2;
const MGSO4_G_PER_ML = 0.1;
const MGSO4_G_PER_AMP = 2;
const MGSO4_ML_PER_AMP = 20;
const MGSO4_MEQ_PER_AMP = 16.2;
const MG_MGDL_PER_MMOLL = 2.43;
const MGSO4_MMOL_PER_G = 4.06;
const MGSO4_MEQ_PER_G = MGSO4_MEQ_PER_AMP / MGSO4_G_PER_AMP;
const GLYCOPHOS_ML_PER_AMP = 20;
const GLYCOPHOS_PHOS_MMOL_PER_ML = 1;
const GLYCOPHOS_NA_MMOL_PER_ML = 2;
const PHOS_MGDL_PER_MMOLL = 3.1;
const CALCIUM_MG_PER_MEQ = 20;
const CALGLON_ML_PER_AMP = 10;
const CALGLON_MEQ_PER_ML = 0.465;
const CALGLON_MG_PER_ML = 9.3;
const VITACAL_ML_PER_AMP = 20;
const VITACAL_MEQ_PER_ML = 0.272;
const VITACAL_GLUCOSE_MG_PER_ML = 100;
const NS_NA_MEQ_PER_L = 154;
const HYPERTONIC_SALINE_NA_MEQ_PER_L = 513;
const HYPERTONIC_SALINE_NA_MEQ_PER_ML = HYPERTONIC_SALINE_NA_MEQ_PER_L / 1000;
const ROLIKAN_MEQ_PER_ML = 0.83;
const ROLIKAN_ML_PER_AMP = 20;
const ROLIKAN_MEQ_PER_AMP = 16.66;
const ROLIKAN_BOT_ML = 250;
const ROLIKAN_BOT_MEQ = ROLIKAN_MEQ_PER_ML * ROLIKAN_BOT_ML;

type KAccess = "peripheral" | "central" | "crrt";
type RenalRisk = "normal" | "impaired" | "oliguria" | "crrt";
type KSeverity = "mild" | "moderate" | "severe" | "critical" | "none";
type HyperKSeverity = "none" | "mild" | "moderate" | "severe";
type MgUnit = "mgdl" | "mmoll";
type MgSeverity = "none" | "mild" | "moderate" | "severe";
type PhosSeverity = "none" | "mild" | "moderate" | "severe";
type ElectrolyteTab = "k" | "mg" | "phos" | "ca" | "na" | "reference";
type CalciumProduct = "calglon" | "vitacal";
type CalciumIndication = "hypocalcemia" | "hyperkalemia" | "massiveTransfusion" | "ccb";
type CalciumLabMode = "total" | "ionized";
type SodiumMode = "hyponatremia" | "hypernatremia";
type PotassiumMode = "hypokalemia" | "hyperkalemia";
type SodiumDuration = "acute" | "chronic" | "unknown";
type SodiumVolumeStatus = "hypovolemic" | "euvolemic" | "hypervolemic" | "unclear";
type SodiumSex = "male" | "female";

function n(value: string) {
  return parseFloat(value) || 0;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function ceilHalf(value: number) {
  return Math.ceil(value * 2) / 2;
}

function doseFromK(k: number, renalRisk: RenalRisk) {
  if (!k || k >= 3.5) return 0;
  return baseDoseFromK(k, renalRisk);
}

function baseDoseFromK(k: number, renalRisk: RenalRisk) {
  let dose = 20;
  if (k < 3.5) dose = 20;
  if (k < 3.2) dose = 40;
  if (k < 3) dose = 60;
  if (k < 2.5) dose = 80;
  if (renalRisk === "impaired") dose = Math.max(10, Math.round(dose * 0.5 / 10) * 10);
  if (renalRisk === "oliguria") dose = Math.min(20, dose);
  return dose;
}

function severityFromK(k: number): KSeverity {
  if (!k) return "none";
  if (k < 2.5) return "critical";
  if (k < 3) return "severe";
  if (k < 3.2) return "moderate";
  if (k < 3.5) return "mild";
  return "none";
}

function severityFromHyperK(k: number): HyperKSeverity {
  if (!k || k < 5.5) return "none";
  if (k < 6) return "mild";
  if (k < 6.5) return "moderate";
  return "severe";
}

function severityFromMg(mgDl: number): MgSeverity {
  if (!mgDl) return "none";
  if (mgDl < 1.2) return "severe";
  if (mgDl < 1.6) return "moderate";
  if (mgDl < 1.8) return "mild";
  return "none";
}

function baseMgDose(mgDl: number, symptoms: boolean, torsades: boolean, refractoryK: boolean) {
  if (torsades) return 2;
  if (symptoms || mgDl < 1.2) return 4;
  if (mgDl < 1.6) return 2;
  if (mgDl < 1.8) return refractoryK ? 2 : 1;
  return refractoryK ? 1 : 0;
}

function severityFromPhos(phosMgDl: number): PhosSeverity {
  if (!phosMgDl) return "none";
  if (phosMgDl < 1) return "severe";
  if (phosMgDl < 1.7) return "moderate";
  if (phosMgDl < 2.5) return "mild";
  return "none";
}

function phosDoseFactor(phosMgDl: number) {
  if (!phosMgDl || phosMgDl >= 2.5) return 0;
  if (phosMgDl < 1) return 0.6;
  if (phosMgDl < 1.7) return 0.4;
  if (phosMgDl < 2.2) return 0.2;
  return 0.1;
}

function roundPhosDose(value: number) {
  if (value <= 0) return 0;
  return Math.max(5, Math.round(value / 5) * 5);
}

function sodiumSeverity(na: number, mode: SodiumMode) {
  if (!na) return "請輸入 Na";
  if (mode === "hyponatremia") {
    if (na < 120) return "Profound hyponatremia";
    if (na < 125) return "Severe hyponatremia";
    if (na < 130) return "Moderate hyponatremia";
    if (na < 135) return "Mild hyponatremia";
    return "未達低血鈉";
  }
  if (na >= 160) return "Severe hypernatremia";
  if (na >= 150) return "Moderate hypernatremia";
  if (na > 145) return "Mild hypernatremia";
  return "未達高血鈉";
}

const severityText: Record<KSeverity, string> = {
  none: "目前未達低血鉀範圍",
  mild: "Mild hypokalemia",
  moderate: "Moderate hypokalemia",
  severe: "Severe hypokalemia",
  critical: "Critical hypokalemia",
};

const hyperKSeverityText: Record<HyperKSeverity, string> = {
  none: "未達高血鉀範圍",
  mild: "Mild hyperkalemia：K 5.5-5.9",
  moderate: "Moderate hyperkalemia：K 6.0-6.4",
  severe: "Severe hyperkalemia：K ≥6.5",
};

const mgSeverityText: Record<MgSeverity, string> = {
  none: "未達低血鎂或未輸入",
  mild: "Mild hypomagnesemia",
  moderate: "Moderate hypomagnesemia",
  severe: "Severe hypomagnesemia",
};

const phosSeverityText: Record<PhosSeverity, string> = {
  none: "未達低血磷或未輸入",
  mild: "Mild hypophosphatemia",
  moderate: "Moderate hypophosphatemia",
  severe: "Severe hypophosphatemia",
};

const renalText: Record<RenalRisk, string> = {
  normal: "腎功能穩定 / 有尿",
  impaired: "腎功能差但仍有尿",
  oliguria: "少尿 / 無尿",
  crrt: "CRRT / CVVH 中",
};

const calciumProductText: Record<CalciumProduct, string> = {
  calglon: "Calglon / Calcium gluconate",
  vitacal: "Vitacal / Calcium chloride",
};

const calciumIndicationText: Record<CalciumIndication, string> = {
  hypocalcemia: "Symptomatic hypocalcemia",
  hyperkalemia: "Hyperkalemia with ECG changes",
  massiveTransfusion: "Massive transfusion / citrate effect",
  ccb: "CCB overdose / resuscitation",
};

function ResultRow({ label, value, note, highlight = false }: { label: string; value: string; note?: string; highlight?: boolean }) {
  return (
    <div style={{ ...S.resultRow, ...(highlight ? S.resultRowHighlight : {}) }}>
      <div>
        <div style={S.resultLabel}>{label}</div>
        {note && <div style={S.resultNote}>{note}</div>}
      </div>
      <strong style={S.resultValue}>{value}</strong>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label>
      <span style={S.label}>{label}</span>
      {children}
      {hint && <div style={S.fieldHint}>{hint}</div>}
    </label>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul style={S.bulletList}>
      {items.map((item) => <li key={item} style={S.bulletItem}>{item}</li>)}
    </ul>
  );
}

function ClinicalReference({ children }: { children: ReactNode }) {
  return (
    <details style={S.clinicalReference}>
      <summary style={S.clinicalSummary}>臨床參考</summary>
      <div style={S.clinicalBody}>{children}</div>
    </details>
  );
}

function DetailBox({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  return (
    <details style={S.detailBox}>
      <summary style={S.detailSummary}>
        <span>{title}</span>
        <strong>{summary}</strong>
      </summary>
      <div style={S.detailBody}>{children}</div>
    </details>
  );
}

export default function ElectrolyteTool() {
  const [activeTab, setActiveTab] = useState<ElectrolyteTab>("k");
  const [potassiumMode, setPotassiumMode] = useState<PotassiumMode>("hypokalemia");
  const [currentK, setCurrentK] = useState("3.0");
  const [targetK, setTargetK] = useState("4.0");
  const [renalRisk, setRenalRisk] = useState<RenalRisk>("normal");
  const [access, setAccess] = useState<KAccess>("peripheral");
  const [symptomatic, setSymptomatic] = useState(false);
  const [magLow, setMagLow] = useState(false);
  const [customDose, setCustomDose] = useState("");
  const [prepAmpules, setPrepAmpules] = useState("");
  const [finalVolume, setFinalVolume] = useState("250");
  const [infusionHours, setInfusionHours] = useState("1");
  const [hyperK, setHyperK] = useState("6.2");
  const [hyperKRenalRisk, setHyperKRenalRisk] = useState<RenalRisk>("impaired");
  const [hyperKEcgChange, setHyperKEcgChange] = useState(false);
  const [hyperKWeakness, setHyperKWeakness] = useState(false);
  const [hyperKUnstable, setHyperKUnstable] = useState(false);
  const [hyperKPseudoRisk, setHyperKPseudoRisk] = useState(false);
  const [hyperKOngoingLoad, setHyperKOngoingLoad] = useState(false);
  const [hyperKImpendingSurgery, setHyperKImpendingSurgery] = useState(false);
  const [hyperKAcidosis, setHyperKAcidosis] = useState(false);
  const [hyperKGlucose, setHyperKGlucose] = useState("120");
  const [crrtBagVolume, setCrrtBagVolume] = useState("5000");
  const [crrtBaseK, setCrrtBaseK] = useState("0");
  const [crrtTargetFluidK, setCrrtTargetFluidK] = useState("4");
  const [crrtFluidRate, setCrrtFluidRate] = useState("2000");
  const [serumMg, setSerumMg] = useState("1.5");
  const [targetMg, setTargetMg] = useState("2.0");
  const [mgUnit, setMgUnit] = useState<MgUnit>("mgdl");
  const [mgRenalRisk, setMgRenalRisk] = useState<RenalRisk>("normal");
  const [mgSymptoms, setMgSymptoms] = useState(false);
  const [mgTorsades, setMgTorsades] = useState(false);
  const [mgCustomDose, setMgCustomDose] = useState("");
  const [mgDiluentVolume, setMgDiluentVolume] = useState("100");
  const [mgInfusionHours, setMgInfusionHours] = useState("1");
  const [serumPhos, setSerumPhos] = useState("2.0");
  const [targetPhos, setTargetPhos] = useState("3.0");
  const [phosUnit, setPhosUnit] = useState<MgUnit>("mgdl");
  const [phosWeight, setPhosWeight] = useState("60");
  const [serumCalcium, setSerumCalcium] = useState("");
  const [phosRenalRisk, setPhosRenalRisk] = useState<RenalRisk>("normal");
  const [phosSymptoms, setPhosSymptoms] = useState(false);
  const [refeedingRisk, setRefeedingRisk] = useState(false);
  const [phosCustomDose, setPhosCustomDose] = useState("");
  const [phosDiluentVolume, setPhosDiluentVolume] = useState("250");
  const [phosInfusionHours, setPhosInfusionHours] = useState("6");
  const [calciumProduct, setCalciumProduct] = useState<CalciumProduct>("calglon");
  const [calciumIndication, setCalciumIndication] = useState<CalciumIndication>("hypocalcemia");
  const [calciumLabMode, setCalciumLabMode] = useState<CalciumLabMode>("total");
  const [ionizedCa, setIonizedCa] = useState("");
  const [totalCaForCa, setTotalCaForCa] = useState("7.5");
  const [albuminForCa, setAlbuminForCa] = useState("3.0");
  const [calciumSymptoms, setCalciumSymptoms] = useState(false);
  const [calciumCentralLine, setCalciumCentralLine] = useState(false);
  const [calciumRenalRisk, setCalciumRenalRisk] = useState<RenalRisk>("normal");
  const [calciumCustomMeq, setCalciumCustomMeq] = useState("");
  const [calciumDiluentVolume, setCalciumDiluentVolume] = useState("100");
  const [calciumInfusionMinutes, setCalciumInfusionMinutes] = useState("10");
  const [sodiumMode, setSodiumMode] = useState<SodiumMode>("hyponatremia");
  const [serumNa, setSerumNa] = useState("122");
  const [targetNa, setTargetNa] = useState("128");
  const [sodiumWeight, setSodiumWeight] = useState("60");
  const [sodiumAge, setSodiumAge] = useState("65");
  const [sodiumSex, setSodiumSex] = useState<SodiumSex>("female");
  const [sodiumDuration, setSodiumDuration] = useState<SodiumDuration>("unknown");
  const [sodiumVolumeStatus, setSodiumVolumeStatus] = useState<SodiumVolumeStatus>("unclear");
  const [sodiumRenalRisk, setSodiumRenalRisk] = useState<RenalRisk>("normal");
  const [sodiumSevereSymptoms, setSodiumSevereSymptoms] = useState(false);
  const [sodiumOdsRisk, setSodiumOdsRisk] = useState(false);
  const [sodiumOngoingLoss, setSodiumOngoingLoss] = useState("0");
  const [sodiumCorrectionHours, setSodiumCorrectionHours] = useState("24");
  const [hypertonicVolume, setHypertonicVolume] = useState("100");
  const [hypertonicInfusionMinutes, setHypertonicInfusionMinutes] = useState("60");

  const calc = useMemo(() => {
    const k = n(currentK);
    const target = n(targetK) || 4;
    const severity = severityFromK(k);
    const deficit = k > 0 && target > k ? Math.round((target - k) * 100 / 10) * 10 : 0;
    const rawTableDose = k && k < 3.5 ? baseDoseFromK(k, "normal") : 0;
    const tableDose = doseFromK(k, renalRisk);
    const custom = n(customDose);
    const dose = custom || tableDose;
    const prepDose = n(prepAmpules) > 0 ? n(prepAmpules) * KCL_MEQ_PER_AMP : dose;
    const stockMl = dose / KCL_MEQ_PER_ML;
    const amps = dose / KCL_MEQ_PER_AMP;
    const prepStockMl = prepDose / KCL_MEQ_PER_ML;
    const volume = n(finalVolume);
    const hours = n(infusionHours);
    const concentration = volume > 0 ? prepDose / volume : 0;
    const rateMeqHr = hours > 0 ? prepDose / hours : 0;
    const pumpRate = hours > 0 && volume > 0 ? volume / hours : 0;
    const crrtBagL = n(crrtBagVolume) / 1000;
    const crrtBase = n(crrtBaseK);
    const crrtTarget = n(crrtTargetFluidK);
    const crrtRateLHr = n(crrtFluidRate) / 1000;
    const crrtAddMeq = Math.max(0, round((crrtTarget - crrtBase) * crrtBagL, 1));
    const crrtAddMl = crrtAddMeq / KCL_MEQ_PER_ML;
    const crrtAmpules = crrtAddMeq / KCL_MEQ_PER_AMP;
    const crrtExtraMeqHr = Math.max(0, round((crrtTarget - crrtBase) * crrtRateLHr, 1));
    const crrtBagHours = crrtRateLHr > 0 ? crrtBagL / crrtRateLHr : 0;

    let maxRate = 10;
    let concentrationGuide = "周邊常用 10 mEq/100 mL，通常不超過 10 mEq/hr。";
    if (access === "central") {
      maxRate = 20;
      concentrationGuide = "中心靜脈常用 20 mEq/100 mL；ICU 嚴重低血鉀可在心電監測下依醫囑加快。";
    }
    if (access === "crrt") {
      maxRate = 10;
      concentrationGuide = "若是加到 CVVH solution / replacement fluid，屬於調整機器液體濃度，不是直接 IV 給病人。";
    }
    const overRate = rateMeqHr > maxRate && access !== "crrt";
    const overPeripheralConc = access === "peripheral" && concentration > 0.1;
    const urgent = severity === "critical" || symptomatic;
    const suggestedRate = access === "central" ? 20 : 10;
    const suggestedHours = suggestedRate > 0 && prepDose > 0 ? prepDose / suggestedRate : 0;
    const suggestedText = access === "crrt"
      ? "CVVH 是調整 replacement fluid 濃度，請依 CVVH replacement order，不用一般 IV 補鉀速率判讀。"
      : `${suggestedRate} mEq/hr → 約 ${round(suggestedHours, 1)} hr${access === "central" && urgent ? "；若嚴重低血鉀且需更快，須 ICU/中心靜脈/連續 ECG monitoring 及醫囑確認。" : ""}`;

    return {
      k, target, severity, deficit, tableDose, dose, prepDose, stockMl, prepStockMl, amps, volume, hours,
      rawTableDose, custom, concentration, rateMeqHr, pumpRate, maxRate, suggestedRate, suggestedHours, suggestedText, concentrationGuide, overRate,
      overPeripheralConc, urgent, crrtBagL, crrtBase, crrtTarget, crrtRateLHr, crrtAddMeq, crrtAddMl, crrtAmpules, crrtExtraMeqHr, crrtBagHours,
    };
  }, [currentK, targetK, renalRisk, customDose, prepAmpules, finalVolume, infusionHours, access, symptomatic, crrtBagVolume, crrtBaseK, crrtTargetFluidK, crrtFluidRate]);

  const bagPlan = useMemo(() => {
    if (calc.dose <= 0) return "請輸入目前 K 或自訂補充量";
    if (access === "peripheral") {
      const bags = Math.ceil(calc.dose / 20);
      return `可拆成 ${bags} 袋：每袋 KCl 20 mEq 加入 NS 250 mL，run >1 hr/袋；周邊 line 若疼痛或靜脈炎風險高，需放慢或再稀釋。`;
    }
    if (access === "central") {
      const bags = Math.ceil(calc.dose / 20);
      return `可拆成 ${bags} 袋：每袋 KCl 20 mEq 加入 NS 100 mL，run >1 hr/袋；限水病人可用 NS 50 mL，但需 CVC/監測與醫囑確認。`;
    }
    return "CVVH 調鉀請依 replacement fluid 總量計算；KCl 原汁只可加入 CVVH solution 並充分混合，不可直接 IV push。";
  }, [calc.dose, access]);

  const hyperKCalc = useMemo(() => {
    const k = n(hyperK);
    const glucose = n(hyperKGlucose);
    const severity = severityFromHyperK(k);
    const significantKidneyImpairment = hyperKRenalRisk !== "normal";
    const severeKidneyImpairment = hyperKRenalRisk === "oliguria" || hyperKRenalRisk === "crrt";
    const manifestation = hyperKEcgChange || hyperKWeakness || hyperKUnstable;
    const emergencyFromLoad = k > 5.5 && significantKidneyImpairment && hyperKOngoingLoad;
    const emergency = manifestation || k > 6.5 || emergencyFromLoad;
    const promptLower = !emergency && k > 5.5 && (severeKidneyImpairment || hyperKImpendingSurgery);
    const treatShift = emergency;
    const repeatFirst = hyperKPseudoRisk && !manifestation && k <= 6.5 && !emergencyFromLoad;
    const calciumAction = hyperKEcgChange || hyperKUnstable
      ? "立即給 IV calcium 保護心肌：calcium gluconate 10% 10 mL（1 g）IV over 2-3 min（院內品項：Calglon 針 1 g/10 mL）；若 ECG 未改善可重複，院內流程不同時依院內規範。"
      : k > 6.5
        ? "K >6.5 建議 continuous ECG monitoring；可考慮 IV calcium，部分專家只在 ECG change 時給。院內品項：Calglon 針 1 g/10 mL；若 ECG 改變立即給。"
        : "目前無 ECG change / 不穩定時不一定需要 calcium；若 ECG 改變，處置立即升級。";
    const insulinAction = treatShift
      ? "Regular insulin 10 units IV + glucose 25 g IV；若血糖 >250 mg/dL 可考慮只給 insulin。約 15-30 min 起效，作用約 4-6 hr，需防低血糖。"
      : promptLower
        ? "需在 6-12 hr 內迅速降鉀，但若無急症表現，不一定需要立即 insulin/glucose；以排鉀與原因逆轉為主。"
        : "非急症時通常先確認原因、停致病藥與排鉀策略；不一定需要 insulin/glucose。";
    const glucoseAction = treatShift
      ? glucose > 0 && glucose < 126
        ? "血糖 <126 mg/dL：給 insulin/glucose 後建議接 D10W infusion 或更密集血糖監測。"
        : glucose > 0
          ? "仍需監測血糖：給 insulin 後至少追蹤 6 hr，腎衰竭病人低血糖風險更久。"
          : "若血糖未知，先測血糖；低血糖風險高者給 insulin 後要更密集監測或預防性 D10W。"
      : "若未使用 insulin/glucose，仍需追蹤 K trend 與病因。";
    const betaAgonistAction = treatShift
      ? "可加 nebulized salbutamol/albuterol 10-20 mg 作為輔助移鉀；不可取代 calcium 或 insulin/glucose。"
      : "通常保留給高血鉀急症、快速上升或需輔助移鉀時。";
    const bicarbonateAction = hyperKAcidosis
      ? "合併明顯 metabolic acidosis 時可考慮 NaHCO3 作輔助；不要當作唯一降鉀治療，並需注意 sodium/volume load、ionized Ca 下降與 alkalosis。"
      : "NaHCO3 不建議 routine 用來急性降 K；主要考慮於合併明顯 metabolic acidosis、且病人能承受 sodium/volume load 時。";
    const bicarbonateDose = hyperKAcidosis
      ? "可展開查看 Rolikan 7% 換算；常見先給 50 mEq，依 pH/HCO3/Na 可重複至 100-150 mEq。"
      : "若沒有明顯 metabolic acidosis，通常不建議為了降 K routine 給 NaHCO3；先以 calcium、insulin/glucose、beta-agonist 與排鉀策略為主。";
    const eliminationAction = hyperKRenalRisk === "oliguria"
      ? "少尿/無尿：排鉀能力差，若急症、K >6.5、反覆 rebound 或藥物無效，需及早評估 urgent dialysis。"
      : hyperKRenalRisk === "crrt"
        ? "CRRT 中：確認 dialysate/replacement K 濃度、effluent rate、filter function；若 K 持續高，需調整 CRRT 處方或評估 HD。"
        : hyperKRenalRisk === "impaired"
          ? "腎功能差但仍有尿：可考慮 loop diuretic（需有尿且容量允許）與 potassium binder；若不下降需評估 RRT。"
          : "腎功能穩定且有尿：停致病藥、低鉀飲食/輸入、loop diuretic 或 binder 依病因與臨床情境。";
    const binderAction = k >= 5.5
      ? "可考慮 potassium binder 作排鉀輔助；不是立即救命藥，不能取代 calcium、insulin/glucose 或 urgent dialysis。"
      : "輕度高血鉀可先處理原因並考慮 binder；需依院內品項與醫囑。";
    const binderDose = "可展開查看 Kalimate / Lokelma 院內品項劑量；binder 不是立即救命藥，需搭配排鉀與複查計畫。";
    const monitoringAction = emergency
      ? "Continuous ECG monitoring；治療後約 1 hr 複查 K，之後 2/4/6 hr 依趨勢追蹤，注意 rebound。"
      : promptLower
        ? "建議 ECG；目標 6-12 hr 內把 K 降下來，期間重複追蹤 K、I/O 與治療反應。"
        : k >= 5.5
          ? "先確認是否假性、重抽或複查 K；若 CKD/AKI、用藥風險或 K 上升中，需較快追蹤。"
          : "目前未達高血鉀；若臨床懷疑仍可複查。";
    const disposition = emergency
      ? "Emergency：先 calcium/移鉀/排鉀並監測，不要等重抽才處理。"
      : repeatFirst
        ? "先確認真假高血鉀：重抽 plasma K 或 blood gas K，並看 hemolysis index/採血過程。"
        : promptLower
          ? "Prompt lowering：通常不需 rapid calcium/insulin/glucose，但應在 6-12 hr 內降鉀。"
          : k >= 5.5
            ? "Slow lowering：處理原因、飲食/輸入與藥物，必要時 diuretic/bicarbonate/binder。"
            : "未達高血鉀。";
    return {
      k, glucose, severity, significantKidneyImpairment, severeKidneyImpairment, manifestation,
      emergencyFromLoad, emergency, promptLower, treatShift, repeatFirst, calciumAction, insulinAction,
      glucoseAction, betaAgonistAction, bicarbonateAction, bicarbonateDose, eliminationAction, binderAction, binderDose,
      monitoringAction, disposition,
    };
  }, [hyperK, hyperKRenalRisk, hyperKEcgChange, hyperKWeakness, hyperKUnstable, hyperKPseudoRisk, hyperKOngoingLoad, hyperKImpendingSurgery, hyperKAcidosis, hyperKGlucose]);

  const mgCalc = useMemo(() => {
    const enteredMg = n(serumMg);
    const enteredTarget = n(targetMg);
    const mgDl = mgUnit === "mmoll" ? enteredMg * MG_MGDL_PER_MMOLL : enteredMg;
    const targetMgDl = mgUnit === "mmoll" ? enteredTarget * MG_MGDL_PER_MMOLL : enteredTarget;
    const targetGap = enteredMg && targetMgDl > mgDl ? targetMgDl - mgDl : 0;
    const severity = severityFromMg(mgDl);
    const rawDose = baseMgDose(mgDl, mgSymptoms, mgTorsades, magLow);
    const renalAdjustedDose = (mgRenalRisk === "impaired" || mgRenalRisk === "oliguria") && rawDose > 0
      ? Math.max(1, rawDose / 2)
      : rawDose;
    const custom = n(mgCustomDose);
    const doseG = custom || renalAdjustedDose;
    const stockMl = doseG / MGSO4_G_PER_ML;
    const ampules = doseG / MGSO4_G_PER_AMP;
    const mmol = doseG * MGSO4_MMOL_PER_G;
    const meq = doseG * MGSO4_MEQ_PER_G;
    const volume = n(mgDiluentVolume);
    const hours = n(mgInfusionHours);
    const concentration = volume > 0 ? doseG / volume : 0;
    const rateGhr = hours > 0 ? doseG / hours : 0;
    const pumpRate = volume > 0 && hours > 0 ? volume / hours : 0;
    const usualRate = mgTorsades ? "1-2 g over 5-15 min，之後再依 Mg/K/ECG 慢速補足" : "一般 IV 補鎂常用 1-2 g/hr；非緊急大量補鎂可 4-8 g over 12-24 hr。";
    const overRate = !mgTorsades && rateGhr > 2;
    const highConcentration = concentration > 0.1;
    return {
      enteredMg, enteredTarget, mgDl, targetMgDl, targetGap, severity, rawDose, renalAdjustedDose, custom, doseG, stockMl, ampules,
      mmol, meq, volume, hours, concentration, rateGhr, pumpRate, usualRate, overRate, highConcentration,
    };
  }, [serumMg, targetMg, mgUnit, mgRenalRisk, mgSymptoms, mgTorsades, mgCustomDose, mgDiluentVolume, mgInfusionHours, magLow]);

  const phosCalc = useMemo(() => {
    const enteredPhos = n(serumPhos);
    const enteredTarget = n(targetPhos);
    const phosMgDl = phosUnit === "mmoll" ? enteredPhos * PHOS_MGDL_PER_MMOLL : enteredPhos;
    const targetMgDl = phosUnit === "mmoll" ? enteredTarget * PHOS_MGDL_PER_MMOLL : enteredTarget;
    const targetGap = enteredPhos && targetMgDl > phosMgDl ? targetMgDl - phosMgDl : 0;
    const severity = severityFromPhos(phosMgDl);
    const factor = phosDoseFactor(phosMgDl);
    const weight = n(phosWeight);
    const rawDose = roundPhosDose(weight > 0 ? weight * factor : 0);
    const cappedDose = Math.min(rawDose, phosMgDl < 1 ? 45 : 30);
    const renalAdjustedDose = (phosRenalRisk === "impaired" || phosRenalRisk === "oliguria") && cappedDose > 0
      ? roundPhosDose(cappedDose / 2)
      : cappedDose;
    const boostedDose = refeedingRisk && renalAdjustedDose === 0 && phosMgDl < 3 ? 10 : renalAdjustedDose;
    const custom = n(phosCustomDose);
    const doseMmol = custom || boostedDose;
    const glycoMl = doseMmol / GLYCOPHOS_PHOS_MMOL_PER_ML;
    const ampules = glycoMl / GLYCOPHOS_ML_PER_AMP;
    const sodiumMmol = glycoMl * GLYCOPHOS_NA_MMOL_PER_ML;
    const calcium = n(serumCalcium);
    const caPhosProduct = calcium > 0 && phosMgDl > 0 ? calcium * phosMgDl : 0;
    const volume = n(phosDiluentVolume);
    const hours = n(phosInfusionHours);
    const rateMmolHr = hours > 0 ? doseMmol / hours : 0;
    const pumpRate = volume > 0 && hours > 0 ? volume / hours : 0;
    const concentration = volume > 0 ? doseMmol / volume : 0;
    const highCaPhos = caPhosProduct >= 55;
    const overRate = rateMmolHr > 7.5;
    return {
      enteredPhos, enteredTarget, phosMgDl, targetMgDl, targetGap, severity, factor, weight,
      rawDose, cappedDose, renalAdjustedDose, boostedDose, custom, doseMmol, glycoMl, ampules,
      sodiumMmol, calcium, caPhosProduct, volume, hours, rateMmolHr, pumpRate, concentration,
      highCaPhos, overRate,
    };
  }, [serumPhos, targetPhos, phosUnit, phosWeight, serumCalcium, phosRenalRisk, phosSymptoms, refeedingRisk, phosCustomDose, phosDiluentVolume, phosInfusionHours]);

  const calciumCalc = useMemo(() => {
    const productMeqPerMl = calciumProduct === "calglon" ? CALGLON_MEQ_PER_ML : VITACAL_MEQ_PER_ML;
    const productMlPerAmp = calciumProduct === "calglon" ? CALGLON_ML_PER_AMP : VITACAL_ML_PER_AMP;
    const productMeqPerAmp = productMeqPerMl * productMlPerAmp;
    const productMgPerAmp = productMeqPerAmp * CALCIUM_MG_PER_MEQ;
    const iCa = n(ionizedCa);
    const totalCa = n(totalCaForCa);
    const albumin = n(albuminForCa);
    const correctedCa = totalCa > 0 && albumin > 0 ? totalCa + 0.8 * (4 - albumin) : 0;
    let targetMeq = 0;
    let indicationNote = "";
    if (calciumIndication === "hypocalcemia") {
      targetMeq = calciumSymptoms || (iCa > 0 && iCa < 0.9) ? 9 : 4.5;
      indicationNote = "症狀性或較嚴重低血鈣常先給 calcium gluconate 10-20 mL 10% over 10 min，可重複並接續 infusion。";
    } else if (calciumIndication === "hyperkalemia") {
      targetMeq = 13.5;
      indicationNote = "用於 hyperkalemia ECG changes 的心肌保護，不會降低血鉀；需同步給降鉀治療。";
    } else if (calciumIndication === "massiveTransfusion") {
      targetMeq = 4.5;
      indicationNote = "大量輸血/citrate effect 常依 iCa、血壓、輸血量與 ECG 反覆補充。";
    } else {
      targetMeq = 13.5;
      indicationNote = "CCB overdose/resuscitation 常需較高 elemental calcium，需 ICU/毒物或急救流程監測。";
    }
    const custom = n(calciumCustomMeq);
    const doseMeq = custom || targetMeq;
    const doseMl = productMeqPerMl > 0 ? doseMeq / productMeqPerMl : 0;
    const ampules = productMlPerAmp > 0 ? doseMl / productMlPerAmp : 0;
    const elementalMg = doseMeq * CALCIUM_MG_PER_MEQ;
    const volume = n(calciumDiluentVolume);
    const minutes = n(calciumInfusionMinutes);
    const rateMeqMin = minutes > 0 ? doseMeq / minutes : 0;
    const pumpRate = volume > 0 && minutes > 0 ? volume / (minutes / 60) : 0;
    const concentration = volume > 0 ? doseMeq / volume : 0;
    const chloridePeripheralRisk = calciumProduct === "vitacal" && !calciumCentralLine;
    const fastRate = minutes > 0 && minutes < 5;
    const renalSafetyNote = calciumRenalRisk === "normal"
      ? "腎功能穩定時仍需依 Ca/Phos trend 追蹤。"
      : calciumRenalRisk === "crrt"
        ? "CRRT 中 calcium 可能受 citrate、置換/透析液與輸血影響；建議追蹤 iCa/total Ca、Phos 與 Ca x Phos product。"
        : "腎功能差或少尿時需避免反覆過度補鈣，並追蹤 Phos、Ca x Phos product 與 calcium trend。";
    const labSummary = calciumLabMode === "ionized"
      ? (iCa ? `iCa ${iCa} mmol/L` : "未輸入 iCa")
      : (correctedCa ? `Corrected total Ca ${round(correctedCa, 2)} mg/dL` : totalCa ? `Total Ca ${totalCa} mg/dL（未校正 albumin）` : "未輸入 total Ca");
    const labWarning = calciumLabMode === "ionized" && !iCa
      ? "已選 ionized Ca，但尚未輸入 iCa；若沒有 iCa，可改用 total Ca + albumin。"
      : calciumLabMode === "total" && totalCa > 0 && !albumin
        ? "有 total Ca 但未輸入 albumin，無法校正；低白蛋白時 total Ca 可能低估。"
        : "";
    const productSummary = calciumProduct === "calglon"
      ? `1 amp = ${round(productMeqPerAmp, 2)} mEq Ca = ${round(productMgPerAmp)} mg elemental Ca`
      : `1 amp = ${round(productMeqPerAmp, 2)} mEq Ca = ${round(productMgPerAmp)} mg elemental Ca；另含 glucose-H2O ${VITACAL_GLUCOSE_MG_PER_ML * VITACAL_ML_PER_AMP} mg`;
    return {
      productMeqPerMl, productMlPerAmp, productMeqPerAmp, productMgPerAmp, iCa, totalCa,
      albumin, correctedCa, targetMeq, indicationNote, custom, doseMeq, doseMl, ampules,
      elementalMg, volume, minutes, rateMeqMin, pumpRate, concentration, chloridePeripheralRisk,
      fastRate, renalSafetyNote, labSummary, labWarning, productSummary,
    };
  }, [calciumProduct, calciumIndication, calciumLabMode, ionizedCa, totalCaForCa, albuminForCa, calciumSymptoms, calciumCentralLine, calciumRenalRisk, calciumCustomMeq, calciumDiluentVolume, calciumInfusionMinutes]);

  const sodiumCalc = useMemo(() => {
    const na = n(serumNa);
    const targetInput = n(targetNa);
    const weight = n(sodiumWeight);
    const age = n(sodiumAge);
    const ongoingLossL = n(sodiumOngoingLoss);
    const hours = n(sodiumCorrectionHours) || 24;
    const tbwFactor = sodiumSex === "male" ? (age >= 65 ? 0.5 : 0.6) : (age >= 65 ? 0.45 : 0.5);
    const tbw = weight * tbwFactor;
    const severity = sodiumSeverity(na, sodiumMode);
    const correctionLimit24 = sodiumOdsRisk ? 6 : 8;
    const correctionGoal24 = sodiumSevereSymptoms && sodiumMode === "hyponatremia" ? 4 : correctionLimit24;
    const desiredNa = sodiumMode === "hyponatremia"
      ? Math.min(targetInput || na + correctionGoal24, na + correctionLimit24, 135)
      : Math.max(targetInput || na - 10, 145);
    const deltaNa = sodiumMode === "hyponatremia" ? Math.max(0, desiredNa - na) : Math.max(0, na - desiredNa);
    const naRisePerL3 = tbw > 0 ? (HYPERTONIC_SALINE_NA_MEQ_PER_L - na) / (tbw + 1) : 0;
    const naRisePer100Ml3 = naRisePerL3 / 10;
    const estimated3PercentMl = naRisePerL3 > 0 && deltaNa > 0 ? (deltaNa / naRisePerL3) * 1000 : 0;
    const bolusCount = sodiumSevereSymptoms ? (naRisePer100Ml3 > 0 ? clamp(Math.ceil(4 / naRisePer100Ml3), 1, 3) : 1) : 0;
    const nsNaChangePerL = tbw > 0 ? (NS_NA_MEQ_PER_L - na) / (tbw + 1) : 0;
    const hypertonicVolMl = n(hypertonicVolume);
    const hypertonicMinutes = n(hypertonicInfusionMinutes);
    const hypertonicPumpRate = hypertonicVolMl > 0 && hypertonicMinutes > 0 ? hypertonicVolMl / (hypertonicMinutes / 60) : 0;
    const hypertonicNaLoad = hypertonicVolMl * HYPERTONIC_SALINE_NA_MEQ_PER_ML;
    const hypertonicEstimatedRise = naRisePer100Ml3 > 0 ? (hypertonicVolMl / 100) * naRisePer100Ml3 : 0;
    const hypertonicEstimatedRise24 = hypertonicMinutes > 0 ? hypertonicEstimatedRise * (1440 / hypertonicMinutes) : 0;
    const hypertonicOverLimit = hypertonicEstimatedRise > correctionLimit24 || hypertonicEstimatedRise24 > correctionLimit24;
    const suggestedContinuousWindowHours = 6;
    const suggestedHypertonicVolumeMl = sodiumMode !== "hyponatremia"
      ? 0
      : sodiumSevereSymptoms
        ? 100
        : estimated3PercentMl > 0
          ? Math.max(10, Math.round((estimated3PercentMl * suggestedContinuousWindowHours / 24) / 10) * 10)
          : 0;
    const suggestedHypertonicMinutes = sodiumMode !== "hyponatremia"
      ? 0
      : sodiumSevereSymptoms
        ? 10
        : suggestedHypertonicVolumeMl > 0
          ? suggestedContinuousWindowHours * 60
          : 0;
    const suggestedHypertonicPumpRate = suggestedHypertonicVolumeMl > 0 && suggestedHypertonicMinutes > 0
      ? suggestedHypertonicVolumeMl / (suggestedHypertonicMinutes / 60)
      : 0;
    const suggestedHypertonicRise = naRisePer100Ml3 > 0
      ? (suggestedHypertonicVolumeMl / 100) * naRisePer100Ml3
      : 0;
    const suggestedHypertonicTimeText = sodiumSevereSymptoms ? "10 min" : `${suggestedContinuousWindowHours} hr，複查 Na 後重算`;
    const suggestedHypertonicNote = sodiumSevereSymptoms
      ? "嚴重神經症狀優先 bolus；每次後重評症狀與 Na，可依反應重複 2-3 次。"
      : "非嚴重症狀若仍需 3% 連續輸注，先用本日安全上限反推 6 小時起始量；6 小時或更早複查 Na 後重算，不是固定跑滿 24 小時。";
    const freeWaterDeficit = sodiumMode === "hypernatremia" && tbw > 0 && na > desiredNa
      ? tbw * ((na / desiredNa) - 1)
      : 0;
    const totalWaterPlan = freeWaterDeficit + ongoingLossL;
    const waterRate = hours > 0 ? totalWaterPlan * 1000 / hours : 0;
    const sodiumRenalSafetyNote = sodiumRenalRisk === "normal"
      ? "腎功能/尿量不直接放入 Adrogue-Madias 或 free water deficit 公式；腎功能穩定且有尿時，公式較適合作起始估算。"
      : sodiumRenalRisk === "impaired"
        ? "腎功能差但仍有尿時，水與鈉排除較不穩；公式仍只作起始估算，需更密集追蹤 Na、I/O 與容量狀態。"
        : sodiumRenalRisk === "oliguria"
          ? "少尿/無尿時，水與鈉很難靠腎臟自行調整，公式容易失準；3% NaCl 或 free water 都需更保守，並評估 RRT/腎臟科。"
          : "CRRT/HD 中 serum Na 會受透析液、置換液、effluent rate 與脫水量影響；需依機器處方與 Na trend 調整，公式只作粗略參考。";
    const sodiumMonitoringText = sodiumMode === "hyponatremia"
      ? sodiumRenalRisk === "normal"
        ? "3% NaCl 期間 q2-4h Na；穩定且非高張鹽水時可依醫囑拉長。"
        : "建議至少 q2-4h Na + I/O；少尿/無尿或 CRRT 時依 ICU/腎臟科與機器處方更密集調整。"
      : sodiumRenalRisk === "normal"
        ? "慢性/不明高血鈉常 q4-6h Na，依下降速度調整 free water。"
        : "建議 q2-4h 到 q4h Na + I/O；少尿/無尿或 CRRT 時需同步看機器處方、脫水量與 hemodynamics。";
    const hyperCorrectionLimit24 = sodiumDuration === "acute" ? "可較快校正；通常先處理休克/原因並密集追蹤 Na" : "慢性或不明：傳統目標 <=10-12 mEq/L/day，成人資料顯示過慢也可能不好，需避免 undertreatment";
    const mechanismTitle = sodiumMode === "hyponatremia"
      ? sodiumVolumeStatus === "hypovolemic" ? "Hypovolemic hyponatremia"
        : sodiumVolumeStatus === "euvolemic" ? "Euvolemic hyponatremia"
          : sodiumVolumeStatus === "hypervolemic" ? "Hypervolemic hyponatremia"
            : "先確認 hypotonic hyponatremia，再用 volume status / urine Osm / urine Na 分型"
      : sodiumVolumeStatus === "hypovolemic" ? "Water loss > sodium loss"
        : sodiumVolumeStatus === "euvolemic" ? "Pure water loss"
          : sodiumVolumeStatus === "hypervolemic" ? "Sodium gain"
            : "高血鈉多代表水分不足或 sodium gain，需看尿量、滲透壓與輸入輸出";
    const mechanismItems = sodiumMode === "hyponatremia"
      ? sodiumVolumeStatus === "hypovolemic"
        ? ["GI loss、diuretics、third spacing、adrenal insufficiency；通常 total body Na 與水都低，但 Na loss 較多。", "Urine Na <30 常見於 extrarenal loss；diuretic/renal salt wasting 則可能 urine Na 高。", "治療常以 isotonic saline 補有效循環血量；ADH 下降後 Na 可能快速上升，需防 overcorrection。"]
        : sodiumVolumeStatus === "euvolemic"
          ? ["常見 SIADH、藥物、hypothyroidism、glucocorticoid deficiency、primary polydipsia/low solute intake。", "SIADH 常見 urine Osm >100、urine Na >30，臨床無明顯水腫或脫水。", "治療依原因：fluid restriction、增加 solute、停致病藥；嚴重症狀才用 3% NaCl urgent correction。"]
          : sodiumVolumeStatus === "hypervolemic"
            ? ["常見 heart failure、cirrhosis、nephrotic syndrome、advanced kidney disease；total body Na 與水都高，但水增加更多。", "有效循環血量不足會刺激 ADH，造成 dilutional hyponatremia。", "治療多為 fluid/sodium restriction、loop diuretic、處理原疾病；單純補 NS 常可能更水腫。"]
            : ["先排除 pseudo/translocational hyponatremia：高血糖、mannitol、脂血/高蛋白。", "確認 serum Osm 低後，再看 urine Osm：<100 常見多喝水/低 solute；>100 表示 ADH 仍活躍。", "再用 urine Na 與 volume status 分 hypovolemic/euvolemic/hypervolemic。"]
      : sodiumVolumeStatus === "hypovolemic"
        ? ["常見發燒/出汗、腹瀉、滲透性利尿、diuretics、post-ATN diuresis；水流失多於鈉流失。", "若 shock 或明顯低血容積，先用 isotonic crystalloid resuscitation；穩定後再補 free water。", "計算 free water deficit 只處理水缺口，仍需補 ongoing loss。"]
        : sodiumVolumeStatus === "euvolemic"
          ? ["常見 diabetes insipidus、中樞/腎性 DI、insensible loss 或無法喝水。", "尿量多且 urine Osm 低要考慮 DI；中樞 DI 可評估 desmopressin response。", "治療以 free water（enteral water 或 D5W）為主，並處理原因。"]
          : sodiumVolumeStatus === "hypervolemic"
            ? ["常見 hypertonic saline、sodium bicarbonate、大量鹽分負荷或透析液/輸液 sodium gain。", "病人水和鈉都多，但 sodium gain 更明顯。", "治療常需停止鈉來源、給 free water，必要時合併 loop diuretic 或 dialysis。"]
            : ["高血鈉先問：水不夠、尿太多、還是鈉太多。", "看 volume status、urine output、urine Osm、glucose/urea/osmotic diuresis 與近期 sodium-containing fluids。", "慢性或不明高血鈉通常分 48-72 hr 校正並密集追蹤。"];
    return {
      na, targetInput, weight, age, tbwFactor, tbw, severity, correctionLimit24, correctionGoal24,
      desiredNa, deltaNa, naRisePerL3, naRisePer100Ml3, estimated3PercentMl, bolusCount,
      nsNaChangePerL, hypertonicVolMl, hypertonicMinutes, hypertonicPumpRate, hypertonicNaLoad,
      hypertonicEstimatedRise, hypertonicEstimatedRise24, hypertonicOverLimit,
      suggestedContinuousWindowHours, suggestedHypertonicVolumeMl, suggestedHypertonicMinutes, suggestedHypertonicPumpRate,
      suggestedHypertonicRise, suggestedHypertonicTimeText, suggestedHypertonicNote,
      freeWaterDeficit, ongoingLossL, totalWaterPlan, waterRate, hours,
      sodiumRenalSafetyNote, sodiumMonitoringText, hyperCorrectionLimit24, mechanismTitle, mechanismItems,
    };
  }, [serumNa, targetNa, sodiumWeight, sodiumAge, sodiumSex, sodiumMode, sodiumDuration, sodiumVolumeStatus, sodiumRenalRisk, sodiumSevereSymptoms, sodiumOdsRisk, sodiumOngoingLoss, sodiumCorrectionHours, hypertonicVolume, hypertonicInfusionMinutes]);

  return (
    <div>
      <header style={S.header}>
        <div style={S.kicker}>Electrolyte Disorders</div>
        <h1 style={S.title}>電解質異常工具</h1>
        <div style={S.subtitle}>K、Mg、Phos、Ca、Na 異常處置、補充與監測速查</div>
      </header>

      <section style={S.notice}>
        <div style={S.noticeTitle}>安全提醒</div>
        KCl concentrate 絕不可直接 IV push。高血鉀合併 ECG change、不穩定或 K ≥6.5 屬急症，需心電監測並立即處置。
      </section>

      <section style={S.section}>
        <div style={S.sectionTitle}>院內品項</div>
        <div style={S.productGrid}>
          <div style={S.productBox}>
            <strong>KCl 氯化鉀針 15% 10 mL</strong>
            <span>20 mEq/amp；濃度 2 mEq/mL。屬高濃度原液，需稀釋後才可輸注。</span>
          </div>
          <div style={S.productBox}>
            <strong>KCl 10 mEq 瓶 500 mL</strong>
            <span>KCl 0.149% in 0.9% NaCl 500 mL；商業配方，約 0.02 mEq/mL，輸液量較大。</span>
          </div>
          <div style={S.productBox}>
            <strong>MgSO4 針【紅標】10% 20 mL</strong>
            <span>2 g/amp；16.2 mEq Mg/amp；10% = 0.1 g/mL。常用於 IV 補鎂。</span>
          </div>
          <div style={S.productBox}>
            <strong>MgSO4 瓶 10% 200 mL/Bot</strong>
            <span>20 g/bottle；較少見於一般補鎂醫囑，需依院內流程確認用途。</span>
          </div>
          <div style={S.productBox}>
            <strong>Glycophos 針 20 mL</strong>
            <span>Sodium glycerophosphate；phosphate 1 mmol/mL、sodium 2 mmol/mL。每支 20 mL = phosphate 20 mmol + sodium 40 mmol；不可未稀釋直接給。</span>
          </div>
          <div style={S.productBox}>
            <strong>Calglon 針 1 g/10 mL</strong>
            <span>Calcium gluconate 10%；Ca 0.465 mEq/mL、9.3 mg/mL。每 amp = 4.65 mEq Ca = 93 mg elemental Ca。</span>
          </div>
          <div style={S.productBox}>
            <strong>Vitacal 400 mg/20 mL</strong>
            <span>Calcium chloride；Ca 0.272 mEq/mL。每 amp = 5.4 mEq Ca；另含 glucose-H2O 100 mg/mL。</span>
          </div>
          <div style={S.productBox}>
            <strong>3% 高濃度 NaCl 瓶 500 mL</strong>
            <span>513 mEq/L = 0.513 mEq/mL。低血鈉使用需設定流速並密集追蹤 Na，避免 overcorrection。</span>
          </div>
        </div>
      </section>

      <div style={S.tabBar}>
        {([
          ["k", "K 鉀異常"],
          ["mg", "MgSO4 補鎂"],
          ["phos", "Glycophos 補磷"],
          ["ca", "Calcium 補鈣"],
          ["na", "Na 鈉異常"],
          ["reference", "參考"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            style={{ ...S.tabButton, ...(activeTab === id ? S.tabButtonActive : {}) }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "k" && (<>
      <div style={S.segmented}>
        <button type="button" onClick={() => setPotassiumMode("hypokalemia")} style={{ ...S.segmentButton, ...(potassiumMode === "hypokalemia" ? S.segmentButtonActive : {}) }}>低血鉀補充</button>
        <button type="button" onClick={() => setPotassiumMode("hyperkalemia")} style={{ ...S.segmentButton, ...(potassiumMode === "hyperkalemia" ? S.segmentButtonActive : {}) }}>高血鉀處置</button>
      </div>
      {potassiumMode === "hypokalemia" && (<>
      <div style={S.layoutGrid}>
        <section style={S.section}>
          <div style={S.sectionTitle}>病人資料與補充量</div>
          <div style={S.grid2}>
            <Field label="目前 K" hint="單位 mEq/L">
              <input value={currentK} onChange={(e) => setCurrentK(e.target.value)} inputMode="decimal" style={S.input} />
            </Field>
            <Field label="目標 K" hint="ICU、ACS、digoxin 使用者常會希望至少接近 4.0；請依臨床情境。">
              <input value={targetK} onChange={(e) => setTargetK(e.target.value)} inputMode="decimal" style={S.input} />
            </Field>
            <Field label="腎功能 / 尿量">
              <select value={renalRisk} onChange={(e) => setRenalRisk(e.target.value as RenalRisk)} style={S.select}>
                {Object.entries(renalText).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </Field>
            <Field label="給藥/使用情境">
              <select value={access} onChange={(e) => setAccess(e.target.value as KAccess)} style={S.select}>
                <option value="peripheral">周邊 IV 補鉀</option>
                <option value="central">中心靜脈 / ICU 補鉀</option>
                <option value="crrt">CVVH / CRRT 液體調整</option>
              </select>
            </Field>
            <Field label="自訂補充量" hint="留空則用目前 K 粗估；若醫囑已有補充量可直接輸入。">
              <input value={customDose} onChange={(e) => setCustomDose(e.target.value)} inputMode="numeric" placeholder={`${calc.tableDose || 0}`} style={S.input} />
            </Field>
            <Field label="低 Mg / 疑似 refractory hypokalemia">
              <div style={S.checkboxRow}>
                <input type="checkbox" checked={magLow} onChange={(e) => setMagLow(e.target.checked)} />
                <span>同時提醒補 Mg</span>
              </div>
            </Field>
          </div>
          <label style={S.checkboxRow}>
            <input type="checkbox" checked={symptomatic} onChange={(e) => setSymptomatic(e.target.checked)} />
            <span>有 ECG change、明顯肌無力/麻痺，或醫師判定需 urgent replacement</span>
          </label>

          <div style={S.resultCard}>
            <div style={S.cardTitle}>補鉀估算</div>
            <ResultRow label="低血鉀分級" value={severityText[calc.severity]} highlight={calc.severity !== "none"} />
            <ResultRow label="本次建議補充量" value={calc.dose ? `${calc.dose} mEq KCl` : "目前可先觀察或改口服/飲食補充"} note={renalRisk === "impaired" || renalRisk === "oliguria" ? "腎功能差或少尿時先保守補充並提早複查。" : "依目前 K 粗估；仍需看症狀、ECG、Mg 與腎功能。"} highlight />
            {calc.dose > 0 && (
              <div style={S.sourceNote}>
                {calc.custom > 0
                  ? `目前使用「自訂補充量」${calc.custom} mEq，會覆蓋分級建議。`
                  : renalRisk === "impaired"
                    ? `K ${calc.k} 的原始分級建議為 ${calc.rawTableDose} mEq；因選擇「腎功能差但仍有尿」，工具先保守減半為 ${calc.tableDose} mEq。`
                    : renalRisk === "oliguria"
                      ? `K ${calc.k} 的原始分級建議為 ${calc.rawTableDose} mEq；因選擇「少尿/無尿」，工具先限制單次補充量為 ${calc.tableDose} mEq。`
                      : `K ${calc.k} 依分級建議為 ${calc.tableDose} mEq。`}
              </div>
            )}
            <div style={S.formulaBox}>
              <div style={S.formulaHeader}>
                <span style={S.formulaTitle}>計算依據</span>
                <span style={S.formulaBadge}>rule of thumb</span>
              </div>
              <div style={S.formulaLine}>
                <span>粗估總缺口</span>
                <strong>{calc.deficit ? `約 ${calc.deficit} mEq` : "(目標 K - 目前 K) x 100"}</strong>
              </div>
              <div style={S.formulaHint}>總缺口只用來判斷「可能需要分次補、反覆追蹤」，不是單次醫囑劑量。目標 K 會影響總缺口；下方分級才是依「目前 K」決定本次先補多少。</div>
              <div style={S.doseScale}>
                <div style={S.scaleRow}><span>K 3.2-3.4</span><strong>20 mEq</strong></div>
                <div style={S.scaleRow}><span>K 3.0-3.1</span><strong>40 mEq</strong></div>
                <div style={S.scaleRow}><span>K 2.5-2.9</span><strong>60 mEq</strong></div>
                <div style={S.scaleRow}><span>K &lt;2.5</span><strong>80 mEq</strong></div>
              </div>
            </div>
            <ResultRow label="15% KCl 原液量" value={calc.dose ? `${round(calc.stockMl)} mL，約 ${ceilHalf(calc.amps)} amp` : "-"} note="院內 15% KCl：20 mEq/10 mL = 2 mEq/mL。" />
            <ResultRow label="拆袋建議" value={bagPlan} />
          </div>
        </section>

        <section style={S.section}>
          <div style={S.sectionTitle}>泡製 / 流速檢查</div>
          <div style={S.grid2}>
            <Field label="KCl 原汁支數" hint="留空則沿用本次建議補充量；院內 1 amp = 20 mEq = 10 mL。">
              <input value={prepAmpules} onChange={(e) => setPrepAmpules(e.target.value)} inputMode="decimal" placeholder={calc.dose ? `${round(calc.dose / KCL_MEQ_PER_AMP)} amp` : "例如 1 或 2"} style={S.input} />
            </Field>
            <Field label="預計總稀釋體積" hint="指單次這包輸液的總體積，不含其他維持液。">
              <input value={finalVolume} onChange={(e) => setFinalVolume(e.target.value)} inputMode="numeric" style={S.input} />
            </Field>
            <Field label="預計輸注時間" hint="小時">
              <input value={infusionHours} onChange={(e) => setInfusionHours(e.target.value)} inputMode="decimal" style={S.input} />
            </Field>
          </div>

          {access === "crrt" && (
            <div style={S.crrtBox}>
              <div style={S.cardTitle}>CVVH / CRRT 液體調鉀</div>
              <div style={S.protocolBox}>
                <div style={S.protocolTitle}>院內 CVVH KCl supplement protocol</div>
                <div style={S.protocolRule}>
                  <span>If serum K &lt; 4.5 mEq/L</span>
                  <strong>CVVH solution 每袋加 KCl 20 mEq</strong>
                </div>
                <div style={S.protocolRule}>
                  <span>If serum K &gt;= 4.5 mEq/L</span>
                  <strong>不加 KCl</strong>
                </div>
                <div style={S.protocolHint}>醫囑頻率：Q8H PRN。套餐中的 Prismasol B0 Solution 15000 mL 可視為 3 袋 5000 mL；KCl 30 mL 剛好是三袋各加 20 mEq。</div>
              </div>
              <div style={S.resultCard}>
                <ResultRow
                  label="依院內 protocol"
                  value={calc.k && calc.k < 4.5 ? "每袋加 KCl 20 mEq（15% KCl 10 mL = 1 amp）" : calc.k >= 4.5 ? "K >= 4.5 mEq/L：不加 KCl" : "請輸入目前 K"}
                  note="此為院內 CVVH KCl supplement：K <4.5 每袋加 20 mEq；K >=4.5 不加。"
                  highlight
                />
                <ResultRow
                  label="若開 Prismasol B0 15000 mL"
                  value={calc.k && calc.k < 4.5 ? "KCl 30 mL（60 mEq = 3 amp）加入 15000 mL；等於每 5000 mL 加 20 mEq" : calc.k >= 4.5 ? "不加 KCl" : "請輸入目前 K"}
                  note="依提供的院內套餐換算；實際仍依當次醫囑與護理/CRRT流程。"
                />
                <ResultRow
                  label="Prismasol B0 / B4 怎麼看"
                  value="B0 是 0K solution；B4 是 4K solution。若同時接在不同 replacement line，病人看到的 K 暴露會取決於各自流速比例；若只是擇一使用，就不應把兩者濃度相加。"
                  note="套餐同時列品項不一定代表每位病人兩種都同時跑，需看實際機器設定與醫囑。"
                />
              </div>
              <div style={S.grid2}>
                <Field label="每袋液體體積" hint="Prismasol 常見 5000 mL；若用 B0 15000 mL 套餐，可視為 3 袋。">
                  <input value={crrtBagVolume} onChange={(e) => setCrrtBagVolume(e.target.value)} inputMode="numeric" style={S.input} />
                </Field>
                <Field label="原液 K 濃度" hint="看袋身標示，常見 0、2、4 mEq/L。">
                  <input value={crrtBaseK} onChange={(e) => setCrrtBaseK(e.target.value)} inputMode="decimal" style={S.input} />
                </Field>
                <Field label="目標液體 K 濃度" hint="這是 CVVH solution 濃度，不是血清 K 目標。">
                  <input value={crrtTargetFluidK} onChange={(e) => setCrrtTargetFluidK(e.target.value)} inputMode="decimal" style={S.input} />
                </Field>
                <Field label="CVVH replacement flow" hint="對應套餐的 replacement order，例如 2000、2500、3000 mL/hr。">
                  <input value={crrtFluidRate} onChange={(e) => setCrrtFluidRate(e.target.value)} inputMode="numeric" style={S.input} />
                </Field>
              </div>
              <div style={S.resultCard}>
                <ResultRow label="計算公式" value="(目標液體 K - 原液 K) x 袋量(L)" />
                <ResultRow label="本袋需加入 KCl" value={calc.crrtAddMeq > 0 ? `${calc.crrtAddMeq} mEq = 15% KCl ${round(calc.crrtAddMl)} mL，約 ${ceilHalf(calc.crrtAmpules)} amp` : "不需加 KCl，或目標濃度低於原液濃度"} highlight />
                <ResultRow label="這袋約可跑多久" value={calc.crrtBagHours ? `約 ${round(calc.crrtBagHours, 1)} hr` : "請輸入液體流速"} note={calc.crrtExtraMeqHr ? `相較原液，等於額外提供約 ${calc.crrtExtraMeqHr} mEq/hr 的 K。` : "若原液 K 已達目標，沒有額外補鉀量。"} />
              </div>
              <div style={S.warning}>
                KCl 加入 CVVH solution 後要充分混合並清楚標示。這是調整 replacement fluid 濃度，不是把 KCl 直接給病人；若血清 K 快速變化、少尿/無尿或有 arrhythmia risk，需依醫囑提早複查。
              </div>
            </div>
          )}

          <div style={S.resultCard}>
            <div style={S.cardTitle}>目前設定檢查</div>
            <ResultRow label="本包 KCl 量" value={calc.prepDose ? `${calc.prepDose} mEq（原汁 ${round(calc.prepStockMl)} mL）` : "請輸入支數或補充量"} note={prepAmpules ? "依 KCl 原汁支數計算。" : "目前沿用上方本次建議補充量。"} highlight={!!prepAmpules} />
            <ResultRow
              label="院內套餐常用泡法"
              value={access === "central" ? "CVC：KCl 20 mEq in NS 100 mL，run >1 hr；限水可 50 mL。" : access === "peripheral" ? "周邊 line：KCl 20 mEq in NS 250 mL，run >1 hr。" : "CVVH：KCl 加入 CVVH solution，不是一般 IV 輸注。"}
              note="依你提供的 ICU 套餐整理；實際仍需依病人狀況、line、ECG 風險與醫囑。"
              highlight
            />
            <ResultRow label="建議速率 / 約需時間" value={calc.prepDose ? calc.suggestedText : "請輸入支數或補充量"} note={access === "peripheral" ? "周邊 IV 常用 10 mEq/hr。" : access === "central" ? "中心靜脈 / ICU 常用 20 mEq/hr；更高速率需監測與醫囑。" : "不可用一般 IV 補鉀速率套用。"} highlight />
            <ResultRow label="濃度" value={calc.volume ? `${round(calc.concentration, 3)} mEq/mL` : "請輸入體積"} note={calc.concentrationGuide} highlight={calc.overPeripheralConc} />
            <ResultRow label="補鉀速率" value={calc.hours ? `${round(calc.rateMeqHr)} mEq/hr` : "請輸入時間"} note={`此情境常用上限約 ${calc.maxRate} mEq/hr；更高速率需 ICU/心電監測與醫囑。`} highlight={calc.overRate} />
            <ResultRow label="Pump rate" value={calc.hours && calc.volume ? `${round(calc.pumpRate)} mL/hr` : "請輸入體積與時間"} />
          </div>

          {(calc.overRate || calc.overPeripheralConc || calc.urgent || magLow || access === "crrt") && (
            <div style={S.warning}>
              {calc.overPeripheralConc && <p>周邊 IV 濃度偏高，建議拆袋或增加稀釋體積，避免疼痛與靜脈炎。</p>}
              {calc.overRate && <p>目前設定的 mEq/hr 高於此情境常用速率，請改慢、拆袋，或確認是否為中心靜脈與心電監測下的 urgent replacement。</p>}
              {calc.urgent && <p>嚴重低血鉀或有症狀時，需連續心電監測、提早複查 K/Mg，並同步找出持續流失原因。</p>}
              {magLow && <p>低 Mg 會讓低血鉀難以矯正；若 Mg 偏低，通常需同步補 Mg。</p>}
              {access === "crrt" && <p>CVVH 使用 KCl 原汁時，是加入 CVVH solution / replacement fluid 並充分混合；不可把原汁 KCl 直接接給病人。</p>}
            </div>
          )}
        </section>
      </div>
      <ClinicalReference>
        <h3 style={S.refHeading}>整體原則</h3>
        <p>電解質補充不只看單一數值，還要同時看症狀、ECG、腎功能/尿量、酸鹼狀態、是否持續流失，以及是否正在 CRRT。工具中的建議量是「本次先補多少」的粗估，補完後需依複查值與趨勢再調整。</p>
        <h3 style={S.refHeading}>KCl concentrate 的底線</h3>
        <p>KCl concentrate 必須稀釋後才能 IV infusion；未稀釋直接注射可能造成致命心律不整或心跳停止。若 serum K &gt;2.5 mEq/L，仿單常見上限為 10 mEq/hr、濃度最高 40 mEq/L；若 K &lt;2 mEq/L 且有 ECG change 或 paralysis，才考慮在連續心電監測下更高速率。</p>
        <h3 style={S.refHeading}>為什麼優先用 NS？</h3>
        <p>嚴重低血鉀時，dextrose-containing fluid 可能刺激 insulin 分泌並讓 K 短暫往細胞內移動；除非有其他理由，critical replacement 通常偏好用 saline 稀釋。</p>
        <h3 style={S.refHeading}>院內套餐常用 KCl 泡法</h3>
        <Bullets items={[
          "CVC：KCl 20 mEq in NS 100 mL，run >1 hr；限水病人可用 NS 50 mL。",
          "周邊 line：KCl 20 mEq in NS 250 mL，run >1 hr；若疼痛或靜脈炎風險高，需放慢或增加稀釋體積。",
          "上述為你提供的 ICU 套餐常用寫法；若要補更大量，通常分袋、分次並依 K trend 調整。",
        ]} />
        <h3 style={S.refHeading}>補鉀前後要一起看的東西</h3>
        <Bullets items={[
          "Mg：低 Mg 會造成 renal K wasting，常讓低血鉀補不起來。",
          "腎功能與尿量：少尿/無尿時補鉀要非常保守，並提早複查。",
          "酸鹼與血糖/insulin：鹼中毒、insulin、beta-agonist 會讓 K 往細胞內移動。",
          "ECG 與用藥：digoxin、QT/arrhythmia risk、利尿劑、laxative、amphotericin B 都會影響風險判斷。",
        ]} />
        <h3 style={S.refHeading}>CVVHDF 與電解質</h3>
        <p>院內小白畫面屬 CVVHDF，會同時有 pre-dilution、dialysate、post-replacement 與病人脫水量。抗生素調整常看的「流速」多半是 effluent 或 CRRT dose，代表清除能力；KCl 加到 Prismasol B0 則是調整 replacement/CRRT fluid 的 K 濃度，兩者不是同一件事。</p>
        <Bullets items={[
          "院內 CVVH KCl supplement：K <4.5 mEq/L 時，CVVH solution 每袋加 KCl 20 mEq；K >=4.5 mEq/L 不加。",
          "Prismasol B0 是 0K；每 5000 mL 加 KCl 20 mEq 後約變成 4K solution。",
          "CRRT 可持續清除 K/Mg/Phos，因此 sepsis、DKA、refeeding 或高 effluent rate 時可能需要反覆補充與追蹤。",
        ]} />
      </ClinicalReference>
      </>)}

      {potassiumMode === "hyperkalemia" && (<>
      <section style={S.section}>
        <div style={S.sectionTitle}>高血鉀處置</div>
        <div style={S.layoutGrid}>
          <div>
            <div style={S.grid2}>
              <Field label="目前 K" hint="單位 mEq/L">
                <input value={hyperK} onChange={(e) => setHyperK(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="腎功能 / 尿量">
                <select value={hyperKRenalRisk} onChange={(e) => setHyperKRenalRisk(e.target.value as RenalRisk)} style={S.select}>
                  {Object.entries(renalText).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </Field>
              <Field label="目前血糖" hint="mg/dL；用來提醒 insulin/glucose 後低血糖風險。">
                <input value={hyperKGlucose} onChange={(e) => setHyperKGlucose(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
            </div>
            <label style={S.checkboxRow}>
              <input type="checkbox" checked={hyperKEcgChange} onChange={(e) => setHyperKEcgChange(e.target.checked)} />
              <span>有 ECG change：peaked T、PR prolongation、QRS widening、sine wave、VT/VF 等</span>
            </label>
            <label style={S.checkboxRow}>
              <input type="checkbox" checked={hyperKWeakness} onChange={(e) => setHyperKWeakness(e.target.checked)} />
              <span>有肌肉無力或麻痺等高血鉀臨床表現</span>
            </label>
            <label style={S.checkboxRow}>
              <input type="checkbox" checked={hyperKUnstable} onChange={(e) => setHyperKUnstable(e.target.checked)} />
              <span>臨床不穩定 / arrhythmia / peri-arrest</span>
            </label>
            <label style={S.checkboxRow}>
              <input type="checkbox" checked={hyperKPseudoRisk} onChange={(e) => setHyperKPseudoRisk(e.target.checked)} />
              <span>懷疑假性高血鉀：hemolysis、抽血困難、血小板/白血球很高、採檢延遲等</span>
            </label>
            <label style={S.checkboxRow}>
              <input type="checkbox" checked={hyperKOngoingLoad} onChange={(e) => setHyperKOngoingLoad(e.target.checked)} />
              <span>持續 K load / tissue breakdown：rhabdomyolysis、crush injury、TLS、明顯 GI bleeding 等</span>
            </label>
            <label style={S.checkboxRow}>
              <input type="checkbox" checked={hyperKImpendingSurgery} onChange={(e) => setHyperKImpendingSurgery(e.target.checked)} />
              <span>即將手術 / 需要術前快速最佳化</span>
            </label>
            <label style={S.checkboxRow}>
              <input type="checkbox" checked={hyperKAcidosis} onChange={(e) => setHyperKAcidosis(e.target.checked)} />
              <span>合併明顯 metabolic acidosis</span>
            </label>

            <div style={S.resultCard}>
              <div style={S.cardTitle}>分級與第一步</div>
              <ResultRow label="高血鉀分級" value={hyperKSeverityText[hyperKCalc.severity]} highlight={hyperKCalc.severity !== "none"} />
              <ResultRow label="處置層級" value={hyperKCalc.disposition} highlight={hyperKCalc.emergency || hyperKCalc.promptLower || hyperKCalc.repeatFirst} />
              <ResultRow label="UpToDate 急症條件" value={hyperKCalc.emergencyFromLoad ? "符合：K >5.5 + 腎功能受損 + 持續組織崩解/鉀吸收" : hyperKCalc.manifestation ? "符合：有臨床表現或心臟傳導/心律問題" : hyperKCalc.k > 6.5 ? "符合：K >6.5" : "目前未符合急症條件"} highlight={hyperKCalc.emergency} />
              <ResultRow label="監測 / 複查" value={hyperKCalc.monitoringAction} highlight={hyperKCalc.emergency || hyperKCalc.promptLower || hyperKCalc.k >= 6} />
            </div>

            <div style={S.resultCard}>
              <div style={S.cardTitle}>假性高血鉀檢查</div>
              <ResultRow
                label="是否先重抽"
                value={hyperKCalc.repeatFirst ? "建議先重抽確認，但若 ECG change/不穩定不可延誤治療" : "若無疑點可按真性高血鉀處理；仍需看臨床與 ECG"}
                highlight={hyperKCalc.repeatFirst}
              />
              <Bullets items={[
                "採血 hemolysis、抽血困難、細針、用力拍打/反覆擠壓、檢體放太久。",
                "抽血時握拳太久、止血帶綁太久。",
                "從正在輸 KCl 或含 K line 附近抽血。",
                "Marked thrombocytosis 或 leukocytosis：serum K 可能假高，必要時比對 plasma K 或 blood gas K。",
                "若 K >6.5、ECG change、肌肉無力/麻痺或病人不穩定，先急救處置，不要為了確認假性而延誤。",
              ]} />
            </div>
          </div>

          <div>
            <div style={S.resultCard}>
              <div style={S.cardTitle}>立即處置</div>
              <ResultRow label="1. 保護心肌" value={hyperKCalc.calciumAction} highlight={hyperKEcgChange || hyperKUnstable} />
              <ResultRow label="2. 移鉀進細胞" value={hyperKCalc.insulinAction} highlight={hyperKCalc.treatShift} />
              <ResultRow label="低血糖預防" value={hyperKCalc.glucoseAction} highlight={hyperKCalc.treatShift && hyperKCalc.glucose > 0 && hyperKCalc.glucose < 126} />
              <ResultRow label="Beta-agonist" value={hyperKCalc.betaAgonistAction} />
              <ResultRow label="NaHCO3" value={hyperKCalc.bicarbonateAction} highlight={hyperKAcidosis} />
              <ResultRow label="NaHCO3 常見劑量" value={hyperKCalc.bicarbonateDose} highlight={hyperKAcidosis} />
              <DetailBox title="Rolikan 7% 換算" summary="50 mEq ≈ 60 mL ≈ 3 amp">
                <div style={S.detailGrid}>
                  <div style={S.detailItem}><span>Rolikan 針</span><strong>7% 20 mL/Amp = {ROLIKAN_MEQ_PER_AMP} mEq</strong></div>
                  <div style={S.detailItem}><span>Rolikan 常備瓶</span><strong>7% 250 mL/bot ≈ {round(ROLIKAN_BOT_MEQ)} mEq</strong></div>
                  <div style={S.detailItem}><span>50 mEq</span><strong>{round(50 / ROLIKAN_MEQ_PER_ML)} mL ≈ {round(50 / ROLIKAN_MEQ_PER_AMP, 1)} amp，IV over 5-10 min</strong></div>
                  <div style={S.detailItem}><span>100-150 mEq</span><strong>{round(100 / ROLIKAN_MEQ_PER_ML)}-{round(150 / ROLIKAN_MEQ_PER_ML)} mL ≈ {round(100 / ROLIKAN_MEQ_PER_AMP, 1)}-{round(150 / ROLIKAN_MEQ_PER_AMP, 1)} amp</strong></div>
                  <div style={S.detailItemWide}><span>Infusion option</span><strong>D5W 1 L + NaHCO3 150 mEq，可作 isotonic bicarbonate infusion；避免 volume overload 時謹慎。</strong></div>
                </div>
              </DetailBox>
            </div>
            <div style={S.resultCard}>
              <div style={S.cardTitle}>排鉀與預防 rebound</div>
              <ResultRow label="排鉀策略" value={hyperKCalc.eliminationAction} highlight={hyperKRenalRisk === "oliguria" || hyperKRenalRisk === "crrt"} />
              <ResultRow label="Potassium binder" value={hyperKCalc.binderAction} />
              <ResultRow label="院內 binder 劑量" value={hyperKCalc.binderDose} highlight={hyperKCalc.k >= 5.5} />
              <DetailBox title="Kalimate / Lokelma 劑量" summary="點開看 packs 換算">
                <div style={S.detailGrid}>
                  <div style={S.detailItem}><span>Kalimate</span><strong>5 g/pack</strong></div>
                  <div style={S.detailItem}><span>常用劑量</span><strong>15-30 g/day PO 分 2-3 次 = 3-6 packs/day</strong></div>
                  <div style={S.detailItem}><span>泡法</span><strong>每次以 30-50 mL 水懸浮</strong></div>
                  <div style={S.detailItem}><span>Lokelma</span><strong>5 g/pack</strong></div>
                  <div style={S.detailItem}><span>初始</span><strong>10 g PO TID up to 48 hr = 每次 2 packs</strong></div>
                  <div style={S.detailItem}><span>維持</span><strong>5-10 g QD，依 K 調整</strong></div>
                  <div style={S.detailItemWide}><span>Lokelma sodium load</span><strong>每 5 g 約含 Na 400 mg；10 g TID 約 2400 mg Na/day。心衰、CKD/少尿、水腫或限鈉病人需監測 fluid retention。</strong></div>
                </div>
              </DetailBox>
              <ResultRow label="停止來源" value="停 KCl supplement、含 K 輸液/TPN、salt substitute；檢查 ACEi/ARB/ARNI、MRA、NSAID、TMP-SMX、heparin、calcineurin inhibitor 等。" />
            </div>
            {(hyperKCalc.emergency || hyperKCalc.promptLower || hyperKCalc.repeatFirst || hyperKRenalRisk !== "normal" || hyperKAcidosis) && (
              <div style={S.warning}>
                {hyperKCalc.emergency && <p>高血鉀急症重點是先保護心肌與移鉀，再安排排鉀；insulin/beta-agonist 只是暫時移鉀，若沒有排鉀會 rebound。</p>}
                {hyperKCalc.promptLower && <p>目前屬於需要 6-12 小時內迅速降鉀的情境；若沒有急症表現，通常不一定要立即 calcium/insulin/glucose，但要有明確排鉀與複查計畫。</p>}
                {hyperKCalc.repeatFirst && <p>目前符合「可能假性」且未達急症條件，建議重抽確認；但若 ECG 或臨床惡化，立即升級處置。</p>}
                {hyperKRenalRisk !== "normal" && <p>腎功能差、少尿/無尿或 CRRT 中，治療後 K rebound 風險高，需更密集追蹤並確認排鉀策略。</p>}
                {hyperKAcidosis && <p>合併酸中毒時 NaHCO3 可作輔助，但仍需 calcium/insulin/glucose/排鉀等主要處置。</p>}
              </div>
            )}
          </div>
        </div>
      </section>
      <ClinicalReference>
        <h3 style={S.refHeading}>分級與核心原則</h3>
        <p>高血鉀通常以 K 5.5-5.9、6.0-6.4、≥6.5 mEq/L 分成 mild、moderate、severe。UpToDate 的分流重點不是只看數字，而是先看有無臨床表現、ECG/cardiac manifestation、K 是否 &gt;6.5，以及是否合併腎功能受損與持續鉀負荷。</p>
        <Bullets items={[
          "Hyperkalemic emergency：有肌肉無力/麻痺、ECG change/arrhythmia、K >6.5，或 K >5.5 + significant kidney impairment + ongoing tissue breakdown/ongoing potassium absorption。",
          "Prompt lowering：若 K >5.5 且 ESKD/oliguria，或需要術前快速最佳化，通常目標在 6-12 hr 內降鉀，但不一定需要 rapid calcium/insulin/glucose。",
          "Slow lowering：多數慢性 CKD 或 RAS inhibitor 相關輕度高血鉀，可處理原因、飲食/輸入、diuretic/bicarbonate/binder。",
          "保護心肌：IV calcium 只穩定心肌，不會降低血鉀；有 ECG change 或 peri-arrest 時不要等。部分專家只在 ECG change 時給 calcium。",
          "移鉀進細胞：insulin/glucose 與 beta-agonist 可快速降低 serum K，但效果是暫時的。",
          "排鉀：binder、diuretic、dialysis/CRRT 才是移除體內 K；若排鉀不足，K 會 rebound。",
          "監測：治療後需複查 K 與血糖；腎衰竭、少尿/無尿或使用 insulin 後低血糖風險較高。",
        ]} />
        <h3 style={S.refHeading}>常見高血鉀原因</h3>
        <Bullets items={[
          "細胞釋放增加：metabolic acidosis、insulin deficiency / hyperglycemia / hyperosmolality、rhabdomyolysis/crush injury/TLS、beta blocker、exercise、hyperkalemic periodic paralysis。",
          "其他細胞釋放或鉀負荷：digoxin toxicity、red cell transfusion、succinylcholine、arginine hydrochloride、calcineurin inhibitor、鉀補充或 salt substitute。",
          "尿中排鉀下降：acute/chronic kidney disease、hypoaldosteronism、aldosterone resistance、有效動脈血容積不足造成 distal Na/water delivery 下降。",
          "低醛固酮相關：diabetic nephropathy、NSAIDs、calcineurin inhibitors、ACEi/ARB/direct renin inhibitor、chronic heparin therapy、primary adrenal insufficiency、severe illness。",
          "Aldosterone resistance / ENaC inhibition：spironolactone、eplerenone、amiloride、triamterene、trimethoprim、pentamidine。",
        ]} />
        <h3 style={S.refHeading}>假性高血鉀</h3>
        <p>假性高血鉀常來自採檢或檢體處理問題，也可能發生在血小板或白血球極高的病人。若病人穩定、ECG 正常且數值與臨床不符，應重抽確認；但不能因此延誤真正的高血鉀急救。</p>
        <Bullets items={[
          "採血 hemolysis、抽血太困難、細針、檢體搖晃或處理延遲。",
          "止血帶太久、握拳太久、反覆拍打或擠壓。",
          "從含鉀輸液附近或正在補 K 的 line 抽血。",
          "Thrombocytosis / leukocytosis：可比較 serum K、plasma K 或 blood gas K。",
        ]} />
        <h3 style={S.refHeading}>常見處置劑量提醒</h3>
        <Bullets items={[
          "Calcium gluconate 10%：常用 1000 mg（10 mL）IV over 2-3 min；若 ECG 未改善可重複。院內品項：Calglon 針 1 g/10 mL。UKKA severe hyperkalemia 另列 calcium gluconate 10% 30 mL over 10 min，實際依 local protocol。",
          "Regular insulin：常用 10 units IV + glucose 25 g IV；若血糖 >250 mg/dL 可考慮不給 glucose。常需接 D10W 50-75 mL/hr 並監測血糖 5-6 hr。",
          "Nebulized salbutamol/albuterol：常用 10-20 mg，可作輔助移鉀；單獨效果不可靠。",
          `NaHCO3：主要用於合併明顯 metabolic acidosis，不建議 routine 單獨作降 K。院內品項 Rolikan 7% 20 mL/Amp = ${ROLIKAN_MEQ_PER_AMP} mEq/amp、${ROLIKAN_MEQ_PER_ML} mEq/mL；Rolikan 7% 250 mL/bot 約 ${round(ROLIKAN_BOT_MEQ)} mEq/bot。常見先給 50 mEq（約 ${round(50 / ROLIKAN_MEQ_PER_ML)} mL，約 ${round(50 / ROLIKAN_MEQ_PER_AMP, 1)} amp）IV over 5-10 min，依 pH/HCO3/Na 可重複至 100-150 mEq。需注意 sodium/volume load、alkalosis 與 ionized Ca 下降。`,
          "Kalimate（calcium polystyrene sulfonate）5 g/pack：常用 15-30 g/day PO 分 2-3 次，約 3-6 packs/day；每次以 30-50 mL 水懸浮。腸阻塞、嚴重便秘或術後腸麻痺風險需避免或謹慎。",
          "Lokelma（sodium zirconium cyclosilicate）5 g/pack：初始常用 10 g PO TID up to 48 hr（每次 2 packs）；維持常用 5-10 g QD，依 K 調整。每 5 g 約含 sodium 400 mg；10 g TID 時約 2400 mg Na/day，心衰、CKD/少尿、水腫或限鈉病人需監測 fluid retention。",
          "Loop diuretic：非少尿、容量允許或高血容量時可考慮；UpToDate 例子包含 furosemide 40 mg q12h，需依尿量與容量狀態調整。",
          "Dialysis/RRT：少尿/無尿、嚴重 AKI/ESRD、K ≥6.5 且反覆 rebound 或藥物無效時需及早評估。",
        ]} />
        <h3 style={S.refHeading}>主要參考</h3>
        <p>架構參考 UK Kidney Association Clinical Practice Guideline: Management of Hyperkalaemia in Adults, 2023 update，並依UpToDate 急性高血鉀治療流程補充分流條件；實際品項、濃度與流程仍以院內規範為準。</p>
      </ClinicalReference>
      </>)}
      </>)}

      {activeTab === "mg" && (<>
      <section style={S.section}>
        <div style={S.sectionTitle}>MgSO4 補鎂速查</div>
        <div style={S.layoutGrid}>
          <div>
            <div style={S.grid2}>
              <Field label="目前 Mg">
                <input value={serumMg} onChange={(e) => setSerumMg(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="目標 Mg" hint="只作參考目標；補鎂劑量仍以濃度分級、症狀與腎功能決定。">
                <input value={targetMg} onChange={(e) => setTargetMg(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="Mg 單位">
                <select value={mgUnit} onChange={(e) => setMgUnit(e.target.value as MgUnit)} style={S.select}>
                  <option value="mgdl">mg/dL</option>
                  <option value="mmoll">mmol/L</option>
                </select>
              </Field>
              <Field label="腎功能 / 尿量">
                <select value={mgRenalRisk} onChange={(e) => setMgRenalRisk(e.target.value as RenalRisk)} style={S.select}>
                  {Object.entries(renalText).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </Field>
              <Field label="自訂 MgSO4 劑量" hint="留空則依 Mg 值與症狀粗估。">
                <input value={mgCustomDose} onChange={(e) => setMgCustomDose(e.target.value)} inputMode="decimal" placeholder={`${mgCalc.renalAdjustedDose || 0}`} style={S.input} />
              </Field>
            </div>
            <label style={S.checkboxRow}>
              <input type="checkbox" checked={mgSymptoms} onChange={(e) => setMgSymptoms(e.target.checked)} />
              <span>有症狀：arrhythmia、tetany、seizure、明顯 neuromuscular irritability</span>
            </label>
            <label style={S.checkboxRow}>
              <input type="checkbox" checked={mgTorsades} onChange={(e) => setMgTorsades(e.target.checked)} />
              <span>Torsades / severe arrhythmia 急救情境</span>
            </label>

            <div style={S.resultCard}>
              <div style={S.cardTitle}>補鎂估算</div>
              <ResultRow label="換算 Mg" value={mgCalc.enteredMg ? `${round(mgCalc.mgDl, 2)} mg/dL` : "請輸入 Mg"} />
              <ResultRow label="低血鎂分級" value={mgSeverityText[mgCalc.severity]} highlight={mgCalc.severity !== "none"} />
              <ResultRow
                label="本次建議補充量"
                value={mgCalc.doseG ? `MgSO4 ${mgCalc.doseG} g` : "可觀察、口服補充，或依低血鉀/臨床情境評估"}
                note={mgRenalRisk === "impaired" || mgRenalRisk === "oliguria" ? "腎功能差或少尿時先保守減量，並追蹤 Mg、K、Ca、DTR/呼吸與血壓。" : "需同時評估 K、Ca、腎功能、症狀與持續流失原因。"}
                highlight
              />
              {mgCalc.doseG > 0 && (
                <div style={S.sourceNote}>
                  {mgCalc.custom > 0
                    ? `目前使用自訂 MgSO4 ${mgCalc.custom} g，會覆蓋分級建議。`
                    : (mgRenalRisk === "impaired" || mgRenalRisk === "oliguria")
                      ? `原始建議 MgSO4 ${mgCalc.rawDose} g；因腎功能/尿量風險，先保守調整為 ${mgCalc.renalAdjustedDose} g。`
                      : `依目前 Mg 值與症狀，粗估 MgSO4 ${mgCalc.renalAdjustedDose} g。`}
                </div>
              )}
              <div style={S.formulaBox}>
                <div style={S.formulaHeader}>
                  <span style={S.formulaTitle}>補鎂算法依據</span>
                  <span style={S.formulaBadge}>serum Mg guided</span>
                </div>
                <div style={S.formulaLine}>
                  <span>目標 Mg</span>
                  <strong>{mgCalc.enteredTarget ? `${round(mgCalc.targetMgDl, 2)} mg/dL` : "常用 1.8-2.0 mg/dL"}</strong>
                </div>
                <div style={S.formulaLine}>
                  <span>距離目標</span>
                  <strong>{mgCalc.targetGap ? `約差 ${round(mgCalc.targetGap, 2)} mg/dL` : "已達目標或未輸入"}</strong>
                </div>
                <div style={S.formulaHint}>Mg 多在細胞內與骨骼中，血清 Mg 不像 K 那樣能用簡單 deficit 公式換算總缺口；本工具以目前 Mg 分級、症狀、torsades 與腎功能決定本次先補多少。</div>
                <div style={S.doseScale}>
                  <div style={S.scaleRow}><span>Mg 1.6-1.7</span><strong>1 g</strong></div>
                  <div style={S.scaleRow}><span>Mg 1.2-1.5</span><strong>2 g</strong></div>
                  <div style={S.scaleRow}><span>Mg &lt;1.2 或有症狀</span><strong>4 g</strong></div>
                  <div style={S.scaleRow}><span>Torsades</span><strong>1-2 g stat</strong></div>
                </div>
                <div style={S.formulaHint}>若合併 refractory hypokalemia，即使 Mg 只是低正常或輕度偏低，也可考慮先補 1-2 g；腎功能差或少尿時通常先保守減量並提早複查。</div>
              </div>
              <ResultRow label="院內 10% MgSO4 原液量" value={mgCalc.doseG ? `${round(mgCalc.stockMl)} mL，約 ${round(mgCalc.ampules, 1)} amp` : "-"} note="10% MgSO4：0.1 g/mL；紅標 20 mL = 2 g/amp = 16.2 mEq Mg/amp。" />
              <ResultRow label="mmol / mEq 換算" value={mgCalc.doseG ? `約 ${round(mgCalc.mmol)} mmol Mg，${round(mgCalc.meq, 1)} mEq Mg` : "-"} note="依院內標示：MgSO4 2 g/amp = 16.2 mEq Mg；1 g 約 8.1 mEq Mg。" />
            </div>
          </div>

          <div>
            <div style={S.grid2}>
              <Field label="預計稀釋體積" hint="例如 50-100 mL NS/D5W；依院內流程。">
                <input value={mgDiluentVolume} onChange={(e) => setMgDiluentVolume(e.target.value)} inputMode="numeric" style={S.input} />
              </Field>
              <Field label="預計輸注時間" hint="小時；急救情境可用分鐘換算成小數。">
                <input value={mgInfusionHours} onChange={(e) => setMgInfusionHours(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
            </div>
            <div style={S.resultCard}>
              <div style={S.cardTitle}>泡製 / 流速檢查</div>
              <ResultRow label="常用速率" value={mgCalc.usualRate} highlight />
              <ResultRow label="目前速率" value={mgCalc.hours ? `${round(mgCalc.rateGhr, 2)} g/hr` : "請輸入輸注時間"} note="非急救情境通常避免太快，以免 flushing、低血壓。" highlight={mgCalc.overRate} />
              <ResultRow label="濃度" value={mgCalc.volume ? `${round(mgCalc.concentration, 3)} g/mL` : "請輸入稀釋體積"} note="周邊 IV 建議不要太濃；10% MgSO4 原液為 0.1 g/mL。" highlight={mgCalc.highConcentration} />
              <ResultRow label="Pump rate" value={mgCalc.volume && mgCalc.hours ? `${round(mgCalc.pumpRate)} mL/hr` : "請輸入體積與時間"} />
            </div>
            {(mgCalc.overRate || mgCalc.highConcentration || mgTorsades || mgSymptoms || mgRenalRisk !== "normal") && (
              <div style={S.warning}>
                {mgCalc.overRate && <p>目前 MgSO4 速率高於一般非急救補鎂常用速率；若不是 torsades/seizure 等急救情境，建議放慢或拆次。</p>}
                {mgCalc.highConcentration && <p>目前濃度偏高；周邊 IV 建議增加稀釋體積或依院內高警訊藥品流程。</p>}
                {mgTorsades && <p>Torsades/severe arrhythmia 可先 MgSO4 1-2 g 快速給予，之後仍需追蹤 Mg/K/Ca 與 ECG，並處理誘因。</p>}
                {mgSymptoms && <p>有症狀低血鎂需 ECG/血壓監測，並同步矯正 K、Ca。</p>}
                {mgRenalRisk !== "normal" && <p>腎功能差、少尿或 CRRT 中，Mg 可能累積或被 CRRT 清除，請依趨勢調整並提早複查。</p>}
              </div>
            )}
          </div>
        </div>
      </section>
      <ClinicalReference>
        <h3 style={S.refHeading}>MgSO4 補鎂重點</h3>
        <p>低血鎂會讓低血鉀難以矯正，也可能造成 QT prolongation、arrhythmia、tetany 或 seizure。MgSO4 劑量臨床常用 g 表示，而不是 mEq；院內紅標 10% 20 mL/Amp = 2 g = 16.2 mEq Mg。</p>
        <Bullets items={[
          "非急救補鎂常用 1-2 g IV over 1 hr；較明顯低鎂或持續流失可 4-8 g over 12-24 hr。",
          "Torsades 或 severe arrhythmia 可先 MgSO4 1-2 g 快速給予，之後再依 Mg/K/Ca 與 ECG 慢速補足。",
          "腎功能差、少尿或高 Mg 風險時需保守減量，並監測低血壓、DTR 下降、呼吸抑制等毒性。",
          "低 Mg 會造成 refractory hypokalemia，補 K 補不起來時要回頭看 Mg。",
        ]} />
      </ClinicalReference>
      </>)}

      {activeTab === "phos" && (<>
      <section style={S.section}>
        <div style={S.sectionTitle}>Phosphate / Glycophos 補磷速查</div>
        <div style={S.layoutGrid}>
          <div>
            <div style={S.grid2}>
              <Field label="目前 Phos">
                <input value={serumPhos} onChange={(e) => setSerumPhos(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="目標 Phos" hint="只作追蹤目標；本次補充量以目前 Phos 分級與體重估算。">
                <input value={targetPhos} onChange={(e) => setTargetPhos(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="Phos 單位">
                <select value={phosUnit} onChange={(e) => setPhosUnit(e.target.value as MgUnit)} style={S.select}>
                  <option value="mgdl">mg/dL</option>
                  <option value="mmoll">mmol/L</option>
                </select>
              </Field>
              <Field label="體重" hint="IV phosphate 常用 mmol/kg 估算；肥胖或特殊族群需個別評估。">
                <input value={phosWeight} onChange={(e) => setPhosWeight(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="Total Ca" hint="可選填，單位 mg/dL；用來估 Ca x Phos product，請勿填 ionized calcium。">
                <input value={serumCalcium} onChange={(e) => setSerumCalcium(e.target.value)} inputMode="decimal" placeholder="mg/dL" style={S.input} />
              </Field>
              <Field label="腎功能 / 尿量">
                <select value={phosRenalRisk} onChange={(e) => setPhosRenalRisk(e.target.value as RenalRisk)} style={S.select}>
                  {Object.entries(renalText).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </Field>
              <Field label="自訂 phosphate 劑量" hint="留空則依血磷分級與體重粗估。">
                <input value={phosCustomDose} onChange={(e) => setPhosCustomDose(e.target.value)} inputMode="decimal" placeholder={`${phosCalc.boostedDose || 0}`} style={S.input} />
              </Field>
            </div>
            <label style={S.checkboxRow}>
              <input type="checkbox" checked={phosSymptoms} onChange={(e) => setPhosSymptoms(e.target.checked)} />
              <span>有症狀：呼吸肌無力、rhabdomyolysis、hemolysis、severe weakness、arrhythmia</span>
            </label>
            <label style={S.checkboxRow}>
              <input type="checkbox" checked={refeedingRisk} onChange={(e) => setRefeedingRisk(e.target.checked)} />
              <span>Refeeding risk / DKA / CRRT 或預期持續下降</span>
            </label>

            <div style={S.resultCard}>
              <div style={S.cardTitle}>補磷估算</div>
              <ResultRow label="換算 Phos" value={phosCalc.enteredPhos ? `${round(phosCalc.phosMgDl, 2)} mg/dL` : "請輸入 Phos"} />
              <ResultRow label="低血磷分級" value={phosSeverityText[phosCalc.severity]} highlight={phosCalc.severity !== "none"} />
              <ResultRow
                label="本次建議補充量"
                value={phosCalc.doseMmol ? `Phosphate ${phosCalc.doseMmol} mmol` : "可口服/飲食補充、觀察，或依臨床情境評估"}
                note={phosRenalRisk === "impaired" || phosRenalRisk === "oliguria" ? "腎功能差或少尿時先保守減半，並追蹤 Phos、Ca、K、Mg。" : "IV phosphate 需看症狀、腎功能、Ca x Phos product 與持續流失。"}
                highlight
              />
              {phosCalc.doseMmol > 0 && (
                <div style={S.sourceNote}>
                  {phosCalc.custom > 0
                    ? `目前使用自訂 phosphate ${phosCalc.custom} mmol，會覆蓋分級建議。`
                    : (phosRenalRisk === "impaired" || phosRenalRisk === "oliguria")
                      ? `原始估算 ${phosCalc.cappedDose} mmol；因腎功能/尿量風險，先保守調整為 ${phosCalc.renalAdjustedDose} mmol。`
                      : `依 Phos ${round(phosCalc.phosMgDl, 2)} mg/dL、體重 ${phosCalc.weight || "-"} kg，粗估本次 phosphate ${phosCalc.doseMmol} mmol。`}
                </div>
              )}
              <div style={S.formulaBox}>
                <div style={S.formulaHeader}>
                  <span style={S.formulaTitle}>補磷算法依據</span>
                  <span style={S.formulaBadge}>mmol/kg</span>
                </div>
                <div style={S.formulaLine}>
                  <span>距離目標</span>
                  <strong>{phosCalc.targetGap ? `約差 ${round(phosCalc.targetGap, 2)} mg/dL` : "已達目標或未輸入"}</strong>
                </div>
                <div style={S.formulaHint}>目標值用於追蹤，不直接換算單次劑量；IV phosphate 常用目前血磷分級與體重估算，補完後再複查。</div>
                <div style={S.doseScale}>
                  <div style={S.scaleRow}><span>Phos 1.7-2.2</span><strong>0.2 mmol/kg</strong></div>
                  <div style={S.scaleRow}><span>Phos 1.0-1.7</span><strong>0.4 mmol/kg</strong></div>
                  <div style={S.scaleRow}><span>Phos &lt;1.0</span><strong>0.6 mmol/kg</strong></div>
                  <div style={S.scaleRow}><span>Renal impairment</span><strong>減半</strong></div>
                </div>
              </div>
              <ResultRow label="Glycophos 原液量" value={phosCalc.doseMmol ? `${round(phosCalc.glycoMl)} mL，約 ${round(phosCalc.ampules, 1)} amp` : "-"} note="Glycophos：phosphate 1 mmol/mL；1 amp 20 mL = phosphate 20 mmol。" />
              <ResultRow label="Sodium load" value={phosCalc.doseMmol ? `約 ${round(phosCalc.sodiumMmol)} mmol Na` : "-"} note="Glycophos 同時提供 sodium 2 mmol/mL；限鈉/水腫病人需注意。" />
              <ResultRow label="Ca x Phos product" value={phosCalc.caPhosProduct ? `${round(phosCalc.caPhosProduct, 1)}` : "未輸入 Total Ca"} note="使用 total Ca (mg/dL) x Phos (mg/dL)；常用警戒值約 55 mg2/dL2，偏高時補磷需更謹慎。" highlight={phosCalc.highCaPhos} />
            </div>
          </div>

          <div>
            <div style={S.grid2}>
              <Field label="預計稀釋體積" hint="院內套餐：Glycophos 1 amp in NS 100 mL，6 hr via CVC。">
                <input value={phosDiluentVolume} onChange={(e) => setPhosDiluentVolume(e.target.value)} inputMode="numeric" style={S.input} />
              </Field>
              <Field label="預計輸注時間" hint="院內套餐常用 6 hr；依劑量、Ca/Phos、腎功能與監測調整。">
                <input value={phosInfusionHours} onChange={(e) => setPhosInfusionHours(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
            </div>
            <div style={S.resultCard}>
              <div style={S.cardTitle}>泡製 / 流速檢查</div>
              <ResultRow label="院內套餐常用泡法" value="Glycophos 1 amp in NS 100 mL，IVD 6 hr via CVC。" note="1 amp = phosphate 20 mmol + sodium 40 mmol。" highlight />
              <ResultRow label="常用速率" value="常見 over 4-6 hr；院內套餐採 6 hr。" note="避免快速補磷造成低鈣、低血壓或鈣磷沉積。" highlight />
              <ResultRow label="目前速率" value={phosCalc.hours ? `${round(phosCalc.rateMmolHr, 2)} mmol/hr` : "請輸入輸注時間"} note="若速率過快或劑量偏大，建議拆次或延長輸注時間。" highlight={phosCalc.overRate} />
              <ResultRow label="濃度" value={phosCalc.volume ? `${round(phosCalc.concentration, 3)} mmol/mL` : "請輸入稀釋體積"} note="Glycophos 不可未稀釋直接給。" />
              <ResultRow label="Pump rate" value={phosCalc.volume && phosCalc.hours ? `${round(phosCalc.pumpRate)} mL/hr` : "請輸入體積與時間"} />
            </div>
            {(phosCalc.overRate || phosCalc.highCaPhos || phosSymptoms || refeedingRisk || phosRenalRisk !== "normal") && (
              <div style={S.warning}>
                {phosCalc.overRate && <p>目前 phosphate 速率偏快；若不是嚴重症狀，建議延長輸注時間或拆次。</p>}
                {phosCalc.highCaPhos && <p>Ca x Phos product 偏高，補磷前請確認 calcium、腎功能與沉積風險。</p>}
                {phosSymptoms && <p>有症狀或 Phos &lt;1 mg/dL 時可考慮 IV 補磷，需監測 Ca/K/Mg、血壓與 ECG。</p>}
                {refeedingRisk && <p>Refeeding、DKA 或 CRRT 中可能持續消耗/清除 phosphate，補完後需更密集複查。</p>}
                {phosRenalRisk !== "normal" && <p>腎功能差、少尿或 CRRT 中，phosphate 可能累積或被清除，請依趨勢調整。</p>}
              </div>
            )}
          </div>
        </div>
      </section>
      <ClinicalReference>
        <h3 style={S.refHeading}>Glycophos 補磷重點</h3>
        <p>低血磷可能造成呼吸肌無力、rhabdomyolysis、hemolysis、心肌功能下降與 refeeding syndrome。Glycophos 是 sodium glycerophosphate，補 phosphate 的同時也帶入 sodium；每 20 mL 含 phosphate 20 mmol 與 sodium 40 mmol。</p>
        <Bullets items={[
          "輕度低血磷且無症狀時常可口服或飲食補充；Phos <1 mg/dL、有症狀、refeeding/DKA/CRRT 或無法 enteral 時較常考慮 IV。",
          "院內套餐常用：Glycophos 1 amp in NS 100 mL，IVD 6 hr via CVC。",
          "IV phosphate 補充前建議看 total Ca、Ca x Phos product、K/Mg、腎功能與尿量。",
          "Ca x Phos product 偏高時需小心鈣磷沉積；工具採常用警戒值約 55 mg2/dL2。",
          "補磷可能造成 hypocalcemia、低血壓或鈣磷沉積，通常避免快速輸注，補完後追蹤 Phos/Ca/K/Mg。",
        ]} />
      </ClinicalReference>
      </>)}

      {activeTab === "ca" && (<>
      <section style={S.section}>
        <div style={S.sectionTitle}>Calcium 補鈣速查</div>
        <div style={S.layoutGrid}>
          <div>
            <div style={S.grid2}>
              <Field label="使用品項">
                <select value={calciumProduct} onChange={(e) => setCalciumProduct(e.target.value as CalciumProduct)} style={S.select}>
                  {Object.entries(calciumProductText).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </Field>
              <Field label="使用情境">
                <select value={calciumIndication} onChange={(e) => setCalciumIndication(e.target.value as CalciumIndication)} style={S.select}>
                  {Object.entries(calciumIndicationText).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </Field>
              <Field label="判讀依據">
                <select value={calciumLabMode} onChange={(e) => setCalciumLabMode(e.target.value as CalciumLabMode)} style={S.select}>
                  <option value="total">Total Ca + albumin</option>
                  <option value="ionized">Ionized Ca</option>
                </select>
              </Field>
              {calciumLabMode === "ionized" && (
              <Field label="Ionized Ca" hint="mmol/L；急性/ICU 情境若有 iCa，通常更直觀。">
                <input value={ionizedCa} onChange={(e) => setIonizedCa(e.target.value)} inputMode="decimal" placeholder="例如 1.0" style={S.input} />
              </Field>
              )}
              {calciumLabMode === "total" && (<>
              <Field label="Total Ca" hint="mg/dL。">
                <input value={totalCaForCa} onChange={(e) => setTotalCaForCa(e.target.value)} inputMode="decimal" placeholder="mg/dL" style={S.input} />
              </Field>
              <Field label="Albumin" hint="可選填，用來校正 total Ca。">
                <input value={albuminForCa} onChange={(e) => setAlbuminForCa(e.target.value)} inputMode="decimal" placeholder="g/dL" style={S.input} />
              </Field>
              </>)}
              <Field label="自訂 elemental Ca" hint="單位 mEq；留空則依情境粗估。">
                <input value={calciumCustomMeq} onChange={(e) => setCalciumCustomMeq(e.target.value)} inputMode="decimal" placeholder={`${calciumCalc.targetMeq}`} style={S.input} />
              </Field>
              <Field label="腎功能 / 尿量">
                <select value={calciumRenalRisk} onChange={(e) => setCalciumRenalRisk(e.target.value as RenalRisk)} style={S.select}>
                  {Object.entries(renalText).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </Field>
            </div>
            <label style={S.checkboxRow}>
              <input type="checkbox" checked={calciumSymptoms} onChange={(e) => setCalciumSymptoms(e.target.checked)} />
              <span>有症狀：tetany、seizure、laryngospasm、hypotension、QT prolongation 或 arrhythmia</span>
            </label>
            <label style={S.checkboxRow}>
              <input type="checkbox" checked={calciumCentralLine} onChange={(e) => setCalciumCentralLine(e.target.checked)} />
              <span>有可靠 central line / resuscitation access</span>
            </label>

            <div style={S.resultCard}>
              <div style={S.cardTitle}>補鈣估算</div>
              <ResultRow label="目前判讀依據" value={calciumCalc.labSummary} note={calciumCalc.labWarning || "iCa 非必填；多數一般情境可先用 total Ca + albumin 校正。" } />
              <ResultRow label="腎功能安全提醒" value={calciumCalc.renalSafetyNote} />
              <ResultRow label="品項換算" value={calciumCalc.productSummary} />
              {calciumLabMode === "total" && (
                <ResultRow label="校正公式" value="Corrected Ca = total Ca + 0.8 x (4 - albumin)" note="低白蛋白時 total Ca 可能低估；若病人嚴重危急、酸鹼異常或輸血/CRRT，iCa 會更準確。" />
              )}
              <ResultRow
                label="本次建議補充量"
                value={`${round(calciumCalc.doseMeq, 2)} mEq elemental Ca`}
                note={calciumCalc.custom > 0 ? "目前使用自訂 elemental Ca 劑量。" : calciumCalc.indicationNote}
                highlight
              />
              <ResultRow label="需要原液量" value={`${round(calciumCalc.doseMl)} mL，約 ${round(calciumCalc.ampules, 1)} amp`} note={`約 ${round(calciumCalc.elementalMg)} mg elemental Ca。`} highlight />
              <div style={S.formulaBox}>
                <div style={S.formulaHeader}>
                  <span style={S.formulaTitle}>補鈣算法依據</span>
                  <span style={S.formulaBadge}>elemental Ca</span>
                </div>
                <div style={S.formulaHint}>Calcium gluconate 與 calcium chloride 不可只看「幾 g」比較，應以 elemental Ca mEq 換算；CaCl2 較刺激，外滲壞死風險較高，通常偏好 central line 或急救情境。</div>
                <div style={S.doseScale}>
                  <div style={S.scaleRow}><span>Hypocalcemia</span><strong>4.5-9 mEq</strong></div>
                  <div style={S.scaleRow}><span>HyperK ECG</span><strong>約 13.5 mEq</strong></div>
                  <div style={S.scaleRow}><span>Massive transfusion</span><strong>4.5-9 mEq</strong></div>
                  <div style={S.scaleRow}><span>CCB / arrest</span><strong>依反應重複</strong></div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={S.grid2}>
              <Field label="預計稀釋體積" hint={calciumProduct === "vitacal" ? "Calcium chloride 常用 slow IV，central line preferred；若稀釋需依院內流程。" : "Calcium gluconate 可稀釋於 50-100 mL D5W/NS。"}>
                <input value={calciumDiluentVolume} onChange={(e) => setCalciumDiluentVolume(e.target.value)} inputMode="numeric" style={S.input} />
              </Field>
              <Field label="預計輸注時間" hint="分鐘；急性心肌保護常 over 5-10 min，症狀性低血鈣可 over 10-30 min。">
                <input value={calciumInfusionMinutes} onChange={(e) => setCalciumInfusionMinutes(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
            </div>
            <div style={S.resultCard}>
              <div style={S.cardTitle}>泡製 / 流速檢查</div>
              <ResultRow label="常用給法" value={calciumProduct === "vitacal" ? "Calcium chloride：central line preferred；急救/重症可 slow IV over 5-10 min，需 ECG/BP monitoring。" : "Calcium gluconate：常用 10-20 mL 10% in 50-100 mL over 10 min；hyperK ECG changes 可依 protocol 給較高劑量並重複評估。"} highlight />
              <ResultRow label="目前速率" value={calciumCalc.minutes ? `${round(calciumCalc.rateMeqMin, 2)} mEq/min` : "請輸入時間"} note="過快可能造成 bradycardia、hypotension 或 arrhythmia；建議 ECG/BP monitoring。" highlight={calciumCalc.fastRate} />
              <ResultRow label="濃度" value={calciumCalc.volume ? `${round(calciumCalc.concentration, 3)} mEq/mL` : "請輸入稀釋體積"} />
              <ResultRow label="Pump rate" value={calciumCalc.volume && calciumCalc.minutes ? `${round(calciumCalc.pumpRate)} mL/hr` : "請輸入體積與時間"} />
            </div>
            {(calciumCalc.chloridePeripheralRisk || calciumCalc.fastRate || calciumIndication === "hyperkalemia" || calciumSymptoms || calciumRenalRisk !== "normal") && (
              <div style={S.warning}>
                {calciumCalc.chloridePeripheralRisk && <p>Calcium chloride 外滲可能造成組織壞死；若非急救情境且無 central line，通常優先考慮 calcium gluconate。</p>}
                {calciumCalc.fastRate && <p>目前輸注時間很短，需確認是否為急救/不穩定情境，並使用 ECG/BP monitoring。</p>}
                {calciumIndication === "hyperkalemia" && <p>Calcium 只穩定心肌，不會降低 serum K；需同步 insulin/glucose、beta-agonist、排鉀或 dialysis 等降鉀處置。</p>}
                {calciumSymptoms && <p>症狀性低血鈣需 ECG 監測，並評估 Mg、Phos、vitamin D/PTH、腎功能與持續原因。</p>}
                {calciumRenalRisk !== "normal" && <p>腎功能差、少尿或 CRRT 中，補鈣前後建議追蹤 Phos、Ca x Phos product、iCa/total Ca trend，避免鈣磷沉積或反覆補過頭。</p>}
              </div>
            )}
          </div>
        </div>
      </section>
      <ClinicalReference>
        <h3 style={S.refHeading}>Calcium 補鈣重點</h3>
        <p>急性/ICU 情境若有 ionized calcium，通常比 corrected total calcium 更能反映當下生理狀態。Calcium gluconate 與 calcium chloride 的 elemental calcium 含量與組織刺激性不同，建議用 mEq elemental Ca 來比較。</p>
        <Bullets items={[
          "Calcium gluconate 較適合周邊 IV；calcium chloride 較刺激，外滲可造成組織壞死，通常偏好 central line 或急救情境。",
          "Hyperkalemia with ECG changes 給 calcium 是心肌保護，不會降低血鉀；需同步給 insulin/glucose、beta-agonist、排鉀或 dialysis。",
          "大量輸血/citrate effect 常依 iCa、血壓、ECG 與輸血速度反覆補鈣。",
          "補鈣前後需注意 phosphate；Ca x Phos product 偏高時，補鈣或補磷都需更謹慎。",
        ]} />
      </ClinicalReference>
      </>)}

      {activeTab === "na" && (<>
      <section style={S.section}>
        <div style={S.sectionTitle}>Sodium / Hyponatremia & Hypernatremia</div>
        <div style={S.layoutGrid}>
          <div>
            <div style={S.segmented}>
              <button type="button" onClick={() => setSodiumMode("hyponatremia")} style={{ ...S.segmentButton, ...(sodiumMode === "hyponatremia" ? S.segmentButtonActive : {}) }}>低血鈉</button>
              <button type="button" onClick={() => setSodiumMode("hypernatremia")} style={{ ...S.segmentButton, ...(sodiumMode === "hypernatremia" ? S.segmentButtonActive : {}) }}>高血鈉</button>
            </div>
            <div style={S.grid2}>
              <Field label="目前 Na" hint="單位 mEq/L">
                <input value={serumNa} onChange={(e) => setSerumNa(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="目標 Na" hint={sodiumMode === "hyponatremia" ? "工具會自動套用 24 hr 校正上限，不會直接跳到此目標。" : "高血鈉常先抓 145 或每 24 hr 下降約 10-12；需依急慢性。"}>
                <input value={targetNa} onChange={(e) => setTargetNa(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="體重" hint="用來估 total body water。">
                <input value={sodiumWeight} onChange={(e) => setSodiumWeight(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="年齡">
                <input value={sodiumAge} onChange={(e) => setSodiumAge(e.target.value)} inputMode="numeric" style={S.input} />
              </Field>
              <Field label="生理性別">
                <select value={sodiumSex} onChange={(e) => setSodiumSex(e.target.value as SodiumSex)} style={S.select}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </Field>
              <Field label="急慢性">
                <select value={sodiumDuration} onChange={(e) => setSodiumDuration(e.target.value as SodiumDuration)} style={S.select}>
                  <option value="unknown">Unknown / 不明</option>
                  <option value="chronic">Chronic / &gt;48 hr</option>
                  <option value="acute">Acute / &lt;48 hr</option>
                </select>
              </Field>
              <Field label="Volume status / 機轉">
                <select value={sodiumVolumeStatus} onChange={(e) => setSodiumVolumeStatus(e.target.value as SodiumVolumeStatus)} style={S.select}>
                  <option value="unclear">尚不確定</option>
                  <option value="hypovolemic">低血容積</option>
                  <option value="euvolemic">看似等血容積</option>
                  <option value="hypervolemic">高血容積 / 水腫</option>
                </select>
              </Field>
              <Field label="腎功能 / 尿量">
                <select value={sodiumRenalRisk} onChange={(e) => setSodiumRenalRisk(e.target.value as RenalRisk)} style={S.select}>
                  {Object.entries(renalText).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </Field>
            </div>
            {sodiumMode === "hyponatremia" && (
              <>
                <label style={S.checkboxRow}>
                  <input type="checkbox" checked={sodiumSevereSymptoms} onChange={(e) => setSodiumSevereSymptoms(e.target.checked)} />
                  <span>嚴重症狀：seizure、coma、嚴重意識改變、腦壓症狀</span>
                </label>
                <label style={S.checkboxRow}>
                  <input type="checkbox" checked={sodiumOdsRisk} onChange={(e) => setSodiumOdsRisk(e.target.checked)} />
                  <span>ODS 高風險：Na ≤105、酒精使用疾患、營養不良、肝病、低血鉀等</span>
                </label>
                <div style={S.grid2}>
                  <Field label="3% NaCl 預計體積" hint="院內品項 500 mL/bot；嚴重症狀常用 100 mL bolus，非嚴重症狀則依醫囑小心調速。">
                    <input value={hypertonicVolume} onChange={(e) => setHypertonicVolume(e.target.value)} inputMode="decimal" style={S.input} />
                  </Field>
                  <Field label="3% NaCl 輸注時間" hint="分鐘；例如 bolus 10 min，或連續輸注 60-240 min。">
                    <input value={hypertonicInfusionMinutes} onChange={(e) => setHypertonicInfusionMinutes(e.target.value)} inputMode="decimal" style={S.input} />
                  </Field>
                </div>
              </>
            )}
            {sodiumMode === "hypernatremia" && (
              <div style={S.grid2}>
                <Field label="Ongoing water loss" hint="可先填 0；若仍發燒、腹瀉、多尿，要另外加回。單位 L/day。">
                  <input value={sodiumOngoingLoss} onChange={(e) => setSodiumOngoingLoss(e.target.value)} inputMode="decimal" style={S.input} />
                </Field>
                <Field label="預計校正時間" hint="小時；慢性/不明常分 48-72 hr，這裡先算此時間內平均速率。">
                  <input value={sodiumCorrectionHours} onChange={(e) => setSodiumCorrectionHours(e.target.value)} inputMode="numeric" style={S.input} />
                </Field>
              </div>
            )}

            <div style={S.resultCard}>
              <div style={S.cardTitle}>{sodiumMode === "hyponatremia" ? "低血鈉安全校正" : "高血鈉 free water 估算"}</div>
              <ResultRow label="分級" value={sodiumCalc.severity} highlight />
              <ResultRow label="TBW 估算" value={sodiumCalc.tbw ? `${round(sodiumCalc.tbw)} L` : "請輸入體重"} note={`TBW factor ${sodiumCalc.tbwFactor}（依年齡/性別粗估）。`} />
              <ResultRow label="公式適用性" value={sodiumCalc.sodiumRenalSafetyNote} highlight={sodiumRenalRisk !== "normal"} />
              <ResultRow label="監測建議" value={sodiumCalc.sodiumMonitoringText} highlight={sodiumRenalRisk !== "normal"} />
              {sodiumMode === "hyponatremia" ? (
                <>
                  <ResultRow label="24 hr 校正上限" value={`最多 +${sodiumCalc.correctionLimit24} mEq/L/day`} note={sodiumOdsRisk ? "ODS 高風險者採更保守上限；需更密集追蹤。" : "多數慢性/不明低血鈉仍建議避免 >8-10 mEq/L/day；本工具先採保守 8。"} highlight />
                  <ResultRow label="本日安全目標" value={sodiumCalc.na ? `Na ${round(sodiumCalc.desiredNa)} mEq/L（約 +${round(sodiumCalc.deltaNa)}）` : "請輸入 Na"} note="嚴重症狀時先求上升 4-6 mEq/L 緩解腦水腫，不追求一次補到正常。" highlight />
                  <ResultRow label="3% NaCl 100 mL 估計上升" value={sodiumCalc.naRisePer100Ml3 ? `約 +${round(sodiumCalc.naRisePer100Ml3, 2)} mEq/L` : "請輸入 Na/體重"} note="Adrogue-Madias 粗估；實際上升可能因水利尿、尿鈉尿鉀而偏離。" />
                  <ResultRow label="若嚴重症狀" value={sodiumSevereSymptoms ? `3% NaCl 100 mL over 10 min，可重複，工具估約 ${sodiumCalc.bolusCount} 次達 +4 mEq/L` : "無嚴重症狀時通常不需急速 3% bolus"} note="每次 bolus 後重評神經症狀與 Na；避免 overcorrection。" highlight={sodiumSevereSymptoms} />
                  <ResultRow label="若用 3% 連續補至本日目標" value={sodiumCalc.estimated3PercentMl ? `粗估約 ${round(sodiumCalc.estimated3PercentMl)} mL` : "請輸入 Na/體重/目標"} note="僅作量級估算，不等於固定醫囑；需 q2-4h Na 追蹤。" />
                  <ResultRow label="NS 1 L 估計影響" value={sodiumCalc.nsNaChangePerL ? `${sodiumCalc.nsNaChangePerL >= 0 ? "+" : ""}${round(sodiumCalc.nsNaChangePerL, 2)} mEq/L` : "請輸入 Na/體重"} note="低血容積低血鈉補 NS 後 ADH 下降，Na 可能比公式更快上升。" />
                </>
              ) : (
                <>
                  <ResultRow label="校正策略" value={sodiumCalc.hyperCorrectionLimit24} highlight />
                  <ResultRow label="本階段目標" value={sodiumCalc.na ? `Na ${round(sodiumCalc.desiredNa)} mEq/L（約 -${round(sodiumCalc.deltaNa)}）` : "請輸入 Na"} note="急性 sodium gain 可較快處理；慢性/不明則建議密集追蹤與分段校正。" highlight />
                  <ResultRow label="Free water deficit" value={sodiumCalc.freeWaterDeficit ? `約 ${round(sodiumCalc.freeWaterDeficit, 2)} L` : "請輸入 Na/體重/目標"} note="公式：TBW x [(目前 Na / 目標 Na) - 1]。不含 ongoing loss。" highlight />
                  <ResultRow label="含 ongoing loss" value={sodiumCalc.totalWaterPlan ? `約 ${round(sodiumCalc.totalWaterPlan, 2)} L` : "請輸入資料"} note="發燒、腹瀉、多尿、NG drainage 等需另外加回。" />
                  <ResultRow label="平均 free water 速率" value={sodiumCalc.waterRate ? `${round(sodiumCalc.waterRate)} mL/hr` : "請輸入校正時間"} note="可用 enteral free water 或 D5W；若低血容積/休克先補 isotonic crystalloid。" highlight />
                </>
              )}
            </div>
          </div>

          <div>
            {sodiumMode === "hyponatremia" && (
              <div style={S.resultCard}>
                <div style={S.cardTitle}>3% NaCl 泡製 / 流速檢查</div>
                <ResultRow label="院內品項" value="3% 高濃度 NaCl 500 mL；513 mEq/L" note="等於 0.513 mEq/mL；100 mL 約 51.3 mEq Na。" highlight />
                <ResultRow label={sodiumSevereSymptoms ? "建議體積" : "前 6 hr 建議體積"} value={sodiumCalc.suggestedHypertonicVolumeMl ? `約 ${round(sodiumCalc.suggestedHypertonicVolumeMl)} mL（${round(sodiumCalc.suggestedHypertonicVolumeMl / 500, 2)} bot）` : "通常不需 3% NaCl"} note={sodiumCalc.suggestedHypertonicNote} highlight />
                <ResultRow label="建議輸注時間" value={sodiumCalc.suggestedHypertonicVolumeMl ? sodiumCalc.suggestedHypertonicTimeText : "依病因處理"} />
                <ResultRow label="建議流速" value={sodiumCalc.suggestedHypertonicPumpRate ? `約 ${round(sodiumCalc.suggestedHypertonicPumpRate, 1)} mL/hr` : "不適用"} note={sodiumSevereSymptoms ? "100 mL over 10 min 換算約 600 mL/hr；可用 infusion pump 或依院內急救給法。" : "先跑 6 hr 或更早複查 Na；若上升太快就降速或停用。"} highlight />
                <ResultRow label="建議量估計上升" value={sodiumCalc.suggestedHypertonicRise ? `約 +${round(sodiumCalc.suggestedHypertonicRise, 2)} mEq/L` : "請輸入 Na/體重/目標"} note="用 Adrogue-Madias 公式粗估；補鉀、水利尿或低血容積矯正後可能上升更快。" />
                <ResultRow label="本次 3% NaCl 量" value={sodiumCalc.hypertonicVolMl ? `${round(sodiumCalc.hypertonicVolMl)} mL（約 ${round(sodiumCalc.hypertonicNaLoad, 1)} mEq Na）` : "請輸入體積"} />
                <ResultRow label="Pump rate" value={sodiumCalc.hypertonicPumpRate ? `${round(sodiumCalc.hypertonicPumpRate)} mL/hr` : "請輸入體積與時間"} note={sodiumSevereSymptoms ? "嚴重症狀 bolus 常見 100 mL over 10 min；每次後重評。" : "非嚴重症狀連續輸注需依 Na trend 調速，通常 q2-4h 追蹤。"} highlight />
                <ResultRow label="本次估計 Na 上升" value={sodiumCalc.hypertonicEstimatedRise ? `約 +${round(sodiumCalc.hypertonicEstimatedRise, 2)} mEq/L` : "請輸入 Na/體重/體積"} note="Adrogue-Madias 粗估；實際可能因水利尿而上升更快。" highlight={sodiumCalc.hypertonicEstimatedRise > sodiumCalc.correctionLimit24} />
                <ResultRow label="若同速率跑 24 hr" value={sodiumCalc.hypertonicEstimatedRise24 ? `約 +${round(sodiumCalc.hypertonicEstimatedRise24, 1)} mEq/L/day` : "請輸入輸注時間"} note={`目前 24 hr 上限設定：+${sodiumCalc.correctionLimit24} mEq/L/day。`} highlight={sodiumCalc.hypertonicOverLimit} />
                <ResultRow label="安全監測" value="建議 q2-4h Na；若低血容積補液後、尿量突然增加或正在補 K，要更小心 overcorrection。" />
              </div>
            )}
            <div style={S.resultCard}>
              <div style={S.cardTitle}>機轉速查</div>
              <ResultRow label="目前分型" value={sodiumCalc.mechanismTitle} highlight />
              <Bullets items={sodiumCalc.mechanismItems} />
            </div>
            <div style={S.resultCard}>
              <div style={S.cardTitle}>需要同步確認</div>
              {sodiumMode === "hyponatremia" ? (
                <Bullets items={[
                  "Serum Osm：先確認是否 hypotonic hyponatremia。",
                  "Glucose：高血糖會造成 translocational hyponatremia，需校正 Na。",
                  "Urine Osm / urine Na：協助分 SIADH、低血容積、低 solute intake 或腎性流失。",
                  "K：補鉀本身也會拉高 serum Na，低血鉀也是 ODS 風險因子。",
                  "若 Na 上升過快：考慮停止高張鹽水、補 D5W，必要時 desmopressin clamp。",
                ]} />
              ) : (
                <Bullets items={[
                  "先看血流動力：shock/低血容積先補 isotonic crystalloid，不要先只給 D5W。",
                  "Urine output + urine Osm：多尿且尿很稀要想 diabetes insipidus。",
                  "近期 sodium load：3% NaCl、NaHCO3、TPN、透析液或大量 NS。",
                  "Free water deficit 只是起始估算，需 q4-6h 依 Na trend 重新調速。",
                  "成人資料對「降太快造成腦水腫」證據較弱，但慢性/不明仍建議保守分段監測。",
                ]} />
              )}
            </div>
            <div style={S.warning}>
              {sodiumMode === "hyponatremia" && sodiumCalc.hypertonicOverLimit && <p>目前 3% NaCl 設定若持續太久，估計可能超過 24 小時校正上限；請縮短、放慢、改分次 bolus，並依 Na trend 調整。</p>}
              {sodiumRenalRisk === "oliguria" && <p>少尿/無尿時公式容易失準，3% NaCl 或 free water 都可能造成容量或 Na 變化不可預期，建議更密集追蹤並評估 RRT/專科共同處理。</p>}
              {sodiumRenalRisk === "crrt" && <p>CRRT/HD 中 serum Na 會受透析液、置換液、effluent rate 與脫水量影響，需同步確認機器設定與醫囑。</p>}
              鈉異常校正建議需結合症狀、急慢性與檢驗趨勢。此工具提供安全框架與公式估算；嚴重症狀、Na &lt;120、Na &gt;160、腎衰竭、肝病、營養不良或校正速度失控時，建議 ICU/腎臟科或相關專科共同處理。
            </div>
          </div>
        </div>
      </section>
      <ClinicalReference>
        <h3 style={S.refHeading}>低血鈉：目前仍不建議一次補太快</h3>
        <p>近年有研究提醒，低血鈉校正過慢或長時間維持低鈉可能和較差預後相關；但這不等於 ODS 已經不存在。慢性或不明時間的低血鈉仍要避免過快校正，尤其 Na 很低、低血鉀、酒精使用疾患、營養不良或肝病者。</p>
        <Bullets items={[
          "院內 3% 高濃度 NaCl：500 mL/bot，513 mEq/L；100 mL 約含 Na 51.3 mEq。",
          "嚴重神經症狀時，優先用 3% NaCl bolus 讓 Na 先上升約 4-6 mEq/L，目標是改善腦水腫，不是補到正常。",
          "慢性或不明低血鈉：多數情境建議 24 hr 不超過 8-10 mEq/L；ODS 高風險者常採更保守上限約 4-6 mEq/L/day。",
          "低血容積低血鈉補 NS 後，ADH 下降可能突然水利尿，Na 反而飆升，需密集追蹤。",
          "若 overcorrection，可考慮 D5W 補回 free water，必要時 desmopressin clamp。",
        ]} />

        <h3 style={S.refHeading}>3% NaCl 公式怎麼算？</h3>
        <p>工具使用 Adrogue-Madias 公式粗估輸液對 serum Na 的影響。這是量級估算，實際變化會受尿量、水利尿、尿 Na/K、補 K、ongoing loss 影響。</p>
        <div style={S.formulaBox}>
          <div style={S.formulaLine}><span>通式</span><strong>(輸注液 Na + K - serum Na) / (TBW + 1)</strong></div>
          <div style={S.formulaLine}><span>3% NaCl</span><strong>(513 - serum Na) / (TBW + 1) = 每 1 L 約上升多少 Na</strong></div>
          <div style={S.formulaHint}>例如 Na 122、TBW 27 L：每 1 L 約 (513-122)/(27+1)=14 mEq/L；100 mL 約 +1.4 mEq/L。</div>
        </div>
        <h3 style={S.refHeading}>腎功能與尿量怎麼影響？</h3>
        <p>腎功能/尿量不直接放進 Na 校正公式，但會大幅影響公式準確度與安全性。少尿/無尿時，病人較難自行排水或排鈉；CRRT/HD 時，Na 變化還會被透析液、置換液、effluent rate 與脫水量牽動。</p>
        <Bullets items={[
          "腎功能穩定且有尿：公式較適合作起始估算，但仍需依 Na trend 調整。",
          "腎功能差但仍有尿：水鈉排除不穩，建議更密集追蹤 Na、I/O、體重與容量狀態。",
          "少尿/無尿：3% NaCl、NS、D5W 或 enteral water 都可能更容易造成容量負荷或校正失控，通常要更保守。",
          "CRRT/HD：不要只看公式，需同步看機器處方、dialysate/replacement sodium、effluent rate、病人脫水量與實際 Na trend。",
        ]} />

        <h3 style={S.refHeading}>Volume status 怎麼判斷？</h3>
        <Bullets items={[
          "Hypovolemic：血壓低、HR 快、口乾、orthostatic hypotension、尿量少、BUN/Cr 上升；常見 vomiting、diarrhea、diuretics、third spacing。Urine Na 常 <30，但用利尿劑時可能不準。",
          "Euvolemic：沒有明顯水腫或脫水；常見 SIADH、藥物、hypothyroidism、adrenal insufficiency、primary polydipsia/low solute。SIADH 常見 urine Osm >100、urine Na >30。",
          "Hypervolemic：水腫、肺水腫、ascites、JVP 上升；常見 HF、cirrhosis、nephrotic syndrome、advanced CKD。通常 total body water 和 Na 都增加，但水增加更多。",
          "低血鈉建議同步看 serum Osm、glucose、urine Osm、urine Na、I/O、利尿劑使用、腎上腺/甲狀腺功能與病人實際體液狀態。",
        ]} />

        <h3 style={S.refHeading}>低血鈉機轉速查</h3>
        <Bullets items={[
          "Hypovolemic：Na 與水都少，但 Na loss 較多；治療多為 isotonic saline 補有效循環血量。",
          "Euvolemic：身體總鈉大致正常但水太多；治療依原因，如 fluid restriction、增加 solute、停致病藥。",
          "Hypervolemic：Na 與水都多，但水增加更多；常需 fluid/sodium restriction、loop diuretic 與處理原疾病。",
          "Pseudo/translocational：高血糖、mannitol、脂血或高蛋白會讓 Na 看起來低，治療方向不同。",
        ]} />

        <h3 style={S.refHeading}>高血鈉：校正速度與公式</h3>
        <p>高血鈉傳統教學會說慢性高血鈉不可降太快，避免腦水腫；但成人 ICU/住院研究中，快速校正造成神經傷害的證據比兒科弱。實務上仍建議慢性或不明高血鈉分段校正並密集追蹤，但也要避免因太保守而讓 severe hypernatremia 拖太久。</p>
        <Bullets items={[
          "急性高血鈉或明確 sodium gain：可較積極校正並處理鈉來源。",
          "慢性或不明：常以每 24 hr 下降不超過約 10-12 mEq/L 作保守起點，依神經狀態與 Na trend 調整。",
          "低血容積/休克時先用 isotonic crystalloid resuscitation；血流動力穩定後再用 D5W 或 enteral free water 補自由水。",
          "Free water deficit = TBW x [(目前 Na / 目標 Na) - 1]；仍要另外加上 ongoing losses。",
        ]} />
        <h3 style={S.refHeading}>高血鈉機轉速查</h3>
        <Bullets items={[
          "Hypovolemic hypernatremia：水流失 > 鈉流失；常見發燒/出汗、腹瀉、滲透性利尿、diuretics。",
          "Euvolemic hypernatremia：主要是水流失；常見 diabetes insipidus、insensible loss 或無法喝水。",
          "Hypervolemic hypernatremia：鈉負荷過多；常見 hypertonic saline、NaHCO3、TPN、透析液或大量 sodium-containing fluid。",
        ]} />
      </ClinicalReference>
      </>)}

      {activeTab === "reference" && (<>
      <section style={S.section}>
        <div style={S.sectionTitle}>電解質補充總覽</div>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>項目</th>
                <th style={S.th}>院內品項</th>
                <th style={S.th}>常用劑量單位</th>
                <th style={S.th}>常見監測重點</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={S.tdStrong}>Potassium</td>
                <td style={S.td}>KCl 15% 10 mL：20 mEq/amp；KCl 10 mEq/500 mL commercial bag。</td>
                <td style={S.td}>mEq；周邊常用 10 mEq/hr，中心靜脈常用 20 mEq/hr。</td>
                <td style={S.td}>ECG、腎功能/尿量、Mg、酸鹼、insulin/beta-agonist、digoxin/arrhythmia risk。</td>
              </tr>
              <tr>
                <td style={S.tdStrong}>Magnesium</td>
                <td style={S.td}>MgSO4 10% 20 mL：2 g/amp = 16.2 mEq Mg/amp。</td>
                <td style={S.td}>g；常見 1-2 g IV，症狀或較低時 4 g，torsades 可 1-2 g stat。</td>
                <td style={S.td}>血壓、ECG、DTR/呼吸、腎功能、K/Ca 同步矯正。</td>
              </tr>
              <tr>
                <td style={S.tdStrong}>Phosphate</td>
                <td style={S.td}>Glycophos 20 mL：phosphate 20 mmol/amp + sodium 40 mmol/amp。</td>
                <td style={S.td}>mmol；常用 0.2-0.6 mmol/kg 分級補充。</td>
                <td style={S.td}>Ca x Phos product、Ca/K/Mg、腎功能、refeeding/DKA/CRRT 持續流失。</td>
              </tr>
              <tr>
                <td style={S.tdStrong}>Calcium</td>
                <td style={S.td}>Calglon 10 mL：4.65 mEq Ca/amp；Vitacal 20 mL：5.4 mEq Ca/amp。</td>
                <td style={S.td}>mEq elemental Ca；不要只用製劑 g 數比較 calcium gluconate 與 calcium chloride。</td>
                <td style={S.td}>iCa、total Ca/albumin、ECG、BP、Phos/Ca x Phos product、管路外滲風險。</td>
              </tr>
              <tr>
                <td style={S.tdStrong}>Sodium</td>
                <td style={S.td}>3% 高濃度 NaCl 瓶 500 mL：513 mEq/L；另依情境使用 0.9% NaCl、D5W 或 enteral free water。</td>
                <td style={S.td}>mEq/L correction；低血鈉重點是 24 hr 上升上限，高血鈉重點是 free water deficit。</td>
                <td style={S.td}>神經症狀、急慢性、serum Osm、glucose、urine Osm/Na、I/O、K、ODS 風險或高血鈉腦水腫風險。</td>
              </tr>
              <tr>
                <td style={S.tdStrong}>CRRT / CVVHDF</td>
                <td style={S.td}>Prismasol B0/B4、KCl add-in 依院內 CVVH protocol。</td>
                <td style={S.td}>看 serum level trend 與 effluent / replacement / dialysate flow。</td>
                <td style={S.td}>CRRT 會持續清除 K/Mg/Phos；補充後需依趨勢反覆調整。</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      </>)}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  header: { textAlign: "center", padding: "16px 0 24px" },
  kicker: { fontSize: 12, fontWeight: 900, color: ACCENT, textTransform: "uppercase", letterSpacing: 0, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: 0, margin: 0 },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 4, lineHeight: 1.5 },
  notice: { background: "#FFF7ED", border: "1px solid #FED7AA", color: "#9A3412", borderRadius: 12, padding: 14, marginBottom: 16, lineHeight: 1.55, fontSize: 13 },
  noticeTitle: { color: "#7C2D12", fontWeight: 900, marginBottom: 4, fontSize: 14 },
  tabBar: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))", gap: 8, background: "#E2E8F0", padding: 4, borderRadius: 12, marginBottom: 16 },
  tabButton: { border: "none", borderRadius: 9, background: "transparent", color: "#475569", padding: "10px 6px", fontSize: 13, fontWeight: 900, cursor: "pointer" },
  tabButtonActive: { background: "#FFFFFF", color: ACCENT, boxShadow: "0 1px 3px rgba(15,23,42,0.12)" },
  segmented: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, background: "#E2E8F0", padding: 4, borderRadius: 12, marginBottom: 14 },
  segmentButton: { border: "none", borderRadius: 9, background: "transparent", color: "#475569", padding: "10px 8px", fontSize: 13, fontWeight: 900, cursor: "pointer" },
  segmentButtonActive: { background: "#FFFFFF", color: ACCENT, boxShadow: "0 1px 3px rgba(15,23,42,0.12)" },
  section: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", boxSizing: "border-box", overflow: "hidden" },
  sectionTitle: { fontSize: 13, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0, marginBottom: 14 },
  layoutGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 },
  productGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 },
  productBox: { display: "flex", flexDirection: "column", gap: 6, border: "1px solid #E2E8F0", background: "#F8FAFC", borderRadius: 10, padding: 12, color: "#334155", fontSize: 13, lineHeight: 1.55 },
  label: { display: "block", fontSize: 13, fontWeight: 800, color: "#475569", marginBottom: 6 },
  fieldHint: { color: "#64748B", fontSize: 12, lineHeight: 1.5, marginTop: 6 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", boxSizing: "border-box" },
  select: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", boxSizing: "border-box" },
  checkboxRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, color: "#475569", lineHeight: 1.45 },
  resultCard: { marginTop: 14, border: "1px solid #DDE5F0", borderRadius: 10, padding: 14, background: "#FAFCFF" },
  cardTitle: { fontWeight: 800, fontSize: 16, color: "#0F172A", marginBottom: 10 },
  resultRow: { display: "grid", gridTemplateColumns: "minmax(110px, 0.65fr) minmax(0, 1.35fr)", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(148,163,184,0.25)", alignItems: "start" },
  resultRowHighlight: { background: "#F0FDFA", marginLeft: -8, marginRight: -8, paddingLeft: 8, paddingRight: 8, borderRadius: 6, borderBottom: "none" },
  resultLabel: { color: "#64748B", fontSize: 13, fontWeight: 800 },
  resultNote: { color: "#94A3B8", fontSize: 12, lineHeight: 1.45, marginTop: 3 },
  resultValue: { color: "#0F172A", fontSize: 14, lineHeight: 1.55, wordBreak: "break-word", fontWeight: 800 },
  clinicalReference: { background: "#FFFFFF", border: "1px solid #DDE5F0", borderRadius: 12, padding: "0 14px", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  clinicalSummary: { cursor: "pointer", color: "#0F172A", fontSize: 15, fontWeight: 900, padding: "13px 0", listStylePosition: "inside" },
  clinicalBody: { color: "#334155", fontSize: 13, lineHeight: 1.65, padding: "0 0 14px" },
  detailBox: { border: "1px solid #E2E8F0", borderRadius: 10, background: "#F8FAFC", padding: "0 12px", margin: "8px 0 10px" },
  detailSummary: { cursor: "pointer", color: "#334155", fontSize: 13, fontWeight: 900, padding: "10px 0", listStylePosition: "inside", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  detailBody: { padding: "0 0 12px" },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 },
  detailItem: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4, color: "#64748B", fontSize: 12, lineHeight: 1.45 },
  detailItemWide: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4, color: "#64748B", fontSize: 12, lineHeight: 1.45, gridColumn: "1 / -1" },
  crrtBox: { marginTop: 14, border: "1px solid #CCFBF1", background: "#F0FDFA", borderRadius: 10, padding: 12 },
  protocolBox: { background: "#FFFFFF", border: "1px solid #99F6E4", borderRadius: 10, padding: 12, marginBottom: 12 },
  protocolTitle: { color: "#0F766E", fontSize: 13, fontWeight: 900, marginBottom: 8 },
  protocolRule: { display: "grid", gridTemplateColumns: "minmax(120px, 0.8fr) minmax(0, 1.2fr)", gap: 10, padding: "8px 0", borderTop: "1px solid #CCFBF1", color: "#334155", fontSize: 13, lineHeight: 1.45, alignItems: "center" },
  protocolHint: { color: "#64748B", fontSize: 12, lineHeight: 1.55, marginTop: 8 },
  sourceNote: { background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E3A8A", borderRadius: 8, padding: "8px 10px", margin: "8px 0", fontSize: 12, lineHeight: 1.55, fontWeight: 700 },
  formulaBox: { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 12, margin: "10px 0", color: "#334155", fontSize: 13, lineHeight: 1.55 },
  formulaHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 },
  formulaTitle: { color: "#0F172A", fontSize: 13, fontWeight: 900 },
  formulaBadge: { color: "#64748B", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 800 },
  formulaLine: { display: "grid", gridTemplateColumns: "100px minmax(0, 1fr)", gap: 10, padding: "8px 0", borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0", alignItems: "center" },
  formulaHint: { color: "#64748B", marginTop: 8 },
  doseScale: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 0, marginTop: 8, border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden", background: "#FFFFFF" },
  scaleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderRight: "1px solid #E2E8F0", color: "#475569", fontSize: 12 },
  warning: { background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.55, marginTop: 10 },
  tableWrap: { overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 720 },
  th: { textAlign: "left", padding: "10px 12px", background: "#F8FAFC", color: "#475569", fontSize: 12, fontWeight: 800, borderBottom: "1px solid #E2E8F0", verticalAlign: "top" },
  td: { padding: "10px 12px", borderBottom: "1px solid #EEF2F7", color: "#334155", fontSize: 13, lineHeight: 1.55, verticalAlign: "top" },
  tdStrong: { padding: "10px 12px", borderBottom: "1px solid #EEF2F7", color: "#0F172A", fontSize: 13, lineHeight: 1.55, verticalAlign: "top", fontWeight: 800 },
  referenceBody: { color: "#334155", fontSize: 13, lineHeight: 1.65 },
  refHeading: { fontSize: 14, color: "#0F172A", margin: "14px 0 6px", fontWeight: 800 },
  bulletList: { margin: "0 0 0 18px", padding: 0, color: "#334155", fontSize: 13, lineHeight: 1.65 },
  bulletItem: { marginBottom: 4 },
};
