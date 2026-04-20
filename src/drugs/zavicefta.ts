import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Zavicefta（Ceftazidime / Avibactam）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Zavicefta 針 2.5 g/Vial（Ceftazidime 2 g + Avibactam 0.5 g）
//          贊飛得注射劑 2/0.5 g
//
// 劑量表達：以 ceftazidime/avibactam「合計」公克數表示
//   2.5 g = ceftazidime 2 g + avibactam 0.5 g = 1 整支
//   1.25 g = ceftazidime 1 g + avibactam 0.25 g = 半支
//   0.94 g = ceftazidime 0.75 g + avibactam 0.19 g = 需特殊配置
//
// ⚠️ 臨床定位：
//   不建議常規經驗使用。保留給有或有風險之高度抗藥 GNB：
//   - Carbapenem-resistant Enterobacterales (CRE)
//   - DTR-Pseudomonas aeruginosa
//   - MBL-producing Enterobacterales（合併 aztreonam）
//   - MDR Stenotrophomonas maltophilia（合併 aztreonam）
//
// 輸注時間：標準 2 小時
//   CRE / DTR-PsA / S. maltophilia → 部分專家延長至 3 小時
// ═══════════════════════════════════════════════════════════════

const MG_PER_VIAL = 2500; // 2.5 g/Vial

// ── 腎功能調整表 ──────────────────────────────────────────────
// 每列：{ min: CrCl 下限, dose: 顯示字串, dose_mg: 支數計算用, freq: 頻率 }
const RENAL_TABLE = [
  { min: 51,  dose: "2.5 g",  dose_mg: 2500, freq: "Q8H" },
  { min: 31,  dose: "1.25 g", dose_mg: 1250, freq: "Q8H" },
  { min: 16,  dose: "0.94 g", dose_mg: 940,  freq: "Q12H" },
  { min: 6,   dose: "0.94 g", dose_mg: 940,  freq: "Q24H" },
  { min: 0,   dose: "0.94 g", dose_mg: 940,  freq: "Q48H" },
];

// Helper：支數與配置說明
function getVialInfo(dose_mg: number): string {
  if (dose_mg === 2500) return "1 支（整支）";
  if (dose_mg === 1250) return "0.5 支（半支）：泡製後取 6 mL（仿單值）";
  // 0.94 g = 940 mg 合計 = ceftazidime 750 mg + avibactam 188 mg
  // 仿單：注入 10 mL 無菌水後，因粉末體積，總量約 12 mL
  // 濃度 = 167.3 mg/mL ceftazidime
  // ceftazidime 0.75 g → 750 / 167.3 = 4.48 mL → 仿單取 4.5 mL
  if (dose_mg === 940) return "約 0.38 支：泡製後取 4.5 mL（仿單值，詳見下方泡製說明）";
  // fallback
  const raw = dose_mg / MG_PER_VIAL;
  const half = Math.round(raw * 2) / 2;
  return `${half} 支`;
}

// Helper：取得腎調資訊
function getZaviceftaDose(crcl: number, rrt: string): {
  dose: string;
  dose_mg: number;
  freq: string;
  note: string;
} {
  if (rrt === "hd") {
    return {
      dose: "0.94 g",
      dose_mg: 940,
      freq: "Q24H",
      note: "HD：透析可移除約 55-57%。透析日透析後給藥。殘餘腎功能極低且感染較輕者可考慮 Q48H",
    };
  }
  if (rrt === "pd") {
    return {
      dose: "0.94 g",
      dose_mg: 940,
      freq: "Q24H",
      note: "PD：殘餘腎功能極低且感染較輕者可考慮 Q48H",
    };
  }
  if (rrt === "cvvh") {
    return {
      dose: "1.25 g",
      dose_mg: 1250,
      freq: "Q8H",
      note: "CRRT（CVVH/D/HDF）：基於 high-flux dialyzers + effluent 20-25 mL/kg/hr。需監測反應與神經毒性",
    };
  }

  // 一般 CKD（含 ARC）
  // ARC ≥130：不需調整（仍是 2.5 g Q8H）
  const match = RENAL_TABLE.find((row) => crcl >= row.min)!;
  let note = "";
  if (crcl >= 130) {
    note = "ARC（CrCl ≥130）：不需調整，維持 2.5 g Q8H";
  } else if (crcl > 50) {
    note = "CrCl >50：不需調整";
  } else {
    note = `CrCl ${Math.round(crcl)} mL/min → 劑量調整`;
  }

  return { dose: match.dose, dose_mg: match.dose_mg, freq: match.freq, note };
}

