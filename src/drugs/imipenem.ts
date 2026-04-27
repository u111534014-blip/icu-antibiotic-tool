import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Culin（Imipenem / Cilastatin）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Culin 針 500 mg/Vial（以 imipenem 計）
//
// 劑量表達：以 imipenem 成分含量表示
// 給藥方式：
//   - Traditional：30 min（500 mg）或 40-60 min（1 g）
//   - Extended infusion（off-label）：3 hr → CRE、CRAB 等抗藥菌建議
//
// ⚠️ 癲癇風險高於 meropenem → 腎功能不全時務必調整劑量
// ⚠️ CrCl <15 且未接受 HD → 不建議使用（除非 48hr 內開始 HD）
// 肝功能：無特殊調整建議
// ═══════════════════════════════════════════════════════════════

const MG_PER_VIAL = 500; // 每支 500 mg（imipenem）

// Helper：支數（最接近半支）
function toHalfVials(mg: number): string {
  const raw = mg / MG_PER_VIAL;
  const half = Math.round(raw * 2) / 2;
  if (half === 0.5) return "0.5 支（半支）";
  if (half % 1 === 0) return `${half} 支`;
  return `${half} 支`;
}

// ── 腎調表（依原始劑量分 3 欄）──────────────────────────────────
// [0] ≥60, [1] 30-59, [2] 15-29, [3] <15
type DoseEntry = { dose_mg: number; freq: string; alt?: string };
type RenalColumn = { label: string; tiers: DoseEntry[] };

const RENAL_COLS: Record<string, RenalColumn> = {
  "500_q6h": {
    label: "500 mg Q6H",
    tiers: [
      { dose_mg: 500, freq: "Q6H" },                                      // ≥60
      { dose_mg: 250, freq: "Q6H", alt: "或 500 mg Q8H" },               // 30-59
      { dose_mg: 250, freq: "Q8H", alt: "或 500 mg Q12H" },              // 15-29
      { dose_mg: 0,   freq: "—" },                                        // <15：不建議
    ],
  },
  "1g_q8h": {
    label: "1 g Q8H",
    tiers: [
      { dose_mg: 1000, freq: "Q8H" },
      { dose_mg: 500,  freq: "Q8H" },
      { dose_mg: 250,  freq: "Q8H", alt: "或 500 mg Q12H" },
      { dose_mg: 0,    freq: "—" },
    ],
  },
  "1g_q6h": {
    label: "1 g Q6H",
    tiers: [
      { dose_mg: 1000, freq: "Q6H" },
      { dose_mg: 500,  freq: "Q6H" },
      { dose_mg: 250,  freq: "Q6H" },
      { dose_mg: 0,    freq: "—" },
    ],
  },
};

function getTierIndex(crcl: number): number {
  if (crcl >= 60) return 0;
  if (crcl >= 30) return 1;
  if (crcl >= 15) return 2;
  return 3;
}

function getImipenemDose(crcl: number, rrt: string, baseKey: string): {
  dose_mg: number; freq: string; note: string;
} {
  const col = RENAL_COLS[baseKey] ?? RENAL_COLS["500_q6h"];

  if (rrt === "hd") {
    return {
      dose_mg: 500, freq: "Q12H",
      note: "HD：透析可移除 55%（imipenem）。250-500 mg Q12H，依感染嚴重度。透析日其中一劑安排在透析後給",
    };
  }
  if (rrt === "pd") {
    return {
      dose_mg: 500, freq: "Q12H",
      note: "PD：250-500 mg Q12H，依感染嚴重度",
    };
  }
  if (rrt === "cvvh") {
    return {
      dose_mg: 500, freq: "Q6-8H",
      note: "CRRT：LD 1 g × 1，之後 250 mg Q6H 或 500 mg Q6-8H。依感染嚴重度與 effluent rate 調整",
    };
  }

  const tier = getTierIndex(crcl);
  const entry = col.tiers[tier];

  // CrCl <15：不建議使用
  if (tier === 3) {
    return {
      dose_mg: 0, freq: "—",
      note: "⚠️ CrCl <15：不建議使用 imipenem/cilastatin（除非 48 小時內開始 HD）",
    };
  }

  let note = "";
  if (tier === 0) {
    note = "CrCl ≥60：不需調整";
  } else {
    note = `CrCl ${Math.round(crcl)}（${tier === 1 ? "30-59" : "15-29"}）→ 依「${col.label}」欄調整`;
    if (entry.alt) note += `（${entry.alt}）`;
  }

  return { dose_mg: entry.dose_mg, freq: entry.freq, note };
}

