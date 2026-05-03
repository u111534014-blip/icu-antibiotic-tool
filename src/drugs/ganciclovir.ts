import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Cymevene（Ganciclovir）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Ganciclovir 針 500 mg/Vial（甘西韋注射劑）
//
// 抗病毒藥（CMV / VZV）
// IV 劑量依體重計算（mg/kg）
// 體重：用 IBW（避免過量致血液毒性）
//
// ⚠️ 禁忌：ANC <500、Hb <8、PLT <25,000
// ⚠️ 主要毒性：骨髓抑制（嗜中性球低下、血小板低下、貧血）
// 肝功能：無特殊調整（未被研究）
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

// Helper：四捨五入
function r(n: number): number { return Math.round(n); }

// ── IV 腎調表（分 Induction 和 Maintenance 兩欄）────────────────
// [0] ≥70, [1] 50-<70, [2] 25-<50, [3] 10-<25, [4] <10
type DoseEntry = { mgPerKg: number; freq: string };
type RenalColumn = { label: string; tiers: DoseEntry[] };

const RENAL_COLS: Record<string, RenalColumn> = {
  "induction": {
    label: "Induction（5 mg/kg Q12H）",
    tiers: [
      { mgPerKg: 5,    freq: "Q12H" },                      // ≥70
      { mgPerKg: 2.5,  freq: "Q12H" },                      // 50-<70
      { mgPerKg: 2.5,  freq: "Q24H" },                      // 25-<50
      { mgPerKg: 1.25, freq: "Q24H" },                      // 10-<25
      { mgPerKg: 1.25, freq: "3x/week（Q48-72H）" },        // <10
    ],
  },
  "maintenance": {
    label: "Maintenance（5 mg/kg Q24H）",
    tiers: [
      { mgPerKg: 5,     freq: "Q24H" },
      { mgPerKg: 2.5,   freq: "Q24H" },
      { mgPerKg: 1.25,  freq: "Q24H" },
      { mgPerKg: 0.625, freq: "Q24H" },
      { mgPerKg: 0.625, freq: "3x/week（Q48-72H）" },
    ],
  },
  // 抗藥病毒用高劑量 induction
  "high_induction": {
    label: "High-dose induction（10 mg/kg Q12H）",
    tiers: [
      { mgPerKg: 10,   freq: "Q12H" },
      { mgPerKg: 5,    freq: "Q12H" },
      { mgPerKg: 5,    freq: "Q24H" },
      { mgPerKg: 2.5,  freq: "Q24H" },
      { mgPerKg: 2.5,  freq: "3x/week（Q48-72H）" },
    ],
  },
};

function getTierIndex(crcl: number): number {
  if (crcl >= 70) return 0;
  if (crcl >= 50) return 1;
  if (crcl >= 25) return 2;
  if (crcl >= 10) return 3;
  return 4;
}

function getGanciclovirDose(crcl: number, rrt: string, baseKey: string): {
  mgPerKg: number; freq: string; note: string;
} {
  const col = RENAL_COLS[baseKey] ?? RENAL_COLS["induction"];
  const isInduction = baseKey === "induction" || baseKey === "high_induction";

  if (rrt === "hd") {
    const mgPerKg = isInduction ? 1.25 : 0.625;
    return {
      mgPerKg, freq: "3x/week（透析後給）",
      note: `HD：透析可移除 50-60%（low-flux）。${mgPerKg} mg/kg 3x/week，透析日透析後給`,
    };
  }
  if (rrt === "pd") {
    const mgPerKg = isInduction ? 1.25 : 0.625;
    return {
      mgPerKg, freq: "3x/week",
      note: `PD：${mgPerKg} mg/kg 3x/week`,
    };
  }
  if (rrt === "cvvh") {
    const mgPerKg = isInduction ? 2.5 : 1.25;
    return {
      mgPerKg, freq: "Q24H",
      note: `CRRT：${mgPerKg} mg/kg Q24H。密切監測血液毒性`,
    };
  }

  const tier = getTierIndex(crcl);
  const entry = col.tiers[tier];
  let note = "";
  if (tier === 0) {
    note = "CrCl ≥70：不需調整";
  } else {
    const ranges = ["", "50-<70", "25-<50", "10-<25", "<10"];
    note = `CrCl ${r(crcl)}（${ranges[tier]}）→ 依「${col.label}」欄調整`;
  }

  return { mgPerKg: entry.mgPerKg, freq: entry.freq, note };
}

