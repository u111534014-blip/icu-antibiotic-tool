import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Bactrim（Trimethoprim / Sulfamethoxazole, TMP-SMX）
// ═══════════════════════════════════════════════════════════════
// 院內品項：
//   PO：Morcasin 錠（孟克杏）TMP 80 mg / SMX 400 mg（= SS tab）
//       DS tab = 2 錠 Morcasin = TMP 160 mg / SMX 800 mg
//   IV：Sevatrim 針（雪白淨）TMP 80 mg / SMX 400 mg 每支（5 mL）
//
// 劑量以 TMP 成分表示
// 肥胖：用 AdjBW（App.tsx 預設 AdjBW_if_obese 策略）
// PO 生體可用率接近 100% → PO ↔ IV 等量換算
// ═══════════════════════════════════════════════════════════════

const TMP_PER_TAB = 80;   // Morcasin 每錠 TMP 80 mg（SS tab）
const TMP_PER_AMP = 80;   // Sevatrim 每支 TMP 80 mg
const r = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;

// Helper：PO 錠數
function toTabs(tmpMg: number): string {
  const tabs = tmpMg / TMP_PER_TAB;
  if (tabs === 1) return "1 錠 Morcasin（= ½ DS tab）";
  if (tabs === 2) return "2 錠 Morcasin（= 1 DS tab）";
  if (tabs === 4) return "4 錠 Morcasin（= 2 DS tab）";
  return `${r1(tabs)} 錠 Morcasin`;
}

// Helper：IV 支數
function toAmps(tmpMg: number): string {
  const amps = tmpMg / TMP_PER_AMP;
  return `${r1(amps)} 支 Sevatrim`;
}

// ── 腎調 Helper ─────────────────────────────────────────────
// CrCl 15-30：劑量減半
// CrCl <15 / HD / PD：劑量減半 + Q24H
// CRRT：劑量減半 + Q12H
function renalAdjust(crcl: number, rrt: string): {
  factor: number; freqOverride: string | null; note: string;
} {
  if (rrt === "hd") return { factor: 0.5, freqOverride: "Q24H（透析後）", note: "HD：劑量減半，透析後給藥" };
  if (rrt === "pd") return { factor: 0.5, freqOverride: "Q24H", note: "PD：比照 CrCl <15（劑量減半）" };
  if (rrt === "cvvh") return { factor: 0.5, freqOverride: "Q12H", note: "CRRT：劑量減半，維持 Q12H" };
  if (crcl < 15) return { factor: 0.5, freqOverride: "Q24H", note: "CrCl <15：劑量減半 + Q24H" };
  if (crcl <= 30) return { factor: 0.5, freqOverride: null, note: "CrCl 15-30：劑量減半" };
  return { factor: 1, freqOverride: null, note: "CrCl >30：不需調整" };
}

