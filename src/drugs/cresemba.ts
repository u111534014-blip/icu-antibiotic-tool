import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Cresemba（Isavuconazole）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Cresemba 膠囊 186 mg（= isavuconazole 100 mg）
//   372 mg isavuconazonium sulfate = 200 mg isavuconazole
//
// 特性：
//   - 腎功能不調（含 HD / CRRT）
//   - 輕中度肝功能不全不調（CTP C 無資料）
//   - PO 生體可用率 ~98% → IV/PO 可互換
//   - 輸注 ≥1hr，需 inline filter（0.2-1.2 μm）
// ═══════════════════════════════════════════════════════════════

export const cresemba: Drug = {
  name: "Cresemba",
  subtitle: "Isavuconazole",
  needsRenal: false,
  needsWeight: false,
  needsHepatic: false,
  searchTerms: ["cresemba", "isavuconazole", "isavuconazonium", "azole", "antifungal"],

  indications: [
    {
      id: "aspergillosis",
      label: "Aspergillosis, invasive（侵襲性麴菌病）",
      desc: "LD Q8H × 6 劑 → MD QD",
      scenarios: [
        {
          label: "Loading Dose（負荷劑量）",
          note: "IV 輸注 ≥1hr，需 inline filter（0.2-1.2 μm）",
          dose: "372 mg（= isavuconazole 200 mg）Q8H × 6 劑（48hr）",
          poTabs: "2 顆膠囊 Q8H × 6 劑",
        },
        {
          label: "Maintenance Dose（維持劑量）",
          note: "最後一劑 LD 後 12-24hr 開始。PO 生體可用率 ~98%，IV↔PO 不需重新 loading",
          dose: "372 mg（= isavuconazole 200 mg）QD",
          poTabs: "2 顆膠囊 QD",
        },
      ],
    },
    {
      id: "mucormycosis",
      label: "Mucormycosis, invasive（侵襲性毛黴菌病）",
      desc: "LD Q8H × 6 劑 → MD QD",
      scenarios: [
        {
          label: "Loading Dose",
          dose: "372 mg Q8H × 6 劑（48hr）",
          poTabs: "2 顆膠囊 Q8H × 6 劑",
        },
        {
          label: "Maintenance",
          note: "LD 後 12-24hr 開始。IV↔PO 可互換",
          dose: "372 mg QD",
          poTabs: "2 顆膠囊 QD",
        },
      ],
    },
    {
      id: "candida_esophageal",
      label: "Candidiasis, esophageal（食道念珠菌症）",
      desc: "Fluconazole 抗藥替代 · 14-28 天",
      scenarios: [{
        label: "食道念珠菌症（fluconazole 抗藥替代）",
        note: "14-28 天",
        dose: "744 mg loading（= 400 mg），再 186 mg（= 100 mg）QD。或 744 mg 每週 1 次 × 4 週",
        poTabs: "4 顆膠囊 loading → 1 顆 QD",
      }],
    },
    {
      id: "cryptococcal",
      label: "Cryptococcal meningitis（隱球菌腦膜炎）",
      desc: "Consolidation + Maintenance",
      scenarios: [
        { label: "Consolidation", note: "8 週", dose: "372 mg QD × 8 週", poTabs: "2 顆膠囊 QD" },
        { label: "Maintenance（suppression）", note: "依免疫狀態約 12 個月", dose: "372 mg QD", poTabs: "2 顆膠囊 QD" },
      ],
    },
    {
      id: "prophylaxis",
      label: "Antifungal prophylaxis（抗黴菌預防）",
      desc: "血液惡性 / HCT / SOT",
      scenarios: [
        { label: "Loading Dose", dose: "372 mg Q8H × 6 劑（48hr）", poTabs: "2 顆膠囊 Q8H × 6 劑" },
        { label: "Maintenance", note: "依免疫抑制程度決定療程", dose: "372 mg QD", poTabs: "2 顆膠囊 QD" },
      ],
    },
  ],

  calculate({ indicationData }) {
    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const rows: any[] = [];
      const warnings: string[] = [];

      rows.push({ label: "建議劑量（IV 或 PO）", value: sc.dose, highlight: true });
      rows.push({ label: "PO 院內品項", value: sc.poTabs });
      rows.push({ label: "腎功能調整", value: "不需調整（含 HD / CRRT）" });
      rows.push({ label: "肝功能調整", value: "CTP A/B 不調。CTP C 無資料，謹慎使用" });
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
          "• Triazole 類抗真菌藥（isavuconazonium sulfate 為前驅藥）\n" +
          "• 372 mg isavuconazonium sulfate = 200 mg isavuconazole\n" +
          "• PO 生體可用率 ~98% → IV↔PO 可互換，不需重新 loading\n" +
          "• IV 輸注 ≥1hr，需 inline filter（0.2-1.2 μm）\n" +
          "• 腎功能、輕中度肝功能不全均不需調整",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• Aspergillus spp.（首選之一）\n" +
          "• Mucorales（毛黴菌目，唯一有效的 azole！）\n" +
          "• Candida spp.\n" +
          "• Cryptococcus neoformans\n" +
          "• Dimorphic fungi（Histoplasma、Blastomyces、Coccidioides）\n\n" +
          "【不涵蓋】\n" +
          "• Fusarium spp.（效果不佳）",
      },
      {
        heading: "vs Voriconazole 比較",
        body:
          "• 涵蓋 Mucorales（voriconazole 不行！）\n" +
          "• 較少藥物交互作用（CYP3A4 為主，不像 voriconazole 多路徑）\n" +
          "• 較少視覺副作用\n" +
          "• 不需常規 TDM（但嚴重感染或交互作用時可測）\n" +
          "• QTc：縮短（vs voriconazole 延長）",
      },
      {
        heading: "劑量速查",
        body:
          "【LD】372 mg Q8H × 6 劑（= 2 天）\n" +
          "【MD】372 mg QD\n" +
          "【食道念珠菌】744 mg LD → 186 mg QD\n" +
          "所有適應症劑量幾乎相同，非常好記",
      },
    ],
  },
};