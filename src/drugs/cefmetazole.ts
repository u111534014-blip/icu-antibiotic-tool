import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Zefazone（Cefmetazole）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Cetazone 針 500 mg/Vial
//
// 第二代 cephamycin（與 cefoxitin 同類）
// 特性：
//   - 體外對 ESBL-producing Enterobacterales 的水解具抗性
//     → 可能為 carbapenem-sparing 替代選擇
//   - 含 N-methyl-tetrazole-thiol 側鏈 → 抑制 vitamin K epoxide reductase
//     → 可能影響 vitamin K 依賴凝血因子合成（注意出血風險）
//   - 美國未上市，常用於日本、台灣、中國
//
// 肝功能：CTP A–C 不需調整
// ═══════════════════════════════════════════════════════════════

const MG_PER_VIAL = 500; // 500 mg/Vial

// Helper：支數（最接近半支）
function toHalfVials(mg: number): string {
  const raw = mg / MG_PER_VIAL;
  const half = Math.round(raw * 2) / 2;
  if (half === 0.5) return "0.5 支（半支）";
  if (half % 1 === 0) return `${half} 支`;
  return `${half} 支`;
}

// ── 腎調表（依原始劑量分 3 欄）──────────────────────────────────
// [0] >90, [1] 50-90, [2] 30-49, [3] 10-29, [4] <10
type DoseEntry = { dose: string; freq: string };
type RenalColumn = { label: string; tiers: DoseEntry[] };

const RENAL_COLS: Record<string, RenalColumn> = {
  "2g_q12h": {
    label: "2 g Q12H（UTI）",
    tiers: [
      { dose: "2 g", freq: "Q12H" },       // >90
      { dose: "1-2 g", freq: "Q12H" },     // 50-90
      { dose: "1 g", freq: "Q12H" },       // 30-49
      { dose: "1-2 g", freq: "Q24H" },     // 10-29
      { dose: "1-2 g", freq: "Q48H" },     // <10
    ],
  },
  "2g_q8h": {
    label: "2 g Q8H（輕中度感染）",
    tiers: [
      { dose: "2 g", freq: "Q8H" },
      { dose: "1-2 g", freq: "Q12H" },
      { dose: "1 g", freq: "Q12H" },
      { dose: "1-2 g", freq: "Q24H" },
      { dose: "1-2 g", freq: "Q48H" },
    ],
  },
  "2g_q6h": {
    label: "2 g Q6H（嚴重感染）",
    tiers: [
      { dose: "2 g", freq: "Q6H" },
      { dose: "1-2 g", freq: "Q12H" },
      { dose: "1 g", freq: "Q12H" },
      { dose: "1-2 g", freq: "Q24H" },
      { dose: "1-2 g", freq: "Q48H" },
    ],
  },
};

// Helper：CrCl → tier index
function getTierIndex(crcl: number): number {
  if (crcl > 90) return 0;
  if (crcl >= 50) return 1;
  if (crcl >= 30) return 2;
  if (crcl >= 10) return 3;
  return 4;
}

// Helper：取得腎調後劑量
function getCefmetazoleDose(crcl: number, rrt: string, baseKey: string): {
  dose: string; freq: string; note: string;
} {
  const col = RENAL_COLS[baseKey] ?? RENAL_COLS["2g_q8h"];

  if (rrt === "hd") {
    return {
      dose: "1-2 g", freq: "Q48H",
      note: "HD：1-2 g Q48H。透析日透析後追加給藥（AD on dialysis days）",
    };
  }
  if (rrt === "pd") {
    return {
      dose: "1-2 g", freq: "Q48H",
      note: "PD：無數據。建議同 CrCl <10（1-2 g Q48H）",
    };
  }
  if (rrt === "cvvh") {
    return {
      dose: "1-2 g", freq: "Q12H",
      note: "CRRT：無數據。建議參考 CrCl 50-90 的調整（1-2 g Q12H），密切監測",
    };
  }

  const tier = getTierIndex(crcl);
  const entry = col.tiers[tier];
  let note = "";
  if (tier === 0) {
    note = "CrCl >90：不需調整";
  } else {
    const ranges = ["", "50-90", "30-49", "10-29", "<10"];
    note = `CrCl ${Math.round(crcl)}（${ranges[tier]}）→ 依「${col.label}」欄調整`;
  }

  return { dose: entry.dose, freq: entry.freq, note };
}