// ── 建立通用 rows ────────────────────────────────────────────
function buildDoseRows(
  dosing_weight: number, crcl: number, rrt: string,
  sc: any, isWaterLimit: boolean
): { rows: any[]; warnings: string[] } {
  const rows: any[] = [];
  const warnings: string[] = [];
  const adj = renalAdjust(crcl, rrt);

  // ── 固定劑量 PO（預防、簡單感染）──
  if (sc.fixedPO && !sc.tmpPerKg) {
    rows.push({ label: "建議劑量（PO）", value: sc.fixedPO, highlight: true });
    if (sc.fixedPO_tabs) rows.push({ label: "院內品項", value: sc.fixedPO_tabs });
    if (adj.factor < 1 && !sc.noRenalAdj) {
      warnings.push(`⚠️ ${adj.note}。考慮減量或延長間隔`);
    }
    if (sc.note) rows.push({ label: "療程與備註", value: sc.note });
    return { rows, warnings };
  }

  // ── mg/kg 計算（PO + IV）──
  const tmpPerKg = sc.tmpPerKg ?? { min: 8, max: 10 };
  const divisions = sc.divisions ?? 2;
  const freq = sc.freq ?? "Q12H";
  const route = sc.route ?? "BOTH"; // "PO" | "IV" | "BOTH"

  // 每日總劑量
  const dailyMin = r(tmpPerKg.min * dosing_weight);
  const dailyMax = r(tmpPerKg.max * dosing_weight);
  // 單次劑量
  const singleMin = r(dailyMin / divisions * adj.factor);
  const singleMax = r(dailyMax / divisions * adj.factor);

  const adjFreq = adj.freqOverride ?? freq;

  rows.push({
    label: "原始劑量（TMP）",
    value: tmpPerKg.min === tmpPerKg.max
      ? `${tmpPerKg.min} mg/kg/day ÷ ${divisions} 次 = ${dailyMin} mg/day`
      : `${tmpPerKg.min}-${tmpPerKg.max} mg/kg/day ÷ ${divisions} 次`,
    highlight: true,
  });

  if (adj.factor < 1) {
    rows.push({ label: "腎功能調整", value: adj.note });
  }

  const singleStr = singleMin === singleMax
    ? `TMP ${singleMin} mg`
    : `TMP ${singleMin}-${singleMax} mg`;

  rows.push({
    label: `單次劑量（${adj.factor < 1 ? "調整後" : "計算後"}）`,
    value: `${singleStr} ${adjFreq}`,
    highlight: true,
  });

  // PO 顯示
  if (route === "PO" || route === "BOTH") {
    const tabStr = singleMin === singleMax
      ? toTabs(singleMin)
      : `${toTabs(singleMin)} ~ ${toTabs(singleMax)}`;
    rows.push({ label: "PO 取藥", value: `${tabStr} ${adjFreq}` });
  }

  // IV 顯示
  if (route === "IV" || route === "BOTH") {
    const ampStr = singleMin === singleMax
      ? toAmps(singleMin)
      : `${toAmps(singleMin)} ~ ${toAmps(singleMax)}`;
    rows.push({ label: "IV 取藥", value: `${ampStr} ${adjFreq}` });

    // 稀釋
    const ampMax = singleMax / TMP_PER_AMP;
    const dilPerAmp = isWaterLimit ? 75 : 125;
    const dilVol = r(ampMax * dilPerAmp);
    rows.push({
      label: "IV 稀釋",
      value: `加入 ${dilVol} mL D5W${isWaterLimit ? "（限水配方 75 mL/支）" : "（標準 125 mL/支）"}`,
    });

    // 藥師互動輸入框
    rows.push({ type: "ivCalc", dilPerAmp, drugLabel: "Sevatrim" });
  }

  if (sc.note) rows.push({ label: "療程與備註", value: sc.note });

  // 高劑量提醒
  if (tmpPerKg.max >= 15) {
    warnings.push("⚠️ 高劑量 TMP-SMX（≥15 mg/kg/day）：注意高血鉀、骨髓抑制、腎功能。建議監測 CBC、電解質、Scr");
  }

  return { rows, warnings };
}

