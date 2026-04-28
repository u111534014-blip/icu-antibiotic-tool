import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Tatumcef（Ceftazidime）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Tatumcef 針 2 g/Vial（祐坦賜褔乾粉注射劑）
//
// 第三代 cephalosporin，抗 Pseudomonas 活性強
// 給藥方式：
//   - Traditional：30 分鐘
//   - Extended infusion（off-label）：3-4 hr
//   - Continuous infusion（off-label）：6 g/24 hr
//
// ⚠️ 不涵蓋 MRSA、Anaerobes、S. pneumoniae 活性弱
// 肝功能：CTP A–C 不需調整
// ═══════════════════════════════════════════════════════════════

const MG_PER_VIAL = 2000; // 2 g/Vial

// Helper：支數（最接近半支）
function toHalfVials(mg: number): string {
  const raw = mg / MG_PER_VIAL;
  const half = Math.round(raw * 2) / 2;
  if (half === 0.5) return "0.5 支（半支）";
  if (half % 1 === 0) return `${half} 支`;
  return `${half} 支`;
}

// ── 腎調表（依原始劑量分 2 欄）──────────────────────────────────
// [0] >50, [1] 31-50, [2] 16-30, [3] ≤15
type DoseEntry = { dose_mg: number; freq: string };
type RenalColumn = { label: string; tiers: DoseEntry[] };

const RENAL_COLS: Record<string, RenalColumn> = {
  "1g_q8h": {
    label: "1 g Q8H",
    tiers: [
      { dose_mg: 1000, freq: "Q8H" },    // >50
      { dose_mg: 1000, freq: "Q12H" },   // 31-50
      { dose_mg: 1000, freq: "Q24H" },   // 16-30
      { dose_mg: 500,  freq: "Q24H" },   // ≤15
    ],
  },
  "2g_q8h": {
    label: "2 g Q8H",
    tiers: [
      { dose_mg: 2000, freq: "Q8H" },
      { dose_mg: 2000, freq: "Q12H" },
      { dose_mg: 2000, freq: "Q24H" },
      { dose_mg: 1000, freq: "Q24H" },
    ],
  },
};

// Helper：CrCl → tier index
function getTierIndex(crcl: number): number {
  if (crcl > 50) return 0;
  if (crcl >= 31) return 1;
  if (crcl >= 16) return 2;
  return 3;
}

// Helper：取得腎調後劑量
function getCeftazDose(crcl: number, rrt: string, baseKey: string): {
  dose_mg: number; freq: string; note: string;
} {
  const col = RENAL_COLS[baseKey] ?? RENAL_COLS["2g_q8h"];

  if (rrt === "hd") {
    return {
      dose_mg: 1000, freq: "Q24H",
      note: "HD：透析可移除 55-88%（low-flux）。500 mg-1 g Q24H，透析日透析後給。經驗治療或重症用 1 g QD。另可用 1 g 3x/week post-HD（72hr 間隔前考慮 2 g）",
    };
  }
  if (rrt === "pd") {
    return {
      dose_mg: 1000, freq: "Q24H",
      note: "PD：1 g Q24H",
    };
  }
  if (rrt === "cvvh") {
    return {
      dose_mg: 2000, freq: "Q8-12H",
      note: "CRRT：2 g Q8-12H。重症/高 MIC/經驗治療偏好 Q8H。替代：LD 2 g → continuous 3 g/24hr（維持 ≥4×MIC）",
    };
  }

  const tier = getTierIndex(crcl);
  const entry = col.tiers[tier];
  let note = "";
  if (tier === 0) {
    note = "CrCl >50：不需調整";
  } else {
    const ranges = ["", "31-50", "16-30", "≤15"];
    note = `CrCl ${Math.round(crcl)}（${ranges[tier]}）→ 依「${col.label}」欄調整`;
  }

  return { dose_mg: entry.dose_mg, freq: entry.freq, note };
}

