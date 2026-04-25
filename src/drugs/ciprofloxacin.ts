import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Ciprofloxacin（Cinolone / Seforce）
// ═══════════════════════════════════════════════════════════════
// 院內品項：
//   PO：Cinolone 錠劑 250 mg（信諾隆膜衣錠）
//   IV：Seforce 包 400 mg / 200 mL（賜保欣注射液）
//
// Fluoroquinolone，抗 Pseudomonas 活性最強的 FQ
// PO BID / IV Q8-12H 給藥
// ⚠️ FDA Black Box Warning：肌腱斷裂、周邊神經病變、CNS 效應
// ═══════════════════════════════════════════════════════════════

// ── 腎調邏輯 ────────────────────────────────────────────────
// Ciprofloxacin 的腎調依 CrCl 分 3 級，PO 和 IV 分開
function getCiproDose(crcl: number, rrt: string, route: "PO" | "IV", isPsA: boolean): {
  po: string; iv: string; note: string;
} {
  // PsA 需要高劑量：PO 750 BID / IV 400 Q8H
  // 非 PsA 標準：PO 500 BID / IV 400 Q12H

  if (rrt === "hd" || rrt === "pd") {
    return {
      po: isPsA ? "500 mg QD PO（信諾隆 250 mg × 2 顆）" : "250-500 mg QD PO（透析後給）",
      iv: isPsA ? "400 mg QD IV（1 包）" : "200-400 mg QD IV（透析後給）",
      note: rrt === "hd"
        ? "HD：移除率極低（<10%）。透析日透析後給藥"
        : "PD：同 CrCl <30",
    };
  }
  if (rrt === "cvvh") {
    return {
      po: isPsA ? "750 mg Q12H PO" : "250-750 mg Q12H PO",
      iv: isPsA ? "400 mg Q8H IV" : "200-400 mg Q8-12H IV（重症或 MIC ≥0.5 才用 400 Q8H）",
      note: "CRRT：依感染嚴重度。重症/難治菌 → 400 mg Q8H IV，密切監測",
    };
  }

  // 一般 CKD
  if (crcl > 50) {
    return {
      po: isPsA ? "750 mg Q12H PO（信諾隆 250 mg × 3 顆 Q12H）" : "500 mg Q12H PO（信諾隆 250 mg × 2 顆 Q12H）",
      iv: isPsA ? "400 mg Q8H IV（1 包 Q8H）" : "400 mg Q12H IV（1 包 Q12H）",
      note: "CrCl >50：不需調整",
    };
  }
  if (crcl >= 30) {
    return {
      po: isPsA ? "500 mg Q12H PO" : "250-500 mg Q12H PO",
      iv: isPsA ? "400 mg Q8-12H IV" : "400 mg Q8-12H IV",
      note: `CrCl ${Math.round(crcl)}（30-50）→ PO 可能需減量`,
    };
  }
  // CrCl <30
  return {
    po: isPsA ? "500 mg QD PO" : "500 mg QD PO（重症可維持此劑量）",
    iv: isPsA ? "400 mg Q12-24H IV" : "200-400 mg Q12-24H IV（重症用 400 mg）",
    note: `CrCl ${Math.round(crcl)}（<30）→ 減頻`,
  };
}

