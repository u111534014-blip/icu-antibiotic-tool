import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Teicoplanin（Teicod / 得那林）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Teicod 針（得那林凍晶注射劑）200 mg/Vial
//
// 特性：
//   - Glycopeptide（與 vancomycin 同類，但半衰期長 70-100 hr）
//   - Loading 分三天，每天劑量不同
//   - 依 target trough 分兩種方案（15-30 vs 20-40）
//   - 腎調依 eGFR（非 CrCl）→ 本工具同時顯示兩者
//   - 用 actual body weight（TBW）計算
//   - 可 IM 給藥（單次最多 400 mg）
//
// 參考文獻：J Antimicrob Chemother 2022;77:869
// ═══════════════════════════════════════════════════════════════

const MG_PER_VIAL = 200; // 200 mg/Vial

// Helper：mg → 支數（最接近半支）
function toHalfVials(mg: number): string {
  const raw = mg / MG_PER_VIAL;
  const half = Math.round(raw * 2) / 2;
  if (half === 0.5) return "0.5 支（半支）";
  if (half % 1 === 0) return `${half} 支`;
  return `${half} 支`;
}

// Helper：四捨五入到整數（劑量用）
function r(n: number): number { return Math.round(n); }

// ── 依 eGFR + target 取得 Loading Day 1/2/3 與 Maintenance ──
// 回傳物件描述每天的 mg/kg 和頻率
type DayDose = { mgPerKg: number; freq: string; label: string };
type RegimenResult = {
  days: [DayDose, DayDose, DayDose]; // Day 1, Day 2, Day 3
  maint: { mgPerKg_min: number; mgPerKg_max: number; freq: string };
  renalNote: string;
};