export const bactrim: Drug = {
  name: "Bactrim",
  subtitle: "Trimethoprim / Sulfamethoxazole",
  searchTerms: [
    "bactrim", "baktar", "septra", "co-trimoxazole",
    "trimethoprim", "sulfamethoxazole", "tmp-smx", "tmp/smx",
    "sevatrim", "雪白淨", "morcasin", "孟克杏",
    "PJP", "PCP", "nocardia", "stenotrophomonas",
  ],

  needsRenal: true,
  needsWeight: true,
  needsHepatic: false,

  extraFields: [
    { key: "waterLimit", type: "toggle", label: "限水病人（IV 稀釋 75 mL/支）", default: false },
  ],

  indications: [

    // ═══ 1. PJP ═══
    {
      id: "pjp",
      label: "Pneumocystis pneumonia（PJP / PCP 肺囊蟲肺炎）",
      desc: "治療 15-20 mg/kg/day · 預防 1 DS QD",
      scenarios: [
        {
          label: "PJP treatment, moderate-severe（PJP 治療，中重度）",
          note: "PaO₂ <70 或 A-a gradient ≥35 → 加類固醇。療程 21 天。IV 首選，改善後可轉 PO",
          tmpPerKg: { min: 15, max: 20 }, divisions: 4, freq: "Q6H", route: "BOTH",
        },
        {
          label: "PJP treatment, mild（PJP 治療，輕度）",
          note: "療程 21 天",
          tmpPerKg: { min: 15, max: 20 }, divisions: 3, freq: "Q8H", route: "PO",
        },
        {
          label: "PJP prophylaxis（PJP 預防）",
          note: "HIV CD4 <200、移植後、免疫低下。定期重新評估",
          fixedPO: "1 DS tab QD（首選）或 1 SS tab QD 或 1 DS tab 每週 3 次",
          fixedPO_tabs: "2 錠 Morcasin QD 或 1 錠 QD 或 2 錠 每週 3 次",
          noRenalAdj: true,
        },
      ],
    },

    // ═══ 2. SSTI ═══
    {
      id: "ssti",
      label: "Skin and soft tissue infection（皮膚軟組織感染）",
      desc: "膿瘍 / 蜂窩性組織炎 / MRSA",
      scenarios: [
        {
          label: "Abscess / Cellulitis, purulent（膿瘍 / 化膿性蜂窩性組織炎）",
          note: "體重 >70 kg 建議較高劑量。≥5 天（嚴重可延至 14 天）。蜂窩性組織炎需加 streptococci 覆蓋（如 amoxicillin）",
          tmpPerKg: { min: 4, max: 8 }, divisions: 2, freq: "Q12H", route: "BOTH",
        },
        {
          label: "Impetigo / Ecthyma, MRSA（膿痂疹）",
          note: "病灶多或群聚才考慮全身治療。7 天",
          fixedPO: "1-2 DS tab BID × 7 天",
          fixedPO_tabs: "2-4 錠 Morcasin BID",
        },
      ],
    },

    // ═══ 3. UTI ═══
    {
      id: "uti",
      label: "Urinary tract infection（泌尿道感染）",
      desc: "膀胱炎 / 腎盂腎炎",
      scenarios: [
        {
          label: "Acute uncomplicated cystitis（急性單純膀胱炎）",
          note: "當地抗藥性 >20% 避免使用。女性 3 天，男性 7 天",
          fixedPO: "1 DS tab BID",
          fixedPO_tabs: "2 錠 Morcasin BID",
        },
        {
          label: "Complicated UTI / Pyelonephritis（複雜性 UTI / 腎盂腎炎）",
          note: "48hr 改善者 5-7 天",
          fixedPO: "1 DS tab BID",
          fixedPO_tabs: "2 錠 Morcasin BID",
        },
        {
          label: "Cystitis prophylaxis（膀胱炎預防）",
          note: "持續性或性交後預防",
          fixedPO: "½ SS tab QD 或每週 3 次",
          fixedPO_tabs: "½ 錠 Morcasin",
          noRenalAdj: true,
        },
      ],
    },

    // ═══ 4. Stenotrophomonas ═══
    {
      id: "stenotrophomonas",
      label: "Stenotrophomonas maltophilia infection（嗜麥芽窄食單胞菌）",
      desc: "膀胱炎 / HAP-VAP / 菌血症",
      scenarios: [
        {
          label: "Cystitis（膀胱炎）",
          note: "輕度感染",
          tmpPerKg: { min: 4, max: 4 }, divisions: 2, freq: "Q12H", route: "BOTH",
        },
        {
          label: "HAP / VAP / Bacteremia（肺炎 / 菌血症）",
          note: "建議合併其他藥物。專家建議 TMP max 960 mg/day",
          tmpPerKg: { min: 8, max: 15 }, divisions: 3, freq: "Q8H", route: "BOTH",
        },
      ],
    },

    // ═══ 5. Elizabethkingia ═══
    {
      id: "elizabethkingia",
      label: "Elizabethkingia infection（伊麗莎白菌感染）",
      desc: "熱病建議 · 8-10 mg/kg/day IV",
      scenarios: [
        {
          label: "Elizabethkingia infection（伊麗莎白菌感染）",
          note: "熱病建議。天然對多數 β-lactams 及 aminoglycosides 抗藥。TMP-SMX 為少數有效藥物之一。建議依藥敏結果調整",
          tmpPerKg: { min: 8, max: 10 }, divisions: 3, freq: "Q6-8H", route: "IV",
        },
      ],
    },

    // ═══ 6. Nocardiosis ═══
    {
      id: "nocardiosis",
      label: "Nocardiosis（諾卡氏菌感染）",
      desc: "皮膚 / 肺部 / CNS / 散播性",
      scenarios: [
        {
          label: "Skin or lymphocutaneous（皮膚 / 淋巴皮膚型）",
          note: "無其他器官侵犯",
          tmpPerKg: { min: 5, max: 10 }, divisions: 2, freq: "Q12H", route: "PO",
        },
        {
          label: "Pulmonary, mild-moderate, immunocompetent（輕中度肺部，免疫正常）",
          tmpPerKg: { min: 5, max: 10 }, divisions: 2, freq: "Q12H", route: "PO",
        },
        {
          label: "Pulmonary, mild-moderate, immunocompromised（輕中度肺部，免疫低下）",
          tmpPerKg: { min: 15, max: 15 }, divisions: 3, freq: "Q8H", route: "PO",
        },
        {
          label: "Severe pulmonary / CNS / Disseminated / Bacteremia（嚴重 / CNS / 散播性）",
          note: "需合併用藥。療程 3 個月至 ≥1 年",
          tmpPerKg: { min: 15, max: 15 }, divisions: 4, freq: "Q6H", route: "IV",
        },
      ],
    },

    // ═══ 6. Toxoplasmosis ═══
    {
      id: "toxoplasmosis",
      label: "Toxoplasma gondii encephalitis（弓形蟲腦炎）",
      desc: "治療 10 mg/kg/day · 預防 1 DS BID",
      scenarios: [
        {
          label: "Treatment（治療）",
          note: "≥6 週；不完全反應可延長",
          tmpPerKg: { min: 10, max: 10 }, divisions: 2, freq: "Q12H", route: "BOTH",
        },
        {
          label: "Chronic maintenance / Secondary prophylaxis（次級預防）",
          fixedPO: "1 DS tab BID",
          fixedPO_tabs: "2 錠 Morcasin BID",
        },
      ],
    },

    // ═══ 7. Meningitis ═══
    {
      id: "meningitis",
      label: "Bacterial meningitis（細菌性腦膜炎）",
      desc: "MRSA / Listeria",
      scenarios: [
        {
          label: "MRSA / Listeria / susceptible GNB（腦膜炎）",
          tmpPerKg: { min: 5, max: 5 }, divisions: 4, freq: "Q6-8H", route: "IV",
        },
      ],
    },

    // ═══ 8. CNS abscess ═══
    {
      id: "cnsAbscess",
      label: "Intracranial / Spinal epidural abscess（顱內 / 脊髓膿瘍）",
      desc: "MRSA 替代",
      scenarios: [
        {
          label: "MRSA CNS abscess（MRSA 顱內/脊髓膿瘍）",
          note: "脊髓 4-8 週；腦部 6-8 週",
          tmpPerKg: { min: 5, max: 5 }, divisions: 3, freq: "Q8-12H", route: "IV",
        },
      ],
    },

    // ═══ 9. Endocarditis ═══
    {
      id: "endocarditis",
      label: "Endocarditis（心內膜炎）",
      desc: "S. aureus 口服降階",
      scenarios: [
        {
          label: "S. aureus endocarditis, oral step-down（心內膜炎，口服降階）",
          note: "資料有限。MRSA 或 penicillin 過敏 MSSA。連同初期 IV 共 6 週",
          fixedPO: "2 DS tab BID × 6 週",
          fixedPO_tabs: "4 錠 Morcasin BID",
        },
      ],
    },

    // ═══ 10. Osteomyelitis ═══
    {
      id: "osteomyelitis",
      label: "Osteomyelitis / Discitis（骨髓炎）",
      desc: "MRSA / GNB · 通常 6 週",
      scenarios: [
        {
          label: "Gram-negative（GNB 骨髓炎）",
          fixedPO: "1-2 DS tab BID",
          fixedPO_tabs: "2-4 錠 Morcasin BID",
        },
        {
          label: "MRSA（MRSA 骨髓炎）",
          note: "建議合併 rifampin。通常 6 週",
          tmpPerKg: { min: 5, max: 10 }, divisions: 3, freq: "Q8H", route: "BOTH",
        },
      ],
    },

    // ═══ 11. Septic arthritis ═══
    {
      id: "septicArthritis",
      label: "Septic arthritis（化膿性關節炎）",
      desc: "MRSA · 3-4 週",
      scenarios: [
        {
          label: "MRSA / MSSA septic arthritis（化膿性關節炎）",
          note: "口服降階。3-4 週",
          fixedPO: "2 DS tab BID 或 4 mg/kg BID（max TMP 320 mg/dose）",
          fixedPO_tabs: "4 錠 Morcasin BID",
        },
      ],
    },

    // ═══ 12. PJI ═══
    {
      id: "pji",
      label: "Prosthetic joint infection（人工關節感染）",
      desc: "MRSA / GNB 口服續用 · ≥3 個月",
      scenarios: [
        {
          label: "PJI oral continuation（人工關節，口服延續）",
          note: "S. aureus 合併 rifampin。≥3 個月",
          fixedPO: "1 DS tab BID",
          fixedPO_tabs: "2 錠 Morcasin BID",
        },
      ],
    },

    // ═══ 13. Prostatitis ═══
    {
      id: "prostatitis",
      label: "Prostatitis（前列腺炎）",
      desc: "急性 2-4 週 / 慢性 4-6 週",
      scenarios: [
        {
          label: "Acute bacterial prostatitis（急性）",
          note: "2-4 週",
          fixedPO: "1 DS tab BID",
          fixedPO_tabs: "2 錠 Morcasin BID",
        },
        {
          label: "Chronic bacterial prostatitis（慢性）",
          note: "4-6 週",
          fixedPO: "1 DS tab BID",
          fixedPO_tabs: "2 錠 Morcasin BID",
        },
      ],
    },

    // ═══ 14. Diabetic foot ═══
    {
      id: "diabeticFoot",
      label: "Diabetic foot infection（糖尿病足感染）",
      desc: "輕中度 · MRSA 風險",
      scenarios: [
        {
          label: "Mild-moderate diabetic foot（輕中度糖尿病足）",
          note: "含 MRSA 覆蓋。常合併用藥。皮膚軟組織為主 1-2 週",
          fixedPO: "1-2 DS tab BID",
          fixedPO_tabs: "2-4 錠 Morcasin BID",
        },
      ],
    },

    // ═══ 15. IAI ═══
    {
      id: "iai",
      label: "Intra-abdominal infection（腹腔感染）",
      desc: "急性憩室炎 · 合併 metronidazole",
      scenarios: [
        {
          label: "Acute diverticulitis（急性憩室炎）",
          note: "合併 metronidazole。4-14 天",
          fixedPO: "1 DS tab BID + metronidazole",
          fixedPO_tabs: "2 錠 Morcasin BID",
        },
      ],
    },

    // ═══ 16. Pneumonia ═══
    {
      id: "pneumonia",
      label: "Pneumonia, community-acquired（CAP 社區型肺炎）",
      desc: "MRSA 覆蓋替代",
      scenarios: [
        {
          label: "CAP, MRSA coverage（CAP，MRSA 覆蓋）",
          note: "替代藥物。合併 combination。MRSA 療程 ≥7 天",
          fixedPO: "2 DS tab BID",
          fixedPO_tabs: "4 錠 Morcasin BID",
        },
      ],
    },

    // ═══ 17. SBP prophylaxis ═══
    {
      id: "sbpProphylaxis",
      label: "Spontaneous bacterial peritonitis, prophylaxis（SBP 預防）",
      desc: "肝硬化 · 1 DS tab QD",
      scenarios: [
        {
          label: "SBP prophylaxis（SBP 預防）",
          note: "肝硬化 + GI 出血或 ascites protein <1 g/dL 等高風險者",
          fixedPO: "1 DS tab QD",
          fixedPO_tabs: "2 錠 Morcasin QD",
          noRenalAdj: true,
        },
      ],
    },

    // ═══ 18. COPD ═══
    {
      id: "copd",
      label: "COPD acute exacerbation（COPD 急性惡化）",
      desc: "替代藥物 · 5-7 天",
      scenarios: [
        {
          label: "COPD acute exacerbation（COPD 急性惡化）",
          note: "Pseudomonas 風險避免使用。5-7 天",
          fixedPO: "1 DS tab Q12H × 5-7 天",
          fixedPO_tabs: "2 錠 Morcasin Q12H",
        },
      ],
    },

    // ═══ 19. Melioidosis ═══
    {
      id: "melioidosis",
      label: "Melioidosis / Glanders（類鼻疽 / 鼻疽）",
      desc: "合併 intensive → 口服根除",
      scenarios: [
        {
          label: "Initial intensive therapy（初始強化，合併用藥）",
          note: "與 ceftazidime 或 meropenem 合併，≥14 天。依體重：<40 kg 160 mg Q12H / 40-60 kg 240 mg Q12H / >60 kg 320 mg Q12H",
          fixedPO: "依體重：<40 kg TMP 160 mg Q12H / 40-60 kg 240 mg / >60 kg 320 mg Q12H",
          fixedPO_tabs: "依體重：<40 kg 2 錠 / 40-60 kg 3 錠 / >60 kg 4 錠 Morcasin Q12H",
        },
        {
          label: "Eradication therapy（口服根除）",
          note: "≥3 個月（骨頭/CNS 6 個月）",
          fixedPO: "依體重：同 intensive 劑量",
          fixedPO_tabs: "同上",
        },
      ],
    },

    // ═══ 20. Salmonella / Shigella ═══
    {
      id: "salmonellaShigella",
      label: "Salmonella / Shigella infection（沙門氏 / 志賀氏菌）",
      desc: "胃腸炎 / 菌血症",
      scenarios: [
        {
          label: "Nontyphoidal Salmonella（嚴重/高風險）",
          note: "免疫正常 10-14 天；HIV ≥14 天",
          tmpPerKg: { min: 8, max: 10 }, divisions: 3, freq: "Q8H", route: "BOTH",
        },
        {
          label: "Shigellosis（志賀菌感染）",
          note: "先確認藥敏。5-7 天",
          tmpPerKg: { min: 4, max: 4 }, divisions: 2, freq: "Q12H", route: "BOTH",
        },
      ],
    },

    // ═══ 21. Bartonella ═══
    {
      id: "bartonella",
      label: "Bartonella spp. infection（巴東體菌 / 貓抓病）",
      desc: "淋巴炎 / 散播性",
      scenarios: [
        {
          label: "Cat scratch disease, lymphadenitis（貓抓病淋巴炎）",
          note: "7-10 天",
          fixedPO: "1 DS tab BID × 7-10 天",
          fixedPO_tabs: "2 錠 Morcasin BID",
        },
        {
          label: "Cat scratch disease, disseminated（散播性，CNS / 視網膜炎）",
          note: "合併 rifampin。CNS 10-14 天；視網膜炎 4-6 週",
          tmpPerKg: { min: 4, max: 4 }, divisions: 2, freq: "Q12H", route: "BOTH",
        },
      ],
    },

    // ═══ 22. Other infections ═══
    {
      id: "other",
      label: "Other infections（其他感染）",
      desc: "Q fever / 鼠疫 / 布氏桿菌 / 咬傷 / 環孢子蟲 / 乳腺炎 / 手術預防",
      scenarios: [
        {
          label: "Q fever, acute（急性 Q 熱，孕婦替代）",
          note: "14 天",
          fixedPO: "1 DS tab BID × 14 天",
          fixedPO_tabs: "2 錠 Morcasin BID",
        },
        {
          label: "Plague, prophylaxis（鼠疫暴露後預防）",
          note: "7 天",
          tmpPerKg: { min: 5, max: 5 }, divisions: 2, freq: "Q12H", route: "PO",
        },
        {
          label: "Plague, treatment（鼠疫治療）",
          note: "7-14 天",
          tmpPerKg: { min: 5, max: 5 }, divisions: 3, freq: "Q8H", route: "BOTH",
        },
        {
          label: "Brucellosis（布氏桿菌病）",
          note: "合併用藥。非複雜 6 週；neurobrucellosis ≥12 週",
          fixedPO: "1 DS tab BID",
          fixedPO_tabs: "2 錠 Morcasin BID",
        },
        {
          label: "Bite wound infection（咬傷）",
          note: "合併厭氧菌覆蓋。預防 3-5 天；感染 5-14 天",
          fixedPO: "1 DS tab BID + 厭氧菌覆蓋",
          fixedPO_tabs: "2 錠 Morcasin BID",
        },
        {
          label: "Cyclosporiasis / Cystoisosporiasis（環孢子蟲 / 等孢子蟲症）",
          note: "免疫正常 7-10 天；HIV 14 天",
          fixedPO: "1 DS tab BID",
          fixedPO_tabs: "2 錠 Morcasin BID",
        },
        {
          label: "Mastitis, lactational（哺乳期乳腺炎，MRSA 風險）",
          note: "10-14 天",
          fixedPO: "1 DS tab BID × 10-14 天",
          fixedPO_tabs: "2 錠 Morcasin BID",
        },
        {
          label: "Surgical prophylaxis（高風險泌尿外科預防）",
          note: "術前 60-120 分鐘",
          fixedPO: "1 DS tab × 1（術前 60-120 分鐘）",
          fixedPO_tabs: "2 錠 Morcasin × 1",
          noRenalAdj: true,
        },
      ],
    },

  ], // ← end of indications

  // ──────────────────────────────────────────────────────────────
  // calculate()
  // ──────────────────────────────────────────────────────────────
  calculate({ dosing_weight, crcl, rrt, indicationData, extras }) {
    const isWaterLimit = !!extras?.waterLimit;

    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const { rows, warnings } = buildDoseRows(dosing_weight, crcl, rrt, sc, isWaterLimit);
      return { title: sc.label, rows, warnings };
    });

    return { scenarioResults };
  },

  // ═══════════════════════════════════════════════════════════════
  // 臨床參考
  // ═══════════════════════════════════════════════════════════════
  clinicalPearls: {
    title: "臨床參考",
    sections: [
      {
        heading: "藥物特性",
        body:
          "• TMP-SMX（Trimethoprim + Sulfamethoxazole，固定 1:5 比例）\n" +
          "• 劑量以 TMP 成分表示\n" +
          "• PO 生體可用率接近 100% → PO ↔ IV 等量換算\n" +
          "• 殺菌機制：同時抑制葉酸合成途徑的兩個步驟",
      },
      {
        heading: "院內品項",
        body:
          "• PO：Morcasin 錠（孟克杏）= TMP 80 mg / SMX 400 mg（= SS tab）\n" +
          "  DS tab（Double Strength）= 2 錠 Morcasin = TMP 160 mg\n\n" +
          "• IV：Sevatrim 針（雪白淨）= TMP 80 mg / SMX 400 mg 每支（5 mL）\n" +
          "  稀釋：標準 125 mL D5W/支；限水 75 mL D5W/支",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• MRSA（PO 口服首選之一！）\n" +
          "• Stenotrophomonas maltophilia（首選！）\n" +
          "• Elizabethkingia spp.（少數有效藥物之一）\n" +
          "• Nocardia spp.\n" +
          "• Pneumocystis jirovecii（PJP）\n" +
          "• Toxoplasma gondii\n" +
          "• Enterobacterales（部分）\n" +
          "• Listeria monocytogenes（替代）\n\n" +
          "【不涵蓋】\n" +
          "• Pseudomonas aeruginosa\n" +
          "• Anaerobes\n" +
          "• Group A Streptococcus（治療無效）\n" +
          "• Enterococcus",
      },
      {
        heading: "劑量速查（依 TMP 計算）",
        body:
          "【一般感染】4-8 mg/kg/day ÷ BID\n" +
          "【PJP 治療】15-20 mg/kg/day ÷ TID-QID × 21 天\n" +
          "【PJP 預防】1 DS tab QD\n" +
          "【Stenotrophomonas HAP/VAP】8-15 mg/kg/day ÷ TID\n" +
          "【Elizabethkingia】8-10 mg/kg/day ÷ TID-QID IV（熱病）\n" +
          "【Nocardia 嚴重】15 mg/kg/day ÷ QID\n" +
          "【Toxoplasmosis 治療】10 mg/kg/day ÷ BID\n" +
          "【Meningitis】5 mg/kg/dose Q6-8H IV",
      },
      {
        heading: "腎功能調整",
        body:
          "CrCl >30：不需調整\n" +
          "CrCl 15-30：劑量減半\n" +
          "CrCl <15：劑量減半 + Q24H\n" +
          "HD：劑量減半，透析後給藥\n" +
          "PD：比照 CrCl <15\n" +
          "CRRT：劑量減半，維持 Q12H\n\n" +
          "⚠️ PJP 預防和手術預防等低劑量不需腎調",
      },
      {
        heading: "副作用與監測",
        body:
          "• 高血鉀（TMP 抑制 ENaC → 類似 amiloride 效應）\n" +
          "• 骨髓抑制（嗜中性球低下、血小板低下、貧血）\n" +
          "• Scr 假性升高（TMP 抑制 creatinine 分泌，非真正腎損傷）\n" +
          "• 皮疹（含 Stevens-Johnson syndrome，罕見）\n" +
          "• 肝毒性（罕見）\n\n" +
          "高劑量（≥15 mg/kg/day）建議監測：CBC、電解質（K⁺）、Scr、LFT",
      },
      {
        heading: "肥胖",
        body: "UpToDate 建議用 Adjusted Body Weight（IBW + 0.4 × (TBW-IBW)）計算 mg/kg 劑量。",
      },
    ],
  },
};
