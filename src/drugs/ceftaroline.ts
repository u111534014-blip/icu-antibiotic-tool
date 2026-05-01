import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Zinforo（Ceftaroline fosamil）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Zinforo 針 600 mg/Vial（捷復寧注射劑）
//
// 第五代 cephalosporin
// 特性：
//   - 唯一涵蓋 MRSA 的 cephalosporin
//   - 保留給有或有 MRSA 風險且無法使用首選藥物的病人
//   - 不涵蓋 Pseudomonas、Anaerobes
//
// 肝功能：無特殊調整（主要經腎排除）
// ═══════════════════════════════════════════════════════════════

const MG_PER_VIAL = 600; // 600 mg/Vial

// Helper：支數（最接近半支）
function toHalfVials(mg: number): string {
  const raw = mg / MG_PER_VIAL;
  const half = Math.round(raw * 2) / 2;
  if (half === 0.5) return "0.5 支（半支）";
  if (half % 1 === 0) return `${half} 支`;
  return `${half} 支`;
}

// ── 腎調表（依原始劑量分 2 欄）──────────────────────────────────
// [0] >50, [1] >30-50, [2] 15-30, [3] <15
type DoseEntry = { dose_mg: number; freq: string };
type RenalColumn = { label: string; tiers: DoseEntry[] };

const RENAL_COLS: Record<string, RenalColumn> = {
  "600_q12h": {
    label: "600 mg Q12H",
    tiers: [
      { dose_mg: 600, freq: "Q12H" },   // >50
      { dose_mg: 400, freq: "Q12H" },   // >30-50
      { dose_mg: 300, freq: "Q12H" },   // 15-30
      { dose_mg: 200, freq: "Q12H" },   // <15
    ],
  },
  "600_q8h": {
    label: "600 mg Q8H",
    tiers: [
      { dose_mg: 600, freq: "Q8H" },
      { dose_mg: 400, freq: "Q8H" },
      { dose_mg: 300, freq: "Q8H" },
      { dose_mg: 200, freq: "Q8H" },
    ],
  },
};

// Helper：CrCl → tier index
function getTierIndex(crcl: number): number {
  if (crcl > 50) return 0;
  if (crcl > 30) return 1;
  if (crcl >= 15) return 2;
  return 3;
}

// Helper：取得腎調後劑量
function getCeftarolineDose(crcl: number, rrt: string, baseKey: string): {
  dose_mg: number; freq: string; note: string;
} {
  const col = RENAL_COLS[baseKey] ?? RENAL_COLS["600_q12h"];

  if (rrt === "hd") {
    const freq = baseKey === "600_q8h" ? "Q8H" : "Q12H";
    return {
      dose_mg: 200, freq,
      note: "HD：透析可移除 22-73%。200 mg " + freq + "。透析日其中一劑安排在透析後給",
    };
  }
  if (rrt === "pd") {
    const freq = baseKey === "600_q8h" ? "Q8H" : "Q12H";
    return {
      dose_mg: 200, freq,
      note: "PD：200 mg " + freq,
    };
  }
  if (rrt === "cvvh") {
    const freq = baseKey === "600_q8h" ? "Q8H" : "Q12H";
    return {
      dose_mg: 400, freq,
      note: "CRRT：400 mg " + freq + "。PIRRT 同 CRRT；非 PIRRT 日依殘餘 CrCl 調整",
    };
  }

  const tier = getTierIndex(crcl);
  const entry = col.tiers[tier];
  let note = "";
  if (tier === 0) {
    note = "CrCl >50：不需調整";
  } else {
    const ranges = ["", ">30-50", "15-30", "<15"];
    note = `CrCl ${Math.round(crcl)}（${ranges[tier]}）→ 依「${col.label}」欄調整`;
  }

  return { dose_mg: entry.dose_mg, freq: entry.freq, note };
}

