import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Vancocin（Vancomycin）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Vanco 針 1 g/Vial（優凡可注射劑）
//
// Glycopeptide 類抗生素
// IV 劑量依體重計算（mg/kg），用 TBW
// PO 用於 CDI（固定劑量，不需腎調）
//
// TDM：
//   - 嚴重 MRSA 感染：AUC/MIC 400-600（首選 AUC-guided dosing）
//   - 非嚴重感染：可用 trough 10-20 mg/L
//   - 連續輸注：目標 Css 20-25 mg/L
//
// 輸注速率：10-15 mg/min
// ⚠️ PO 對全身感染無效；IV 對 CDI 無效
// 肝功能：CTP A-C 不需調初始劑量（B/C 注意 Scr 低估腎功能）
// ═══════════════════════════════════════════════════════════════

const MG_PER_VIAL = 1000; // 1 g/Vial

// Helper：支數（四捨五入至最近 0.25 g = 250 mg）
function toVials(mg: number): string {
  const rounded = Math.round(mg / 250) * 250;
  const vials = rounded / MG_PER_VIAL;
  if (vials % 1 === 0) return `${rounded} mg（${vials} 支）`;
  return `${rounded} mg（${vials} 支）`;
}

// Helper：四捨五入
function r(n: number): number { return Math.round(n); }

// ── 間歇輸注腎調表（UpToDate）──────────────────────────────────
// [0] >90-<130, [1] 50-90, [2] 15-<50, [3] <15
type IntermittentEntry = {
  md_mgPerKg_lo: number; md_mgPerKg_hi: number; freq: string;
  ld_mgPerKg_lo: number; ld_mgPerKg_hi: number;
};

const INTERMITTENT_TIERS: IntermittentEntry[] = [
  { md_mgPerKg_lo: 15, md_mgPerKg_hi: 20, freq: "Q8-12H", ld_mgPerKg_lo: 25, ld_mgPerKg_hi: 30 },
  { md_mgPerKg_lo: 15, md_mgPerKg_hi: 20, freq: "Q12H",   ld_mgPerKg_lo: 20, ld_mgPerKg_hi: 25 },
  { md_mgPerKg_lo: 10, md_mgPerKg_hi: 15, freq: "Q24H",   ld_mgPerKg_lo: 20, ld_mgPerKg_hi: 25 },
  { md_mgPerKg_lo: 10, md_mgPerKg_hi: 15, freq: "Q48-72H", ld_mgPerKg_lo: 20, ld_mgPerKg_hi: 25 },
];

// ── 連續輸注腎調表 ──────────────────────────────────────────────
// [0] >80-119, [1] >50-80, [2] 25-50, [3] <25
type ContinuousEntry = { mgPerKgPerDay: number };

const CONTINUOUS_TIERS: ContinuousEntry[] = [
  { mgPerKgPerDay: 30 },
  { mgPerKgPerDay: 25 },
  { mgPerKgPerDay: 14 },
  { mgPerKgPerDay: 7 },
];

function getIntermittentTier(crcl: number): number {
  if (crcl > 90) return 0;
  if (crcl >= 50) return 1;
  if (crcl >= 15) return 2;
  return 3;
}

function getContinuousTier(crcl: number): number {
  if (crcl > 80) return 0;
  if (crcl > 50) return 1;
  if (crcl >= 25) return 2;
  return 3;
}