function getRegimen(
  egfr: number,
  rrt: string,
  target: "15-30" | "20-40",
): RegimenResult {

  // ── CRRT (CVVHDF) ──
  if (rrt === "cvvh") {
    if (target === "15-30") {
      return {
        days: [
          { mgPerKg: 10, freq: "Q12H", label: "Day 1：10 mg/kg Q12H（2 次）" },
          { mgPerKg: 10, freq: "QD",   label: "Day 2：10 mg/kg × 1" },
          { mgPerKg: 10, freq: "QD",   label: "Day 3：10 mg/kg × 1" },
        ],
        maint: { mgPerKg_min: 3, mgPerKg_max: 3.3, freq: "QD" },
        renalNote: "CVVHDF：高流量時考慮前 3 天共 5 劑 12 mg/kg + 較高維持劑量（需更多研究）",
      };
    }
    // target 20-40
    return {
      days: [
        { mgPerKg: 12, freq: "Q12H", label: "Day 1：12 mg/kg Q12H（2 次）" },
        { mgPerKg: 12, freq: "QD",   label: "Day 2：12 mg/kg × 1" },
        { mgPerKg: 12, freq: "QD",   label: "Day 3：12 mg/kg × 1" },
      ],
      maint: { mgPerKg_min: 3, mgPerKg_max: 3.3, freq: "QD" },
      renalNote: "CVVHDF：高流量時考慮前 3 天共 5 劑 12 mg/kg + 較高維持劑量（需更多研究）",
    };
  }

  // ── HD（透析不移除 teicoplanin → 同 eGFR <30）──
  if (rrt === "hd") {
    if (target === "15-30") {
      return {
        days: [
          { mgPerKg: 12, freq: "Q12H", label: "Day 1：12 mg/kg Q12H（2 次）" },
          { mgPerKg: 5,  freq: "QD",   label: "Day 2：5 mg/kg × 1" },
          { mgPerKg: 5,  freq: "QD",   label: "Day 3：5 mg/kg × 1" },
        ],
        maint: { mgPerKg_min: 5, mgPerKg_max: 5, freq: "QOD（每隔一天）" },
        renalNote: "HD：Teicoplanin 不被透析移除，劑量同 eGFR <30",
      };
    }
    return {
      days: [
        { mgPerKg: 12, freq: "Q12H", label: "Day 1：12 mg/kg Q12H（2 次）" },
        { mgPerKg: 12, freq: "QD",   label: "Day 2：12 mg/kg × 1" },
        { mgPerKg: 6.7, freq: "QD",  label: "Day 3：6–6.7 mg/kg × 1" },
      ],
      maint: { mgPerKg_min: 3, mgPerKg_max: 3.3, freq: "QD" },
      renalNote: "HD：Teicoplanin 不被透析移除，劑量同 eGFR <30",
    };
  }

  // ── PD（無數據，依保守原則同 eGFR <30）──
  if (rrt === "pd") {
    const reg = getRegimen(0, "none", target); // 用 eGFR <30 的方案
    reg.renalNote = "PD：數據不足，建議同 eGFR <30 處理。建議搭配 TDM 監測";
    return reg;
  }

  // ── 一般腎功能（依 eGFR）──

  // eGFR ≥ 60：正常腎功能
  if (egfr >= 60) {
    if (target === "15-30") {
      return {
        days: [
          { mgPerKg: 12, freq: "Q12H", label: "Day 1：12 mg/kg Q12H（2 次）" },
          { mgPerKg: 12, freq: "QD",   label: "Day 2：12 mg/kg × 1" },
          { mgPerKg: 12, freq: "QD",   label: "Day 3：12 mg/kg × 1" },
        ],
        maint: { mgPerKg_min: 6, mgPerKg_max: 6.7, freq: "QD" },
        renalNote: "eGFR ≥60：不需調整",
      };
    }
    // target 20-40（熱病版：Day 1 + Day 2 都 Q12H）
    return {
      days: [
        { mgPerKg: 12, freq: "Q12H", label: "Day 1：12 mg/kg Q12H（2 次）" },
        { mgPerKg: 12, freq: "Q12H", label: "Day 2：12 mg/kg Q12H（2 次）" },
        { mgPerKg: 12, freq: "QD",   label: "Day 3：12 mg/kg × 1" },
      ],
      maint: { mgPerKg_min: 6, mgPerKg_max: 6.7, freq: "QD" },
      renalNote: "eGFR ≥60：不需調整。Target ≥20 可能需更高維持劑量（data limited）",
    };
  }

  // eGFR 30-59
  if (egfr >= 30) {
    if (target === "15-30") {
      return {
        days: [
          { mgPerKg: 12,  freq: "Q12H", label: "Day 1：12 mg/kg Q12H（2 次）" },
          { mgPerKg: 10,  freq: "QD",   label: "Day 2：10 mg/kg × 1" },
          { mgPerKg: 6.7, freq: "QD",   label: "Day 3：6–6.7 mg/kg × 1" },
        ],
        maint: { mgPerKg_min: 3, mgPerKg_max: 3.3, freq: "QD" },
        renalNote: `eGFR ${r(egfr)}（30-59）：Loading 與 maintenance 均需調整`,
      };
    }
    return {
      days: [
        { mgPerKg: 12, freq: "Q12H", label: "Day 1：12 mg/kg Q12H（2 次）" },
        { mgPerKg: 12, freq: "QD",   label: "Day 2：12 mg/kg × 1" },
        { mgPerKg: 12, freq: "QD",   label: "Day 3：12 mg/kg × 1" },
      ],
      maint: { mgPerKg_min: 5, mgPerKg_max: 5, freq: "QD" },
      renalNote: `eGFR ${r(egfr)}（30-59）：Loading 不減，maintenance 調整`,
    };
  }

  // eGFR < 30
  if (target === "15-30") {
    return {
      days: [
        { mgPerKg: 12, freq: "Q12H", label: "Day 1：12 mg/kg Q12H（2 次）" },
        { mgPerKg: 5,  freq: "QD",   label: "Day 2：5 mg/kg × 1" },
        { mgPerKg: 5,  freq: "QD",   label: "Day 3：5 mg/kg × 1" },
      ],
      maint: { mgPerKg_min: 5, mgPerKg_max: 5, freq: "QOD（每隔一天）" },
      renalNote: `eGFR ${r(egfr)}（<30）：Loading 大幅調整，maintenance Q48H`,
    };
  }
  return {
    days: [
      { mgPerKg: 12, freq: "Q12H", label: "Day 1：12 mg/kg Q12H（2 次）" },
      { mgPerKg: 12, freq: "QD",   label: "Day 2：12 mg/kg × 1" },
      { mgPerKg: 6.7, freq: "QD",  label: "Day 3：6–6.7 mg/kg × 1" },
    ],
    maint: { mgPerKg_min: 3, mgPerKg_max: 3.3, freq: "QD" },
    renalNote: `eGFR ${r(egfr)}（<30）：Loading Day 3 調整，maintenance QD（非 QOD）`,
  };
}

