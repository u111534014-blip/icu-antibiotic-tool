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
// ── 劑量上限常數（依 UpToDate）──────────────────────────────────────────
const LOAD_MAX_MG = 1600;         // Loading dose 硬上限（明確上限）
const MAINT_WARN_MG_PER_DAY = 1600; // Maintenance 超過此值會加警告（非硬上限）

// 回傳格式：
//   - 只有固定：「400 mg（常用固定量）」
//   - 只有 kg：「420 mg（6 mg/kg × 70 kg）」
//   - 兩者都有：「400 mg（常用固定量）\n或 420 mg（6 mg/kg × 70 kg）」
//   - 範圍版本會顯示 lo–hi 格式
function formatMaintDose(
  sc: any,
  dosing_weight: number,
  factor: number,
): { maint_mg: number; display: string; overMaxWarning: boolean } {
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
  let kgMax: number = 0;   // 追蹤 kg 計算的最高值，用於判斷是否超過 warning 門檻
  if (sc.wt_maint_mg_per_kg_min !== undefined && sc.wt_maint_mg_per_kg_max !== undefined) {
    const lo = Math.round(dosing_weight * sc.wt_maint_mg_per_kg_min * factor);
    const hi = Math.round(dosing_weight * sc.wt_maint_mg_per_kg_max * factor);
    kgStr = lo === hi
      ? `${lo} mg（${sc.wt_maint_mg_per_kg_min} mg/kg × ${dosing_weight} kg）`
      : `${lo}–${hi} mg（${sc.wt_maint_mg_per_kg_min}–${sc.wt_maint_mg_per_kg_max} mg/kg × ${dosing_weight} kg）`;
    kgMid = Math.round((lo + hi) / 2);
    kgMax = hi;
  } else if (sc.wt_maint_mg_per_kg !== undefined) {
    const v = Math.round(dosing_weight * sc.wt_maint_mg_per_kg * factor);
    kgStr = `${v} mg（${sc.wt_maint_mg_per_kg} mg/kg × ${dosing_weight} kg）`;
    kgMid = v;
    kgMax = v;
  }

  // 檢查是否超過每日警告門檻（QD 情況下 single dose = daily dose）
  const overMaxWarning = kgMax > MAINT_WARN_MG_PER_DAY;

  // 兩者都有：並列
  if (stdStr && kgStr) {
    return {
      maint_mg: stdMid!,   // 用固定劑量當支數計算基準（UpToDate 原文「400 mg（或 6 mg/kg）」）
      display: `${stdStr}\n或 ${kgStr}`,
      overMaxWarning,
    };
  }
  // 只有其中一個
  return {
    maint_mg: (stdMid ?? kgMid ?? 0),
    display: stdStr ?? kgStr ?? "—",
    overMaxWarning,
  };
}

