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
    let q6hNutrition = 0;
    let planNote = "";

    if (nutrition === "eating") {
      basal = units(tdd * 0.5);
      mealBolus = units((tdd * 0.5) / 3);
      planNote = "有規則進食：TDD 約 50% basal + 50% prandial 分三餐，另加 correction。";
    } else if (nutrition === "tube") {
      basal = units(tdd * 0.4);
      q6hNutrition = units((tdd * 0.6) / 4);
      planNote = "連續營養：可用 basal + q6h nutritional insulin + correction；若 tube feeding 中斷需預防低血糖。";
    } else {
      basal = units(tdd * 0.5);
      planNote = nutrition === "npo"
        ? "NPO：保留 basal + correction；不給固定餐前 bolus。"
        : "食量不穩：以 basal + correction 為主；prandial 可依實際吃完比例給。";
    }

    const cf = correctionFactor(Math.max(roundedTdd, 1));
    const correction = cf ? correctionDose(bg, target, cf) : 0;
    const scale = roundedTdd < 40 ? "low scale" : roundedTdd <= 80 ? "medium scale" : "high scale";

    return {
      tdd: roundedTdd,
      basal,
      mealBolus,
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
    ? "ICU：多數病人目標 140-180 mg/dL；persistent BG >=180 mg/dL 時啟動/加強 insulin。"
    : "非 ICU：多數病人目標 100-180 mg/dL；若 >=180 mg/dL 持續出現，考慮 scheduled insulin。";

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
          <Row label="Basal insulin" value={`${calc.basal} units/day`} note="常用 glargine QD 或 NPH 分次；依院內品項調整。" />
          {nutrition === "eating" && <Row label="Prandial insulin" value={`${calc.mealBolus} units AC each meal`} note="三餐規則進食時使用；未進食不給固定餐前 bolus。" />}
          {nutrition === "tube" && <Row label="Nutritional insulin" value={`${calc.q6hNutrition} units q6h`} note="連續管灌/TPN 可用；營養中斷時要有 hypoglycemia prevention plan。" />}
          {(nutrition === "poor" || nutrition === "npo") && <Row label="Scheduled prandial" value="hold" note={calc.planNote} />}
          <Row label="Correction factor" value={calc.cf ? `1 unit ↓ ~${calc.cf} mg/dL` : "—"} note={`目前依 TDD 分類為 ${calc.scale}；correction 不等於單獨 sliding scale 長期使用。`} />
          <Row label="Current BG correction" value={`${calc.correction} units`} note={`以 BG ${calc.bg || "—"}、target ${calc.target || "—"} mg/dL 粗估。`} />
          <div style={S.warningBox}>
            若 BG &lt;70 mg/dL、NPO/營養突然中斷、SCr 急升、vasopressor 增加或 steroid taper，優先處理低血糖風險並下修 basal/bolus。
          </div>
        </section>
      </div>

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
                ["Fasting / 清晨血糖高", "調 basal 10-20%", "先確認半夜沒有低血糖反彈、睡前點心或 steroid 影響。"],
                ["餐前血糖高", "看前一餐 prandial/correction，調餐前 bolus 10-20%", "若上一餐沒吃完，不要只看血糖就硬加。"],
                ["餐後高", "調同一餐 prandial 或 carb ratio", "steroid 常造成午晚餐前/餐後高。"],
                ["半夜/清晨低血糖", "降 basal 10-20% 或更多", "腎功能變差、吃少、steroid 減量都會增加風險。"],
                ["NPO 仍反覆高血糖", "保留 basal + q4-6h correction", "不要給固定餐前 bolus；若 ICU 持續 >=180 可考慮 IV insulin protocol。"],
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

      <InfoCard title="臨床參考">
        <Bullets items={[
          "ADA 2026：ICU persistent hyperglycemia >=180 mg/dL 時啟動或加強 insulin；多數 ICU 目標 140-180 mg/dL。",
          "ADA 2026：非 ICU 多數目標 100-180 mg/dL；進食良好者以 basal + prandial + correction 為偏好架構。",
          "非 ICU 吃很少/NPO：basal insulin 或 basal + correction 為偏好；避免 prolonged SSI alone。",
          "TDD 常用 0.3-0.6 units/kg/day 起始；低血糖高風險用較低，steroid/感染/肥胖或 insulin resistance 用較高。",
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
  inputLabel: { display: "block", color: "#475569", fontSize: 12, fontWeight: 800, marginTop: 10 },
  inputWrap: { display: "flex", alignItems: "center", marginTop: 5, border: "1.5px solid #DDE7EE", borderRadius: 8, background: "#fff", overflow: "hidden" },
  input: { flex: 1, minWidth: 0, border: "none", outline: "none", padding: "10px 10px", fontSize: 14, color: "#0F172A" },
  inputSuffix: { padding: "0 10px", color: "#94A3B8", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" },
  segmentRow: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 },
  segmentWrap: { display: "flex", flexWrap: "wrap", gap: 6 },
  segment: { flex: "0 0 auto", border: "1.5px solid #DDE7EE", background: "#fff", color: "#475569", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 800, cursor: "pointer" },
  segmentActive: { border: `1.5px solid ${ACCENT}`, background: "#F0FDFA", color: "#0F766E" },
  checkRow: { display: "flex", alignItems: "center", gap: 8, color: "#334155", fontSize: 13, fontWeight: 700, marginTop: 12, lineHeight: 1.4 },
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
