import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Mefoxin（Cefoxitin）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Cefoxitin (sod) 2 g/Vial（世優注射劑）
//
// 第二代 cephamycin cephalosporin
// 特性：
//   - 涵蓋 anaerobes（含 Bacteroides spp.，但抗藥性漸增）
//   - 體外可誘導 β-lactamase（特別是 Enterobacter spp.）
//   - 常用於手術預防（特別是泌尿道、腹部、婦科手術）
//   - ⚠️ 可能使 Scr 假性升高（干擾 assay）
//
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

// ── 腎調表（依原始劑量分 3 欄）──────────────────────────────────
// [0] >50, [1] 30-50, [2] 10-29, [3] <10
// ⚠️ 單劑使用（手術預防、門診 PID）不需調整
type DoseEntry = { dose: string; freq: string };
type RenalColumn = { label: string; tiers: DoseEntry[] };

const RENAL_COLS: Record<string, RenalColumn> = {
  "q8h": {
    label: "1-2 g Q8H",
    tiers: [
      { dose: "1-2 g", freq: "Q8H" },          // >50
      { dose: "1-2 g", freq: "Q12H" },         // 30-50
      { dose: "1-2 g", freq: "Q24H" },         // 10-29
      { dose: "LD 1 g → 500 mg-1 g", freq: "Q24H" },  // <10
    ],
  },
  "q6h": {
    label: "1-2 g Q6H",
    tiers: [
      { dose: "1-2 g", freq: "Q6H" },
      { dose: "1-2 g", freq: "Q8H" },
      { dose: "1-2 g", freq: "Q12H" },
      { dose: "1 g", freq: "Q24H" },
    ],
  },
  "highDose": {
    label: "200 mg/kg/day ÷ TID（NTM 用）",
    tiers: [
      { dose: "200 mg/kg/day ÷ TID", freq: "（max 12 g/day）" },
      { dose: "150 mg/kg/day ÷ TID", freq: "（max 9 g/day）" },
      { dose: "100 mg/kg/day ÷ BID", freq: "（max 6 g/day）" },
      { dose: "50 mg/kg/day ÷ QD-BID", freq: "（max 3 g/day）" },
    ],
  },
};

function getTierIndex(crcl: number): number {
  if (crcl > 50) return 0;
  if (crcl >= 30) return 1;
  if (crcl >= 10) return 2;
  return 3;
}

function getCefoxitinDose(crcl: number, rrt: string, baseKey: string): {
  dose: string; freq: string; note: string;
} {
  const col = RENAL_COLS[baseKey] ?? RENAL_COLS["q8h"];

  if (rrt === "hd") {
    if (baseKey === "highDose") {
      return { dose: "50 mg/kg/day ÷ QD-BID", freq: "（max 3 g/day）", note: "HD：同 CrCl <10。透析日透析後給藥。熱病建議：2 g Q24-48H + 透析後追加 1 g" };
    }
    const entry = col.tiers[3]; // 同 CrCl <10
    return { dose: entry.dose, freq: entry.freq, note: "HD：同 CrCl <10。透析日透析後給藥。熱病建議：2 g Q24-48H + 透析後追加 1 g" };
  }
  if (rrt === "pd") {
    if (baseKey === "highDose") {
      return { dose: "50 mg/kg/day ÷ QD-BID", freq: "（max 3 g/day）", note: "PD：不被顯著透析。同 CrCl <10。熱病建議：1 g Q24H" };
    }
    const entry = col.tiers[3];
    return { dose: entry.dose, freq: entry.freq, note: "PD：不被顯著透析。同 CrCl <10。熱病建議：1 g Q24H" };
  }
  if (rrt === "cvvh") {
    if (baseKey === "highDose") {
      return { dose: "150 mg/kg/day ÷ TID", freq: "（max 9 g/day）", note: "CRRT：數據有限，考慮替代藥物。若必須使用，同 CrCl 30-50。熱病建議：2 g Q8-12H" };
    }
    const entry = col.tiers[1]; // 同 CrCl 30-50
    return { dose: entry.dose, freq: entry.freq, note: "CRRT：數據有限，考慮替代藥物。若必須使用，同 CrCl 30-50。熱病建議：2 g Q8-12H" };
  }

  const tier = getTierIndex(crcl);
  const entry = col.tiers[tier];
  let note = "";
  if (tier === 0) {
    note = "CrCl >50：不需調整";
  } else {
    const ranges = ["", "30-50", "10-29", "<10"];
    note = `CrCl ${Math.round(crcl)}（${ranges[tier]}）→ 依「${col.label}」欄調整`;
  }

  return { dose: entry.dose, freq: entry.freq, note };
}

