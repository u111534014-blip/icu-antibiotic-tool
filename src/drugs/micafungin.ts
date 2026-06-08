import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Mycamine（Micafungin）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Myfungin 針 50 mg/Vial（米方淨凍晶注射劑）
//
// Echinocandin 類抗真菌藥
// 特性：
//   - 固定劑量 QD（50 / 100 / 150 / 200 mg 依適應症）
//   - 腎功能、肝功能（CTP A–C）均不需調整
//   - HD / PD / PIRRT 不需調整
//   - CRRT：UpToDate 不調；熱病建議考慮 150-200 mg QD
//   - 肥胖：依菌種和體重加量
//   - 輸注 1 小時
//
// 純 IV 給藥，無口服劑型
// ═══════════════════════════════════════════════════════════════

const MG_PER_VIAL = 50; // 50 mg/Vial

// Helper：支數
function toHalfVials(mg: number): string {
  const raw = mg / MG_PER_VIAL;
  if (raw % 1 === 0) return `${raw} 支`;
  return `${raw} 支`;
}

export const micafungin: Drug = {
  name: "Mycamine",
  subtitle: "Micafungin",
  infusionTime: "≥1 hr",
  searchTerms: [
    "micafungin", "mycamine", "myfungin", "米方淨",
    "echinocandin", "candida",
  ],

  needsRenal: false,
  needsWeight: true,   // 肥胖劑量調整需要體重
  needsHepatic: false,

  // ──────────────────────────────────────────────────────────────
  // 適應症（照 UpToDate 原文標題）
  // ──────────────────────────────────────────────────────────────
  indications: [

    // ═══ 1. Aspergillosis ═══
    {
      id: "aspergillosis",
      label: "Aspergillosis, invasive（侵襲性麴菌症）",
      desc: "替代藥物 · 100-150 mg QD",
      scenarios: [
        {
          label: "Invasive aspergillosis（侵襲性麴菌症，替代/合併）",
          note: "通常合併 combination regimen（如合併 voriconazole）。嚴重/進展性/azole 抗藥疑慮可作初始合併；單獨使用保留給 azole 和 polyene 不耐受/無效者。療程 6-12 週（免疫抑制者可能更長）。合併治療約 ~2 週後可降階為 voriconazole 單獨",
          fixedDose: 100,
          doseDisplay: "100-150 mg QD IV",
        },
      ],
    },

    // ═══ 2. Candidiasis — 100 mg QD 組 ═══
    {
      id: "candidiasis_100",
      label: "Candidiasis — 100 mg QD（念珠菌感染，標準劑量組）",
      desc: "Candidemia / IAI / 肝脾 / 經驗 ICU / 口咽 / 骨關節",
      scenarios: [
        {
          label: "Candidemia, including disseminated（念珠菌菌血症，含播散性）",
          note: "含口服降階，總療程 ≥首次血液培養陰性後 14 天 + 症狀/中性球低下緩解。遠端轉移需更長",
          fixedDose: 100,
          doseDisplay: "100 mg QD IV",
        },
        {
          label: "Chronic disseminated (hepatosplenic)（慢性播散性/肝脾念珠菌症）",
          note: "IV 數週後轉口服 azole，持續至病灶消退 + 貫穿免疫抑制期",
          fixedDose: 100,
          doseDisplay: "100 mg QD IV",
        },
        {
          label: "Empiric therapy, suspected invasive（疑似侵襲性念珠菌，ICU 經驗治療）",
          note: "⚠️ 非常規用於 sepsis 初始治療。保留給不明原因發燒/低血壓 + 廣效抗生素無效 + 有侵襲性念珠菌風險因子（中央靜脈導管、HD、外傷/燒傷、近期手術、TPN）。改善者持續 2 週；4-5 天無反應且無證據可考慮停藥",
          fixedDose: 100,
          doseDisplay: "100 mg QD IV",
        },
        {
          label: "Intra-abdominal infection（腹膜炎、腹腔膿瘍）",
          note: "含口服降階。總療程 ≥14 天 + 源頭控制 + 臨床緩解",
          fixedDose: 100,
          doseDisplay: "100 mg QD IV",
        },
        {
          label: "Oropharyngeal, refractory（口咽念珠菌症，fluconazole 無效）",
          note: "替代藥物。保留給 fluconazole 無效且需 IV 者。可耐受口服後轉口服 azole。總療程 14-28 天",
          fixedDose: 100,
          doseDisplay: "100 mg QD IV",
        },
        {
          label: "Osteoarticular infection（骨髓炎 / 化膿性關節炎）",
          note: "IV ≥2 週後轉口服 azole。骨髓炎總療程 6-12 個月；關節炎 ≥6 週",
          fixedDose: 100,
          doseDisplay: "100 mg QD IV",
        },
      ],
    },

    // ═══ 3. Candidiasis — 150 mg QD 組 ═══
    {
      id: "candidiasis_150",
      label: "Candidiasis — 150 mg QD（念珠菌感染，高劑量組）",
      desc: "心內膜炎 / 心臟裝置 / 食道 / 血栓性靜脈炎",
      scenarios: [
        {
          label: "Cardiac device infection（心臟裝置感染，ICD / pacemaker / VAD）",
          note: "穩定後可降階為 azole。單純 generator pocket 感染：裝置移除後 ≥4 週；wire 感染：裝置移除後 ≥6 週",
          fixedDose: 150,
          doseDisplay: "150 mg QD IV",
        },
        {
          label: "Endocarditis, native or prosthetic valve（心內膜炎，自體或人工瓣膜）",
          note: "穩定後可降階為 azole。瓣膜置換後 ≥6 週；有瓣膜周圍膿瘍、併發症、或非手術者需更長",
          fixedDose: 150,
          doseDisplay: "150 mg QD IV",
        },
        {
          label: "Esophageal, refractory（食道念珠菌症，fluconazole 無效）",
          note: "替代藥物。保留給 fluconazole 無效且需 IV 者。可耐受口服後轉口服 azole。總療程 14-28 天",
          fixedDose: 150,
          doseDisplay: "150 mg QD IV",
        },
        {
          label: "Thrombophlebitis, suppurative（化膿性血栓性靜脈炎）",
          note: "持續至導管移除 + 血栓消退 + 念珠菌菌血症清除後 ≥2 週",
          fixedDose: 150,
          doseDisplay: "150 mg QD IV",
        },
      ],
    },

    // ═══ 12. Neutropenic fever ═══
    {
      id: "neutroFever",
      label: "Neutropenic fever, empiric antifungal therapy（中性球低下發燒，經驗抗黴菌）",
      desc: "替代藥物 · 100 mg QD",
      scenarios: [
        {
          label: "Neutropenic fever, empiric antifungal（中性球低下發燒，經驗抗黴菌）",
          note: "替代藥物。用於抗生素 ≥4 天仍持續/復發發燒 + 預期中性球低下 >7 天者。部分專家保留給無 mold 感染疑慮者",
          fixedDose: 100,
          doseDisplay: "100 mg QD IV",
        },
      ],
    },

    // ═══ 13. Prophylaxis ═══
    {
      id: "prophylaxis",
      label: "Prophylaxis against invasive fungal infections（侵襲性黴菌預防）",
      desc: "替代藥物 · 50-100 mg QD",
      scenarios: [
        {
          label: "Hematologic malignancy / HCT（血液腫瘤 / HCT，替代藥物）",
          note: "替代藥物。部分專家保留給 mold 感染低風險者。持續至中性球恢復（依免疫抑制程度而定）",
          fixedDose: 50,
          doseDisplay: "50-100 mg QD IV",
        },
        {
          label: "Solid organ transplant（SOT，替代藥物）",
          note: "替代藥物。療程依病人風險因子和移植中心 protocol",
          fixedDose: 100,
          doseDisplay: "100 mg QD IV",
        },
      ],
    },

  ], // ← end of indications

  // ──────────────────────────────────────────────────────────────
  // calculate()
  // ──────────────────────────────────────────────────────────────
  calculate({ dosing_weight, indicationData, extras }) {
    const tbw: number = extras?.tbw ?? dosing_weight;
    const bmi: number = extras?.bmi ?? 0;

    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const warnings: string[] = [];
      const baseDose: number = sc.fixedDose ?? 100;

      // 肥胖劑量調整
      let dose = baseDose;
      let obeseNote = "";

      if (bmi >= 30) {
        // 治療性適應症（非預防）才有肥胖調整建議
        const isProphylaxis = sc.doseDisplay?.includes("50") || indicationData.id === "prophylaxis";

        if (!isProphylaxis) {
          if (tbw >= 120) {
            dose = Math.max(baseDose, 200);
            obeseNote = `肥胖（BMI ${Math.round(bmi * 10) / 10}，體重 ${Math.round(tbw)} kg ≥120 kg）→ 200 mg QD（UpToDate：C. albicans）。Non-albicans 不分體重用 200 mg`;
          } else {
            dose = Math.max(baseDose, 150);
            obeseNote = `肥胖（BMI ${Math.round(bmi * 10) / 10}，體重 ${Math.round(tbw)} kg）→ 150 mg QD（UpToDate：C. albicans <120 kg）。Non-albicans 用 200 mg`;
          }
          warnings.push("⚖️ 肥胖病人 PK 研究顯示暴露量隨體重增加而下降。MIC >0.032 mg/L 時藥效學可能不足 → 考慮替代療法");
          warnings.push("📖 熱病建議：C. albicans ≤115 kg → 150 mg；>115 kg → 200 mg。C. glabrata ≤115 kg → 200 mg。體重 >125 kg + MIC 0.032 → 300 mg QD（+ LD 2× 維持劑量）");
        }
      }

      const rows: any[] = [
        { label: "建議劑量", value: `${dose} mg QD IV（${toHalfVials(dose)}）`, highlight: true },
      ];

      if (dose !== baseDose) {
        rows.push({ label: "標準劑量", value: `${baseDose} mg QD（非肥胖）` });
      }

      if (obeseNote) {
        rows.push({ label: "肥胖劑量調整", value: obeseNote });
      }

      rows.push({
        label: "腎功能調整",
        value: "不需調整（任何程度 CKD、HD、PD、PIRRT 皆不需調）。CRRT：UpToDate 不調；熱病建議考慮 150-200 mg QD",
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
          "• Echinocandin 類抗真菌藥（抑制 β-(1,3)-D-glucan 合成）\n" +
          "• 對 Candida 具殺真菌作用（fungicidal）\n" +
          "• 固定劑量 QD，純 IV，輸注 1 小時\n" +
          "• 腎功能、肝功能（CTP A–C）均不需調整\n" +
          "• 與其他抗真菌藥合併無拮抗作用\n" +
          "• 半衰期：NRF 15-17 hr / ESRD 不變",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• Candida spp.（含 C. glabrata、C. krusei 等對其他藥物抗藥者）\n" +
          "• Aspergillus spp.\n" +
          "• 註：C. parapsilosis 和 C. guilliermondii 敏感性相對較低，但臨床反應通常令人滿意\n\n" +
          "【不涵蓋】\n" +
          "• Cryptococcus\n" +
          "• Trichosporon\n" +
          "• 除 Aspergillus 以外的黴菌",
      },
      {
        heading: "劑量速查",
        body:
          "【50 mg QD】預防（HCT，低劑量選項）\n" +
          "【100 mg QD】大部分治療適應症（candidemia、IAI、骨關節、口咽、經驗治療、預防等）\n" +
          "【150 mg QD】心內膜炎、心臟裝置感染、血栓性靜脈炎、食道念珠菌\n" +
          "【100-150 mg QD】侵襲性麴菌症",
      },
      {
        heading: "肥胖劑量調整",
        body:
          "PK 研究顯示體重增加 → 暴露量下降。\n\n" +
          "【UpToDate（Candidiasis 治療）】\n" +
          "  C. albicans + 體重 ≥120 kg：200 mg QD\n" +
          "  C. albicans + 體重 <120 kg：150 mg QD\n" +
          "  Non-albicans（不分體重）：200 mg QD\n" +
          "  ⚠️ MIC >0.032 mg/L 藥效學可能不足 → 考慮替代療法\n\n" +
          "【熱病】\n" +
          "  C. albicans ≤115 kg：150 mg QD\n" +
          "  C. albicans >115 kg：200 mg QD\n" +
          "  C. glabrata ≤115 kg：200 mg QD\n" +
          "  體重 >125 kg + MIC 0.016：200 mg QD\n" +
          "  體重 >125 kg + MIC 0.032：300 mg QD（+ LD 2× 維持劑量）\n\n" +
          "其他適應症（含預防）：肥胖數據不足，無特定建議",
      },
      {
        heading: "CRRT 劑量（UpToDate vs 熱病）",
        body:
          "• UpToDate：不需調整（poorly dialyzed）\n" +
          "• 熱病：考慮 150-200 mg QD（Crit Care 2018;22:289）\n\n" +
          "建議臨床判斷——重症或難治菌種可考慮用熱病建議的較高劑量",
      },
      {
        heading: "ECMO",
        body:
          "• ECMO 對 micafungin 有中度清除效應\n" +
          "• 建議考慮增加劑量至 150 mg QD\n" +
          "• 參考：Crit Care 2024;28:326",
      },
      {
        heading: "院內品項",
        body: "Myfungin 針 50 mg/Vial（米方淨凍晶注射劑）",
      },
    ],
  },
};
