import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Ertapenem（Invanz 類 - 1 g carbapenem）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Ertapenem 針（厄他培南注射劑）1 g/Vial
//
// 特性：
//   - Carbapenem，主要用於對其他抗生素抗藥的病原（如 ESBL）
//   - 不涵蓋 Pseudomonas aeruginosa（與其他 carbapenem 不同）
//   - 所有適應症基本劑量：1 g Q24H，依 CrCl 調整
//   - 適應症之間主要差異在「療程長短」
//
// ⚠️ 臨床考量（UpToDate）：
//   - Critical ill 或低白蛋白病人要小心（drug clearance 增加、死亡率升高）
//   - 這類病人部分專家偏好用 imipenem 或 meropenem
// ═══════════════════════════════════════════════════════════════

// Helper：依 CrCl / RRT 決定劑量與頻率
function getErtapenemDose(crcl: number, rrt: string) {
  if (rrt === "hd") {
    return {
      dose_mg: 500,
      freq: "Q24H",
      vials_str: "0.5 支（半支）",
      note: "HD 日給藥時機：透析後給。若必須於透析前 6 小時內給藥，透析後需補 150 mg",
    };
  }
  if (rrt === "pd") {
    return {
      dose_mg: 500,
      freq: "Q24H",
      vials_str: "0.5 支（半支）",
      note: "PD 劑量",
    };
  }
  if (rrt === "cvvh") {
    return {
      dose_mg: 1000,
      freq: "Q24H",
      vials_str: "1 支",
      note: "CVVH / CVVHDF（依 UpToDate，基於 Monte Carlo simulation）",
    };
  }
  // 一般腎功能
  if (crcl > 30) {
    return {
      dose_mg: 1000,
      freq: "Q24H",
      vials_str: "1 支",
      note: "CrCl >30：無需調整",
    };
  }
  return {
    dose_mg: 500,
    freq: "Q24H",
    vials_str: "0.5 支（半支）",
    note: "CrCl ≤30：劑量減半",
  };
}

