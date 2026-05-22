import { useState } from "react";

// ═══════════════════════════════════════════════════════════════
// Vancomycin TDM 計算器 — Phase 1：初始劑量推薦
// ═══════════════════════════════════════════════════════════════
// PK Models:
//   Buelga 2005 (general): CL = 0.018 × CrCl (mL/min), V = 0.98 × TBW
//   Roberts 2011 (critically ill): CL = 4.58 L/h, V = 1.53 × TBW
// ═══════════════════════════════════════════════════════════════

// ── PK Model Parameters ─────────────────────────────────────
type PKModel = {
  name: string;
  desc: string;
  getCL: (crcl: number, tbw: number) => number; // L/h
  getV: (tbw: number) => number;                 // L
};

const MODELS: Record<string, PKModel> = {
  buelga: {
    name: "Buelga 2005（一般）",
    desc: "適用於一般成人，1-compartment model",
    getCL: (crcl) => 0.018 * crcl,           // CL = 1.08 × CrCl(L/h) = 0.018 × CrCl(mL/min)
    getV: (tbw) => 0.98 * tbw,               // V = 0.98 × TBW
  },
  roberts: {
    name: "Roberts 2011（重症）",
    desc: "適用於 ICU 重症病人",
    getCL: (crcl) => 0.0325 * crcl,          // CL = 4.58 L/h at CrCl ~141 → ~0.0325 × CrCl
    getV: (tbw) => 1.53 * tbw,               // V = 1.53 × TBW
  },
};

// ── Helper：CrCl (Cockcroft-Gault) ──────────────────────────
function calcCrCl(age: number, tbw: number, scr: number, isFemale: boolean): number {
  const base = ((140 - age) * tbw) / (72 * scr);
  return isFemale ? base * 0.85 : base;
}

// ── Helper：四捨五入至 250 mg ───────────────────────────────
function roundTo250(mg: number): number {
  return Math.round(mg / 250) * 250;
}

// ── Helper：PK 計算 ─────────────────────────────────────────
function calcPK(dose_mg: number, interval_h: number, infusion_h: number, CL: number, V: number) {
  const kel = CL / V;                    // 消除速率常數 (1/h)
  const halflife = 0.693 / kel;          // 半衰期 (h)
  const ko = dose_mg / infusion_h;       // 輸注速率 (mg/h)

  // 穩定狀態 Peak（輸注結束時）
  const peak = (ko / CL) * (1 - Math.exp(-kel * infusion_h)) / (1 - Math.exp(-kel * interval_h));

  // 穩定狀態 Trough（下一劑前）
  const trough = peak * Math.exp(-kel * (interval_h - infusion_h));

  // AUC24 = Dose_daily / CL (at steady state)
  const doses_per_day = 24 / interval_h;
  const daily_dose = dose_mg * doses_per_day;
  const auc24 = daily_dose / CL;

  return { peak, trough, auc24, halflife, kel };
}

// ── 劑量選項生成 ─────────────────────────────────────────────
type DoseOption = {
  dose: number;
  interval: number;
  infusion: number;
  peak: number;
  trough: number;
  auc24: number;
  dailyDose: number;
  inRange: boolean;
};