export const cefmetazole: Drug = {
  name: "Zefazone",
  subtitle: "Cefmetazole",
  searchTerms: [
    "cefmetazole", "zefazone", "cetazone", "喜達隆",
  ],

  needsRenal: true,
  needsWeight: true,
  needsHepatic: false,

  // ──────────────────────────────────────────────────────────────
  // 適應症（依熱病分類）
  // ──────────────────────────────────────────────────────────────
  indications: [

    // ═══ 1. UTI ═══
    {
      id: "uti",
      label: "Urinary tract infection（泌尿道感染）",
      desc: "2 g Q12H",
      scenarios: [
        {
          label: "UTI（泌尿道感染）",
          note: "熱病標準劑量",
          baseDose: "2g_q12h",
          doseDisplay: "2 g Q12H IV",
        },
      ],
    },

    // ═══ 2. Mild-moderate infection ═══
    {
      id: "mildModerate",
      label: "Mild to moderate infection（輕度至中度感染）",
      desc: "2 g Q8H",
      scenarios: [
        {
          label: "Mild to moderate infection（輕中度感染）",
          note: "熱病標準劑量",
          baseDose: "2g_q8h",
          doseDisplay: "2 g Q8H IV",
        },
      ],
    },

    // ═══ 3. Severe infection ═══
    {
      id: "severe",
      label: "Severe infection（嚴重感染）",
      desc: "2 g Q6H",
      scenarios: [
        {
          label: "Severe infection（嚴重感染）",
          note: "熱病標準劑量",
          baseDose: "2g_q6h",
          doseDisplay: "2 g Q6H IV",
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
      const d = getCefmetazoleDose(crcl, rrt, baseKey);
      const warnings: string[] = [];

      // Vitamin K 側鏈警告
      warnings.push("⚠️ 含 N-methyl-tetrazole-thiol 側鏈 → 可能抑制 vitamin K 依賴凝血因子合成。注意出血風險，特別是營養不良、長期使用、合併抗凝血劑的病人。必要時補充 vitamin K");

      // ESBL 替代提醒
      warnings.push("💡 ESBL-producing Enterobacterales：體外對 ESBL 水解具抗性，可能為 carbapenem-sparing 替代選擇（Open Forum Infect Dis 2023; Antimicrob Agents Chemother 2023）");

      // CRRT/PD/SLED 無數據
      if (rrt === "cvvh" || rrt === "pd") {
        warnings.push("📌 CRRT / CAPD / SLED：無數據。上述劑量為保守建議，密切監測");
      }

      // 建立 rows
      const rows: any[] = [
        { label: "原始建議劑量", value: sc.doseDisplay, highlight: true },
        { label: "腎調後劑量", value: `${d.dose} ${d.freq} IV`, highlight: true },
        { label: "每次取藥（以 2 g 計）", value: `${toHalfVials(2000)} Cetazone（每支 500 mg）` },
        { label: "腎功能調整", value: d.note },
      ];

      if (sc.note) {
        rows.push({ label: "備註", value: sc.note });
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
          "• 第二代 cephamycin（與 cefoxitin 同類）\n" +
          "• 體外對 ESBL-producing Enterobacterales 的水解具抗性\n" +
          "• 含 N-methyl-tetrazole-thiol 側鏈 → 抑制 vitamin K epoxide reductase\n" +
          "  → 可能影響 vitamin K 依賴凝血因子合成\n" +
          "• 美國未上市，常用於日本、台灣、中國\n" +
          "• 半衰期：NRF 1-1.5 hr / ESRD 29 hr\n" +
          "• 可能為 ESBL carbapenem-sparing 替代選擇\n" +
          "  （Open Forum Infect Dis 2023;10:ofad502;\n" +
          "   Antimicrob Agents Chemother 2023;67:e0051023）",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• Enterobacterales（含 ESBL-producing → carbapenem-sparing 替代）\n" +
          "• Anaerobes（含 Bacteroides spp.，同 cefoxitin，但抗藥性漸增）\n" +
          "• MSSA\n\n" +
          "【不涵蓋】\n" +
          "• MRSA\n" +
          "• Pseudomonas aeruginosa\n" +
          "• Enterococcus",
      },
      {
        heading: "ESBL 替代治療角色",
        body:
          "Cefmetazole 因結構上對 ESBL 水解穩定，被視為 ESBL-producing Enterobacterales 的\n" +
          "carbapenem-sparing 替代選擇（特別是 UTI 和輕中度感染）。\n\n" +
          "⚠️ 但證據等級仍低於 carbapenem，嚴重感染（如 sepsis、BSI）仍建議首選 carbapenem。\n" +
          "適合用於：源頭控制佳的 UTI、輕中度腹腔感染、降階治療。",
      },
      {
        heading: "Vitamin K 相關出血風險",
        body:
          "N-methyl-tetrazole-thiol 側鏈可能抑制 vitamin K epoxide reductase：\n" +
          "• 注意 INR 延長、出血風險\n" +
          "• 高風險族群：營養不良、長期使用、合併抗凝血劑、肝功能不全\n" +
          "• 必要時補充 vitamin K（如 phytonadione 10 mg IV/PO weekly）",
      },
      {
        heading: "腎功能調整速查表（熱病）",
        body:
          "CrCl >90：不需調整\n" +
          "CrCl 50-90：1-2 g Q12H\n" +
          "CrCl 30-49：1 g Q12H\n" +
          "CrCl 10-29：1-2 g Q24H\n" +
          "CrCl <10：1-2 g Q48H\n\n" +
          "HD：1-2 g Q48H（透析日透析後追加給藥）\n" +
          "CAPD：無數據\n" +
          "CRRT / SLED：無數據",
      },
      {
        heading: "肝功能",
        body: "CTP A–C：不需調整。",
      },
      {
        heading: "院內品項",
        body: "Cetazone 針 500 mg/Vial",
      },
    ],
  },
};
