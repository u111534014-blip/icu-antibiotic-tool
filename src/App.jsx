import { useState, useEffect, useRef } from "react";

// ╔══════════════════════════════════════════════════════════════════╗
// ║  📦 藥物資料庫 — 加新藥只需要在這裡新增一個物件                    ║
// ║  DRUG_REGISTRY: 所有藥物的「設定檔」                              ║
// ╚══════════════════════════════════════════════════════════════════╝

const DRUG_REGISTRY = {

  // ── Baktar (TMP/SMX) ──────────────────────────────────────────
  baktar: {
    name: "Baktar",
    subtitle: "TMP/SMX",
    color: "#0D9488",
    needsRenal: true,
    needsWeight: true,

    indications: [
      { id: "general", label: "一般感染", desc: "8–10 mg/kg/day" },
      { id: "pjp",     label: "PJP 治療", desc: "15–20 mg/kg/day" },
    ],

    extraFields: [
      { key: "waterLimit", type: "toggle", label: "限水病人", default: false },
    ],

    calculate({ dosing_weight, crcl, rrt, indication, extras }) {
      const isPJP = indication === "pjp";
      const dose_min = isPJP ? 15 : 8;
      const dose_max = isPJP ? 20 : 10;
      const div = isPJP ? 4 : 2;
      let freq = isPJP ? "Q6H" : "Q12H";
      const warnings = [];

      let s_min = (dosing_weight * dose_min) / div;
      let s_max = (dosing_weight * dose_max) / div;

      if (rrt === "hd") {
        s_min /= 2; s_max /= 2;
        freq = "Q24H（透析後）";
        warnings.push("HD 病人建議劑量減半");
      } else if (rrt === "cvvh") {
        s_min /= 2; s_max /= 2;
        freq = "Q12H";
        warnings.push("CVVH 建議維持 Q12H");
      } else {
        if (crcl < 15) {
          s_min /= 2; s_max /= 2;
          freq = "Q24H";
          warnings.push("CrCl < 15 建議減半並 Q24H");
        } else if (crcl <= 30) {
          s_min /= 2; s_max /= 2;
          warnings.push("CrCl 15–30 建議劑量減半");
        }
      }

      const amp_min = round2(s_min / 80);
      const amp_max = round2(s_max / 80);

      return {
        rows: [
          { label: "適應症", value: isPJP ? "PJP 治療" : "一般感染" },
          { label: "建議單次劑量", value: `TMP ${round1(s_min)} – ${round1(s_max)} mg`, highlight: true },
          { label: "給藥頻率", value: freq, highlight: true },
          { label: "建議抽藥支數", value: `${amp_min} – ${amp_max} 支` },
        ],
        warnings,
        pharmacistInput: {
          label: "💉 藥師決定給予支數",
          placeholder: "例：2 或 2.5",
          suffix: "支",
          calcDilution(ampules) {
            const a = parseFloat(ampules);
            if (!a || a <= 0) return null;
            const vol = extras.waterLimit ? a * 75 : a * 125;
            return {
              text: `請抽取 ${a} 支 Baktar，加入 ${Math.round(vol)} mL D5W`,
              note: extras.waterLimit ? "（限水配方：75 mL/支）" : "（標準配方：125 mL/支）",
            };
          },
        },
      };
    },
  },

  // ── Meropenem ─────────────────────────────────────────────────
  meropenem: {
    name: "Meropenem",
    subtitle: "Mepem",
    color: "#2563EB",
    needsRenal: true,
    needsWeight: true,

    indications: [
      { id: "standard", label: "一般重症",       desc: "起始 1g Q8H" },
      { id: "severe",   label: "腦膜炎/極嚴重感染", desc: "起始 2g Q8H" },
    ],

    extraFields: [],

    calculate({ crcl, rrt, indication }) {
      let dose_mg, freq, note;
      const isSevere = indication === "severe";

      if (rrt === "hd") {
        dose_mg = 500; freq = "Q24H（透析後）"; note = "HD 模式";
      } else if (rrt === "cvvh") {
        dose_mg = 1000;
        freq = isSevere ? "Q8H" : "Q12H";
        note = "CVVH 模式";
      } else {
        if (isSevere) {
          if      (crcl > 50)  { dose_mg = 2000; freq = "Q8H"; }
          else if (crcl >= 26) { dose_mg = 2000; freq = "Q12H"; }
          else if (crcl >= 10) { dose_mg = 1000; freq = "Q12H"; }
          else                 { dose_mg = 1000; freq = "Q24H"; }
        } else {
          if      (crcl > 50)  { dose_mg = 1000; freq = "Q8H"; }
          else if (crcl >= 26) { dose_mg = 1000; freq = "Q12H"; }
          else if (crcl >= 10) { dose_mg = 500;  freq = "Q12H"; }
          else                 { dose_mg = 500;  freq = "Q24H"; }
        }
        note = "一般 CKD 調整";
      }

      const vials = Math.ceil(dose_mg / 500);
      const dose_str = dose_mg >= 1000 ? `${dose_mg / 1000} g` : `${dose_mg} mg`;

      return {
        rows: [
          { label: "適應症", value: isSevere ? "腦膜炎/極嚴重" : "一般重症" },
          { label: "建議劑量", value: `${dose_str} IV`, highlight: true },
          { label: "給藥頻率", value: freq, highlight: true },
          { label: "每次取藥", value: `${vials} 支（每支 500 mg）` },
          { label: "調整依據", value: note },
        ],
        warnings: [],
        infoBox: {
          text: "🕒 建議採用延長滴注（Prolonged Infusion）3 小時",
          bg: "#EFF6FF", border: "#93C5FD", color: "#1E40AF",
        },
      };
    },
  },

  // ── Isavuconazole ─────────────────────────────────────────────
  isavuconazole: {
    name: "Isavuconazole",
    subtitle: "Cresemba",
    color: "#7C3AED",
    needsRenal: false,
    needsWeight: false,

    indications: [
      { id: "loading",     label: "Loading Dose",     desc: "負荷劑量" },
      { id: "maintenance", label: "Maintenance Dose", desc: "維持劑量" },
    ],

    extraFields: [],

    calculate({ indication }) {
      const isLoading = indication === "loading";
      return {
        rows: [
          { label: "劑量", value: "200 mg", highlight: true },
          { label: "給藥頻率",
            value: isLoading ? "Q8H（共 6 劑，歷時 48 小時）" : "QD（Q24H）",
            highlight: true },
          { label: "肝腎評估", value: "無需依據腎功能（含 HD / CVVH）或輕中度肝功能不全調整劑量" },
        ],
        warnings: [
          isLoading
            ? "滴注時間至少 1 小時，輸液套管須帶 inline filter（孔徑 0.2–1.2 μm）"
            : "請於最後一劑 Loading dose 給完後 12–24 小時開始給予",
        ],
      };
    },
  },

  // ┌──────────────────────────────────────────────────────────────┐
  // │  🆕 加新藥範本：複製貼上，改內容就好                          │
  // │                                                              │
  // │  newDrug: {                                                  │
  // │    name: "藥名",                                             │
  // │    subtitle: "商品名",                                       │
  // │    color: "#DC2626",                                         │
  // │    needsRenal: true,                                         │
  // │    needsWeight: true,                                        │
  // │    indications: [                                            │
  // │      { id: "ind1", label: "適應症1", desc: "說明" },          │
  // │    ],                                                        │
  // │    extraFields: [],                                          │
  // │    calculate({ dosing_weight, crcl, rrt, indication }) {     │
  // │      return { rows: [...], warnings: [...] };                │
  // │    },                                                        │
  // │  },                                                          │
  // └──────────────────────────────────────────────────────────────┘
};

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🔧 共用工具                                                    ║
// ╚══════════════════════════════════════════════════════════════════╝

