import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Zerbaxa（Ceftolozane / Tazobactam）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Ceftolozane/Tazo 1 g/500 mg（諾倍適乾粉注射劑）
//           每支合計 1.5 g（ceftolozane 1 g + tazobactam 0.5 g）
//
// 劑量表達：以 ceftolozane/tazobactam「合計」公克數表示
//   1.5 g = 1 支
//   3 g = 2 支
//
// ⚠️ 臨床定位：
//   不建議常規經驗使用。保留給有或有風險之 MDR GNB：
//   - DTR-Pseudomonas aeruginosa（首選之一）
//   - 其他治療選擇有限的 MDR GNB
//
// 輸注時間：
//   - 標準：1 小時
//   - MDR 感染（非單純膀胱炎）：建議延長至 3 小時
//
// 肝功能：不需調整
// ═══════════════════════════════════════════════════════════════

const MG_PER_VIAL = 1500; // 每支 1.5 g（合計）

// Helper：支數（最接近半支）
function toHalfVials(mg: number): string {
  const raw = mg / MG_PER_VIAL;
  const half = Math.round(raw * 2) / 2;
  if (half === 0.5) return "0.5 支（半支）";
  if (half % 1 === 0) return `${half} 支`;
  return `${half} 支`;
}

// ── 腎調表（依原始劑量分 2 欄）──────────────────────────────────
// [0] >50-130, [1] 30-50, [2] 15-29
// CrCl <15（非透析）：仿單未提供（未被研究）
type DoseEntry = { dose_mg: number; freq: string };
type RenalColumn = { label: string; tiers: DoseEntry[] };

const RENAL_COLS: Record<string, RenalColumn> = {
  "1.5g_q8h": {
    label: "1.5 g Q8H",
    tiers: [
      { dose_mg: 1500, freq: "Q8H" },    // >50
      { dose_mg: 750,  freq: "Q8H" },    // 30-50
      { dose_mg: 375,  freq: "Q8H" },    // 15-29
    ],
  },
  "3g_q8h": {
    label: "3 g Q8H",
    tiers: [
      { dose_mg: 3000, freq: "Q8H" },
      { dose_mg: 1500, freq: "Q8H" },
      { dose_mg: 750,  freq: "Q8H" },
    ],
  },
};

// Helper：CrCl → tier index
function getTierIndex(crcl: number): number {
  if (crcl > 50) return 0;
  if (crcl >= 30) return 1;
  if (crcl >= 15) return 2;
  return -1; // <15 非透析：未被研究
}

// Helper：取得腎調後劑量
function getZerbaxaDose(crcl: number, rrt: string, baseKey: string): {
  dose_mg: number; freq: string; note: string;
} {
  const col = RENAL_COLS[baseKey] ?? RENAL_COLS["3g_q8h"];
  const isHigh = baseKey === "3g_q8h";

  if (rrt === "hd") {
    if (isHigh) {
      return {
        dose_mg: 450, freq: "Q8H",
        note: "HD：透析可移除 ceftolozane 66% / tazobactam 56%。LD 2.25 g → MD 450 mg Q8H。透析日透析後立即給藥",
      };
    }
    return {
      dose_mg: 150, freq: "Q8H",
      note: "HD：透析可移除 ceftolozane 66% / tazobactam 56%。LD 750 mg → MD 150 mg Q8H。透析日透析後立即給藥",
    };
  }
  if (rrt === "pd") {
    // 無明確建議，參考 HD
    if (isHigh) {
      return { dose_mg: 450, freq: "Q8H", note: "PD：無明確建議。參考 HD 劑量（LD 2.25 g → MD 450 mg Q8H）" };
    }
    return { dose_mg: 150, freq: "Q8H", note: "PD：無明確建議。參考 HD 劑量（LD 750 mg → MD 150 mg Q8H）" };
  }
  if (rrt === "cvvh") {
    return {
      dose_mg: 1500, freq: "Q8H",
      note: "CRRT：1.5 g Q8H。Monte Carlo 建議 24hr 後可降至 750 mg Q8H 以減少蓄積。替代：LD 3 g → MD 750 mg Q8H",
    };
  }

  const tier = getTierIndex(crcl);

  // CrCl <15 非透析：未被研究
  if (tier === -1) {
    return {
      dose_mg: 0, freq: "—",
      note: "⚠️ CrCl <15（非透析）：仿單未提供劑量建議（未被研究）",
    };
  }

  const entry = col.tiers[tier];
  let note = "";
  if (tier === 0) {
    note = "CrCl >50：不需調整";
  } else {
    const ranges = ["", "30-50", "15-29"];
    note = `CrCl ${Math.round(crcl)}（${ranges[tier]}）→ 依「${col.label}」欄調整`;
    // AKI 提醒
    note += "。⚠️ AKI 病人考慮延遲降量（如先用足量 48hr 再降）——入院 Scr 可能使 CrCl 被低估";
  }

  return { dose_mg: entry.dose_mg, freq: entry.freq, note };
}

