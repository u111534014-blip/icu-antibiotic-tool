import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Eraxis（Anidulafungin）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Eraxis 針 100 mg/Vial（助黴飛注射劑）
//
// Echinocandin 類抗黴菌藥
// 特性：
//   - 固定劑量：LD 200 mg → MD 100 mg QD
//   - 腎功能不需調整（任何程度 CKD、HD、PD、CRRT、PIRRT 皆不需調）
//   - 肝功能不需調整（CTP A–C）
//   - 肥胖（BMI ≥40 或體重 >120 kg）需加量：LD 300 mg → MD 150 mg
//   - 純 IV 給藥
//
// 抗菌譜：Candida spp.（不涵蓋 Aspergillus 單獨治療）
// ═══════════════════════════════════════════════════════════════

const MG_PER_VIAL = 100; // 100 mg/Vial

// Helper：支數
function toHalfVials(mg: number): string {
  const raw = mg / MG_PER_VIAL;
  const half = Math.round(raw * 2) / 2;
  if (half === 0.5) return "0.5 支（半支）";
  if (half % 1 === 0) return `${half} 支`;
  return `${half} 支`;
}

// Helper：依 BMI / 體重決定劑量
function getAnidulafunginDose(bmi: number, tbw: number): {
  ld: number; md: number; note: string;
} {
  // BMI ≥40 或體重 >120 kg → 加量
  if (bmi >= 40 || tbw > 120) {
    return {
      ld: 300, md: 150,
      note: `肥胖（BMI ${Math.round(bmi * 10) / 10}，體重 ${Math.round(tbw)} kg）→ 加量：LD 300 mg → MD 150 mg QD`,
    };
  }
  // BMI 30-39.9 且體重 >120 kg → 加量
  if (bmi >= 30 && tbw > 120) {
    return {
      ld: 300, md: 150,
      note: `體重 >120 kg → 加量：LD 300 mg → MD 150 mg QD`,
    };
  }
  // 正常
  return {
    ld: 200, md: 100,
    note: "標準劑量",
  };
}

