import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

const ACCENT = "#0D9488";

type NutritionStatus = "eating" | "poor" | "npo" | "tube";
type DoseSource = "weight" | "home" | "drip";
type Sensitivity = "highRisk" | "standard" | "resistant";

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function units(value: number) {
  return Math.max(0, Math.round(value));
}

function getFactor(sensitivity: Sensitivity) {
  if (sensitivity === "highRisk") return 0.25;
  if (sensitivity === "resistant") return 0.55;
  return 0.4;
}

function correctionFactor(tdd: number) {
  if (tdd <= 0) return null;
  return Math.round(1800 / tdd);
}

function correctionDose(bg: number, target: number, cf: number) {
  if (bg <= target || cf <= 0) return 0;
  return Math.max(0, Math.round((bg - target) / cf));
}

function bgAdjustment(bg: number, hadHypo = false) {
  if (hadHypo) return { pct: -0.2, label: "有低血糖，先降 20%" };
  if (!bg || bg <= 0) return { pct: 0, label: "未輸入，維持原劑量" };
  if (bg < 70) return { pct: -0.2, label: "低血糖，降 20%" };
  if (bg < 100) return { pct: -0.1, label: "偏低，降 10%" };
  if (bg > 250) return { pct: 0.2, label: "明顯偏高，升 20%" };
  if (bg > 180) return { pct: 0.1, label: "偏高，升 10%" };
  return { pct: 0, label: "目標內，維持" };
}

function adjustedDose(base: number, pct: number) {
  return units(base * (1 + pct));
}

function startingBolusFromPattern(bg: number, estimatedMealBolus: number) {
  if (!bg || bg <= 180) return 0;
  if (bg > 250) return Math.max(1, estimatedMealBolus);
  return Math.max(1, Math.ceil(estimatedMealBolus / 2));
}

