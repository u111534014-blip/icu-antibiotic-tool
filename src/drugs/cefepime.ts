import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Cefepime（Antifect / 革菌素）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Antifect 針（革菌素注射劑）1000 mg/Vial = 1 g/Vial
//
// 特性：
//   - 第四代 cephalosporin，比三代更好穿透 GNB 外膜
//   - 涵蓋 MSSA、Pseudomonas、部分 AmpC-producing Enterobacterales
//   - ESBL：高劑量（2g Q8H）可能有效，但首選仍是 carbapenem
//   - 三種輸注方式：Traditional (30 min) / Extended (3-4 hr) / Continuous (24 hr)
//   - 腎調依「原始建議劑量」分 4 種不同的調整表（最複雜！）
//
// 肝功能：CTP A–C 不需調整
// 肥胖：一般用 traditional 2g Q8H；BMI >40 或重症建議 extended infusion
// ═══════════════════════════════════════════════════════════════

const MG_PER_VIAL = 1000; // 1 g/Vial

// Helper：支數（最接近半支）
function toHalfVials(mg: number): string {
  const raw = mg / MG_PER_VIAL;
  const half = Math.round(raw * 2) / 2;
  if (raw === 0.25) return "0.25 支（1/4 支，取半支再分半）";
  if (half === 0.5) return "0.5 支（半支）";
  if (half % 1 === 0) return `${half} 支`;
  return `${half} 支`;
}

// ═══════════════════════════════════════════════════════════════
// 腎調表：依「原始建議劑量」分 4 欄
// 每欄有 4 個 CrCl 級距的調整結果
// ═══════════════════════════════════════════════════════════════
type DoseEntry = { dose_mg: number; freq: string };
type RenalColumn = {
  label: string;            // e.g. "1 g Q12H"
  tiers: DoseEntry[];       // index 0: >60, 1: 30-60, 2: 11-29, 3: <11
};

// 注意：第 3 欄 (1g Q6H) 的 CrCl 30-60 有特殊切點（50-60 vs 30-49）
// 為了簡化，CrCl 30-60 統一用較保守的 1g Q8H
const RENAL_COLUMNS: Record<string, RenalColumn> = {
  "1g_q12h": {
    label: "1 g Q12H",
    tiers: [
      { dose_mg: 1000, freq: "Q12H" },   // >60
      { dose_mg: 1000, freq: "Q24H" },   // 30-60
      { dose_mg: 500,  freq: "Q24H" },   // 11-29
      { dose_mg: 250,  freq: "Q24H" },   // <11
    ],
  },
  "2g_q12h": {
    label: "2 g Q12H",
    tiers: [
      { dose_mg: 2000, freq: "Q12H" },
      { dose_mg: 1000, freq: "Q12H" },
      { dose_mg: 1000, freq: "Q24H" },
      { dose_mg: 500,  freq: "Q24H" },
    ],
  },
  "1g_q6h": {
    label: "1 g Q6H",
    tiers: [
      { dose_mg: 1000, freq: "Q6H" },
      { dose_mg: 1000, freq: "Q8H" },    // CrCl 30-49 用 Q8H；50-60 不調
      { dose_mg: 1000, freq: "Q12H" },
      { dose_mg: 1000, freq: "Q24H" },
    ],
  },
  "2g_q8h": {
    label: "2 g Q8H",
    tiers: [
      { dose_mg: 2000, freq: "Q8H" },
      { dose_mg: 2000, freq: "Q12H" },
      { dose_mg: 1000, freq: "Q12H" },   // 或 2g Q24H（嚴重感染偏好 1g Q12H）
      { dose_mg: 1000, freq: "Q24H" },
    ],
  },
};

// 根據 CrCl 取得 tier index
function getTierIndex(crcl: number): number {
  if (crcl > 60) return 0;
  if (crcl >= 30) return 1;
  if (crcl >= 11) return 2;
  return 3;
}

