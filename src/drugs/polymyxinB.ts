import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Bobimixyn（Polymyxin B）
// ═══════════════════════════════════════════════════════════════
// 院內品項：寶比黴素凍晶注射劑 500 KIU/Vial（500,000 units = 50 mg）
// 台灣東洋藥品
//
// 換算：10,000 units = 1 mg
//
// 劑量：mg/kg（用 TBW；BMI ≥40 考慮 AdjBW）
// 腎功能：不需調整（但注意腎毒性！）
// 肝功能：不需調整
// ⚠️ 不適合用於 UTI（尿中濃度不足）
// ⚠️ 禁忌：重症肌無力
// ═══════════════════════════════════════════════════════════════

const UNITS_PER_MG = 10000;
const UNITS_PER_VIAL = 500000; // 500 KIU = 500,000 units
const MG_PER_VIAL = 50;       // 500,000 / 10,000

const r = (n: number) => Math.round(n);

function toVials(mg: number): string {
  const v = mg / MG_PER_VIAL;
  const rounded = Math.round(v * 10) / 10;
  return `${rounded} 支`;
}

function mgToUnits(mg: number): string {
  const units = mg * UNITS_PER_MG;
  if (units >= 1000000) return `${(units / 1000000).toFixed(1)}M units`;
  if (units >= 1000) return `${r(units / 1000)}K units`;
  return `${r(units)} units`;
}