function getIntermittentDose(crcl: number, rrt: string, tbw: number): {
  ld: string; md: string; freq: string; note: string;
} {
  if (rrt === "hd") {
    return {
      ld: `LD ${toVials(25 * tbw)}（25 mg/kg）`,
      md: `MD ${toVials(10 * tbw)}（7.5-10 mg/kg）post-HD`,
      freq: "每次透析後",
      note: "HD：移除率 25-40%。Post-HD 給藥（high-flux 用 10 mg/kg，low-flux 用 7.5 mg/kg）。72hr 跨透析期增加約 25% 維持劑量。每週至少監測一次 pre-dialysis level，目標 15-20 mg/L",
    };
  }
  if (rrt === "pd") {
    return {
      ld: `LD ${toVials(22.5 * tbw)}（20-25 mg/kg）`,
      md: `MD ${toVials(12.5 * tbw)}（10-15 mg/kg）依濃度調整`,
      freq: "依 level 調整",
      note: "PD：LD 後 48-72hr 取血清濃度決定後續維持。若為 PD-related peritonitis 請參考腹腔內給藥",
    };
  }
  if (rrt === "cvvh") {
    return {
      ld: `LD ${toVials(22.5 * tbw)}（20-25 mg/kg）`,
      md: `MD ${toVials(8.75 * tbw)}（7.5-10 mg/kg）Q12H`,
      freq: "Q12H",
      note: "CRRT：LD 20-25 mg/kg → 7.5-10 mg/kg Q12H。須 TDM。嚴重 MRSA 應在 24-48hr 內做 AUC 監測",
    };
  }

  const tier = getIntermittentTier(crcl);
  const e = INTERMITTENT_TIERS[tier];
  const ldMg = r((e.ld_mgPerKg_lo + e.ld_mgPerKg_hi) / 2 * tbw);
  const mdLo = r(e.md_mgPerKg_lo * tbw);
  const mdHi = r(e.md_mgPerKg_hi * tbw);

  const ranges = [">90-<130", "50-90", "15-<50", "<15"];
  let note = tier === 0
    ? "CrCl >90：標準劑量"
    : `CrCl ${r(crcl)}（${ranges[tier]}）→ 調整頻率`;
  if (tier === 3) note += "。⚠️ 血清濃度 >20 mg/L 時切勿給予維持劑量";

  return {
    ld: `LD ${toVials(ldMg)}（${e.ld_mgPerKg_lo}-${e.ld_mgPerKg_hi} mg/kg）`,
    md: `MD ${toVials((mdLo + mdHi) / 2)}（${e.md_mgPerKg_lo}-${e.md_mgPerKg_hi} mg/kg）${e.freq}`,
    freq: e.freq,
    note,
  };
}

function getContinuousDose(crcl: number, rrt: string, tbw: number): {
  ld: string; daily: string; note: string;
} {
  const ldMg = r(17.5 * tbw); // LD 15-20 mg/kg

  if (rrt === "hd" || rrt === "pd") {
    return {
      ld: `LD ${toVials(ldMg)}（15-20 mg/kg）`,
      daily: "不建議連續輸注用於 HD/PD",
      note: "HD/PD：建議改用間歇輸注",
    };
  }
  if (rrt === "cvvh") {
    return {
      ld: `LD ${toVials(ldMg)}（15-20 mg/kg）`,
      daily: `${toVials(14 * tbw)}/day continuous（~14 mg/kg/day）`,
      note: "CRRT CI：LD 15-20 mg/kg → ~14 mg/kg/day continuous。目標 Css 20-25 mg/L。須 TDM",
    };
  }

  const tier = getContinuousTier(crcl);
  const e = CONTINUOUS_TIERS[tier];
  const dailyMg = r(e.mgPerKgPerDay * tbw);
  const ranges = [">80-119", ">50-80", "25-50", "<25"];

  return {
    ld: `LD ${toVials(ldMg)}（15-20 mg/kg）`,
    daily: `${toVials(dailyMg)}/day continuous（${e.mgPerKgPerDay} mg/kg/day）`,
    note: `CrCl ${r(crcl)}（${ranges[tier]}）→ ${e.mgPerKgPerDay} mg/kg/day CI。目標 Css 20-25 mg/L`,
  };
}