export const ceftaroline: Drug = {
  name: "Zinforo",
  subtitle: "Ceftaroline fosamil",
  searchTerms: [
    "ceftaroline", "zinforo", "捷復寧",
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
      desc: "替代藥物，MRSA 導向 · 600 mg Q8H",
      scenarios: [
        {
          label: "MRSA bacteremia（MRSA 菌血症）",
          note: "替代藥物。持續或難治性病例或 reduced susceptibility 者合併 combination regimen。單純 S. aureus 菌血症從首次血液培養陰性起算 ≥14 天；心內膜炎或遠端轉移感染需更長",
          baseDose: "600_q8h",
          doseDisplay: "600 mg Q8H IV",
        },
      ],
    },

    // ═══ 2. Pneumonia ═══
    {
      id: "pneumonia",
      label: "Pneumonia（肺炎）",
      desc: "替代藥物，MRSA 覆蓋",
      scenarios: [
        {
          label: "Community-acquired pneumonia（CAP，替代藥物）",
          note: "替代藥物。住院、無 PsA 風險。合併 combination regimen。MRSA 感染 ≥7 天。停藥前須臨床穩定。若未分離出 MRSA 應降階至較窄 β-lactam",
          baseDose: "600_q12h",
          doseDisplay: "600 mg Q12H IV",
        },
        {
          label: "HAP / VAP（院內 / 呼吸器相關肺炎，替代藥物）",
          note: "替代藥物。MRSA 經驗或導向治療。通常 7 天",
          baseDose: "600_q8h",
          doseDisplay: "600 mg Q8-12H IV",
        },
      ],
    },

    // ═══ 3. Skin and soft tissue infection ═══
    {
      id: "ssti",
      label: "Skin and soft tissue infection（皮膚軟組織感染）",
      desc: "替代藥物 · 600 mg Q12H · ≥5 天",
      scenarios: [
        {
          label: "SSTI（皮膚軟組織感染，替代藥物）",
          note: "替代藥物。≥5 天（含口服降階）；依嚴重度可延長至 14 天",
          baseDose: "600_q12h",
          doseDisplay: "600 mg Q12H IV",
        },
      ],
    },

  ], // ← end of indications

  // ──────────────────────────────────────────────────────────────
  // calculate()
  // ──────────────────────────────────────────────────────────────
  calculate({ crcl, rrt, indicationData }) {
    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const baseKey: string = sc.baseDose ?? "600_q12h";
      const d = getCeftarolineDose(crcl, rrt, baseKey);
      const warnings: string[] = [];

      // ARC
      const isARC = rrt === "none" && crcl >= 130;
      if (isARC) {
        warnings.push("⚡ ARC（CrCl ≥130）：建議 600 mg Q8H IV，輸注 2 小時");
      }

      // 臨床定位提醒
      warnings.push("🔒 臨床定位：保留給有或有 MRSA 風險且無法使用首選藥物（如 vancomycin）的病人");

      // 建立 rows
      const rows: any[] = [
        { label: "原始建議劑量", value: sc.doseDisplay, highlight: true },
        { label: "腎調後劑量", value: `${d.dose_mg} mg ${d.freq} IV`, highlight: true },
        { label: "每次取藥", value: `${toHalfVials(d.dose_mg)} Zinforo（每支 600 mg）` },
        { label: "腎功能調整", value: d.note },
      ];

      if (isARC) {
        rows.push({
          label: "⚡ ARC 建議劑量",
          value: "600 mg Q8H IV，輸注 2 小時（1 支 Q8H）",
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
          "• 第五代 cephalosporin（唯一涵蓋 MRSA 的 cephalosporin）\n" +
          "• 前驅藥物（prodrug），體內轉化為活性代謝物 ceftaroline\n" +
          "• 保留給有或有 MRSA 風險且無法使用首選藥物的病人\n" +
          "• 主要經腎排除",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• MRSA（唯一 cephalosporin！）\n" +
          "• MSSA\n" +
          "• Streptococci（含 S. pneumoniae）\n" +
          "• Enterobacterales（部分）\n" +
          "• H. influenzae\n\n" +
          "【不涵蓋】\n" +
          "• Pseudomonas aeruginosa\n" +
          "• Anaerobes\n" +
          "• ESBL-producing organisms\n" +
          "• Acinetobacter\n" +
          "• Enterococcus",
      },
      {
        heading: "腎功能調整速查表",
        body:
          "⚠️ 依「原始建議劑量」分 2 欄，頻率不變，只調劑量！\n\n" +
          "【600 mg Q12H】\n" +
          "  >50: 600 → >30-50: 400 → 15-30: 300 → <15: 200（都 Q12H）\n\n" +
          "【600 mg Q8H】\n" +
          "  >50: 600 → >30-50: 400 → 15-30: 300 → <15: 200（都 Q8H）\n\n" +
          "ARC (≥130): 600 mg Q8H over 2 hr\n" +
          "HD: 200 mg Q12H 或 Q8H（移除 22-73%，透析日一劑透析後給）\n" +
          "PD: 200 mg Q12H 或 Q8H\n" +
          "CRRT: 400 mg Q12H 或 Q8H\n" +
          "PIRRT: 同 CRRT；非 PIRRT 日依殘餘 CrCl",
      },
      {
        heading: "肝功能",
        body: "無特殊調整建議（未被研究，但主要經腎排除）。",
      },
      {
        heading: "院內品項",
        body: "Zinforo 針 600 mg/Vial（捷復寧注射劑）",
      },
    ],
  },
};