// 取得腎調後的劑量
function getRenalDose(crcl: number, rrt: string, baseKey: string): {
  dose_mg: number;
  freq: string;
  note: string;
} {
  if (rrt === "hd") {
    // HD：依原始劑量決定
    // 2g Q8H 或 1g Q6H → 1g Q24H daily（透析後給）
    // 其他 → 500mg Q24H daily（透析後給）
    const isHighDose = baseKey === "2g_q8h" || baseKey === "1g_q6h";
    return {
      dose_mg: isHighDose ? 1000 : 500,
      freq: "Q24H",
      note: "HD：透析可移除 70-85%（high-flux）。每日給藥（透析日透析後給）。另有 3x/week post-HD 方案（見臨床參考）",
    };
  }
  if (rrt === "pd") {
    return {
      dose_mg: 1000,
      freq: "Q24H",
      note: "PD：1 g Q24H",
    };
  }
  if (rrt === "cvvh") {
    return {
      dose_mg: 2000,
      freq: "Q8–12H",
      note: "CRRT（CVVH/D/HDF）：2 g Q8-12H。重症或 sepsis 偏好 Q8H。effluent <20 mL/kg/hr 用 Q12H；≥35 mL/kg/hr 用 Q8H",
    };
  }

  // 一般 CKD
  const col = RENAL_COLUMNS[baseKey];
  if (!col) {
    return { dose_mg: 2000, freq: "Q8H", note: "⚠️ 無法對應腎調表" };
  }
  const tier = getTierIndex(crcl);
  const entry = col.tiers[tier];

  let note = "";
  if (tier === 0) {
    note = "CrCl >60：不需調整";
  } else {
    note = `CrCl ${Math.round(crcl)} mL/min → 依「${col.label}」欄調整`;
  }

  // CrCl 11-29 + 2g Q8H 的特殊說明
  if (baseKey === "2g_q8h" && tier === 2) {
    note += "（嚴重感染偏好 1 g Q12H 以增加 PD target attainment；另可選 2 g Q24H）";
  }

  return { dose_mg: entry.dose_mg, freq: entry.freq, note };
}