export const vancomycin: Drug = {
  name: "Vancocin",
  subtitle: "Vancomycin",
  searchTerms: [
    "vancomycin", "vancocin", "vanco", "優凡可",
    "glycopeptide", 
  ],

  needsRenal: true,
  needsWeight: true,
  needsHepatic: false,

  indications: [

    // ═══ 1. BSI ═══
    {
      id: "bsi",
      label: "Bloodstream infection（菌血症）",
      desc: "MRSA / MR-CoNS · 15-20 mg/kg Q8-12H",
      scenarios: [
        {
          label: "MRSA bacteremia（MRSA 菌血症）",
          note: "單純 S. aureus 菌血症自首次血培陰性起 ≥14 天。心內膜炎或轉移性感染需更長。重症可考慮 LD",
          route: "IV", doseDisplay: "15-20 mg/kg Q8-12H IV",
        },
        {
          label: "MR-CoNS bacteremia（MR-CoNS 菌血症）",
          note: "單純菌血症自首次血培陰性起 5-7 天。導管相關可考慮 antibiotic lock therapy",
          route: "IV", doseDisplay: "15-20 mg/kg Q8-12H IV",
        },
        {
          label: "Antibiotic lock technique（抗生素鎖定療法）",
          note: "敏感菌株且無法拔管時，需與全身抗生素聯用。S. aureus 不建議。配製 2.5-5 mg/mL lock（可合併 heparin），2-5 mL，保留最長 72hr",
          route: "LOCK", doseDisplay: "Lock: 2.5-5 mg/mL",
        },
      ],
    },

    // ═══ 2. CSF shunt ═══
    {
      id: "csfShunt",
      label: "Cerebrospinal fluid shunt infection（CSF 引流管感染）",
      desc: "IV + 可能腦室內給藥",
      scenarios: [
        {
          label: "CSF shunt infection, IV（CSF 引流管感染，IV）",
          note: "重症可考慮 LD",
          route: "IV", doseDisplay: "15-20 mg/kg Q8-12H IV",
        },
        {
          label: "CSF shunt infection, intraventricular（CSF 引流管感染，腦室內）",
          note: "全身治療輔助。5-20 mg/day 腦室內。須用 preservative-free 製劑。目標 CSF 濃度為 MIC 的 10-20 倍。給藥後夾管 15-60 min。保留給拔管後仍治療失敗或無法拔管者",
          route: "IVT", doseDisplay: "Intraventricular 5-20 mg/day",
        },
      ],
    },

    // ═══ 3. CDI prophylaxis ═══
    {
      id: "cdiProphy",
      label: "Clostridioides difficile infection, prophylaxis（CDI 預防）",
      desc: "PO 125 mg QD",
      scenarios: [
        {
          label: "CDI prophylaxis（CDI 預防，有近期 CDI 史 + 需全身抗生素）",
          note: "適用於 ≥65 歲或顯著免疫抑制 + 過去 3 月內因嚴重 CDI 住院者。持續至全身抗生素結束後 5-7 天",
          route: "PO", doseDisplay: "125 mg PO QD",
        },
      ],
    },

    // ═══ 4. CDI treatment ═══
    {
      id: "cdiTx",
      label: "Clostridioides difficile infection, treatment（CDI 治療）",
      desc: "PO 125-500 mg · 替代藥物",
      scenarios: [
        {
          label: "Initial, nonfulminant（初始，非暴發性，替代藥物）",
          note: "10 天（反應延遲可延至 14 天）。若全身抗生素不可停，部分專家建議延長 CDI 治療至停藥後 1 週",
          route: "PO", doseDisplay: "125 mg PO QID",
        },
        {
          label: "Recurrent, nonfulminant — Standard（復發，標準方案）",
          note: "10 天。保留給初始未用過 vancomycin 者",
          route: "PO", doseDisplay: "125 mg PO QID",
        },
        {
          label: "Recurrent, nonfulminant — Pulsed-tapered（復發，脈衝遞減）",
          note: "125 mg QID × 10-14 天 → BID × 7 天 → QD × 7 天 → Q2-3 天 × 2-8 週",
          route: "PO", doseDisplay: "125 mg PO QID → 遞減",
        },
        {
          label: "Recurrent, nonfulminant — with Rifaximin（復發，合併 rifaximin）",
          note: "125 mg QID × 10 天後接 rifaximin。注意 rifaximin 抗藥性",
          route: "PO", doseDisplay: "125 mg PO QID × 10 天 → rifaximin",
        },
        {
          label: "Fulminant（暴發性：ileus / megacolon / shock）",
          note: "必須合併 IV metronidazole。有 ileus 可合併直腸灌腸。改善後可降至 125 mg QID 並停 metronidazole。10-14 天",
          route: "PO", doseDisplay: "500 mg PO QID + IV metronidazole",
        },
        {
          label: "Rectal retention enema（直腸保留灌腸）",
          note: "暴發性 + ileus + 標準治療無效。500 mg/100 mL NS，盡量保留，Q6H 更換。有穿孔風險，需有經驗人員操作。需合併 PO vancomycin（部分 ileus）或替代 PO（完全 ileus）+ IV metronidazole",
          route: "RECTAL", doseDisplay: "500 mg/100 mL NS 直腸灌腸 Q6H",
        },
      ],
    },

    // ═══ 5-23：IV 適應症（大部分劑量相同，差在療程和備註）═══

    { id: "cf", label: "Cystic fibrosis, acute pulmonary exacerbation（CF 急性肺惡化）", desc: "MRSA · 15-20 mg/kg Q8H · 10-14 天",
      scenarios: [{ label: "CF acute exacerbation, MRSA（CF 肺惡化，MRSA）", note: "10-14 天", route: "IV", doseDisplay: "15-20 mg/kg Q8H IV" }],
    },
    { id: "diabeticFoot", label: "Diabetic foot infection, moderate to severe（糖尿病足感染）", desc: "MRSA · 2-4 週",
      scenarios: [{ label: "Diabetic foot infection, MRSA（糖尿病足感染，MRSA）", note: "無骨髓炎 2-4 週，含口服降階", route: "IV", doseDisplay: "15-20 mg/kg Q8-12H IV" }],
    },
    { id: "endocarditis", label: "Endocarditis, treatment（心內膜炎）", desc: "Enterococcus / Staphylococcus / VGS",
      scenarios: [
        { label: "Enterococcus, native or prosthetic（腸球菌心內膜炎）", note: "Penicillin 抗藥或無法用 β-lactam。必須合併 gentamicin。6 週", route: "IV", doseDisplay: "15 mg/kg Q12H IV + gentamicin", freqOverride: "Q12H" },
        { label: "Staphylococcus, native valve（葡萄球菌，自體瓣膜）", note: "MRSA 或無法用 β-lactam。6 週（部分專家 4-6 週）。重症可考慮 LD", route: "IV", doseDisplay: "15-20 mg/kg Q8-12H IV" },
        { label: "Staphylococcus, prosthetic valve（葡萄球菌，人工瓣膜）", note: "必須合併 combination。≥6 週。重症可考慮 LD", route: "IV", doseDisplay: "15-20 mg/kg Q8-12H IV" },
        { label: "Viridans group streptococci / S. bovis（VGS / S. bovis）", note: "無法用 penicillin/ceftriaxone。Native 4 週 / Prosthetic 6 週。人工瓣膜可合併 gentamicin 前 2 週", route: "IV", doseDisplay: "15 mg/kg Q12H IV", freqOverride: "Q12H" },
      ],
    },
    { id: "endophthalmitis", label: "Endophthalmitis, treatment（眼內炎）", desc: "玻璃體內 1 mg",
      scenarios: [{ label: "Endophthalmitis, intravitreal（眼內炎，玻璃體內）", note: "1 mg/0.1 mL。通常合併 ceftazidime。24-48hr 後可重複", route: "IVT", doseDisplay: "Intravitreal 1 mg/0.1 mL" }],
    },
    { id: "iai", label: "Intra-abdominal infection, health care associated（醫療相關腹腔感染）", desc: "高風險 Enterococcus · 4-5 天",
      scenarios: [{ label: "IAI, Enterococcus coverage（腹腔感染，腸球菌覆蓋）", note: "高風險：術後/醫療相關 + 先前抗生素/免疫低下/瓣膜疾病/人工血管。合併 combination。源頭控制後 4-5 天", route: "IV", doseDisplay: "15-20 mg/kg Q8-12H IV" }],
    },
    { id: "cnsAbscess", label: "Intracranial abscess or spinal epidural abscess（顱內/脊髓膿瘍）", desc: "MRSA · 4-8 週",
      scenarios: [{ label: "Brain / Spinal epidural abscess, MRSA（腦/脊髓膿瘍，MRSA）", note: "脊髓 4-8 週；腦膿瘍 6-8 週。重症可考慮 LD", route: "IV", doseDisplay: "15-20 mg/kg Q8-12H IV" }],
    },
    { id: "meningitis", label: "Meningitis, bacterial（細菌性腦膜炎）", desc: "MRSA / 抗藥 S. pneumoniae",
      scenarios: [{ label: "Bacterial meningitis, MRSA or resistant S. pneumoniae（腦膜炎）", note: "合併 combination。重症可考慮 LD", route: "IV", doseDisplay: "15-20 mg/kg Q8-12H IV" }],
    },
    { id: "osteo", label: "Osteomyelitis and/or discitis（骨髓炎/椎間盤炎）", desc: "MRSA · 通常 6 週",
      scenarios: [{ label: "Osteomyelitis / Discitis, MRSA（骨髓炎，MRSA）", note: "通常 6 週。截肢完全切除可短。可部分轉口服。重症可考慮 LD", route: "IV", doseDisplay: "15-20 mg/kg Q8-12H IV" }],
    },
    { id: "pdPeritonitis", label: "Peritonitis, treatment, peritoneal dialysis（PD 腹膜炎）", desc: "腹腔內給藥",
      scenarios: [
        { label: "APD intermittent（自動 PD，間歇）", note: "15 mg/kg IP 加入一袋，每 4 天。留置 ≥6hr。5 天未改善考慮拔管", route: "IP", doseDisplay: "IP 15 mg/kg Q4 天" },
        { label: "CAPD intermittent（CAPD，間歇）", note: "15-30 mg/kg IP 加入一袋，每 5-7 天。留置 ≥6hr", route: "IP", doseDisplay: "IP 15-30 mg/kg Q5-7 天" },
        { label: "CAPD continuous（CAPD，每袋都給）", note: "LD 20-25 mg/kg 首袋 → MD 25 mg/L 每袋", route: "IP", doseDisplay: "IP LD 20-25 mg/kg → MD 25 mg/L" },
      ],
    },
    { id: "pneumonia", label: "Pneumonia（肺炎）", desc: "MRSA · 通常 7 天",
      scenarios: [{ label: "Pneumonia, MRSA（肺炎，MRSA）", note: "通常 7 天。合併 combination。重症可考慮 LD", route: "IV", doseDisplay: "15-20 mg/kg Q8-12H IV" }],
    },
    { id: "pji", label: "Prosthetic joint infection（人工關節感染）", desc: "MRSA / Enterococcus · 2-6 週",
      scenarios: [
        { label: "PJI, Staphylococcus（人工關節，葡萄球菌）", note: "2-6 週。清創保留假體或一階段置換後需口服抑制性治療。重症可考慮 LD", route: "IV", doseDisplay: "15-20 mg/kg Q8-12H IV" },
        { label: "PJI, Enterococcus（人工關節，腸球菌）", note: "4-6 週", route: "IV", doseDisplay: "15 mg/kg Q12H IV", freqOverride: "Q12H" },
      ],
    },
    { id: "sepsis", label: "Sepsis / Septic shock（敗血症）", desc: "MRSA · 建議 LD · 1hr 內給藥",
      scenarios: [{ label: "Sepsis / Septic shock, MRSA（敗血症，MRSA）", note: "建議 LD。懷疑或證實敗血症 1hr 內給藥。療程依感染源，優先短療程", route: "IV", doseDisplay: "LD 25-35 mg/kg → 15-20 mg/kg Q8-12H IV" }],
    },
    { id: "septicArthritis", label: "Septic arthritis（化膿性關節炎）", desc: "MRSA · 3-4 週",
      scenarios: [{ label: "Septic arthritis, MRSA（化膿性關節炎，MRSA）", note: "無骨髓炎/菌血症/併發症：3-4 週（含口服降階）。重症可考慮 LD", route: "IV", doseDisplay: "15-20 mg/kg Q8-12H IV" }],
    },
    { id: "ssti", label: "Skin and soft tissue infection（皮膚軟組織感染）", desc: "MRSA · 住院",
      scenarios: [{ label: "SSTI, MRSA（皮膚軟組織感染，MRSA）", note: "單純性 + 非肥胖 + 腎功能正常：通常不需 TDM。複雜性/嚴重需 TDM。壞死性合併 combination", route: "IV", doseDisplay: "15 mg/kg Q12H IV", freqOverride: "Q12H" }],
    },
    { id: "sbp", label: "Spontaneous bacterial peritonitis（SBP）", desc: "重症或 MDR 風險 · 5-7 天",
      scenarios: [{ label: "SBP, MRSA risk（SBP，MRSA 風險）", note: "保留給重症或 MDR 風險。合併 combination。5-7 天。重症可考慮 LD", route: "IV", doseDisplay: "15-20 mg/kg Q8-12H IV" }],
    },
    { id: "gbsProphy", label: "Streptococcus, maternal prophylaxis（GBS 母體預防）", desc: "替代藥物 · 產程至分娩",
      scenarios: [
        { label: "GBS prophylaxis, weight-based（GBS 預防，體重計算）", note: "Penicillin 過敏 + 高過敏風險 + clindamycin 抗藥/無藥敏。產程開始或破水時給，Q8H 至分娩。單次 max 2 g", route: "IV", doseDisplay: "20 mg/kg Q8H IV（max 2 g/dose）" },
        { label: "GBS prophylaxis, fixed-dose（GBS 預防，固定劑量）", note: "部分專家偏好。初始 2 g → 1 g Q12H 至分娩", route: "IV", doseDisplay: "LD 2 g → 1 g Q12H IV" },
      ],
    },
    { id: "surgicalProphy", label: "Surgical prophylaxis（手術預防）", desc: "MRSA 覆蓋或 β-lactam 不耐受",
      scenarios: [{ label: "Surgical prophylaxis（手術預防）", note: "術前 60-120 min 開始輸注。手術長/大量失血可在 8-12hr 後追加。Clean/clean-contaminated 不需術後再給。需合併其他藥物。術後若延長 ≤24hr", route: "IV", doseDisplay: "15 mg/kg IV（max 2 g）" }],
    },
    { id: "ssi", label: "Surgical site infection（手術傷口感染）", desc: "MRSA",
      scenarios: [{ label: "Surgical site infection, MRSA（手術傷口感染，MRSA）", note: "依 TDM 調整", route: "IV", doseDisplay: "15 mg/kg Q12H IV", freqOverride: "Q12H" }],
    },
    { id: "tss", label: "Toxic shock syndrome, staphylococcal（葡萄球菌毒性休克症候群）", desc: "MRSA · 10-14 天",
      scenarios: [{ label: "Toxic shock syndrome, MRSA（毒性休克症候群，MRSA）", note: "無菌血症/明確感染灶：10-14 天。重症可考慮 LD", route: "IV", doseDisplay: "15-20 mg/kg Q8-12H IV" }],
    },

  ], // ← end of indications

  // ──────────────────────────────────────────────────────────────
  // calculate()
  // ──────────────────────────────────────────────────────────────
  calculate({ dosing_weight, crcl, rrt, indicationData, extras }) {
    const tbw: number = extras?.tbw ?? dosing_weight;

    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const route: string = sc.route ?? "IV";
      const warnings: string[] = [];
      const rows: any[] = [
        { label: "原始建議劑量", value: sc.doseDisplay, highlight: true },
      ];

      // ── PO（CDI）：固定劑量，不需腎調 ──
      if (route === "PO") {
        rows.push({ label: "腎功能調整", value: "口服：全身吸收極低，不需腎功能調整" });
        warnings.push("⚠️ 口服 vancomycin 對全身感染完全無效（腸道吸收極差）。僅用於 CDI");
        if (sc.note) rows.push({ label: "療程與備註", value: sc.note });
        return { title: sc.label, rows, warnings };
      }

      // ── 特殊途徑（LOCK / IVT / IP / RECTAL）：不需腎調 ──
      if (route === "LOCK" || route === "IVT" || route === "IP" || route === "RECTAL") {
        rows.push({ label: "腎功能調整", value: "特殊給藥途徑：依各途徑指引，不適用全身性腎調" });
        if (sc.note) rows.push({ label: "療程與備註", value: sc.note });
        return { title: sc.label, rows, warnings };
      }

      // ── IV 計算 ──
      // 間歇輸注
      const intD = getIntermittentDose(crcl, rrt, tbw);
      rows.push({ label: `間歇輸注 LD（${r(tbw)} kg）`, value: intD.ld, highlight: true });
      rows.push({ label: `間歇輸注 MD（${r(tbw)} kg）`, value: intD.md, highlight: true });
      rows.push({ label: "間歇輸注腎調", value: intD.note });

      // 連續輸注
      const ciD = getContinuousDose(crcl, rrt, tbw);
      rows.push({ label: `連續輸注 LD`, value: ciD.ld });
      rows.push({ label: `連續輸注 MD`, value: ciD.daily });
      rows.push({ label: "連續輸注腎調", value: ciD.note });

      // ARC
      const isARC = rrt === "none" && crcl >= 130;
      if (isARC) {
        const arcInt = `LD ${toVials(30 * tbw)}（25-35 mg/kg）→ 15-20 mg/kg Q8H（部分需 Q6H）`;
        const arcCI = `LD 15-20 mg/kg → 40-60 mg/kg/day CI（目標 Css 20-25）`;
        rows.push({ label: "⚡ ARC 間歇輸注", value: arcInt, highlight: true });
        rows.push({ label: "⚡ ARC 連續輸注", value: arcCI, highlight: true });
        warnings.push("⚡ ARC（CrCl ≥130）：需頻繁 TDM。連續輸注目標 Css 20-25 mg/L");
      }

      // PIRRT
      if (rrt === "cvvh") {
        warnings.push("📌 PIRRT：LD 20-25 mg/kg（PIRRT 進行中也照給）→ 每次 PIRRT 結束後（或最後 60-90 min）給 MD 15 mg/kg。須 TDM");
      }

      // TDM 提醒
      warnings.push("📊 TDM：嚴重 MRSA 感染首選 AUC-guided dosing（目標 AUC/MIC 400-600）。非嚴重感染可用 trough 10-20 mg/L。連續輸注目標 Css 20-25 mg/L");

      // 輸注速率
      warnings.push("💉 輸注速率：10-15 mg/min（避免 Red Man Syndrome）");

      // 肥胖
      const bmi: number = extras?.bmi ?? 0;
      if (bmi >= 30) {
        warnings.push(`⚖️ 肥胖（BMI ${r(bmi * 10) / 10}）：LD 和 MD 都用 TBW 計算。LD max 3 g。經驗性 MD 很少需要 >4.5 g/day`);
      }

      // IV 對 CDI 無效
      warnings.push("⚠️ IV vancomycin 對 C. difficile 感染無效（腸道無法達到有效濃度）");

      if (sc.note) rows.push({ label: "療程與備註", value: sc.note });
      return { title: sc.label, rows, warnings };
    });

    return { scenarioResults };
  },

  clinicalPearls: {
    title: "臨床參考",
    sections: [
      {
        heading: "藥物特性",
        body:
          "• Glycopeptide 類抗生素（緩慢殺菌劑）\n" +
          "• PO 腸道吸收極差 → 僅用於 CDI（對全身感染無效）\n" +
          "• IV 無法在腸道達有效濃度 → 對 CDI 無效\n" +
          "• 輸注速率 10-15 mg/min（避免 Red Man Syndrome）\n" +
          "• ECMO：藥動學影響極小，依腎功能 + CRRT 調整 + TDM",
      },
      {
        heading: "TDM（治療藥物監測）",
        body:
          "【嚴重 MRSA 感染（BSI、心內膜炎、腦膜炎、骨髓炎、肺炎、敗血症）】\n" +
          "  首選 AUC-guided dosing：AUC/MIC 400-600（預設 MIC 1 mg/L）\n" +
          "  不再推薦單純 trough 監測（15-20 mg/L 是 AUC 的不良替代）\n\n" +
          "【非嚴重感染】\n" +
          "  可用 trough 10-20 mg/L（非嚴重 10-15 mg/L）\n" +
          "  腦膜炎/CNS 感染、腎功能不穩定者首選 trough\n\n" +
          "【連續輸注】\n" +
          "  目標 Css 20-25 mg/L（= AUC24 480-600）\n\n" +
          "【AUC 計算】\n" +
          "  1. 梯形法：穩定狀態下測 Peak + Trough\n" +
          "  2. Bayesian 法：可非穩定態、單一濃度估算\n\n" +
          "⚠️ 非 MRSA 菌株（MSSA、CoNS、Streptococci、Enterococci）目前無 AUC 監測證據",
      },
      {
        heading: "間歇輸注腎調速查表（UpToDate）",
        body:
          "CrCl >90-<130：LD 25-30 mg/kg → MD 15-20 mg/kg Q8-12H\n" +
          "CrCl 50-90：LD 20-25 mg/kg → MD 15-20 mg/kg Q12H\n" +
          "CrCl 15-<50：LD 20-25 mg/kg → MD 10-15 mg/kg Q24H\n" +
          "CrCl <15：LD 20-25 mg/kg → MD 10-15 mg/kg Q48-72H（濃度 >20 時勿給）\n" +
          "ARC (≥130)：LD 25-35 mg/kg → 15-20 mg/kg Q8H（部分需 Q6H）\n\n" +
          "重症 LD 可達 35 mg/kg（max 3 g）",
      },
      {
        heading: "連續輸注腎調速查表",
        body:
          "LD 15-20 mg/kg → 目標 Css 20-25 mg/L\n" +
          "CrCl >80-119：30 mg/kg/day\n" +
          "CrCl >50-80：25 mg/kg/day\n" +
          "CrCl 25-50：14 mg/kg/day\n" +
          "CrCl <25：7 mg/kg/day\n" +
          "ARC (≥130)：LD 15-25 mg/kg → 40-60 mg/kg/day\n" +
          "Max MD 60 mg/kg/day",
      },
      {
        heading: "RRT 速查表",
        body:
          "HD：移除 25-40%。Post-HD：LD 25 mg/kg → MD 7.5-10 mg/kg。Intradialytic：LD 30-35 mg/kg → MD 7.5-15 mg/kg。72hr 跨透析期加 25% MD。每週監測 pre-HD level\n\n" +
          "PD（IV）：LD 20-25 mg/kg → 48-72hr 取 level → MD 10-15 mg/kg 依 level\n\n" +
          "CRRT：LD 20-25 mg/kg → 7.5-10 mg/kg Q12H。須 TDM\n\n" +
          "PIRRT：LD 20-25 mg/kg（PIRRT 中也照給）→ PIRRT 結束後 MD 15 mg/kg。須 TDM",
      },
      {
        heading: "肥胖",
        body:
          "LD 和 MD 都用 TBW 計算\n" +
          "LD：20-25 mg/kg（重症 20-35 mg/kg），max 3 g\n" +
          "MD：UpToDate 用 CL 公式算每日總劑量（四捨五入至 250 mg）\n" +
          "  熱病：15-20 mg/kg Q8-12H（max 2 g/dose）\n" +
          "每日總劑量很少需要 >4.5 g",
      },
      {
        heading: "肝功能",
        body:
          "CTP A-C：不需調初始劑量\n" +
          "⚠️ CTP B/C：Scr 偏低（肌肉量少 + 肝臟 Scr 合成↓）→ CrCl 公式高估腎功能\n" +
          "→ 考慮保守起始劑量。合併腎功能不全者需進一步減量",
      },
      {
        heading: "院內品項",
        body: "Vanco 針 1 g/Vial（優凡可注射劑）",
      },
    ],
  },
};