export const ertapenem: Drug = {
  name: "Invanz",
  subtitle: "Ertapenem",
  searchTerms: [
    "ertapenem", "invanz", "厄他培南",
    "carbapenem", "ESBL",
  ],

  needsRenal: true,
  needsWeight: true,    // 規則：needsRenal true 則 needsWeight 必須 true
  needsHepatic: false,  // Child-Pugh A–C 皆不需調整

  indications: [
    {
      id: "bite",
      label: "Bite wound infection（動物/人咬傷感染）",
      desc: "1 g Q24H · 5–14 天",
      scenarios: [
        {
          label: "咬傷感染",
          note: "療程 5–14 天（可含口服降階），依臨床反應調整",
        },
      ],
    },
    {
      id: "bsi",
      label: "Bloodstream infection（菌血症，GNB 導向）",
      desc: "1 g Q24H · 7–14 天",
      scenarios: [
        {
          label: "菌血症",
          note: "針對對 ESBL 等對一般抗生素抗藥的 GNB。療程 7–14 天（依感染源、範圍、反應）；單純 Enterobacterales bacteremia + 適當源頭控制 + 治療反應良好時，7 天即可",
        },
      ],
    },
    {
      id: "diabeticFoot",
      label: "Diabetic foot infection（糖尿病足感染，中度-重度）",
      desc: "1 g Q24H · 2–4 週",
      scenarios: [
        {
          label: "糖尿病足感染",
          note: "IM 或 IV 均可。無骨髓炎時療程 2–4 週（可含口服降階）。合併骨髓炎另計療程",
        },
      ],
    },
    {
      id: "iai_cholecystitis",
      label: "Intra-abdominal infection - Acute cholecystitis（急性膽囊炎）",
      desc: "1 g Q24H · 術後 1 天或臨床緩解",
      scenarios: [
        {
          label: "急性膽囊炎",
          note: "保留給無法用一線藥（如 Tazocin）病人。療程：手術切除膽囊後持續 1 天；或非手術處理時到臨床緩解",
        },
      ],
    },
    {
      id: "iai_other",
      label: "Intra-abdominal infection - Other（腹內感染：穿孔闌尾、膽管炎、憩室炎等）",
      desc: "1 g Q24H · 療程因病況而異",
      scenarios: [
        {
          label: "腹內感染（其他）",
          note: "保留給無法用一線藥病人。IM 或 IV 均可。\n" +
                "• 源頭控制後：總療程 4–5 天（可含口服降階）\n" +
                "• 憩室炎或無介入單純闌尾炎：4–14 天（視範圍、反應、免疫狀態）\n" +
                "• 穿孔闌尾 + 腹腔鏡切除：2–4 天可能足夠",
        },
      ],
    },
    {
      id: "osteomyelitis",
      label: "Osteomyelitis / Discitis（骨髓炎 / 椎間盤炎）",
      desc: "1 g Q24H · 通常 6 週",
      scenarios: [
        {
          label: "Osteomyelitis / Discitis（骨髓炎 / 椎間盤炎）",
          note: "針對 GNB 導向治療。通常 6 週，依臨床反應與殘餘感染/植入物而定。部分病人可改口服降階。若截肢完全切除感染骨，療程可較短",
        },
      ],
    },
    {
      id: "pid",
      label: "Pelvic infection（產後 / 術後婦科感染）",
      desc: "1 g Q24H · 依感染類型",
      scenarios: [
        {
          label: "骨盆感染",
          note: "IM 或 IV 均可。療程依感染類型而定",
        },
      ],
    },
    {
      id: "cap",
      label: "Community-acquired pneumonia（CAP，住院、無 Pseudomonas 風險）",
      desc: "1 g Q24H · ≥5 天",
      scenarios: [
        {
          label: "社區型肺炎（CAP）",
          note: "須搭配適當的 combination regimen。療程 ≥5 天（可含口服降階），停藥前病人須臨床穩定、生命徵象正常",
        },
      ],
    },
    {
      id: "hapVap",
      label: "HAP / VAP（院內 / 呼吸器相關肺炎，ESBL 導向）",
      desc: "1 g Q24H · 通常 7 天",
      scenarios: [
        {
          label: "院內/呼吸器相關肺炎",
          note: "針對 ESBL-producing organisms 的 pathogen-directed therapy。療程依嚴重度與反應；通常 7 天",
        },
      ],
    },
    {
      id: "pji",
      label: "Prosthetic joint infection（PJI 人工關節感染）",
      desc: "1 g Q24H · 通常 4–6 週",
      scenarios: [
        {
          label: "人工關節感染",
          note: "針對 GNB 導向治療。接受 resection arthroplasty 者通常 4–6 週",
        },
      ],
    },
    {
      id: "ssti",
      label: "Skin & Soft Tissue Infection（SSTI 皮膚軟組織感染，中度-重度）",
      desc: "1 g Q24H · 5–14 天",
      scenarios: [
        {
          label: "SSTI（中度-重度）",
          note: "用於特定外科傷口感染（腸道、泌尿生殖）、壞死性感染、或對其他藥物抗藥的病原。常搭配 combination regimen。\n" +
                "• 一般療程 5–14 天（含口服降階）\n" +
                "• 壞死性感染：持續到不需清創、臨床改善、退燒 48–72 小時",
        },
      ],
    },
    {
      id: "surgicalProphylaxis",
      label: "Surgical prophylaxis（手術預防，大腸直腸手術）",
      desc: "1 g 術前 60 分鐘內單次",
      scenarios: [
        {
          label: "手術預防",
          note: "大腸直腸手術切開前 60 分鐘內單次給予。clean 與 clean-contaminated 手術不建議術後再給。部分專家建議不用 ertapenem 做預防（怕誘發抗藥）",
        },
      ],
    },
    {
      id: "uti",
      label: "Complicated UTI / Pyelonephritis（複雜性尿路感染 / 腎盂腎炎）",
      desc: "1 g Q24H · 5–7 天",
      scenarios: [
        {
          label: "複雜性尿路感染",
          note: "保留給多重抗藥性病原風險病人。症狀 48 小時內改善者：\n" +
                "• 總療程（含可能口服降階）5–7 天\n" +
                "• 若全程用 ertapenem：7 天",
        },
      ],
    },
  ],

  calculate({ crcl, rrt, indicationData }) {
    const scenario = indicationData.scenarios[0];
    const d = getErtapenemDose(crcl, rrt);
    const dose_str = d.dose_mg >= 1000 ? `${d.dose_mg / 1000} g` : `${d.dose_mg} mg`;

    const warnings: string[] = [];

    // ARC 提醒（雖然 ertapenem 沒明確 ARC 劑量，但值得提醒）
    if (rrt === "none" && crcl >= 130) {
      warnings.push("⚠️ ARC（CrCl ≥130）：ertapenem 無明確高劑量建議；若病人為 critically ill 或低白蛋白，部分專家偏好改用 imipenem 或 meropenem");
    }

    // 低白蛋白提醒（非強制，但臨床重要）
    if (rrt === "none" && crcl >= 30) {
      warnings.push("💡 Ertapenem 高度結合白蛋白，critically ill 或 hypoalbuminemia 病人 clearance 增加，建議評估是否改用 imipenem / meropenem");
    }

    return {
      scenarioResults: [
        {
          title: scenario.label,
          note: scenario.note,
          rows: [
            { label: "建議劑量", value: `${dose_str} IV`, highlight: true },
            { label: "給藥頻率", value: d.freq, highlight: true },
            { label: "每次取藥", value: `${d.vials_str} Ertapenem（每支 1 g）` },
            { label: "調整依據", value: d.note },
          ],
          warnings,
        },
      ],
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // 臨床參考（整理自 UpToDate）
  // ═══════════════════════════════════════════════════════════════
  clinicalPearls: {
    title: "臨床參考",
    sections: [
      {
        heading: "抗菌譜重點",
        body:
          "【對 ertapenem 有抗藥性 / 不涵蓋】\n" +
          "• MRSA（Methicillin-resistant Staphylococcus aureus）\n" +
          "• Enterococcus spp.\n" +
          "• Acinetobacter\n" +
          "• Pseudomonas aeruginosa\n" +
          "• Penicillin-resistant Streptococcus pneumoniae\n\n" +
          "【強項】\n" +
          "• 多數 ESBL-producing 細菌仍對 ertapenem 敏感，為 carbapenem-sparing 策略外的替代選項之一",
      },
      {
        heading: "臨床考量",
        body:
          "• 一般保留用於對其他抗生素抗藥的病原（如 ESBL-producing organisms）\n" +
          "• 與其他 carbapenem 不同，ertapenem 不涵蓋 Pseudomonas aeruginosa\n" +
          "• Critically ill 或 hypoalbuminemia 病人使用時要謹慎；部分專家在這類病人偏好改用 imipenem/cilastatin 或 meropenem，原因是 ertapenem 在這些病人 drug clearance 增加、死亡率風險升高",
      },
      {
        heading: "白蛋白結合特性",
        body:
          "Ertapenem 高度結合白蛋白（約 85–95%），主要由腎臟排除。\n" +
          "Critically ill 或低白蛋白病人：游離藥物比例增加 → clearance 加快 → 可能血中藥物濃度不足。這就是為什麼重症或低白蛋白病人用 ertapenem 要特別小心（UpToDate 建議考慮換 imipenem 或 meropenem）。\n\n" +
          "肝功能：Ertapenem 主要由腎排除，肝功能對藥動影響不大；Child-Pugh A–C 皆無需調整。",
      },
    ],
  },
};