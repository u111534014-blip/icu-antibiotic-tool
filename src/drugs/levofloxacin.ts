import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Levofloxacin（Cravit / 可樂必妥）
// ═══════════════════════════════════════════════════════════════
// 院內品項：
//   PO：Cravit 錠劑 500 mg（可樂必妥膜衣錠）
//   PO：平福樂欣膜衣錠 750 mg
//   IV：Cravit 針 250 mg / 50 mL / Bot（5 mg/mL，可樂必妥靜脈輸液）
//
// Respiratory fluoroquinolone，QD 給藥（方便性佳）
// ⚠️ FDA Black Box Warning：肌腱斷裂、周邊神經病變、CNS 效應
// ═══════════════════════════════════════════════════════════════

// ── 腎調表（依原始劑量分 3 欄）──────────────────────────────────
// 每欄 3 個 CrCl 級距：≥50, 20-<50, <20
type RenalEntry = { dose_mg: number; freq: string; ld_mg?: number };
type RenalCol = { label: string; tiers: RenalEntry[] };

const RENAL_COLS: Record<string, RenalCol> = {
  "250_qd": {
    label: "250 mg QD",
    tiers: [
      { dose_mg: 250, freq: "QD" },           // ≥50
      { dose_mg: 250, freq: "QD" },           // 20-<50（不調）
      { dose_mg: 250, freq: "Q48H" },         // <20
    ],
  },
  "500_qd": {
    label: "500 mg QD",
    tiers: [
      { dose_mg: 500, freq: "QD" },
      { dose_mg: 250, freq: "QD", ld_mg: 500 },    // LD 500 → 250 QD
      { dose_mg: 250, freq: "Q48H", ld_mg: 500 },  // LD 500 → 250 Q48H
    ],
  },
  "750_qd": {
    label: "750 mg QD",
    tiers: [
      { dose_mg: 750, freq: "QD" },
      { dose_mg: 750, freq: "Q48H" },
      { dose_mg: 500, freq: "Q48H", ld_mg: 750 },  // LD 750 → 500 Q48H
    ],
  },
};

function getTier(crcl: number): number {
  if (crcl >= 50) return 0;
  if (crcl >= 20) return 1;
  return 2;
}

function getLevoDose(crcl: number, rrt: string, baseKey: string): {
  dose_mg: number; freq: string; ld_mg: number | null; note: string;
} {
  const col = RENAL_COLS[baseKey];
  if (!col) return { dose_mg: 500, freq: "QD", ld_mg: null, note: "⚠️ 無法對應腎調表" };

  if (rrt === "hd" || rrt === "pd") {
    // HD/PD 同 CrCl <20 的調法，透析後給（HD 僅移除約 21%）
    const entry = col.tiers[2]; // <20 的那列
    return {
      dose_mg: entry.dose_mg, freq: entry.freq, ld_mg: entry.ld_mg ?? null,
      note: rrt === "hd"
        ? "HD：僅移除約 21%（high-flux 4 hr）。透析日透析後給藥。可用 QD 或 Q48H 方案"
        : "PD：同 CrCl <20 調整",
    };
  }
  if (rrt === "cvvh") {
    // CRRT：依原始劑量
    if (baseKey === "250_qd") return { dose_mg: 250, freq: "QD", ld_mg: null, note: "CRRT：不需調整" };
    if (baseKey === "500_qd") return { dose_mg: 250, freq: "QD", ld_mg: 500, note: "CRRT：LD 500 mg → 250 mg QD（或 500 mg Q48H）" };
    return { dose_mg: 500, freq: "QD", ld_mg: 750, note: "CRRT：LD 750 mg → 500 mg QD（或 750 mg Q48H）" };
  }

  const tier = getTier(crcl);
  const entry = col.tiers[tier];
  let note = "";
  if (tier === 0) note = "CrCl ≥50：不需調整";
  else if (tier === 1) note = `CrCl ${Math.round(crcl)}（20-49）→ 依「${col.label}」欄調整`;
  else note = `CrCl ${Math.round(crcl)}（<20）→ 依「${col.label}」欄調整`;

  return { dose_mg: entry.dose_mg, freq: entry.freq, ld_mg: entry.ld_mg ?? null, note };
}

