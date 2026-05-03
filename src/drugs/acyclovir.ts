import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Zovirax（Acyclovir）
// ═══════════════════════════════════════════════════════════════
// 院內品項：
//   IV：Zovirax 針 250 mg/Vial（熱威樂素注射劑）
//   PO：Acylete 錠劑 400 mg（敵庖治錠）
//
// 抗病毒藥（HSV / VZV）
// IV 劑量依體重計算（mg/kg）
//   - UpToDate：用 IBW，BMI ≥40 用 ABW（避免過量致腎毒性）
//   - 熱病：用 ABW
//   - 本工具：兩者並列顯示
// PO 為固定劑量（200/400/800 mg）
//
// ⚠️ IV 需充分水化（預防結晶性腎病變）
// ⚠️ 腎功能不全時注意神經毒性
// 肝功能：CTP A–C 不需調整
// ═══════════════════════════════════════════════════════════════

const MG_PER_VIAL = 250; // IV：每支 250 mg
const MG_PER_TAB = 400;  // PO：每顆 400 mg

// Helper：IV 支數（最接近半支）
function toHalfVials(mg: number): string {
  const raw = mg / MG_PER_VIAL;
  const half = Math.round(raw * 2) / 2;
  if (half === 0.5) return "0.5 支（半支）";
  if (half % 1 === 0) return `${half} 支`;
  return `${half} 支`;
}

// Helper：PO 顆數
function toTablets(mg: number): string {
  if (mg === 200) return "Acylete 400 mg × 半顆";
  if (mg === 400) return "Acylete 400 mg × 1 顆";
  if (mg === 600) return "Acylete 400 mg × 1.5 顆";
  if (mg === 800) return "Acylete 400 mg × 2 顆";
  const tabs = mg / MG_PER_TAB;
  return `Acylete 400 mg × ${tabs} 顆`;
}

// Helper：四捨五入
function r(n: number): number { return Math.round(n); }

// ── IV 腎調（依 mg/kg/dose 分 2 欄）──────────────────────────
// CrCl 以 mL/min/1.73m² 表示（UpToDate 原文用 BSA-adjusted）
// [0] >50, [1] 25-50, [2] 10-<25, [3] <10
type DoseEntry = { mgPerKg: number; freq: string };
type RenalColumn = { label: string; tiers: DoseEntry[] };

const IV_RENAL_COLS: Record<string, RenalColumn> = {
  "5_q8h": {
    label: "5 mg/kg Q8H",
    tiers: [
      { mgPerKg: 5,   freq: "Q8H" },    // >50
      { mgPerKg: 5,   freq: "Q12H" },   // 25-50
      { mgPerKg: 5,   freq: "Q24H" },   // 10-<25
      { mgPerKg: 2.5, freq: "Q24H" },   // <10
    ],
  },
  "10_q8h": {
    label: "10 mg/kg Q8H",
    tiers: [
      { mgPerKg: 10, freq: "Q8H" },
      { mgPerKg: 10, freq: "Q12H" },
      { mgPerKg: 10, freq: "Q24H" },
      { mgPerKg: 5,  freq: "Q24H" },
    ],
  },
};

// ── PO 腎調（依原始劑量分 3 欄）──────────────────────────────
// [0] >50, [1] 25-50, [2] 10-<25, [3] <10
type POEntry = { dose_mg: number; freq: string };
type PORenalColumn = { label: string; tiers: POEntry[] };

const PO_RENAL_COLS: Record<string, PORenalColumn> = {
  "400_q12h": {
    label: "400 mg Q12H",
    tiers: [
      { dose_mg: 400, freq: "Q12H" },
      { dose_mg: 400, freq: "Q12H" },         // 25-50：不調
      { dose_mg: 200, freq: "Q12H" },         // 10-<25：可不調或減量
      { dose_mg: 200, freq: "Q12H" },         // <10
    ],
  },
  "200_5x": {
    label: "200 mg 5 次/天",
    tiers: [
      { dose_mg: 200, freq: "5 次/天" },
      { dose_mg: 200, freq: "5 次/天" },
      { dose_mg: 200, freq: "Q8H" },          // 10-<25：可不調或減量
      { dose_mg: 200, freq: "Q12H" },
    ],
  },
  "800_5x": {
    label: "800 mg 5 次/天",
    tiers: [
      { dose_mg: 800, freq: "5 次/天" },
      { dose_mg: 800, freq: "5 次/天" },
      { dose_mg: 800, freq: "Q8H" },
      { dose_mg: 200, freq: "Q12H" },         // <10：大幅減量（避免神經毒性）
    ],
  },
};

