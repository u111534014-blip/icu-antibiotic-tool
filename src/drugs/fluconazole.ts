// ═══════════════════════════════════════════════════════════════════════════
// fluconazole.ts  ·  Fluconazole（Diflucan 泰復肯）
//
// 院內品項
//   IV：Diflucan 針  100 mg / 50 mL / 支（2 mg/mL）泰復肯靜脈注射劑
//   PO：膚黴克膠囊   50 mg / 顆（Fluene / 膚黴克）
//
// 腎功能調整原則（Lexicomp 2026）
//   CrCl > 50        → 不需調整
//   CrCl ≤ 50        → 維持量減半（loading 不減）
//   HD 3x/week       → Full dose 透析後給藥，每週三次
//                       替代：維持量減半 QD，透析日透析後給
//   CRRT（CVVH/D/HDF）→ 劑量需增加（tubular reabsorption 消失，
//                       clearance 增加 1.5–2x）
//   PD               → 維持量減半（同 CrCl ≤50 邏輯）
//
// CRRT 劑量上調對照（Lexicomp）
//   常規 200 mg → CRRT 400 mg QD
//   常規 400 mg → CRRT loading 800 mg → 維持 800 mg QD（或 Q12H）
//   常規 800 mg → CRRT loading 1200 mg → 維持 1200 mg QD（或 Q12H）
//
// 肝功能：Child-Pugh A–C 均不需調整
// ═══════════════════════════════════════════════════════════════════════════

import type { Drug } from './types';

// ── 院內品項常數 ───────────────────────────────────────────────────────────
const IV_MG_PER_VIAL = 100;   // 泰復肯靜脈注射劑 100 mg/支
const PO_MG_PER_CAP  = 50;    // 膚黴克膠囊 50 mg/顆

// ── Helper：把 mg 換算成「最接近的半支」數字字串 ──────────────────────────
// 例：210 mg, 100 mg/支 → 210/100 = 2.1 → 取最近 0.5 → 2 支
//     240 mg, 100 mg/支 → 2.4 → 2.5 支
//     260 mg, 100 mg/支 → 2.6 → 2.5 支
//     290 mg, 100 mg/支 → 2.9 → 3 支
function toHalfVials(mg: number, mg_per_vial: number): string {
  const raw = mg / mg_per_vial;
  const half = Math.round(raw * 2) / 2;   // 取最近 0.5
  if (half === 0.5) return "0.5 支（半支）";
  if (half % 1 === 0) return `${half} 支`;
  return `${half} 支`;
}

// ── Helper：顯示「固定 / kg 計算」兩個選項（若兩者都有） ──────────────────
// 回傳格式：
//   - 只有固定：「400 mg（常用固定量）」
//   - 只有 kg：「420 mg（6 mg/kg × 70 kg）」
//   - 兩者都有：「400 mg（常用固定量）｜ 或 420 mg（6 mg/kg × 70 kg）」
//   - 範圍版本會顯示 lo–hi 格式
function formatMaintDose(
  sc: any,
  dosing_weight: number,
  factor: number,
): { maint_mg: number; display: string } {
  // 計算固定劑量字串（若有定義）
  let stdStr: string | null = null;
  let stdMid: number | null = null;
  if (sc.std_maint_mg_min !== undefined && sc.std_maint_mg_max !== undefined) {
    const lo = Math.round(sc.std_maint_mg_min * factor);
    const hi = Math.round(sc.std_maint_mg_max * factor);
    stdStr = lo === hi ? `${lo} mg（常用固定量）` : `${lo}–${hi} mg（常用固定量）`;
    stdMid = Math.round((lo + hi) / 2);
  } else if (sc.std_maint_mg !== undefined) {
    const v = Math.round(sc.std_maint_mg * factor);
    stdStr = `${v} mg（常用固定量）`;
    stdMid = v;
  }

  // 計算 kg-based 劑量字串（若有定義）
  let kgStr: string | null = null;
  let kgMid: number | null = null;
  if (sc.wt_maint_mg_per_kg_min !== undefined && sc.wt_maint_mg_per_kg_max !== undefined) {
    const lo = Math.round(dosing_weight * sc.wt_maint_mg_per_kg_min * factor);
    const hi = Math.round(dosing_weight * sc.wt_maint_mg_per_kg_max * factor);
    kgStr = lo === hi
      ? `${lo} mg（${sc.wt_maint_mg_per_kg_min} mg/kg × ${dosing_weight} kg）`
      : `${lo}–${hi} mg（${sc.wt_maint_mg_per_kg_min}–${sc.wt_maint_mg_per_kg_max} mg/kg × ${dosing_weight} kg）`;
    kgMid = Math.round((lo + hi) / 2);
  } else if (sc.wt_maint_mg_per_kg !== undefined) {
    const v = Math.round(dosing_weight * sc.wt_maint_mg_per_kg * factor);
    kgStr = `${v} mg（${sc.wt_maint_mg_per_kg} mg/kg × ${dosing_weight} kg）`;
    kgMid = v;
  }

  // 兩者都有：並列
  if (stdStr && kgStr) {
    return {
      maint_mg: stdMid!,   // 用固定劑量當支數計算基準（UpToDate 原文「400 mg（或 6 mg/kg）」）
      display: `${stdStr}\n或 ${kgStr}`,
    };
  }
  // 只有其中一個
  return {
    maint_mg: (stdMid ?? kgMid ?? 0),
    display: stdStr ?? kgStr ?? "—",
  };
}