// ── Helper：Loading dose（硬上限 1,600 mg）──────────────────────────────
function formatLoadDose(
  sc: any,
  dosing_weight: number,
  factor: number,
): { load_mg: number | null; display: string | null; capped: boolean } {
  if (!sc.hasLoading) return { load_mg: null, display: null, capped: false };

  let stdStr: string | null = null;
  let stdVal: number | null = null;
  if (sc.std_load_mg !== undefined) {
    const v = Math.round(sc.std_load_mg * factor);
    stdStr = `${v} mg（常用固定量）`;
    stdVal = v;
  }

  let kgStr: string | null = null;
  let kgVal: number | null = null;
  let kgWasCapped = false;
  if (sc.wt_load_mg_per_kg !== undefined) {
    const rawKgDose = Math.round(dosing_weight * sc.wt_load_mg_per_kg * factor);
    if (rawKgDose > LOAD_MAX_MG) {
      // 超過上限，截斷到 1,600 mg 並在字串上註記
      kgVal = LOAD_MAX_MG;
      kgStr = `${LOAD_MAX_MG} mg ⚠️（${sc.wt_load_mg_per_kg} mg/kg × ${dosing_weight} kg = ${rawKgDose} mg，已截至上限 ${LOAD_MAX_MG} mg）`;
      kgWasCapped = true;
    } else {
      kgVal = rawKgDose;
      kgStr = `${rawKgDose} mg（${sc.wt_load_mg_per_kg} mg/kg × ${dosing_weight} kg）`;
    }
  }

  if (stdStr && kgStr) {
    return { load_mg: stdVal!, display: `${stdStr}\n或 ${kgStr}`, capped: kgWasCapped };
  }
  return {
    load_mg: stdVal ?? kgVal,
    display: stdStr ?? kgStr,
    capped: kgWasCapped,
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
  name: "Diflucan",
  subtitle: "Fluconazole",
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

    // ═══════════════════════════════════════════════════════════════
    // 1. Blastomycosis（芽生菌症）
    // ═══════════════════════════════════════════════════════════════
    {
      id: "blastomycosis",
      label: "Blastomycosis（芽生菌症）",
      desc: "替代療法，保留給無法耐受 itraconazole 者",
      scenarios: [
        {
          label: "CNS disease Step-down（中樞神經芽生菌症，降階治療）",
          note: "療程 ≥12 個月並且 CSF 異常完全恢復才停藥",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 800,
          freq: "QD",
          usualMaint_mg: 800,
        },
        {
          label: "Pulmonary disease（肺部芽生菌症）",
          note: "療程 6–12 個月；保留給無法耐受 itraconazole 者",
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

    // ═══════════════════════════════════════════════════════════════
    // 2. Candidemia（念珠菌血症）
    // ═══════════════════════════════════════════════════════════════
    {
      id: "candidemia",
      label: "Candidiasis - Candidemia（念珠菌血症）",
      desc: "Initial therapy 與 Step-down",
      scenarios: [
        {
          label: "Initial therapy（初始治療）",
          note: "適用條件：(1) 非中性球低下病人且非危重症；(2) 中性球低下病人且非危重症且無先前 azole 暴露。療程：末次陰性血培養後 ≥14 天（有轉移性併發症者需更長）；穩定病人在 echinocandin 5-7 天後降階",
          preferred: "IV",
          hasLoading: true,
          wt_load_mg_per_kg: 12,
          std_load_mg: 800,
          wt_maint_mg_per_kg: 6,
          std_maint_mg: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
        {
          label: "Step-down, non-C.glabrata（降階，非 C. glabrata 菌種）",
          note: "病情穩定、重複血培養陰性、確認非 C. glabrata / C. krusei 菌種。建議在 echinocandin 5-7 天後降階",
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg: 6,
          std_maint_mg: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
        {
          label: "Step-down, C. glabrata susceptible（降階，C. glabrata 敏感株）",
          note: "限 fluconazole 敏感（MIC ≤8 mg/L）或 susceptible-dose-dependent（MIC 16–32 mg/L）菌株；C. krusei 不建議使用 fluconazole",
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg: 12,
          std_maint_mg: 800,
          freq: "QD",
          usualMaint_mg: 800,
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 3. Candidiasis - Deep / invasive（深部/侵襲性）
    // ═══════════════════════════════════════════════════════════════
    {
      id: "candida_deep",
      label: "Candidiasis - Deep / Invasive（深部/侵襲性念珠菌感染）",
      desc: "心內膜炎、CNS、眼、肝脾、IAI、骨關節、PD、血栓性靜脈炎",
      scenarios: [
        {
          label: "Cardiac endocarditis / Device infection Step-down（心內膜炎 / 裝置感染，降階）",
          note: "裝置感染（無心內膜炎）：移除後 ≥4 週（generator pocket），導線感染 ≥6 週。心內膜炎：術後 ≥6 週；人工瓣膜或無法置換者建議長期維持",
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg_min: 6,
          wt_maint_mg_per_kg_max: 12,
          std_maint_mg_min: 400,
          std_maint_mg_max: 800,
          freq: "QD",
          usualMaint_mg: 800,
        },
        {
          label: "CNS Candidiasis Step-down（中樞神經念珠菌症，降階）",
          note: "持續至 CSF 與影像學完全改善（通常需數月）",
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
          label: "Endophthalmitis, endogenous（內源性眼內炎）",
          note: "療程 ≥4–6 週並至檢查確認恢復；有 vitritis 或 macular involvement 建議加 intravitreal antifungal",
          preferred: "IV",
          hasLoading: true,
          wt_load_mg_per_kg: 12,
          std_load_mg: 800,
          wt_maint_mg_per_kg_min: 6,
          wt_maint_mg_per_kg_max: 12,
          std_maint_mg_min: 400,
          std_maint_mg_max: 800,
          freq: "QD",
          usualMaint_mg: 800,
        },
        {
          label: "Hepatosplenic, chronic disseminated Step-down（慢性散播性肝脾型，降階）",
          note: "療程持續至病灶恢復（通常數月）並延長至免疫抑制期",
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg: 6,
          std_maint_mg: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
        {
          label: "Intra-abdominal infection（腹腔內感染，含腹膜炎 / 膿瘍）",
          note: "替代療法：經驗性用藥或 echinocandin 降階。總療程 ≥14 天，依源頭控制與臨床反應",
          preferred: "IV",
          hasLoading: true,
          wt_load_mg_per_kg: 12,
          std_load_mg: 800,
          wt_maint_mg_per_kg: 6,
          std_maint_mg: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
        {
          label: "Osteoarticular - Osteomyelitis（骨髓炎）",
          note: "療程 6–12 個月，可含初期 2 週 AmB 或 echinocandin。無法移除人工關節者建議長期抑制治療",
          preferred: "IV",
          hasLoading: false,
          wt_maint_mg_per_kg: 6,
          std_maint_mg: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
        {
          label: "Osteoarticular - Septic arthritis（化膿性關節炎）",
          note: "療程 6 週，可含初期 2 週 AmB 或 echinocandin",
          preferred: "IV",
          hasLoading: false,
          wt_maint_mg_per_kg: 6,
          std_maint_mg: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
        {
          label: "Peritonitis, PD-associated treatment（PD 相關腹膜炎治療）",
          note: "療程：拔管後 2–4 週。口服優先",
          preferred: "PO",
          hasLoading: true,
          fixedDose: true,
          std_load_mg: 200,
          std_maint_mg_min: 100,
          std_maint_mg_max: 200,
          freq: "QD",
          usualMaint_mg: 200,
        },
        {
          label: "Thrombophlebitis, suppurative（化膿性血栓性靜脈炎）",
          note: "療程：candidemia（若有）清除後 ≥2 週",
          preferred: "IV",
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

    // ═══════════════════════════════════════════════════════════════
    // 4. Candidiasis - Mucosal（黏膜念珠菌感染）
    // ═══════════════════════════════════════════════════════════════
    {
      id: "candida_mucosal",
      label: "Candidiasis - Mucosal（食道 / 口咽念珠菌症）",
      desc: "治療與長期抑制",
      scenarios: [
        {
          label: "Esophageal treatment（食道念珠菌症，治療）",
          note: "療程 14–21 天。C. albicans 治療 1 週無效時部分專家升至 800 mg QD",
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
        {
          label: "Esophageal chronic suppression（食道念珠菌症，長期抑制）",
          note: "保留給免疫低下（如 HIV + CD4 低）有多次復發感染病人。部分專家建議 100-200 mg 每週 3 次（但有抗藥性疑慮）。免疫重建後可停藥",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 100,
          std_maint_mg_max: 200,
          freq: "QD",
          usualMaint_mg: 200,
        },
        {
          label: "Oropharyngeal treatment（口咽念珠菌症，治療）",
          note: "保留給中重度、外用治療無效、或免疫低下。療程 7–14 天；不建議超過 14 天（抗藥風險）。治療 1 週無效部分專家升至 400 mg QD",
          preferred: "PO",
          hasLoading: true,
          fixedDose: true,
          std_load_mg: 200,
          std_maint_mg_min: 100,
          std_maint_mg_max: 200,
          freq: "QD",
          usualMaint_mg: 200,
        },
        {
          label: "Oropharyngeal chronic suppression（口咽念珠菌症，長期抑制）",
          note: "保留給免疫低下有多次復發。部分專家建議 100 mg 每週 3 次（抗藥性疑慮）。免疫重建後可停藥",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 100,
          freq: "QD",
          usualMaint_mg: 100,
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 5. Candidiasis - UTI（泌尿道念珠菌感染）
    // ═══════════════════════════════════════════════════════════════
    {
      id: "candida_uti",
      label: "Candidiasis - UTI（泌尿道念珠菌感染）",
      desc: "無症狀 candiduria、膀胱炎、腎盂腎炎、fungus balls",
      scenarios: [
        {
          label: "Asymptomatic candiduria, neutropenia（無症狀菌尿，中性球低下）",
          note: "中性球低下病人的無症狀 candiduria 視同 candidemia 處理（按 Candidemia initial 劑量）",
          preferred: "IV",
          hasLoading: true,
          wt_load_mg_per_kg: 12,
          std_load_mg: 800,
          wt_maint_mg_per_kg: 6,
          std_maint_mg: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
        {
          label: "Asymptomatic candiduria, urologic procedure（無症狀菌尿，泌尿科術前/術後）",
          note: "術前術後數日給予。一般無症狀 candiduria（非中性球低下、無泌尿科手術）不建議治療",
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg: 6,
          std_maint_mg: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
        {
          label: "Cystitis, symptomatic（症狀性膀胱炎）",
          note: "療程 2 週",
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg: 3,
          std_maint_mg: 200,
          freq: "QD",
          usualMaint_mg: 200,
        },
        {
          label: "Pyelonephritis（腎盂腎炎）",
          note: "療程 2 週",
          preferred: "PO",
          hasLoading: false,
          wt_maint_mg_per_kg_min: 3,
          wt_maint_mg_per_kg_max: 6,
          std_maint_mg_min: 200,
          std_maint_mg_max: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
        {
          label: "UTI with fungus balls（泌尿道真菌球）",
          note: "合併 amphotericin B deoxycholate 經 nephrostomy tubes 灌注（若有）+ 外科處理",
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

    // ═══════════════════════════════════════════════════════════════
    // 6. Candidiasis - Vulvovaginal（外陰陰道念珠菌感染）
    // ═══════════════════════════════════════════════════════════════
    {
      id: "candida_vulvovaginal",
      label: "Candidiasis - Vulvovaginal（外陰陰道念珠菌感染）",
      desc: "單劑、重度、復發；不建議用於 C. glabrata 或 C. krusei",
      scenarios: [
        {
          label: "Mild/moderate, immunocompetent（輕中度，免疫正常）",
          note: "單劑 150 mg。症狀持續者部分專家建議 72 小時後再給一劑 150 mg",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 150,
          freq: "單劑",
          usualMaint_mg: 150,
        },
        {
          label: "Severe or immunocompromised（重度或免疫低下）",
          note: "150 mg Q72H × 2-3 劑",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 150,
          freq: "Q72H × 2-3 劑",
          usualMaint_mg: 150,
        },
        {
          label: "Recurrent, monotherapy（復發，單方療法）",
          note: "100、150 或 200 mg Q72H × 3 劑，之後每週一次維持 6 個月（部分專家全用 150 mg；有建議 induction 用 150 mg Q72H × 10-14 天）",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 100,
          std_maint_mg_max: 200,
          freq: "依情境（參考 note）",
          usualMaint_mg: 150,
        },
        {
          label: "Combination with oteseconazole（合併 oteseconazole）",
          note: "Days 1, 4, 7：fluconazole 150 mg 單劑；Days 14-20：oteseconazole 150 mg QD；Day 28 起：oteseconazole 150 mg 每週一次 × 11 週",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 150,
          freq: "Day 1, 4, 7 單劑",
          usualMaint_mg: 150,
        },
        {
          label: "Intertrigo, refractory to topical（皮膚摺疊處感染，外用無效）",
          note: "150 mg 每週一次 × 4 週",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 150,
          freq: "Q1W × 4 週",
          usualMaint_mg: 150,
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 7. Candidiasis - Prophylaxis（念珠菌預防）
    // ═══════════════════════════════════════════════════════════════
    {
      id: "candida_prophylaxis",
      label: "Candidiasis - Prophylaxis（念珠菌預防）",
      desc: "ICU、血液腫瘤/HCT、PD 二級預防、器官移植",
      scenarios: [
        {
          label: "ICU high-risk（ICU 高風險病人預防）",
          note: "用於 ICU 侵襲性念珠菌感染發生率 >5% 且病人為高風險。廣泛預防性使用可能促進抗藥性，需謹慎評估",
          preferred: "IV",
          hasLoading: true,
          wt_load_mg_per_kg: 12,
          std_load_mg: 800,
          wt_maint_mg_per_kg: 6,
          std_maint_mg: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
        {
          label: "Hematologic malignancy / HCT（血液腫瘤 / 造血幹細胞移植，不需 mold-active）",
          note: "療程至少至中性球低下緩解；allogeneic HCT 至 day 75",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
        {
          label: "PD peritonitis, secondary prevention（PD 腹膜炎二級預防）",
          note: "PD 病人需用抗生素時預防真菌性腹膜炎。200 mg QOD 或 100 mg QD；抗生素療程期間 + aminoglycoside 停藥後 3 天或 vancomycin 停藥後 7 天",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 200,
          freq: "QOD 或 100 mg QD",
          usualMaint_mg: 200,
        },
        {
          label: "Solid organ transplant, high-risk（實體器官移植高風險）",
          note: "周術期給予並術後持續，適應症與療程依各移植中心而定",
          preferred: "IV",
          hasLoading: false,
          wt_maint_mg_per_kg: 6,
          std_maint_mg: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 8. Coccidioidomycosis - Treatment（球黴菌症，治療）
    // ═══════════════════════════════════════════════════════════════
    {
      id: "coccidio_tx",
      label: "Coccidioidomycosis - Treatment（球黴菌症，治療）",
      desc: "骨/關節、腦膜炎、肺炎、軟組織",
      scenarios: [
        {
          label: "Bone / joint infection（骨關節感染）",
          note: "療程 ≥3 年；部分病人需終生治療",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 800,
          freq: "QD",
          usualMaint_mg: 800,
        },
        {
          label: "Meningitis（球黴菌腦膜炎）",
          note: "需終生治療（高復發率）。起始劑量依嚴重度",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 800,
          std_maint_mg_max: 1200,
          freq: "QD",
          usualMaint_mg: 1200,
        },
        {
          label: "Pneumonia, primary infection（肺炎，初次感染）",
          note: "保留給重症或有重症風險（廣泛肺部受侵、免疫低下）。部分專家建議 800 mg QD。重症起始合併 AmB。療程 3-6 個月，依共病、嚴重度、反應調整",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 400,
          std_maint_mg_max: 800,
          freq: "QD",
          usualMaint_mg: 400,
        },
        {
          label: "Pneumonia, chronic cavitary（肺炎，慢性空洞/免疫低下）",
          note: "療程 ≥12 個月。空洞破裂者療程可短，依術後狀況而定",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
        {
          label: "Soft tissue infection（軟組織感染，非骨病灶）",
          note: "部分專家用到 800 mg QD。療程 ≥6-12 個月",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 400,
          std_maint_mg_max: 800,
          freq: "QD",
          usualMaint_mg: 400,
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 9. Coccidioidomycosis - Prophylaxis（球黴菌症，預防）
    // ═══════════════════════════════════════════════════════════════
    {
      id: "coccidio_prophy",
      label: "Coccidioidomycosis - Prophylaxis（球黴菌症，預防）",
      desc: "HIV 新 serology、SOT seronegative / seropositive",
      scenarios: [
        {
          label: "HIV, new positive serology + CD4 <250（HIV，新陽性血清）",
          note: "僅新陽性血清者且 CD4 <250 才建議；ART 完全抑制 HIV + CD4 ≥250 後停藥",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
        {
          label: "SOT seronegative in endemic areas（移植，血清陰性）",
          note: "療程 6-12 個月",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 200,
          freq: "QD",
          usualMaint_mg: 200,
        },
        {
          label: "SOT seropositive in endemic areas（移植，血清陽性）",
          note: "療程 6-12 個月；部分專家用 400 mg QD × 12 個月，之後 200 mg QD 直至免疫抑制治療結束",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 400,
          freq: "QD",
          usualMaint_mg: 400,
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 10. Cryptococcosis - Asymptomatic antigenemia (HIV)
    // ═══════════════════════════════════════════════════════════════
    {
      id: "crypto_antigenemia",
      label: "Cryptococcosis - Asymptomatic antigenemia HIV（隱球菌，無症狀抗原血症）",
      desc: "血清 cryptococcal antigen titer <1:640；三階段療程",
      scenarios: [
        {
          label: "Phase 1（前 2 週）",
          note: "血清抗原 titer 超過 1:640 時視同腦膜炎治療。配合有效 ART",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 800,
          std_maint_mg_max: 1200,
          freq: "QD × 2 週",
          usualMaint_mg: 1200,
        },
        {
          label: "Phase 2（第 3-12 週）",
          note: "前 2 週後接續 10 週",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 400,
          std_maint_mg_max: 800,
          freq: "QD × 10 週",
          usualMaint_mg: 800,
        },
        {
          label: "Phase 3（第 13-24 週）",
          note: "接續至總療程 6 個月，配合有效 ART",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 200,
          freq: "QD",
          usualMaint_mg: 200,
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 11. Cryptococcal meningitis - HIV (induction)
    // ═══════════════════════════════════════════════════════════════
    {
      id: "crypto_mening_hiv_induction",
      label: "Cryptococcal meningitis HIV - Induction（隱球菌腦膜炎 HIV，誘導期）",
      desc: "Resource-rich 與 resource-limited 各 regimens",
      scenarios: [
        {
          label: "Resource-rich: 無 flucytosine 時（合併 liposomal AmB）",
          note: "臨床未改善或 CSF 培養仍陽性需延長療程",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 800,
          std_maint_mg_max: 1200,
          freq: "QD × ≥2 週",
          usualMaint_mg: 1200,
        },
        {
          label: "Resource-rich: 無 AmB 時（合併 flucytosine）",
          note: "臨床未改善或 CSF 培養仍陽性需延長療程",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 1200,
          freq: "QD × ≥2 週",
          usualMaint_mg: 1200,
        },
        {
          label: "Resource-rich: Monotherapy（無 flucytosine + 無 AmB）",
          note: "Monotherapy 療效較低，不建議首選",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 1200,
          freq: "QD × ≥2 週",
          usualMaint_mg: 1200,
        },
        {
          label: "Resource-limited: Preferred（首選方案）",
          note: "合併 flucytosine + 單劑 liposomal AmB",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 1200,
          freq: "QD × 2 週",
          usualMaint_mg: 1200,
        },
        {
          label: "Resource-limited: 無 liposomal AmB 時",
          note: "起始 1 週 AmB deoxycholate + flucytosine 後，接續 fluconazole 1 週",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 1200,
          freq: "QD × 1 週（接在 AmB 後）",
          usualMaint_mg: 1200,
        },
        {
          label: "Resource-limited: 無 AmB 時",
          note: "合併 flucytosine × 2 週",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 1200,
          freq: "QD × 2 週",
          usualMaint_mg: 1200,
        },
        {
          label: "Resource-limited: 無 flucytosine 時",
          note: "合併 liposomal AmB 或 AmB deoxycholate × 2 週",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 1200,
          freq: "QD × 2 週",
          usualMaint_mg: 1200,
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 12. Cryptococcal meningitis - HIV (consolidation / maintenance)
    // ═══════════════════════════════════════════════════════════════
    {
      id: "crypto_mening_hiv_cons_maint",
      label: "Cryptococcal meningitis HIV - Consolidation / Maintenance",
      desc: "誘導期後的鞏固期與長期維持",
      scenarios: [
        {
          label: "Consolidation（鞏固期）",
          note: "療程 ≥8 週。若 AmB + flucytosine 完成 induction、CSF 培養陰性、且已開始 ART，可考慮降至 400 mg QD",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 800,
          freq: "QD × ≥8 週",
          usualMaint_mg: 800,
          noteReduced: "部分病人可降至 400 mg QD",
        },
        {
          label: "Maintenance / chronic suppression（維持期）",
          note: "療程 ≥12 個月。可停藥條件：抗黴菌 ≥12 個月 + 無症狀 + CD4 ≥100 且 HIV RNA 受抑制（無 viral load 測試時等 CD4 ≥200）",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 200,
          freq: "QD × ≥12 個月",
          usualMaint_mg: 200,
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 13. Cryptococcal meningitis - Non-HIV
    // ═══════════════════════════════════════════════════════════════
    {
      id: "crypto_mening_nonhiv",
      label: "Cryptococcal meningitis - Non-HIV（隱球菌腦膜炎，非 HIV）",
      desc: "Induction / Consolidation / Maintenance 全套",
      scenarios: [
        {
          label: "Induction: 無 flucytosine（合併 AmB × 2 週）",
          note: "替代方案",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 800,
          std_maint_mg_max: 1200,
          freq: "QD × 2 週",
          usualMaint_mg: 1200,
        },
        {
          label: "Induction: 無 AmB（合併 flucytosine）",
          note: "療程 2-10 週，依嚴重度與反應",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 800,
          std_maint_mg_max: 1200,
          freq: "QD × 2-10 週",
          usualMaint_mg: 1200,
        },
        {
          label: "Induction: Monotherapy（無 AmB + 無 flucytosine）",
          note: "Fluconazole monotherapy 一般不建議作為 induction",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 1200,
          freq: "QD × ≥10 週",
          usualMaint_mg: 1200,
        },
        {
          label: "Consolidation（鞏固期）",
          note: "療程 8 週",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 400,
          std_maint_mg_max: 800,
          freq: "QD × 8 週",
          usualMaint_mg: 800,
        },
        {
          label: "Maintenance / chronic suppression（維持期）",
          note: "療程 6-12 個月。高劑量免疫抑制或 cryptococcoma 者療程延長",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 200,
          std_maint_mg_max: 400,
          freq: "QD × 6-12 個月",
          usualMaint_mg: 400,
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 14. Cryptococcosis - Pulmonary（隱球菌肺部感染）
    // ═══════════════════════════════════════════════════════════════
    {
      id: "crypto_pulmonary",
      label: "Cryptococcosis - Pulmonary（隱球菌肺部感染）",
      desc: "Mild/moderate 與 Severe consolidation/maintenance",
      scenarios: [
        {
          label: "Mild to moderate（輕度至中度）",
          note: "無 diffuse infiltrate / disseminated。療程 6-12 個月。持續免疫抑制者可考慮長期抑制治療",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 400,
          freq: "QD × 6-12 個月",
          usualMaint_mg: 400,
        },
        {
          label: "Severe - Consolidation（重度，鞏固期）",
          note: "在 AmB lipid + flucytosine induction 完成後。Cryptococcoma 者部分專家用 800 mg QD",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 400,
          std_maint_mg_max: 800,
          freq: "QD × 8 週",
          usualMaint_mg: 800,
        },
        {
          label: "Severe - Maintenance（重度，維持期）",
          note: "接續 consolidation 至總療程約 12 個月",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 200,
          freq: "QD × 至 12 個月",
          usualMaint_mg: 200,
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 15. Onychomycosis（甲癬）
    // ═══════════════════════════════════════════════════════════════
    {
      id: "onychomycosis",
      label: "Onychomycosis（甲癬）",
      desc: "每週一次；指甲 3 個月，腳趾甲 6-12 個月",
      scenarios: [
        {
          label: "Onychomycosis（甲癬）",
          note: "療程：指甲 3 個月；腳趾甲 6-12 個月。保留給無法用首選藥物者",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 150,
          std_maint_mg_max: 450,
          freq: "每週一次（Q1W）",
          usualMaint_mg: 200,
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 16. Talaromycosis - Prophylaxis
    // ═══════════════════════════════════════════════════════════════
    {
      id: "talaromycosis_prophy",
      label: "Talaromycosis - Prophylaxis（馬內青黴菌症，預防）",
      desc: "東南亞流行區，HIV + CD4 <100 或免疫抑制",
      scenarios: [
        {
          label: "Talaromycosis prophylaxis",
          note: "HIV CD4 <100 且未 ART 有效控制，或 CD4 ≥100 但 T 細胞功能抑制，且在流行區（泰國、越南、中國南方）。居住流行區：至 CD4 >100 ≥6 個月且 ART 有效；旅遊：出發前 3 天開始，停留期間每週一次，離開後再一劑",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 400,
          freq: "每週一次（Q1W）",
          usualMaint_mg: 200,
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════
    // 17. Tinea infection（體表黴菌感染）
    // ═══════════════════════════════════════════════════════════════
    {
      id: "tinea",
      label: "Tinea infection（體表黴菌感染）",
      desc: "Corporis/cruris、Pedis/manuum、Versicolor",
      scenarios: [
        {
          label: "Tinea corporis / cruris（體癬 / 股癬）",
          note: "保留給廣泛或外用無效者。療程 2-4 週",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg_min: 150,
          std_maint_mg_max: 200,
          freq: "每週一次（Q1W）× 2-4 週",
          usualMaint_mg: 200,
        },
        {
          label: "Tinea pedis / manuum（足癬 / 手癬）",
          note: "保留給廣泛或外用無效者。療程 2-6 週",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 150,
          freq: "每週一次（Q1W）× 2-6 週",
          usualMaint_mg: 150,
        },
        {
          label: "Tinea versicolor / pityriasis versicolor（汗斑）",
          note: "療程 2 週",
          preferred: "PO",
          hasLoading: false,
          fixedDose: true,
          std_maint_mg: 300,
          freq: "每週一次（Q1W）× 2 週",
          usualMaint_mg: 300,
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

      // 先判斷是否為每日給藥（影響腎調邏輯）
      const isDailyDosing =
        !sc.freq ||
        sc.freq === "QD" ||
        sc.freq.startsWith("QD") ||
        sc.freq.includes("Q12H") ||
        sc.freq.includes("Q8H");

      // 非每日給藥情境（單劑、每週一次、Q72H × N 劑）不套用腎功能減半
      // UpToDate 的腎調建議只針對每日給藥
      const effectiveMaintFactor = isDailyDosing ? maintFactor : 1.0;

      // 計算 loading dose（同時提供固定劑量與 kg 計算兩種顯示）
      const loadInfo = formatLoadDose(sc, dosing_weight, loadFactor);
      const load_mg = loadInfo.load_mg;
      const load_display = loadInfo.display;

      // 計算維持劑量（同時提供固定劑量與 kg 計算兩種顯示）
      const maintInfo = formatMaintDose(sc, dosing_weight, effectiveMaintFactor);
      const maint_mg = maintInfo.maint_mg;
      const maint_display = maintInfo.display;

      const warnings: string[] = [];
      // 腎功能調整警告
      if (maintFactor < 1.0 && isDailyDosing) {
        warnings.push("⚠️ 腎功能調整：維持量已減半。Loading dose 不受影響，以足量給予");
      } else if (maintFactor < 1.0 && !isDailyDosing) {
        warnings.push("⚠️ 此為非每日給藥情境（單劑 / 每週一次 / Q72H 等）。UpToDate 對 fluconazole 的腎調建議主要針對每日給藥，本工具已按 UpToDate 原文劑量顯示，未套用腎功能減半調整。若有疑慮請查閱原文或臨床藥師");
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
      // 劑量上限警告（只對每日給藥情境有意義；weekly 劑量不觸發）
      if (loadInfo.capped && isDailyDosing) {
        warnings.push(`🚨 Loading dose 上限：體重計算結果超過 UpToDate 建議的 Loading 上限 ${LOAD_MAX_MG} mg，已截至此值`);
      }
      if (maintInfo.overMaxWarning && isDailyDosing) {
        warnings.push(`🚨 Maintenance dose 提醒：體重計算結果超過 ${MAINT_WARN_MG_PER_DAY} mg/day。UpToDate 未明確設定 maintenance 硬上限，但「1,600 mg/day」是目前有文獻支持的最高耐受劑量，超過此值請審慎評估`);
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
        heading: "劑量上限（依 UpToDate）",
        body:
          "【Loading dose】\n" +
          "• 明確上限：1,600 mg\n" +
          "• 體重計算超過 1,600 mg 時，本工具會自動截至此值並加紅色提醒\n" +
          "• 觸發情境：體重 >133 kg（133 × 12 = 1,596 mg）\n\n" +
          "【Maintenance dose】\n" +
          "• UpToDate 原文：「maximum dose has not been established」\n" +
          "• 但指出「doses up to 1,600 mg/day appear to be well tolerated」\n" +
          "• 本工具不硬截斷，但超過 1,600 mg/day 時會加紅色警告提醒\n" +
          "• 觸發情境：體重 >267 kg（267 × 6 = 1,602 mg/day），臨床極罕見\n\n" +
          "⚠️ 體重 <50 kg 或 >90 kg 病人，UpToDate 建議考慮用 weight-based dosing。",
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