function round1(v) { return Math.round(v * 10) / 10; }
function round2(v) { return Math.round(v * 100) / 100; }

const RRT_OPTIONS = [
  { id: "none", label: "無透析（含 CKD）" },
  { id: "hd",   label: "HD（血液透析）" },
  { id: "cvvh", label: "CVVH / CVVHDF" },
];

function calcPatientParams({ tbw, height, age, gender, scr, rrt }) {
  const w = parseFloat(tbw) || 0;
  const h = parseFloat(height);
  const a = parseFloat(age);
  const s = parseFloat(scr);

  let dosing_weight = w;
  let weight_note = "使用實際體重（TBW）";
  let ibw = null;
  let adjBw = null;

  if (w > 0 && h > 0 && gender) {
    ibw = gender === "M" ? 50 + 0.91 * (h - 152.4) : 45.5 + 0.91 * (h - 152.4);
    if (w > 1.2 * ibw) {
      adjBw = round1(ibw + 0.4 * (w - ibw));
      dosing_weight = adjBw;
      weight_note = `肥胖調整 → AdjBW ${adjBw} kg`;
    }
  }

  let crcl = null;
  if (dosing_weight > 0 && a > 0 && s > 0 && gender && rrt === "none") {
    crcl = ((140 - a) * dosing_weight) / (72 * s);
    if (gender === "F") crcl *= 0.85;
    crcl = round1(crcl);
  }

  return { dosing_weight, weight_note, ibw: ibw ? round1(ibw) : null, adjBw, crcl };
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🧩 UI 元件                                                    ║
// ╚══════════════════════════════════════════════════════════════════╝

function Select({ label, value, onChange, options, placeholder }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={S.label}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={S.select}>
        <option value="">{placeholder || "請選擇"}</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>{o.label}{o.desc ? ` — ${o.desc}` : ""}</option>
        ))}
      </select>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, suffix }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={S.label}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="number" inputMode="decimal" value={value}
          onChange={e => onChange(e.target.value)} placeholder={placeholder} style={S.input} />
        {suffix && <span style={{ color: "#64748B", fontSize: 14, whiteSpace: "nowrap" }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <label style={{ ...S.label, marginBottom: 0 }}>{label}</label>
      <button onClick={() => onChange(!value)} style={{
        width: 52, height: 28, borderRadius: 14, border: "none",
        backgroundColor: value ? "#0D9488" : "#CBD5E1",
        position: "relative", cursor: "pointer", transition: "background 0.2s",
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff",
          position: "absolute", top: 3, left: value ? 27 : 3, transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }} />
      </button>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: "1px solid #F1F5F9" }}>
      <span style={{ color: "#64748B", fontSize: 14 }}>{label}</span>
      <span style={{ fontWeight: highlight ? 700 : 500, fontSize: highlight ? 17 : 15, color: highlight ? "#0F172A" : "#334155", textAlign: "right", maxWidth: "60%" }}>{value}</span>
    </div>
  );
}