// ── Helper：Loading dose 同樣處理 ──────────────────────────────────────────
function formatLoadDose(
  sc: any,
  dosing_weight: number,
  factor: number,
): { load_mg: number | null; display: string | null } {
  if (!sc.hasLoading) return { load_mg: null, display: null };

  let stdStr: string | null = null;
  let stdVal: number | null = null;
  if (sc.std_load_mg !== undefined) {
    const v = Math.round(sc.std_load_mg * factor);
    stdStr = `${v} mg（常用固定量）`;
    stdVal = v;
  }

  let kgStr: string | null = null;
  let kgVal: number | null = null;
  if (sc.wt_load_mg_per_kg !== undefined) {
    const v = Math.round(dosing_weight * sc.wt_load_mg_per_kg * factor);
    kgStr = `${v} mg（${sc.wt_load_mg_per_kg} mg/kg × ${dosing_weight} kg）`;
    kgVal = v;
  }

  if (stdStr && kgStr) {
    return { load_mg: stdVal!, display: `${stdStr}\n或 ${kgStr}` };
  }
  return {
    load_mg: stdVal ?? kgVal,
    display: stdStr ?? kgStr,
  };
}

// CRRT 劑量上調表
function getCRRTDose(usualMaint_mg: number): {
  load_mg: number | null;
  maint_mg: number;
  freq: string;
} {
  if (usualMaint_mg <= 200) return { load_mg: null,  maint_mg: 400,  freq: "QD" };
  if (usualMaint_mg <= 400) return { load_mg: 800,   maint_mg: 800,  freq: "QD（或分 Q12H）" };
  return                           { load_mg: 1200,  maint_mg: 1200, freq: "QD（或分 Q12H）" };
}