export const ceftazidime: Drug = {
  name: "Fortum",
  subtitle: "Ceftazidime",
  searchTerms: [
    "ceftazidime", "tatumcef", "祐坦賜褔", "fortum",
  ],

  needsRenal: true,
  needsWeight: true,
  needsHepatic: false,

  // ──────────────────────────────────────────────────────────────
  // 適應症（照 UpToDate 原文標題）
  // ──────────────────────────────────────────────────────────────
  indications: [

    // ═══ 1. Bloodstream infection ═══
    {
      id: "bsi",
      label: "Bloodstream infection（菌血症）",
      desc: "2 g Q8H · 7-14 天",
      scenarios: [
        {
          label: "Gram-negative bacteremia（GNB 菌血症）",
          note: "含 PsA 覆蓋或對其他藥物抗藥者的經驗/導向治療。Neutropenia、重度燒傷、sepsis/shock 合併第二隻 anti-GNB。重症或高 MIC 考慮 extended/continuous infusion。單純 Enterobacteriaceae + 反應佳 7 天；neutropenia 延長至退燒 ≥48hr + ANC ≥500；PsA + neutropenia 至少 14 天 + ANC 恢復",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H IV",
        },
      ],
    },

    // ═══ 2. Cystic fibrosis ═══
    {
      id: "cf",
      label: "Cystic fibrosis, acute pulmonary exacerbation（CF 急性肺惡化）",
      desc: "2 g Q6-8H + combination · 10-14 天",
      scenarios: [
        {
          label: "CF acute exacerbation（CF 急性肺惡化）",
          note: "經驗或導向治療 PsA / GNB。合併 combination regimen。Traditional 2 g Q6-8H（或 150-200 mg/kg/day ÷ Q6-8H，最高 12 g/day）；Extended 2 g Q8H over 3-4hr；Continuous 6 g/24hr（最高 12 g/day）。10-14 天",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q6-8H IV（或 150-200 mg/kg/day）",
        },
      ],
    },

    // ═══ 3. Diabetic foot infection ═══
    {
      id: "diabeticFoot",
      label: "Diabetic foot infection, moderate to severe（糖尿病足感染，中度-重度）",
      desc: "1-2 g Q8H + combination · 2-4 週",
      scenarios: [
        {
          label: "Diabetic foot infection（糖尿病足感染）",
          note: "合併其他藥物。PsA 風險（浸水、浸潤性潰瘍）或培養出 PsA 用 2 g Q8H。2-4 週（無骨髓炎），含口服降階",
          baseDose: "2g_q8h",
          doseDisplay: "1-2 g Q8H IV（PsA 用 2 g）",
        },
      ],
    },

    // ═══ 4. Endophthalmitis ═══
    {
      id: "endophthalmitis",
      label: "Endophthalmitis, bacterial（細菌性眼內炎）",
      desc: "玻璃體內注射 2-2.25 mg",
      scenarios: [
        {
          label: "Endophthalmitis, empiric（細菌性眼內炎，經驗治療）",
          note: "玻璃體內注射。合併 vancomycin。24-48 小時後可依培養、嚴重度、反應考慮再給一劑",
          baseDose: "2g_q8h",
          doseDisplay: "Intravitreal 2-2.25 mg/0.1 mL（+ vancomycin）",
        },
      ],
    },

    // ═══ 5. IAI ═══
    {
      id: "iai",
      label: "Intra-abdominal infection（腹內感染）",
      desc: "醫療相關或高風險社區型",
      scenarios: [
        {
          label: "Acute cholecystitis（急性膽囊炎）",
          note: "社區型保留給嚴重或高風險/抗藥風險者。術後 1 天或臨床緩解",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H IV",
        },
        {
          label: "Other IAI（膽管炎、闌尾炎、憩室炎、腹腔膿瘍等）",
          note: "合併 metronidazole（± 其他藥物）。源頭控制後 4-5 天；憩室炎/單純闌尾炎 10-14 天；穿孔闌尾 + 腹腔鏡 2-4 天。重症或高抗藥風險考慮 extended/continuous infusion",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H IV + metronidazole",
        },
      ],
    },

    // ═══ 6. Intracranial abscess and spinal epidural abscess ═══
    {
      id: "cns",
      label: "Intracranial abscess and spinal epidural abscess（顱內膿瘍 / 脊髓硬膜外膿瘍）",
      desc: "2 g Q8H + combination · 4-8 週",
      scenarios: [
        {
          label: "Brain / Spinal epidural abscess（腦膿瘍 / 脊髓硬膜外膿瘍）",
          note: "有 PsA 或抗藥 GNB 風險者（神經外科術後或免疫低下）。合併 combination regimen。脊髓 4-8 週；腦膿瘍 6-8 週",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H IV",
        },
      ],
    },

    // ═══ 7. Melioidosis or glanders ═══
    {
      id: "melioidosis",
      label: "Melioidosis or glanders（類鼻疽 / 馬鼻疽）",
      desc: "2 g Q6-8H · ≥14 天",
      scenarios: [
        {
          label: "Melioidosis / Glanders, initial intensive（初始強化治療）",
          note: "2 g Q6-8H 或 LD 2 g → continuous 6 g/24hr。≥14 天（依嚴重度可更長）。CNS/前列腺/骨關節/皮膚軟組織焦點加 TMP/SMX。之後口服根除治療 ≥12 週",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q6-8H IV（或 LD 2 g → 6 g/24hr continuous）",
        },
      ],
    },

    // ═══ 8. Meningitis ═══
    {
      id: "meningitis",
      label: "Meningitis, bacterial（細菌性腦膜炎）",
      desc: "2 g Q8H + vancomycin · 10-21 天",
      scenarios: [
        {
          label: "Bacterial meningitis（細菌性腦膜炎）",
          note: "醫療相關經驗治療或 PsA 等抗藥 GNB 導向治療。合併 vancomycin。GNB 療程 ≥10-14 天（部分專家 21 天）",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H IV",
        },
      ],
    },

    // ═══ 9. Neutropenic fever ═══
    {
      id: "fn",
      label: "Neutropenic fever, empiric therapy for high-risk patients with cancer（高風險中性球低下發燒）",
      desc: "2 g Q8H 至退燒 + ANC ≥500",
      scenarios: [
        {
          label: "Febrile neutropenia, empiric（中性球低下發燒，經驗治療）",
          note: "高風險：ANC ≤100 >7 天或有共病。重症考慮 extended/continuous infusion。治療至退燒 ≥48hr + ANC ≥500 且上升中。部分專家在血行穩定 + 退燒 ≥48hr + 無明確感染 + 治療 ≥72hr 後考慮停藥（不管 ANC）",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H IV",
        },
      ],
    },

    // ═══ 10. Osteomyelitis ═══
    {
      id: "osteo",
      label: "Osteomyelitis and/or discitis（骨髓炎 / 椎間盤炎）",
      desc: "2 g Q8H · 通常 6 週",
      scenarios: [
        {
          label: "Osteomyelitis / Discitis（骨髓炎 / 椎間盤炎）",
          note: "經驗或導向治療抗藥 GNB（如 PsA）。合併 combination regimen。通常 6 週，可部分轉口服。截肢完全切除者可短",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H IV",
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
          label: "Intermittent IP, long dwell（間歇性，長留置）",
          note: "IP 優先（除非 sepsis）。1-1.5 g QD 加入透析液，至少留置 6 小時。殘餘腎功能佳者（尿量 >100 mL/day）考慮加量 25%。反應良好 ≥3 週；5 天未改善考慮拔管",
          baseDose: "1g_q8h",
          doseDisplay: "IP 1-1.5 g QD",
        },
        {
          label: "Intermittent IP, short dwell / APD（間歇性，短留置 / APD）",
          note: "20 mg/kg 加入前 5 L on-warmer 透析液 QD",
          baseDose: "1g_q8h",
          doseDisplay: "IP 20 mg/kg QD",
        },
        {
          label: "Continuous IP（每次 CAPD 交換都給）",
          note: "LD 500 mg/L（首袋），之後 125 mg/L 每袋。反應良好 ≥3 週",
          baseDose: "1g_q8h",
          doseDisplay: "IP LD 500 mg/L → MD 125 mg/L",
        },
      ],
    },

    // ═══ 12. Pneumonia ═══
    {
      id: "pneumonia",
      label: "Pneumonia（肺炎）",
      desc: "CAP（抗藥 GNB 風險）/ HAP / VAP",
      scenarios: [
        {
          label: "Community-acquired pneumonia（CAP，有抗藥 GNB / PsA 風險）",
          note: "合併 combination regimen。療程 ≥5 天（免疫低下/PsA 更長）。停藥前須臨床穩定",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H IV",
        },
        {
          label: "HAP / VAP（院內 / 呼吸器相關肺炎）",
          note: "經驗治療合併 combination。通常 7 天。重症或高 MIC 考慮 extended/continuous infusion",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H IV",
        },
      ],
    },

    // ═══ 13. Prosthetic joint infection ═══
    {
      id: "pji",
      label: "Prosthetic joint infection（人工關節感染）",
      desc: "2 g Q8H · 4-6 週",
      scenarios: [
        {
          label: "PJI, GNB directed（人工關節感染，GNB 導向）",
          note: "替代藥物。經驗或導向治療抗藥 GNB（如 PsA）。Resection arthroplasty 4-6 週",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H IV",
        },
      ],
    },

    // ═══ 14. Septic arthritis ═══
    {
      id: "septicArthritis",
      label: "Septic arthritis（化膿性關節炎）",
      desc: "2 g Q8H · 3-4 週",
      scenarios: [
        {
          label: "Septic arthritis（化膿性關節炎）",
          note: "有或有 PsA 風險的經驗/導向治療。合併 combination regimen。3-4 週（無骨髓炎），含口服降階",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H IV",
        },
      ],
    },

    // ═══ 15. SSTI ═══
    {
      id: "ssti",
      label: "Skin and soft tissue infection, moderate to severe（皮膚軟組織感染，中度-重度）",
      desc: "2 g Q8H · 5-14 天",
      scenarios: [
        {
          label: "SSTI, moderate to severe（皮膚軟組織感染）",
          note: "有或有 PsA / 抗藥 GNB 風險的經驗/導向治療。常合併 combination regimen。5-14 天",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H IV",
        },
      ],
    },

    // ═══ 16. UTI ═══
    {
      id: "uti",
      label: "Urinary tract infection, complicated（複雜性泌尿道感染）",
      desc: "1-2 g Q8H · 5-7 天",
      scenarios: [
        {
          label: "Complicated UTI / Pyelonephritis（複雜性 UTI / 腎盂腎炎）",
          note: "48hr 改善者 5-7 天（全程 ceftazidime 7 天）",
          baseDose: "2g_q8h",
          doseDisplay: "1-2 g Q8H IV",
        },
      ],
    },

    // ═══ 17. Vibrio vulnificus ═══
    {
      id: "vibrio",
      label: "Vibrio vulnificus infection（創傷弧菌感染）",
      desc: "1-2 g Q8H + combination · 7-14 天",
      scenarios: [
        {
          label: "Vibrio vulnificus（創傷弧菌感染）",
          note: "菌血症或嚴重傷口感染。合併 combination regimen。早期治療改善預後。7-14 天",
          baseDose: "2g_q8h",
          doseDisplay: "1-2 g Q8H IV/IM",
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
      const d = getCeftazDose(crcl, rrt, baseKey);
      const warnings: string[] = [];

      // ARC
      const isARC = rrt === "none" && crcl >= 130;
      if (isARC) {
        warnings.push("⚡ ARC（CrCl ≥130）：建議 2 g Q6H IV。替代方案：LD 2 g → continuous 10 g/24hr（Monte Carlo simulation）");
      }

      // Extended/Continuous infusion 提醒
      if (baseKey === "2g_q8h") {
        warnings.push("💡 重症、高 MIC、PsA 感染者考慮 extended infusion（2 g Q8H over 3-4 hr）或 continuous infusion（6 g/24hr）。可先給 LD 2 g over 30 min（sepsis 快速達標）");
      }

      // PIRRT
      if (rrt === "cvvh") {
        warnings.push("📌 PIRRT：2 g Q12H");
      }

      // 建立 rows
      const rows: any[] = [
        { label: "原始建議劑量", value: sc.doseDisplay, highlight: true },
        { label: "腎調後劑量", value: `${d.dose_mg} mg ${d.freq} IV`, highlight: true },
        { label: "每次取藥", value: `${toHalfVials(d.dose_mg)} Tatumcef（每支 2 g）` },
        { label: "腎功能調整", value: d.note },
      ];

      if (isARC) {
        rows.push({
          label: "⚡ ARC 建議劑量",
          value: "2 g Q6H IV（2 支 Q6H）或 LD 2 g → 10 g/24hr continuous",
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
          "• 第三代 cephalosporin，抗 Pseudomonas 活性強\n" +
          "• Q8H 或 Q6H 給藥\n" +
          "• 三種輸注方式：Traditional（30 min）/ Extended（3-4 hr）/ Continuous（6 g/24hr）\n" +
          "• CF 病人可能需要較高劑量（150-400 mg/kg/day，最高 12 g/day）",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• Pseudomonas aeruginosa（三代中抗 PsA 最強！）\n" +
          "• Enterobacterales\n" +
          "• H. influenzae\n" +
          "• Neisseria spp.\n" +
          "• Burkholderia pseudomallei（類鼻疽）\n\n" +
          "【不涵蓋】\n" +
          "• MRSA\n" +
          "• Enterococcus\n" +
          "• S. pneumoniae（活性弱，不適合用於 CAP 單獨治療）\n" +
          "• Anaerobes（需合併 metronidazole）\n" +
          "• ESBL-producing organisms（大部分抗藥）\n" +
          "• Acinetobacter（大部分抗藥）",
      },
      {
        heading: "Ceftazidime vs Cefepime",
        body:
          "• Ceftazidime（三代）：抗 PsA 強、但不涵蓋 MSSA、S. pneumoniae 活性弱\n" +
          "• Cefepime（四代）：涵蓋 MSSA + PsA + 部分 AmpC-producing Enterobacterales\n" +
          "• Cefepime 抗菌譜較廣，但 ceftazidime 仍常用於 PsA 確認感染",
      },
      {
        heading: "三種輸注方式",
        body:
          "▸ Traditional（標準）：30 分鐘\n\n" +
          "▸ Extended infusion：2 g Q8H over 3-4 hr（off-label）\n" +
          "  可先給首劑 30 分鐘（sepsis 快速達標）\n\n" +
          "▸ Continuous infusion：6 g/24hr（off-label）\n" +
          "  可先給 LD 2 g over 30 分鐘",
      },
      {
        heading: "腎功能調整速查表",
        body:
          "⚠️ 依「原始建議劑量」分 2 欄！\n\n" +
          "【1 g Q8H】\n" +
          "  >50: 不調 → 31-50: 1g Q12H → 16-30: 1g Q24H → ≤15: 500mg Q24H\n\n" +
          "【2 g Q8H】\n" +
          "  >50: 不調 → 31-50: 2g Q12H → 16-30: 2g Q24H → ≤15: 1g Q24H\n\n" +
          "ARC (≥130): 2g Q6H 或 LD 2g → continuous 10g/24hr\n" +
          "HD: 55-88% 移除。500mg-1g Q24H（透析後給）。或 1g 3x/week post-HD\n" +
          "PD: 1g Q24H\n" +
          "CRRT: 2g Q8-12H（重症 Q8H）。或 LD 2g → continuous 3g/24hr\n" +
          "PIRRT: 2g Q12H",
      },
      {
        heading: "肝功能",
        body: "CTP A–C：不需調整。",
      },
      {
        heading: "院內品項",
        body: "Tatumcef 針（祐坦賜褔乾粉注射劑）2 g/Vial",
      },
    ],
  },
};
