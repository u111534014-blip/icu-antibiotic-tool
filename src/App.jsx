import { useState, useEffect, useRef } from "react";

// ╔══════════════════════════════════════════════════════════════════╗
// ║  📦 藥物資料庫                                                  ║
// ║                                                                ║
// ║  每支藥的設定包含：                                              ║
// ║  - 基本資訊：name, subtitle, searchTerms                        ║
// ║  - 需求旗標：needsRenal, needsWeight, needsHepatic              ║
// ║  - 適應症：indications（含劑量規則的「資料」）                    ║
// ║  - 額外欄位：extraFields                                        ║
// ║  - calculate()：拿適應症資料 + 病人資料算出建議                  ║
// ╚══════════════════════════════════════════════════════════════════╝

const DRUG_REGISTRY = {

  // ── Baktar (TMP/SMX) ──────────────────────────────────────────
  baktar: {
    name: "Baktar",
    subtitle: "TMP/SMX",
    needsRenal: true,
    needsWeight: true,
    needsHepatic: false,
    searchTerms: ["trimethoprim", "sulfamethoxazole", "baktar", "tmp", "smx", "PJP", "Sevatrim", "Morcasin", "雪白淨","孟克杏"],

    // 💡 新版結構：每個適應症可以有一個或多個「情境（scenarios）」
    //    - 單一情境（如 PJP）→ scenarios 只有一筆
    //    - 多個情境（如 SSTI）→ scenarios 有多筆，全部會一起顯示
    // 💡 Baktar 院內品項：
    //    - IV: Sevatrim 注射劑（雪白淨）80/400 mg/支（即 TMP 80 mg + SMX 400 mg / 5 mL）
    //    - PO: Morcasin 錠劑（孟克杏錠）80/400 mg/錠
    //           DS（double strength）= 2 錠 = TMP 160 mg + SMX 800 mg
    //
    // 💡 每個 scenario 可以同時提供 PO 和 IV：
    //    - preferred: "PO" 或 "IV" → 標示 UpToDate 首選劑型
    //    - po: { fixedDose, detail }
    //    - iv: { dosePerKg, divisions, freq }
    indications: [
      {
        id: "general",
        label: "一般感染",
        desc: "8–10 mg/kg/day",
        scenarios: [
          {
            label: "一般感染",
            preferred: "IV",
            iv: { dosePerKg: { min: 8, max: 10 }, divisions: 2, freq: "Q12H" },
          },
        ],
      },
      {
        id: "pjp",
        label: "PJP 治療",
        desc: "15–20 mg/kg/day",
        scenarios: [
          {
            label: "PJP 治療",
            preferred: "IV",
            iv: { dosePerKg: { min: 15, max: 20 }, divisions: 4, freq: "Q6H" },
          },
        ],
      },
      {
        id: "ssti",
        label: "Skin & Soft Tissue Infection (SSTI)",
        desc: "",
        scenarios: [
          {
            label: "Abscess（膿瘍）",
            note: "體重 >70 kg 建議採用較高劑量；療程 ≥5 天，依臨床反應可延長至 14 天",
            preferred: "PO",
            po: {
              fixedDose: "1–2 DS tab BID",
              detail: "DS tab = TMP 160 mg + SMX 800 mg（= 2 錠 Morcasin）",
            },
            iv: {
              dosePerKg: { min: 8, max: 10 },
              divisions: 2,
              freq: "Q12H",
            },
          },
          {
            label: "Cellulitis, purulent or MRSA risk",
            note: "建議加上 beta-hemolytic strep 覆蓋（如 amoxicillin、cephalexin）",
            preferred: "PO",
            po: {
              fixedDose: "1–2 DS tab BID",
              detail: "DS tab = TMP 160 mg + SMX 800 mg（= 2 錠 Morcasin）",
            },
            iv: {
              dosePerKg: { min: 8, max: 10 },
              divisions: 2,
              freq: "Q12H",
            },
          },
          {
            label: "Cellulitis, long-term suppression",
            note: "復發性葡萄球菌 cellulitis 於療程完成後，用於長期抑制",
            preferred: "PO",
            po: {
              fixedDose: "1 DS tab QD–BID",
              detail: "DS tab = TMP 160 mg + SMX 800 mg（= 2 錠 Morcasin）",
            },
            // 此情境多為長期口服，IV 不適用，所以不放 iv
          },
        ],
      },
      // 🆕 加新適應症：
      //   - 單一情境：scenarios 只寫一筆
      //   - 多情境：scenarios 寫多筆
      //   - 每個情境可以同時放 po 和 iv，preferred 標示 UpToDate 首選
    ],

    extraFields: [
      { key: "waterLimit", type: "toggle", label: "限水病人", default: false },
    ],

    calculate({ dosing_weight, crcl, rrt, indicationData, extras }) {
      let hasIV = false;

      const scenarioResults = indicationData.scenarios.map(sc => {
        const result = {
          title: sc.label,
          note: sc.note,
          preferred: sc.preferred,
          subResults: [],     // ⭐ 一個情境內的多個劑型
          warnings: [],
        };

        // ── PO 劑型 ──
        if (sc.po) {
          result.subResults.push({
            route: "PO",
            isPreferred: sc.preferred === "PO",
            rows: [
              { label: "建議劑量", value: sc.po.fixedDose, highlight: true },
              ...(sc.po.detail ? [{ label: "品項說明", value: sc.po.detail }] : []),
            ],
          });
        }

        // ── IV 劑型 ──
        if (sc.iv) {
          hasIV = true;
          let freq = sc.iv.freq;
          const ivWarnings = [];

          let s_min = (dosing_weight * sc.iv.dosePerKg.min) / sc.iv.divisions;
          let s_max = (dosing_weight * sc.iv.dosePerKg.max) / sc.iv.divisions;

          if (rrt === "hd") {
            s_min /= 2; s_max /= 2;
            freq = "Q24H（透析後）";
            ivWarnings.push("HD 病人建議劑量減半");
          } else if (rrt === "cvvh") {
            s_min /= 2; s_max /= 2;
            freq = "Q12H";
            ivWarnings.push("CVVH 建議維持 Q12H");
          } else {
            if (crcl < 15) {
              s_min /= 2; s_max /= 2;
              freq = "Q24H";
              ivWarnings.push("CrCl < 15 建議減半並 Q24H");
            } else if (crcl <= 30) {
              s_min /= 2; s_max /= 2;
              ivWarnings.push("CrCl 15–30 建議劑量減半");
            }
          }

          const amp_min = round2(s_min / 80);
          const amp_max = round2(s_max / 80);

          result.subResults.push({
            route: "IV",
            isPreferred: sc.preferred === "IV",
            rows: [
              { label: "建議單次劑量", value: `TMP ${round1(s_min)} – ${round1(s_max)} mg`, highlight: true },
              { label: "給藥頻率", value: freq, highlight: true },
              { label: "建議抽藥支數", value: `${amp_min} – ${amp_max} 支（Sevatrim）` },
            ],
            warnings: ivWarnings,
          });
        }

        return result;
      });

      const pharmacistInput = hasIV ? {
        label: "決定給予支數（IV 配藥用）",
        placeholder: "例：2 或 2.5",
        suffix: "支",
        calcDilution(ampules) {
          const a = parseFloat(ampules);
          if (!a || a <= 0) return null;
          const vol = extras.waterLimit ? a * 75 : a * 125;
          return {
            text: `請抽取 ${a} 支 Sevatrim，加入 ${Math.round(vol)} mL D5W`,
            note: extras.waterLimit ? "（限水配方：75 mL/支）" : "（標準配方：125 mL/支）",
          };
        },
      } : null;

      return { scenarioResults, pharmacistInput };
    },
  },

  // ── Meropenem ─────────────────────────────────────────────────
  meropenem: {
    name: "Meropenem",
    subtitle: "Mepem",
    needsRenal: true,
    needsWeight: true,
    needsHepatic: false,
    searchTerms: ["meropenem", "mepem", "carbapenem", "麥羅"],

    indications: [
      {
        id: "standard",
        label: "一般重症",
        desc: "起始 1g Q8H",
        scenarios: [
          {
            label: "一般重症感染",
            crclTable: [
              { min: 50,  dose_mg: 1000, freq: "Q8H" },
              { min: 26,  dose_mg: 1000, freq: "Q12H" },
              { min: 10,  dose_mg: 500,  freq: "Q12H" },
              { min: 0,   dose_mg: 500,  freq: "Q24H" },
            ],
            hdDose: { dose_mg: 500,  freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q12H" },
          },
        ],
      },
      {
        id: "severe",
        label: "腦膜炎/極嚴重感染",
        desc: "起始 2g Q8H",
        scenarios: [
          {
            label: "腦膜炎 / 極嚴重感染",
            crclTable: [
              { min: 50,  dose_mg: 2000, freq: "Q8H" },
              { min: 26,  dose_mg: 2000, freq: "Q12H" },
              { min: 10,  dose_mg: 1000, freq: "Q12H" },
              { min: 0,   dose_mg: 1000, freq: "Q24H" },
            ],
            hdDose: { dose_mg: 500, freq: "Q24H（透析後）" },
            cvvhDose: { dose_mg: 1000, freq: "Q8H" },
          },
        ],
      },
    ],

    extraFields: [],

    calculate({ crcl, rrt, indicationData }) {
      const scenarioResults = indicationData.scenarios.map(sc => {
        let dose_mg, freq, note;

        if (rrt === "hd") {
          ({ dose_mg, freq } = sc.hdDose);
          note = "HD 模式";
        } else if (rrt === "cvvh") {
          ({ dose_mg, freq } = sc.cvvhDose);
          note = "CVVH 模式";
        } else {
          const match = sc.crclTable.find(row => crcl >= row.min);
          dose_mg = match.dose_mg;
          freq = match.freq;
          note = "一般 CKD 調整";
        }

        const vials = Math.ceil(dose_mg / 500);
        const dose_str = dose_mg >= 1000 ? `${dose_mg / 1000} g` : `${dose_mg} mg`;

        return {
          title: sc.label,
          note: sc.note,
          rows: [
            { label: "建議劑量", value: `${dose_str} IV`, highlight: true },
            { label: "給藥頻率", value: freq, highlight: true },
            { label: "每次取藥", value: `${vials} 支（每支 500 mg）` },
            { label: "調整依據", value: note },
          ],
          warnings: [],
        };
      });

      return {
        scenarioResults,
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
    needsRenal: false,
    needsWeight: false,
    needsHepatic: false,
    searchTerms: ["isavuconazole", "cresemba", "aspergillus", "antifungal"],

    indications: [
      {
        id: "loading",
        label: "Loading Dose",
        desc: "負荷劑量",
        scenarios: [
          {
            label: "Loading Dose",
            dose: "200 mg",
            freq: "Q8H（共 6 劑，歷時 48 小時）",
            warning: "滴注時間至少 1 小時，輸液套管須帶 inline filter（孔徑 0.2–1.2 μm）",
          },
        ],
      },
      {
        id: "maintenance",
        label: "Maintenance Dose",
        desc: "維持劑量",
        scenarios: [
          {
            label: "Maintenance Dose",
            dose: "200 mg",
            freq: "QD（Q24H）",
            warning: "請於最後一劑 Loading dose 給完後 12–24 小時開始給予。口服生體可用率約98%，因此兩種劑型互相轉換時不需重新給予起始劑量或調整劑量",
          },
        ],
      },
    ],

    extraFields: [],

    calculate({ indicationData }) {
      const scenarioResults = indicationData.scenarios.map(sc => ({
        title: sc.label,
        rows: [
          { label: "劑量", value: sc.dose, highlight: true },
          { label: "給藥頻率", value: sc.freq, highlight: true },
          { label: "肝腎評估", value: "無需依據腎功能（含 HD / CVVH）或輕中度肝功能不全調整劑量" },
        ],
        warnings: [sc.warning],
      }));
      return { scenarioResults };
    },
  },

  // ── Tigecycline (Tygacil) ─ 需要肝功能調整 ────────────────────
  tigecycline: {
    name: "Tigecycline",
    subtitle: "Tygacil",
    needsRenal: false,
    needsWeight: false,
    needsHepatic: true,        // ⭐ 需要看肝功能（Child-Pugh）
    searchTerms: ["tigecycline", "tygacil", "glycylcycline", "老虎黴素"],

    indications: [
      {
        id: "cIAI_cSSSI",
        label: "cIAI / cSSSI",
        desc: "complicated intra-abdominal / skin & soft tissue",
        scenarios: [
          {
            label: "cIAI / cSSSI",
            loading_mg: 100,
            maintenance_mg: 50,
            freq: "Q12H",
          },
        ],
      },
      {
        id: "CAP",
        label: "Community-Acquired Pneumonia",
        desc: "社區型肺炎",
        scenarios: [
          {
            label: "Community-Acquired Pneumonia",
            loading_mg: 100,
            maintenance_mg: 50,
            freq: "Q12H",
          },
        ],
      },
      // 🆕 未來可加 HABP/VABP、HCAP 等。
      //    若同一大類有多種情境（如肺炎分 HAP/VAP/CAP），就在 scenarios 放多筆。
    ],

    extraFields: [],

    calculate({ indicationData, hepatic }) {
      const scenarioResults = indicationData.scenarios.map(sc => {
        const scWarnings = [];
        let loading = sc.loading_mg;
        let maintenance = sc.maintenance_mg;
        const freq = sc.freq;
        let note = "Child-Pugh A 或 B：無需調整";

        if (hepatic === "C") {
          maintenance = Math.round(sc.maintenance_mg / 2);
          note = "Child-Pugh C：維持劑量減半";
          scWarnings.push("Child-Pugh C 嚴重肝功能不全，維持劑量需調整");
        }

        return {
          title: sc.label,
          rows: [
            { label: "Loading Dose", value: `${loading} mg IV`, highlight: true },
            { label: "Maintenance Dose", value: `${maintenance} mg IV ${freq}`, highlight: true },
            { label: "肝功能評估", value: note },
          ],
          warnings: scWarnings,
        };
      });

      return {
        scenarioResults,
        infoBox: {
          text: "⚠️ FDA Black Box Warning：與其他藥物比較，使用 Tygacil 治療可能增加死亡率風險。應僅在無其他替代方案時使用。",
          bg: "#FEF2F2", border: "#FCA5A5", color: "#991B1B",
        },
      };
    },
  },

  // ┌──────────────────────────────────────────────────────────────┐
  // │  🆕 加新藥範本                                               │
  // │                                                              │
  // │  newDrug: {                                                  │
  // │    name: "藥名",                                             │
  // │    subtitle: "商品名",                                       │
  // │    needsRenal: true/false,                                   │
  // │    needsWeight: true/false,                                  │
  // │    needsHepatic: true/false,                                 │
  // │    searchTerms: ["別名", "成分", "中文"],                     │
  // │    indications: [                                            │
  // │      { id, label, desc, ...任何你的 calculate 會用的資料 },   │
  // │    ],                                                        │
  // │    extraFields: [],                                          │
  // │    calculate({ dosing_weight, crcl, rrt, hepatic,            │
  // │                indicationData, extras }) {                   │
  // │      // 用 indicationData 拿出該適應症的資料                   │
  // │      return { rows, warnings, infoBox, pharmacistInput };    │
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

const CHILD_PUGH_OPTIONS = [
  { id: "A", label: "Child-Pugh A（輕度）" },
  { id: "B", label: "Child-Pugh B（中度）" },
  { id: "C", label: "Child-Pugh C（重度）" },
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
// ║  🔍 可搜尋下拉選單                                              ║
// ╚══════════════════════════════════════════════════════════════════╝

function DrugSearchSelect({ drugList, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  const filtered = drugList.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.subtitle.toLowerCase().includes(q) ||
      (d.searchTerms || []).some(t => t.toLowerCase().includes(q))
    );
  });

  const selected = drugList.find(d => d.id === selectedId);

  return (
    <div ref={wrapperRef} style={{ position: "relative", marginBottom: 20 }}>
      <label style={S.label}>選擇藥物</label>
      <div
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{
          padding: "12px 14px", borderRadius: 10,
          border: open ? "2px solid #0D9488" : "2px solid #E2E8F0",
          background: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "border 0.15s",
        }}
      >
        {selected ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#0D9488", flexShrink: 0 }} />
            <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>{selected.name}</span>
              <span style={{ fontSize: 13, color: "#94A3B8", marginLeft: 8 }}>{selected.subtitle}</span>
            </div>
          </div>
        ) : (
          <span style={{ color: "#94A3B8", fontSize: 15 }}>點擊選擇或搜尋藥物...</span>
        )}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginLeft: 8, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <path d="M4 6L8 10L12 6" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
          marginTop: 4, background: "#fff", borderRadius: 12,
          border: "1.5px solid #E2E8F0", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F8FAFC", borderRadius: 8, padding: "8px 12px" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="7" cy="7" r="5" stroke="#94A3B8" strokeWidth="1.5"/>
                <path d="M11 11L14 14" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                ref={inputRef} type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="輸入藥名、商品名或成分..."
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#0F172A", width: "100%", minWidth: 0 }}
              />
              {search && (
                <button onClick={(e) => { e.stopPropagation(); setSearch(""); }}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "#94A3B8", fontSize: 16, padding: 0 }}>✕</button>
              )}
            </div>
          </div>

          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "20px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>找不到符合的藥物</div>
            ) : (
              filtered.map(d => (
                <div key={d.id}
                  onClick={() => { onSelect(d.id); setOpen(false); setSearch(""); }}
                  style={{
                    padding: "12px 16px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 12,
                    background: d.id === selectedId ? "#F0FDFA" : "transparent",
                    borderLeft: d.id === selectedId ? "3px solid #0D9488" : "3px solid transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (d.id !== selectedId) e.currentTarget.style.background = "#F8FAFC"; }}
                  onMouseLeave={e => { if (d.id !== selectedId) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#F0FDFA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#0D9488" }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.subtitle}</div>
                  </div>
                  {d.id === selectedId && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: "auto", flexShrink: 0 }}>
                      <path d="M3 8L6.5 11.5L13 4.5" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              ))
            )}
          </div>

          <div style={{ padding: "8px 16px", borderTop: "1px solid #F1F5F9", fontSize: 12, color: "#CBD5E1", textAlign: "center" }}>
            共 {drugList.length} 種藥物{search ? `，符合 ${filtered.length} 種` : ""}
          </div>
        </div>
      )}
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🧩 其他 UI 元件                                                ║
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
    <div style={{ marginBottom: 16, minWidth: 0 }}>
      <label style={S.label}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <input type="number" inputMode="decimal" value={value}
          onChange={e => onChange(e.target.value)} placeholder={placeholder} style={S.input} />
        {suffix && <span style={{ color: "#64748B", fontSize: 13, whiteSpace: "nowrap", flexShrink: 0 }}>{suffix}</span>}
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
        position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: "1px solid #F1F5F9", gap: 8 }}>
      <span style={{ color: "#64748B", fontSize: 14, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: highlight ? 700 : 500, fontSize: highlight ? 17 : 15, color: highlight ? "#0F172A" : "#334155", textAlign: "right", minWidth: 0 }}>{value}</span>
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
// ║  🏗️ 主程式                                                     ║
// ╚══════════════════════════════════════════════════════════════════╝