function Warning({ text }) {
  return (
    <div style={{
      background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 8,
      padding: "10px 14px", marginTop: 8, fontSize: 14, color: "#92400E",
      display: "flex", alignItems: "flex-start", gap: 8,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span> <span>{text}</span>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🏗️ 主程式（通用引擎 — 加藥不需改這裡）                         ║
// ╚══════════════════════════════════════════════════════════════════╝

export default function App() {
  const [drugId, setDrugId] = useState("");
  const [tbw, setTbw] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [scr, setScr] = useState("");
  const [rrt, setRrt] = useState("");
  const [indication, setIndication] = useState("");
  const [ampules, setAmpules] = useState("");
  const [extras, setExtras] = useState({});
  const resultRef = useRef(null);

  const drugConfig = DRUG_REGISTRY[drugId] || null;
  const accentColor = drugConfig?.color || "#0D9488";

  const patientParams = drugConfig?.needsRenal
    ? calcPatientParams({ tbw, height, age, gender, scr, rrt })
    : { dosing_weight: 0, crcl: null, ibw: null, adjBw: null, weight_note: "" };

  const canCalc = (() => {
    if (!drugConfig || !indication) return false;
    if (drugConfig.needsRenal) {
      if (!tbw || !age || !scr || !gender || !rrt) return false;
      if (rrt === "none" && patientParams.crcl === null) return false;
    }
    return true;
  })();

  const result = canCalc ? drugConfig.calculate({
    dosing_weight: patientParams.dosing_weight,
    crcl: patientParams.crcl || 0,
    rrt, indication, extras,
  }) : null;

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [!!result]);

  const resetAll = () => {
    setDrugId(""); setTbw(""); setHeight(""); setAge(""); setGender("");
    setScr(""); setRrt(""); setIndication(""); setAmpules(""); setExtras({});
  };

  const selectDrug = (id) => {
    setDrugId(id); setIndication(""); setAmpules("");
    const cfg = DRUG_REGISTRY[id];
    if (cfg?.extraFields) {
      const defaults = {};
      cfg.extraFields.forEach(f => { defaults[f.key] = f.default; });
      setExtras(defaults);
    } else { setExtras({}); }
  };

  const drugList = Object.entries(DRUG_REGISTRY).map(([id, cfg]) => ({ id, ...cfg }));

  return (
    <div style={S.shell}>
      <div style={S.container}>
        <div style={S.header}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", letterSpacing: -0.5 }}>ICU 抗生素</div>
          <div style={{ fontSize: 15, color: "#64748B", marginTop: 2 }}>臨床決策支援工具</div>
        </div>

        {/* Drug Selection */}
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>選擇藥物</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {drugList.map(d => (
              <button key={d.id} onClick={() => selectDrug(d.id)} style={{
                flex: "1 1 0", minWidth: 90, padding: "14px 8px", borderRadius: 10,
                border: drugId === d.id ? `2px solid ${d.color}` : "2px solid #E2E8F0",
                background: drugId === d.id ? `${d.color}10` : "#fff",
                cursor: "pointer", textAlign: "center", transition: "all 0.15s",
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: drugId === d.id ? d.color : "#334155" }}>{d.name}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{d.subtitle}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Patient Info */}
        {drugConfig?.needsRenal && (
          <div style={S.section}>
            <div style={S.sectionTitle}>病患資料</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              <Input label="體重 TBW" value={tbw} onChange={setTbw} placeholder="kg" suffix="kg" />
              <Input label="身高（選填）" value={height} onChange={setHeight} placeholder="cm" suffix="cm" />
              <Input label="年齡" value={age} onChange={setAge} placeholder="歲" suffix="歲" />
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>性別</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["M", "F"].map(g => (
                    <button key={g} onClick={() => setGender(g)} style={{
                      flex: 1, padding: "10px 0", borderRadius: 8,
                      border: gender === g ? `2px solid ${accentColor}` : "2px solid #E2E8F0",
                      background: gender === g ? `${accentColor}10` : "#fff",
                      fontWeight: 600, fontSize: 14, cursor: "pointer",
                      color: gender === g ? accentColor : "#64748B",
                    }}>
                      {g === "M" ? "男 M" : "女 F"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Input label="血清肌酸酐 Scr" value={scr} onChange={setScr} placeholder="mg/dL" suffix="mg/dL" />
            <Select label="透析狀態" value={rrt} onChange={setRrt} options={RRT_OPTIONS} />
            {patientParams.dosing_weight > 0 && rrt && (
              <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
                <span>📐 {patientParams.weight_note}{!patientParams.adjBw ? ` — ${round1(patientParams.dosing_weight)} kg` : ""}</span>
                {patientParams.ibw && <span>📏 IBW: {patientParams.ibw} kg</span>}
                {rrt === "none" && patientParams.crcl !== null && <span>🧪 CrCl: {patientParams.crcl} mL/min</span>}
                {rrt !== "none" && <span>🔄 {rrt === "hd" ? "HD 模式" : "CVVH 模式"}</span>}
              </div>
            )}
          </div>
        )}

        {/* Drug Settings */}
        {drugConfig && (
          <div style={S.section}>
            <div style={S.sectionTitle}>{drugConfig.name} 設定</div>
            <Select label={drugConfig.needsRenal ? "適應症" : "給藥階段"}
              value={indication} onChange={setIndication} options={drugConfig.indications} />
            {drugConfig.extraFields?.map(f => {
              if (f.type === "toggle") {
                return <Toggle key={f.key} label={f.label} value={!!extras[f.key]}
                  onChange={v => setExtras(prev => ({ ...prev, [f.key]: v }))} />;
              }
              return null;
            })}
          </div>
        )}

        {/* Result */}
        <div ref={resultRef}>
          {result && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginTop: 16, borderLeft: `4px solid ${accentColor}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                {drugConfig.name} 建議處方
              </div>
              {result.rows.map((r, i) => <Row key={i} label={r.label} value={r.value} highlight={r.highlight} />)}
              {result.warnings?.map((w, i) => <Warning key={i} text={w} />)}
              {result.infoBox && (
                <div style={{ background: result.infoBox.bg, borderRadius: 8, padding: 12, marginTop: 12, border: `1px solid ${result.infoBox.border}`, fontSize: 14, color: result.infoBox.color }}>
                  {result.infoBox.text}
                </div>
              )}
              {result.pharmacistInput && (
                <div style={{ marginTop: 16, padding: "14px 0 0", borderTop: "1px dashed #CBD5E1" }}>
                  <Input label={result.pharmacistInput.label} value={ampules} onChange={setAmpules}
                    placeholder={result.pharmacistInput.placeholder} suffix={result.pharmacistInput.suffix} />
                  {(() => {
                    const dil = result.pharmacistInput.calcDilution(ampules);
                    if (!dil) return null;
                    return (
                      <div style={{ background: "#ECFDF5", borderRadius: 8, padding: 14, border: "1px solid #6EE7B7" }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#065F46", marginBottom: 4 }}>護理配藥指示</div>
                        <div style={{ fontSize: 14, color: "#065F46" }}>{dil.text}</div>
                        {dil.note && <div style={{ fontSize: 12, color: "#047857", marginTop: 4 }}>{dil.note}</div>}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {drugId && <button onClick={resetAll} style={S.resetBtn}>重新評估</button>}
        <div style={{ textAlign: "center", padding: "24px 0 8px", fontSize: 11, color: "#94A3B8" }}>僅供臨床參考，請依實際情境調整</div>
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🎨 樣式                                                       ║
// ╚══════════════════════════════════════════════════════════════════╝

const S = {
  shell: { minHeight: "100vh", background: "linear-gradient(180deg, #F0FDFA 0%, #F8FAFC 40%)", fontFamily: "'SF Pro Text', -apple-system, 'Segoe UI', sans-serif" },
  container: { maxWidth: 460, margin: "0 auto", padding: "20px 16px 40px" },
  header: { textAlign: "center", padding: "16px 0 24px" },
  section: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 },
  select: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", appearance: "auto", WebkitAppearance: "auto" },
  input: { flex: 1, padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", outline: "none" },
  resetBtn: { width: "100%", marginTop: 20, padding: "14px 0", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: 15, fontWeight: 600, cursor: "pointer" },
};