function getIVTierIndex(crcl: number): number {
  if (crcl > 50) return 0;
  if (crcl >= 25) return 1;
  if (crcl >= 10) return 2;
  return 3;
}

function getIVDose(crcl: number, rrt: string, baseKey: string): {
  mgPerKg: number; freq: string; note: string;
} {
  const col = IV_RENAL_COLS[baseKey] ?? IV_RENAL_COLS["10_q8h"];

  if (rrt === "hd") {
    const base = baseKey === "5_q8h" ? 2.5 : 5;
    return {
      mgPerKg: base, freq: "Q24H",
      note: `HD：透析可移除 60%（6hr session）。${base} mg/kg Q24H。透析日透析後給藥（或額外追加一劑）。建議 TDM`,
    };
  }
  if (rrt === "pd") {
    const base = baseKey === "5_q8h" ? 2.5 : 5;
    return {
      mgPerKg: base, freq: "Q24H",
      note: `PD：移除約 12%（CAPD）。${base} mg/kg Q24H。建議 TDM`,
    };
  }
  if (rrt === "cvvh") {
    const base = baseKey === "5_q8h" ? 5 : 10;
    return {
      mgPerKg: base, freq: "Q12-24H",
      note: `CRRT：${base} mg/kg Q12-24H。VZV 腦膜腦炎用高劑量端。建議 TDM`,
    };
  }

  const tier = getIVTierIndex(crcl);
  const entry = col.tiers[tier];
  let note = "";
  if (tier === 0) {
    note = "CrCl >50：不需調整";
  } else {
    const ranges = ["", "25-50", "10-<25", "<10"];
    note = `CrCl ${r(crcl)}（${ranges[tier]}）→ 依「${col.label}」欄調整`;
  }

  return { mgPerKg: entry.mgPerKg, freq: entry.freq, note };
}

function getPODose(crcl: number, rrt: string, baseKey: string): {
  dose_mg: number; freq: string; note: string;
} {
  const col = PO_RENAL_COLS[baseKey] ?? PO_RENAL_COLS["400_q12h"];

  if (rrt === "hd") {
    if (baseKey === "800_5x") {
      return { dose_mg: 200, freq: "Q12H", note: "HD：LD 400 mg → 200 mg Q12H + 透析後追加 400 mg。建議 TDM" };
    }
    return { dose_mg: 200, freq: "Q12H", note: "HD：200 mg Q12H。透析日透析後給藥或追加一劑。建議 TDM" };
  }
  if (rrt === "pd") {
    if (baseKey === "800_5x") {
      return { dose_mg: 800, freq: "Q24H", note: "PD：600-800 mg Q24H。建議 TDM" };
    }
    return { dose_mg: 200, freq: "Q12H", note: "PD：200 mg Q12H。建議 TDM" };
  }
  if (rrt === "cvvh") {
    // CRRT PO 無明確建議，參考 IV 調整
    return { dose_mg: col.tiers[1].dose_mg, freq: col.tiers[1].freq, note: "CRRT：PO 數據有限，建議改用 IV。若必須 PO，參考 CrCl 25-50 調整" };
  }

  const tier = getIVTierIndex(crcl); // 用同樣的 CrCl 切點
  const entry = col.tiers[tier];
  let note = "";
  if (tier === 0) {
    note = "CrCl >50：不需調整";
  } else {
    const ranges = ["", "25-50", "10-<25", "<10"];
    note = `CrCl ${r(crcl)}（${ranges[tier]}）→ 依「${col.label}」欄調整`;
    if (tier === 3 && baseKey === "800_5x") {
      note += "。⚠️ ESRD 有神經毒性報告，大幅減量";
    }
  }

  return { dose_mg: entry.dose_mg, freq: entry.freq, note };
}