function doseOrFallback(value: string, fallback: number) {
  if (value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const nutritionLabels: Record<NutritionStatus, string> = {
  eating: "有規則進食",
  poor: "吃很少 / 食量不穩",
  npo: "NPO",
  tube: "連續管灌 / TPN",
};

const sensitivityLabels: Record<Sensitivity, string> = {
  highRisk: "低血糖高風險",
  standard: "一般起始",
  resistant: "胰島素阻抗 / steroid / 感染",
};

function Bullets({ items }: { items: string[] }) {
  return (
    <ul style={S.bulletList}>
      {items.map((item) => <li key={item} style={S.bulletItem}>{item}</li>)}
    </ul>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={S.card}>
      <div style={S.cardTitle}>{title}</div>
      {children}
    </section>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={S.resultRow}>
      <div>
        <div style={S.resultLabel}>{label}</div>
        {note && <div style={S.resultNote}>{note}</div>}
      </div>
      <strong style={S.resultValueSmall}>{value}</strong>
    </div>
  );
}

export default function InsulinTool() {
  const [careArea, setCareArea] = useState<"icu" | "ward">("ward");
  const [weight, setWeight] = useState("60");
  const [nutrition, setNutrition] = useState<NutritionStatus>("eating");
  const [sensitivity, setSensitivity] = useState<Sensitivity>("standard");
  const [doseSource, setDoseSource] = useState<DoseSource>("weight");
  const [homeTdd, setHomeTdd] = useState("");
  const [dripRate, setDripRate] = useState("");
  const [currentBg, setCurrentBg] = useState("220");
  const [targetBg, setTargetBg] = useState("150");
  const [steroid, setSteroid] = useState(false);
  const [currentBasal, setCurrentBasal] = useState("");
  const [breakfastBolus, setBreakfastBolus] = useState("");
  const [lunchBolus, setLunchBolus] = useState("");
  const [dinnerBolus, setDinnerBolus] = useState("");
  const [fastingBg, setFastingBg] = useState("");
  const [preLunchBg, setPreLunchBg] = useState("");
  const [preDinnerBg, setPreDinnerBg] = useState("");
  const [bedtimeBg, setBedtimeBg] = useState("");
  const [hadHypo, setHadHypo] = useState(false);

  const calc = useMemo(() => {
    const w = Number(weight);
    const bg = Number(currentBg);
    const target = Number(targetBg) || 150;
    const home = Number(homeTdd);
    const drip = Number(dripRate);
    const factor = getFactor(steroid && sensitivity === "standard" ? "resistant" : sensitivity);

    let tdd = 0;
    let sourceNote = "";
    if (doseSource === "home" && home > 0) {
      tdd = home * 0.8;
      sourceNote = `以 home TDD ${home} units/day 的 80% 粗估。`;
    } else if (doseSource === "drip" && drip > 0) {
      tdd = drip * 24 * 0.6;
      sourceNote = `以最近 6-8 hr insulin drip 平均 ${drip} units/hr × 24 × 60% 粗估。`;
    } else if (w > 0) {
      tdd = w * factor;
      sourceNote = `以體重 ${w} kg × ${factor} units/kg/day 粗估。`;
    }

    const roundedTdd = units(tdd);
    let basal = 0;
    let mealBolus = 0;
    let q6hNutritionTotal = 0;
    let q6hNutrition = 0;
    let planNote = "";

    if (nutrition === "eating") {
      basal = units(tdd * 0.5);
      mealBolus = units((tdd * 0.5) / 3);
      planNote = "有規則進食：TDD 約 50% basal + 50% 餐前 bolus 分三餐，另加 correction。";
    } else if (nutrition === "tube") {
      basal = units(tdd * 0.4);
      q6hNutritionTotal = Math.max(0, roundedTdd - basal);
      q6hNutrition = round(q6hNutritionTotal / 4, 1);
      planNote = "連續營養：可用 basal + q6h nutritional insulin + correction；若 tube feeding 中斷需預防低血糖。";
    } else {
      basal = units(tdd * 0.5);
      planNote = nutrition === "npo"
        ? "NPO：保留 basal + correction；不給固定餐前 bolus。"
        : "食量不穩：以 basal + correction 為主；餐前 bolus 可依實際吃完比例給。";
    }

    const cf = correctionFactor(Math.max(roundedTdd, 1));
    const correction = cf ? correctionDose(bg, target, cf) : 0;
    const scale = roundedTdd < 40 ? "low scale" : roundedTdd <= 80 ? "medium scale" : "high scale";

    return {
      tdd: roundedTdd,
      basal,
      mealBolus,
      q6hNutritionTotal,
      q6hNutrition,
      sourceNote,
      planNote,
      cf,
      correction,
      scale,
      bg,
      target,
      factor,
    };
  }, [weight, currentBg, targetBg, homeTdd, dripRate, doseSource, sensitivity, steroid, nutrition]);

  const targetText = careArea === "icu"
    ? "ICU：多數病人目標 140-180 mg/dL；persistent BG >=180 mg/dL 時啟動/加強 insulin。若病況不穩、vasopressor 增加或營養變動大，通常優先使用 IV insulin protocol；下列 SC 劑量較適合穩定病人或 drip 轉 SC 粗估。"
    : "非 ICU：多數病人目標 100-180 mg/dL；若 >=180 mg/dL 持續出現，考慮 scheduled insulin。";

  const dailyAdjustment = useMemo(() => {
    const basalBase = doseOrFallback(currentBasal, calc.basal);
    const breakfastBase = doseOrFallback(breakfastBolus, calc.mealBolus);
    const lunchBase = doseOrFallback(lunchBolus, calc.mealBolus);
    const dinnerBase = doseOrFallback(dinnerBolus, calc.mealBolus);

    const basalAdj = bgAdjustment(Number(fastingBg), hadHypo);
    const breakfastAdj = bgAdjustment(Number(preLunchBg), hadHypo);
    const lunchAdj = bgAdjustment(Number(preDinnerBg), hadHypo);
    const dinnerAdj = bgAdjustment(Number(bedtimeBg), hadHypo);

    return {
      basal: { base: basalBase, next: adjustedDose(basalBase, basalAdj.pct), bg: Number(fastingBg), ...basalAdj },
      breakfast: { base: breakfastBase, next: adjustedDose(breakfastBase, breakfastAdj.pct), bg: Number(preLunchBg), ...breakfastAdj },
      lunch: { base: lunchBase, next: adjustedDose(lunchBase, lunchAdj.pct), bg: Number(preDinnerBg), ...lunchAdj },
      dinner: { base: dinnerBase, next: adjustedDose(dinnerBase, dinnerAdj.pct), bg: Number(bedtimeBg), ...dinnerAdj },
    };
  }, [currentBasal, breakfastBolus, lunchBolus, dinnerBolus, fastingBg, preLunchBg, preDinnerBg, bedtimeBg, hadHypo, calc.basal, calc.mealBolus]);

  const adjustmentRows = [
    ["Basal HS", "隔日 fasting / 清晨血糖", dailyAdjustment.basal],
    ["早餐 bolus", "午餐前血糖", dailyAdjustment.breakfast],
    ["午餐 bolus", "晚餐前血糖", dailyAdjustment.lunch],
    ["晚餐 bolus", "睡前血糖", dailyAdjustment.dinner],
  ] as const;

  function adjustmentSuggestion(name: string, row: typeof dailyAdjustment.basal) {
    const isBolus = name.includes("bolus");
    if (isBolus && row.base === 0) {
      if (nutrition !== "eating") {
        return "0 units（目前未使用固定 bolus；NPO/吃很少時通常不新增固定餐前 bolus，先用 correction 或依實際進食比例）";
      }
      const start = startingBolusFromPattern(row.bg, calc.mealBolus);
      if (start > 0) {
        return `${start} units（目前未使用固定 bolus；對應血糖偏高，可考慮新增保守餐前 bolus 起始劑量，並保留 correction）`;
      }
      return "0 units（目前未使用固定 bolus；血糖未達新增固定餐前 bolus 門檻，先觀察或用 correction）";
    }
    return `${row.next} units（${row.label}）`;
  }

  return (
    <div>
      <header style={S.header}>
        <div style={S.kicker}>Inpatient Glycemic Tool</div>
        <h1 style={S.title}>血糖 / Insulin 調整</h1>
        <div style={S.subtitle}>Basal-bolus、correction、NPO/管灌與 drip 轉 SC 粗估</div>
      </header>

      <section style={S.notice}>
        <div style={S.noticeTitle}>安全提醒</div>
        本工具提供成人住院 insulin 劑量粗估；Type 1 DM、DKA/HHS、pregnancy、insulin pump、嚴重低血糖反覆發生、TPN/enteral feeding 中斷、high-dose steroid 或病情快速變動時，建議依院內 protocol 或會診內分泌團隊。
      </section>

      <div style={S.layoutGrid}>
        <section style={S.card}>
          <div style={S.cardTitle}>病人與計算來源</div>

          <label style={S.label}>照護場域</label>
          <div style={S.segmentRow}>
            {([["ward", "一般病房"], ["icu", "ICU"]] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setCareArea(id)} style={{ ...S.segment, ...(careArea === id ? S.segmentActive : {}) }}>
                {label}
              </button>
            ))}
          </div>

          <div style={S.inputGrid}>
            <label style={S.inputLabel}>
              <span>體重</span>
              <div style={S.inputWrap}>
                <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" style={S.input} />
                <span style={S.inputSuffix}>kg</span>
              </div>
            </label>
            <label style={S.inputLabel}>
              <span>目前血糖</span>
              <div style={S.inputWrap}>
                <input value={currentBg} onChange={(e) => setCurrentBg(e.target.value)} inputMode="decimal" style={S.input} />
                <span style={S.inputSuffix}>mg/dL</span>
              </div>
            </label>
            <label style={S.inputLabel}>
              <span>Correction target</span>
              <div style={S.inputWrap}>
                <input value={targetBg} onChange={(e) => setTargetBg(e.target.value)} inputMode="decimal" style={S.input} />
                <span style={S.inputSuffix}>mg/dL</span>
              </div>
            </label>
          </div>

          <label style={S.label}>進食 / 營養狀態</label>
          <div style={S.segmentWrap}>
            {(Object.keys(nutritionLabels) as NutritionStatus[]).map((id) => (
              <button key={id} type="button" onClick={() => setNutrition(id)} style={{ ...S.segment, ...(nutrition === id ? S.segmentActive : {}) }}>
                {nutritionLabels[id]}
              </button>
            ))}
          </div>

          <label style={S.label}>起始敏感度</label>
          <div style={S.segmentWrap}>
            {(Object.keys(sensitivityLabels) as Sensitivity[]).map((id) => (
              <button key={id} type="button" onClick={() => setSensitivity(id)} style={{ ...S.segment, ...(sensitivity === id ? S.segmentActive : {}) }}>
                {sensitivityLabels[id]}
              </button>
            ))}
          </div>

          <label style={S.checkRow}>
            <input type="checkbox" checked={steroid} onChange={(e) => setSteroid(e.target.checked)} />
            <span>正在使用 systemic steroid / 明顯 stress hyperglycemia</span>
          </label>

          <label style={S.label}>TDD 來源</label>
          <div style={S.segmentRow}>
            {([["weight", "體重估算"], ["home", "Home TDD"], ["drip", "Drip 轉 SC"]] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setDoseSource(id)} style={{ ...S.segment, ...(doseSource === id ? S.segmentActive : {}) }}>
                {label}
              </button>
            ))}
          </div>

          {doseSource === "home" && (
            <label style={S.inputLabel}>
              <span>Home total daily insulin</span>
              <div style={S.inputWrap}>
                <input value={homeTdd} onChange={(e) => setHomeTdd(e.target.value)} inputMode="decimal" style={S.input} />
                <span style={S.inputSuffix}>units/day</span>
              </div>
            </label>
          )}

          {doseSource === "drip" && (
            <label style={S.inputLabel}>
              <span>最近 6-8 hr 平均 infusion rate</span>
              <div style={S.inputWrap}>
                <input value={dripRate} onChange={(e) => setDripRate(e.target.value)} inputMode="decimal" style={S.input} />
                <span style={S.inputSuffix}>units/hr</span>
              </div>
            </label>
          )}
        </section>

        <section style={S.resultCard}>
          <div style={S.cardTitle}>建議粗估</div>
          <div style={S.targetBox}>{targetText}</div>
          <Row label="Estimated TDD" value={`${calc.tdd} units/day`} note={calc.sourceNote || "請輸入體重、home TDD 或 drip rate。"} />
          <Row label="Basal insulin HS" value={`${calc.basal} units HS`} note="院內 basal 多為 HS 給藥；本工具以隔日 fasting BG 作為 HS basal 調整依據。" />
          {nutrition === "eating" && <Row label="餐前 bolus" value={`${calc.mealBolus} units AC each meal`} note="三餐規則進食時使用；未進食不給固定餐前 bolus。" />}
          {nutrition === "tube" && <Row label="Nutritional insulin" value={`${calc.q6hNutritionTotal} units/day (~${calc.q6hNutrition} units q6h)`} note="連續管灌/TPN 可用；q6h 劑量需依院內可給單位取整。營養中斷時要有 hypoglycemia prevention plan。" />}
          {(nutrition === "poor" || nutrition === "npo") && <Row label="固定餐前 bolus" value="hold" note={calc.planNote} />}
          <Row label="Correction factor" value={calc.cf ? `1 unit ↓ ~${calc.cf} mg/dL` : "—"} note={`目前依 TDD 分類為 ${calc.scale}；correction 不等於單獨 sliding scale 長期使用。`} />
          <Row label="Current BG correction" value={`${calc.correction} units`} note={`以 BG ${calc.bg || "—"}、target ${calc.target || "—"} mg/dL 粗估；單點血糖只影響 correction，不自動改 basal/bolus。`} />
          <div style={S.warningBox}>
            若 BG &lt;70 mg/dL、NPO/營養突然中斷、SCr 急升、vasopressor 增加或 steroid taper，優先處理低血糖風險並下修 HS basal/bolus。
          </div>
        </section>
      </div>

      <InfoCard title="每日劑量調整計算">
        <div style={S.helpBox}>
          Basal / bolus 調整看的是「型態」而不是單點血糖：院內 basal 多為 HS 給藥，因此隔日 fasting BG 主要用來調 HS basal；午餐前反映早餐 bolus；晚餐前反映午餐 bolus；睡前大致反映晚餐 bolus。
        </div>
        <div style={S.helpBox}>
          每日調整門檻：此區粗估以 100-180 mg/dL 視為目標內；181-250 mg/dL 約上調 10%；&gt;250 mg/dL 約上調 20%；&lt;100 mg/dL 下修，&lt;70 mg/dL 或有症狀低血糖先降 20%。這裡看的是 basal/bolus 型態，不等同 correction dose 的目標血糖；若有規則進食、目前固定 bolus 是 0，且對應血糖持續 &gt;180，會提示可保守新增餐前 bolus。
        </div>
        <div style={S.adjustmentInputGrid}>
          <div style={S.adjustmentPair}>
            <label style={S.inputLabel}>
              <span>目前 basal HS</span>
              <div style={S.inputWrap}>
                <input value={currentBasal} onChange={(e) => setCurrentBasal(e.target.value)} inputMode="decimal" placeholder={`${calc.basal}`} style={S.input} />
                <span style={S.inputSuffix}>units HS</span>
              </div>
            </label>
            <label style={S.inputLabel}>
              <span>Fasting / 清晨血糖</span>
              <div style={S.inputWrap}>
                <input value={fastingBg} onChange={(e) => setFastingBg(e.target.value)} inputMode="decimal" style={S.input} />
                <span style={S.inputSuffix}>mg/dL</span>
              </div>
            </label>
          </div>

          <div style={S.adjustmentPair}>
            <label style={S.inputLabel}>
              <span>早餐前 bolus</span>
              <div style={S.inputWrap}>
                <input value={breakfastBolus} onChange={(e) => setBreakfastBolus(e.target.value)} inputMode="decimal" placeholder={`${calc.mealBolus}`} style={S.input} />
                <span style={S.inputSuffix}>units</span>
              </div>
            </label>
            <label style={S.inputLabel}>
              <span>午餐前血糖</span>
              <div style={S.inputWrap}>
                <input value={preLunchBg} onChange={(e) => setPreLunchBg(e.target.value)} inputMode="decimal" style={S.input} />
                <span style={S.inputSuffix}>mg/dL</span>
              </div>
            </label>
          </div>

          <div style={S.adjustmentPair}>
            <label style={S.inputLabel}>
              <span>午餐前 bolus</span>
              <div style={S.inputWrap}>
                <input value={lunchBolus} onChange={(e) => setLunchBolus(e.target.value)} inputMode="decimal" placeholder={`${calc.mealBolus}`} style={S.input} />
                <span style={S.inputSuffix}>units</span>
              </div>
            </label>
            <label style={S.inputLabel}>
              <span>晚餐前血糖</span>
              <div style={S.inputWrap}>
                <input value={preDinnerBg} onChange={(e) => setPreDinnerBg(e.target.value)} inputMode="decimal" style={S.input} />
                <span style={S.inputSuffix}>mg/dL</span>
              </div>
            </label>
          </div>

          <div style={S.adjustmentPair}>
            <label style={S.inputLabel}>
              <span>晚餐前 bolus</span>
              <div style={S.inputWrap}>
                <input value={dinnerBolus} onChange={(e) => setDinnerBolus(e.target.value)} inputMode="decimal" placeholder={`${calc.mealBolus}`} style={S.input} />
                <span style={S.inputSuffix}>units</span>
              </div>
            </label>
            <label style={S.inputLabel}>
              <span>睡前血糖</span>
              <div style={S.inputWrap}>
                <input value={bedtimeBg} onChange={(e) => setBedtimeBg(e.target.value)} inputMode="decimal" style={S.input} />
                <span style={S.inputSuffix}>mg/dL</span>
              </div>
            </label>
          </div>
        </div>

        <label style={S.checkRow}>
          <input type="checkbox" checked={hadHypo} onChange={(e) => setHadHypo(e.target.checked)} />
          <span>過去 24 小時有 BG &lt;70 mg/dL 或有症狀低血糖</span>
        </label>

        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>項目</th>
                <th style={S.th}>依據</th>
                <th style={S.th}>目前/基準</th>
                <th style={S.th}>建議</th>
              </tr>
            </thead>
            <tbody>
              {adjustmentRows.map(([name, basis, item]) => {
                const row = item as typeof dailyAdjustment.basal;
                const suggestion = adjustmentSuggestion(name, row);
                return (
                  <tr key={name as string}>
                    <td style={S.tdStrong}>{name as string}</td>
                    <td style={S.td}>{basis as string}</td>
                    <td style={S.td}>{row.base} units</td>
                    <td style={S.td}>{suggestion}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={S.source}>
          此區以常用 10-20% 調整邏輯做 bedside 粗估；若 NPO/吃很少，固定餐前 bolus 通常應暫停或依實際進食比例給。
        </div>
      </InfoCard>

      <InfoCard title="每日調整邏輯">
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>看到的型態</th>
                <th style={S.th}>通常調哪裡</th>
                <th style={S.th}>提醒</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Fasting / 清晨血糖高", "調 HS basal 10-20%", "先確認半夜沒有低血糖反彈、睡前點心或 steroid 影響。"],
                ["餐前血糖高", "看前一餐 bolus/correction，調餐前 bolus 10-20%", "若上一餐沒吃完，不要只看血糖就硬加。"],
                ["餐後高", "調同一餐 bolus 或 carb ratio", "steroid 常造成午晚餐前/餐後高。"],
                ["半夜/清晨低血糖", "降 HS basal 10-20% 或更多", "腎功能變差、吃少、steroid 減量都會增加風險。"],
                ["NPO 仍反覆高血糖", "保留 HS basal + q4-6h correction", "不要給固定餐前 bolus；若 ICU 持續 >=180 可考慮 IV insulin protocol。"],
              ].map((row) => (
                <tr key={row[0]}>
                  <td style={S.tdStrong}>{row[0]}</td>
                  <td style={S.td}>{row[1]}</td>
                  <td style={S.td}>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InfoCard>

      <InfoCard title="住院 / ICU TDD 拆分速查">
        <div style={S.tableWrap}>
          <table style={{ ...S.table, minWidth: 920 }}>
            <thead>
              <tr>
                <th style={S.th}>場域</th>
                <th style={S.th}>營養狀態</th>
                <th style={S.th}>常用架構</th>
                <th style={S.th}>TDD 拆法</th>
                <th style={S.th}>重點提醒</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["非 ICU", "規則進食", "Basal + 餐前 bolus + correction", "約 50% basal；約 50% 餐前 bolus 分三餐。", "餐前 bolus 要跟實際進食搭配；若吃不完，避免照原 bolus 全給。"],
                ["非 ICU", "吃很少 / 食量不穩", "Basal + correction；餐前 bolus 可餐後依比例補", "Basal 約 40-50%；固定餐前 bolus 先保守或暫緩。", "適合用 correction 觀察趨勢；若餐前/餐後持續高，再逐步加餐前 bolus。"],
                ["非 ICU", "NPO", "Basal + q4-6h correction", "Basal 約 40-50%；不給固定餐前 bolus。", "Type 1 DM 仍需 basal；若反覆低血糖、CKD 或吃少，basal 要下修。"],
                ["非 ICU", "連續管灌 / TPN", "Basal + q4-6h nutritional + correction", "Basal 約 30-40%；其餘作為 q4-6h nutritional insulin。", "營養中斷時要停 nutritional insulin，並有 D10 或 hypoglycemia prevention plan。"],
                ["ICU", "規則進食且穩定", "可用 SC basal + 餐前 bolus + correction", "可類似非 ICU：約 50% basal + 50% 餐前 bolus。", "若 persistent BG >=180、病況變動或需要快速調整，改想 IV insulin protocol。"],
                ["ICU", "吃很少 / NPO / 血流動力不穩", "IV insulin protocol 優先；穩定後才轉 SC", "若暫用 SC：保留 basal 或 basal + correction；不給固定餐前 bolus。", "Vasopressor、steroid、AKI、感染變動會讓需求快速改變；不要只靠一次 TDD。"],
                ["ICU", "連續管灌 / TPN", "IV insulin protocol 或 basal + q4-6h nutritional + correction", "穩定可用 basal 約 30-40%；其餘作 nutritional q4-6h。", "管灌/TPN 中斷是低血糖高風險；營養速率改變時 insulin 也要同步重估。"],
                ["Drip 轉 SC", "任一營養狀態", "先估 SC TDD，再依營養狀態拆分", "最近穩定 6-8 hr drip rate × 24，再取約 60-80%；本工具用 60% 較保守。", "Basal 通常要在停 drip 前約 2 hr 給，避免 insulin gap 與 rebound hyperglycemia。"],
              ].map((row) => (
                <tr key={`${row[0]}-${row[1]}`}>
                  <td style={S.tdStrong}>{row[0]}</td>
                  <td style={S.tdStrong}>{row[1]}</td>
                  <td style={S.td}>{row[2]}</td>
                  <td style={S.td}>{row[3]}</td>
                  <td style={S.td}>{row[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={S.source}>
          這張表是 bedside 拆分邏輯整理；實際劑量仍需依低血糖風險、腎功能、steroid、感染、營養變動與院內 protocol 調整。
        </div>
      </InfoCard>

      <InfoCard title="臨床參考">
        <Bullets items={[
          "ADA 2026：ICU persistent hyperglycemia >=180 mg/dL 時啟動或加強 insulin；多數 ICU 目標 140-180 mg/dL。",
          "ADA 2026：非 ICU 多數目標 100-180 mg/dL；進食良好者以 basal + 餐前 bolus + correction 為偏好架構。院內若 basal 多為 HS 給藥，隔日 fasting BG 是主要調整依據。",
          "非 ICU、規則進食：TDD 常拆成約 50% basal + 50% 餐前 bolus；餐前 bolus 再分三餐，並加 correction。例：TDD 24 units/day → basal 12 units HS + bolus 4 units AC each meal。",
          "非 ICU、吃很少或 NPO：偏好 basal insulin 或 basal + correction；通常不給固定餐前 bolus，若恢復進食再依實際吃飯比例補餐前 bolus。避免 prolonged SSI alone。",
          "連續管灌/TPN：不適合用三餐 bolus 思維；可抓 basal 約 30-40%，其餘作為 q4-6h nutritional insulin，再加 correction。營養中斷時要有 hypoglycemia prevention plan。",
          "ICU：若病況不穩、vasopressor 增加、營養變動大或血糖持續偏高，通常優先考慮 IV insulin protocol；SC basal/nutritional/correction 拆法較適合穩定病人或 drip 轉 SC 粗估。",
          "體重估算 TDD 不是固定公式：0.2-0.3 units/kg/day 可用於高齡、CKD/eGFR 低、吃很少或低血糖風險高；0.4 units/kg/day 是一般病人、血糖中度偏高時的常用起始估算；0.5-0.6 units/kg/day 可用於感染、systemic steroid、肥胖、insulin resistance 或血糖明顯偏高。",
          "IV insulin 轉 SC：可用最近 6-8 小時平均 rate × 24 推估，再取約 60% 作為初始 SC TDD；basal 需在停 drip 前先給，避免 insulin gap。",
        ]} />
        <div style={S.source}>
          來源：ADA Standards of Care in Diabetes 2026, Section 16；Endocrine Society inpatient hyperglycemia guideline 2022。
        </div>
      </InfoCard>
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
  layoutGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, alignItems: "start" },
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" },
  resultCard: { background: "#fff", border: "1px solid #B6E4DA", borderRadius: 8, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" },
  cardTitle: { fontSize: 15, fontWeight: 850, color: "#0F172A", lineHeight: 1.35, marginBottom: 10 },
  label: { display: "block", color: "#64748B", fontSize: 12, fontWeight: 850, margin: "12px 0 6px" },
  inputGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 },
  adjustmentInputGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 },
  adjustmentPair: { minWidth: 0 },
  inputLabel: { display: "block", color: "#475569", fontSize: 12, fontWeight: 800, marginTop: 10 },
  inputWrap: { display: "flex", alignItems: "center", marginTop: 5, border: "1.5px solid #DDE7EE", borderRadius: 8, background: "#fff", overflow: "hidden" },
  input: { flex: 1, minWidth: 0, border: "none", outline: "none", padding: "10px 10px", fontSize: 14, color: "#0F172A" },
  inputSuffix: { padding: "0 10px", color: "#94A3B8", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" },
  segmentRow: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 },
  segmentWrap: { display: "flex", flexWrap: "wrap", gap: 6 },
  segment: { flex: "0 0 auto", border: "1.5px solid #DDE7EE", background: "#fff", color: "#475569", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 800, cursor: "pointer" },
  segmentActive: { border: `1.5px solid ${ACCENT}`, background: "#F0FDFA", color: "#0F766E" },
  checkRow: { display: "flex", alignItems: "center", gap: 8, color: "#334155", fontSize: 13, fontWeight: 700, marginTop: 12, lineHeight: 1.4 },
  helpBox: { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 10, color: "#475569", fontSize: 12, lineHeight: 1.55, marginBottom: 10 },
  targetBox: { background: "#F0FDFA", border: "1px solid #99F6E4", color: "#0F766E", borderRadius: 8, padding: 10, fontSize: 12, lineHeight: 1.5, fontWeight: 750, marginBottom: 8 },
  resultRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid #F1F5F9" },
  resultLabel: { fontSize: 12, fontWeight: 850, color: "#64748B" },
  resultNote: { marginTop: 3, fontSize: 11, color: "#94A3B8", lineHeight: 1.45 },
  resultValueSmall: { color: "#0F172A", fontSize: 15, textAlign: "right", whiteSpace: "nowrap" },
  warningBox: { marginTop: 12, background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 8, color: "#92400E", padding: 10, fontSize: 12, lineHeight: 1.5 },
  tableWrap: { overflowX: "auto", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, marginTop: 10 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 620 },
  th: { padding: "9px 8px", borderBottom: "2px solid #E2E8F0", textAlign: "left", color: "#475569", fontWeight: 850, background: "#F8FAFC", verticalAlign: "top" },
  td: { padding: "9px 8px", borderBottom: "1px solid #F1F5F9", color: "#334155", verticalAlign: "top", lineHeight: 1.5 },
  tdStrong: { padding: "9px 8px", borderBottom: "1px solid #F1F5F9", color: "#0F172A", fontWeight: 850, verticalAlign: "top", lineHeight: 1.5 },
  bulletList: { margin: "9px 0 0", paddingLeft: 18, color: "#334155", fontSize: 13, lineHeight: 1.55 },
  bulletItem: { marginBottom: 4 },
  source: { marginTop: 10, fontSize: 11, color: "#94A3B8", lineHeight: 1.45 },
};
