import { useState, useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { DRUG_REGISTRY } from './drugs';
import { PREP_DATA } from './drugs/prepData';
import { round1 } from './drugs/shared/helpers';
import { getMajorInteractions } from './drugs/shared/majorInteractions';
import type { Drug, Indication, ExtraField, ClinicalPearls } from './drugs/types';
import VancoTDM from './VancoTDM';
import AmikacinTDM from './AmikacinTDM';
import DigoxinTDM from './DigoxinTDM';
import TbGuideline from './TbGuideline';
import DepakineTDM from './DepakineTDM';
import AidsGuideline from './AidsGuideline';
import SepticShock from './SepticShock';
import InsulinTool from './InsulinTool';
import HeparinTool from './HeparinTool';
import ElectrolyteTool from './ElectrolyteTool';
import AcidBaseTool from './AcidBaseTool';
import ARDSTool from './ARDSTool';
import FloTracGuide from './FloTracGuide';
import HeartFailureGuide from './HeartFailureGuide';
import ACLSTool from './ACLSTool';

type Page = "dose" | "vancoTDM" | "amikacinTDM" | "digoxinTDM" | "depakineTDM" | "prepRef" | "tbGuideline" | "aidsGuideline" | "septicShock" | "insulinTool" | "heparinTool" | "electrolyteTool" | "acidBaseTool" | "ardsTool" | "flotracGuide" | "hfGuide" | "aclsTool";
type MenuIconName = "pill" | "chart" | "syringe" | "book" | "alert" | "lungs" | "heart" | "drop" | "shield" | "bolt" | "lab";

const MENU_ITEMS: Array<{ id: Page; label: string; icon: MenuIconName }> = [
  { id: "dose", label: "抗生素劑量及給藥方法", icon: "pill" },
  { id: "vancoTDM", label: "Vancomycin TDM", icon: "chart" },
  { id: "amikacinTDM", label: "Amikacin TDM", icon: "chart" },
  { id: "digoxinTDM", label: "Digoxin TDM", icon: "chart" },
  { id: "depakineTDM", label: "Depakine TDM", icon: "chart" },
  { id: "prepRef", label: "院內針劑泡製速查", icon: "syringe" },
  { id: "tbGuideline", label: "結核病診治指引", icon: "book" },
  { id: "aidsGuideline", label: "AIDS 治療指引", icon: "book" },
  { id: "septicShock", label: "Sepsis / Septic shock", icon: "alert" },
  { id: "aclsTool", label: "ACLS 急救流程", icon: "alert" },
  { id: "ardsTool", label: "ARDS / 呼吸器", icon: "lungs" },
  { id: "flotracGuide", label: "FloTrac / 血流動力學", icon: "chart" },
  { id: "hfGuide", label: "HF guideline 對照", icon: "heart" },
  { id: "insulinTool", label: "血糖 / Insulin 調整", icon: "drop" },
  { id: "heparinTool", label: "抗凝血 / 逆轉工具", icon: "shield" },
  { id: "electrolyteTool", label: "電解質異常工具", icon: "bolt" },
  { id: "acidBaseTool", label: "酸鹼異常 / ABG", icon: "lab" },
];

function MenuIcon({ name, active }: { name: MenuIconName; active: boolean }) {
  const color = active ? "#0D9488" : "#64748B";
  const common = { fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      {name === "pill" && <><path {...common} d="M10.5 20.5 20.5 10.5a5 5 0 0 0-7-7L3.5 13.5a5 5 0 0 0 7 7Z" /><path {...common} d="m8.5 8.5 7 7" /></>}
      {name === "chart" && <><path {...common} d="M4 19V5" /><path {...common} d="M4 19h16" /><path {...common} d="M8 15l3-4 3 2 4-6" /></>}
      {name === "book" && <><path {...common} d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3Z" /><path {...common} d="M5 4v16a3 3 0 0 1 3-3h9" /></>}
      {name === "syringe" && <><path {...common} d="m18 3 3 3" /><path {...common} d="m11 10 3 3" /><path {...common} d="m14 7 3 3-8 8H6v-3Z" /><path {...common} d="M4 20l3-3" /></>}
      {name === "lungs" && <><path {...common} d="M12 4v7" /><path {...common} d="M12 11c-2-3-5-5-7-4v9c0 2 1 3 3 3 3 0 4-4 4-8Z" /><path {...common} d="M12 11c2-3 5-5 7-4v9c0 2-1 3-3 3-3 0-4-4-4-8Z" /></>}
      {name === "alert" && <><path {...common} d="M12 3 22 20H2Z" /><path {...common} d="M12 9v5" /><path {...common} d="M12 17h.01" /></>}
      {name === "heart" && <><path {...common} d="M20.5 8.5c0 6-8.5 11-8.5 11s-8.5-5-8.5-11A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8.5 2.5Z" /></>}
      {name === "drop" && <><path {...common} d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" /></>}
      {name === "shield" && <><path {...common} d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6Z" /><path {...common} d="M8 12h8" /></>}
      {name === "bolt" && <><path {...common} d="M13 2 4 14h7l-1 8 10-13h-7Z" /></>}
      {name === "lab" && <><path {...common} d="M9 3h6" /><path {...common} d="M10 3v5l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 17l-5-9V3" /><path {...common} d="M8 15h8" /></>}
    </svg>
  );
}


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

function useViewportWidth() {
  const [width, setWidth] = useState(() => typeof window === "undefined" ? 460 : window.innerWidth);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return width;
}

type PatientParamsInput = {
  tbw: string;
  height: string;
  age: string;
  gender: string;
  scr: string;
  rrt: string;
  weightStrategy?: "AdjBW_if_obese" | "AdjBW_if_bmi40" | "TBW" | "IBW" | "IBW_if_obese";
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
  } else if (strategy === "AdjBW_if_bmi40") {
    if (ibw && bmi && bmi >= 40) {
      adjBw = round1(ibw + 0.4 * (w - ibw));
      dosing_weight = adjBw;
      weight_note = `Morbid obesity（BMI ${round1(bmi)}）→ AdjBW ${adjBw} kg`;
    }
  } else {
    // AdjBW_if_obese（預設）：依 UpToDate，BMI ≥ 30 判定肥胖
    if (ibw && bmi && bmi >= 30) {
      adjBw = round1(ibw + 0.4 * (w - ibw));
      dosing_weight = adjBw;
      weight_note = `肥胖（BMI ${round1(bmi)}）→ AdjBW ${adjBw} kg`;
    }
  }

  // CrCl（CG 公式）：
  // BMI <30 用 TBW；BMI ≥30 用 AdjBW（避免 TBW 高估肥胖者 CrCl）
  // ⚠️ CrCl 的體重選擇跟「藥物劑量計算」的體重策略無關！
  let crcl: number | null = null;
  if (w > 0 && a > 0 && s > 0 && gender && rrt === "none") {
    const crclWeight = (bmi && bmi >= 30 && adjBw) ? adjBw
                     : (bmi && bmi >= 30 && ibw) ? round1(ibw + 0.4 * (w - ibw))
                     : w;
    crcl = ((140 - a) * crclWeight) / (72 * s);
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
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);

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
  const listboxId = "drug-search-options";
  const highlightedDrug = filtered[highlightedIndex];

  useEffect(() => {
    setHighlightedIndex(filtered.length > 0 ? 0 : -1);
  }, [search, filtered.length]);

  useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, highlightedIndex, filtered.length]);

  const openSelect = () => {
    const selectedIndex = filtered.findIndex(d => d.id === selectedId);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : filtered.length > 0 ? 0 : -1);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const chooseDrug = (id: string) => {
    onSelect(id);
    setOpen(false);
    setSearch("");
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (filtered.length === 0) return;
      setHighlightedIndex(index => (index + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (filtered.length === 0) return;
      setHighlightedIndex(index => (index <= 0 ? filtered.length - 1 : index - 1));
    } else if (e.key === "Enter") {
      if (!open || !highlightedDrug) return;
      e.preventDefault();
      chooseDrug(highlightedDrug.id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setSearch("");
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", marginBottom: 20 }}>
      <label style={S.label}>選擇藥物</label>
      <div
        onClick={() => open ? setOpen(false) : openSelect()}
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
                onChange={e => { setSearch(e.target.value); setOpen(true); }}
                onKeyDown={handleInputKeyDown}
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-activedescendant={highlightedDrug ? `drug-option-${highlightedDrug.id}` : undefined}
                placeholder="藥名、商品名、學名、中文..."
                style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#0F172A", width: "100%", minWidth: 0 }}
              />
              {search && (
                <button onClick={(e) => { e.stopPropagation(); setSearch(""); setHighlightedIndex(0); setTimeout(() => inputRef.current?.focus(), 0); }}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "#94A3B8", fontSize: 16, padding: 0 }}>✕</button>
              )}
            </div>
          </div>

          <div id={listboxId} role="listbox" style={{ maxHeight: 300, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "20px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>找不到符合的藥物</div>
            ) : (
              filtered.map((d, index) => {
                const isHighlighted = index === highlightedIndex;
                const isSelected = d.id === selectedId;
                return (
                <div key={d.id}
                  id={`drug-option-${d.id}`}
                  ref={(node) => { optionRefs.current[index] = node; }}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => chooseDrug(d.id)}
                  style={{
                    padding: "12px 16px", cursor: "pointer",
                    background: isHighlighted ? "#ECFDF5" : isSelected ? "#F0FDFA" : "transparent",
                    borderLeft: (isHighlighted || isSelected) ? `3px solid ${ACCENT}` : "3px solid transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.subtitle}</div>
                </div>
                );
              })
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

// ── 藥師 IV 配藥計算器（互動 row）──────────────────────────
function IVCalcRow({ dilPerAmp, drugLabel, mgPerAmp }: { dilPerAmp: number; drugLabel: string; mgPerAmp?: number }) {
  const [amps, setAmps] = useState("");
  const a = parseFloat(amps) || 0;
  const vol = a > 0 ? Math.round(a * dilPerAmp) : 0;
  const totalMg = a > 0 && mgPerAmp ? Math.round(a * mgPerAmp) : 0;

  return (
    <div style={{ marginTop: 10, padding: 12, background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>💉 藥師決定給予支數（IV 配藥用）</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="number" value={amps} onChange={e => setAmps(e.target.value)}
          placeholder="例：2.5" step="0.5" min="0"
          style={{ width: 80, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 14, textAlign: "center" as const, outline: "none" }} />
        <span style={{ fontSize: 13, color: "#64748B" }}>支 {drugLabel}{totalMg > 0 ? ` = ${totalMg} mg` : ""}</span>
      </div>
      {a > 0 && (
        <div style={{ marginTop: 8, padding: 10, background: "#ECFDF5", borderRadius: 8, border: "1px solid #6EE7B7" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#065F46" }}>護理配藥指示 / 醫囑處方</div>
          <div style={{ fontSize: 13, color: "#065F46", marginTop: 2 }}>
            請抽取 {amps} 支 {drugLabel}，加入 {vol} mL D5W
          </div>
          {totalMg > 0 && (
            <div style={{ fontSize: 13, color: "#065F46", marginTop: 2 }}>
              處方劑量：{totalMg} mg（{mgPerAmp} mg/支 × {amps} 支）
            </div>
          )}
          <div style={{ fontSize: 11, color: "#047857", marginTop: 2 }}>
            （稀釋 {dilPerAmp} mL/支）
          </div>
        </div>
      )}
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

// ── 院內針劑泡製速查（可搜尋卡片）─────────────────────────────
function PrepField({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "6px 0", borderTop: "1px solid #F1F5F9" }}>
      <span style={{ flexShrink: 0, width: 92, fontSize: 12, fontWeight: 600, color: "#94A3B8", lineHeight: 1.5 }}>{label}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: value ? "#334155" : "#CBD5E1", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {value || "—"}
      </span>
    </div>
  );
}

function PrepQuickRef() {
  const [search, setSearch] = useState("");

  const list = Object.entries(DRUG_REGISTRY)
    .map(([id, d]) => ({ id, drug: d, prep: PREP_DATA[id] || d.prep }))
    // 有泡製資料或輸注時間才列入
    .filter(x => x.prep || x.drug.infusionTime)
    // 依「院內商品名（若有）」排序，否則用原商品名
    .sort((a, b) => (a.prep?.brand || a.drug.name).localeCompare(b.prep?.brand || b.drug.name));

  const filtered = list.filter(x => {
    if (!search) return true;
    const q = search.toLowerCase();
    const d = x.drug;
    return (
      (x.prep?.brand || "").toLowerCase().includes(q) ||   // 院內商品名
      d.name.toLowerCase().includes(q) ||                   // 原商品名
      d.subtitle.toLowerCase().includes(q) ||
      (d.searchTerms || []).some(t => t.toLowerCase().includes(q))
    );
  });

  // 攤平成「卡片」：有 products（多品項/多劑型）的藥拆成多張卡
  // 泡製速查頁一律顯示「院內商品名」（prep.brand），沒有才用原商品名 drug.name
  type Card = { key: string; name: string; subtitle: string; prep?: any; infusionTime?: string };
  const cards: Card[] = filtered.flatMap(({ id, drug, prep }) => {
    if (prep?.products?.length) {
      return prep.products.map((p: any, i: number) => ({
        key: `${id}-${i}`,
        name: p.name,
        subtitle: p.subtitle ?? drug.subtitle,
        prep: p,
        infusionTime: p.infusionTime ?? drug.infusionTime,
      }));
    }
    return [{
      key: id,
      name: prep?.brand ?? drug.name,
      subtitle: prep?.subtitle ?? drug.subtitle,
      prep,
      infusionTime: prep?.infusionTime ?? drug.infusionTime,
    }];
  });

  return (
    <div>
      <div style={{ textAlign: "center", padding: "16px 0 20px" }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#0F172A" }}>💉 院內針劑泡製速查</div>
        <div style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>IV Reconstitution & Infusion Quick Reference</div>
      </div>

      {/* 草稿警告 */}
      <div style={{
        background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 10,
        padding: "10px 14px", marginBottom: 16, fontSize: 12.5, color: "#92400E", lineHeight: 1.6,
        display: "flex", gap: 8, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
        <span>資料依<strong>院內品項與各藥仿單</strong>整理。臨床配製前仍請對照最新仿單/院內 SOP 確認。</span>
      </div>

      {/* 搜尋框 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 10, padding: "10px 14px", marginBottom: 14, border: "1.5px solid #E2E8F0" }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="7" cy="7" r="5" stroke="#94A3B8" strokeWidth="1.5"/>
          <path d="M11 11L14 14" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="藥名、商品名、學名、中文..."
          style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#0F172A", width: "100%", minWidth: 0 }} />
        {search && (
          <button onClick={() => setSearch("")}
            style={{ border: "none", background: "none", cursor: "pointer", color: "#94A3B8", fontSize: 16, padding: 0 }}>✕</button>
        )}
      </div>

      {cards.length === 0 ? (
        <div style={{ padding: "24px 16px", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>找不到符合的藥物</div>
      ) : (
        cards.map(({ key, name, subtitle, prep, infusionTime }) => (
          <div key={key} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>{name}</span>
              <span style={{ fontSize: 13, color: "#94A3B8", marginLeft: 8 }}>{subtitle}</span>
            </div>
            <PrepField label="院內品項/規格" value={prep?.vial} />
            <PrepField label="回溶" value={prep?.reconstitution} />
            <PrepField label="建議稀釋液" value={prep?.diluent} />
            <PrepField label="稀釋後/安定性/備註" value={prep?.finalNote} />
            <PrepField label="⏱️ 輸注時間" value={infusionTime} />
          </div>
        ))
      )}

      <div style={{ textAlign: "center", padding: "16px 0 8px", fontSize: 11, color: "#94A3B8" }}>
        共 {cards.length} 項{search ? `（符合 ${filtered.length} 種藥）` : ""}　·　僅供臨床參考，請依實際情境調整
      </div>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🏗️ 主程式                                                     ║
// ╚══════════════════════════════════════════════════════════════════╝

export default function App() {
  const [page, setPage] = useState<Page>("dose");
  const [menuOpen, setMenuOpen] = useState(false);
  const viewportWidth = useViewportWidth();
  const [drugId, setDrugId] = useState("");
  const [crclMode, setCrclMode] = useState<"auto" | "direct">("auto");
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
  const majorInteractions = getMajorInteractions(drugId);

  const indicationData: Indication | null = drugConfig && indication
    ? drugConfig.indications.find(i => i.id === indication) || null
    : null;

  // 決定本次該採用哪種體重策略：indication > drug > 預設
  const activeWeightStrategy =
    indicationData?.weightStrategy ||
    drugConfig?.weightStrategy ||
    "AdjBW_if_obese";

  const patientParams: PatientParamsResult = (() => {
    // 不需腎調也不需體重（如 Cresemba）→ 全部歸零
    if (!drugConfig?.needsRenal && !drugConfig?.needsWeight) {
      return { dosing_weight: 0, crcl: null, egfr: null, ibw: null, adjBw: null, bmi: null, weight_note: "" };
    }

    // 只需體重不需腎調（如 Micafungin、Anidulafungin）→ 算體重相關參數
    if (!drugConfig?.needsRenal && drugConfig?.needsWeight) {
      const w = parseFloat(tbw) || 0;
      const h = parseFloat(height);
      let ibw: number | null = null;
      let adjBw: number | null = null;
      let bmi: number | null = null;
      let dosing_weight = w;
      let weight_note = "使用實際體重（TBW）";
      if (w > 0 && h > 0) {
        bmi = round1(w / Math.pow(h / 100, 2));
        ibw = round1(gender === "F" ? 45.5 + 0.91 * (h - 152.4) : 50 + 0.91 * (h - 152.4));
      }
      const strategy = activeWeightStrategy;
      if (strategy === "AdjBW_if_obese" && ibw && bmi && bmi >= 30) {
        adjBw = round1(ibw + 0.4 * (w - ibw));
        dosing_weight = adjBw;
        weight_note = `肥胖（BMI ${bmi}）→ AdjBW ${adjBw} kg`;
      }
      else if (strategy === "AdjBW_if_bmi40" && ibw && bmi && bmi >= 40) {
        adjBw = round1(ibw + 0.4 * (w - ibw));
        dosing_weight = adjBw;
        weight_note = `Morbid obesity（BMI ${bmi}）→ AdjBW ${adjBw} kg`;
      }
      return { dosing_weight, crcl: null, egfr: null, ibw, adjBw, bmi, weight_note };
    }

    // 需腎調但不需體重（needsRenal:true, needsWeight:false，如 Meropenem）
    if (drugConfig?.needsWeight === false) {
      if (crclMode === "direct") {
        // 直接輸入 CrCl
        return { dosing_weight: 0, crcl: parseFloat(directCrcl) || null, egfr: null, ibw: null, adjBw: null, bmi: null, weight_note: "" };
      }
      // 自動計算：用輸入的體重/年齡/Scr/性別算 CrCl（但 dosing_weight 不用）
      const result = calcPatientParams({ tbw, height, age, gender, scr, rrt, weightStrategy: "AdjBW_if_obese" });
      return { ...result, dosing_weight: 0, weight_note: "" };
    }

    // 需腎調 + 需體重
    if (crclMode === "direct") {
      const w = parseFloat(tbw) || 0;
      const h = parseFloat(height);
      let ibw: number | null = null;
      let adjBw: number | null = null;
      let bmi: number | null = null;
      let dosing_weight = w;
      let weight_note = "使用實際體重（TBW）";
      if (w > 0 && h > 0) {
        bmi = round1(w / Math.pow(h / 100, 2));
        ibw = round1(gender === "F" ? 45.5 + 0.91 * (h - 152.4) : 50 + 0.91 * (h - 152.4));
      }
      const strategy = activeWeightStrategy;
      if (strategy === "TBW") { weight_note = "策略：永遠使用 TBW"; }
      else if (strategy === "IBW" && ibw) { dosing_weight = ibw; weight_note = `策略：使用 IBW（${ibw} kg）`; }
      else if (strategy === "IBW_if_obese" && ibw && bmi && bmi >= 30) { dosing_weight = ibw; weight_note = `肥胖（BMI ${bmi}）→ 使用 IBW（${ibw} kg）`; }
      else if (strategy === "AdjBW_if_bmi40" && ibw && bmi && bmi >= 40) { adjBw = round1(ibw + 0.4 * (w - ibw)); dosing_weight = adjBw; weight_note = `Morbid obesity（BMI ${bmi}）→ AdjBW ${adjBw} kg`; }
      else if (strategy === "AdjBW_if_obese" && ibw && bmi && bmi >= 30) { adjBw = round1(ibw + 0.4 * (w - ibw)); dosing_weight = adjBw; weight_note = `肥胖（BMI ${bmi}）→ AdjBW ${adjBw} kg`; }
      return { dosing_weight, crcl: parseFloat(directCrcl) || null, egfr: null, ibw, adjBw, bmi, weight_note };
    }
    return calcPatientParams({ tbw, height, age, gender, scr, rrt, weightStrategy: activeWeightStrategy });
  })();

  const canCalc = (() => {
    if (!drugConfig || !indicationData) return false;
    // 只需體重不需腎調（Micafungin 等）→ 有體重就能算
    if (!drugConfig.needsRenal && drugConfig.needsWeight) {
      if (!tbw) return false;
    }
    // 需要腎調的藥
    if (drugConfig.needsRenal) {
      if (!rrt) return false;
      if (crclMode === "direct") {
        if (drugConfig.needsWeight && !tbw) return false;
        if (rrt === "none" && !directCrcl) return false;
      } else {
        // 自動計算
        if (drugConfig.needsWeight && !tbw) return false;
        if (!age || !scr || !gender) return false;
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
    setDrugId(""); setCrclMode("auto"); setTbw(""); setHeight(""); setAge(""); setGender("");
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
  const isDesktop = viewportWidth >= 900;
  const widePages = ["prepRef", "tbGuideline", "aidsGuideline", "septicShock", "insulinTool", "amikacinTDM", "digoxinTDM", "heparinTool", "electrolyteTool", "acidBaseTool", "ardsTool", "flotracGuide", "hfGuide", "aclsTool"].includes(page);
  const containerStyle = {
    ...S.container,
    maxWidth: isDesktop ? (widePages ? 1040 : 760) : 460,
    padding: isDesktop ? "24px 28px 48px" : S.container.padding,
  };

  return (
    <div style={S.shell}>
      <div style={containerStyle}>
        {/* ── 漢堡選單 ── */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ position: "absolute", top: 16, left: 0, background: "none", border: "none", fontSize: 24, cursor: "pointer", zIndex: 100, padding: 4 }}>
            ☰
          </button>
          {menuOpen && (
            <div style={{ position: "absolute", top: 46, left: 0, background: "#fff", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 99, minWidth: 246, overflow: "hidden" }}>
              {MENU_ITEMS.map((item) => {
                const active = page === item.id;
                return (
                  <button key={item.id} onClick={() => { setPage(item.id); setMenuOpen(false); }}
                    style={{ ...S.menuItem, ...(active ? S.menuItemActive : {}) }}>
                    <span style={S.menuIcon}><MenuIcon name={item.icon} active={active} /></span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          {menuOpen && (
            <div onClick={() => setMenuOpen(false)}
              style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 98 }} />
          )}
        </div>

        {/* ── 頁面路由 ── */}
        {page === "vancoTDM" ? (
          <VancoTDM />
        ) : page === "amikacinTDM" ? (
          <AmikacinTDM />
        ) : page === "digoxinTDM" ? (
          <DigoxinTDM />
        ) : page === "depakineTDM" ? (
          <DepakineTDM />
        ) : page === "tbGuideline" ? (
          <TbGuideline />
        ) : page === "aidsGuideline" ? (
          <AidsGuideline />
        ) : page === "septicShock" ? (
          <SepticShock />
        ) : page === "aclsTool" ? (
          <ACLSTool />
        ) : page === "ardsTool" ? (
          <ARDSTool />
        ) : page === "flotracGuide" ? (
          <FloTracGuide />
        ) : page === "hfGuide" ? (
          <HeartFailureGuide />
        ) : page === "insulinTool" ? (
          <InsulinTool />
        ) : page === "heparinTool" ? (
          <HeparinTool />
        ) : page === "electrolyteTool" ? (
          <ElectrolyteTool />
        ) : page === "acidBaseTool" ? (
          <AcidBaseTool />
        ) : page === "prepRef" ? (
          <PrepQuickRef />
        ) : (
        <>
        <div style={S.header}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: -0.5 }}>抗生素劑量及給藥方法</div>
          <div style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>臨床決策支援工具</div>
        </div>

        <DrugSearchSelect drugList={drugList} selectedId={drugId} onSelect={selectDrug} />

        {/* 病患資料：needsRenal（要腎調）或 needsWeight（要體重算劑量）的藥才顯示 */}
        {(drugConfig?.needsRenal || drugConfig?.needsWeight) && (
          <div style={S.section}>
            <div style={S.sectionTitle}>病患資料</div>

            {/* ────────────────────────────────────────────── */}
            {/* CrCl 模式切換：只有需要腎功能調整的藥才顯示     */}
            {/* ────────────────────────────────────────────── */}
            {drugConfig.needsRenal && (
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>CrCl 來源</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {([["auto", "自動計算"], ["direct", "直接輸入 CrCl"]] as const).map(([m, label]) => (
                    <button key={m} onClick={() => setCrclMode(m)}
                      style={{
                        flex: 1, padding: "9px 0", borderRadius: 8, minWidth: 0,
                        border: crclMode === m ? `2px solid ${ACCENT}` : "2px solid #E2E8F0",
                        background: crclMode === m ? `${ACCENT}10` : "#fff",
                        fontWeight: 600, fontSize: 13, cursor: "pointer",
                        color: crclMode === m ? ACCENT : "#64748B",
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ────────────────────────────────────────────── */}
            {/* 自動計算模式：體重/身高/年齡/性別/Scr 全部顯示   */}
            {/* ────────────────────────────────────────────── */}
            {drugConfig.needsRenal && crclMode === "auto" && (
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

            {/* ────────────────────────────────────────────── */}
            {/* 直接輸入 CrCl 模式：體重（如需）+ CrCl          */}
            {/* ────────────────────────────────────────────── */}
            {drugConfig.needsRenal && crclMode === "direct" && (
              <>
                {drugConfig.needsWeight && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
                    <Input label="體重 TBW" value={tbw} onChange={setTbw} placeholder="kg" suffix="kg" />
                    <Input label="身高（選填，算 BMI/IBW）" value={height} onChange={setHeight} placeholder="cm" suffix="cm" />
                  </div>
                )}
                {drugConfig.needsWeight && height && (
                  <div style={{ marginBottom: 12, minWidth: 0 }}>
                    <label style={S.label}>性別（選填，算 IBW 用）</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["M", "F"].map(g => (
                        <button key={g} onClick={() => setGender(g)} style={{
                          flex: 1, padding: "8px 0", borderRadius: 8, minWidth: 0,
                          border: gender === g ? `2px solid ${ACCENT}` : "2px solid #E2E8F0",
                          background: gender === g ? `${ACCENT}10` : "#fff",
                          fontWeight: 600, fontSize: 13, cursor: "pointer",
                          color: gender === g ? ACCENT : "#64748B",
                        }}>
                          {g === "M" ? "男 M" : "女 F"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <Input label="CrCl（醫院系統或實測值）" value={directCrcl} onChange={setDirectCrcl} placeholder="mL/min" suffix="mL/min" />
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: -8, marginBottom: 12 }}>
                  直接輸入 CrCl 值，不需填年齡、Scr
                </div>
              </>
            )}

            {/* ────────────────────────────────────────────── */}
            {/* 只需體重的藥（如 Micafungin）：只顯示體重+身高   */}
            {/* ────────────────────────────────────────────── */}
            {!drugConfig.needsRenal && drugConfig.needsWeight && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
                  <Input label="體重 TBW" value={tbw} onChange={setTbw} placeholder="kg" suffix="kg" />
                  <Input label="身高（選填）" value={height} onChange={setHeight} placeholder="cm" suffix="cm" />
                </div>
                {height && (
                  <div style={{ marginBottom: 12, minWidth: 0 }}>
                    <label style={S.label}>性別（選填，算 IBW/BMI 用）</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["M", "F"].map(g => (
                        <button key={g} onClick={() => setGender(g)} style={{
                          flex: 1, padding: "8px 0", borderRadius: 8, minWidth: 0,
                          border: gender === g ? `2px solid ${ACCENT}` : "2px solid #E2E8F0",
                          background: gender === g ? `${ACCENT}10` : "#fff",
                          fontWeight: 600, fontSize: 13, cursor: "pointer",
                          color: gender === g ? ACCENT : "#64748B",
                        }}>
                          {g === "M" ? "男 M" : "女 F"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ────────────────────────────────────────────── */}
            {/* 透析狀態 + CrCl：只有需要腎調的藥才顯示         */}
            {/* ────────────────────────────────────────────── */}
            {drugConfig.needsRenal && (
              <Select label="透析狀態" value={rrt} onChange={setRrt} options={RRT_OPTIONS} />
            )}

            {/* ────────────────────────────────────────────── */}
            {/* 參數摘要：顯示計算結果                          */}
            {/* ────────────────────────────────────────────── */}
            {(patientParams.dosing_weight > 0 || patientParams.crcl !== null) && rrt && (
              <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#475569", display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                {patientParams.dosing_weight > 0 && (
                  <span>📐 {patientParams.weight_note}{!patientParams.adjBw ? ` — ${round1(patientParams.dosing_weight)} kg` : ""}</span>
                )}
                {patientParams.ibw && <span>📏 IBW: {patientParams.ibw} kg{patientParams.bmi ? `　|　BMI: ${patientParams.bmi}` : ""}</span>}
                {patientParams.adjBw && <span>⚖️ AdjBW: {patientParams.adjBw} kg（用於 CrCl 計算）</span>}
                {drugConfig.needsRenal && rrt === "none" && patientParams.crcl !== null && (
                  <span>🧪 CrCl: {patientParams.crcl} mL/min{crclMode === "direct" ? "（直接輸入）" : "（CG 公式）"}</span>
                )}
                {drugConfig.needsRenal && rrt !== "none" && <span>🔄 {RRT_OPTIONS.find(o => o.id === rrt)?.label}</span>}
              </div>
            )}
            {/* needsWeight:true 但不需腎調的藥（Micafungin 等），沒有 rrt 也要顯示 */}
            {!drugConfig.needsRenal && drugConfig.needsWeight && patientParams.dosing_weight > 0 && (
              <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#475569", display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                <span>📐 {patientParams.weight_note}{!patientParams.adjBw ? ` — ${round1(patientParams.dosing_weight)} kg` : ""}</span>
                {patientParams.ibw && <span>📏 IBW: {patientParams.ibw} kg{patientParams.bmi ? `　|　BMI: ${patientParams.bmi}` : ""}</span>}
                {patientParams.adjBw && <span>⚖️ AdjBW: {patientParams.adjBw} kg</span>}
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
              if (f.showWhenRrt && !f.showWhenRrt.includes(rrt)) return null;
              if (f.type === "toggle") {
                return <Toggle key={f.key} label={f.label} value={!!extras[f.key]}
                  onChange={v => setExtras(prev => ({ ...prev, [f.key]: v }))} />;
              }
              if (f.type === "select") {
                return <Select key={f.key} label={f.label} value={String(extras[f.key] ?? "")}
                  onChange={v => setExtras(prev => ({ ...prev, [f.key]: v }))} options={f.options || []} />;
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

              {/* 輸注時間提示 */}
              {drugConfig.infusionTime && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#EFF6FF", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#1E40AF" }}>
                  <span>⏱️</span>
                  <span><strong>輸注時間：</strong>{drugConfig.infusionTime}</span>
                </div>
              )}

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
                  {sc.rows?.map((r: any, i: number) => {
                    // 特殊 row type: ivCalc → 渲染藥師輸入框
                    if (r.type === "ivCalc") {
                      return <IVCalcRow key={i} dilPerAmp={r.dilPerAmp} drugLabel={r.drugLabel} mgPerAmp={r.mgPerAmp} />;
                    }
                    return <Row key={i} label={r.label} value={r.value} highlight={r.highlight} />;
                  })}
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
                  {sc.warnings?.map((w: any, i: number) => <Warning key={i} text={w} />)}
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

        {majorInteractions && (
          <ClinicalPearlsBox pearls={majorInteractions} />
        )}

        {drugId && <button onClick={resetAll} style={S.resetBtn}>重新評估</button>}
        <div style={{ textAlign: "center", padding: "24px 0 8px", fontSize: 11, color: "#94A3B8" }}>僅供臨床參考，請依實際情境調整</div>
        </>
        )}
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
  menuItem: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", border: "none", background: "none", textAlign: "left" as const, fontSize: 14, color: "#334155", cursor: "pointer", borderBottom: "1px solid #F1F5F9" },
  menuItemActive: { background: "#F0FDFA", color: "#0D9488", fontWeight: 700 },
  menuIcon: { width: 20, display: "inline-flex", justifyContent: "center", flexShrink: 0 },
};
