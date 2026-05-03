import { useState, useEffect, useRef } from "react";
import { DRUG_REGISTRY } from './drugs';
import { round1 } from './drugs/shared/helpers';
import type { Drug, Indication, ExtraField, ClinicalPearls } from './drugs/types';


// ╔══════════════════════════════════════════════════════════════════╗
// ║  🔧 共用工具                                                    ║
// ╚══════════════════════════════════════════════════════════════════╝


const RRT_OPTIONS = [
  { id: "none", label: "無透析（含 CKD）" },
  { id: "hd",   label: "HD（血液透析）" },
  { id: "pd",   label: "PD（腹膜透析）" },
  { id: "cvvh", label: "CVVH / CVVHDF" },
];

const CHILD_PUGH_OPTIONS = [
  { id: "normal", label: "肝功能正常" },
  { id: "A", label: "Child-Pugh A（輕度）" },
  { id: "B", label: "Child-Pugh B（中度）" },
  { id: "C", label: "Child-Pugh C（重度）" },
];

type PatientParamsInput = {
  tbw: string;
  height: string;
  age: string;
  gender: string;
  scr: string;
  rrt: string;
  weightStrategy?: "AdjBW_if_obese" | "TBW" | "IBW" | "IBW_if_obese";
};

type PatientParamsResult = {
  dosing_weight: number;
  weight_note: string;
  ibw: number | null;
  adjBw: number | null;
  bmi: number | null;
  crcl: number | null;
  egfr: number | null;
};