export const zavicefta: Drug = {
  name: "Zavicefta",
  subtitle: "Ceftazidime / Avibactam",
  searchTerms: [
    "zavicefta", "ceftazidime", "avibactam",
    "贊飛得", "CRE", "DTR",
    "carbapenem-resistant", "KPC",
  ],

  needsRenal: true,
  needsWeight: true,  // needsRenal=true 則需 weight（CrCl 計算）
  needsHepatic: false, // 肝功能不需調整

  // ──────────────────────────────────────────────────────────────
  // 適應症（5 大項）
  // ──────────────────────────────────────────────────────────────
  indications: [

    // ═══ 1. Bloodstream infection ═══
    {
      id: "bsi",
      label: "Bloodstream infection（菌血症）",
      desc: "2.5 g Q8H · 7–14 天",
      scenarios: [
        {
          label: "Bloodstream infection（菌血症）",
          note: "療程 7–14 天，依感染源、病原、範圍、反應而定。單純 Enterobacterales + 治療反應佳者可用 7 天。免疫低下（如中性球低下）者可能需更長療程",
        },
      ],
    },

    // ═══ 2. Intra-abdominal infection ═══
    {
      id: "iai",
      label: "Intra-abdominal infection（腹腔內感染）",
      desc: "2.5 g Q8H + metronidazole · 4–5 天",
      scenarios: [
        {
          label: "Intra-abdominal infection（腹腔內感染）",
          note: "合併 metronidazole。源頭控制後 4–5 天（含口服降階）。無手術/引流者可能需更長療程",
        },
      ],
    },

    // ═══ 3. MBL / MDR S. maltophilia ═══
    {
      id: "mbl_steno",
      label: "MBL-Enterobacterales / MDR S. maltophilia",
      desc: "2.5 g Q8H over 3 hr + aztreonam",
      scenarios: [
        {
          label: "MBL-producing Enterobacterales / MDR Stenotrophomonas maltophilia",
          note: "合併 aztreonam（盡量同時給予）。輸注延長至 3 小時。MBL（如 NDM、VIM、IMP 型）會水解 ceftazidime，但 avibactam 可保護 aztreonam 不被 serine β-lactamases 破壞 → synergy",
          infusionNote: "輸注 3 小時（非標準 2 小時）",
        },
      ],
    },

    // ═══ 4. HAP / VAP ═══
    {
      id: "hap_vap",
      label: "HAP / VAP（院內 / 呼吸器相關肺炎）",
      desc: "2.5 g Q8H · 通常 7 天",
      scenarios: [
        {
          label: "Hospital-acquired / Ventilator-associated pneumonia（HAP / VAP）",
          note: "經驗治療可合併 combination regimen。療程依嚴重度與反應，通常 7 天",
        },
      ],
    },

    // ═══ 5. UTI ═══
    {
      id: "uti",
      label: "Urinary tract infection（泌尿道感染）",
      desc: "2.5 g Q8H · 5–7 天",
      scenarios: [
        {
          label: "Acute uncomplicated cystitis（急性單純膀胱炎）",
          note: "療程 5–7 天",
        },
        {
          label: "Complicated UTI / Pyelonephritis（複雜性 UTI / 腎盂腎炎）",
          note: "48 小時內改善者總療程 5–7 天（含口服降階）。全程 Zavicefta 用 7 天",
        },
      ],
    },

  ], // ← end of indications

  // ──────────────────────────────────────────────────────────────
  // calculate()
  // 所有適應症基本劑量都是 2.5 g Q8H，差異在腎調
  // ──────────────────────────────────────────────────────────────
  calculate({ crcl, rrt, indicationData }) {
    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const d = getZaviceftaDose(crcl, rrt);
      const warnings: string[] = [];

      // 輸注時間判斷
      const isExtendedInfusion = sc.infusionNote !== undefined;
      const infusionTime = isExtendedInfusion ? "3 小時" : "2 小時";

      // CRE / DTR-PsA 的延長輸注提醒（非 MBL scenario 也提醒）
      if (!isExtendedInfusion) {
        warnings.push("💡 CRE / DTR-Pseudomonas / S. maltophilia 感染時，部分專家建議延長輸注至 3 小時（標準為 2 小時）");
      }

      // 0.94 g 特殊配製提醒
      if (d.dose_mg === 940) {
        warnings.push("⚠️ 0.94 g 為非整支劑量，需特殊泡製（詳見下方「臨床參考 → 泡製說明」）");
      }

      // PIRRT 額外提醒（因為 PIRRT 邏輯較複雜，用文字說明）
      if (rrt === "cvvh") {
        // 已在 note 裡說明；額外提醒 PIRRT
        warnings.push("📌 PIRRT 劑量不同於 CRRT：PIRRT 日 1.25 g Q12H（其中一劑在 PIRRT 後給）；非 PIRRT 日按 CrCl ≤15 給藥（0.94 g Q24H）。每日 PIRRT ≥12 小時者可能需 Q8H");
      }

      const rows: any[] = [
        { label: "建議劑量", value: `${d.dose} IV`, highlight: true },
        { label: "給藥頻率", value: d.freq, highlight: true },
        { label: "輸注時間", value: infusionTime, highlight: isExtendedInfusion },
        { label: "每次取藥", value: `${getVialInfo(d.dose_mg)} Zavicefta（每支 2.5 g）` },
        { label: "腎功能調整", value: d.note },
      ];

      if (sc.note) {
        rows.push({ label: "療程與備註", value: sc.note });
      }

      return {
        title: sc.label,
        rows,
        warnings,
      };
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
        heading: "臨床定位（不建議常規經驗使用）",
        body:
          "保留給有或有風險之高度抗藥 GNB：\n" +
          "• Carbapenem-resistant Enterobacterales (CRE)，特別是 KPC 型\n" +
          "• Pseudomonas aeruginosa with difficult-to-treat resistance (DTR-PsA)\n" +
          "• MBL-producing Enterobacterales（需合併 aztreonam，見下）\n" +
          "• MDR Stenotrophomonas maltophilia（需合併 aztreonam）\n\n" +
          "⚠️ 對 MBL（NDM、VIM、IMP 型）的 CRE 單獨無效 → 必須合併 aztreonam\n" +
          "（Avibactam 保護 aztreonam 不被 serine β-lactamases 破壞 → synergy）",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• Enterobacterales（含 KPC-producing CRE、ESBL）\n" +
          "• Pseudomonas aeruginosa（含 DTR-PsA）\n" +
          "• S. maltophilia（MDR，需合併 aztreonam）\n\n" +
          "【不涵蓋】\n" +
          "• MBL-producing organisms（NDM、VIM、IMP）→ 單獨無效，需合併 aztreonam\n" +
          "• MRSA\n" +
          "• Anaerobes（需合併 metronidazole）\n" +
          "• Acinetobacter baumannii",
      },
      {
        heading: "腎功能調整速查表",
        body:
          "CrCl >50 mL/min：    2.5 g Q8H（1 整支）\n" +
          "CrCl 31–50：         1.25 g Q8H（半支）\n" +
          "CrCl 16–30：         0.94 g Q12H（特殊配製）\n" +
          "CrCl 6–15：          0.94 g Q24H（特殊配製）\n" +
          "CrCl ≤5：            0.94 g Q48H（特殊配製）\n" +
          "ARC (≥130)：         2.5 g Q8H（不需調整）\n" +
          "HD：                 0.94 g Q24H（透析後，≈55% dialyzable）\n" +
          "PD：                 0.94 g Q24H\n" +
          "CRRT：               1.25 g Q8H\n" +
          "PIRRT 日：           1.25 g Q12H（一劑在 PIRRT 後給）\n" +
          "非 PIRRT 日：        同 CrCl ≤15（0.94 g Q24H）",
      },
      {
        heading: "泡製說明（仿單）",
        body:
          "【Step 1：還原液】\n" +
          "• 用注射器刺穿小瓶封口，注入 10 mL 注射用無菌水\n" +
          "• 搖晃至澄清\n" +
          "• 待溶解後，以氣體釋放針插入封口釋放壓力（維持無菌很重要）\n" +
          "• 還原後濃度：167.3 mg/mL ceftazidime\n" +
          "• ⚠️ 注入 10 mL，但因粉末體積，還原後總量約 12 mL\n\n" +
          "【Step 2：製備輸注溶液】\n" +
          "Ceftazidime 最終濃度須為 8–40 mg/mL\n" +
          "可用稀釋液：0.9% NaCl、5% Dextrose、乳酸林格氏液\n\n" +
          "【配置速查表（仿單）】\n" +
          "┌────────────────┬──────────┬──────────────┬──────────────┐\n" +
          "│ 劑量(ceftazidime)│ 抽取量    │ 輸注袋容量     │ 針筒容量      │\n" +
          "├────────────────┼──────────┼──────────────┼──────────────┤\n" +
          "│ 2 g (整支 2.5g) │ 全量≈12mL │ 50–250 mL    │ 50 mL        │\n" +
          "│ 1 g (半支 1.25g)│ 6 mL     │ 25–125 mL    │ 25–50 mL     │\n" +
          "│ 0.75g (0.94g)   │ 4.5 mL   │ 19–93 mL     │ 19–50 mL     │\n" +
          "│ 其他劑量         │ mg÷167.3 │ 依 8-40mg/mL │ 依 8-40mg/mL │\n" +
          "└────────────────┴──────────┴──────────────┴──────────────┘\n\n" +
          "【穩定性】\n" +
          "• 濃度 8 mg/mL（最大稀釋）：2–8°C 最長 12 小時，隨後 ≤25°C 最長 4 小時\n" +
          "• 濃度 >8–40 mg/mL：≤25°C 最長 4 小時\n" +
          "• 針筒法（≥8–40 mg/mL）：≤25°C 最長 6 小時",
      },
      {
        heading: "輸注時間",
        body:
          "• 標準輸注：2 小時\n" +
          "• CRE / DTR-Pseudomonas / S. maltophilia 感染時，部分專家建議延長至 3 小時\n" +
          "• MBL 合併 aztreonam 時：兩者盡量同時輸注（3 小時）",
      },
      {
        heading: "肝功能",
        body: "不需調整劑量。",
      },
      {
        heading: "院內品項",
        body:
          "Zavicefta 針（贊飛得注射劑）\n" +
          "每支含 Ceftazidime 2 g + Avibactam 0.5 g = 合計 2.5 g",
      },
    ],
  },
};