export const polymyxinB: Drug = {
  name: "Bobimixyn",
  subtitle: "Polymyxin B",
  infusionTime: "LD ≥2 hr / MD ~1 hr",
  searchTerms: [
    "polymyxin", "polymyxin b", "bobimixyn", "poly-rx",
    "寶比黴素",
  ],

  needsRenal: false,   // 腎功能不需調整
  needsWeight: true,   // mg/kg 計算
  needsHepatic: false,

  indications: [
    // ═══ 1. Systemic treatment ═══
    {
      id: "systemic",
      label: "XDR Gram-negative infection, systemic treatment（全身性治療）",
      desc: "LD 2-2.5 mg/kg → MD 1.25-1.5 mg/kg Q12H",
      scenarios: [
        {
          label: "Systemic treatment（全身性 XDR GNB 感染）",
          note: "通常與其他抗生素併用。不建議用於 UTI（尿中濃度不足，改用 colistimethate）。療程依感染部位及臨床反應決定",
          isSystemic: true,
        },
      ],
    },

    // ═══ 2. Inhalation ═══
    {
      id: "inhalation",
      label: "XDR Gram-negative infection, nebulization（吸入輔助治療）",
      desc: "500,000 units Q12H · 需合併全身治療",
      scenarios: [
        {
          label: "Inhalation for nebulization（吸入霧化，輔助治療）",
          note: "500,000 units（50 mg）Q12H 霧化吸入，須合併全身抗生素。使用前 20 min 先吸 β2-agonist。⚠️ 熱病不建議吸入 Polymyxin B（肺上皮細胞毒性），若需吸入 polymyxin 建議改用 colistin",
          isFixed: true, fixedDisplay: "500,000 units（50 mg）Q12H nebulization",
        },
      ],
    },

    // ═══ 3. Intrathecal / Intraventricular ═══
    {
      id: "intrathecal",
      label: "XDR Gram-negative infection, intrathecal/intraventricular（鞘內/腦室內）",
      desc: "50,000 units QD · 合併全身治療",
      scenarios: [
        {
          label: "Intrathecal / Intraventricular（鞘內/腦室內給藥）",
          note: "50,000 units（5 mg）QD，須合併全身治療。用 preservative-free 製劑。經 ventricular drain 給藥後夾管 15-60 min。熱病：5 mg QD × 3-4 天後改 Q48H。⚠️ UpToDate 建議若需鞘內/腦室內 polymyxin，較建議用 colistimethate",
          isFixed: true, fixedDisplay: "50,000 units（5 mg）QD intrathecal/intraventricular",
        },
      ],
    },

    // ═══ 4. Ocular ═══
    {
      id: "ocular",
      label: "Ocular infections（眼科感染）",
      desc: "點眼液 / 結膜下注射",
      scenarios: [
        {
          label: "Ophthalmic（眼科用藥）",
          note: "點眼液 0.1-0.25%（10,000-25,000 units/mL）每小時 1-3 滴，依反應延長間隔。Subconjunctival injection ≤100,000 units/day。⚠️ 全身 + 眼科總劑量不得 >25,000 units/kg/day",
          isFixed: true, fixedDisplay: "點眼液 0.1-0.25% Q1H / Subconjunctival ≤100,000 units/day",
        },
      ],
    },
  ],

  calculate({ dosing_weight, indicationData, extras }) {
    const tbw: number = extras?.tbw ?? dosing_weight;
    const bmi: number = extras?.bmi ?? 0;

    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const rows: any[] = [];
      const warnings: string[] = [];

      // ── 固定劑量（非全身）──
      if (sc.isFixed) {
        rows.push({ label: "建議劑量", value: sc.fixedDisplay, highlight: true });
        if (sc.note) rows.push({ label: "療程與備註", value: sc.note });
        return { title: sc.label, rows, warnings };
      }

      // ── 全身性治療（mg/kg 計算）──
      const wt = dosing_weight;

      // Loading dose: 2-2.5 mg/kg（= 20,000-25,000 units/kg）
      const ldMin = r(2 * wt);
      const ldMax = r(2.5 * wt);
      // Maintenance: 1.25-1.5 mg/kg Q12H（= 12,500-15,000 units/kg）
      const mdMin = r(1.25 * wt);
      const mdMax = r(1.5 * wt);

      rows.push({
        label: "Loading Dose",
        value: `${ldMin}-${ldMax} mg（${mgToUnits(ldMin)}-${mgToUnits(ldMax)}）IV over ≥2hr`,
        highlight: true,
      });
      rows.push({
        label: "LD 計算",
        value: `2-2.5 mg/kg × ${r(wt)} kg = ${ldMin}-${ldMax} mg`,
      });
      rows.push({
        label: "LD 取藥",
        value: `${toVials(ldMin)}-${toVials(ldMax)} Bobimixyn（每支 50 mg = 500 KIU）`,
      });

      rows.push({
        label: "Maintenance Dose",
        value: `${mdMin}-${mdMax} mg（${mgToUnits(mdMin)}-${mgToUnits(mdMax)}）Q12H IV over ~1hr`,
        highlight: true,
      });
      rows.push({
        label: "MD 計算",
        value: `1.25-1.5 mg/kg × ${r(wt)} kg = ${mdMin}-${mdMax} mg Q12H`,
      });
      rows.push({
        label: "MD 取藥",
        value: `${toVials(mdMin)}-${toVials(mdMax)} Bobimixyn Q12H`,
      });

      rows.push({
        label: "LD → MD 銜接",
        value: "Loading dose 後 12 小時開始第一劑 maintenance",
      });

      // 每日總劑量
      const dailyMin = mdMin * 2;
      const dailyMax = mdMax * 2;
      rows.push({
        label: "每日總劑量",
        value: `${dailyMin}-${dailyMax} mg/day（${mgToUnits(dailyMin)}-${mgToUnits(dailyMax)}）`,
      });

      rows.push({
        label: "腎功能調整",
        value: "不需調整（所有 CrCl、HD、PD、CRRT、PIRRT 皆不需調）",
      });

      // 肥胖
      if (bmi >= 40) {
        warnings.push(`⚖️ Morbid obesity（BMI ${r(bmi)}）：UpToDate 與熱病建議考慮用 Adjusted Body Weight。目前計算使用 ${r(wt)} kg`);
      }

      // 每日劑量上限提醒
      if (dailyMax > 200) {
        warnings.push(`📖 熱病建議每日總量 200-249 mg（2.0-2.49M units）以降低腎毒性，但此上限尚未經臨床驗證。MIC >0.5 μg/mL 時可能不足`);
      }

      // 單次 >200 mg 提醒
      if (ldMax > 200) {
        warnings.push("⚠️ 單次 >2,000,000 units（200 mg）安全性資料有限，可能增加 infusion-related adverse effects（胸痛、感覺異常、頭暈、呼吸困難）");
      }

      // 通用警告
      warnings.push("⚠️ 不適合用於 UTI（尿中濃度不足），UTI 優先使用 colistimethate");
      warnings.push("⚠️ 禁忌：重症肌無力（可誘發或惡化）");

      if (sc.note) rows.push({ label: "療程與備註", value: sc.note });

      return { title: sc.label, rows, warnings };
    });

    return { scenarioResults };
  },

  clinicalPearls: {
    title: "臨床參考",
    sections: [
      {
        heading: "藥物特性",
        body:
          "• Polymyxin 類抗生素（環狀脂肽，破壞細菌外膜）\n" +
          "• 院內品項：Bobimixyn 寶比黴素 500 KIU/Vial（= 500,000 units = 50 mg）\n" +
          "• 換算：10,000 units = 1 mg\n" +
          "• 殺菌（bactericidal），濃度依賴性\n" +
          "• 保留用於 XDR Gram-negative infection\n" +
          "• 通常與其他抗生素併用",
      },
      {
        heading: "Polymyxin B vs Colistin（Polymyxin E）",
        body:
          "• Polymyxin B 直接以活性形式給藥；Colistin 是前驅藥（colistimethate → colistin）\n" +
          "• Polymyxin B Loading 後可較快達有效濃度\n" +
          "• Polymyxin B 腎功能不需調整（主要非腎臟排泄）\n" +
          "• Colistin 在 UTI 尿中濃度較好 → UTI 首選 colistimethate\n" +
          "• 吸入治療：建議用 colistin 而非 polymyxin B（肺上皮細胞毒性）\n" +
          "• 鞘內/腦室內：UpToDate 較建議 colistimethate",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• Acinetobacter baumannii（MDR/XDR/CRAB）\n" +
          "• Pseudomonas aeruginosa（DTR-PsA/CRPA）\n" +
          "• CRE（E. coli、K. pneumoniae 等）\n\n" +
          "【天然抗藥（不涵蓋）】\n" +
          "• Serratia spp.\n" +
          "• Proteus spp.\n" +
          "• Providencia spp.\n" +
          "• Morganella spp.\n" +
          "• Burkholderia cepacia",
      },
      {
        heading: "劑量速查",
        body:
          "【全身性】\n" +
          "  LD：2-2.5 mg/kg（20,000-25,000 units/kg）× 1，over ≥2hr\n" +
          "  MD：1.25-1.5 mg/kg（12,500-15,000 units/kg）Q12H，over ~1hr\n" +
          "  LD 後 12hr 開始 MD\n\n" +
          "【吸入霧化】500,000 units Q12H（⚠️ 熱病不建議）\n" +
          "【鞘內/腦室內】50,000 units QD\n" +
          "【眼科】點眼 0.1-0.25% Q1H / Subconjunctival ≤100,000 units/day",
      },
      {
        heading: "Bobimixyn可參考Colistin藥敏作為臨床處方依據",
        body:
          "Colistin MIC≤2時，臨床上可處方Bobimyxin",
      },
      {
        heading: "腎功能 / 肝功能 / RRT",
        body:
          "• 所有 CrCl：不需調整\n" +
          "• HD：不需調整（dialyzability unknown），透析日其中一劑於 HD 後給\n" +
          "• PD：不需調整。IP 給藥：300,000 units（30 mg）/bag continuous\n" +
          "• CRRT：不需調整\n" +
          "• PIRRT：不需調整，治療日其中一劑於 PIRRT 後給\n" +
          "• 肝功能 CTP A-C：不需調整\n" +
          "• ECMO：影響極小，不需調整",
      },
      {
        heading: "肥胖",
        body:
          "• 一般病人：用 Actual Body Weight（TBW）\n" +
          "• BMI ≥40（morbid obesity）：考慮 Adjusted Body Weight\n" +
          "• 不建議因體重高而限制最大劑量，但 >2M units 單次安全性資料有限",
      },
      {
        heading: "副作用與監測",
        body:
          "• 腎毒性（可逆性 acute tubular necrosis）→ 監測 Scr、尿量\n" +
          "• 神經毒性（口周麻木、四肢麻木、頭暈、共濟失調、嗜睡）\n" +
          "• 神經肌肉阻斷（嚴重可致呼吸停止）→ 禁用於重症肌無力\n" +
          "• Skin hyperpigmentation\n" +
          "• 建議可行時 TDM（尤其 ARC、ECMO、重症）",
      },
      {
        heading: "協同作用",
        body: "可與 carbapenem 產生協同作用（增加細胞膜通透性）→ 提高 carbapenem 對 CRAB、CRPA、CRE 的活性（熱病）",
      },
    ],
  },
};