// ── 把一個 regimen 轉成顯示用的 rows ──
function buildRows(
  reg: RegimenResult,
  wt: number,
  targetLabel: string,
): any[] {
  const rows: any[] = [];

  rows.push({
    label: `🎯 Target trough ${targetLabel}`,
    value: targetLabel === "15-30 µg/mL"
      ? "非複雜性 MRSA 感染"
      : "嚴重及/或複雜 MRSA 感染（如 endocarditis、osteomyelitis）",
    highlight: true,
  });

  // Loading Day 1/2/3
  for (let i = 0; i < 3; i++) {
    const day = reg.days[i];
    const dose_mg = r(wt * day.mgPerKg);
    const isQ12H = day.freq === "Q12H";
    const totalDaily = isQ12H ? dose_mg * 2 : dose_mg;
    const perDose = dose_mg;

    let valueStr = "";
    if (isQ12H) {
      valueStr = `${perDose} mg Q12H（每次 ${toHalfVials(perDose)}，共 2 次 = 日總量 ${totalDaily} mg）`;
    } else {
      valueStr = `${perDose} mg × 1（${toHalfVials(perDose)}）`;
    }
    rows.push({ label: day.label, value: valueStr });
  }

  // Maintenance
  const mLo = r(wt * reg.maint.mgPerKg_min);
  const mHi = r(wt * reg.maint.mgPerKg_max);
  const maintStr = mLo === mHi
    ? `${mLo} mg ${reg.maint.freq}（${toHalfVials(mLo)}）`
    : `${mLo}–${mHi} mg ${reg.maint.freq}（${toHalfVials(mLo)}–${toHalfVials(mHi)}）`;

  rows.push({
    label: "Day 4 起 Maintenance",
    value: maintStr,
    highlight: true,
  });

  rows.push({ label: "腎功能調整依據", value: reg.renalNote });

  return rows;
}

