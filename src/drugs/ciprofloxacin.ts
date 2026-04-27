import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Ciproxin（Ciprofloxacin）
// ═══════════════════════════════════════════════════════════════
// 院內品項：
//   PO：Cinolone 錠劑 250 mg（信諾隆膜衣錠）
//   IV：Seforce 包 400 mg / 200 mL（賜保欣注射液）
//
// Fluoroquinolone 中抗 Pseudomonas 活性最強
// PO BID / IV Q8-12H（PO ≠ IV 劑量！）
// PO 生體可用率 ≈70-80%（低於 levofloxacin 的 99%）
// ⚠️ 不涵蓋 S. pneumoniae → 不適合經驗性治療 CAP
// ⚠️ FDA Black Box Warning：肌腱斷裂、周邊神經病變、CNS 效應
//
// 腎調：PO 和 IV 分開調整，依 CrCl 分 3 級
// 肝功能：CTP A–C 不需調整
// ═══════════════════════════════════════════════════════════════

// ── 院內品項規格 ──────────────────────────────────────────────
const MG_PER_TAB = 250;  // PO：每顆 250 mg
const MG_PER_BAG = 400;  // IV：每包 400 mg

// Helper：PO 顆數對應
function toTablets(mg: number): string {
  const tabs = mg / MG_PER_TAB;
  if (tabs === 1) return "信諾隆 250 mg × 1 顆";
  if (tabs === 2) return "信諾隆 250 mg × 2 顆";
  if (tabs === 3) return "信諾隆 250 mg × 3 顆";
  return `信諾隆 250 mg × ${tabs} 顆`;
}

// Helper：IV 包數對應
function toBags(mg: number): string {
  if (mg === 400) return "Seforce 400 mg × 1 包";
  if (mg === 200) return "Seforce 400 mg × 半包（或稀釋取半量）";
  return `${mg} mg IV`;
}

// ── 腎調邏輯 ─────────────────────────────────────────────────
// Ciprofloxacin 的腎調：PO 和 IV 分開
// CrCl 3 級：>50, 30-50, <30
type DoseEntry = { po: string; iv: string };
type RenalColumn = { label: string; tiers: DoseEntry[] };

const RENAL_COLS: Record<string, RenalColumn> = {
  // 標準劑量（非 PsA）
  "standard": {
    label: "標準劑量",
    tiers: [
      { po: "500 mg Q12H", iv: "400 mg Q12H" },           // >50
      { po: "250-500 mg Q12H", iv: "400 mg Q8-12H" },     // 30-50
      { po: "500 mg QD", iv: "200-400 mg Q12-24H" },      // <30
    ],
  },
  // PsA 高劑量
  "psa": {
    label: "PsA 高劑量",
    tiers: [
      { po: "750 mg Q12H", iv: "400 mg Q8H" },            // >50
      { po: "500 mg Q12H", iv: "400 mg Q8H" },            // 30-50（重症可維持 750）
      { po: "500 mg QD", iv: "400 mg Q12-24H" },          // <30
    ],
  },
};

function getTierIndex(crcl: number): number {
  if (crcl > 50) return 0;
  if (crcl >= 30) return 1;
  return 2;
}

function getCiproDose(crcl: number, rrt: string, baseKey: string): {
  po: string; iv: string; note: string;
} {
  const col = RENAL_COLS[baseKey] ?? RENAL_COLS["standard"];

  if (rrt === "hd" || rrt === "pd") {
    return {
      po: "250-500 mg QD（透析後給）",
      iv: "200-400 mg QD（透析後給）",
      note: rrt === "hd"
        ? "HD：移除率極低（<10%）。透析日透析後給藥。重症可維持 500 mg QD PO 或 400 mg QD IV"
        : "PD：同 HD 調整",
    };
  }
  if (rrt === "cvvh") {
    return {
      po: "250-750 mg Q12H",
      iv: "200-400 mg Q8-12H（重症或 MIC ≥0.5 → 400 mg Q8H）",
      note: "CRRT：依感染嚴重度調整。重症/難治菌 → 400 mg Q8H IV，密切監測",
    };
  }

  const tier = getTierIndex(crcl);
  const entry = col.tiers[tier];
  let note = "";
  if (tier === 0) {
    note = "CrCl >50：不需調整";
  } else if (tier === 1) {
    note = `CrCl ${Math.round(crcl)}（30-50）→ PO 可能需減量`;
  } else {
    note = `CrCl ${Math.round(crcl)}（<30）→ 減頻至 QD`;
  }

  return { po: entry.po, iv: entry.iv, note };
}