export const ganciclovir: Drug = {
  name: "Cymevene",
  subtitle: "Ganciclovir",
  searchTerms: [
    "ganciclovir", "cymevene", "甘西韋",
    "CMV", "cmv", "cytomegalovirus",
  ],

  needsRenal: true,
  needsWeight: true,
  needsHepatic: false,
  weightStrategy: "TBW", // calculate 內部依 BMI 判斷用 TBW 或 IBW

  // ──────────────────────────────────────────────────────────────
  // 適應症（照 UpToDate 原文標題）
  // ──────────────────────────────────────────────────────────────
  indications: [

    // ═══ 1. CMV mild-moderate ═══
    {
      id: "cmv_mildMod",
      label: "Cytomegalovirus, mild to moderate disease, treatment（CMV 輕中度疾病）",
      desc: "5 mg/kg Q12H · ≥2 週",
      scenarios: [
        {
          label: "CMV mild-moderate（CMV 輕中度，免疫低下）",
          note: "保留給免疫低下、非嚴重症狀、無組織侵犯但 GI 吸收存疑或快速進展者。至少治療至 CMV viral load 連續 1-2 週不可偵測 + 症狀緩解（最短 2 週）。治療後追蹤 viral load 監測復發",
          baseDose: "induction",
          doseDisplay: "5 mg/kg Q12H IV（induction）",
        },
      ],
    },

    // ═══ 2. CMV tissue-invasive ═══
    {
      id: "cmv_tissue",
      label: "Cytomegalovirus, nonretinitis tissue-invasive disease, treatment（CMV 組織侵犯性疾病）",
      desc: "5 mg/kg Q12H · ≥14-21 天",
      scenarios: [
        {
          label: "CMV tissue-invasive（結腸炎、食道炎、肺炎、神經疾病等）",
          note: "≥14-21 天（常更長），依感染部位、嚴重度、免疫抑制類型、臨床及病毒學反應而定。神經疾病合併 foscarnet",
          baseDose: "induction",
          doseDisplay: "5 mg/kg Q12H IV（induction）",
        },
      ],
    },

    // ═══ 3. CMV resistant ═══
    {
      id: "cmv_resistant",
      label: "Cytomegalovirus, resistant virus, treatment（CMV 抗藥病毒）",
      desc: "替代藥物 · 10 mg/kg Q12H",
      scenarios: [
        {
          label: "CMV resistant, low-level ganciclovir resistance（低度 ganciclovir 抗藥）",
          note: "替代藥物。部分專家保留給 UL97 突變導致 <2× ganciclovir EC50 的低度抗藥。療程依臨床和病毒學反應；無改善則換藥",
          baseDose: "high_induction",
          doseDisplay: "10 mg/kg Q12H IV（high-dose induction）",
        },
      ],
    },

    // ═══ 4. CMV retinitis ═══
    {
      id: "cmv_retinitis",
      label: "Cytomegalovirus retinitis, treatment（CMV 視網膜炎）",
      desc: "Induction → Maintenance",
      scenarios: [
        {
          label: "CMV retinitis, induction（CMV 視網膜炎，誘導治療）",
          note: "替代全身性藥物（保留給無法口服者）。≥14-21 天後轉 maintenance。視力即刻威脅性病灶（鄰近視神經或黃斑）合併玻璃體內注射 + 全身治療",
          baseDose: "induction",
          doseDisplay: "5 mg/kg Q12H IV（induction）",
        },
        {
          label: "CMV retinitis, intravitreal（CMV 視網膜炎，玻璃體內注射）",
          note: "合併全身抗病毒藥。每週一次直到病灶不活動",
          baseDose: "induction",
          doseDisplay: "Intravitreal 2-2.5 mg/0.05 mL QW",
        },
        {
          label: "CMV retinitis, chronic maintenance（CMV 視網膜炎，慢性維持）",
          note: "替代藥物。HIV：持續 ≥3 月直到 CD4 ≥100 + ART 反應 + 所有病灶不活動。移植：依反應和免疫抑制。停藥前諮詢眼科",
          baseDose: "maintenance",
          doseDisplay: "5 mg/kg QD（7 天/週）或 6 mg/kg QD（5 天/週）",
        },
      ],
    },

    // ═══ 5. CMV preemptive ═══
    {
      id: "cmv_preemptive",
      label: "Cytomegalovirus, transplant recipients, preemptive therapy（CMV 移植受者，先制治療）",
      desc: "5 mg/kg Q12H → Q24H",
      scenarios: [
        {
          label: "CMV preemptive therapy（CMV 先制治療）",
          note: "多數專家保留給 HCT 受者和低風險 SOT 受者。病毒量閾值因機構而異。5 mg/kg BID 直到 viral load 不可偵測。HCT 可在 ≥1-2 週 induction + viral load 大幅下降後改 5 mg/kg QD，持續至不可偵測",
          baseDose: "induction",
          doseDisplay: "5 mg/kg Q12H IV → 可降為 Q24H",
        },
      ],
    },

    // ═══ 6. CMV prophylaxis ═══
    {
      id: "cmv_prophy",
      label: "Cytomegalovirus, transplant recipients, prophylaxis（CMV 移植受者，預防）",
      desc: "替代藥物 · 5 mg/kg Q12-24H",
      scenarios: [
        {
          label: "Allogeneic HCT（異體 HCT）",
          note: "替代藥物（專家建議優先用其他藥物）。5 mg/kg Q12H × ~7 天 → 5 mg/kg Q24H 至移植後 ~day 100。或 5 mg/kg QD day −8 至 −2 + 之後高劑量 valacyclovir",
          baseDose: "induction",
          doseDisplay: "5 mg/kg Q12H × 7天 → 5 mg/kg Q24H",
        },
        {
          label: "Solid organ transplant（SOT）",
          note: "替代藥物（專家建議優先用其他藥物）。部分情況在術後初期用 IV 再轉口服。預防時間依移植類型和 CMV 血清狀態",
          baseDose: "maintenance",
          doseDisplay: "5 mg/kg Q24H IV",
        },
      ],
    },

    // ═══ 7. VZV ═══
    {
      id: "vzv",
      label: "Varicella zoster virus（VZV 視網膜疾病）",
      desc: "急性視網膜壞死 / PORN",
      scenarios: [
        {
          label: "Acute retinal necrosis, adjunctive intravitreal（急性視網膜壞死，輔助玻璃體內）",
          note: "合併全身抗病毒藥。每週兩次直到臨床反應",
          baseDose: "induction",
          doseDisplay: "Intravitreal 2 mg/0.05 mL 2x/week",
        },
        {
          label: "Progressive outer retinal necrosis（PORN）",
          note: "合併玻璃體內 ganciclovir（2x/week）± intravitreal foscarnet + 全身抗病毒。療程依臨床、病毒學、免疫反應，諮詢眼科",
          baseDose: "induction",
          doseDisplay: "5 mg/kg Q12H IV + intravitreal 2 mg 2x/week",
        },
      ],
    },

  ], // ← end of indications

  // ──────────────────────────────────────────────────────────────
  // calculate()
  // ──────────────────────────────────────────────────────────────
  calculate({ dosing_weight, crcl, rrt, indicationData, extras }) {
    const ibw: number = extras?.ibw ?? dosing_weight;
    const tbw: number = extras?.tbw ?? dosing_weight;
    const bmi: number = extras?.bmi ?? 0;
    const isObese = bmi >= 30;
    // 非肥胖用 TBW；肥胖用 IBW
    const calcWeight = isObese ? ibw : tbw;
    const weightLabel = isObese ? `IBW ${r(ibw)} kg` : `${r(tbw)} kg`;

    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const baseKey: string = sc.baseDose ?? "induction";
      const warnings: string[] = [];

      const rows: any[] = [
        { label: "原始建議劑量", value: sc.doseDisplay, highlight: true },
      ];

      // 玻璃體內注射不需腎調
      const isIntravitreal = sc.doseDisplay.includes("Intravitreal");
      if (isIntravitreal) {
        rows.push({ label: "腎功能調整", value: "玻璃體內注射不需腎功能調整" });
      } else {
        // IV 計算
        const d = getGanciclovirDose(crcl, rrt, baseKey);
        const dose_mg = r(d.mgPerKg * calcWeight);

        rows.push({
          label: `腎調後劑量（${weightLabel}）`,
          value: `${d.mgPerKg} mg/kg = ${dose_mg} mg ${d.freq}`,
          highlight: true,
        });
        rows.push({ label: "腎功能調整", value: d.note });

        // PIRRT 提醒
        if (rrt === "cvvh") {
          const pirrtMgPerKg = baseKey === "maintenance" ? "1.25" : "2.5";
          warnings.push(`📌 PIRRT：${pirrtMgPerKg} mg/kg Q24H（PIRRT 日在 PIRRT 後給）`);
        }
      }

      // 安全提醒（每個 scenario 都顯示）
      warnings.push("🩸 使用前確認：ANC ≥500 cells/mm³、Hb ≥8 g/dL、PLT ≥25,000 cells/mm³。不符合者不建議使用（可考慮 CSF 提升 ANC）");

      // 骨髓抑制監測
      warnings.push("🔬 主要毒性：骨髓抑制（嗜中性球低下、血小板低下、貧血）。治療期間定期監測 CBC");

      // 體重提醒（僅肥胖時顯示）
      if (isObese && !isIntravitreal) {
        warnings.push("⚖️ 肥胖病人：UpToDate 建議用 IBW 計算（避免過量致血液毒性）。考慮 TDM");
      }

      // ARC
      const isARC = rrt === "none" && crcl >= 130;
      if (isARC && !isIntravitreal) {
        warnings.push("⚡ ARC（CrCl ≥130）：使用適應症允許的最高劑量 + TDM（若可取得）");
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
          "• 抗病毒藥（CMV、VZV）\n" +
          "• IV 劑量依體重（mg/kg），用 IBW 計算\n" +
          "• Induction（誘導）→ Maintenance（維持）兩階段治療\n" +
          "• 主要經腎排除\n" +
          "• 也可玻璃體內注射（CMV 視網膜炎、VZV 視網膜疾病）",
      },
      {
        heading: "安全限制（使用前確認）",
        body:
          "⚠️ 不建議使用於以下病人：\n" +
          "• ANC <500 cells/mm³\n" +
          "• Hb <8 g/dL\n" +
          "• PLT <25,000 cells/mm³\n\n" +
          "Colony-stimulating factors（如 G-CSF）可幫助提升 ANC",
      },
      {
        heading: "Induction vs Maintenance 劑量",
        body:
          "【Induction（誘導期）】5 mg/kg Q12H\n" +
          "  用於：所有 CMV 疾病的初始治療\n" +
          "  療程：通常 ≥14-21 天\n\n" +
          "【High-dose induction】10 mg/kg Q12H\n" +
          "  用於：低度 ganciclovir 抗藥 CMV\n\n" +
          "【Maintenance（維持期）】5 mg/kg Q24H\n" +
          "  用於：CMV 視網膜炎慢性抑制、移植 CMV 預防\n\n" +
          "【Intravitreal（玻璃體內）】2-2.5 mg/0.05 mL\n" +
          "  用於：CMV 視網膜炎、VZV 視網膜疾病",
      },
      {
        heading: "IV 腎功能調整速查表",
        body:
          "【Induction（5 mg/kg Q12H）】\n" +
          "  ≥70: 不調 → 50-<70: 2.5 Q12H → 25-<50: 2.5 Q24H\n" +
          "  → 10-<25: 1.25 Q24H → <10: 1.25 mg/kg 3x/week\n\n" +
          "【Maintenance（5 mg/kg Q24H）】\n" +
          "  ≥70: 不調 → 50-<70: 2.5 Q24H → 25-<50: 1.25 Q24H\n" +
          "  → 10-<25: 0.625 Q24H → <10: 0.625 mg/kg 3x/week\n\n" +
          "HD: 50-60% 移除。Induction 1.25 / Maintenance 0.625 mg/kg 3x/week（透析後給）\n" +
          "PD: 同 HD 頻率\n" +
          "CRRT: Induction 2.5 / Maintenance 1.25 mg/kg Q24H\n" +
          "PIRRT: 同 CRRT（PIRRT 日在 PIRRT 後給）\n\n" +
          "⚠️ 腎功能不全的最佳劑量調整尚未完全確立。CKD-EPI eGFR <50 的重症病人\n" +
          "可能需要比仿單更高的劑量才能達到 trough >1.5 mg/L（建議個別化 + TDM）",
      },
      {
        heading: "體重",
        body:
          "• UpToDate：用 IBW（避免過量致血液毒性）\n" +
          "• 肥胖者：考慮 TDM 監測\n" +
          "• 目前無肥胖病人的 PK 研究",
      },
      {
        heading: "肝功能",
        body: "無特殊調整建議（未被研究，主要經腎排除）。",
      },
      {
        heading: "院內品項",
        body: "Ganciclovir 針 500 mg/Vial（甘西韋注射劑）",
      },
    ],
  },
};