export const imipenem: Drug = {
  name: "Tienam",
  subtitle: "Imipenem / Cilastatin",
  searchTerms: [
    "imipenem", "cilastatin", "culin",
    "carbapenem", "tienam",
  ],

  needsRenal: true,
  needsWeight: true,
  needsHepatic: false,

  // ──────────────────────────────────────────────────────────────
  // 適應症（照 UpToDate 原文標題）
  // ──────────────────────────────────────────────────────────────
  indications: [

    // ═══ 1. Anthrax ═══
    {
      id: "anthrax",
      label: "Anthrax, systemic, treatment（全身性炭疽，治療）",
      desc: "1 g Q6H + combination · ≥2 週",
      scenarios: [
        {
          label: "Systemic anthrax, including meningitis（全身性炭疽，含腦膜炎）",
          note: "合併其他藥物 ≥2 週 IV；腦膜炎 ≥3 週。需加 antitoxin。氣溶膠暴露之免疫低下者轉暴露後預防，合計 60 天",
          baseDose: "1g_q6h",
          doseDisplay: "1 g Q6H IV",
        },
      ],
    },

    // ═══ 2. Bloodstream infection ═══
    {
      id: "bsi",
      label: "Bloodstream infection（菌血症）",
      desc: "500 mg Q6H · 7-14 天",
      scenarios: [
        {
          label: "Gram-negative bacteremia（GNB 菌血症）",
          note: "含 PsA 覆蓋或對其他藥物抗藥者的經驗/導向治療。Neutropenia、重度燒傷、sepsis/shock 合併第二隻 anti-GNB。重症或高 MIC 考慮 extended infusion。單純 Enterobacteriaceae + 反應佳 7 天；免疫低下可能需更長",
          baseDose: "500_q6h",
          doseDisplay: "500 mg Q6H IV",
        },
      ],
    },

    // ═══ 3. Cystic fibrosis ═══
    {
      id: "cf",
      label: "Cystic fibrosis, acute pulmonary exacerbation（CF 急性肺惡化）",
      desc: "500 mg-1 g Q6H + combination · 10-14 天",
      scenarios: [
        {
          label: "CF acute exacerbation（CF 急性肺惡化）",
          note: "經驗或導向治療 PsA / GNB。合併 combination regimen。部分專家偏好 extended infusion。10-14 天",
          baseDose: "500_q6h",
          doseDisplay: "500 mg-1 g Q6H IV",
        },
      ],
    },

    // ═══ 4. Diabetic foot infection ═══
    {
      id: "diabeticFoot",
      label: "Diabetic foot infection, moderate to severe（糖尿病足感染，中度-重度）",
      desc: "500 mg Q6H · 2-4 週",
      scenarios: [
        {
          label: "Diabetic foot infection（糖尿病足感染）",
          note: "有 PsA 風險（浸潤性潰瘍、溫暖環境）或其他抗藥 GNB 的經驗治療。2-4 週（無骨髓炎），含口服降階",
          baseDose: "500_q6h",
          doseDisplay: "500 mg Q6H IV",
        },
      ],
    },

    // ═══ 5. Endocarditis ═══
    {
      id: "endocarditis",
      label: "Endocarditis, treatment（心內膜炎）",
      desc: "抗藥 GNB（含 PsA）· combination · 6 週",
      scenarios: [
        {
          label: "Endocarditis, resistant GNB including PsA（心內膜炎，抗藥 GNB）",
          note: "合併 combination regimen。6 週",
          baseDose: "500_q6h",
          doseDisplay: "500 mg Q6H 或 1 g Q8H IV",
        },
      ],
    },

    // ═══ 6. Intra-abdominal infection ═══
    {
      id: "iai",
      label: "Intra-abdominal infection（腹內感染）",
      desc: "醫療相關或高風險社區型",
      scenarios: [
        {
          label: "Acute cholecystitis（急性膽囊炎）",
          note: "社區型保留給無法耐受 β-lactam 或有 ESBL 風險者。術後 1 天或臨床緩解",
          baseDose: "500_q6h",
          doseDisplay: "500 mg Q6H 或 1 g Q8H IV",
        },
        {
          label: "Other IAI（膽管炎、闌尾炎、憩室炎、腹腔膿瘍等）",
          note: "源頭控制後 4-5 天。重症或高抗藥風險考慮 extended infusion",
          baseDose: "500_q6h",
          doseDisplay: "500 mg Q6H 或 1 g Q8H IV",
        },
      ],
    },

    // ═══ 7. Melioidosis or glanders ═══
    {
      id: "melioidosis",
      label: "Melioidosis or glanders（類鼻疽 / 馬鼻疽）",
      desc: "替代藥物 · 25 mg/kg up to 1 g Q6-8H · ≥14 天",
      scenarios: [
        {
          label: "Melioidosis / Glanders, initial intensive（初始強化治療）",
          note: "替代藥物（部分專家偏好 meropenem）。25 mg/kg（最高 1 g）Q6-8H × ≥14 天。CNS/前列腺/骨關節/皮膚軟組織焦點加 TMP/SMX。之後口服根除治療 ≥12 週",
          baseDose: "1g_q6h",
          doseDisplay: "25 mg/kg（最高 1 g）Q6-8H IV",
        },
      ],
    },

    // ═══ 8. Mycobacterial infection ═══
    {
      id: "mycobacterial",
      label: "Mycobacterial infection（非結核分枝桿菌，快速生長型）",
      desc: "500 mg-1 g BID-TID + combination",
      scenarios: [
        {
          label: "Nontuberculous mycobacteria, rapidly growing（快速生長型 NTM）",
          note: "合併 combination regimen。500 mg-1 g BID（部分專家 TID）。IV 2-12 週後轉口服長期維持。建議會診感染科",
          baseDose: "500_q6h",
          doseDisplay: "500 mg-1 g BID-TID IV",
        },
      ],
    },

    // ═══ 9. Neutropenic fever ═══
    {
      id: "fn",
      label: "Neutropenic fever, high-risk（高風險中性球低下發燒）",
      desc: "500 mg Q6H 至退燒 ≥48hr + ANC ≥500",
      scenarios: [
        {
          label: "Febrile neutropenia, empiric（中性球低下發燒，經驗治療）",
          note: "高風險：ANC ≤100 >7 天或有共病。治療至退燒 ≥48hr + ANC ≥500 且上升中。重症考慮 extended infusion",
          baseDose: "500_q6h",
          doseDisplay: "500 mg Q6H IV",
        },
      ],
    },

    // ═══ 10. Nocardiosis ═══
    {
      id: "nocardiosis",
      label: "Nocardiosis, severe（嚴重 nocardiosis）",
      desc: "500 mg Q6H + combination · 6 個月-≥1 年",
      scenarios: [
        {
          label: "Nocardiosis, severe（嚴重 nocardiosis）",
          note: "需做藥敏。合併 combination regimen。6 個月-≥1 年（至少數週 IV 後轉口服）。建議會診感染科",
          baseDose: "500_q6h",
          doseDisplay: "500 mg Q6H IV",
        },
      ],
    },

    // ═══ 11. Peritonitis, PD ═══
    {
      id: "pd_peritonitis",
      label: "Peritonitis, treatment, peritoneal dialysis（腹膜透析腹膜炎）",
      desc: "IP 給藥優先",
      scenarios: [
        {
          label: "Intermittent IP（間歇性，每隔一袋）",
          note: "IP 給藥優先（除非 sepsis）。500 mg 加入透析液 every other exchange，至少留置 6 小時。反應良好 ≥3 週；5 天未改善考慮拔管",
          baseDose: "500_q6h",
          doseDisplay: "IP 500 mg every other exchange",
        },
        {
          label: "Continuous IP（每次 CAPD 交換都給）",
          note: "LD 250 mg/L（首袋），之後 50 mg/L 每袋。反應良好 ≥3 週",
          baseDose: "500_q6h",
          doseDisplay: "IP LD 250 mg/L → MD 50 mg/L",
        },
      ],
    },

    // ═══ 12. Pneumonia ═══
    {
      id: "pneumonia",
      label: "Pneumonia（肺炎）",
      desc: "CAP（MDR GNB 風險）/ HAP / VAP",
      scenarios: [
        {
          label: "Community-acquired pneumonia（CAP，有 MDR GNB 風險）",
          note: "合併 combination regimen。療程 ≥5 天（免疫低下/PsA 更長）。停藥前須臨床穩定",
          baseDose: "500_q6h",
          doseDisplay: "500 mg Q6H IV",
        },
        {
          label: "HAP / VAP（院內 / 呼吸器相關肺炎）",
          note: "保留給有或有 MDR GNB 風險者（ESBL、PsA、Acinetobacter）。通常 7 天。重症或高 MIC 考慮 extended infusion",
          baseDose: "500_q6h",
          doseDisplay: "500 mg Q6H IV",
        },
      ],
    },

    // ═══ 13. Sepsis and septic shock ═══
    {
      id: "sepsis",
      label: "Sepsis and septic shock（敗血症 / 敗血性休克）",
      desc: "500 mg Q6H 或 1 g Q8H · 盡快給藥",
      scenarios: [
        {
          label: "Sepsis / Septic shock, empiric（敗血症經驗治療，含 PsA 覆蓋）",
          note: "合併其他藥物。辨識後盡快給藥。療程依來源和反應；非感染性病因確認後考慮停藥。部分專家偏好 extended infusion",
          baseDose: "500_q6h",
          doseDisplay: "500 mg Q6H 或 1 g Q8H IV",
        },
      ],
    },

    // ═══ 14. Skin and soft tissue infection ═══
    {
      id: "ssti",
      label: "Skin and soft tissue infection, moderate to severe（皮膚軟組織感染，中度-重度）",
      desc: "壞死性 / 非壞死性",
      scenarios: [
        {
          label: "Necrotizing infection（壞死性感染）",
          note: "常合併 combination regimen。持續到不需清創 + 改善 + 退燒 ≥48hr",
          baseDose: "1g_q6h",
          doseDisplay: "1 g Q6-8H IV",
        },
        {
          label: "Non-necrotizing infection（非壞死性，含手術傷口感染）",
          note: "有或有 PsA / 抗藥菌風險者。5-14 天",
          baseDose: "500_q6h",
          doseDisplay: "500 mg Q6H IV",
        },
      ],
    },

    // ═══ 15. Spontaneous bacterial peritonitis ═══
    {
      id: "sbp",
      label: "Spontaneous bacterial peritonitis（自發性細菌性腹膜炎）",
      desc: "保留給重症或有 MDR 風險者 · 5-7 天",
      scenarios: [
        {
          label: "SBP, treatment（SBP 治療）",
          note: "保留給重症或有 MDR 風險者。5-7 天，發燒與腹痛緩解後可停",
          baseDose: "500_q6h",
          doseDisplay: "500 mg Q6H IV",
        },
      ],
    },

    // ═══ 16. Urinary tract infection ═══
    {
      id: "uti",
      label: "Urinary tract infection, complicated（複雜性泌尿道感染）",
      desc: "保留給重症或有 MDR 風險者",
      scenarios: [
        {
          label: "Complicated UTI / Pyelonephritis（複雜性 UTI / 腎盂腎炎）",
          note: "保留給重症或有 MDR（含 ESBL）風險者。48hr 改善者 5-7 天（全程 imipenem 7 天）",
          baseDose: "500_q6h",
          doseDisplay: "500 mg Q6H 或 1 g Q8H IV",
        },
      ],
    },

  ], // ← end of indications

  // ──────────────────────────────────────────────────────────────
  // calculate()
  // ──────────────────────────────────────────────────────────────
  calculate({ crcl, rrt, indicationData }) {
    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const baseKey: string = sc.baseDose ?? "500_q6h";
      const d = getImipenemDose(crcl, rrt, baseKey);
      const warnings: string[] = [];

      // ARC
      const isARC = rrt === "none" && crcl >= 130;
      if (isARC) {
        warnings.push("⚡ ARC（CrCl ≥130）：建議 1 g Q6H IV");
      }

      // CrCl <15 警告
      if (rrt === "none" && crcl < 15) {
        warnings.push("🚫 CrCl <15：不建議使用 imipenem/cilastatin（除非 48 小時內開始 HD）。考慮使用 meropenem 替代");
      }

      // 癲癇風險
      if (rrt !== "none" || crcl < 30) {
        warnings.push("🧠 腎功能不全時 imipenem 蓄積，癲癇風險增加（高於 meropenem）。務必調整劑量並監測神經學症狀");
      }

      // Extended infusion 提醒
      warnings.push("💡 CRE / CRAB / 高 MIC / 重症者，部分專家建議 extended infusion（500 mg Q6H over 3 hr）。可先給 LD 500 mg-1 g over 30 min");

      // PIRRT 提醒
      if (rrt === "cvvh") {
        warnings.push("📌 PIRRT：LD 500 mg-1 g → 250 mg Q6H 或 500 mg Q8H（PIRRT 日其中一劑在 PIRRT 後給）。⚠️ Monte Carlo 建議 750 Q6H 或 1g Q8H 才達 PK/PD target，但癲癇風險顯著增加 → 考慮改用其他藥物");
      }

      // 建立 rows
      const rows: any[] = [
        { label: "原始建議劑量", value: sc.doseDisplay, highlight: true },
      ];

      if (d.dose_mg > 0) {
        rows.push({
          label: "腎調後劑量",
          value: `${d.dose_mg} mg ${d.freq} IV`,
          highlight: true,
        });
        rows.push({
          label: "每次取藥",
          value: `${toHalfVials(d.dose_mg)} Culin（每支 500 mg）`,
        });
      } else {
        rows.push({
          label: "腎調後劑量",
          value: "🚫 不建議使用",
          highlight: true,
        });
      }

      rows.push({ label: "腎功能調整", value: d.note });

      if (isARC) {
        rows.push({
          label: "⚡ ARC 建議劑量",
          value: "1 g Q6H IV（2 支 Q6H）",
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
        heading: "藥物特性",
        body:
          "• Carbapenem（與 meropenem 同類）\n" +
          "• 需與 cilastatin 合用（防止腎小管代謝 imipenem）\n" +
          "• 癲癇風險高於 meropenem → 腎功能不全時務必調整劑量\n" +
          "• 兩種輸注方式：Traditional（30-60 min）/ Extended（3 hr，off-label）\n" +
          "• Extended infusion 建議用於 CRE、CRAB、高 MIC、重症",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• Enterobacterales（含 ESBL-producing）\n" +
          "• Pseudomonas aeruginosa\n" +
          "• Acinetobacter spp.（部分，高劑量 + extended infusion）\n" +
          "• Anaerobes（涵蓋！不需另加 metronidazole）\n" +
          "• MSSA、Streptococci\n" +
          "• Nocardia（部分種）\n\n" +
          "【不涵蓋】\n" +
          "• MRSA\n" +
          "• Enterococcus faecium（E. faecalis 通常涵蓋）\n" +
          "• Stenotrophomonas maltophilia（天然抗藥）\n" +
          "• CRE（大部分，除非合併其他藥物）",
      },
      {
        heading: "Imipenem vs Meropenem",
        body:
          "• Imipenem：抗 Acinetobacter 稍強(針對敏感菌株)\n" +
          "  但癲癇風險較高、腎功能不全時調整更複雜\n" +
          "• Meropenem：CNS 感染首選（穿透 BBB 較好、癲癇風險低）\n" +
          "  Q8H 給藥（vs imipenem Q6H）較方便\n" +
          "• 兩者對 ESBL 和 PsA 的涵蓋相似",
      },
      {
        heading: "腎功能調整速查表",
        body:
          "⚠️ 依「原始建議劑量」分 3 欄！CrCl <15 不建議使用！\n\n" +
          "【500 mg Q6H】\n" +
          "  ≥60: 不調 → 30-59: 250 Q6H（或 500 Q8H）\n" +
          "  → 15-29: 250 Q8H（或 500 Q12H）→ <15: 不建議\n\n" +
          "【1 g Q8H】\n" +
          "  ≥60: 不調 → 30-59: 500 Q8H\n" +
          "  → 15-29: 250 Q8H（或 500 Q12H）→ <15: 不建議\n\n" +
          "【1 g Q6H】\n" +
          "  ≥60: 不調 → 30-59: 500 Q6H\n" +
          "  → 15-29: 250 Q6H → <15: 不建議\n\n" +
          "ARC (≥130): 1 g Q6H\n" +
          "HD: 透析可移除 55%。250-500 mg Q12H（透析日一劑透析後給）\n" +
          "PD: 250-500 mg Q12H\n" +
          "CRRT: LD 1 g → 250 Q6H 或 500 Q6-8H\n" +
          "PIRRT: LD 500-1g → 250 Q6H 或 500 Q8H（PIRRT 後給）\n" +
          "  ⚠️ PK/PD 最佳劑量（750 Q6H / 1g Q8H）癲癇風險高 → 考慮替代藥物",
      },
      {
        heading: "癲癇風險",
        body:
          "Imipenem 的癲癇風險高於其他 carbapenems：\n" +
          "• 腎功能不全未調整劑量是最常見原因\n" +
          "• 其他危險因子：CNS 疾病史、高齡、高劑量\n" +
          "• CrCl <15 且無 HD → 不建議使用\n" +
          "• 需要 CNS 感染覆蓋時 → 改用 meropenem",
      },
      {
        heading: "肝功能",
        body: "無特殊調整建議。",
      },
      {
        heading: "配伍禁忌",
        body: 
        "• 本藥與乳酸鹽(lactate)屬化學配伍禁忌，所以不應以含乳酸鹽之稀釋液來調配。然而可加入正在進行靜脈輸注的含乳酸鹽溶液一同輸注。(可y-site但盡量分開)\n" +
        "• 回溶及稀釋液：Normal Saline 或 D5W",
      },
      {
        heading: "院內品項",
        body: "Culin 針 500 mg/Vial（以 imipenem 計）",
      },
    ],
  },
};