export const ciprofloxacin: Drug = {
  name: "Ciproxin",
  subtitle: "Ciprofloxacin",
  searchTerms: [
    "ciprofloxacin", "ciproxin", "cinolone", "seforce",
    "信諾隆", "賜保欣", "cipro", "CPFX",
    "fluoroquinolone", "FQ",
  ],

  needsRenal: true,
  needsWeight: true,
  needsHepatic: false,

  // ──────────────────────────────────────────────────────────────
  // 適應症（26 個，照 UpToDate 原文標題）
  // ──────────────────────────────────────────────────────────────
  indications: [

    // ═══ 1. Anthrax ═══
    {
      id: "anthrax",
      label: "Anthrax（炭疽）",
      desc: "暴露後預防 / 皮膚 / 全身性",
      scenarios: [
        {
          label: "Inhalational, postexposure prophylaxis（吸入性，暴露後預防）",
          note: "未接種疫苗者 42-60 天；免疫低下可延長 3-4 個月。需同時給予炭疽疫苗",
          doseDisplay: "PO 500 mg Q12H / IV 400 mg Q12H",
          baseKey: "standard",
        },
        {
          label: "Cutaneous, without meningitis（皮膚，無腦膜炎）",
          note: "自然感染 7-10 天。氣溶膠暴露後合計 42-60 天",
          doseDisplay: "PO 500 mg Q12H",
          baseKey: "standard",
        },
        {
          label: "Systemic, including meningitis（全身性，含腦膜炎）",
          note: "合併其他藥物 ≥2 週 IV；腦膜炎 ≥3 週。需加 antitoxin",
          doseDisplay: "IV 400 mg Q8H",
          baseKey: "psa",
        },
      ],
    },

    // ═══ 2. Bite wound infection ═══
    {
      id: "bite",
      label: "Bite wound infection（咬傷感染）",
      desc: "替代藥物，合併厭氧菌覆蓋",
      scenarios: [
        {
          label: "Bite wound, prophylaxis or treatment（預防或治療）",
          note: "合併厭氧菌覆蓋。預防 3-5 天；治療 5-14 天（深層/複雜可更長）",
          doseDisplay: "PO 500-750 mg Q12H / IV 400 mg Q12H",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 3. Bronchiectasis ═══
    {
      id: "bronchiectasis",
      label: "Bronchiectasis, acute exacerbation（支氣管擴張急性惡化）",
      desc: "500-750 mg BID · 最長 14 天",
      scenarios: [
        {
          label: "Bronchiectasis, acute exacerbation（支氣管擴張急性惡化）",
          note: "最長 14 天",
          doseDisplay: "PO 500-750 mg Q12H",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 4. Cat scratch disease ═══
    {
      id: "catScratch",
      label: "Cat scratch disease, lymphadenitis（貓抓病）",
      desc: "替代藥物 · 7-10 天",
      scenarios: [
        {
          label: "Cat scratch disease（貓抓病，非播散性淋巴腺炎）",
          note: "替代藥物。部分專家保留給免疫正常且無法用其他藥物者。7-10 天",
          doseDisplay: "PO 500 mg Q12H",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 5. Cholera ═══
    {
      id: "cholera",
      label: "Cholera（霍亂）",
      desc: "替代藥物，單劑",
      scenarios: [
        {
          label: "Cholera（霍亂，Vibrio cholerae）",
          note: "替代藥物。單劑",
          doseDisplay: "PO 1 g 單劑",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 6. COPD acute exacerbation ═══
    {
      id: "copd",
      label: "Chronic obstructive pulmonary disease, acute exacerbation（COPD 急性惡化）",
      desc: "有 PsA 風險者 · 5-7 天",
      scenarios: [
        {
          label: "COPD acute exacerbation（COPD 急性惡化）",
          note: "保留給有 Pseudomonas 風險者。5-7 天。無 PsA 風險時 500 mg BID 可能合理",
          doseDisplay: "PO 750 mg Q12H（無 PsA 風險：500 mg Q12H）",
          baseKey: "psa",
        },
      ],
    },

    // ═══ 7. Crohn disease ═══
    {
      id: "crohn",
      label: "Crohn disease, perianal fistulas（克隆氏病，肛周廔管）",
      desc: "輔助藥物 · 4-8 週",
      scenarios: [
        {
          label: "Crohn disease, simple perianal fistulas（單純肛周廔管）",
          note: "輔助藥物。± metronidazole。4 週（部分專家 8 週）",
          doseDisplay: "PO 500 mg Q12H",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 8. Diabetic foot infection ═══
    {
      id: "diabeticFoot",
      label: "Diabetic foot infection（糖尿病足感染）",
      desc: "中重度，有抗藥 GNB 風險",
      scenarios: [
        {
          label: "Diabetic foot infection（糖尿病足感染）",
          note: "中重度且有抗藥 GNB 風險（ESBL、PsA）。合併其他藥物。PsA 用高劑量。2-4 週（無骨髓炎）",
          doseDisplay: "PO 500 mg Q12H（PsA: 750 Q12H）/ IV 400 mg Q12H（PsA: Q8H）",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 9. Diarrhea, infectious ═══
    {
      id: "diarrhea",
      label: "Diarrhea, infectious（感染性腹瀉）",
      desc: "Cystoisospora / Campylobacter / Salmonella / Shigella",
      scenarios: [
        {
          label: "Cystoisosporiasis, immunocompetent（囊孢子蟲，免疫正常）",
          note: "通常自限。7 天",
          doseDisplay: "PO 500 mg Q12H",
          baseKey: "standard",
        },
        {
          label: "Cystoisosporiasis, immunocompromised（囊孢子蟲，免疫低下）",
          note: "7 天後接 chronic maintenance。HIV CD4 <200 或 SOT：500 mg 每週三次。HIV CD4 ≥200 維持 >6 月可停",
          doseDisplay: "PO 500 mg Q12H / IV 400 mg Q12H → 維持 500 mg 3x/week",
          baseKey: "standard",
        },
        {
          label: "Campylobacter, HIV（彎曲桿菌，HIV）",
          note: "替代藥物。FQ 抗藥增加，建議確認藥敏。輕中度 7-10 天；菌血症 ≥14 天（合併 aminoglycoside）。復發可延 2-6 週",
          doseDisplay: "PO 500-750 mg Q12H / IV 400 mg Q12H",
          baseKey: "standard",
        },
        {
          label: "Campylobacter, non-HIV（彎曲桿菌，非 HIV）",
          note: "750 mg 單劑或 500 mg BID × 3 天。24hr 未改善續用 2 天",
          doseDisplay: "PO 750 mg 單劑 或 500 mg Q12H × 3 天",
          baseKey: "standard",
        },
        {
          label: "Salmonella, nontyphoidal severe（非傷寒沙門氏菌，重度）",
          note: "HIV CD4 ≥200：7-14 天；CD4 <200：2-6 週",
          doseDisplay: "PO 500-750 mg Q12H / IV 400 mg Q12H",
          baseKey: "standard",
        },
        {
          label: "Salmonella, nontyphoidal BSI（非傷寒沙門氏菌，菌血症）",
          note: "免疫正常 10-14 天；免疫抑制者更長",
          doseDisplay: "PO 500-750 mg Q12H / IV 400 mg Q12H",
          baseKey: "standard",
        },
        {
          label: "Typhoid fever（傷寒）",
          note: "僅 MIC ≤0.06 時可用。7-10 天",
          doseDisplay: "PO 500 mg Q12H / IV 400 mg Q12H",
          baseKey: "standard",
        },
        {
          label: "Shigella, HIV（志賀菌症，HIV）",
          note: "僅 MIC <0.12 時可用。5-10 天；菌血症 ≥14 天；復發（CD4 <200）可延 6 週",
          doseDisplay: "PO 500-750 mg Q12H / IV 400 mg Q12H",
          baseKey: "standard",
        },
        {
          label: "Shigella, non-HIV（志賀菌症，非 HIV）",
          note: "3 天。S. dysenteriae type 1 延長 5-7 天；菌血症 14 天",
          doseDisplay: "PO 500 mg Q12H 或 750 mg QD",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 10. Endocarditis ═══
    {
      id: "endocarditis",
      label: "Endocarditis, treatment（心內膜炎）",
      desc: "HACEK / MSSA 口服降階",
      scenarios: [
        {
          label: "HACEK organisms（HACEK 心內膜炎）",
          note: "替代藥物。Native 4 週 / Prosthetic 6 週",
          doseDisplay: "PO 500-750 mg Q12H / IV 400 mg Q8-12H",
          baseKey: "standard",
        },
        {
          label: "MSSA, oral step-down + rifampin（MSSA 口服降階）",
          note: "替代藥物。數據有限。合併 rifampin，總療程含 IV 共 6 週",
          doseDisplay: "PO 750 mg Q12H + rifampin",
          baseKey: "psa",
        },
      ],
    },

    // ═══ 11. IAI ═══
    {
      id: "iai",
      label: "Intra-abdominal infection（腹內感染）",
      desc: "社區型輕中度，無抗藥風險",
      scenarios: [
        {
          label: "Acute cholecystitis（急性膽囊炎）",
          note: "有膽道腸道吻合加 metronidazole。術後 1 天或臨床緩解",
          doseDisplay: "PO 500 mg Q12H / IV 400 mg Q12H",
          baseKey: "standard",
        },
        {
          label: "Other IAI（闌尾炎、憩室炎、腹腔膿瘍等）",
          note: "合併 metronidazole。源頭控制後 4-5 天；穿孔闌尾 + 腹腔鏡 2-4 天",
          doseDisplay: "PO 500 mg Q12H / IV 400 mg Q12H + metronidazole",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 12. Meningitis ═══
    {
      id: "meningitis",
      label: "Meningitis, bacterial（細菌性腦膜炎）",
      desc: "替代藥物，合併 combination",
      scenarios: [
        {
          label: "Bacterial meningitis（細菌性腦膜炎）",
          note: "替代藥物。經驗治療必須合併其他藥物",
          doseDisplay: "IV 400 mg Q8-12H",
          baseKey: "psa",
        },
      ],
    },

    // ═══ 13. Meningococcal prophylaxis ═══
    {
      id: "meningococcalProphy",
      label: "Meningococcal meningitis prophylaxis（腦膜炎雙球菌預防）",
      desc: "單劑",
      scenarios: [
        {
          label: "Meningococcal prophylaxis（腦膜炎雙球菌預防）",
          note: "Ciprofloxacin 抗藥率 ≥20% 的地區不使用",
          doseDisplay: "PO 500 mg 單劑",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 14. Neutropenia prophylaxis ═══
    {
      id: "neutroProphy",
      label: "Neutropenia, antibacterial prophylaxis（中性球低下預防）",
      desc: "ANC ≤100 預計 >7 天",
      scenarios: [
        {
          label: "Antibacterial prophylaxis（抗菌預防）",
          note: "部分醫師在 ANC <500 >7 天時即開始。HCT 在幹細胞輸注時開始",
          doseDisplay: "PO 500-750 mg Q12H",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 15. Neutropenic fever ═══
    {
      id: "neutroFever",
      label: "Neutropenic fever, low-risk（低風險中性球低下發燒）",
      desc: "合併 amoxicillin/clavulanate",
      scenarios: [
        {
          label: "Low-risk febrile neutropenia（低風險中性球低下發燒）",
          note: "合併 amoxicillin/clavulanate。避免先前有 FQ 預防者。首劑在醫療機構給，觀察 ≥4 hr",
          doseDisplay: "PO 750 mg Q12H + amoxicillin/clavulanate",
          baseKey: "psa",
        },
      ],
    },

    // ═══ 16. Osteomyelitis ═══
    {
      id: "osteo",
      label: "Osteomyelitis（骨髓炎）",
      desc: "治療 / 慢性抑制",
      scenarios: [
        {
          label: "Osteomyelitis, treatment（骨髓炎，治療）",
          note: "PsA 用 PO 750 Q12H / IV 400 Q8H。≥6 週",
          doseDisplay: "PO 500-750 mg Q12H / IV 400 mg Q8-12H",
          baseKey: "standard",
        },
        {
          label: "Osteomyelitis, chronic suppression（慢性抑制）",
          note: "有殘留感染性植入物時",
          doseDisplay: "PO 250-500 mg Q12H",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 17. Plague ═══
    {
      id: "plague",
      label: "Plague（鼠疫）",
      desc: "治療 / 暴露後預防",
      scenarios: [
        {
          label: "Plague, treatment（鼠疫，治療）",
          note: "7-14 天。孕婦 PO 500 Q8H 或 750 Q12H",
          doseDisplay: "PO 750 mg Q12H / IV 400 mg Q8H",
          baseKey: "psa",
        },
        {
          label: "Plague, postexposure prophylaxis（暴露後預防）",
          note: "7 天",
          doseDisplay: "PO 500-750 mg Q12H",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 18. Pneumonia ═══
    {
      id: "pneumonia",
      label: "Pneumonia, PsA coverage（肺炎，PsA 覆蓋）",
      desc: "住院病人，經驗或導向治療 PsA",
      scenarios: [
        {
          label: "Pneumonia, PsA empiric or directed（肺炎，PsA 經驗/導向治療）",
          note: "⚠️ 不涵蓋 S. pneumoniae → 不適合經驗性治療 CAP。經驗治療合併 combination。通常 7 天",
          doseDisplay: "PO 750 mg Q12H / IV 400 mg Q8H",
          baseKey: "psa",
        },
      ],
    },

    // ═══ 19. Pouchitis ═══
    {
      id: "pouchitis",
      label: "Pouchitis, acute（急性迴腸袋炎）",
      desc: "14-28 天",
      scenarios: [
        {
          label: "Pouchitis, initial therapy（初始治療）",
          note: "14 天",
          doseDisplay: "PO 500 mg Q12H",
          baseKey: "standard",
        },
        {
          label: "Pouchitis, refractory（難治型）",
          note: "28 天，合併 combination regimen",
          doseDisplay: "PO 500 mg Q12H",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 20. Prostatitis ═══
    {
      id: "prostatitis",
      label: "Prostatitis（前列腺炎）",
      desc: "急性 / 慢性",
      scenarios: [
        {
          label: "Acute bacterial prostatitis（急性細菌性前列腺炎）",
          note: "2-4 週",
          doseDisplay: "PO 500 mg Q12H / IV 400 mg Q12H",
          baseKey: "standard",
        },
        {
          label: "Chronic bacterial prostatitis（慢性細菌性前列腺炎）",
          note: "4-6 週",
          doseDisplay: "PO 500 mg Q12H / IV 400 mg Q12H",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 21. Prosthetic joint infection ═══
    {
      id: "pji",
      label: "Prosthetic joint infection（人工關節感染）",
      desc: "GNB / MSSA + rifampin / PsA 慢性抑制",
      scenarios: [
        {
          label: "GNB, treatment（GNB 導向治療）",
          note: "PsA 用 IV 400 Q8H",
          doseDisplay: "PO 750 mg Q12H / IV 400 mg Q8-12H",
          baseKey: "psa",
        },
        {
          label: "S. aureus oral step-down + rifampin（MSSA 口服降階）",
          note: "合併 rifampin。≥3 個月",
          doseDisplay: "PO 500-750 mg Q12H + rifampin",
          baseKey: "standard",
        },
        {
          label: "Chronic suppressive therapy, PsA（PsA 慢性抑制）",
          note: "長期口服",
          doseDisplay: "PO 250-500 mg Q12H",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 22. Rhinosinusitis ═══
    {
      id: "rhinosinusitis",
      label: "Rhinosinusitis, acute bacterial（急性細菌性鼻竇炎）",
      desc: "替代藥物 · 5-7 天",
      scenarios: [
        {
          label: "Acute bacterial rhinosinusitis（急性鼻竇炎）",
          note: "⚠️ S. pneumoniae 抗藥性高 → 不建議經驗治療鼻竇炎。大多數先觀察。保留給無其他選擇者。5-7 天",
          doseDisplay: "PO 500 mg Q12H / IV 400 mg Q12H",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 23. Septic arthritis ═══
    {
      id: "septicArthritis",
      label: "Septic arthritis（化膿性關節炎）",
      desc: "GNB 導向 · 3-4 週",
      scenarios: [
        {
          label: "Septic arthritis（化膿性關節炎）",
          note: "敏感 GNB 導向治療。3-4 週（無骨髓炎），含口服降階",
          doseDisplay: "PO 750 mg Q12H / IV 400 mg Q8-12H",
          baseKey: "psa",
        },
      ],
    },

    // ═══ 24. Sexually transmitted infections ═══
    {
      id: "sti",
      label: "Sexually transmitted infections（性傳染病）",
      desc: "軟性下疳 / 淋病",
      scenarios: [
        {
          label: "Chancroid（軟性下疳）",
          note: "替代藥物。3 天",
          doseDisplay: "PO 500 mg Q12H × 3 天",
          baseKey: "standard",
        },
        {
          label: "Gonorrhea, confirmed susceptible（淋病，確認敏感）",
          note: "⚠️ 不建議經驗治療（廣泛抗藥）。需先確認藥敏。合併 chlamydia 治療（若未排除）",
          doseDisplay: "PO 500 mg 單劑",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 25. Skin and soft tissue / SBP / Surgical ═══
    {
      id: "ssti",
      label: "Skin and soft tissue infection（皮膚軟組織感染）",
      desc: "手術傷口感染",
      scenarios: [
        {
          label: "Surgical site infection + metronidazole（手術傷口感染）",
          note: "腸道/泌尿生殖道/會陰/腋窩手術",
          doseDisplay: "PO 750 mg Q12H / IV 400 mg Q12H + metronidazole",
          baseKey: "psa",
        },
      ],
    },

    {
      id: "sbp",
      label: "Spontaneous bacterial peritonitis, prophylaxis（SBP 預防）",
      desc: "替代藥物",
      scenarios: [
        {
          label: "SBP prophylaxis（SBP 預防）",
          note: "替代藥物。二級預防（prior SBP）或一級預防（低 ascites protein + 肝衰竭/腎功能不全）。GI 出血：500 BID × 7 天",
          doseDisplay: "PO 500 mg QD（GI 出血：500 mg Q12H × 7 天）",
          baseKey: "standard",
        },
      ],
    },

    {
      id: "surgical",
      label: "Surgical prophylaxis（手術預防）",
      desc: "替代藥物，術前 120 分鐘",
      scenarios: [
        {
          label: "Surgical prophylaxis, IV（手術預防 IV）",
          note: "替代藥物。術前 120 分鐘。Clean/clean-contaminated 不需術後再給",
          doseDisplay: "IV 400 mg 單劑",
          baseKey: "standard",
        },
        {
          label: "High-risk cystoscopy / upper GU（高風險膀胱鏡 / 上泌尿道）",
          note: "術前 120 分鐘。需查 local sensitivity",
          doseDisplay: "PO 500 mg 單劑",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 26. Tularemia ═══
    {
      id: "tularemia",
      label: "Tularemia（兔熱病）",
      desc: "治療 / 暴露後預防",
      scenarios: [
        {
          label: "Tularemia, treatment（治療）",
          note: "10 天。嚴重/神經侵入性合併 aminoglycoside",
          doseDisplay: "PO 750 mg Q12H / IV 400 mg Q8H",
          baseKey: "psa",
        },
        {
          label: "Tularemia, postexposure prophylaxis（暴露後預防）",
          note: "7 天",
          doseDisplay: "PO 500 mg Q12H",
          baseKey: "standard",
        },
      ],
    },

    // ═══ 27. UTI ═══
    {
      id: "uti",
      label: "Urinary tract infection（泌尿道感染）",
      desc: "膀胱炎 / 複雜性 UTI",
      scenarios: [
        {
          label: "Acute uncomplicated cystitis（單純膀胱炎）",
          note: "⚠️ 不鼓勵使用。保留給無其他選擇者。ESBL/AmpC 或男性嚴重用 500 mg。女性 3 天 / 男性 5 天",
          doseDisplay: "PO 250 mg Q12H（抗藥菌/嚴重：500 mg Q12H）",
          baseKey: "standard",
        },
        {
          label: "Complicated UTI / Pyelonephritis（複雜性 UTI / 腎盂腎炎）",
          note: "保留給過去 3-12 月無 FQ 暴露者。ESBL/AmpC 用高劑量。48hr 改善者 5 天",
          doseDisplay: "PO 500-750 mg Q12H / IV 400 mg Q8-12H",
          baseKey: "standard",
        },
      ],
    },

  ], // ← end of indications

  // ──────────────────────────────────────────────────────────────
  // calculate()
  // ──────────────────────────────────────────────────────────────
  calculate({ crcl, rrt, indicationData }) {
    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const baseKey: string = sc.baseKey ?? "standard";
      const d = getCiproDose(crcl, rrt, baseKey);
      const warnings: string[] = [];

      // ARC
      const isARC = rrt === "none" && crcl >= 130;
      if (isARC) {
        warnings.push("⚡ ARC（CrCl ≥130）：IV 400 mg Q8H（MIC ≤0.125）。MIC >0.125 時 Monte Carlo 建議 600 mg Q8H（密切監測，或改用其他藥物）");
      }

      // FQ Black Box Warning
      warnings.push("⚠️ FDA Black Box Warning：肌腱斷裂（>60 歲、steroid、器官移植）、周邊神經病變、CNS 效應、主動脈瘤風險。用前評估風險效益");

      // PIRRT
      if (rrt === "cvvh") {
        warnings.push("📌 PIRRT：IV 400 mg Q12H（MIC ≤0.5）/ PO 500 mg Q12H（PIRRT 後給）");
      }

      // 建立 rows
      const rows: any[] = [
        { label: "原始建議劑量", value: sc.doseDisplay, highlight: true },
      ];

      // 腎調後（只有非正常腎功能才顯示）
      const needsAdj = rrt !== "none" || crcl <= 50;
      if (needsAdj) {
        rows.push(
          { label: "腎調後（PO）", value: `${d.po}（${toTablets(250)}起）`, highlight: true },
          { label: "腎調後（IV）", value: `${d.iv}（${toBags(400)}起）`, highlight: true },
        );
      }

      rows.push({ label: "腎功能調整", value: d.note });
      rows.push({
        label: "院內品項",
        value: `PO：${toTablets(250)} ｜ IV：${toBags(400)}`,
      });

      if (isARC) {
        rows.push({
          label: "⚡ ARC 建議劑量",
          value: "IV 400 mg Q8H（MIC >0.125 → 600 mg Q8H）",
          highlight: true,
        });
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
          "• Fluoroquinolone 中抗 Pseudomonas 活性最強\n" +
          "• PO BID / IV Q8-12H 給藥（不同於 levofloxacin QD）\n" +
          "• PO 生體可用率 ≈70-80%（比 levofloxacin 的 99% 低）\n" +
          "• PO 與 IV 劑量不同（PO 500-750 mg ≈ IV 400 mg）\n" +
          "• 注意與含鈣/鐵/鎂/鋅/鋁的食物或藥物間隔 ≥2 小時",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• Pseudomonas aeruginosa（FQ 中最強！）\n" +
          "• Enterobacterales\n" +
          "• H. influenzae、M. catarrhalis\n" +
          "• MSSA（替代）\n" +
          "• Legionella（有效），Mycoplasma/Chlamydophila（不如 levofloxacin）\n\n" +
          "【不涵蓋】\n" +
          "• S. pneumoniae（❌ 不適合經驗治療 CAP！）\n" +
          "• MRSA\n" +
          "• Anaerobes（需合併 metronidazole）\n" +
          "• ESBL（部分有效但不首選）",
      },
      {
        heading: "Ciprofloxacin vs Levofloxacin",
        body:
          "• Ciprofloxacin：BID、抗 PsA 最強、不涵蓋 S. pneumoniae → PsA 感染\n" +
          "• Levofloxacin：QD、涵蓋 S. pneumoniae + atypicals → CAP\n" +
          "• 兩者都不涵蓋 MRSA 和 anaerobes",
      },
      {
        heading: "腎功能調整速查表",
        body:
          "⚠️ PO 和 IV 劑量不同，分開看！\n\n" +
          "【PO Immediate Release】\n" +
          "  CrCl >50：500-750 mg Q12H\n" +
          "  CrCl 30-50：250-500 mg Q12H（重症可維持 750 mg）\n" +
          "  CrCl <30：500 mg QD\n\n" +
          "【IV】\n" +
          "  CrCl >50：400 mg Q8-12H\n" +
          "  CrCl 30-50：400 mg Q8-12H\n" +
          "  CrCl <30：200-400 mg Q12-24H（LD 400 mg 考慮用於 200 mg 維持者）\n\n" +
          "ARC (≥130)：IV 400 mg Q8H（MIC >0.125 → 600 mg Q8H）\n" +
          "HD：PO 250-500 mg QD / IV 200-400 mg QD（移除 <10%，透析後給）\n" +
          "PD：同 HD\n" +
          "CRRT：IV 200-400 mg Q8-12H（重症 400 Q8H）\n" +
          "PIRRT：IV 400 mg Q12H / PO 500 mg Q12H（PIRRT 後給）",
      },
      {
        heading: "FDA Black Box Warning",
        body:
          "⚠️ 所有 fluoroquinolone 共通：\n" +
          "• 肌腱炎/斷裂（>60 歲、corticosteroid、器官移植）\n" +
          "• 周邊神經病變（可能不可逆）\n" +
          "• CNS 效應（癲癇、頭暈、精神症狀）\n" +
          "• 主動脈瘤/剝離、低血糖\n" +
          "→ 有替代治療的適應症應優先使用其他藥物",
      },
      {
        heading: "肝功能",
        body:
          "• CTP A-C：不需調整\n" +
          "• 疑似 ciprofloxacin 引起肝損傷時考慮停藥（除非 benefit > risk）",
      },
      {
        heading: "院內品項",
        body:
          "• PO：Cinolone 錠劑 250 mg（信諾隆膜衣錠）\n" +
          "• IV：Seforce 包 400 mg / 200 mL（賜保欣注射液）",
      },
    ],
  },
};