export const cefoxitin: Drug = {
  name: "Mefoxin",
  subtitle: "Cefoxitin",
  searchTerms: [
    "cefoxitin", "mefoxin", "世優",
    "cephamycin", "二代", "2nd gen",
    "手術預防",
  ],

  needsRenal: true,
  needsWeight: true,
  needsHepatic: false,

  // ──────────────────────────────────────────────────────────────
  // 適應症（照 UpToDate 原文標題）
  // ──────────────────────────────────────────────────────────────
  indications: [

    // ═══ 1. Mycobacterial infection ═══
    {
      id: "mycobacterial",
      label: "Mycobacterial infection（非結核分枝桿菌，快速生長型）",
      desc: "高劑量 + combination",
      scenarios: [
        {
          label: "NTM, rapidly growing, non-CF（快速生長型 NTM，非 CF）",
          note: "2-4 g BID-TID 或 200 mg/kg/day ÷ TID（max 12 g/day）。部分專家偏好 4 g BID。合併 combination regimen。IV 階段通常 ≤12 週後轉口服長期維持。建議會診感染科",
          baseDose: "highDose",
          doseDisplay: "2-4 g BID-TID 或 200 mg/kg/day ÷ TID（max 12 g/day）",
        },
        {
          label: "NTM, rapidly growing, CF（快速生長型 NTM，CF）",
          note: "200 mg/kg/day ÷ TID（max 12 g/day）。合併 combination regimen",
          baseDose: "highDose",
          doseDisplay: "200 mg/kg/day ÷ TID（max 12 g/day）",
        },
      ],
    },

    // ═══ 2. Sexually transmitted infections ═══
    {
      id: "sti",
      label: "Sexually transmitted infections（性傳染病）",
      desc: "淋病 / PID",
      scenarios: [
        {
          label: "Gonococcal infection, uncomplicated（淋病，非複雜，替代藥物）",
          note: "⚠️ 僅在 ceftriaxone 無法取得時使用（缺乏近代療效數據）。合併 oral probenecid + chlamydia 治療（若未排除）。治療失敗疑慮時會診感染科並通報",
          baseDose: "q8h",
          doseDisplay: "IM 2 g 單劑 + oral probenecid",
          singleDose: true,
        },
        {
          label: "PID, inpatient（骨盆腔炎，住院）",
          note: "合併 doxycycline。改善 24-48 hr 後轉口服。總療程 14 天",
          baseDose: "q6h",
          doseDisplay: "2 g Q6H IV + doxycycline",
        },
        {
          label: "PID, outpatient（骨盆腔炎，門診）",
          note: "合併 oral probenecid，之後 doxycycline + metronidazole 口服 14 天",
          baseDose: "q8h",
          doseDisplay: "IM 2 g 單劑 + oral probenecid → PO doxycycline + metronidazole",
          singleDose: true,
        },
      ],
    },

    // ═══ 3. Surgical prophylaxis ═══
    {
      id: "surgical",
      label: "Surgical prophylaxis（手術預防）",
      desc: "2 g 單劑，術前 60 分鐘",
      scenarios: [
        {
          label: "Surgical prophylaxis（手術預防）",
          note: "術前 60 分鐘內。手術時間長或大量失血可在 2 小時後追加一劑。Clean/clean-contaminated 不需術後再給。院內大多依腎功能調整打三天",
          baseDose: "q8h",
          doseDisplay: "2 g IV 單劑（術前 60 分鐘）",
          singleDose: true,
        },
      ],
    },

  ], // ← end of indications

  // ──────────────────────────────────────────────────────────────
  // calculate()
  // ──────────────────────────────────────────────────────────────
  calculate({ crcl, rrt, indicationData }) {
    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const baseKey: string = sc.baseDose ?? "q8h";
      const isSingleDose = sc.singleDose ?? false;
      const warnings: string[] = [];

      // 單劑不需腎調
      if (isSingleDose) {
        const rows: any[] = [
          { label: "建議劑量", value: sc.doseDisplay, highlight: true },
          { label: "每次取藥", value: `${toHalfVials(2000)} 世優（每支 2 g）` },
          { label: "腎功能調整", value: "單劑使用不需調整（任何程度腎功能不全或 RRT 皆同）" },
        ];
        if (sc.note) rows.push({ label: "療程與備註", value: sc.note });

        // 肥胖手術預防提醒
        if (sc.id === "surgical" || sc.label.includes("Surgical")) {
          warnings.push("⚖️ 肥胖病人手術預防：2 g 可能不足。研究顯示 40 mg/kg（依實際體重）或 4 g 仍可能無法達到 PK/PD target。目前無確定建議，但考慮使用較高劑量");
        }

        // Scr 假性升高提醒
        warnings.push("🔬 Cefoxitin 可能干擾 Scr assay，造成 Scr 假性升高。評估腎功能時需注意");

        return { title: sc.label, rows, warnings };
      }

      // 多劑使用需腎調
      const d = getCefoxitinDose(crcl, rrt, baseKey);

      // ARC
      const isARC = rrt === "none" && crcl >= 130;
      if (isARC) {
        warnings.push("⚡ ARC（CrCl ≥130）：數據有限。嚴重感染考慮替代藥物（最大劑量 12 g/day 仍可能無法達 PD target）。若必須使用，考慮 2 g Q4H 或 prolonged/continuous infusion");
      }

      // CRRT/PIRRT 數據有限提醒
      if (rrt === "cvvh") {
        warnings.push("📌 CRRT/PIRRT：Cefoxitin 在 CRRT 數據有限，考慮替代藥物。若必須使用，CRRT 同 CrCl 30-50；PIRRT 日同 CrCl 10-29（一劑在 PIRRT 後給），非 PIRRT 日同 CrCl <10");
      }

      // Scr 假性升高
      warnings.push("🔬 Cefoxitin 可能干擾 Scr assay，造成 Scr 假性升高。評估腎功能時需注意");

      const rows: any[] = [
        { label: "原始建議劑量", value: sc.doseDisplay, highlight: true },
        { label: "腎調後劑量", value: `${d.dose} ${d.freq}`, highlight: true },
        { label: "每次取藥", value: `${toHalfVials(2000)} 世優（每支 2 g）` },
        { label: "腎功能調整", value: d.note },
      ];

      if (isARC) {
        rows.push({
          label: "⚡ ARC 建議",
          value: "考慮 2 g Q4H 或 prolonged/continuous infusion（數據有限，考慮替代藥物）",
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
          "• 第二代 cephamycin cephalosporin（parenteral）\n" +
          "• 涵蓋 anaerobes（含 Bacteroides spp.），但抗藥性漸增\n" +
          "• 體外可誘導 β-lactamase（特別是 Enterobacter spp.）\n" +
          "• 標準劑量：2 g IV Q6-8H\n" +
          "• 半衰期：NRF 0.8 hr / ESRD 13-23 hr",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• Enterobacterales（但 Enterobacter 易被誘導 β-lactamase）\n" +
          "• Anaerobes（含 Bacteroides spp.，但抗藥性漸增）\n" +
          "• MSSA\n" +
          "• N. gonorrhoeae（替代藥物）\n\n" +
          "【不涵蓋】\n" +
          "• MRSA\n" +
          "• Pseudomonas aeruginosa\n" +
          "• Enterococcus\n" +
          "• ESBL-producing organisms",
      },
      {
        heading: "手術預防重點",
        body:
          "• 術前 60 分鐘內給藥\n" +
          "• 手術時間長或大量失血：2 小時後可追加一劑\n" +
          "• Clean / clean-contaminated：不需術後再給\n" +
          "• 常用於泌尿道、腹部、婦科手術\n\n" +
          "⚖️ 肥胖病人注意：\n" +
          "• 40 mg/kg（依實際體重，range 4-7.5 g）仍可能無法達到 PK/PD target\n" +
          "• 4 g 單劑用於平均 BMI 45.8 的 200 名病人，多數未達 target\n" +
          "• 目前無確定劑量建議，數據不足",
      },
      {
        heading: "腎功能調整速查表",
        body:
          "⚠️ 單劑使用（手術預防、門診 PID）不需調整！\n\n" +
          "【UpToDate — 1-2 g Q8H】\n" +
          "  >50: 不調 → 30-50: Q12H → 10-29: Q24H → <10: LD 1g → 500mg-1g Q24H\n\n" +
          "【UpToDate — 1-2 g Q6H】\n" +
          "  >50: 不調 → 30-50: Q8H → 10-29: Q12H → <10: 1g Q24H\n\n" +
          "【熱病（簡化版）】\n" +
          "  >50: 不調 → 10-50: 2g Q8-12H → <10: 2g Q24-48H\n\n" +
          "HD: 同 CrCl <10，透析後給。熱病：2g Q24-48H + 透析後追加 1g\n" +
          "PD: 不被顯著透析。同 CrCl <10。熱病：1g Q24H\n" +
          "CRRT: 數據有限，考慮替代。若必須，同 CrCl 30-50。熱病：2g Q8-12H\n" +
          "PIRRT: 數據有限。PIRRT 日同 CrCl 10-29（一劑 PIRRT 後給）；非 PIRRT 日同 CrCl <10",
      },
      {
        heading: "Scr 假性升高",
        body:
          "⚠️ Cefoxitin 可能干擾 Scr assay（Jaffé method），造成 Scr 假性升高。\n" +
          "• 評估腎功能時需注意此效應\n" +
          "• 使用 enzymatic method 測定可避免此干擾",
      },
      {
        heading: "肝功能",
        body: "CTP A–C：不需調整。",
      },
      {
        heading: "院內品項",
        body: "Cefoxitin (sod) 2 g/Vial（世優注射劑）",
      },
    ],
  },
};
