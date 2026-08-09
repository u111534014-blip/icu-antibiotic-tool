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

type KAccess = "peripheral" | "central" | "crrt";
type RenalRisk = "normal" | "impaired" | "oliguria" | "crrt";
type KSeverity = "mild" | "moderate" | "severe" | "critical" | "none";
type MgUnit = "mgdl" | "mmoll";
type MgSeverity = "none" | "mild" | "moderate" | "severe";

function n(value: string) {
  return parseFloat(value) || 0;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
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

const severityText: Record<KSeverity, string> = {
  none: "目前未達低血鉀範圍",
  mild: "Mild hypokalemia",
  moderate: "Moderate hypokalemia",
  severe: "Severe hypokalemia",
  critical: "Critical hypokalemia",
};

const mgSeverityText: Record<MgSeverity, string> = {
  none: "未達低血鎂或未輸入",
  mild: "Mild hypomagnesemia",
  moderate: "Moderate hypomagnesemia",
  severe: "Severe hypomagnesemia",
};

const renalText: Record<RenalRisk, string> = {
  normal: "腎功能穩定 / 有尿",
  impaired: "腎功能差但仍有尿",
  oliguria: "少尿 / 無尿",
  crrt: "CRRT / CVVH 中",
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

export default function ElectrolyteTool() {
  const [currentK, setCurrentK] = useState("3.0");
  const [targetK, setTargetK] = useState("4.0");
  const [renalRisk, setRenalRisk] = useState<RenalRisk>("normal");
  const [access, setAccess] = useState<KAccess>("peripheral");
  const [symptomatic, setSymptomatic] = useState(false);
  const [magLow, setMagLow] = useState(false);
  const [customDose, setCustomDose] = useState("");
  const [prepAmpules, setPrepAmpules] = useState("");
  const [finalVolume, setFinalVolume] = useState("100");
  const [infusionHours, setInfusionHours] = useState("1");
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
      const bags = Math.ceil(calc.dose / 10);
      return `建議拆成 ${bags} 袋：每袋 KCl 10 mEq 加入 NS 100 mL，run 1 hr/袋；若使用商業配方 KCl 10 mEq/500 mL，補鉀速度較慢且輸液量較大。`;
    }
    if (access === "central") {
      const bags = Math.ceil(calc.dose / 20);
      return `可拆成 ${bags} 袋：每袋 KCl 20 mEq 加入 NS 100 mL，常見 run 1 hr/袋；需心電監測與醫囑確認。`;
    }
    return "CVVH 調鉀請依 replacement fluid 總量計算；KCl 原汁只可加入 CVVH solution 並充分混合，不可直接 IV push。";
  }, [calc.dose, access]);

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

  return (
    <div>
      <header style={S.header}>
        <div style={S.kicker}>Electrolyte Replacement</div>
        <h1 style={S.title}>電解質補充工具</h1>
        <div style={S.subtitle}>第一版：KCl 補鉀、稀釋濃度、輸注速率與 CVVH 注意事項</div>
      </header>

      <section style={S.notice}>
        <div style={S.noticeTitle}>安全提醒</div>
        KCl concentrate 絕不可直接 IV push。低血鉀合併 ECG change、肌無力/麻痺、digoxin toxicity、DKA/HHS、腎功能急變或少尿無尿，需依醫囑與心電監測調整。
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
        </div>
      </section>

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

      <section style={S.section}>
        <div style={S.sectionTitle}>常用速查</div>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>情境</th>
                <th style={S.th}>常見泡法 / 速率</th>
                <th style={S.th}>備註</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={S.tdStrong}>周邊 IV</td>
                <td style={S.td}>KCl 10 mEq in NS 100 mL，run 1 hr；或商業配方 KCl 10 mEq/500 mL 依醫囑輸注。</td>
                <td style={S.td}>通常不超過 10 mEq/hr；避免高濃度造成疼痛/靜脈炎。</td>
              </tr>
              <tr>
                <td style={S.tdStrong}>中心靜脈 / ICU</td>
                <td style={S.td}>KCl 20 mEq in NS 100 mL，常見 run 1 hr；嚴重低血鉀可依醫囑與心電監測調整。</td>
                <td style={S.td}>高於 20 mEq/hr 或 K &lt;2.5 合併症狀，需更密集監測。</td>
              </tr>
              <tr>
                <td style={S.tdStrong}>CVVH / CRRT</td>
                <td style={S.td}>院內 CVVH KCl supplement：If K &lt;4.5 mEq/L，CVVH solution 每袋加 KCl 20 mEq；If K &gt;=4.5 mEq/L，不加 KCl。</td>
                <td style={S.td}>這是調整機器液體，不是 IV bolus。15% KCl 20 mEq = 10 mL = 1 amp；加入後需充分混合並標示。</td>
              </tr>
              <tr>
                <td style={S.tdStrong}>複查</td>
                <td style={S.td}>IV 補充後常於補完後約 1-2 hr 或下一輪檢驗複查；urgent replacement 需更早、更密集。</td>
                <td style={S.td}>若仍低，請評估 Mg、持續 GI/renal loss、insulin/beta-agonist、鹼中毒或 refeeding。</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section style={S.section}>
        <div style={S.sectionTitle}>臨床參考</div>
        <div style={S.referenceBody}>
          <h3 style={S.refHeading}>KCl concentrate 的底線</h3>
          <p>KCl concentrate 必須稀釋後才能 IV infusion；未稀釋直接注射可能造成致命心律不整或心跳停止。若 serum K &gt;2.5 mEq/L，仿單常見上限為 10 mEq/hr、濃度最高 40 mEq/L；若 K &lt;2 mEq/L 且有 ECG change 或 paralysis，才考慮在連續心電監測下更高速率。</p>

          <h3 style={S.refHeading}>為什麼優先用 NS？</h3>
          <p>嚴重低血鉀時，dextrose-containing fluid 可能刺激 insulin 分泌並讓 K 短暫往細胞內移動；除非有其他理由，critical replacement 通常偏好用 saline 稀釋。</p>

          <h3 style={S.refHeading}>補鉀前後要一起看的東西</h3>
          <Bullets items={[
            "Mg：低 Mg 會造成 renal K wasting，常讓低血鉀補不起來。",
            "腎功能與尿量：少尿/無尿時補鉀要非常保守，並提早複查。",
            "酸鹼與血糖/insulin：鹼中毒、insulin、beta-agonist 會讓 K 往細胞內移動。",
            "ECG 與用藥：digoxin、QT/arrhythmia risk、利尿劑、laxative、amphotericin B 都會影響風險判斷。",
          ]} />
        </div>
      </section>
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