export const anidulafungin: Drug = {
  name: "Eraxis",
  subtitle: "Anidulafungin",
  infusionTime: "≥1.5 hr（LD）/ ≥1 hr（MD）",
  searchTerms: [
    "anidulafungin", "eraxis", "助黴飛",
    "echinocandin", "candida",
  ],

  needsRenal: false,    // 不需腎功能調整
  needsWeight: true,    // 需要體重（肥胖劑量調整）
  needsHepatic: false,  // CTP A–C 不需調整

  // ──────────────────────────────────────────────────────────────
  // 適應症（照 UpToDate 原文標題）
  // ──────────────────────────────────────────────────────────────
  indications: [

    // ═══ 1. Aspergillosis ═══
    {
      id: "aspergillosis",
      label: "Aspergillosis, invasive（侵襲性麴菌症）",
      desc: "替代藥物 · LD 200 → MD 100 mg QD",
      scenarios: [
        {
          label: "Invasive aspergillosis（侵襲性麴菌症，替代/合併）",
          note: "替代藥物。通常合併 combination regimen（如合併 voriconazole）。嚴重/進展性感染或 azole 抗藥疑慮可作初始合併治療；單獨使用保留給 azole 和 polyene 不耐受/無效者。療程 6-12 週（免疫抑制者可能更長）。合併治療約 ~2 週後可降階為 voriconazole 單獨",
          hasLD: true,
        },
      ],
    },

    // ═══ 2. Candidiasis — LD 200 → MD 100 mg 組 ═══
    {
      id: "candidiasis_ld",
      label: "Candidiasis — LD 200 → MD 100 mg（念珠菌感染，標準 LD 組）",
      desc: "Candidemia / IAI / 肝脾 / 經驗 ICU / 口咽 / 骨關節",
      scenarios: [
        {
          label: "Candidemia, including disseminated（念珠菌菌血症，含播散性）",
          note: "含口服降階，總療程 ≥首次血液培養陰性後 14 天 + 症狀/中性球低下緩解。遠端轉移需更長",
          hasLD: true,
        },
        {
          label: "Chronic disseminated (hepatosplenic)（慢性播散性/肝脾念珠菌症）",
          note: "IV 數週後轉口服 azole，持續至病灶消退 + 貫穿免疫抑制期",
          hasLD: true,
        },
        {
          label: "Empiric therapy, suspected invasive（疑似侵襲性念珠菌，ICU 經驗治療）",
          note: "⚠️ 非常規用於 sepsis 初始治療。保留給不明原因發燒/低血壓 + 廣效抗生素無效 + 有侵襲性念珠菌風險因子（中央靜脈導管、HD、外傷/燒傷、近期手術、TPN）。改善者持續 2 週；4-5 天無反應且無證據可考慮停藥",
          hasLD: true,
        },
        {
          label: "Intra-abdominal infection（腹膜炎、腹腔膿瘍）",
          note: "含口服降階。總療程 ≥14 天 + 源頭控制 + 臨床緩解",
          hasLD: true,
        },
        {
          label: "Oropharyngeal, refractory（口咽念珠菌症，fluconazole 無效）",
          note: "替代藥物。保留給 fluconazole 無效且需 IV 者。可耐受口服後轉口服 azole。總療程 14-28 天",
          hasLD: true,
        },
        {
          label: "Osteoarticular infection（骨髓炎 / 化膿性關節炎）",
          note: "IV ≥2 週後轉口服 azole。骨髓炎總療程 6-12 個月；關節炎 ≥6 週",
          hasLD: true,
        },
      ],
    },

    // ═══ 3. Candidiasis — 200 mg QD（無 LD）組 ═══
    {
      id: "candidiasis_noLD",
      label: "Candidiasis — 200 mg QD 無 LD（念珠菌感染，高劑量無 LD 組）",
      desc: "心內膜炎 / 心臟裝置 / 食道 / 血栓性靜脈炎",
      scenarios: [
        {
          label: "Cardiac device infection（心臟裝置感染，ICD / pacemaker / VAD）",
          note: "穩定後可降階為 azole。單純 generator pocket 感染：裝置移除後 ≥4 週；wire 感染：裝置移除後 ≥6 週",
          hasLD: false,
          fixedDose: 200,
        },
        {
          label: "Endocarditis, native or prosthetic valve（心內膜炎，自體或人工瓣膜）",
          note: "穩定後可降階為 azole。瓣膜置換後 ≥6 週；有瓣膜周圍膿瘍、併發症、或非手術者需更長",
          hasLD: false,
          fixedDose: 200,
        },
        {
          label: "Esophageal, refractory（食道念珠菌症，fluconazole 無效）",
          note: "替代藥物。保留給 fluconazole 無效且需 IV 治療者。可耐受口服後轉口服 azole。總療程 14-28 天",
          hasLD: false,
          fixedDose: 200,
        },
        {
          label: "Thrombophlebitis, suppurative（化膿性血栓性靜脈炎）",
          note: "持續至導管移除 + 血栓消退 + 念珠菌菌血症清除後 ≥2 週",
          hasLD: false,
          fixedDose: 200,
        },
      ],
    },

    // ═══ 12. Neutropenic fever ═══
    {
      id: "neutroFever",
      label: "Neutropenic fever, empiric antifungal therapy（中性球低下發燒，經驗抗黴菌）",
      desc: "替代藥物 · LD 200 → MD 100 mg QD",
      scenarios: [
        {
          label: "Neutropenic fever, empiric antifungal（中性球低下發燒，經驗抗黴菌）",
          note: "替代藥物。用於抗生素 ≥4 天仍持續/復發發燒 + 預期中性球低下 >7 天者。部分專家保留給無 mold 感染疑慮者（無肺結節等）",
          hasLD: true,
        },
      ],
    },

    // ═══ 13. Prophylaxis ═══
    {
      id: "prophylaxis",
      label: "Prophylaxis against invasive fungal infections（侵襲性黴菌預防）",
      desc: "替代藥物 · LD 200 → MD 100 mg QD",
      scenarios: [
        {
          label: "Hematologic malignancy / HCT（血液腫瘤 / HCT，替代藥物）",
          note: "替代藥物。部分專家保留給 mold 感染低風險者。持續至中性球恢復（依免疫抑制程度而定）",
          hasLD: true,
        },
        {
          label: "Solid organ transplant（SOT，替代藥物）",
          note: "替代藥物。療程依病人風險因子和移植中心 protocol",
          hasLD: true,
        },
      ],
    },

  ], // ← end of indications

  // ──────────────────────────────────────────────────────────────
  // calculate()
  // Eraxis 不需腎調，主要邏輯是肥胖劑量調整
  // ──────────────────────────────────────────────────────────────
  calculate({ dosing_weight, indicationData, extras }) {
    const tbw: number = extras?.tbw ?? dosing_weight;
    const bmi: number = extras?.bmi ?? 0;

    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const warnings: string[] = [];
      const hasLD = sc.hasLD ?? true;

      // 取得劑量（依肥胖調整）
      const d = getAnidulafunginDose(bmi, tbw);

      // 有些適應症用 200 mg QD 無 LD（endocarditis、cardiac device 等）
      const fixedDose = sc.fixedDose;
      const ld = fixedDose ? fixedDose : d.ld;
      const md = fixedDose ? fixedDose : d.md;

      const rows: any[] = [];

      if (hasLD && !fixedDose) {
        rows.push({
          label: "Loading dose（Day 1）",
          value: `${ld} mg IV（${toHalfVials(ld)}）`,
          highlight: true,
        });
        rows.push({
          label: "Maintenance dose（Day 2+）",
          value: `${md} mg QD IV（${toHalfVials(md)}）`,
          highlight: true,
        });
      } else {
        rows.push({
          label: "建議劑量",
          value: `${md} mg QD IV（${toHalfVials(md)}）`,
          highlight: true,
        });
      }

      // 肥胖調整提醒
      if (d.ld > 200) {
        rows.push({ label: "肥胖劑量調整", value: d.note });
        warnings.push("⚖️ 肥胖病人（BMI ≥40 或體重 >120 kg）：PK 研究顯示藥物暴露量隨體重增加而下降，建議加量至 LD 300 mg → MD 150 mg QD");
      }

      rows.push({
        label: "腎功能調整",
        value: "不需調整（任何程度 CKD、HD、PD、CRRT、PIRRT 皆不需調）",
      });

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
          "• Echinocandin 類抗黴菌藥（與 caspofungin、micafungin 同類）\n" +
          "• 固定劑量，不依體重計算（但肥胖需加量）\n" +
          "• 純 IV 給藥，QD\n" +
          "• 腎功能、肝功能（CTP A–C）均不需調整\n" +
          "• HD / PD / CRRT / PIRRT 均不需調整",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• Candida spp.（包括 C. albicans、C. glabrata、C. tropicalis 等）\n" +
          "• Aspergillus spp.（僅作替代/合併用，不建議單獨治療）\n\n" +
          "【不涵蓋】\n" +
          "• Cryptococcus\n" +
          "• Mucorales（毛黴菌）\n" +
          "• C. auris（部分菌株抗藥）",
      },
      {
        heading: "劑量速查",
        body:
          "【標準劑量（大部分適應症）】\n" +
          "  LD 200 mg（Day 1）→ MD 100 mg QD\n\n" +
          "【無 LD 的適應症（200 mg QD）】\n" +
          "  心內膜炎、心臟裝置感染、化膿性血栓性靜脈炎、食道念珠菌症\n\n" +
          "【肥胖（BMI ≥40 或體重 >120 kg）】\n" +
          "  LD 300 mg → MD 150 mg QD\n" +
          "  （PK 研究顯示體重增加 → 清除率上升 + AUC 下降）",
      },
      {
        heading: "腎功能 / 肝功能",
        body:
          "• 腎功能：任何程度 CKD、HD、PD、CRRT、PIRRT 均不需調整\n" +
          "• 肝功能：CTP A–C 不需調整",
      },
      {
        heading: "院內品項",
        body: "Eraxis 針 100 mg/Vial（助黴飛注射劑）",
      },
    ],
  },
};