export const teicoplanin: Drug = {
  name: "Teicod",
  subtitle: "Teicoplanin",
  searchTerms: [
    "teicoplanin", "teicod", "得那林", "Targocid", "得時高",
    "glycopeptide",
  ],

  needsRenal: true,
  needsWeight: true,
  needsHepatic: false, // CTP A-C 不需調整
  weightStrategy: "TBW", // 用 actual body weight

  indications: [
    {
      id: "mrsa_general",
      label: "MRSA infection（MRSA 感染，所有適應症）",
      desc: "依 target trough 同時顯示兩種方案",
      scenarios: [
        {
          label: "MRSA infection — Loading + Maintenance 完整時間表",
          note: "兩種 target trough 方案並列顯示。依感染嚴重度選擇適當 target。",
        },
      ],
    },
  ],

  calculate({ dosing_weight, crcl, rrt, extras }) {
    // 取得 eGFR（App.tsx 已計算並放入 extras）
    const egfr: number = (extras?.egfr as number) ?? crcl; // fallback 用 CrCl 代替

    const warnings: string[] = [];

    // 腎功能顯示（同時列出 CrCl 和 eGFR）
    const renalDisplay = rrt === "none"
      ? `CrCl ${r(crcl)} mL/min（Cockcroft-Gault）｜eGFR ${r(egfr)} mL/min/1.73m²（CKD-EPI 2021）`
      : rrt === "hd" ? "HD（血液透析）" : rrt === "pd" ? "PD（腹膜透析）" : "CRRT";

    // 提醒：Teicoplanin 腎調用 eGFR 而非 CrCl
    if (rrt === "none") {
      warnings.push("📐 Teicoplanin 腎調依 eGFR（CKD-EPI 2021）而非 CrCl。本工具已自動計算兩者並列顯示");
      // 若 eGFR 和 CrCl 落在不同級距，額外提醒
      const egfrTier = egfr >= 60 ? "≥60" : egfr >= 30 ? "30-59" : "<30";
      const crclTier = crcl >= 60 ? "≥60" : crcl >= 30 ? "30-59" : "<30";
      if (egfrTier !== crclTier) {
        warnings.push(`⚠️ 注意：CrCl（${r(crcl)}）與 eGFR（${r(egfr)}）落在不同級距（CrCl ${crclTier} vs eGFR ${egfrTier}）。Teicoplanin 劑量依 eGFR 計算，但兩者差異大時建議臨床判斷`);
      }
    }

    // IM 給藥提醒
    warnings.push("💉 可 IM 給藥（單次最多 400 mg）");

    // TDM 提醒
    warnings.push("🔬 TDM：Day 4 給藥前抽 trough（評估 loading）。嚴重感染或腎功能不全需 7 天內追蹤 TDM（評估 maintenance）");

    // 計算兩種 target 的方案
    const reg1530 = getRegimen(egfr, rrt, "15-30");
    const reg2040 = getRegimen(egfr, rrt, "20-40");

    const rows1530 = buildRows(reg1530, dosing_weight, "15-30 µg/mL");
    const rows2040 = buildRows(reg2040, dosing_weight, "20-40 µg/mL");

    return {
      scenarioResults: [
        {
          title: "MRSA infection — 完整給藥時間表",
          note: `使用體重：${dosing_weight} kg（TBW）｜${renalDisplay}`,
          subResults: [
            {
              customLabel: "📊 Target 15-30 µg/mL（非複雜性 MRSA）",
              customLabelBg: "#DBEAFE",
              customLabelColor: "#1E40AF",
              rows: rows1530,
            },
            {
              customLabel: "📊 Target 20-40 µg/mL（嚴重 / 複雜 MRSA）",
              customLabelBg: "#FEE2E2",
              customLabelColor: "#991B1B",
              rows: rows2040,
            },
          ],
          warnings,
        },
      ],
    };
  },

  clinicalPearls: {
    title: "臨床參考",
    sections: [
      {
        heading: "藥物特性",
        body:
          "• Glycopeptide，與 vancomycin 同類但半衰期極長（70-100 hr；ESRD 可達 230 hr）\n" +
          "• 歐洲、亞太、非洲上市；美國未上市\n" +
          "• 可 IV 或 IM 給藥（IM 單次最多 400 mg）\n" +
          "• 泡製：D5W 或 NS，輸注 30-60 分鐘\n" +
          "• 用 actual body weight（TBW）計算劑量",
      },
      {
        heading: "Target trough 怎麼選？",
        body:
          "• 15-30 µg/mL：非複雜性 MRSA 感染\n" +
          "• 20-40 µg/mL：嚴重及/或複雜 MRSA 感染，如 endocarditis、osteomyelitis\n\n" +
          "參考：J Antimicrob Chemother 2022;77:869",
      },
      {
        heading: "TDM（治療藥物監測）",
        body:
          "建議 TDM 族群：嚴重感染、腎功能不全、肥胖或低體重、燒傷、低白蛋白、兒科\n\n" +
          "【何時抽】\n" +
          "• 第一次：Day 4 給藥前抽 trough（評估 loading 是否足夠）\n" +
          "• 追蹤：腎功能不全或嚴重感染且需 trough >20 者，初次 TDM 後 7 天內再追蹤（評估 maintenance）\n\n" +
          "⚠️ 台灣多數醫院目前沒有常規 teicoplanin TDM 檢驗",
      },
      {
        heading: "腎功能調整（依 eGFR，非 CrCl）",
        body:
          "⚠️ Teicoplanin 的腎功能調整依 eGFR（CKD-EPI），與其他大部分藥物用 CrCl（Cockcroft-Gault）不同。\n" +
          "本工具同時計算並顯示兩者。\n\n" +
          "【正常腎功能 eGFR ≥60】不需調整\n" +
          "【eGFR 30-59】Loading 和/或 maintenance 需調整\n" +
          "【eGFR <30】Loading 大幅調整 + maintenance 頻率調整\n" +
          "【HD】不被透析移除 → 劑量同 eGFR <30\n" +
          "【CAPD】數據不足，建議同 eGFR <30 + TDM\n" +
          "【CRRT (CVVHDF)】特殊 loading + 維持 3-3.3 mg/kg QD\n" +
          "【SLED】數據不足",
      },
      {
        heading: "肝功能",
        body: "Child-Pugh A–C：不需調整。",
      },
      {
        heading: "ECMO",
        body:
          "ECMO 對 Vd 和 CL 的影響難以評估。\n" +
          "可能需增加劑量，建議搭配 TDM。\n" +
          "參考：Antimicrob Agents Chemother 2017;61:e01015-17; Clin Pharmacokinet 2026;65:193",
      },
      {
        heading: "副作用",
        body:
          "一般耐受性良好，不良反應罕需停藥：\n" +
          "• 過敏：皮疹、搔癢、蕁麻疹、過敏性休克、DRESS、SJS/TEN、AGEP\n" +
          "  （Histamine-release syndrome 比 vancomycin 少見）\n" +
          "• 腎毒性（劑量相關）\n" +
          "• 耳毒性（長期使用考慮聽力監測）\n" +
          "• 肝毒性（長期使用建議定期 LFT）\n" +
          "• 血液毒性（貧血、嗜中性球低下、血小板低下）",
      },
      {
        heading: "院內品項",
        body:
          "Teicod 針（得那林凍晶注射劑）200 mg/Vial\n" +
          "泡製：D5W 或 NS，輸注 30-60 分鐘",
      },
    ],
  },
};