export const cefepime: Drug = {
  name: "Maxipime",
  subtitle: "Cefepime",
  searchTerms: [
    "cefepime", "antifect", "革菌素", "Maxipime", "邁菌平",
    "四代", "4th gen cephalosporin",
  ],

  needsRenal: true,
  needsWeight: true,
  needsHepatic: false,

  indications: [

    // ═══ 1. BSI ═══
    {
      id: "bsi",
      label: "Bloodstream infection（菌血症）",
      desc: "社區型 vs 醫療相關",
      scenarios: [
        {
          label: "Community-acquired, no sepsis/shock（社區型，無 sepsis）",
          note: "免疫正常、過去 3-6 月無 PsA 感染。療程 7-14 天（單純 Enterobacteriaceae + 反應佳 7 天即可）",
          baseDose: "2g_q12h",
          doseDisplay: "2 g Q12H",
        },
        {
          label: "Healthcare-associated / Sepsis / PsA coverage（醫療相關 / Sepsis / PsA 覆蓋）",
          note: "含 catheter-related、免疫低下、sepsis/shock、需涵蓋 PsA。Sepsis + GNB 或 neutropenia + PsA 部分專家合併第二隻 anti-GNB。重症考慮 extended/continuous infusion",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H",
        },
      ],
    },

    // ═══ 2. Cystic fibrosis ═══
    {
      id: "cf",
      label: "Cystic fibrosis, acute pulmonary exacerbation（CF 急性肺惡化）",
      desc: "2 g Q8H + combination · 10-14 天",
      scenarios: [
        {
          label: "CF acute exacerbation（CF 急性肺惡化）",
          note: "經驗或導向治療 PsA / GNB。合併 combination regimen。部分專家偏好 extended/continuous infusion。療程 10-14 天",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H",
        },
      ],
    },

    // ═══ 3. Diabetic foot ═══
    {
      id: "diabeticFoot",
      label: "Diabetic foot infection（糖尿病足感染）",
      desc: "2 g Q8-12H + combination · 2-4 週",
      scenarios: [
        {
          label: "Diabetic foot, moderate-severe（糖尿病足，中度-重度）",
          note: "合併其他適當抗生素。懷疑 PsA 用 Q8H。無骨髓炎時 2-4 週（含口服降階）",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8-12H（懷疑 PsA 用 Q8H）",
        },
      ],
    },

    // ═══ 4. IAI ═══
    {
      id: "iai",
      label: "Intra-abdominal infection（腹內感染）",
      desc: "醫療相關或高風險社區型",
      scenarios: [
        {
          label: "Acute cholecystitis（急性膽囊炎）",
          note: "懷疑 PsA 用 Q8H。術後持續 1 天或非手術到臨床緩解",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8-12H（懷疑 PsA 用 Q8H）",
        },
        {
          label: "Other IAI（闌尾炎、膽管炎、憩室炎、IAA 等）",
          note: "合併 metronidazole（± 其他藥物）。懷疑 PsA 用 Q8H。源頭控制後 4-5 天。重症或高抗藥風險考慮 extended/continuous infusion",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8-12H + metronidazole",
        },
      ],
    },

    // ═══ 5. CNS ═══
    {
      id: "cns",
      label: "CNS infection（中樞神經感染）",
      desc: "腦膿瘍、硬膜外膿瘍、細菌性腦膜炎",
      scenarios: [
        {
          label: "Brain / Spinal epidural abscess（腦膿瘍 / 脊髓硬膜外膿瘍）",
          note: "有 PsA 或抗藥 GNB 風險者（神經外科術後或免疫低下）。合併 combination regimen。脊髓 4-8 週；腦膿瘍 6-8 週",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H",
        },
        {
          label: "Bacterial meningitis（細菌性腦膜炎）",
          note: "醫療相關或免疫低下的經驗治療，或 GNB（含 PsA）導向治療。合併 combination regimen。GNB 療程 ≥10-14 天（部分專家 21 天）",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H",
        },
      ],
    },

    // ═══ 6. Neutropenic fever ═══
    {
      id: "fn",
      label: "Neutropenic fever, high-risk（高風險中性球低下發燒）",
      desc: "2 g Q8H 至退燒 ≥48hr + ANC ≥500",
      scenarios: [
        {
          label: "Febrile neutropenia, empiric（中性球低下發燒，經驗治療）",
          note: "高風險：ANC ≤100 >7 天或有共病（sepsis、mucositis、肝腎功能不全）。治療至退燒 ≥48hr + ANC ≥500 且上升中。重症考慮 extended/continuous infusion",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H",
        },
      ],
    },

    // ═══ 7. Osteomyelitis ═══
    {
      id: "osteo",
      label: "Osteomyelitis / Discitis（骨髓炎 / 椎間盤炎）",
      desc: "2 g Q8-12H · 通常 6 週",
      scenarios: [
        {
          label: "Osteomyelitis / Discitis（骨髓炎 / 椎間盤炎）",
          note: "懷疑 PsA 用 Q8H。經驗治療合併 combination regimen。通常 6 週，可部分轉口服。截肢完全切除者可短",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8-12H",
        },
      ],
    },

    // ═══ 8. PD peritonitis ═══
    {
      id: "pd_peritonitis",
      label: "Peritonitis, PD（腹膜透析腹膜炎）",
      desc: "IP 給藥優先",
      scenarios: [
        {
          label: "Intermittent IP（間歇性腹腔內給藥）",
          note: "1 g 加入透析液 QD，至少留置 6 小時。殘餘腎功能佳者（尿量 >100 mL/day）考慮加量 25%。反應良好 ≥3 週；5 天未改善考慮拔管",
          baseDose: "1g_q12h",
          doseDisplay: "IP 1 g QD（加入透析液）",
        },
        {
          label: "Continuous IP（每次 CAPD 交換都給）",
          note: "Loading 500 mg/L（首袋），之後 125 mg/L 每袋。反應良好 ≥3 週",
          baseDose: "1g_q12h",
          doseDisplay: "IP LD 500 mg/L → MD 125 mg/L",
        },
      ],
    },

    // ═══ 9. Pneumonia ═══
    {
      id: "pneumonia",
      label: "Pneumonia（肺炎）",
      desc: "CAP（有 PsA 風險）/ HAP / VAP",
      scenarios: [
        {
          label: "CAP, inpatient with PsA risk（CAP，住院，有 PsA 風險）",
          note: "合併 combination regimen。總療程 ≥5 天（含口服降階）。免疫低下、複雜感染、PsA 可能需更長。停藥前需臨床穩定",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H",
        },
        {
          label: "HAP / VAP（院內 / 呼吸器相關肺炎）",
          note: "經驗治療常合併 combination regimen。通常 7 天。重症或高 MIC 考慮 extended/continuous infusion",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H",
        },
      ],
    },

    // ═══ 10. PJI ═══
    {
      id: "pji",
      label: "Prosthetic joint infection（人工關節感染）",
      desc: "2 g Q8-12H · 4-6 週",
      scenarios: [
        {
          label: "PJI, GNB directed（人工關節感染，GNB 導向）",
          note: "Resection arthroplasty 者通常 4-6 週",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8-12H",
        },
      ],
    },

    // ═══ 11. Sepsis ═══
    {
      id: "sepsis",
      label: "Sepsis / Septic shock（敗血症 / 敗血性休克）",
      desc: "2 g Q8H · 盡快給藥",
      scenarios: [
        {
          label: "Sepsis / Septic shock, empiric（敗血症經驗治療，含 PsA 覆蓋）",
          note: "合併其他藥物。辨識後盡快給藥（理想 1 小時內）。療程依來源和反應；非感染性病因確認後考慮停藥。部分專家偏好 extended/continuous infusion",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H",
        },
      ],
    },

    // ═══ 12. SSTI ═══
    {
      id: "ssti",
      label: "Skin & Soft tissue / Septic arthritis（皮膚軟組織 / 化膿性關節炎）",
      desc: "2 g Q8-12H · 依嚴重度 5-14 天 / 3-4 週",
      scenarios: [
        {
          label: "SSTI, moderate-severe（皮膚軟組織感染，中度-重度）",
          note: "有或有風險之抗藥 GNB（如 PsA）的經驗/導向治療。常合併 combination regimen。5-14 天",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8-12H",
        },
        {
          label: "Septic arthritis（化膿性關節炎）",
          note: "有或有 PsA 風險的經驗/導向治療。合併 combination regimen。總療程 3-4 週（無骨髓炎），含口服降階",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8-12H",
        },
      ],
    },

    // ═══ 13. UTI ═══
    {
      id: "uti",
      label: "Urinary tract infection（泌尿道感染）",
      desc: "複雜性 UTI / 腎盂腎炎",
      scenarios: [
        {
          label: "Complicated UTI / Pyelonephritis（複雜性 UTI）",
          note: "Enterobacterales MIC 4-8 的抗藥菌用 2g Q8H。48 小時內改善者 5-7 天（含口服降階）；全程 cefepime 7 天",
          baseDose: "2g_q8h",
          doseDisplay: "1-2 g Q8-12H",
        },
        {
          label: "UTI in pregnancy（孕婦 UTI）",
          note: "症狀改善後轉口服。總療程 14 天（部分專家 48 小時改善者 7-10 天）",
          baseDose: "1g_q12h",
          doseDisplay: "1 g Q12H",
        },
      ],
    },

  ], // ← end of indications

  // ──────────────────────────────────────────────────────────────
  // calculate()
  // ──────────────────────────────────────────────────────────────
  calculate({ crcl, rrt, indicationData }) {
    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const baseKey: string = sc.baseDose ?? "2g_q8h";
      const d = getRenalDose(crcl, rrt, baseKey);
      const warnings: string[] = [];

      // ARC
      const isARC = rrt === "none" && crcl >= 130;
      if (isARC) {
        warnings.push("⚡ ARC（CrCl ≥130）：建議 2 g Q6H，輸注 3 小時（extended infusion）。密切監測反應與神經毒性。考慮取得藥物濃度（若可行）");
      }

      // 神經毒性提醒（腎功能不全時風險增加）
      if (rrt !== "none" || crcl < 30) {
        warnings.push("🧠 腎功能不全時 cefepime 蓄積風險增加，注意監測神經毒性（意識改變、肌陣攣、癲癇）");
      }

      // Extended/Continuous infusion 提醒（大部分適應症都建議）
      if (baseKey === "2g_q8h") {
        warnings.push("💡 重症、AmpC 產生菌、高 MIC、BMI >40 者，考慮 extended infusion（3-4 hr）或 continuous infusion（4-6 g/24hr）以優化 PD target");
      }

      // PIRRT 額外說明
      if (rrt === "cvvh") {
        warnings.push("📌 PIRRT 劑量不同於 CRRT：Option 1: LD 2 g → 1 g Q6H；Option 2: PIRRT 開始時 2 g + 結束後 3 g。非 PIRRT 日按 CrCl <11 給藥");
      }

      const rows: any[] = [
        { label: "原始建議劑量", value: sc.doseDisplay, highlight: true },
        { label: "腎調後劑量", value: `${d.dose_mg >= 1000 ? d.dose_mg / 1000 + " g" : d.dose_mg + " mg"} ${d.freq}`, highlight: true },
        { label: "輸注方式", value: "Traditional：30 分鐘（或 extended 3-4 hr / continuous 24 hr）" },
        { label: "每次取藥", value: `${toHalfVials(d.dose_mg)} Antifect（每支 1 g）` },
        { label: "腎功能調整", value: d.note },
      ];

      // ARC 建議劑量另列
      if (isARC) {
        rows.splice(2, 0, {
          label: "⚡ ARC 建議劑量",
          value: "2 g Q6H，輸注 3 小時（2 支 Q6H）",
          highlight: true,
        });
      }

      if (sc.note) {
        rows.push({ label: "療程與備註", value: sc.note });
      }

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
        heading: "藥物特性（熱病）",
        body:
          "• 第四代 cephalosporin（1996 年 FDA 核准），結構上能更快速穿透 GNB 外膜\n" +
          "• 能避免部分 chromosomal β-lactamases 破壞\n" +
          "• 體外活性涵蓋：MSSA、Neisseria spp.、H. influenzae、廣泛 GNB（含 Pseudomonas aeruginosa）\n" +
          "• 抗 MSSA 活性比三代 cephalosporin 強\n" +
          "• ESBL-producing GNB：高劑量（2 g Q8H）可能有效，但首選仍是 carbapenem\n" +
          "• 替代藥物，用於抗藥菌基因型",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• MSSA（比三代更好）\n" +
          "• Pseudomonas aeruginosa\n" +
          "• Enterobacterales（含部分 AmpC-producing：E. cloacae、K. aerogenes、C. freundii）\n" +
          "• Neisseria spp.、H. influenzae\n" +
          "• Streptococci\n\n" +
          "【不涵蓋】\n" +
          "• MRSA\n" +
          "• Enterococcus\n" +
          "• Anaerobes（需合併 metronidazole）\n" +
          "• ESBL（高劑量可能有效但不首選 → 用 carbapenem）\n" +
          "• Acinetobacter（大部分抗藥）\n" +
          "• Stenotrophomonas maltophilia",
      },
      {
        heading: "三種輸注方式",
        body:
          "▸ Traditional（標準）：30 分鐘\n" +
          "  適用大部分非重症感染\n\n" +
          "▸ Extended infusion（延長輸注）：3-4 小時（off-label）\n" +
          "  首選用於：AmpC 產生菌、重症、ARC、BMI >40、高 MIC\n" +
          "  可先給首劑 30 分鐘（快速達標），之後改 3-4 hr\n\n" +
          "▸ Continuous infusion（連續輸注）：4-6 g/24 hr（off-label）\n" +
          "  可先給 LD 2 g over 30 min（sepsis 快速達標）\n" +
          "  部分專家在重症時偏好此法",
      },
      {
        heading: "腎功能調整速查表",
        body:
          "⚠️ Cefepime 腎調特殊：依「原始建議劑量」分 4 欄，每欄調整方式不同！\n\n" +
          "【原始 1 g Q12H】\n" +
          "  CrCl >60: 不調 → 30-60: 1g Q24H → 11-29: 500mg Q24H → <11: 250mg Q24H\n\n" +
          "【原始 2 g Q12H】\n" +
          "  CrCl >60: 不調 → 30-60: 1g Q12H → 11-29: 1g Q24H → <11: 500mg Q24H\n\n" +
          "【原始 1 g Q6H】\n" +
          "  CrCl >60: 不調 → 30-49: 1g Q8H → 11-29: 1g Q12H → <11: 1g Q24H\n" +
          "  （CrCl 50-60 不需調整）\n\n" +
          "【原始 2 g Q8H】\n" +
          "  CrCl >60: 不調 → 30-60: 2g Q12H → 11-29: 1g Q12H（或 2g Q24H）→ <11: 1g Q24H\n\n" +
          "ARC (≥130): 2g Q6H extended infusion 3hr\n" +
          "HD: daily 500mg-1g Q24H（透析後）；或 3x/week post-HD 方案\n" +
          "PD: 1g Q24H\n" +
          "CRRT: 2g Q8-12H\n" +
          "PIRRT: LD 2g → 1g Q6H；或 PIRRT 開始 2g + 結束後 3g",
      },
      {
        heading: "HD 3x/week post-dialysis 方案（詳細）",
        body:
          "【2 天間隔（下次透析在 48hr 後）】\n" +
          "• 無尿 + MIC <4：1.5 g post-HD\n" +
          "• 經驗治療 / 有殘餘腎功能 / MIC ≥4：2 g post-HD\n\n" +
          "【3 天間隔（下次透析在 72hr 後）】\n" +
          "• 無尿 + MIC <4：2 g post-HD\n" +
          "• 經驗治療 / 有殘餘腎功能 / MIC ≥4：2 g post-HD",
      },
      {
        heading: "神經毒性",
        body:
          "Cefepime 在腎功能不全時蓄積風險增加，可導致：\n" +
          "• 意識改變（confusion、昏睡）\n" +
          "• 肌陣攣（myoclonus）\n" +
          "• 癲癇（seizures）\n" +
          "• 非痙攣性癲癇持續狀態（NCSE）\n\n" +
          "⚠️ 腎功能不全病人務必調整劑量並密切監測神經學症狀。\n" +
          "疑似時考慮 EEG + 停藥/減量。",
      },
      {
        heading: "肝功能 / 肥胖",
        body:
          "• 肝功能：CTP A–C 不需調整\n" +
          "• 肥胖：Traditional 2g Q8H 一般適用。BMI >40、生命危急感染、高 MIC、重症、ARC → 建議 extended infusion 2g Q8H over 3-4hr",
      },
      {
        heading: "院內品項",
        body: "Antifect 針（革菌素注射劑）1000 mg/Vial = 1 g/Vial",
      },
    ],
  },
};
