import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Tygacil (Tigecycline)
// ═══════════════════════════════════════════════════════════════
// 院內品項：老虎黴素凍晶注射劑 50 mg/Vial
//
// ⚠️ FDA Black Box Warning：使用 Tygacil 治療可能增加死亡率風險
//    保留用於無其他替代治療時
//
// 腎功能：完全不需調整（含 HD / PD / CRRT / PIRRT）
// 肝功能：
//   - Child-Pugh A、B：不調整
//   - Child-Pugh C：維持劑量改 50%（loading dose 不變）
//   - 例外：Mycobacterial（NTM）感染即使 Child-Pugh C 也不調整
export const tygacil: Drug = {
  name: "Tygacil",
  subtitle: "Tigecycline",
  needsRenal: false,
  needsWeight: false,
  needsHepatic: true,
  searchTerms: [
    "tygacil", "tigecycline", "glycylcycline",
    "老虎黴素", "老虎黴",
  ],

  indications: [
    {
      id: "mdrAcinetobacter",
      label: "Acinetobacter baumannii, MDR（多重抗藥鮑氏不動桿菌）",
      desc: "替代藥物",
      scenarios: [
        {
          label: "MDR Acinetobacter baumannii 感染",
          note: "不建議用於 UTI（尿中濃度不足）。需合併用藥",
          preferred: "IV",
          iv: {
            custom: true,
            loading_mg: 200,
            maintenance_mg: 100,
            freq: "Q12H",
          },
        },
      ],
    },
    {
      id: "iai",
      label: "Intra-abdominal infection（IAI 腹腔內感染）",
      desc: "MDR 風險（CRE、CRAB）時的替代",
      scenarios: [
        {
          label: "標準劑量",
          note: "Source control 後總療程 4–5 天",
          preferred: "IV",
          iv: {
            custom: true,
            loading_mg: 100,
            maintenance_mg: 50,
            freq: "Q12H",
          },
        },
        {
          label: "高劑量（抗藥菌感染）",
          note: "部分專家建議用於抗藥菌感染。可作為合併療法的一部分",
          preferred: "IV",
          iv: {
            custom: true,
            loading_mg: 200,
            maintenance_mg: 100,
            freq: "Q12H",
          },
        },
      ],
    },
    {
      id: "ntm",
      label: "Mycobacterial infection, NTM（非結核分枝桿菌）",
      desc: "Rapidly growing NTM",
      // 特例：Child-Pugh C 也不調整
      hepaticOverride: "noAdjust",
      scenarios: [
        {
          label: "NTM 感染",
          note: "需感染科或專家處理。需合併用藥。部分專家給 100 mg loading dose",
          preferred: "IV",
          iv: {
            custom: true,
            loading_mg: 0,           // 標準不需 loading
            maintenance_mg: 50,      // 25–50 mg QD 或 BID
            freq: "QD 或 BID",
            fixedDoseText: "25–50 mg QD 或 BID（部分專家先給 100 mg loading × 1）",
          },
        },
      ],
    },
    {
      id: "cap",
      label: "Pneumonia, community acquired（CAP 社區型肺炎）",
      desc: "無 P. aeruginosa 風險的住院病人",
      scenarios: [
        {
          label: "CAP（無 Pseudomonas 風險）",
          note: "替代藥物，給無法耐受 beta-lactam 或 fluoroquinolone 者。最少 5 天且臨床穩定",
          preferred: "IV",
          iv: {
            custom: true,
            loading_mg: 100,
            maintenance_mg: 50,
            freq: "Q12H",
          },
        },
      ],
    },
    {
      id: "cssti",
      label: "cSSTI（複雜性皮膚軟組織感染）",
      desc: "MDR 風險時的替代",
      scenarios: [
        {
          label: "複雜性皮膚軟組織感染",
          note: "療程 5–14 天",
          preferred: "IV",
          iv: {
            custom: true,
            loading_mg: 100,
            maintenance_mg: 50,
            freq: "Q12H",
          },
        },
      ],
    },
    {
      id: "stenotrophomonas",
      label: "Stenotrophomonas maltophilia, MDR",
      desc: "嗜麥芽窄食單胞菌（多重抗藥）",
      scenarios: [
        {
          label: "MDR S. maltophilia 感染",
          note: "不建議用於 UTI（尿中濃度不足）。需合併用藥",
          preferred: "IV",
          iv: {
            custom: true,
            loading_mg: 200,
            maintenance_mg: 100,
            freq: "Q12H",
          },
        },
      ],
    },
  ],

  extraFields: [],

  calculate({ indicationData, hepatic }) {
    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const scWarnings: any[] = [];
      let loading = sc.iv.loading_mg;
      let maintenance = sc.iv.maintenance_mg;
      const freq = sc.iv.freq;
      let note = hepatic === "normal"
        ? "肝功能正常：無需調整"
        : "Child-Pugh A 或 B：無需調整";

      // Mycobacterial 例外：Child-Pugh C 也不調整
      const isException = indicationData.hepaticOverride === "noAdjust";

      if (hepatic === "C" && !isException) {
        maintenance = Math.round(sc.iv.maintenance_mg / 2);
        note = "Child-Pugh C：維持劑量減半（Loading dose 不變）";
        scWarnings.push("Child-Pugh C：clearance 降低約 55%；維持劑量減半");
      } else if (hepatic === "C" && isException) {
        note = "Child-Pugh C：NTM 感染無需調整";
      }

      const rows: any[] = [];
      if (sc.iv.fixedDoseText) {
        rows.push({ label: "建議劑量", value: sc.iv.fixedDoseText, highlight: true });
      } else {
        if (loading > 0) {
          const loadingVials = Math.ceil(loading / 50);
          rows.push({ label: "Loading Dose", value: `${loading} mg IV × 1（${loadingVials} 支）`, highlight: true });
        }
        const maintVials = Math.ceil(maintenance / 50);
        rows.push({ label: "Maintenance", value: `${maintenance} mg IV ${freq}`, highlight: true });
        rows.push({ label: "院內品項", value: `每次 ${maintVials} 支老虎黴素（每支 50 mg）` });
      }
      rows.push({ label: "肝功能評估", value: note });

      return {
        title: sc.label,
        subResults: [{
          route: "IV",
          isPreferred: true,
          rows,
          warnings: scWarnings,
        }],
      };
    });

    return {
      scenarioResults,
      infoBox: {
        text: "⚠️ FDA Black Box Warning：與其他藥物比較，使用 Tygacil 治療可能增加死亡率風險。應僅在無其他替代方案時使用。",
        bg: "#FEF2F2", border: "#FCA5A5", color: "#991B1B",
      },
    };
  },
};