export default function App() {
  const [drugId, setDrugId] = useState("");
  const [tbw, setTbw] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [scr, setScr] = useState("");
  const [rrt, setRrt] = useState("");
  const [hepatic, setHepatic] = useState("");      // ⭐ 新增：肝功能
  const [indication, setIndication] = useState("");
  const [ampules, setAmpules] = useState("");
  const [extras, setExtras] = useState({});
  const resultRef = useRef(null);

  const drugConfig = DRUG_REGISTRY[drugId] || null;
  const accentColor = "#0D9488";  // 統一主色

  const patientParams = drugConfig?.needsRenal
    ? calcPatientParams({ tbw, height, age, gender, scr, rrt })
    : { dosing_weight: 0, crcl: null, ibw: null, adjBw: null, weight_note: "" };

  // 找出當前選擇的適應症資料
  const indicationData = drugConfig && indication
    ? drugConfig.indications.find(i => i.id === indication)
    : null;

  const canCalc = (() => {
    if (!drugConfig || !indicationData) return false;
    if (drugConfig.needsRenal) {
      if (!tbw || !age || !scr || !gender || !rrt) return false;
      if (rrt === "none" && patientParams.crcl === null) return false;
    }
    if (drugConfig.needsHepatic && !hepatic) return false;
    return true;
  })();

  const result = canCalc ? drugConfig.calculate({
    dosing_weight: patientParams.dosing_weight,
    crcl: patientParams.crcl || 0,
    rrt, hepatic, indicationData, extras,
  }) : null;

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [!!result]);

  const resetAll = () => {
    setDrugId(""); setTbw(""); setHeight(""); setAge(""); setGender("");
    setScr(""); setRrt(""); setHepatic(""); setIndication(""); setAmpules(""); setExtras({});
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
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", letterSpacing: -0.5 }}>抗生素劑量及給藥方法</div>
          <div style={{ fontSize: 15, color: "#64748B", marginTop: 2 }}>臨床決策支援工具</div>
        </div>

        <DrugSearchSelect drugList={drugList} selectedId={drugId} onSelect={selectDrug} />

        {/* 病患資料：腎功能 */}
        {drugConfig?.needsRenal && (
          <div style={S.section}>
            <div style={S.sectionTitle}>病患資料</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
              <Input label="體重 TBW" value={tbw} onChange={setTbw} placeholder="kg" suffix="kg" />
              <Input label="身高（選填）" value={height} onChange={setHeight} placeholder="cm" suffix="cm" />
              <Input label="年齡" value={age} onChange={setAge} placeholder="歲" suffix="歲" />
              <div style={{ marginBottom: 16, minWidth: 0 }}>
                <label style={S.label}>性別</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {["M", "F"].map(g => (
                    <button key={g} onClick={() => setGender(g)} style={{
                      flex: 1, padding: "10px 0", borderRadius: 8, minWidth: 0,
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

        {/* 病患資料：肝功能 */}
        {drugConfig?.needsHepatic && (
          <div style={S.section}>
            <div style={S.sectionTitle}>肝功能評估</div>
            <Select label="Child-Pugh 分級" value={hepatic} onChange={setHepatic} options={CHILD_PUGH_OPTIONS} />
          </div>
        )}

        {/* Drug Settings */}
        {drugConfig && (
          <div style={S.section}>
            <div style={S.sectionTitle}>{drugConfig.name} 設定</div>
            <Select label={drugConfig.needsRenal || drugConfig.needsHepatic ? "適應症" : "給藥階段"}
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
              <div style={{ fontSize: 13, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                {drugConfig.name} 建議處方
              </div>
              <div style={{ fontSize: 14, color: "#64748B", marginBottom: 16 }}>
                {indicationData?.label}
              </div>

              {/* 多情境結果：每個 scenario 一張小卡 */}
              {result.scenarioResults?.map((sc, idx) => (
                <div key={idx} style={{
                  marginBottom: idx < result.scenarioResults.length - 1 ? 16 : 0,
                  paddingBottom: idx < result.scenarioResults.length - 1 ? 16 : 0,
                  borderBottom: idx < result.scenarioResults.length - 1 ? "2px dashed #E2E8F0" : "none",
                }}>
                  {/* 情境標題（只有多個情境時才顯示） */}
                  {result.scenarioResults.length > 1 && (
                    <div style={{
                      fontSize: 15, fontWeight: 700, color: "#0F172A",
                      marginBottom: sc.note ? 4 : 10,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accentColor }}></span>
                      {sc.title}
                    </div>
                  )}
                  {sc.note && (
                    <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10, lineHeight: 1.5 }}>
                      {sc.note}
                    </div>
                  )}

                  {/* 舊版相容：直接顯示 rows（沒有 subResults 的情境） */}
                  {sc.rows && sc.rows.map((r, i) => <Row key={i} label={r.label} value={r.value} highlight={r.highlight} />)}

                  {/* 新版：subResults 內可能有 PO/IV 兩種劑型 */}
                  {sc.subResults && sc.subResults.map((sub, sIdx) => (
                    <div key={sIdx} style={{
                      marginTop: sIdx > 0 ? 12 : 0,
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: sub.isPreferred ? "#F0FDFA" : "#F8FAFC",
                      border: sub.isPreferred ? `1.5px solid ${accentColor}` : "1px solid #E2E8F0",
                    }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                        marginBottom: 8,
                      }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          padding: "2px 8px", borderRadius: 10,
                          backgroundColor: sub.route === "PO" ? "#DBEAFE" : "#FEF3C7",
                          color: sub.route === "PO" ? "#1E40AF" : "#92400E",
                        }}>
                          {sub.route === "PO" ? "口服 PO" : "靜脈 IV"}
                        </span>
                        {sub.isPreferred && (
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            padding: "2px 8px", borderRadius: 10,
                            backgroundColor: accentColor, color: "#fff",
                          }}>
                            ⭐ UpToDate 首選
                          </span>
                        )}
                      </div>
                      {sub.rows.map((r, i) => <Row key={i} label={r.label} value={r.value} highlight={r.highlight} />)}
                      {sub.warnings?.map((w, i) => <Warning key={i} text={w} />)}
                    </div>
                  ))}

                  {sc.warnings?.map((w, i) => <Warning key={i} text={w} />)}
                </div>
              ))}

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
  container: { maxWidth: 460, margin: "0 auto", padding: "20px 16px 40px", boxSizing: "border-box" },
  header: { textAlign: "center", padding: "16px 0 24px" },
  section: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", boxSizing: "border-box", overflow: "hidden" },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 },
  select: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", appearance: "auto", WebkitAppearance: "auto", boxSizing: "border-box" },
  input: { flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", outline: "none", boxSizing: "border-box", width: "100%" },
  resetBtn: { width: "100%", marginTop: 20, padding: "14px 0", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: 15, fontWeight: 600, cursor: "pointer" },
};