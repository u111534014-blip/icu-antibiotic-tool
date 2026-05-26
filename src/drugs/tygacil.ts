import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Tygacil（Tigecycline）
// ═══════════════════════════════════════════════════════════════
// 院內品項：老虎黴素凍晶注射劑 50 mg/Vial
//
// ⚠️ FDA Black Box Warning：使用 Tygacil 可能增加死亡率風險
// 腎功能：完全不需調整（含 HD / PD / CRRT / PIRRT）
// 肝功能：CTP A/B 不調；CTP C 維持劑量減半（LD 不變）
//   例外：NTM 感染 CTP C 也不調
// ═══════════════════════════════════════════════════════════════

const MG_PER_VIAL = 50;

function toVials(mg: number): string {
  const v = mg / MG_PER_VIAL;
  return v % 1 === 0 ? `${v} 支` : `${v} 支`;
}

export const tygacil: Drug = {
  name: "Tygacil",
  subtitle: "Tigecycline",
  needsRenal: false,
  needsWeight: false,
  needsHepatic: true,
  searchTerms: ["tygacil", "tigecycline", "glycylcycline", "老虎黴素"],

  indications: [
    {
      id: "mdrAcinetobacter",
      label: "Acinetobacter baumannii, MDR（多重抗藥鮑氏不動桿菌）",
      desc: "替代藥物 · LD 200 → MD 100 Q12H",
      scenarios: [{
        label: "MDR Acinetobacter baumannii（CRAB，替代藥物）",
        note: "不建議用於 UTI（尿中濃度不足）。需合併用藥",
        ld: 200, md: 100, freq: "Q12H",
      }],
    },
    {
      id: "iai",
      label: "Intra-abdominal infection（腹腔內感染）",
      desc: "MDR 風險（CRE、CRAB）替代",
      scenarios: [
        { label: "標準劑量（IAI）", note: "Source control 後 4-5 天", ld: 100, md: 50, freq: "Q12H" },
        { label: "高劑量（抗藥菌 IAI）", note: "合併療法", ld: 200, md: 100, freq: "Q12H" },
      ],
    },
    {
      id: "ntm",
      label: "Mycobacterial infection, NTM（非結核分枝桿菌）",
      desc: "Rapidly growing NTM",
      hepaticOverride: "noAdjust",
      scenarios: [{
        label: "NTM 感染",
        note: "需合併用藥。部分專家先給 100 mg LD × 1",
        ld: 0, md: 0, fixedText: "25-50 mg QD 或 BID（部分專家先給 100 mg LD × 1）", freq: "QD-BID",
      }],
    },
    {
      id: "cap",
      label: "Pneumonia, community-acquired（CAP 社區型肺炎）",
      desc: "替代藥物 · 無 Pseudomonas 風險",
      scenarios: [{
        label: "CAP（無 Pseudomonas 風險，替代藥物）",
        note: "給無法耐受 β-lactam 或 fluoroquinolone 者。≥5 天且穩定",
        ld: 100, md: 50, freq: "Q12H",
      }],
    },
    {
      id: "cssti",
      label: "cSSTI（複雜性皮膚軟組織感染）",
      desc: "MDR 風險替代 · 5-14 天",
      scenarios: [{
        label: "複雜性皮膚軟組織感染",
        note: "5-14 天",
        ld: 100, md: 50, freq: "Q12H",
      }],
    },
    {
      id: "stenotrophomonas",
      label: "Stenotrophomonas maltophilia, MDR（嗜麥芽窄食單胞菌，多重抗藥）",
      desc: "替代藥物 · 合併用藥",
      scenarios: [{
        label: "MDR S. maltophilia（替代藥物）",
        note: "不建議用於 UTI。需合併用藥",
        ld: 200, md: 100, freq: "Q12H",
      }],
    },
  ],

  calculate({ indicationData, hepatic }) {
    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const rows: any[] = [];
      const warnings: string[] = [];

      let ld = sc.ld ?? 0;
      let md = sc.md ?? 0;
      const isNTM = indicationData.hepaticOverride === "noAdjust";
      let hepNote = "";

      // 肝功能調整
      if (hepatic === "C" && !isNTM && md > 0) {
        md = Math.round(md / 2);
        hepNote = "Child-Pugh C：維持劑量減半（LD 不變）";
        warnings.push("⚠️ Child-Pugh C：clearance 降低約 55%，維持劑量減半");
      } else if (hepatic === "C" && isNTM) {
        hepNote = "Child-Pugh C：NTM 感染不調整";
      } else if (hepatic === "A" || hepatic === "B") {
        hepNote = `Child-Pugh ${hepatic}：不需調整`;
      }

      // 固定劑量（NTM）
      if (sc.fixedText) {
        rows.push({ label: "建議劑量", value: sc.fixedText, highlight: true });
      } else {
        if (ld > 0) {
          rows.push({ label: "Loading Dose", value: `${ld} mg IV × 1（${toVials(ld)}老虎黴素）`, highlight: true });
        }
        if (md > 0) {
          rows.push({ label: "Maintenance Dose", value: `${md} mg IV ${sc.freq}（${toVials(md)}老虎黴素）`, highlight: true });
        }
      }

      rows.push({ label: "腎功能調整", value: "不需調整（含 HD / PD / CRRT / PIRRT）" });
      if (hepNote) rows.push({ label: "肝功能調整", value: hepNote });
      if (sc.note) rows.push({ label: "療程與備註", value: sc.note });

      // FDA Black Box
      warnings.push("🔴 FDA Black Box Warning：與其他藥物比較，使用 Tygacil 可能增加死亡率風險。僅在無其他替代方案時使用");

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
          "• Glycylcycline 類（tetracycline 衍生物）\n" +
          "• 院內品項：老虎黴素凍晶注射劑 50 mg/Vial\n" +
          "• 抑菌（bacteriostatic），非殺菌\n" +
          "• 輸注 30-60 分鐘\n" +
          "• 腎功能完全不需調整\n" +
          "• ⚠️ FDA Black Box：可能增加死亡率",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• MRSA\n" +
          "• MDR Acinetobacter baumannii（CRAB）\n" +
          "• MDR Stenotrophomonas maltophilia\n" +
          "• CRE（Carbapenem-resistant Enterobacterales）\n" +
          "• Anaerobes\n" +
          "• Rapidly growing NTM\n\n" +
          "【不涵蓋 / 不建議】\n" +
          "• Pseudomonas aeruginosa（天然抗藥）\n" +
          "• Proteus / Morganella / Providencia（天然抗藥）\n" +
          "• UTI（尿中濃度不足，避免用於泌尿道感染）\n" +
          "• BSI 單獨治療（死亡率增加風險，建議合併用藥）",
      },
      {
        heading: "劑量速查",
        body:
          "【標準】LD 100 → MD 50 Q12H（CAP、cSSTI、IAI 標準）\n" +
          "【高劑量】LD 200 → MD 100 Q12H（CRAB、MDR S. maltophilia、抗藥菌 IAI）\n" +
          "【NTM】25-50 mg QD-BID（可選 LD 100 × 1）",
      },
      {
        heading: "肝功能調整",
        body:
          "CTP A / B：不需調整\n" +
          "CTP C：LD 不變，MD 減半（clearance ↓55%）\n" +
          "例外：NTM 感染即使 CTP C 也不調整",
      },
      {
        heading: "副作用",
        body:
          "• 噁心嘔吐（最常見，尤其高劑量）\n" +
          "• 胰臟炎（罕見但嚴重）\n" +
          "• 肝功能異常\n" +
          "• 與 warfarin 交互作用（INR 上升）",
      },
    ],
  },
};