function generateOptions(CL: number, V: number, targetAUCmin: number, targetAUCmax: number): DoseOption[] {
  const intervals = [8, 12, 24, 36, 48];
  const doses = [500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500];
  const results: DoseOption[] = [];

  for (const interval of intervals) {
    for (const dose of doses) {
      const infusion = Math.max(1, dose / 1000); // 1g/hr → 最少 1hr
      const pk = calcPK(dose, interval, infusion, CL, V);
      const dailyDose = dose * (24 / interval);
      if (dailyDose > 4500) continue; // 每日 >4.5g 跳過
      const inRange = pk.auc24 >= targetAUCmin && pk.auc24 <= targetAUCmax;
      results.push({
        dose, interval, infusion,
        peak: pk.peak, trough: pk.trough, auc24: pk.auc24,
        dailyDose, inRange,
      });
    }
  }

  // 排序：在範圍內的優先，然後依 AUC 距離 500 的偏差排
  results.sort((a, b) => {
    if (a.inRange !== b.inRange) return a.inRange ? -1 : 1;
    return Math.abs(a.auc24 - 500) - Math.abs(b.auc24 - 500);
  });

  return results;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════
export default function VancoTDM() {
  const [tbw, setTbw] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [scr, setScr] = useState("");
  const [modelKey, setModelKey] = useState("buelga");
  const [targetMin, setTargetMin] = useState("400");
  const [targetMax, setTargetMax] = useState("600");
  const [showResults, setShowResults] = useState(false);

  const w = parseFloat(tbw) || 0;
  const h = parseFloat(height) || 0;
  const a = parseFloat(age) || 0;
  const s = parseFloat(scr) || 0;
  const isFemale = gender === "female";

  const crcl = (w > 0 && a > 0 && s > 0) ? calcCrCl(a, w, s, isFemale) : 0;
  const bmi = (w > 0 && h > 0) ? w / ((h / 100) ** 2) : 0;

  // IBW
  const ibw = isFemale
    ? 45.5 + 0.9 * (h - 152.4)
    : 50 + 0.9 * (h - 152.4);

  const model = MODELS[modelKey];
  const CL = crcl > 0 ? model.getCL(crcl, w) : 0;
  const V = w > 0 ? model.getV(w) : 0;

  const canCalc = w > 0 && a > 0 && s > 0 && h > 0;

  // 建議 LD
  const ldMgPerKg = crcl >= 130 ? 30 : (crcl >= 50 ? 25 : 22.5);
  const ldRaw = ldMgPerKg * w;
  const ldMg = Math.min(roundTo250(ldRaw), 3000); // max 3g

  // 生成劑量選項
  const tMin = parseFloat(targetMin) || 400;
  const tMax = parseFloat(targetMax) || 600;
  const options = (canCalc && CL > 0) ? generateOptions(CL, V, tMin, tMax) : [];

  // 取最佳建議
  const best = options.length > 0 ? options[0] : null;

  function handleCalc() {
    if (canCalc) setShowResults(true);
  }

  function handleReset() {
    setShowResults(false);
    setTbw(""); setHeight(""); setAge(""); setScr("");
    setGender("male"); setModelKey("buelga");
    setTargetMin("400"); setTargetMax("600");
  }

  return (
    <div>
      <div style={S.header}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>💊</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0F766E", margin: 0 }}>Vancomycin TDM</h1>
        <p style={{ fontSize: 12, color: "#94A3B8", margin: "4px 0 0" }}>初始劑量推薦器（Phase 1）</p>
      </div>

      {/* 病人資料 */}
      <div style={S.section}>
        <div style={S.sectionTitle}>病人資料</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={S.label}>體重 (kg)</label>
            <input type="number" value={tbw} onChange={e => { setTbw(e.target.value); setShowResults(false); }} style={S.input} placeholder="70" />
          </div>
          <div>
            <label style={S.label}>身高 (cm)</label>
            <input type="number" value={height} onChange={e => { setHeight(e.target.value); setShowResults(false); }} style={S.input} placeholder="170" />
          </div>
          <div>
            <label style={S.label}>年齡</label>
            <input type="number" value={age} onChange={e => { setAge(e.target.value); setShowResults(false); }} style={S.input} placeholder="55" />
          </div>
          <div>
            <label style={S.label}>Scr (mg/dL)</label>
            <input type="number" value={scr} onChange={e => { setScr(e.target.value); setShowResults(false); }} style={S.input} placeholder="1.0" />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={S.label}>性別</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ id: "male", label: "男" }, { id: "female", label: "女" }].map(opt => (
              <button key={opt.id} onClick={() => { setGender(opt.id); setShowResults(false); }}
                style={{ ...S.genderBtn, ...(gender === opt.id ? S.genderBtnActive : {}) }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 計算出的參數 */}
        {canCalc && (
          <div style={{ marginTop: 12, padding: 10, background: "#F0FDFA", borderRadius: 8, fontSize: 12, color: "#475569" }}>
            <div>CrCl：<strong>{Math.round(crcl)} mL/min</strong>（Cockcroft-Gault）</div>
            <div>BMI：<strong>{bmi.toFixed(1)}</strong>｜IBW：<strong>{ibw.toFixed(1)} kg</strong></div>
            {crcl >= 130 && <div style={{ color: "#D97706", fontWeight: 600 }}>⚡ ARC（CrCl ≥130）</div>}
          </div>
        )}
      </div>

      {/* PK Model 選擇 */}
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

      {/* AUC 目標 */}
      <div style={S.section}>
        <div style={S.sectionTitle}>AUC24/MIC 目標</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="number" value={targetMin} onChange={e => { setTargetMin(e.target.value); setShowResults(false); }}
            style={{ ...S.input, width: 70, textAlign: "center" as const }} />
          <span style={{ color: "#94A3B8" }}>—</span>
          <input type="number" value={targetMax} onChange={e => { setTargetMax(e.target.value); setShowResults(false); }}
            style={{ ...S.input, width: 70, textAlign: "center" as const }} />
          <span style={{ fontSize: 12, color: "#94A3B8" }}>mcg·h/mL（MIC = 1）</span>
        </div>
      </div>

      {/* 計算按鈕 */}
      {canCalc && !showResults && (
        <button onClick={handleCalc} style={S.calcBtn}>計算建議劑量</button>
      )}

      {/* 結果 */}
      {showResults && best && (
        <div>
          {/* 建議劑量 */}
          <div style={S.section}>
            <div style={S.sectionTitle}>建議劑量</div>
            <div style={S.resultCard}>
              <div style={S.resultRow}>
                <span>Loading Dose</span>
                <strong>{ldMg} mg（{ldMgPerKg} mg/kg × {Math.round(w)} kg）</strong>
              </div>
              <div style={S.resultRow}>
                <span>Maintenance Dose</span>
                <strong>{best.dose} mg Q{best.interval}H</strong>
              </div>
              <div style={S.resultRow}>
                <span>輸注時間</span>
                <strong>{best.infusion} hr（{Math.round(best.dose / best.infusion)} mg/hr）</strong>
              </div>
              <div style={S.resultRow}>
                <span>每日總劑量</span>
                <strong>{best.dailyDose} mg/day</strong>
              </div>
            </div>
          </div>

          {/* 預估 PK */}
          <div style={S.section}>
            <div style={S.sectionTitle}>預估穩態 PK 參數</div>
            <div style={S.resultCard}>
              <div style={S.resultRow}>
                <span>AUC24/MIC</span>
                <strong style={{ color: best.inRange ? "#059669" : "#DC2626" }}>
                  {Math.round(best.auc24)} mcg·h/mL {best.inRange ? "✅" : "⚠️"}
                </strong>
              </div>
              <div style={S.resultRow}>
                <span>Css,peak（穩態峰值）</span>
                <strong>{best.peak.toFixed(1)} mcg/mL</strong>
              </div>
              <div style={S.resultRow}>
                <span>Css,trough（穩態谷值）</span>
                <strong>{best.trough.toFixed(1)} mcg/mL</strong>
              </div>
            </div>
          </div>

          {/* Kinetic Parameters */}
          <div style={S.section}>
            <div style={S.sectionTitle}>Kinetic Parameters（{model.name}）</div>
            <div style={S.resultCard}>
              <div style={S.resultRow}>
                <span>CL（清除率）</span>
                <strong>{CL.toFixed(2)} L/h</strong>
              </div>
              <div style={S.resultRow}>
                <span>Vd（分佈體積）</span>
                <strong>{V.toFixed(1)} L（{(V / w).toFixed(2)} L/kg）</strong>
              </div>
              <div style={S.resultRow}>
                <span>Kel（消除常數）</span>
                <strong>{(CL / V).toFixed(4)} h⁻¹</strong>
              </div>
              <div style={S.resultRow}>
                <span>t½（半衰期）</span>
                <strong>{(0.693 / (CL / V)).toFixed(1)} h</strong>
              </div>
            </div>
          </div>

          {/* 劑量比較表 */}
          <div style={S.section}>
            <div style={S.sectionTitle}>劑量比較（前 10 個選項）</div>
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>劑量</th>
                    <th style={S.th}>頻率</th>
                    <th style={S.th}>AUC24</th>
                    <th style={S.th}>Peak</th>
                    <th style={S.th}>Trough</th>
                  </tr>
                </thead>
                <tbody>
                  {options.slice(0, 10).map((opt, i) => (
                    <tr key={i} style={opt.inRange ? { background: "#F0FDF4" } : {}}>
                      <td style={S.td}>{opt.dose} mg</td>
                      <td style={S.td}>Q{opt.interval}H</td>
                      <td style={{ ...S.td, fontWeight: 600, color: opt.inRange ? "#059669" : "#94A3B8" }}>
                        {Math.round(opt.auc24)}
                      </td>
                      <td style={S.td}>{opt.peak.toFixed(1)}</td>
                      <td style={S.td}>{opt.trough.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 6 }}>
              綠底 = AUC24 在目標範圍內 | MIC = 1 mcg/mL | 輸注速率 ≤1000 mg/hr | 每日 ≤4.5 g
            </div>
          </div>

          {/* 提醒 */}
          <div style={S.section}>
            <div style={{ ...S.warningBox }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠️ 注意事項</div>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                • 此為 population PK 預估值，個體差異大，務必搭配 TDM<br />
                • 嚴重 MRSA 感染建議在 24-48hr 內進行首次 AUC 監測<br />
                • LD 後第一劑 MD 在下一個常規間隔給（如 Q12H → LD 後 12hr 給 MD）<br />
                • 每日總劑量 &gt;4.5 g 時建議提早且頻繁監測<br />
                • 輸注速率 ≤10-15 mg/min（避免 Red Man Syndrome）<br />
                • 肝硬化 CTP B/C：Scr 可能低估腎功能，考慮保守劑量<br />
                {bmi >= 30 && <>• 肥胖（BMI {bmi.toFixed(1)}）：LD 和 MD 用 TBW，LD max 3 g<br /></>}
                {crcl >= 130 && <>• ARC（CrCl {Math.round(crcl)}）：需頻繁 TDM，可能需 Q8H 或 Q6H<br /></>}
              </div>
            </div>
          </div>

          <button onClick={handleReset} style={S.resetBtn}>重新計算</button>
        </div>
      )}

      <div style={{ textAlign: "center", padding: "24px 0 8px", fontSize: 11, color: "#94A3B8" }}>
        PK Model：Buelga et al. AAC 2005;49:4934 / Roberts et al. AAC 2011;55:3208<br />
        僅供臨床參考，請依實際 TDM 結果調整
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════
const S: Record<string, React.CSSProperties> = {
  header: { textAlign: "center", padding: "16px 0 24px" },
  section: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", boxSizing: "border-box" },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 4 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", outline: "none", boxSizing: "border-box" as const },
  genderBtn: { flex: 1, padding: "10px 0", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  genderBtnActive: { background: "#0D9488", color: "#fff", borderColor: "#0D9488" },
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