// Helper：顯示劑量 + 院內品項對應
function formatPO(mg: number): string {
  if (mg === 750) return "750 mg PO（平福樂欣 750 mg × 1 顆）";
  if (mg === 500) return "500 mg PO（Cravit 500 mg × 1 顆）";
  if (mg === 250) return "250 mg PO（Cravit 500 mg × 半顆）";
  if (mg === 1000) return "1000 mg PO（Cravit 500 mg × 2 顆 或 平福樂欣 750 mg + Cravit 500 mg 半顆）";
  return `${mg} mg PO`;
}

function formatIV(mg: number): string {
  const bots = mg / 250;
  if (bots === 1) return "250 mg IV（1 Bot）";
  if (bots === 2) return "500 mg IV（2 Bot）";
  if (bots === 3) return "750 mg IV（3 Bot）";
  return `${mg} mg IV（${bots} Bot）`;
}

export const levofloxacin: Drug = {
  name: "Cravit",
  subtitle: "Levofloxacin",
  searchTerms: [
    "levofloxacin", "cravit", "可樂必妥", "平福樂欣",
    "fluoroquinolone", "FQ",
  ],

  needsRenal: true,
  needsWeight: true,
  needsHepatic: false, // CTP A-C 不需調整

  indications: [

    // ═══ 1. Anthrax ═══
    {
      id: "anthrax",
      label: "Anthrax（炭疽）",
      desc: "暴露後預防 / 皮膚 / 全身性",
      scenarios: [
        {
          label: "Inhalational, postexposure prophylaxis（吸入性炭疽，暴露後預防）",
          note: "未接種疫苗者 42-60 天；免疫低下/未接種可延長至 3-4 個月。需同時給予炭疽疫苗",
          baseDose: "500_qd",
          doseDisplay: "500 mg QD PO",
        },
        {
          label: "Cutaneous, without meningitis（皮膚炭疽，無腦膜炎）",
          note: "自然感染 7-10 天。氣溶膠暴露後轉暴露後預防，合計 42-60 天",
          baseDose: "750_qd",
          doseDisplay: "750 mg QD PO",
        },
        {
          label: "Systemic, including meningitis（全身性炭疽，含腦膜炎）",
          note: "合併其他藥物 ≥2 週 IV；腦膜炎 ≥3 週。反應良好可轉口服。需加 antitoxin",
          baseDose: "500_qd",
          doseDisplay: "500 mg Q12H IV",
        },
      ],
    },

    // ═══ 2. Respiratory ═══
    {
      id: "respiratory",
      label: "Respiratory infection（呼吸道感染）",
      desc: "CAP、HAP/VAP、COPD 急性惡化",
      scenarios: [
        {
          label: "CAP, outpatient with comorbidities or inpatient（CAP，有共病/住院）",
          note: "部分專家保留給無法用其他首選的病人。重症或有 MRSA 風險者合併 combination。療程 ≥5 天（免疫低下/PsA 更長）。停藥前須臨床穩定",
          baseDose: "750_qd",
          doseDisplay: "750 mg QD PO/IV",
        },
        {
          label: "HAP / VAP（院內 / 呼吸器相關肺炎）",
          note: "經驗治療常合併 combination regimen。通常 7 天",
          baseDose: "750_qd",
          doseDisplay: "750 mg QD PO/IV",
        },
        {
          label: "COPD acute exacerbation（COPD 急性惡化）",
          note: "部分專家保留給有風險因子（≥65 歲、FEV1 <50%、頻繁惡化、顯著共病）的門診或住院病人。5-7 天。懷疑 PsA 用 750 mg",
          baseDose: "500_qd",
          doseDisplay: "500 mg QD PO/IV（懷疑 PsA 用 750 mg）",
        },
      ],
    },

    // ═══ 3. Diarrhea, infectious ═══
    {
      id: "diarrhea",
      label: "Diarrhea, infectious（感染性腹瀉）",
      desc: "Campylobacter / Salmonella / Shigella",
      scenarios: [
        {
          label: "Campylobacter, HIV（彎曲桿菌，HIV）",
          note: "替代藥物。FQ 抗藥增加中，建議確認藥敏。7-10 天（輕中度）；復發可延長 2-6 週",
          baseDose: "750_qd",
          doseDisplay: "750 mg QD PO/IV",
        },
        {
          label: "Campylobacter, non-HIV（彎曲桿菌，非 HIV）",
          note: "替代藥物。500 mg 單劑或 500 mg QD × 3 天。24hr 內未改善者續用 2 天。部分專家偏好 750 mg QD × 3 天",
          baseDose: "500_qd",
          doseDisplay: "500 mg 單劑 或 500 mg QD × 3 天",
        },
        {
          label: "Salmonella, nontyphoidal severe（非傷寒沙門氏菌，重度）",
          note: "HIV CD4 ≥200：7-14 天；CD4 <200：2-6 週",
          baseDose: "750_qd",
          doseDisplay: "750 mg QD PO/IV",
        },
        {
          label: "Salmonella, nontyphoidal BSI（非傷寒沙門氏菌，菌血症）",
          note: "免疫正常 10-14 天；HIV CD4 ≥200：14 天；免疫抑制者需更長",
          baseDose: "750_qd",
          doseDisplay: "500-750 mg QD PO/IV",
        },
        {
          label: "Shigella（志賀菌症）",
          note: "僅 MIC <0.12 時可用。3 天；HIV 延長 5-10 天；菌血症 ≥14 天",
          baseDose: "750_qd",
          doseDisplay: "500-750 mg QD PO/IV",
        },
      ],
    },

    // ═══ 4. IAI ═══
    {
      id: "iai",
      label: "Intra-abdominal infection（腹內感染）",
      desc: "膽囊炎、闌尾炎、憩室炎等",
      scenarios: [
        {
          label: "Acute cholecystitis（急性膽囊炎）",
          note: "術後持續 1 天或非手術到臨床緩解。有膽道腸道吻合者加 metronidazole",
          baseDose: "750_qd",
          doseDisplay: "750 mg QD PO/IV",
        },
        {
          label: "Other IAI（闌尾炎、憩室炎、IAA 等）",
          note: "合併 metronidazole。源頭控制後 4-5 天。憩室炎/單純闌尾炎 4-14 天",
          baseDose: "750_qd",
          doseDisplay: "750 mg QD + metronidazole",
        },
      ],
    },

    // ═══ 5. Bone & Joint ═══
    {
      id: "bone_joint",
      label: "Bone & Joint infection（骨關節感染）",
      desc: "骨髓炎、PJI",
      scenarios: [
        {
          label: "Osteomyelitis（骨髓炎）",
          note: "療程 ≥6 週",
          baseDose: "750_qd",
          doseDisplay: "750 mg QD PO/IV",
        },
        {
          label: "Prosthetic joint infection, GNB（人工關節感染，GNB 導向）",
          note: "治療階段 750 mg QD",
          baseDose: "750_qd",
          doseDisplay: "750 mg QD PO/IV",
        },
        {
          label: "PJI, S. aureus oral step-down（PJI MSSA 口服降階 + rifampin）",
          note: "合併 rifampin。總療程 ≥3 個月（含初始 IV）",
          baseDose: "750_qd",
          doseDisplay: "500-750 mg QD PO + rifampin",
        },
        {
          label: "PJI, chronic suppression GNB（PJI 慢性抑制）",
          note: "長期口服",
          baseDose: "500_qd",
          doseDisplay: "500 mg QD PO",
        },
      ],
    },

    // ═══ 6. Pneumonia / Prostatitis / Rhinosinusitis ═══
    {
      id: "other_infections",
      label: "Other infections（前列腺炎 / 鼻竇炎 / 齒源性 / STI）",
      desc: "多種適應症",
      scenarios: [
        {
          label: "Acute bacterial prostatitis（急性細菌性前列腺炎）",
          note: "療程 2-4 週",
          baseDose: "750_qd",
          doseDisplay: "500-750 mg QD PO/IV",
        },
        {
          label: "Chronic bacterial prostatitis（慢性細菌性前列腺炎）",
          note: "療程 4-6 週",
          baseDose: "750_qd",
          doseDisplay: "500-750 mg QD PO/IV",
        },
        {
          label: "Acute bacterial rhinosinusitis（急性細菌性鼻竇炎）",
          note: "替代藥物。大部分病人先觀察 + 症狀治療即可。FQ 有安全疑慮，保留給無其他選擇者。5-7 天",
          baseDose: "750_qd",
          doseDisplay: "500-750 mg QD PO",
        },
        {
          label: "Odontogenic infection（齒源性感染）",
          note: "替代藥物（無法用 β-lactam）。合併 metronidazole。7-14 天。合併外科處理",
          baseDose: "750_qd",
          doseDisplay: "750 mg QD PO/IV + metronidazole",
        },
        {
          label: "Chlamydia cervicitis/urethritis（披衣菌感染）",
          note: "替代藥物。7 天",
          baseDose: "500_qd",
          doseDisplay: "500 mg QD PO",
        },
        {
          label: "Epididymitis（附睪炎）",
          note: "低 STD 風險者 500 mg QD × 10 天。insertive anal sex 者合併 ceftriaxone",
          baseDose: "500_qd",
          doseDisplay: "500 mg QD PO",
        },
        {
          label: "PID, outpatient mild-moderate（骨盆腔炎，門診輕中度）",
          note: "替代藥物。低 FQ-resistant 淋菌風險者才用。合併 metronidazole × 14 天",
          baseDose: "500_qd",
          doseDisplay: "500 mg QD PO + metronidazole",
        },
      ],
    },

    // ═══ 7. SSTI / Diabetic foot ═══
    {
      id: "ssti",
      label: "SSTI / Diabetic foot（皮膚軟組織 / 糖尿病足）",
      desc: "蜂窩組織炎、手術傷口、糖尿病足",
      scenarios: [
        {
          label: "Cellulitis or abscess（蜂窩組織炎 / 膿瘍）",
          note: "替代藥物。保留給 severe sepsis 且無法用 β-lactam 者。合併其他藥物。5-14 天",
          baseDose: "750_qd",
          doseDisplay: "750 mg QD PO/IV",
        },
        {
          label: "Surgical site infection（手術傷口感染）",
          note: "腸道/泌尿生殖道/會陰/腋窩手術。合併 metronidazole",
          baseDose: "750_qd",
          doseDisplay: "750 mg QD IV/PO + metronidazole",
        },
        {
          label: "Diabetic foot infection（糖尿病足感染）",
          note: "輕度（無法用 β-lactam 或近期有抗生素暴露）或中重度。PsA 疑慮用 750 mg。1-2 週（輕度）；2-4 週（中重度，無骨髓炎）",
          baseDose: "500_qd",
          doseDisplay: "PO 500 mg QD（PsA 疑慮 750 mg）/ IV 750 mg QD",
        },
      ],
    },

    // ═══ 8. UTI ═══
    {
      id: "uti",
      label: "Urinary tract infection（泌尿道感染）",
      desc: "單純膀胱炎 / 複雜性 UTI",
      scenarios: [
        {
          label: "Acute uncomplicated cystitis（單純膀胱炎）",
          note: "⚠️ 不鼓勵使用（安全疑慮 + 抗藥性增加），保留給無其他選擇者。男性嚴重症狀或疑慮早期前列腺受累用 750 mg。女性 3 天 / 男性 5 天",
          baseDose: "250_qd",
          doseDisplay: "250 mg QD PO（抗藥菌/男性嚴重 → 750 mg QD）",
        },
        {
          label: "Complicated UTI / Pyelonephritis（複雜性 UTI / 腎盂腎炎）",
          note: "保留給過去 3-12 月無 FQ 暴露且無 FQ 抗藥史者。ESBL/AmpC 用 750 mg。48 小時內改善者 5 天",
          baseDose: "750_qd",
          doseDisplay: "500-750 mg QD PO/IV",
        },
      ],
    },

    // ═══ 9. Neutropenia prophylaxis ═══
    {
      id: "neutro_prophy",
      label: "Neutropenia prophylaxis（中性球低下預防）",
      desc: "ANC ≤100 預計 >7 天的高風險病人",
      scenarios: [
        {
          label: "Antibacterial prophylaxis（抗菌預防）",
          note: "部分醫師在 ANC <500 >7 天時即開始。HCT 受者在幹細胞輸注時開始，至中性球恢復或開始經驗性治療",
          baseDose: "750_qd",
          doseDisplay: "500-750 mg QD PO",
        },
      ],
    },

    // ═══ 10. H. pylori ═══
    {
      id: "hpylori",
      label: "H. pylori eradication（幽門桿菌，搶救方案）",
      desc: "Levofloxacin triple regimen · 14 天",
      scenarios: [
        {
          label: "Levofloxacin triple（搶救方案）",
          note: "僅用於有文獻藥敏結果之 levofloxacin 敏感菌株的搶救治療。合併 amoxicillin（penicillin 過敏者用 metronidazole）+ PPI × 14 天。完成後 >4 週做 test of cure",
          baseDose: "500_qd",
          doseDisplay: "500 mg QD PO",
        },
      ],
    },

    // ═══ 11. Special pathogens ═══
    {
      id: "special",
      label: "Special pathogens（特殊病原）",
      desc: "MAC / Plague / Tularemia / TB / S. maltophilia",
      scenarios: [
        {
          label: "MAC disseminated, HIV（播散性 MAC，HIV）",
          note: "輔助藥物。合併 combination regimen。保留給嚴重疾病、高死亡風險、抗藥風險、CD4 <50 者",
          baseDose: "500_qd",
          doseDisplay: "500 mg QD PO",
        },
        {
          label: "Plague, treatment（鼠疫，治療）",
          note: "7-14 天。腦膜炎合併 combination regimen",
          baseDose: "750_qd",
          doseDisplay: "750 mg QD PO/IV",
        },
        {
          label: "Plague, postexposure prophylaxis（鼠疫，暴露後預防）",
          note: "7 天。孕婦用 750 mg",
          baseDose: "500_qd",
          doseDisplay: "500-750 mg QD PO",
        },
        {
          label: "Tularemia, treatment（兔熱病，治療）",
          note: "10 天。嚴重感染考慮起初合併 aminoglycoside。神經侵入性需更長療程",
          baseDose: "750_qd",
          doseDisplay: "750 mg QD PO/IV",
        },
        {
          label: "Tularemia, postexposure prophylaxis（兔熱病，暴露後預防）",
          note: "7 天",
          baseDose: "500_qd",
          doseDisplay: "500 mg QD PO",
        },
        {
          label: "TB, drug-resistant, active disease（抗藥結核，活動性）",
          note: "合併其他抗結核藥。療程依培養轉陰速度、疾病範圍、臨床反應個別化",
          baseDose: "750_qd",
          doseDisplay: "750 mg-1 g QD PO/IV",
          renalNote_tb: "TB 腎調特殊：CrCl >30 不調；CrCl <30 或 HD/PD：750 mg 或 1 g 每週三次（HD 在透析後給）",
        },
        {
          label: "TB, latent infection（潛伏結核）",
          note: "替代藥物。MDR-TB 家庭接觸者或無法用 rifamycin 者。<50 kg：500 mg QD；≥50 kg：750 mg QD × 6 個月",
          baseDose: "750_qd",
          doseDisplay: "<50 kg: 500 mg QD / ≥50 kg: 750 mg QD × 6 個月",
        },
        {
          label: "S. maltophilia, MDR（多重抗藥嗜麥芽假單胞菌）",
          note: "合併 combination regimen",
          baseDose: "750_qd",
          doseDisplay: "750 mg QD PO/IV",
        },
      ],
    },

    // ═══ 12. Surgical prophylaxis ═══
    {
      id: "surgical_prophy",
      label: "Surgical prophylaxis（手術預防）",
      desc: "替代藥物，術前 120 分鐘內",
      scenarios: [
        {
          label: "Surgical prophylaxis（手術預防）",
          note: "替代藥物。術前 120 分鐘內。Clean/clean-contaminated 不需術後再給。可能需合併其他藥物",
          baseDose: "500_qd",
          doseDisplay: "500 mg IV 單劑",
        },
      ],
    },

  ], // ← end of indications

  // ──────────────────────────────────────────────────────────────
  // calculate()
  // ──────────────────────────────────────────────────────────────
  calculate({ crcl, rrt, indicationData }) {
    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const baseKey: string = sc.baseDose ?? "500_qd";
      const d = getLevoDose(crcl, rrt, baseKey);
      const warnings: string[] = [];

      // ARC
      const isARC = rrt === "none" && crcl >= 130;
      if (isARC) {
        warnings.push("⚡ ARC（CrCl ≥130）：建議 LD 750 mg → 500 mg Q12H 或 1 g QD（Monte Carlo simulation + 專家意見）");
      }

      // TB 特殊腎調
      if (sc.renalNote_tb && (rrt !== "none" || crcl < 30)) {
        warnings.push(`🫁 ${sc.renalNote_tb}`);
      }

      // FQ Black Box Warning
      warnings.push("⚠️ FDA Black Box Warning：肌腱斷裂（特別是 >60 歲、合併 steroid、器官移植）、周邊神經病變、CNS 效應。用前評估風險效益");

      // PIRRT
      if (rrt === "cvvh") {
        warnings.push("📌 PIRRT 劑量：500 mg → LD 500 mg → 250 mg QD（PIRRT 後給）；750 mg → 750 mg Q48H（PIRRT 後給）");
      }

      // 建立 rows
      const rows: any[] = [
        { label: "原始建議劑量", value: sc.doseDisplay, highlight: true },
      ];

      // 腎調後劑量
      let adjustedStr = `${d.dose_mg} mg ${d.freq}`;
      if (d.ld_mg) adjustedStr = `LD ${d.ld_mg} mg → 維持 ${d.dose_mg} mg ${d.freq}`;
      rows.push({ label: "腎調後劑量", value: adjustedStr, highlight: true });

      // 院內品項對應
      rows.push({
        label: "每次取藥（PO）",
        value: formatPO(d.dose_mg),
      });
      rows.push({
        label: "每次取藥（IV）",
        value: formatIV(d.dose_mg),
      });

      rows.push({ label: "腎功能調整", value: d.note });

      // ARC 建議
      if (isARC) {
        rows.push({
          label: "⚡ ARC 建議劑量",
          value: "LD 750 mg → 500 mg Q12H 或 1 g QD",
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
          "• Respiratory fluoroquinolone（涵蓋 S. pneumoniae、atypicals）\n" +
          "• QD 給藥（方便性佳，PO 生體可用率 ≈99%，PO = IV）\n" +
          "• 抗菌譜比 ciprofloxacin 多涵蓋 Streptococcus pneumoniae 和 atypical pathogens\n" +
          "• 抗 Pseudomonas 活性比 ciprofloxacin 弱",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• S. pneumoniae（含 penicillin-resistant）\n" +
          "• Atypical pathogens（Legionella、Mycoplasma、Chlamydophila）\n" +
          "• Enterobacterales\n" +
          "• H. influenzae、M. catarrhalis\n" +
          "• MSSA（替代）\n" +
          "• P. aeruginosa（中等活性，不如 ciprofloxacin）\n\n" +
          "【不涵蓋】\n" +
          "• MRSA\n" +
          "• Anaerobes（需合併 metronidazole）\n" +
          "• ESBL（部分有效但不首選）",
      },
      {
        heading: "Levofloxacin vs Ciprofloxacin 比較",
        body:
          "• Levofloxacin：QD 給藥、涵蓋 S. pneumoniae + atypicals → 適合 CAP\n" +
          "• Ciprofloxacin：BID 給藥、抗 PsA 更強 → 適合 PsA 感染\n" +
          "• 兩者都涵蓋 Enterobacterales\n" +
          "• 兩者都不涵蓋 MRSA 和 anaerobes",
      },
      {
        heading: "腎功能調整速查表",
        body:
          "⚠️ 依「原始建議劑量」分 3 欄調整！\n\n" +
          "【250 mg QD】\n" +
          "  CrCl ≥50: 不調 → 20-49: 不調 → <20: 250 mg Q48H\n\n" +
          "【500 mg QD】\n" +
          "  CrCl ≥50: 不調 → 20-49: LD 500 → 250 QD → <20: LD 500 → 250 Q48H\n\n" +
          "【750 mg QD】\n" +
          "  CrCl ≥50: 不調 → 20-49: 750 Q48H → <20: LD 750 → 500 Q48H\n\n" +
          "ARC (≥130): LD 750 → 500 Q12H 或 1g QD\n" +
          "HD: 僅移除 ~21%，同 CrCl <20，透析後給\n" +
          "PD: 同 CrCl <20\n" +
          "CRRT: 250 mg → 不調；500 mg → LD 500 → 250 QD；750 mg → LD 750 → 500 QD\n" +
          "PIRRT: 500 mg → LD 500 → 250 QD；750 mg → 750 Q48H\n\n" +
          "TB 特殊：CrCl <30 或 HD/PD → 750 mg 或 1 g 每週三次",
      },
      {
        heading: "FDA Black Box Warning",
        body:
          "⚠️ 所有 fluoroquinolone 共通的嚴重副作用：\n" +
          "• 肌腱炎與肌腱斷裂（特別是 >60 歲、合併 corticosteroid、器官移植者）\n" +
          "• 周邊神經病變（可能不可逆）\n" +
          "• CNS 效應（癲癇、頭暈、混亂、精神症狀）\n" +
          "• 主動脈瘤/主動脈剝離風險增加\n" +
          "• 低血糖（合併降血糖藥物時）\n\n" +
          "→ 對於有替代治療的適應症（如單純 UTI、急性鼻竇炎、COPD 惡化），應優先使用其他藥物",
      },
      {
        heading: "肝功能 / 肥胖",
        body:
          "• 肝功能：CTP A-C 不需調整\n" +
          "• 肥胖：BMI ≥30 不需調整（CrCl 是最重要的劑量決定因素）。BMI ≥40 + CrCl >110：考慮 TDM 或替代藥物",
      },
      {
        heading: "院內品項",
        body:
          "• PO：Cravit 錠劑 500 mg（可樂必妥膜衣錠）\n" +
          "• PO：平福樂欣膜衣錠 750 mg\n" +
          "• IV：Cravit 針 250 mg / 50 mL / Bot（5 mg/mL，可樂必妥靜脈輸液）",
      },
    ],
  },
};