// ── 藥物主體 ──────────────────────────────────────────────────────────────
export const fluconazole: Drug = {
  name: "Fluconazole",
  subtitle: "Diflucan",
  searchTerms: [
    "fluconazole", "diflucan", "泰復肯",
    "fluene", "膚黴克", "fluconazole 針", "fluconazole 膠囊",
    "candida", "cryptococcus", "念珠菌", "隱球菌", "azole", "antifungal",
  ],

  // ★ needsRenal = true 時，needsWeight 也必須 true（計算 CrCl 所需）
  needsRenal:  true,
  needsWeight: true,
  needsHepatic: false,  // CTP A–C 均不需調整，不顯示肝功能欄位

  // UpToDate 肥胖建議：invasive candidiasis 使用實際體重（TBW）計算
  // 因此這裡統一用 TBW（不用 AdjBW_if_obese）
  weightStrategy: "TBW",

  // ──────────────────────────────────────────────────────────────────────
  // 適應症清單（情境資料）
  // 標籤格式：英文名（中文說明）
  // ──────────────────────────────────────────────────────────────────────
  indications: [

    // ── 1. Candidemia ──────────────────────────────────────────────────
    {
      id: "candidemia_initial",
      label: "Candidemia - Initial therapy（菌血症，初始治療）",
      desc: "適用於非中性球低下、非危重症、低 azole 抗藥風險患者",
      scenarios: [
        {
          label: "Candidemia - Initial therapy（菌血症，初始治療）",
          note: [
            "適用條件：(1) 非中性球低下患者且非危重症；",
            "(2) 中性球低下患者且非危重症且無先前 azole 暴露。",
            "療程：末次陰性血培養後 ≥14 天（有轉移性併發症者需更長）",
          ].join(""),
          preferred: "IV",
          hasLoading: true,
          wt_load_mg_per_kg: 12,   // → 常用固定量 800 mg
          std_load_mg:        800,
          wt_maint_mg_per_kg:  6,  // → 常用固定量 400 mg
          std_maint_mg:       400,
          freq: "QD",
          usualMaint_mg: 400,       // CRRT 對照基準
        },
      ],
    },

    {
      id: "candidemia_stepdown",
      label: "Candidemia Step-down（菌血症，降階治療）",
      desc: "病情穩定後由 echinocandin 降階至口服",
      scenarios: [
        {
          label: "Candidemia Step-down - Non-C.glabrata（菌血症降階，非 C. glabrata 菌種）",
          note: [
            "適用條件：病情穩定、重複血培養陰性、確認非 C. glabrata / C. krusei 菌種。",
            "建議在 echinocandin 治療 5–7 天後降階。",
          ].join(""),
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg: 6,
          std_maint_mg: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
        {
          label: "Candidemia Step-down - C. glabrata susceptible（菌血症降階，C. glabrata 敏感株）",
          note: [
            "限 fluconazole 敏感（MIC ≤8 mg/L）或 susceptible-dose-dependent（MIC 16–32 mg/L）菌株。",
            "C. krusei 不建議使用 fluconazole。",
          ].join(""),
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg: 12,
          std_maint_mg: 800,
          freq: "QD",
          usualMaint_mg: 800,
        },
      ],
    },

    // ── 2. Candidiasis - 食道 / 口咽 ──────────────────────────────────
    {
      id: "candida_esophageal",
      label: "Candidiasis - Esophageal（食道念珠菌症）",
      desc: "療程 14–21 天",
      scenarios: [
        {
          label: "Candidiasis - Esophageal（食道念珠菌症）",
          note: [
            "療程 14–21 天。Loading 400 mg day 1，之後維持 200–400 mg QD。",
            "若 C. albicans 且治療 1 週無效，部分專家升至 800 mg QD。",
          ].join(""),
          preferred: "PO",
          hasLoading: true,
          wt_load_mg_per_kg: 6,
          std_load_mg: 400,
          wt_maint_mg_per_kg_min: 3,
          wt_maint_mg_per_kg_max: 6,
          std_maint_mg_min: 200,
          std_maint_mg_max: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
      ],
    },

    {
      id: "candida_oropharyngeal",
      label: "Candidiasis - Oropharyngeal（口咽念珠菌症）",
      desc: "中重度或外用無效，療程 7–14 天",
      scenarios: [
        {
          label: "Candidiasis - Oropharyngeal（口咽念珠菌症）",
          note: [
            "保留給中重度、外用治療無效、或免疫低下患者。",
            "療程 7–14 天；不建議超過 14 天（抗藥風險）。",
          ].join(""),
          preferred: "PO",
          hasLoading: true,
          fixedDose: true,
          std_load_mg: 200,
          std_maint_mg_min: 100,
          std_maint_mg_max: 200,
          freq: "QD",
          usualMaint_mg: 200,
        },
      ],
    },

    // ── 3. Candidiasis - UTI ───────────────────────────────────────────
    {
      id: "candida_uti",
      label: "Candidiasis - UTI（泌尿道念珠菌感染）",
      desc: "症狀性膀胱炎或腎盂腎炎，療程 2 週",
      scenarios: [
        {
          label: "Cystitis（症狀性膀胱炎）",
          note: [
            "療程 2 週。",
            "無症狀 candiduria 除非是中性球低下患者或泌尿科術前，一般不建議治療。",
          ].join(""),
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg: 3,
          std_maint_mg: 200,
          freq: "QD",
          usualMaint_mg: 200,
        },
        {
          label: "Pyelonephritis（腎盂腎炎）",
          note: "療程 2 週。",
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg_min: 3,
          wt_maint_mg_per_kg_max: 6,
          std_maint_mg_min: 200,
          std_maint_mg_max: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
      ],
    },

    // ── 4. Candidiasis - CNS / Cardiac step-down ──────────────────────
    {
      id: "candida_cns_cardiac",
      label: "Candidiasis - CNS / Cardiac Step-down（中樞 / 心臟念珠菌降階）",
      desc: "中樞神經或心內膜炎病情穩定後降階至口服維持",
      scenarios: [
        {
          label: "CNS Candidiasis Step-down（中樞神經念珠菌症，降階）",
          note: "持續至 CSF 與影像學完全改善（通常需數月）。",
          preferred: "IV",
          hasLoading: false,
          wt_maint_mg_per_kg_min: 6,
          wt_maint_mg_per_kg_max: 12,
          std_maint_mg_min: 400,
          std_maint_mg_max: 800,
          freq: "QD",
          usualMaint_mg: 800,
        },
        {
          label: "Candida endocarditis / Device infection Step-down（心內膜炎 / 裝置感染，降階）",
          note: [
            "裝置感染（無心內膜炎）：移除後 ≥4 週（Generator pocket），導線感染 ≥6 週。",
            "心內膜炎：術後 ≥6 週（人工瓣膜或無法置換者建議長期維持）。",
          ].join(""),
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg_min: 6,
          wt_maint_mg_per_kg_max: 12,
          std_maint_mg_min: 400,
          std_maint_mg_max: 800,
          freq: "QD",
          usualMaint_mg: 800,
        },
      ],
    },

    // ── 5. Cryptococcal meningitis ────────────────────────────────────
    {
      id: "crypto_consolidation",
      label: "Cryptococcal meningitis - Consolidation（隱球菌腦膜炎，鞏固期）",
      desc: "接續 induction 後，療程 ≥8 週",
      scenarios: [
        {
          label: "Consolidation - Patients with HIV（HIV 病人，鞏固期）",
          note: [
            "療程 ≥8 週。",
            "若以 AmB + flucytosine 完成 induction、CSF 培養陰性、且已開始 ART，",
            "可考慮降至 400 mg QD。",
          ].join(""),
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 800,
          freq: "QD",
          usualMaint_mg: 800,
          noteReduced: "部分病人可降至 400 mg QD（見備注）",
        },
        {
          label: "Consolidation - Patients without HIV（非 HIV 病人，鞏固期）",
          note: "療程 8 週。",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 400,
          std_maint_mg_max: 800,
          freq: "QD",
          usualMaint_mg: 800,
        },
      ],
    },

    {
      id: "crypto_maintenance",
      label: "Cryptococcal meningitis - Maintenance（隱球菌腦膜炎，維持期）",
      desc: "長期口服維持（HIV ≥12 個月；非 HIV 6–12 個月）",
      scenarios: [
        {
          label: "Maintenance - Patients with HIV（HIV 病人，維持期）",
          note: [
            "療程 ≥12 個月。",
            "可停藥條件：抗黴菌治療 ≥12 個月、無症狀、",
            "CD4 ≥100 cells/mm³ 且 HIV RNA 受抑制（若無法測 viral load，",
            "部分專家建議等到 CD4 ≥200）。",
          ].join(""),
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 200,
          freq: "QD",
          usualMaint_mg: 200,
        },
        {
          label: "Maintenance - Patients without HIV（非 HIV 病人，維持期）",
          note: [
            "療程 6–12 個月；高劑量免疫抑制（如大劑量類固醇、alemtuzumab）",
            "或有 cryptococcoma 者療程延長。",
          ].join(""),
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 200,
          std_maint_mg_max: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
      ],
    },

    // ── 6. Coccidioidomycosis ──────────────────────────────────────────
    {
      id: "coccidioidomycosis",
      label: "Coccidioidomycosis - Meningitis（球黴菌腦膜炎）",
      desc: "需終生治療，復發率高",
      scenarios: [
        {
          label: "Coccidioidomycosis - Meningitis（球黴菌腦膜炎）",
          note: [
            "需終生治療（高復發率）。",
            "起始 800–1200 mg QD，依嚴重度決定。",
            "無法取得 fluconazole 足量時，部分中心改用 itraconazole。",
          ].join(""),
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 800,
          std_maint_mg_max: 1200,
          freq: "QD",
          usualMaint_mg: 1200,
        },
      ],
    },

    // ── 7. ICU Prophylaxis ────────────────────────────────────────────
    {
      id: "icu_prophylaxis",
      label: "Prophylaxis - ICU（加護病房預防性投藥）",
      desc: "Off-label，限院內侵襲性念珠菌感染率 >5% 之高風險 ICU",
      scenarios: [
        {
          label: "ICU Prophylaxis（加護病房預防性投藥）",
          note: [
            "Off-label 使用。",
            "適用條件：所在 ICU 侵襲性念珠菌感染發生率 >5%，且患者屬高風險。",
            "廣泛預防性使用可能促進抗藥性，需謹慎評估適應症。",
          ].join(""),
          preferred: "IV",
          hasLoading: true,
          wt_load_mg_per_kg: 12,
          std_load_mg:        800,
          wt_maint_mg_per_kg:  6,
          std_maint_mg:       400,
          freq: "QD",
          usualMaint_mg: 400,
        },
      ],
    },

  ], // ← end of indications


  // ──────────────────────────────────────────────────────────────────────
  // calculate()
  //   接收：dosing_weight（kg）、crcl（mL/min）、rrt（"none"|"hd"|"cvvh"|"pd"）、
  //         hepatic（不顯示，fluconazole 不需調整）、indicationData（已選適應症）
  //   回傳：{ scenarioResults, infoBox }
  // ──────────────────────────────────────────────────────────────────────
  calculate({ dosing_weight, crcl, rrt, indicationData }: any) {

    // ── 腎功能調整倍率（維持量） ──────────────────────────────────────
    const maintFactor: number = (() => {
      if (rrt === "cvvh") return 1.0;   // CRRT 另外處理（劑量上調）
      if (rrt === "hd" || rrt === "pd") return 0.5;
      return crcl <= 50 ? 0.5 : 1.0;
    })();
    // Loading 永遠給足量（不依腎功能減量）
    const loadFactor = 1.0;

    // ── 腎功能說明文字 ────────────────────────────────────────────────
    const renalNote = (() => {
      if (rrt === "cvvh")
        return "CRRT（CVVH/D/HDF）：劑量需增加，因 tubular reabsorption 消失，clearance 增加 1.5–2×";
      if (rrt === "hd")
        return "HD：透析可移除 33–38% fluconazole；透析後補回，透析間隔日可不需額外補給";
      if (rrt === "pd")
        return "PD：腎功能調整同 CrCl ≤50，維持量減半";
      if (crcl <= 50)
        return `CrCl ${Math.round(crcl)} mL/min（≤50）→ 維持量減半；Loading 不減`;
      return `CrCl ${Math.round(crcl)} mL/min（>50）→ 不需調整`;
    })();

    // ── 計算個別 scenario ─────────────────────────────────────────────
    const scenarioResults = indicationData.scenarios.map((sc: any) => {

      // ── CRRT：特殊處理 ──────────────────────────────────────────────
      if (rrt === "cvvh") {
        const crrt = getCRRTDose(sc.usualMaint_mg ?? 400);

        // Loading：若 CRRT 建議有 loading，優先用 CRRT loading；
        //          否則若情境本來有 loading，用情境 loading 劑量
        const crrtLoad_mg = crrt.load_mg ??
          (sc.hasLoading
            ? (sc.wt_load_mg_per_kg
                ? Math.round(dosing_weight * sc.wt_load_mg_per_kg)
                : sc.std_load_mg ?? null)
            : null);

        const rows: any[] = [];
        if (crrtLoad_mg) {
          rows.push({
            label: "Loading dose（Day 1）",
            value: `${crrtLoad_mg} mg IV（${toHalfVials(crrtLoad_mg, IV_MG_PER_VIAL)}）`,
            highlight: true,
          });
        }
        rows.push(
          { label: "維持劑量",   value: `${crrt.maint_mg} mg IV`, highlight: true },
          { label: "給藥頻率",   value: crrt.freq,                highlight: true },
          { label: "每次取藥（維持）", value: `${toHalfVials(crrt.maint_mg, IV_MG_PER_VIAL)}泰復肯（每支 100 mg / 50 mL）` },
          { label: "稀釋方式",   value: "原液直接輸注，速率 ≤200 mg/hr（建議輸注 ≥30 分鐘）" },
          { label: "腎功能調整", value: renalNote },
        );

        return {
          title: sc.label,
          note: sc.note,
          preferred: "IV",
          subResults: [{
            route: "IV",
            isPreferred: true,
            rows,
            warnings: [
              "⚠️ CRRT 劑量增加原因：Fluconazole 在正常腎功能時有大量 tubular reabsorption。無尿患者此機制消失，CRRT clearance 為正常人的 1.5–2 倍，若維持一般劑量會導致藥物濃度不足",
            ],
          }],
        };
      }

      // ── HD：提供兩種給藥策略 ────────────────────────────────────────
      if (rrt === "hd") {
        // 計算 full 劑量（Loading 不減，維持量取標準值）
        const hdLoad_mg = sc.hasLoading
          ? (sc.wt_load_mg_per_kg
              ? Math.round(dosing_weight * sc.wt_load_mg_per_kg * loadFactor)
              : sc.std_load_mg ?? null)
          : null;

        const hdFullMaint_mg = sc.fixedDose
          ? (sc.std_maint_mg ?? sc.std_maint_mg_max ?? 400)
          : (sc.wt_maint_mg_per_kg
              ? Math.round(dosing_weight * sc.wt_maint_mg_per_kg)
              : sc.wt_maint_mg_per_kg_max
                ? Math.round(dosing_weight * sc.wt_maint_mg_per_kg_max)
                : sc.std_maint_mg ?? sc.std_maint_mg_max ?? 400);

        const hdHalfMaint_mg = Math.round(hdFullMaint_mg * 0.5);

        // 策略一：3x/week 透析後 full dose
        const rows3x: any[] = [];
        if (hdLoad_mg) {
          rows3x.push({
            label: "Loading dose（Day 1）",
            value: `${hdLoad_mg} mg IV（${toHalfVials(hdLoad_mg, IV_MG_PER_VIAL)}）`,
            highlight: true,
          });
        }
        rows3x.push(
          { label: "維持劑量（每次）", value: `${hdFullMaint_mg} mg`, highlight: true },
          { label: "給藥頻率",        value: "每週三次，透析後給藥", highlight: true },
          { label: "每次取藥（維持）",
            value: `${toHalfVials(hdFullMaint_mg, IV_MG_PER_VIAL)}泰復肯（每支 100 mg）或 ${Math.ceil(hdFullMaint_mg / PO_MG_PER_CAP)} 顆膚黴克膠囊（每顆 50 mg）` },
          { label: "說明", value: "透析可移除 33–38% fluconazole；透析後補足；透析間隔日不需額外補給" },
        );

        // 策略二：每日 QD 劑量減半（透析日透析後給）
        const rowsQD: any[] = [];
        if (hdLoad_mg) {
          rowsQD.push({
            label: "Loading dose（Day 1）",
            value: `${hdLoad_mg} mg IV（${toHalfVials(hdLoad_mg, IV_MG_PER_VIAL)}）`,
            highlight: true,
          });
        }
        rowsQD.push(
          { label: "維持劑量",   value: `${hdHalfMaint_mg} mg QD`, highlight: true },
          { label: "給藥頻率",   value: "QD（透析日：透析後給藥）", highlight: true },
          { label: "每次取藥（維持）",
            value: `${toHalfVials(hdHalfMaint_mg, IV_MG_PER_VIAL)}泰復肯（每支 100 mg）或 ${Math.ceil(hdHalfMaint_mg / PO_MG_PER_CAP)} 顆膚黴克膠囊（每顆 50 mg）` },
          { label: "說明", value: "每日給藥的替代方案，住院病人管理更方便" },
        );

        return {
          title: sc.label,
          note: sc.note,
          preferred: sc.preferred,
          subResults: [
            {
              customLabel: "✅ 標準 HD 方案（3x/week 透析後）",
              customLabelBg: "#D1FAE5",
              customLabelColor: "#065F46",
              rows: rows3x,
            },
            {
              customLabel: "🔄 替代方案（QD 減量，透析日透析後）",
              customLabelBg: "#EFF6FF",
              customLabelColor: "#1E40AF",
              rows: rowsQD,
            },
          ],
        };
      }

      // ── 一般 CKD / 無透析（含 PD）───────────────────────────────────

      // 計算 loading dose（同時提供固定劑量與 kg 計算兩種顯示）
      const loadInfo = formatLoadDose(sc, dosing_weight, loadFactor);
      const load_mg = loadInfo.load_mg;
      const load_display = loadInfo.display;

      // 計算維持劑量（同時提供固定劑量與 kg 計算兩種顯示）
      const maintInfo = formatMaintDose(sc, dosing_weight, maintFactor);
      const maint_mg = maintInfo.maint_mg;
      const maint_display = maintInfo.display;

      const warnings: string[] = [];
      if (maintFactor < 1.0) {
        warnings.push("⚠️ 腎功能調整：維持量已減半。Loading dose 不受影響，以足量給予");
      }
      if (sc.std_maint_mg_min !== undefined || sc.wt_maint_mg_per_kg_min !== undefined) {
        warnings.push("⚖️ 劑量範圍：實際劑量請依感染嚴重度、感受性（MIC）及臨床反應調整");
      }
      // UpToDate 原文「X mg（或 Y mg/kg）」時，提醒使用者兩者擇一
      const hasBothStdAndKg =
        (sc.std_maint_mg !== undefined || sc.std_maint_mg_min !== undefined) &&
        (sc.wt_maint_mg_per_kg !== undefined || sc.wt_maint_mg_per_kg_min !== undefined);
      if (hasBothStdAndKg) {
        warnings.push("💊 兩版本擇一給藥：可用「常用固定量」或「依體重計算」，請依臨床習慣與病人狀況選擇");
      }
      if (sc.noteReduced) {
        warnings.push(`💡 ${sc.noteReduced}`);
      }

      // ── 建立 subResults（IV + PO 均提供）────────────────────────────
      const subResults: any[] = [];

      // IV sub-result
      const ivRows: any[] = [];
      if (load_mg !== null && load_display) {
        ivRows.push({
          label: "Loading dose（Day 1）",
          value: `${load_display}\n→ ${toHalfVials(load_mg, IV_MG_PER_VIAL)}泰復肯 IV`,
          highlight: true,
        });
      }
      ivRows.push(
        { label: "維持劑量", value: `${maint_display}`, highlight: true },
        { label: "給藥頻率", value: sc.freq ?? "QD", highlight: true },
        { label: "每次取藥（維持）",
          value: `${toHalfVials(maint_mg, IV_MG_PER_VIAL)}泰復肯（每支 100 mg / 50 mL）` },
        { label: "稀釋方式",
          value: "原液直接輸注，速率 ≤200 mg/hr（輸注 ≥30 分鐘）" },
        { label: "腎功能調整", value: renalNote },
      );

      subResults.push({
        route: "IV",
        isPreferred: sc.preferred === "IV",
        rows: ivRows,
        warnings: [...warnings],
      });

      // PO sub-result
      const poRows: any[] = [];
      if (load_mg !== null && load_display) {
        poRows.push({
          label: "Loading dose（Day 1）",
          value: `${load_display}\n→ ${Math.ceil(load_mg / PO_MG_PER_CAP)} 顆膚黴克膠囊 PO`,
          highlight: true,
        });
      }
      poRows.push(
        { label: "維持劑量", value: `${maint_display}`, highlight: true },
        { label: "給藥頻率", value: sc.freq ?? "QD", highlight: true },
        { label: "每次取藥（維持）",
          value: `${Math.ceil(maint_mg / PO_MG_PER_CAP)} 顆膚黴克膠囊（每顆 50 mg）` },
        { label: "腎功能調整", value: renalNote },
      );

      subResults.push({
        route: "PO",
        isPreferred: sc.preferred === "PO",
        rows: poRows,
        warnings: [...warnings],
      });

      return {
        title: sc.label,
        note: sc.note,
        preferred: sc.preferred,
        subResults,
      };
    });

    // ── infoBox：底部臨床提醒（精簡版，詳細內容見 clinicalPearls）────────
    return {
      scenarioResults,
      infoBox: {
        text: "⚗️ 注意：Fluconazole 為 CYP2C9/3A4 強效抑制劑，與 warfarin、tacrolimus、cyclosporine、statins、phenytoin 等有顯著交互作用，處方前請核對並評估調整。詳細抗菌譜、肝功能、藥物交互作用請展開下方「臨床參考」。",
        bg:     "#FFF7ED",
        border: "#FED7AA",
        color:  "#92400E",
      },
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // 臨床參考（整理自 UpToDate / Lexicomp）
  // ═══════════════════════════════════════════════════════════════
  clinicalPearls: {
    title: "臨床參考",
    sections: [
      {
        heading: "抗菌譜與敏感性",
        body:
          "• C. albicans、C. parapsiloisis、C. tropicalis：通常敏感，first-line 可用\n" +
          "• C. glabrata：MIC 偏高（敏感性下降），若藥敏確認 susceptible 或 susceptible-dose-dependent 可用（劑量加倍）\n" +
          "• C. krusei：天然抗藥，不建議使用\n" +
          "• Cryptococcus：敏感，適用於 consolidation、maintenance 期\n" +
          "• 黴菌（mold，如 Aspergillus、Mucor）：無效，不可用於 mold-active prophylaxis\n\n" +
          "⚠️ 建議用藥前確認藥敏結果，特別是 C. glabrata 或臨床反應不佳時。",
      },
      {
        heading: "藥物交互作用（CYP450 強效抑制）",
        body:
          "Fluconazole 是 CYP2C9、CYP3A4、CYP2C19 的強效抑制劑，與許多藥物會有顯著交互作用：\n\n" +
          "• Warfarin：INR 顯著上升，需加強監測並可能需減量\n" +
          "• Tacrolimus、Cyclosporine：血中濃度上升，需監測濃度並調整劑量\n" +
          "• Statins（simvastatin、atorvastatin）：肌肉毒性風險增加\n" +
          "• Phenytoin：血中濃度上升，需監測\n" +
          "• Sulfonylureas（如 glipizide）：低血糖風險增加\n" +
          "• QT-prolonging agents：QT 延長風險增加，避免合併使用\n\n" +
          "開立 fluconazole 時務必進行藥物交互作用檢核。",
      },
      {
        heading: "肝功能（Child-Pugh A–C 皆不需調整）",
        body:
          "• 治療前已有肝硬化（Child-Pugh A–C）：不需劑量調整\n" +
          "• 使用期間肝功能惡化（慢性或急性）：不需常規調整\n" +
          "• Fluconazole-induced liver injury（罕見）：停藥後通常 ≈2 週內恢復，一般不需特別處置；再次使用可能復發",
      },
      {
        heading: "腎功能調整原則（Lexicomp 2026）",
        body:
          "• CrCl > 50：不需調整\n" +
          "• CrCl ≤ 50：維持量減半（Loading 不減）\n" +
          "• HD（每週 3 次）：\n" +
          "  - 標準方案：3x/week 透析後 full dose（透析間隔日不需額外補給）\n" +
          "  - 替代方案：QD 減半，透析日透析後給（住院病人管理更方便）\n" +
          "• PD：維持量減半（同 CrCl ≤50）\n" +
          "• CRRT (CVVH/D/HDF)：劑量需增加\n" +
          "  - 常規 200 mg → CRRT 400 mg QD\n" +
          "  - 常規 400 mg → Loading 800 mg → 維持 800 mg/day\n" +
          "  - 常規 800 mg → Loading 1200 mg → 維持 1200 mg/day\n" +
          "  原因：Fluconazole 在正常腎功能有大量 tubular reabsorption，無尿病人此機制消失，CRRT clearance 為正常人 1.5–2.3×",
      },
      {
        heading: "肥胖病人劑量",
        body:
          "UpToDate 建議：Class 1、2、3 肥胖（BMI ≥30）使用**實際體重（TBW）**計算：\n" +
          "• Loading：12 mg/kg（上限 1,600 mg）\n" +
          "• Maintenance：6 mg/kg（上限依臨床情境 800–1,600 mg）\n" +
          "• Monte Carlo 模擬顯示無論 BMI 或體重，此策略都能達到 fAUC/MIC target\n" +
          "• 非危重症病人可省略 loading dose\n\n" +
          "⚠️ 此工具預設 Fluconazole 使用 TBW 計算（不同於其他藥物多預設 AdjBW_if_obese）。",
      },
      {
        heading: "院內品項",
        body:
          "• IV：泰復肯靜脈注射劑（Diflucan 針）100 mg / 50 mL / 支（2 mg/mL 溶液）\n" +
          "• PO：膚黴克膠囊（Fluene）50 mg / 顆\n\n" +
          "IV 輸注速率：≤200 mg/hr（建議 ≥30 分鐘）；原液直接輸注，不需另外稀釋。",
      },
    ],
  },
};