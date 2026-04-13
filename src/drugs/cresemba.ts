import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Cresemba (Isavuconazole)
// ═══════════════════════════════════════════════════════════════
// 注意：劑量以 isavuconazonium sulfate 表示
//   372 mg isavuconazonium sulfate = 200 mg isavuconazole
export const cresemba: Drug = {
  name: "Cresemba",
  subtitle: "Isavuconazole",
  needsRenal: false,
  needsWeight: false,
  needsHepatic: false,
  searchTerms: [
    "cresemba", "isavuconazole", "isavuconazonium",
    "黴菌", "aspergillus", "mucor", "antifungal", "azole",
  ],

  indications: [
    {
      id: "aspergillosis",
      label: "Aspergillosis, invasive（侵襲性麴菌病）",
      desc: "Loading 與 Maintenance",
      scenarios: [
        {
          label: "Loading Dose（負荷劑量）",
          note: "靜脈滴注時間至少 1 小時，輸液套管須帶 inline filter（孔徑 0.2–1.2 μm）",
          preferred: "IV",
          po: {
            fixedDose: "372 mg（isavuconazole 200 mg）Q8H × 6 劑",
            detail: "= 2 顆膠囊 Q8H × 48 小時",
          },
          iv: {
            custom: true,
            fixedDose: "372 mg（isavuconazole 200 mg）IV Q8H × 6 劑",
            detail: "歷時 48 小時",
          },
        },
        {
          label: "Maintenance Dose（維持劑量）",
          note: "請於最後一劑 Loading dose 給完後 12–24 小時開始給予。口服生體可用率約 98%，因此兩種劑型互相轉換時不需重新給予起始劑量或調整劑量",
          preferred: "IV",
          po: {
            fixedDose: "372 mg（isavuconazole 200 mg）QD",
            detail: "= 2 顆膠囊 QD",
          },
          iv: {
            custom: true,
            fixedDose: "372 mg（isavuconazole 200 mg）IV QD",
            detail: "靜脈滴注同 Loading dose 注意事項",
          },
        },
      ],
    },
    {
      id: "mucormycosis",
      label: "Mucormycosis, invasive（侵襲性毛黴菌病）",
      desc: "Loading 與 Maintenance",
      scenarios: [
        {
          label: "Loading Dose",
          preferred: "IV",
          po: {
            fixedDose: "372 mg（isavuconazole 200 mg）Q8H × 6 劑",
            detail: "= 2 顆膠囊 Q8H × 48 小時",
          },
          iv: {
            custom: true,
            fixedDose: "372 mg（isavuconazole 200 mg）IV Q8H × 6 劑",
            detail: "歷時 48 小時",
          },
        },
        {
          label: "Maintenance",
          note: "Loading 完成 12–24 小時後開始；劑型可互換無需重新 loading",
          preferred: "IV",
          po: {
            fixedDose: "372 mg（isavuconazole 200 mg）QD",
            detail: "= 2 顆膠囊 QD",
          },
          iv: {
            custom: true,
            fixedDose: "372 mg（isavuconazole 200 mg）IV QD",
          },
        },
      ],
    },
    {
      id: "candidiasis",
      label: "Candidiasis, esophageal（食道念珠菌症）",
      desc: "Fluconazole 抗藥性的替代藥物",
      scenarios: [
        {
          label: "食道念珠菌症（fluconazole 抗藥）",
          note: "療程 14–28 天",
          preferred: "PO",
          po: {
            fixedDose: "744 mg loading（400 mg），再 186 mg（100 mg）QD",
            detail: "或 744 mg（400 mg）每週 1 次 × 4 週",
          },
        },
      ],
    },
    {
      id: "cryptococcal",
      label: "Cryptococcal meningitis（隱球菌腦膜炎）",
      desc: "Consolidation 與 Maintenance",
      scenarios: [
        {
          label: "Consolidation",
          note: "療程 8 週",
          preferred: "PO",
          po: {
            fixedDose: "372 mg（isavuconazole 200 mg）QD × 8 週",
            detail: "= 2 顆膠囊 QD",
          },
        },
        {
          label: "Maintenance（suppression）",
          note: "依免疫狀態約持續 12 個月",
          preferred: "PO",
          po: {
            fixedDose: "372 mg（isavuconazole 200 mg）QD",
            detail: "= 2 顆膠囊 QD",
          },
        },
      ],
    },
    {
      id: "antifungalProphylaxis",
      label: "Antifungal prophylaxis（抗黴菌預防）",
      desc: "血液惡性疾病或造血幹細胞移植",
      scenarios: [
        {
          label: "Loading Dose",
          preferred: "IV",
          po: {
            fixedDose: "372 mg（isavuconazole 200 mg）Q8H × 6 劑",
            detail: "= 2 顆膠囊 Q8H × 48 小時",
          },
          iv: {
            custom: true,
            fixedDose: "372 mg（isavuconazole 200 mg）IV Q8H × 6 劑",
          },
        },
        {
          label: "Maintenance",
          note: "依免疫抑制程度與時間決定療程",
          preferred: "IV",
          po: {
            fixedDose: "372 mg（isavuconazole 200 mg）QD",
            detail: "= 2 顆膠囊 QD",
          },
          iv: {
            custom: true,
            fixedDose: "372 mg（isavuconazole 200 mg）IV QD",
          },
        },
      ],
    },
  ],

  extraFields: [],

  calculate({ indicationData }) {
    const scenarioResults = indicationData.scenarios.map(sc => {
      const result = {
        title: sc.label,
        note: sc.note,
        preferred: sc.preferred,
        subResults: [],
      };

      if (sc.iv) {
        result.subResults.push({
          route: "IV",
          isPreferred: sc.preferred === "IV",
          rows: [
            { label: "建議劑量", value: sc.iv.fixedDose, highlight: true },
            ...(sc.iv.detail ? [{ label: "說明", value: sc.iv.detail }] : []),
          ],
        });
      }

      if (sc.po) {
        result.subResults.push({
          route: "PO",
          isPreferred: sc.preferred === "PO",
          rows: [
            { label: "建議劑量", value: sc.po.fixedDose, highlight: true },
            ...(sc.po.detail ? [{ label: "品項說明", value: sc.po.detail }] : []),
          ],
        });
      }

      return result;
    });

    return {
      scenarioResults,
      infoBox: {
        text: "💡 無需依據腎功能（含 HD/CVVH）或輕中度肝功能不全調整劑量",
        bg: "#F0FDF4", border: "#86EFAC", color: "#166534",
      },
    };
  },
};