export const zerbaxa: Drug = {
  name: "Zerbaxa",
  subtitle: "Ceftolozane / Tazobactam",
  searchTerms: [
    "ceftolozane", "tazobactam", "zerbaxa", "諾倍適",
  ],

  needsRenal: true,
  needsWeight: false,
  needsHepatic: false,

  // ──────────────────────────────────────────────────────────────
  // 適應症（照 UpToDate 原文標題）
  // ──────────────────────────────────────────────────────────────
  indications: [

    // ═══ 1. Serious infection, DTR-PsA ═══
    {
      id: "dtrPsa",
      label: "Infection, serious, due to difficult-to-treat Pseudomonas aeruginosa（DTR-PsA 嚴重感染）",
      desc: "3 g Q8H · 菌血症 / SSTI 等",
      scenarios: [
        {
          label: "DTR-PsA serious infection（DTR-PsA 嚴重感染）",
          note: "包括菌血症、皮膚軟組織感染等。DTR-PsA 定義：對所有傳統抗 PsA 抗生素（pip/tazo、ceftazidime、cefepime、aztreonam、meropenem、imipenem、ciprofloxacin、levofloxacin）都非敏感",
          baseDose: "3g_q8h",
          doseDisplay: "3 g Q8H IV（延長輸注 3 hr）",
        },
      ],
    },

    // ═══ 2. Intra-abdominal infection ═══
    {
      id: "iai",
      label: "Intra-abdominal infection（腹腔內感染）",
      desc: "替代藥物 + metronidazole",
      scenarios: [
        {
          label: "IAI, standard（腹腔內感染，標準劑量）",
          note: "替代藥物。合併 metronidazole。源頭控制後 4-5 天（含口服降階）。無介入者可能需更長",
          baseDose: "1.5g_q8h",
          doseDisplay: "1.5 g Q8H IV + metronidazole",
        },
        {
          label: "IAI, resistant GNB（腹腔內感染，抗藥 GNB）",
          note: "替代藥物。合併 metronidazole。抗藥 GNB 用高劑量",
          baseDose: "3g_q8h",
          doseDisplay: "3 g Q8H IV + metronidazole（延長輸注 3 hr）",
        },
      ],
    },

    // ═══ 3. HAP / VAP ═══
    {
      id: "hapVap",
      label: "Pneumonia, hospital acquired or ventilator associated（HAP / VAP）",
      desc: "替代藥物 · 3 g Q8H · 通常 7 天",
      scenarios: [
        {
          label: "HAP / VAP（院內 / 呼吸器相關肺炎）",
          note: "替代藥物。通常 7 天",
          baseDose: "3g_q8h",
          doseDisplay: "3 g Q8H IV（延長輸注 3 hr）",
        },
      ],
    },

    // ═══ 4. UTI ═══
    {
      id: "uti",
      label: "Urinary tract infection（泌尿道感染）",
      desc: "膀胱炎 / 複雜性 UTI",
      scenarios: [
        {
          label: "Acute uncomplicated cystitis（單純膀胱炎）",
          note: "5-7 天",
          baseDose: "1.5g_q8h",
          doseDisplay: "1.5 g Q8H IV",
        },
        {
          label: "Complicated UTI / Pyelonephritis, standard（複雜性 UTI，標準劑量）",
          note: "48hr 改善者 5-7 天（全程 Zerbaxa 7 天）",
          baseDose: "1.5g_q8h",
          doseDisplay: "1.5 g Q8H IV",
        },
        {
          label: "Complicated UTI / Pyelonephritis, resistant GNB（複雜性 UTI，抗藥 GNB）",
          note: "抗藥 GNB 用高劑量。48hr 改善者 5-7 天",
          baseDose: "3g_q8h",
          doseDisplay: "3 g Q8H IV（延長輸注 3 hr）",
        },
      ],
    },

  ], // ← end of indications

  // ──────────────────────────────────────────────────────────────
  // calculate()
  // ──────────────────────────────────────────────────────────────
  calculate({ crcl, rrt, indicationData }) {
    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const baseKey: string = sc.baseDose ?? "3g_q8h";
      const d = getZerbaxaDose(crcl, rrt, baseKey);
      const warnings: string[] = [];
      const isHigh = baseKey === "3g_q8h";

      // ARC
      const isARC = rrt === "none" && crcl >= 130;
      if (isARC) {
        warnings.push("⚡ ARC（CrCl ≥130）：經驗治療 → LD 1.5 g → continuous 4.5 g/24hr。無法 continuous 則 3 g Q8H extended 3 hr。導向治療（敏感菌）→ 3 g Q8H extended 3 hr");
      }

      // 臨床定位
      warnings.push("🔒 臨床定位：不建議常規經驗使用。保留給 DTR-Pseudomonas 或治療選擇有限的 MDR GNB");

      // 延長輸注提醒
      if (isHigh) {
        warnings.push("💡 MDR 感染（非單純膀胱炎）建議延長輸注至 3 小時（標準 1 小時）。CrCl >50 時特別建議");
      }

      // CrCl <15 非透析警告
      if (rrt === "none" && crcl < 15) {
        warnings.push("🚫 CrCl <15（非透析）：仿單未提供劑量建議（未被研究）");
      }

      // PIRRT
      if (rrt === "cvvh") {
        warnings.push("📌 PIRRT（數據極有限，僅 1 例報告）：LD 750 mg → off-PIRRT 時 150 mg Q8H。PIRRT session：開始時 750 mg + 結束後 750 mg");
      }

      // 建立 rows
      const rows: any[] = [
        { label: "原始建議劑量", value: sc.doseDisplay, highlight: true },
      ];

      if (d.dose_mg > 0) {
        rows.push({
          label: "腎調後劑量",
          value: `${d.dose_mg >= 1000 ? (d.dose_mg / 1000) + " g" : d.dose_mg + " mg"} ${d.freq} IV`,
          highlight: true,
        });
        rows.push({
          label: "每次取藥",
          value: `${toHalfVials(d.dose_mg)} 諾倍適（每支 1.5 g）`,
        });

        // HD 有 LD
        if (rrt === "hd") {
          const ldMg = isHigh ? 2250 : 750;
          rows.push({
            label: "HD Loading dose",
            value: `${ldMg >= 1000 ? (ldMg / 1000) + " g" : ldMg + " mg"}（首劑）`,
          });
        }
      } else {
        rows.push({
          label: "腎調後劑量",
          value: "🚫 未被研究，無劑量建議",
          highlight: true,
        });
      }

      rows.push({ label: "腎功能調整", value: d.note });

      if (isARC) {
        rows.push({
          label: "⚡ ARC 建議",
          value: "經驗：LD 1.5 g → 4.5 g/24hr continuous\n導向（敏感菌）：3 g Q8H extended 3 hr",
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
        heading: "臨床定位（不建議常規經驗使用）",
        body:
          "保留給有或有風險之 MDR GNB：\n" +
          "• DTR-Pseudomonas aeruginosa（首選之一）\n" +
          "• 其他治療選擇有限的 MDR GNB\n\n" +
          "DTR-PsA 定義：對以下所有類別都「非敏感」（I 或 R）：\n" +
          "  Pip/tazo、Ceftazidime、Cefepime、Aztreonam、\n" +
          "  Meropenem、Imipenem、Ciprofloxacin、Levofloxacin",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• Pseudomonas aeruginosa（含 DTR-PsA）\n" +
          "• Enterobacterales（含部分 ESBL）\n\n" +
          "【不涵蓋】\n" +
          "• MRSA\n" +
          "• Anaerobes（需合併 metronidazole）\n" +
          "• Acinetobacter\n" +
          "• CRE（carbapenem-resistant Enterobacterales）",
      },
      {
        heading: "劑量速查",
        body:
          "【1.5 g Q8H（1 支）】\n" +
          "  標準 IAI、單純膀胱炎、標準 UTI\n\n" +
          "【3 g Q8H（2 支）】\n" +
          "  DTR-PsA 嚴重感染、HAP/VAP、抗藥 GNB 的 IAI/UTI\n\n" +
          "輸注：標準 1 小時；MDR 感染建議延長至 3 小時",
      },
      {
        heading: "腎功能調整速查表",
        body:
          "⚠️ 依「原始建議劑量」分 2 欄！CrCl <15 非透析未被研究！\n\n" +
          "【1.5 g Q8H】\n" +
          "  >50: 1.5g → 30-50: 750mg → 15-29: 375mg（都 Q8H）\n\n" +
          "【3 g Q8H】\n" +
          "  >50: 3g → 30-50: 1.5g → 15-29: 750mg（都 Q8H）\n\n" +
          "ARC (≥130)：\n" +
          "  經驗：LD 1.5g → continuous 4.5g/24hr\n" +
          "  導向（敏感菌）：3g Q8H extended 3hr\n\n" +
          "HD：\n" +
          "  1.5g 欄：LD 750mg → 150mg Q8H（透析後給）\n" +
          "  3g 欄：LD 2.25g → 450mg Q8H（透析後給）\n\n" +
          "CRRT：1.5g Q8H（24hr 後可降至 750mg Q8H。或 LD 3g → 750mg Q8H）\n\n" +
          "PIRRT（極有限數據，僅 1 例報告）：\n" +
          "  LD 750mg → off-PIRRT 150mg Q8H\n" +
          "  PIRRT session：開始 750mg + 結束後 750mg\n\n" +
          "⚠️ AKI 注意：入院 Scr 可能使 CrCl 被低估 → 考慮先用足量 48hr 再依 CrCl 降量",
      },
      {
        heading: "肝功能",
        body: "不需調整。",
      },
      {
        heading: "院內品項",
        body:
          "Ceftolozane/Tazobactam 1 g/500 mg（諾倍適乾粉注射劑）\n" +
          "每支合計 1.5 g（ceftolozane 1 g + tazobactam 0.5 g）",
      },
    ],
  },
};