export const acyclovir: Drug = {
  name: "Zovirax",
  subtitle: "Acyclovir",
  searchTerms: [
    "acyclovir", "zovirax", "acylete", "熱威樂素", "敵庖治",
    "HSV", "VZV", "herpes", "zoster", "varicella",
  ],

  needsRenal: true,
  needsWeight: true,
  needsHepatic: false,
  weightStrategy: "IBW_if_obese", // BMI ≥30 用 IBW；BMI <30 用 TBW

  // ──────────────────────────────────────────────────────────────
  // 適應症（照 UpToDate 原文標題）
  // ──────────────────────────────────────────────────────────────
  indications: [

    // ═══ 1. Bell palsy ═══
    {
      id: "bellPalsy",
      label: "Bell palsy, new onset（貝爾氏麻痺）",
      desc: "輔助治療，合併 corticosteroid · 10 天",
      scenarios: [
        {
          label: "Bell palsy（貝爾氏麻痺，輔助治療）",
          note: "替代藥物。合併 corticosteroid。症狀出現 3 天內開始。單獨抗病毒不建議；部分專家僅在嚴重 Bell palsy 時加抗病毒",
          route: "PO",
          poKey: "400_q12h",
          doseDisplay: "400 mg PO 5 次/天 × 10 天",
        },
      ],
    },

    // ═══ 2. HSV CNS infection ═══
    {
      id: "hsvCNS",
      label: "Herpes simplex virus, CNS infection（HSV 中樞神經感染）",
      desc: "10 mg/kg Q8H IV · 10-21 天",
      scenarios: [
        {
          label: "HSV encephalitis（HSV 腦炎）",
          note: "所有疑似腦炎病人應開始經驗治療。14-21 天，全程 IV",
          route: "IV",
          ivKey: "10_q8h",
          doseDisplay: "10 mg/kg Q8H IV",
        },
        {
          label: "HSV meningitis（HSV 腦膜炎）",
          note: "10-14 天。可含口服降階",
          route: "IV",
          ivKey: "10_q8h",
          doseDisplay: "10 mg/kg Q8H IV",
        },
      ],
    },

    // ═══ 3. HSV mucocutaneous ═══
    {
      id: "hsvMucocutaneous",
      label: "Herpes simplex virus, mucocutaneous infection（HSV 黏膜皮膚感染）",
      desc: "食道炎 / 生殖器 / 口唇",
      scenarios: [
        {
          label: "Esophagitis, immunocompetent（食道炎，免疫正常）",
          note: "7-10 天",
          route: "PO",
          poKey: "400_q12h",
          doseDisplay: "400 mg PO TID 或 200 mg PO 5 次/天",
        },
        {
          label: "Esophagitis, immunocompromised（食道炎，免疫低下）",
          note: "14-21 天",
          route: "PO",
          poKey: "400_q12h",
          doseDisplay: "400 mg PO 5 次/天",
        },
        {
          label: "Esophagitis, severe（食道炎，嚴重吞嚥困難）",
          note: "改善後轉口服。總療程 7-14 天",
          route: "IV",
          ivKey: "5_q8h",
          doseDisplay: "5 mg/kg Q8H IV",
        },
        {
          label: "Genital HSV, initial episode（生殖器 HSV，初次發作）",
          note: "7-10 天；10 天未癒合可延長",
          route: "PO",
          poKey: "400_q12h",
          doseDisplay: "400 mg PO TID × 7-10 天",
        },
        {
          label: "Genital HSV, initial, severe（生殖器 HSV，初次嚴重）",
          note: "改善後轉口服，總療程 >10 天",
          route: "IV",
          ivKey: "5_q8h",
          doseDisplay: "5-10 mg/kg Q8H IV",
        },
        {
          label: "Genital HSV, recurrent episode（生殖器 HSV，復發）",
          note: "前驅期或病灶出現 1 天內最有效",
          route: "PO",
          poKey: "800_5x",
          doseDisplay: "800 mg PO BID × 5 天 或 800 mg TID × 2 天",
        },
        {
          label: "Genital HSV, suppressive therapy（生殖器 HSV，抑制療法）",
          note: "定期（如每年）重新評估需要性",
          route: "PO",
          poKey: "400_q12h",
          doseDisplay: "400 mg PO BID",
        },
        {
          label: "Orolabial HSV, treatment（口唇 HSV，治療）",
          note: "最早症狀即開始。免疫低下者持續到完全癒合。5-10 天",
          route: "PO",
          poKey: "400_q12h",
          doseDisplay: "400 mg PO TID × 5-10 天",
        },
        {
          label: "Orolabial HSV, suppressive therapy（口唇 HSV，抑制療法）",
          note: "定期重新評估",
          route: "PO",
          poKey: "400_q12h",
          doseDisplay: "400 mg PO BID",
        },
      ],
    },

    // ═══ 4. HSV prevention in immunocompromised ═══
    {
      id: "hsvPrevention",
      label: "Herpes simplex virus, prevention in immunocompromised（HSV 預防，免疫低下）",
      desc: "HCT / SOT",
      scenarios: [
        {
          label: "HCT recipients, seropositive（HCT，血清陽性）",
          note: "化療或 conditioning 開始時即開始。持續至 WBC 恢復 + 黏膜炎緩解。頻繁復發或 GVHD 可延長",
          route: "BOTH",
          ivKey: "5_q8h",
          poKey: "400_q12h",
          doseDisplay: "IV 250 mg/m² Q12H 或 PO 400-800 mg BID",
        },
        {
          label: "SOT recipients, HSV-seropositive（SOT，不需 CMV 預防者）",
          note: "≥1 個月（部分專家 3-6 個月 + 排斥治療期間）",
          route: "PO",
          poKey: "400_q12h",
          doseDisplay: "400-800 mg PO BID",
        },
      ],
    },

    // ═══ 5. Herpes zoster ═══
    {
      id: "zoster",
      label: "Herpes zoster, treatment（帶狀疱疹）",
      desc: "PO 800 mg 5x/天 / IV 10 mg/kg Q8H",
      scenarios: [
        {
          label: "Acute localized dermatomal（急性局部皮節型）",
          note: "最早開始。≤72hr 後仍可開始（如有新病灶）。免疫低下者 >72hr 只要未全部結痂仍建議治療。7-10 天（改善慢可延長）",
          route: "PO",
          poKey: "800_5x",
          doseDisplay: "800 mg PO 5 次/天 × 7-10 天",
        },
        {
          label: "Disseminated zoster（播散性帶狀疱疹）",
          note: "廣泛皮膚或內臟受侵。新病灶停止 + 內臟改善後可轉口服。總療程 10-14 天",
          route: "IV",
          ivKey: "10_q8h",
          doseDisplay: "10 mg/kg Q8H IV",
        },
      ],
    },

    // ═══ 6. Varicella ═══
    {
      id: "varicella",
      label: "Varicella, treatment（水痘）",
      desc: "嚴重 IV / 輕度 PO",
      scenarios: [
        {
          label: "Severe or complicated varicella（嚴重/複雜水痘）",
          note: "7-10 天。退燒 + 無內臟受侵可轉口服，持續到所有病灶結痂",
          route: "IV",
          ivKey: "10_q8h",
          doseDisplay: "10 mg/kg Q8H IV",
        },
        {
          label: "Uncomplicated varicella（輕度水痘）",
          note: "≥5-7 天，持續到所有病灶結痂。免疫低下者至少 7 天",
          route: "PO",
          poKey: "800_5x",
          doseDisplay: "800 mg PO 5 次/天",
        },
      ],
    },

    // ═══ 7. VZV acute retinal necrosis ═══
    {
      id: "vzv_arn",
      label: "Varicella zoster virus, acute retinal necrosis（VZV 急性視網膜壞死）",
      desc: "10 mg/kg Q8H IV · 10-14 天",
      scenarios: [
        {
          label: "Acute retinal necrosis（急性視網膜壞死）",
          note: "10-14 天 IV，之後長期 valacyclovir。HIV 者可考慮合併玻璃體內 ganciclovir",
          route: "IV",
          ivKey: "10_q8h",
          doseDisplay: "10 mg/kg Q8H IV",
        },
      ],
    },

    // ═══ 8. VZV encephalitis ═══
    {
      id: "vzv_encephalitis",
      label: "Varicella zoster virus, encephalitis（VZV 腦炎）",
      desc: "10-15 mg/kg Q8H IV · 10-14 天",
      scenarios: [
        {
          label: "VZV encephalitis（VZV 腦炎）",
          note: "部分專家用更高劑量（15 mg/kg Q8H），但耐受性可能受限。10-14 天",
          route: "IV",
          ivKey: "10_q8h",
          doseDisplay: "10 mg/kg Q8H IV（部分專家 15 mg/kg）",
        },
      ],
    },

    // ═══ 9. VZV prevention in immunocompromised ═══
    {
      id: "vzv_prevention",
      label: "Varicella zoster virus, prevention in immunocompromised（VZV 預防，免疫低下）",
      desc: "HCT / SOT",
      scenarios: [
        {
          label: "HCT recipients, seropositive（HCT，VZV 血清陽性）",
          note: "化療或 conditioning 開始。持續 1 年；持續免疫抑制者可延長（部分專家到停止所有免疫抑制後 6 個月）",
          route: "PO",
          poKey: "800_5x",
          doseDisplay: "800 mg PO BID",
        },
        {
          label: "SOT recipients, VZV-seropositive（SOT，不需 CMV 預防者）",
          note: "移植後 3-6 個月 + 排斥治療期間",
          route: "PO",
          poKey: "200_5x",
          doseDisplay: "200 mg PO 3-5 次/天",
        },
      ],
    },

  ], // ← end of indications

  // ──────────────────────────────────────────────────────────────
  // calculate()
  // ──────────────────────────────────────────────────────────────
  calculate({ dosing_weight, crcl, rrt, indicationData, extras }) {
    // 取得 IBW 和 TBW（App.tsx 傳入的 extras）
    const ibw: number = extras?.ibw ?? dosing_weight;
    const tbw: number = extras?.tbw ?? dosing_weight;
    // ABW = IBW + 0.4 × (TBW - IBW)
    const abw: number = ibw + 0.4 * (tbw - ibw);
    // BMI（用 extras 傳入的 bmi，或 fallback 用 0）
    const bmi: number = extras?.bmi ?? 0;
    const isObese = bmi >= 30;

    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const route: string = sc.route ?? "PO";
      const warnings: string[] = [];

      const rows: any[] = [
        { label: "原始建議劑量", value: sc.doseDisplay, highlight: true },
      ];

      // ── IV 計算 ──
      if (route === "IV" || route === "BOTH") {
        const ivKey: string = sc.ivKey ?? "10_q8h";
        const d = getIVDose(crcl, rrt, ivKey);

        if (isObese) {
          // BMI ≥30：顯示 IBW 和 ABW 兩行讓使用者選
          const doseIBW = r(d.mgPerKg * ibw);
          const doseABW = r(d.mgPerKg * abw);

          rows.push({
            label: `腎調後 IV（IBW ${r(ibw)} kg）`,
            value: `${doseIBW} mg ${d.freq}（${toHalfVials(doseIBW)}）`,
            highlight: true,
          });
          rows.push({
            label: `腎調後 IV（ABW ${r(abw)} kg）`,
            value: `${doseABW} mg ${d.freq}（${toHalfVials(doseABW)}）`,
            highlight: true,
          });

          // 體重選擇提醒
          warnings.push("⚖️ 肥胖病人 IV 劑量：UpToDate 建議用 IBW（避免過量致腎毒性）；BMI ≥40 的重症者可考慮 ABW。熱病建議統一用 ABW。上方兩者並列，請依臨床判斷選擇");
        } else {
          // BMI <30：只顯示一行（用 TBW）
          const doseTBW = r(d.mgPerKg * tbw);

          rows.push({
            label: `腎調後 IV（${r(tbw)} kg）`,
            value: `${doseTBW} mg ${d.freq}（${toHalfVials(doseTBW)}）`,
            highlight: true,
          });
        }

        rows.push({ label: "IV 腎功能調整", value: d.note });
      }

      // ── PO 計算 ──
      if (route === "PO" || route === "BOTH") {
        const poKey: string = sc.poKey ?? "400_q12h";
        const d = getPODose(crcl, rrt, poKey);

        rows.push({
          label: "腎調後 PO",
          value: `${d.dose_mg} mg ${d.freq}（${toTablets(d.dose_mg)}）`,
          highlight: true,
        });
        rows.push({ label: "PO 腎功能調整", value: d.note });
      }

      // ARC
      const isARC = rrt === "none" && crcl >= 130;
      if (isARC) {
        warnings.push("⚡ ARC（CrCl ≥130）：使用適應症允許的最高劑量 + TDM（若可取得）");
      }

      // 神經毒性
      if (rrt !== "none" || crcl < 25) {
        warnings.push("🧠 腎功能不全時 acyclovir 蓄積，注意神經毒性（意識改變、肌陣攣、癲癇、幻覺）。建議 TDM");
      }

      // 腎毒性
      if (route === "IV" || route === "BOTH") {
        warnings.push("💧 IV acyclovir 需充分水化（預防結晶性腎病變）。緩慢輸注（≥1 小時）");
      }

      // PIRRT
      if (rrt === "cvvh") {
        warnings.push("📌 PIRRT：IV 5-10 mg/kg Q12-24H。非 PIRRT 日同 CrCl <10。建議 TDM");
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
          "• 抗病毒藥（HSV-1、HSV-2、VZV）\n" +
          "• IV 劑量依體重（mg/kg），PO 為固定劑量\n" +
          "• PO 生體可用率低（15-30%）→ 嚴重感染需 IV\n" +
          "• IV 需充分水化 + 緩慢輸注 ≥1 小時（預防結晶性腎病變）",
      },
      {
        heading: "IV 體重選擇",
        body:
          "⚠️ UpToDate 與熱病建議不同：\n\n" +
          "【UpToDate】\n" +
          "• 一般用 IBW（避免過量致腎毒性）\n" +
          "• BMI ≥40 重症（如 HSV 腦炎）可考慮 ABW（避免劑量不足）\n" +
          "• ABW = IBW + 0.4 ×（TBW - IBW）\n\n" +
          "【熱病】\n" +
          "• 統一用 ABW（adjusted body weight）\n\n" +
          "本工具兩者並列顯示，請依臨床判斷選擇",
      },
      {
        heading: "適應症與劑量速查",
        body:
          "【IV 5 mg/kg Q8H】HSV 食道炎（嚴重）、HSV 生殖器（嚴重）、口唇（嚴重免疫低下）\n" +
          "【IV 10 mg/kg Q8H】HSV 腦炎/腦膜炎、帶狀疱疹（播散性）、水痘（嚴重）、VZV 腦炎、VZV 視網膜壞死\n" +
          "【PO 400 mg TID 或 BID】HSV 初次/復發/抑制療法、食道炎\n" +
          "【PO 800 mg 5x/天】帶狀疱疹（局部）、水痘（輕度）",
      },
      {
        heading: "IV 腎功能調整速查表",
        body:
          "【5 mg/kg Q8H】\n" +
          "  >50: 不調 → 25-50: Q12H → 10-<25: Q24H → <10: 2.5 mg/kg Q24H\n\n" +
          "【10 mg/kg Q8H】\n" +
          "  >50: 不調 → 25-50: Q12H → 10-<25: Q24H → <10: 5 mg/kg Q24H\n\n" +
          "HD: 60% 移除。2.5-5 mg/kg Q24H（透析後給）\n" +
          "PD: 12% 移除。2.5-5 mg/kg Q24H\n" +
          "CRRT: 5-10 mg/kg Q12-24H\n" +
          "PIRRT: 5-10 mg/kg Q12-24H；非 PIRRT 日同 CrCl <10\n" +
          "所有 RRT 建議 TDM",
      },
      {
        heading: "PO 腎功能調整速查表",
        body:
          "【400 mg Q12H / 200 mg 5x/天】\n" +
          "  >50: 不調 → 25-50: 不調 → 10-<25: 可不調或減至 200 Q12H/Q8H\n" +
          "  → <10: 200 Q12H\n\n" +
          "【800 mg 5x/天】\n" +
          "  >50: 不調 → 25-50: 不調 → 10-<25: 800 Q8H\n" +
          "  → <10: 200 Q12H（⚠️ ESRD 有神經毒性報告，大幅減量）\n\n" +
          "HD（PO）：\n" +
          "  200/400 mg → 200 Q12H（透析後給或追加）\n" +
          "  800 mg → LD 400 → 200 Q12H + 透析後追加 400 mg",
      },
      {
        heading: "神經毒性",
        body:
          "腎功能不全時 acyclovir 蓄積可致：\n" +
          "• 意識改變、嗜睡\n" +
          "• 肌陣攣（myoclonus）\n" +
          "• 癲癇\n" +
          "• 幻覺、譫妄\n\n" +
          "→ 腎功能不全務必調整劑量 + TDM（若可取得）",
      },
      {
        heading: "肝功能",
        body: "CTP A–C：不需調整。",
      },
      {
        heading: "院內品項",
        body:
          "• IV：Zovirax 針 250 mg/Vial（熱威樂素注射劑）\n" +
          "• PO：Acylete 錠劑 400 mg（敵庖治錠）",
      },
    ],
  },
};