export const ciprofloxacin: Drug = {
  name: "Ciproxin",
  subtitle: "Ciprofloxacin",
  searchTerms: [
    "ciprofloxacin", "cinolone", "seforce", "信諾隆", "賜保欣",
    "fluoroquinolone", "FQ",
  ],

  needsRenal: true,
  needsWeight: true,
  needsHepatic: false,

  indications: [

    // ═══ 1. Anthrax ═══
    {
      id: "anthrax",
      label: "Anthrax（炭疽）",
      desc: "暴露後預防 / 皮膚 / 全身性",
      scenarios: [
        {
          label: "Inhalational, postexposure prophylaxis（吸入性炭疽，暴露後預防）",
          note: "未接種疫苗者 42-60 天；免疫低下可延長 3-4 個月",
          isPsA: false,
          customDose: "PO 500 mg Q12H / IV 400 mg Q12H",
        },
        {
          label: "Cutaneous, without meningitis（皮膚炭疽）",
          note: "自然感染 7-10 天。氣溶膠暴露後合計 42-60 天",
          isPsA: false,
          customDose: "PO 500 mg Q12H",
        },
        {
          label: "Systemic, including meningitis（全身性，含腦膜炎）",
          note: "合併其他藥物 ≥2 週 IV。腦膜炎 ≥3 週。需加 antitoxin",
          isPsA: false,
          customDose: "IV 400 mg Q8H",
        },
      ],
    },

    // ═══ 2. Respiratory ═══
    {
      id: "respiratory",
      label: "Respiratory infection（呼吸道感染）",
      desc: "COPD 惡化、HAP/VAP（涵蓋 PsA）、支氣管擴張",
      scenarios: [
        {
          label: "COPD acute exacerbation（COPD 急性惡化）",
          note: "保留給有 Pseudomonas 風險者。5-7 天。無 PsA 風險時 500 BID 可能合理",
          isPsA: true,
          customDose: "PO 750 mg Q12H / 500 mg Q12H（無 PsA 風險）",
        },
        {
          label: "Pneumonia - PsA coverage, HAP/VAP（肺炎，PsA 覆蓋 / HAP/VAP）",
          note: "經驗治療合併 combination regimen。通常 7 天",
          isPsA: true,
          customDose: "PO 750 mg Q12H / IV 400 mg Q8H",
        },
        {
          label: "Bronchiectasis acute exacerbation（支氣管擴張急性惡化）",
          note: "最長 14 天",
          isPsA: true,
          customDose: "PO 500-750 mg Q12H",
        },
      ],
    },

    // ═══ 3. Diarrhea, infectious ═══
    {
      id: "diarrhea",
      label: "Diarrhea, infectious（感染性腹瀉）",
      desc: "Campylobacter / Salmonella / Shigella / Typhoid",
      scenarios: [
        {
          label: "Campylobacter, HIV",
          note: "替代藥物。FQ 抗藥增加中。7-10 天；菌血症 ≥14 天",
          isPsA: false,
          customDose: "PO 500-750 mg Q12H / IV 400 mg Q12H",
        },
        {
          label: "Campylobacter, non-HIV",
          note: "750 mg 單劑或 500 mg BID × 3 天。24hr 未改善續用 2 天",
          isPsA: false,
          customDose: "PO 750 mg 單劑 或 500 mg Q12H × 3 天",
        },
        {
          label: "Typhoid fever（傷寒）",
          note: "僅 MIC ≤0.06 時可用。7-10 天",
          isPsA: false,
          customDose: "PO 500 mg Q12H / IV 400 mg Q12H",
        },
        {
          label: "Nontyphoidal Salmonella（非傷寒沙門氏菌）",
          note: "重度/高風險/菌血症。HIV CD4 ≥200：7-14 天；CD4 <200：2-6 週",
          isPsA: false,
          customDose: "PO 500-750 mg Q12H / IV 400 mg Q12H",
        },
        {
          label: "Shigella（志賀菌症）",
          note: "僅 MIC <0.12 時可用。3 天；HIV 5-10 天；菌血症 ≥14 天",
          isPsA: false,
          customDose: "PO 500-750 mg Q12H / IV 400 mg Q12H",
        },
      ],
    },

    // ═══ 4. IAI ═══
    {
      id: "iai",
      label: "Intra-abdominal infection（腹內感染）",
      desc: "膽囊炎、闌尾炎、憩室炎",
      scenarios: [
        {
          label: "Acute cholecystitis（急性膽囊炎）",
          note: "有膽道腸道吻合者加 metronidazole。術後 1 天或臨床緩解",
          isPsA: false,
          customDose: "PO 500 mg Q12H / IV 400 mg Q12H",
        },
        {
          label: "Other IAI + metronidazole（其他腹內感染）",
          note: "合併 metronidazole。源頭控制後 4-5 天",
          isPsA: false,
          customDose: "PO 500 mg Q12H / IV 400 mg Q12H + metronidazole",
        },
      ],
    },

    // ═══ 5. Bone & Joint ═══
    {
      id: "bone_joint",
      label: "Bone & Joint infection（骨關節感染）",
      desc: "骨髓炎、PJI、化膿性關節炎",
      scenarios: [
        {
          label: "Osteomyelitis（骨髓炎）",
          note: "PsA 用 750 BID PO 或 400 Q8H IV。≥6 週",
          isPsA: false,
          customDose: "PO 500-750 mg Q12H / IV 400 mg Q8-12H",
        },
        {
          label: "PJI, GNB directed（人工關節感染，GNB）",
          note: "PsA 用 IV 400 Q8H",
          isPsA: false,
          customDose: "PO 750 mg Q12H / IV 400 mg Q8-12H",
        },
        {
          label: "PJI, S. aureus oral step-down + rifampin",
          note: "合併 rifampin。總療程 ≥3 個月",
          isPsA: false,
          customDose: "PO 500-750 mg Q12H + rifampin",
        },
        {
          label: "Septic arthritis（化膿性關節炎）",
          note: "敏感 GNB 導向治療。3-4 週（無骨髓炎），含口服降階",
          isPsA: false,
          customDose: "PO 750 mg Q12H / IV 400 mg Q8-12H",
        },
      ],
    },

    // ═══ 6. Endocarditis ═══
    {
      id: "endocarditis",
      label: "Endocarditis（心內膜炎）",
      desc: "HACEK / MSSA 口服降階",
      scenarios: [
        {
          label: "HACEK organisms（HACEK 心內膜炎）",
          note: "替代藥物。Native 4 週 / Prosthetic 6 週",
          isPsA: false,
          customDose: "PO 500-750 mg Q12H / IV 400 mg Q8-12H",
        },
        {
          label: "MSSA, oral step-down + rifampin（MSSA 口服降階）",
          note: "替代藥物。數據有限。合併 rifampin，總療程含 IV 共 6 週",
          isPsA: false,
          customDose: "PO 750 mg Q12H + rifampin",
        },
      ],
    },

    // ═══ 7. Other infections ═══
    {
      id: "other",
      label: "Other infections（前列腺炎 / 鼻竇炎 / STI / 齒源性）",
      desc: "多種適應症",
      scenarios: [
        {
          label: "Acute bacterial prostatitis（急性前列腺炎）",
          note: "2-4 週",
          isPsA: false,
          customDose: "PO 500 mg Q12H / IV 400 mg Q12H",
        },
        {
          label: "Chronic bacterial prostatitis（慢性前列腺炎）",
          note: "4-6 週",
          isPsA: false,
          customDose: "PO 500 mg Q12H / IV 400 mg Q12H",
        },
        {
          label: "Acute bacterial rhinosinusitis（急性鼻竇炎）",
          note: "替代藥物。⚠️ 不建議經驗治療（S. pneumoniae 抗藥性高）。5-7 天",
          isPsA: false,
          customDose: "PO 500 mg Q12H / IV 400 mg Q12H",
        },
        {
          label: "Chancroid（軟性下疳）",
          note: "替代藥物。3 天",
          isPsA: false,
          customDose: "PO 500 mg Q12H × 3 天",
        },
        {
          label: "Gonorrhea, confirmed susceptible（淋病，確認敏感）",
          note: "⚠️ 不建議經驗治療（廣泛抗藥）。需先確認藥敏。合併 chlamydia 治療（若未排除）",
          isPsA: false,
          customDose: "PO 500 mg 單劑",
        },
        {
          label: "Meningococcal prophylaxis（腦膜炎雙球菌預防）",
          note: "ciprofloxacin 抗藥率高區域不使用",
          isPsA: false,
          customDose: "PO 500 mg 單劑",
        },
      ],
    },

    // ═══ 8. SSTI / Diabetic foot ═══
    {
      id: "ssti",
      label: "SSTI / Diabetic foot（皮膚軟組織 / 糖尿病足）",
      desc: "手術傷口、糖尿病足",
      scenarios: [
        {
          label: "Surgical site infection + metronidazole（手術傷口感染）",
          note: "腸道/泌尿生殖道/會陰/腋窩手術",
          isPsA: false,
          customDose: "PO 750 mg Q12H / IV 400 mg Q12H + metronidazole",
        },
        {
          label: "Diabetic foot infection（糖尿病足感染）",
          note: "中重度且有抗藥 GNB 風險。PsA 疑慮用高劑量。2-4 週（無骨髓炎）",
          isPsA: false,
          customDose: "PO 500 mg Q12H（PsA: 750 Q12H）/ IV 400 mg Q12H（PsA: Q8H）",
        },
      ],
    },

    // ═══ 9. UTI ═══
    {
      id: "uti",
      label: "Urinary tract infection（泌尿道感染）",
      desc: "單純膀胱炎 / 複雜性 UTI",
      scenarios: [
        {
          label: "Acute uncomplicated cystitis（單純膀胱炎）",
          note: "⚠️ 不鼓勵使用。保留給無其他選擇者。ESBL/AmpC 用 500 BID。女性 3 天 / 男性 5 天",
          isPsA: false,
          customDose: "PO 250 mg Q12H（抗藥菌/嚴重: 500 mg Q12H）",
        },
        {
          label: "Complicated UTI / Pyelonephritis（複雜性 UTI / 腎盂腎炎）",
          note: "保留給過去 3-12 月無 FQ 暴露者。ESBL/AmpC 用高劑量。48hr 內改善者 5 天",
          isPsA: false,
          customDose: "PO 500-750 mg Q12H / IV 400 mg Q8-12H",
        },
      ],
    },

    // ═══ 10. Neutropenia / Fever ═══
    {
      id: "neutropenia",
      label: "Neutropenia（中性球低下）",
      desc: "預防 / 低風險發燒經驗治療",
      scenarios: [
        {
          label: "Antibacterial prophylaxis（抗菌預防）",
          note: "ANC ≤100 預計 >7 天。HCT 在幹細胞輸注時開始",
          isPsA: false,
          customDose: "PO 500-750 mg Q12H",
        },
        {
          label: "Low-risk febrile neutropenia（低風險中性球低下發燒）",
          note: "合併 amoxicillin/clavulanate。避免先前有 FQ 預防者使用。首劑在醫療機構給，觀察 ≥4 hr",
          isPsA: false,
          customDose: "PO 750 mg Q12H + amoxicillin/clavulanate",
        },
      ],
    },

    // ═══ 11. Special pathogens ═══
    {
      id: "special",
      label: "Special pathogens（特殊病原）",
      desc: "Plague / Tularemia / S. maltophilia / SBP prophylaxis",
      scenarios: [
        {
          label: "Plague, treatment（鼠疫，治療）",
          note: "7-14 天。孕婦 PO 500 Q8H 或 750 Q12H",
          isPsA: false,
          customDose: "PO 750 mg Q12H / IV 400 mg Q8H",
        },
        {
          label: "Plague, postexposure prophylaxis（鼠疫，暴露後預防）",
          note: "7 天",
          isPsA: false,
          customDose: "PO 500-750 mg Q12H",
        },
        {
          label: "Tularemia（兔熱病）",
          note: "10 天。嚴重/神經侵入性合併 aminoglycoside",
          isPsA: false,
          customDose: "PO 750 mg Q12H / IV 400 mg Q8H",
        },
        {
          label: "S. maltophilia, MDR（多重抗藥嗜麥芽假單胞菌）",
          note: "替代藥物。⚠️ S. pneumoniae 抗藥性考量。合併 combination regimen",
          isPsA: false,
          customDose: "PO 750 mg Q12H / IV 400 mg Q8H",
        },
        {
          label: "SBP prophylaxis（SBP 預防）",
          note: "替代藥物。二級預防（prior SBP）或一級預防（低 ascites protein <1.5 + 肝衰竭/腎功能不全）。急性 GI 出血：500 BID × 7 天",
          isPsA: false,
          customDose: "PO 500 mg QD（GI 出血: 500 mg Q12H × 7 天）",
        },
        {
          label: "Pouchitis, acute（急性迴腸袋炎）",
          note: "14 天。難治：28 天合併 combination regimen",
          isPsA: false,
          customDose: "PO 500 mg Q12H",
        },
      ],
    },

    // ═══ 12. Surgical prophylaxis ═══
    {
      id: "surgical",
      label: "Surgical prophylaxis（手術預防）",
      desc: "替代藥物，術前 120 分鐘",
      scenarios: [
        {
          label: "Surgical prophylaxis, IV（手術預防）",
          note: "替代藥物。術前 120 分鐘。Clean/clean-contaminated 不需術後再給",
          isPsA: false,
          customDose: "IV 400 mg 單劑",
        },
        {
          label: "High-risk cystoscopy / upper GU（高風險膀胱鏡 / 上泌尿道）",
          note: "術前 120 分鐘。高風險：尿液培養陽性、術前導管、植入物。需查 local sensitivity",
          isPsA: false,
          customDose: "PO 500 mg 單劑",
        },
      ],
    },

  ], // ← end of indications

  // ──────────────────────────────────────────────────────────────
  // calculate()
  // Ciprofloxacin 的劑量顯示直接用 customDose（因為 PO/IV 劑量不同、BID、不像 levofloxacin 可以統一查表）
  // 腎調另外用 getCiproDose 算
  // ──────────────────────────────────────────────────────────────
  calculate({ crcl, rrt, indicationData }) {
    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const warnings: string[] = [];
      const isPsA = sc.isPsA ?? false;

      // ARC
      const isARC = rrt === "none" && crcl >= 130;
      if (isARC) {
        warnings.push("⚡ ARC（CrCl ≥130）：IV 400 mg Q8H（MIC ≤0.125）。MIC >0.125 時 Monte Carlo 建議 600 mg Q8H（密切監測）");
      }

      // FQ Black Box Warning
      warnings.push("⚠️ FDA Black Box Warning：肌腱斷裂、周邊神經病變、CNS 效應、主動脈瘤風險。用前評估風險效益");

      // 腎調
      const d = getCiproDose(crcl, rrt, "PO", isPsA);

      // PIRRT
      if (rrt === "cvvh") {
        warnings.push("📌 PIRRT：IV 400 mg Q12H（MIC ≤0.5）/ PO 500 mg Q12H（PIRRT 後給）");
      }

      const rows: any[] = [
        { label: "原始建議劑量", value: sc.customDose, highlight: true },
      ];

      // 腎調後（只有非正常腎功能才顯示）
      const needsRenalAdj = rrt !== "none" || crcl < 50;
      if (needsRenalAdj) {
        rows.push(
          { label: "腎調後（PO）", value: d.po, highlight: true },
          { label: "腎調後（IV）", value: d.iv, highlight: true },
        );
      }

      rows.push({ label: "腎功能調整", value: d.note });

      // 院內品項提醒
      rows.push({
        label: "院內品項",
        value: "PO: 信諾隆 250 mg/顆 ｜ IV: 賜保欣 400 mg/200 mL/包",
      });

      if (isARC) {
        rows.push({
          label: "⚡ ARC 建議劑量",
          value: "IV 400 mg Q8H（MIC >0.125 考慮 600 mg Q8H）",
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
          "• 注意與含鈣/鐵/鎂/鋅/鋁的食物或藥物間隔 ≥2 小時（影響吸收）",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• Pseudomonas aeruginosa（FQ 中最強！）\n" +
          "• Enterobacterales\n" +
          "• H. influenzae、M. catarrhalis\n" +
          "• MSSA（替代）\n" +
          "• Atypical pathogens（Legionella 有效，但 Mycoplasma/Chlamydophila 活性不如 levofloxacin）\n\n" +
          "【不涵蓋】\n" +
          "• S. pneumoniae（❌ 不建議用於 CAP！）\n" +
          "• MRSA\n" +
          "• Anaerobes（需合併 metronidazole）\n" +
          "• ESBL（部分有效但不首選）",
      },
      {
        heading: "Ciprofloxacin vs Levofloxacin",
        body:
          "• Ciprofloxacin：抗 PsA 最強、BID、不涵蓋 S. pneumoniae → 用於 PsA 感染\n" +
          "• Levofloxacin：涵蓋 S. pneumoniae + atypicals、QD → 用於 CAP\n" +
          "• 重要：Ciprofloxacin 不適合經驗性治療 CAP（不涵蓋肺炎鏈球菌！）",
      },
      {
        heading: "腎功能調整速查表",
        body:
          "⚠️ PO 和 IV 劑量不同，分開看！\n\n" +
          "【PO Immediate Release】\n" +
          "  CrCl >50: 500-750 mg Q12H\n" +
          "  CrCl 30-50: 250-500 mg Q12H\n" +
          "  CrCl <30: 500 mg QD\n\n" +
          "【IV】\n" +
          "  CrCl >50: 400 mg Q8-12H\n" +
          "  CrCl 30-50: 400 mg Q8-12H\n" +
          "  CrCl <30: 200-400 mg Q12-24H\n\n" +
          "ARC (≥130): IV 400 mg Q8H（MIC >0.125 → 600 mg Q8H）\n" +
          "HD: PO 250-500 mg QD / IV 200-400 mg QD（移除率 <10%，透析後給）\n" +
          "PD: 同 HD\n" +
          "CRRT: IV 200-400 mg Q8-12H（重症 400 Q8H）\n" +
          "PIRRT: IV 400 mg Q12H / PO 500 mg Q12H",
      },
      {
        heading: "FDA Black Box Warning",
        body:
          "⚠️ 所有 fluoroquinolone 共通：\n" +
          "• 肌腱炎與肌腱斷裂（>60 歲、corticosteroid、器官移植）\n" +
          "• 周邊神經病變（可能不可逆）\n" +
          "• CNS 效應（癲癇、頭暈、精神症狀）\n" +
          "• 主動脈瘤/主動脈剝離\n" +
          "• 低血糖\n\n" +
          "→ 有替代治療的適應症應優先使用其他藥物",
      },
      {
        heading: "肝功能 / 肥胖",
        body:
          "• CTP A-C：不需調整（但疑似 ciprofloxacin 引起肝損傷時考慮停藥）\n" +
          "• 肥胖：不需調整",
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