function calcPatientParams({ tbw, height, age, gender, scr, rrt, weightStrategy }: PatientParamsInput): PatientParamsResult {
  const w = parseFloat(tbw) || 0;
  const h = parseFloat(height);
  const a = parseFloat(age);
  const s = parseFloat(scr);

  let dosing_weight = w;
  let weight_note = "使用實際體重（TBW）";
  let ibw: number | null = null;
  let adjBw: number | null = null;
  let bmi: number | null = null;

  // 算 BMI（給肥胖判斷用）
  if (w > 0 && h > 0) {
    bmi = w / Math.pow(h / 100, 2);
  }

  // 算 IBW（CrCl 計算可能用到）
  if (w > 0 && h > 0 && gender) {
    ibw = gender === "M" ? 50 + 0.91 * (h - 152.4) : 45.5 + 0.91 * (h - 152.4);
  }

  // 依策略決定 dosing weight
  const strategy = weightStrategy || "AdjBW_if_obese";   // 預設

  if (strategy === "TBW") {
    dosing_weight = w;
    weight_note = "策略：永遠使用 TBW";
  } else if (strategy === "IBW" && ibw) {
    dosing_weight = round1(ibw);
    weight_note = `策略：使用 IBW（${round1(ibw)} kg）`;
  } else if (strategy === "IBW_if_obese") {
    // BMI ≥30 用 IBW；BMI <30 用 TBW（Acyclovir、Ganciclovir 用）
    if (ibw && bmi && bmi >= 30) {
      dosing_weight = round1(ibw);
      weight_note = `肥胖（BMI ${round1(bmi)}）→ 使用 IBW（${round1(ibw)} kg）`;
    } else {
      dosing_weight = w;
      weight_note = `使用 TBW（${round1(w)} kg）`;
    }
  } else {
    // AdjBW_if_obese（預設）：依 UpToDate，BMI ≥ 30 判定肥胖
    if (ibw && bmi && bmi >= 30) {
      adjBw = round1(ibw + 0.4 * (w - ibw));
      dosing_weight = adjBw;
      weight_note = `肥胖（BMI ${round1(bmi)}）→ AdjBW ${adjBw} kg`;
    }
  }

  // CrCl 一律用 dosing weight 算（與舊版相容）
  let crcl: number | null = null;
  if (dosing_weight > 0 && a > 0 && s > 0 && gender && rrt === "none") {
    crcl = ((140 - a) * dosing_weight) / (72 * s);
    if (gender === "F") crcl *= 0.85;
    crcl = round1(crcl);
  }

  // eGFR（CKD-EPI 2021，不含種族）
  // 用於 Teicoplanin 等以 eGFR 調整劑量的藥物
  let egfr: number | null = null;
  if (a > 0 && s > 0 && gender && rrt === "none") {
    if (gender === "F") {
      const kappa = 0.7;
      const alpha = s <= kappa ? -0.241 : -1.2;
      egfr = 142 * Math.pow(Math.min(s / kappa, 1), alpha) * Math.pow(Math.max(s / kappa, 1), -1.2) * Math.pow(0.9938, a);
    } else {
      const kappa = 0.9;
      const alpha = s <= kappa ? -0.302 : -1.2;
      egfr = 142 * Math.pow(Math.min(s / kappa, 1), alpha) * Math.pow(Math.max(s / kappa, 1), -1.2) * Math.pow(0.9938, a);
    }
    egfr = round1(egfr);
  }

  return {
    dosing_weight, weight_note,
    ibw: ibw ? round1(ibw) : null,
    adjBw, bmi: bmi ? round1(bmi) : null,
    crcl,
    egfr,
  };
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🔍 可搜尋下拉選單                                              ║
// ╚══════════════════════════════════════════════════════════════════╝

const ACCENT = "#0D9488";

type DrugListItem = Drug & { id: string };

type DrugSearchSelectProps = {
  drugList: DrugListItem[];
  selectedId: string;
  onSelect: (id: string) => void;
};

function DrugSearchSelect({ drugList, selectedId, onSelect }: DrugSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
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
          border: open ? `2px solid ${ACCENT}` : "2px solid #E2E8F0",
          background: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "border 0.15s",
        }}
      >
        {selected ? (
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>{selected.name}</span>
            <span style={{ fontSize: 13, color: "#94A3B8", marginLeft: 8 }}>{selected.subtitle}</span>
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
                placeholder="藥名、商品名、學名、中文..."
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#0F172A", width: "100%", minWidth: 0 }}
              />
              {search && (
                <button onClick={(e) => { e.stopPropagation(); setSearch(""); }}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "#94A3B8", fontSize: 16, padding: 0 }}>✕</button>
              )}
            </div>
          </div>

          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "20px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>找不到符合的藥物</div>
            ) : (
              filtered.map(d => (
                <div key={d.id}
                  onClick={() => { onSelect(d.id); setOpen(false); setSearch(""); }}
                  style={{
                    padding: "12px 16px", cursor: "pointer",
                    background: d.id === selectedId ? "#F0FDFA" : "transparent",
                    borderLeft: d.id === selectedId ? `3px solid ${ACCENT}` : "3px solid transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (d.id !== selectedId) e.currentTarget.style.background = "#F8FAFC"; }}
                  onMouseLeave={e => { if (d.id !== selectedId) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.subtitle}</div>
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

type SelectOption = { id: string; label: string; desc?: string };

type SelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
};

function Select({ label, value, onChange, options, placeholder }: SelectProps) {
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

type InputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
};

function Input({ label, value, onChange, placeholder, suffix }: InputProps) {
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

type ToggleProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <label style={{ ...S.label, marginBottom: 0 }}>{label}</label>
      <button onClick={() => onChange(!value)} style={{
        width: 52, height: 28, borderRadius: 14, border: "none",
        backgroundColor: value ? ACCENT : "#CBD5E1",
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

type RowProps = {
  label: string;
  value: string;
  highlight?: boolean;
};

function Row({ label, value, highlight }: RowProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: "1px solid #F1F5F9", gap: 8 }}>
      <span style={{ color: "#64748B", fontSize: 14, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: highlight ? 700 : 500, fontSize: highlight ? 17 : 15, color: highlight ? "#0F172A" : "#334155", textAlign: "right", minWidth: 0 }}>{value}</span>
    </div>
  );
}

function Warning({ text }: { text: string }) {
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

// ── 臨床參考（可展開）─────────────────────────────────────
function ClinicalPearlsBox({ pearls }: { pearls: ClinicalPearls }) {
  const [open, setOpen] = useState(false);
  const title = pearls.title || "臨床參考（非 UpToDate）";

  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      marginTop: 16,
      border: "1px solid #E2E8F0",
      overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "14px 16px",
          background: "#F8FAFC",
          border: "none",
          borderBottom: open ? "1px solid #E2E8F0" : "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 14,
          fontWeight: 600,
          color: "#475569",
          textAlign: "left",
        }}
      >
        <span>📖 {title}</span>
        <svg
          width="14" height="14" viewBox="0 0 16 16" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}
        >
          <path d="M4 6L8 10L12 6" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ padding: "16px 16px 20px" }}>
          {pearls.sections.map((sec: any, idx: number) => (
            <div key={idx} style={{ marginBottom: idx < pearls.sections.length - 1 ? 16 : 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#0F172A",
                marginBottom: 6,
                paddingBottom: 4,
                borderBottom: "2px solid #F0FDFA",
              }}>
                {sec.heading}
              </div>
              <div style={{
                fontSize: 13,
                color: "#475569",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",   // 保留 \n 換行
              }}>
                {sec.body}
              </div>
            </div>
          ))}
        </div>
      )}
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
  const [directCrcl, setDirectCrcl] = useState("");   // 藥物不需體重時，直接輸入 CrCl
  const [rrt, setRrt] = useState("");
  const [hepatic, setHepatic] = useState("");
  const [indication, setIndication] = useState("");
  const [ampules, setAmpules] = useState("");
  const [extras, setExtras] = useState<Record<string, boolean | string>>({});
  const resultRef = useRef<HTMLDivElement>(null);

  const drugConfig: Drug | null = DRUG_REGISTRY[drugId] || null;

  const indicationData: Indication | null = drugConfig && indication
    ? drugConfig.indications.find(i => i.id === indication) || null
    : null;

  // 決定本次該採用哪種體重策略：indication > drug > 預設
  const activeWeightStrategy =
    indicationData?.weightStrategy ||
    drugConfig?.weightStrategy ||
    "AdjBW_if_obese";

  const patientParams: PatientParamsResult = drugConfig?.needsRenal
    ? (drugConfig.needsWeight === false
        ? { dosing_weight: 0, crcl: parseFloat(directCrcl) || null, egfr: null, ibw: null, adjBw: null, bmi: null, weight_note: "" }
        : calcPatientParams({ tbw, height, age, gender, scr, rrt, weightStrategy: activeWeightStrategy }))
    : { dosing_weight: 0, crcl: null, egfr: null, ibw: null, adjBw: null, bmi: null, weight_note: "" };

  const canCalc = (() => {
    if (!drugConfig || !indicationData) return false;
    if (drugConfig.needsRenal) {
      if (!rrt) return false;
      if (drugConfig.needsWeight !== false) {
        // 需要體重的藥：檢查所有人口學欄位
        if (!tbw || !age || !scr || !gender) return false;
        if (rrt === "none" && patientParams.crcl === null) return false;
      } else {
        // 不需要體重的藥：若 rrt=none 則要求 CrCl 直接輸入
        if (rrt === "none" && patientParams.crcl === null) return false;
      }
    }
    if (drugConfig.needsHepatic && !hepatic) return false;
    return true;
  })();

  const result = canCalc && drugConfig && indicationData ? drugConfig.calculate({
    dosing_weight: patientParams.dosing_weight,
    crcl: patientParams.crcl || 0,
    rrt, hepatic, indicationData,
    extras: { ...extras, egfr: patientParams.egfr, ibw: patientParams.ibw, tbw: parseFloat(tbw) || 0, bmi: patientParams.bmi },
  }) : null;

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [!!result]);

  const resetAll = () => {
    setDrugId(""); setTbw(""); setHeight(""); setAge(""); setGender("");
    setScr(""); setDirectCrcl(""); setRrt(""); setHepatic(""); setIndication(""); setAmpules(""); setExtras({});
  };

  const selectDrug = (id: string) => {
    setDrugId(id); setIndication(""); setAmpules("");
    const cfg = DRUG_REGISTRY[id];
    if (cfg?.extraFields) {
      const defaults: Record<string, boolean | string> = {};
      cfg.extraFields.forEach((f: ExtraField) => { defaults[f.key] = f.default ?? false; });
      setExtras(defaults);
    } else { setExtras({}); }
  };

  const drugList: DrugListItem[] = Object.entries(DRUG_REGISTRY).map(([id, cfg]) => ({ id, ...cfg }));

  return (
    <div style={S.shell}>
      <div style={S.container}>
        <div style={S.header}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: -0.5 }}>抗生素劑量及給藥方法</div>
          <div style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>臨床決策支援工具</div>
        </div>

        <DrugSearchSelect drugList={drugList} selectedId={drugId} onSelect={selectDrug} />

        {/* 病患資料 */}
        {drugConfig?.needsRenal && (
          <div style={S.section}>
            <div style={S.sectionTitle}>病患資料</div>
            {drugConfig.needsWeight !== false && (
              <>
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
                          border: gender === g ? `2px solid ${ACCENT}` : "2px solid #E2E8F0",
                          background: gender === g ? `${ACCENT}10` : "#fff",
                          fontWeight: 600, fontSize: 14, cursor: "pointer",
                          color: gender === g ? ACCENT : "#64748B",
                        }}>
                          {g === "M" ? "男 M" : "女 F"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <Input label="血清肌酸酐 Scr" value={scr} onChange={setScr} placeholder="mg/dL" suffix="mg/dL" />
              </>
            )}
            <Select label="透析狀態" value={rrt} onChange={setRrt} options={RRT_OPTIONS} />
            {drugConfig.needsWeight !== false && patientParams.dosing_weight > 0 && rrt && (
              <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#475569", display: "flex", flexDirection: "column", gap: 4 }}>
                <span>📐 {patientParams.weight_note}{!patientParams.adjBw ? ` — ${round1(patientParams.dosing_weight)} kg` : ""}</span>
                {patientParams.ibw && <span>📏 IBW: {patientParams.ibw} kg{patientParams.bmi ? `　|　BMI: ${patientParams.bmi}` : ""}</span>}
                {rrt === "none" && patientParams.crcl !== null && <span>🧪 CrCl: {patientParams.crcl} mL/min</span>}
                {rrt !== "none" && <span>🔄 {RRT_OPTIONS.find(o => o.id === rrt)?.label}</span>}
              </div>
            )}
          </div>
        )}

        {drugConfig?.needsHepatic && (
          <div style={S.section}>
            <div style={S.sectionTitle}>肝功能評估</div>
            <Select label="Child-Pugh 分級" value={hepatic} onChange={setHepatic} options={CHILD_PUGH_OPTIONS} />
          </div>
        )}

        {drugConfig && (
          <div style={S.section}>
            <div style={S.sectionTitle}>{drugConfig.name} 設定</div>
            <Select label="適應症"
              value={indication} onChange={setIndication} options={drugConfig.indications} />
            {drugConfig.extraFields?.map((f: ExtraField) => {
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
          {result && drugConfig && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginTop: 16, borderLeft: `4px solid ${ACCENT}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                {drugConfig.name} 建議處方
              </div>
              <div style={{ fontSize: 14, color: "#64748B", marginBottom: 16 }}>
                {indicationData?.label}
              </div>

              {result.scenarioResults?.map((sc: any, idx: number) => (
                <div key={idx} style={{
                  marginBottom: idx < (result.scenarioResults?.length ?? 0) - 1 ? 16 : 0,
                  paddingBottom: idx < (result.scenarioResults?.length ?? 0) - 1 ? 16 : 0,
                  borderBottom: idx < (result.scenarioResults?.length ?? 0) - 1 ? "2px dashed #E2E8F0" : "none",
                }}>
                  {(result.scenarioResults?.length ?? 0) > 1 && (
                    <div style={{
                      fontSize: 15, fontWeight: 700, color: "#0F172A",
                      marginBottom: sc.note ? 4 : 10,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT }}></span>
                      {sc.title}
                    </div>
                  )}
                  {sc.note && (
                    <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10, lineHeight: 1.5 }}>
                      {sc.note}
                    </div>
                  )}

                  {/* 簡單情境：直接用 rows */}
                  {sc.rows?.map((r: any, i: number) => <Row key={i} label={r.label} value={r.value} highlight={r.highlight} />)}
                  {sc.warnings?.map((w: any, i: number) => <Warning key={i} text={w} />)}

                  {/* 複雜情境：有多個路徑 subResults */}
                  {sc.subResults && (() => {
                    // 只有當同時存在 PO 和 IV 時才顯示「UpToDate 首選」標籤
                    const hasMultipleRoutes = sc.subResults.length > 1;
                    return sc.subResults.map((sub: any, sIdx: number) => {
                      const showPreferredBadge = hasMultipleRoutes && sub.isPreferred;
                      return (
                        <div key={sIdx} style={{
                          marginTop: sIdx > 0 ? 12 : 0,
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: showPreferredBadge ? "#F0FDFA" : "#F8FAFC",
                          border: showPreferredBadge ? `1.5px solid ${ACCENT}` : "1px solid #E2E8F0",
                        }}>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 6,
                            marginBottom: 8, flexWrap: "wrap",
                          }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700,
                              padding: "2px 8px", borderRadius: 10,
                              backgroundColor: sub.customLabelBg || (sub.route === "PO" ? "#DBEAFE" : "#FEF3C7"),
                              color: sub.customLabelColor || (sub.route === "PO" ? "#1E40AF" : "#92400E"),
                            }}>
                              {sub.customLabel || (sub.route === "PO" ? "口服 PO" : "靜脈 IV")}
                            </span>
                            {showPreferredBadge && (
                              <span style={{
                                fontSize: 11, fontWeight: 700,
                                padding: "2px 8px", borderRadius: 10,
                                backgroundColor: ACCENT, color: "#fff",
                              }}>
                                ⭐ UpToDate 首選
                              </span>
                            )}
                          </div>
                          {sub.rows.map((r: any, i: number) => <Row key={i} label={r.label} value={r.value} highlight={r.highlight} />)}
                          {sub.warnings?.map((w: any, i: number) => <Warning key={i} text={w} />)}
                        </div>
                      );
                    });
                  })()}
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

        {drugConfig?.clinicalPearls && (
          <ClinicalPearlsBox pearls={drugConfig.clinicalPearls} />
        )}

        {drugId && <button onClick={resetAll} style={S.resetBtn}>重新評估</button>}
        <div style={{ textAlign: "center", padding: "24px 0 8px", fontSize: 11, color: "#94A3B8" }}>僅供臨床參考，請依實際情境調整</div>
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🎨 樣式                                                       ║
// ╚══════════════════════════════════════════════════════════════════╝

const S: Record<string, React.CSSProperties> = {
  shell: { minHeight: "100vh", background: "linear-gradient(180deg, #F0FDFA 0%, #F8FAFC 40%)", fontFamily: "'SF Pro Text', -apple-system, 'Segoe UI', sans-serif" },
  container: { maxWidth: 460, margin: "0 auto", padding: "20px 16px 40px", boxSizing: "border-box" },
  header: { textAlign: "center", padding: "16px 0 24px" },
  section: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", boxSizing: "border-box", overflow: "hidden" },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 },
  select: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", appearance: "auto" as const, boxSizing: "border-box" },
  input: { flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 15, color: "#0F172A", background: "#fff", outline: "none", boxSizing: "border-box", width: "100%" },
  resetBtn: { width: "100%", marginTop: 20, padding: "14px 0", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: 15, fontWeight: 600, cursor: "pointer" },
};
