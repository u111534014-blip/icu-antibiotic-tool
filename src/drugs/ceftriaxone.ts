import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Ceftriaxone（Rocephin / 舒復）
// ═══════════════════════════════════════════════════════════════
// 院內品項：Cefin 針 三代（舒復靜脈注射劑）2 g/Vial
//
// 劑量特性：
//   - 幾乎都是固定劑量（1 g 或 2 g），不需體重計算
//   - 腎功能「大部分」不需調整（主要由膽汁排除）
//   - 但 ARC（CrCl ≥150）需要 2 g Q12H（ICU 常見！）
//   - CrCl <15 + 合併肝功能不全：>2 g/day 未被研究
//
// 肝功能：Child-Pugh A–C 不需調整
// ═══════════════════════════════════════════════════════════════

const MG_PER_VIAL = 2000; // 2 g/Vial

// Helper：計算支數（最接近半支）
function toHalfVials(mg: number): string {
  const raw = mg / MG_PER_VIAL;
  const half = Math.round(raw * 2) / 2;
  if (half === 0.5) return "0.5 支（半支）";
  if (half % 1 === 0) return `${half} 支`;
  return `${half} 支`;
}

export const ceftriaxone: Drug = {
  name: "Rocephin",
  subtitle: "Ceftriaxone",
  searchTerms: [
    "rocephin", "ceftriaxone", "cefin", "舒復", "羅氏芬"
  ],

  needsRenal: true,   // 因為 ARC 判斷需要 CrCl
  needsWeight: true,  // needsRenal=true 則需 weight
  needsHepatic: false, // CTP A–C 不需調整

  // ──────────────────────────────────────────────────────────────
  // 適應症（16 大項）
  // ──────────────────────────────────────────────────────────────
  indications: [

    // ═══ 1. Actinomycosis ═══
    {
      id: "actinomycosis",
      label: "Actinomycosis（放線菌症）",
      desc: "替代療法，1–2 g QD × 2–6 週後轉口服",
      scenarios: [
        {
          label: "Actinomycosis, severe（嚴重放線菌症）",
          note: "IV 2–6 週後轉口服長期治療",
          dose: "1–2 g",
          freq: "QD",
          duration: "2–6 週（後續長期口服）",
        },
      ],
    },

    // ═══ 2. Bite wound ═══
    {
      id: "bite",
      label: "Bite wound infection（咬傷感染）",
      desc: "2 g QD 或 1 g Q12H + 合併厭氧菌藥物",
      scenarios: [
        {
          label: "Bite wound infection（動物/人咬傷感染）",
          note: "合併適當厭氧菌覆蓋（如 metronidazole）。療程 5–14 天（可含口服降階）",
          dose: "2 g QD 或 1 g Q12H",
          freq: "QD 或 Q12H",
          duration: "5–14 天",
        },
      ],
    },

    // ═══ 3. Bloodstream infection ═══
    {
      id: "bsi",
      label: "Bloodstream infection（菌血症）",
      desc: "1–2 g QD · 7–14 天",
      scenarios: [
        {
          label: "Bloodstream infection（菌血症）",
          note: "部分專家偏好 2 g QD。單純 Enterobacteriaceae + 源頭控制佳 + 反應良好者可用 7 天。其他依感染源與範圍 7–14 天",
          dose: "1–2 g",
          freq: "QD",
          duration: "7–14 天",
        },
      ],
    },

    // ═══ 4. COPD acute exacerbation ═══
    {
      id: "copd",
      label: "COPD acute exacerbation（COPD 急性惡化）",
      desc: "1 g QD · 5–7 天",
      scenarios: [
        {
          label: "COPD acute exacerbation（住院，無 Pseudomonas 風險）",
          note: "臨床改善後可轉口服。療程 5–7 天",
          dose: "1 g",
          freq: "QD",
          duration: "5–7 天",
        },
      ],
    },

    // ═══ 5. Diabetic foot ═══
    {
      id: "diabeticFoot",
      label: "Diabetic foot infection（糖尿病足感染）",
      desc: "1–2 g QD + 合併用藥 · 2–4 週",
      scenarios: [
        {
          label: "Diabetic foot infection, moderate-severe（糖尿病足，中度-重度）",
          note: "合併其他適當抗生素。無骨髓炎時 2–4 週（可含口服降階）。有 Pseudomonas 風險（浸潤性潰瘍、溫暖環境）者不要用 ceftriaxone 經驗治療",
          dose: "1–2 g",
          freq: "QD",
          duration: "2–4 週",
        },
      ],
    },

    // ═══ 6. Diarrhea, infectious ═══
    {
      id: "diarrhea",
      label: "Diarrhea, infectious（感染性腹瀉）",
      desc: "Salmonella / Shigella",
      scenarios: [
        {
          label: "Typhoid fever（傷寒，Salmonella typhi/paratyphi）",
          note: "嚴重疾病經驗治療或 fluoroquinolone 抗藥導向治療。Extensively drug-resistant Salmonella 風險區不建議用。可依藥敏改口服",
          dose: "2 g",
          freq: "Q12–24H",
          duration: "10–14 天",
        },
        {
          label: "Nontyphoidal Salmonella, severe nonbacteremic（非傷寒沙門氏菌，重度非菌血症）",
          note: "保留給重症或高風險侵入性疾病（高齡、免疫低下）。HIV CD4 ≥200：7–14 天；CD4 <200：2–6 週",
          dose: "1–2 g",
          freq: "QD",
          duration: "3–14 天（HIV 視 CD4）",
        },
        {
          label: "Nontyphoidal Salmonella, BSI（非傷寒沙門氏菌，菌血症）",
          note: "免疫正常 10–14 天；HIV CD4 ≥200：14 天；免疫抑制或有腸外感染焦點者需更長（數週至數月）",
          dose: "1–2 g",
          freq: "QD",
          duration: "10–14 天（免疫抑制更長）",
        },
        {
          label: "Shigellosis, HIV（志賀菌症，HIV 病人）",
          note: "菌血症 ≥14 天；復發（特別 CD4 <200）可延長至 6 週",
          dose: "1–2 g",
          freq: "QD",
          duration: "5–10 天（菌血症 ≥14 天）",
        },
        {
          label: "Shigellosis, non-HIV（志賀菌症，非 HIV）",
          note: "S. dysenteriae type 1：延長至 5–7 天；菌血症 14 天",
          dose: "1–2 g",
          freq: "QD",
          duration: "5 天（特殊情況更長）",
        },
      ],
    },

    // ═══ 7. Endocarditis ═══
    {
      id: "endocarditis",
      label: "Endocarditis（心內膜炎）",
      desc: "預防與治療",
      scenarios: [
        {
          label: "Prophylaxis（預防，牙科/呼吸道侵入性手術）",
          note: "限非嚴重、non-IgE 型 penicillin 過敏且無法口服者。術前 30–60 分鐘；遲到可在術後 2 小時內補給。限最高風險心臟疾病 + 可能造成相關菌血症的手術",
          dose: "1 g",
          freq: "單劑",
          duration: "單劑",
          route: "IM 或 IV",
        },
        {
          label: "E. faecalis, native/prosthetic valve（腸球菌，penicillin 敏感）",
          note: "建議用於有腎功能不全風險或 aminoglycoside 抗藥者。合併 ampicillin",
          dose: "2 g",
          freq: "Q12H",
          duration: "6 週（合併 ampicillin）",
        },
        {
          label: "HACEK organisms, native/prosthetic valve",
          note: "HACEK = Haemophilus spp.、Aggregatibacter、Cardiobacterium、Eikenella、Kingella（口腔/上呼吸道慢生長 GNB，佔 culture-negative endocarditis 5–10%）。Native valve 4 週；prosthetic valve 6 週",
          dose: "2 g",
          freq: "QD",
          duration: "4–6 週",
          route: "IV 或 IM",
        },
        {
          label: "Viridans group streptococci (VGS) / Streptococcus gallolyticus, native valve（高度 penicillin 敏感 MIC ≤0.12）",
          note: "2 g QD × 4 週 單獨用；或 2 g QD + gentamicin × 2 週（限單純感染、快速反應、無聽力問題者）",
          dose: "2 g",
          freq: "QD",
          duration: "4 週（或合併 gentamicin 2 週短療程）",
        },
        {
          label: "Viridans group streptococci (VGS) / Streptococcus gallolyticus, native valve（relatively/fully penicillin-resistant）",
          note: "MIC >0.12 且 ceftriaxone 敏感。合併 gentamicin 前 2 週",
          dose: "2 g",
          freq: "QD",
          duration: "4 週（+ gentamicin 前 2 週）",
        },
        {
          label: "Viridans group streptococci (VGS) / Streptococcus gallolyticus, prosthetic valve（高度 penicillin 敏感）",
          note: "可加或不加 gentamicin 前 2 週",
          dose: "2 g",
          freq: "QD",
          duration: "6 週",
        },
        {
          label: "Viridans group streptococci (VGS) / Streptococcus gallolyticus, prosthetic valve（relatively/fully penicillin-resistant）",
          note: "合併 gentamicin；6 週全程或前 2 週",
          dose: "2 g",
          freq: "QD",
          duration: "6 週（+ gentamicin）",
        },
      ],
    },

    // ═══ 8. Intra-abdominal infection ═══
    {
      id: "iai",
      label: "Intra-abdominal infection（腹內感染）",
      desc: "膽囊炎、闌尾炎、憩室炎等",
      scenarios: [
        {
          label: "Acute cholecystitis（急性膽囊炎）",
          note: "手術切除後持續 1 天或非手術到臨床緩解。有膽道腸道吻合者加 metronidazole",
          dose: "1–2 g",
          freq: "QD",
          duration: "術後 1 天或臨床緩解",
        },
        {
          label: "Other IAI（闌尾炎、憩室炎、IAA 等）",
          note: "合併 metronidazole。源頭控制後 4–5 天（可含口服降階）；憩室炎/單純闌尾炎無介入 4–14 天；穿孔闌尾 + 腹腔鏡 2–4 天可能足夠",
          dose: "1–2 g",
          freq: "QD",
          duration: "4–5 天（+ metronidazole）",
        },
      ],
    },

    // ═══ 9. CNS infection ═══
    {
      id: "cns",
      label: "CNS infection（中樞神經感染）",
      desc: "細菌性腦膜炎、腦膿瘍、neurobrucellosis、nocardiosis",
      scenarios: [
        {
          label: "Bacterial meningitis（細菌性腦膜炎）",
          note: "經驗治療合併其他藥物。覆蓋 S. pneumoniae（MIC <1）、N. meningitidis、H. influenzae、C. acnes、敏感 GNB。療程依病原 7–21 天",
          dose: "2 g",
          freq: "Q12H",
          duration: "7–21 天",
        },
        {
          label: "Brain abscess / Spinal epidural abscess（腦膿瘍 / 脊髓硬膜外膿瘍）",
          note: "經驗治療合併其他藥物。術後或有 PsA 風險者不建議。脊髓 4–8 週；腦膿瘍 6–8 週",
          dose: "2 g",
          freq: "Q12H",
          duration: "4–8 週",
        },
        {
          label: "Neurobrucellosis（神經布氏桿菌症）",
          note: "合併適當 combination regimen",
          dose: "2 g",
          freq: "Q12H",
          duration: "4–6 週",
        },
        {
          label: "Nocardiosis, severe（嚴重 nocardiosis）",
          note: "替代藥物，需做藥敏。合併 combination regimen。療程長（6 個月–≥1 年，至少數週 IV 後轉口服）。建議會診感染科",
          dose: "2 g",
          freq: "Q12H",
          duration: "6 個月–≥1 年",
        },
        {
          label: "Meningococcal chemoprophylaxis（腦膜炎雙球菌預防）",
          note: "密切接觸者（≥8 小時近距離 <3 呎或直接接觸口腔分泌物）。盡快給予（理想 <24 小時）",
          dose: "250 mg",
          freq: "單劑",
          duration: "單劑",
          route: "IM",
        },
      ],
    },

    // ═══ 10. Lyme disease ═══
    {
      id: "lyme",
      label: "Lyme disease（萊姆病）",
      desc: "心臟炎、神經、晚期、復發性關節炎",
      scenarios: [
        {
          label: "Carditis, severe（嚴重心臟炎）",
          note: "有症狀、2度/3度 AV block、或 1度 PR ≥300 ms。高度 AV block 恢復 + PR <300 ms 後可轉口服，總療程 14–21 天",
          dose: "2 g",
          freq: "QD",
          duration: "14–21 天（含口服）",
        },
        {
          label: "Acute neurologic disease（急性神經疾病，需住院）",
          note: "腦膜炎或神經根病變",
          dose: "2 g",
          freq: "QD",
          duration: "14–21 天",
        },
        {
          label: "Late neurologic disease（晚期神經疾病）",
          note: "部分專家偏好 28 天",
          dose: "2 g",
          freq: "QD",
          duration: "14–28 天",
        },
        {
          label: "Recurrent arthritis after oral regimen（口服後復發性關節炎）",
          note: "若炎症持續可延長至 28 天",
          dose: "2 g",
          freq: "QD",
          duration: "14–28 天",
        },
      ],
    },

    // ═══ 11. Musculoskeletal ═══
    {
      id: "msk",
      label: "Musculoskeletal infection（骨關節感染）",
      desc: "骨髓炎、開放性骨折預防、PJI、化膿性關節炎",
      scenarios: [
        {
          label: "Osteomyelitis / Discitis treatment（骨髓炎治療）",
          note: "經驗或導向治療（Streptococci、C. acnes、敏感 GNB）。通常 6 週，可部分轉口服。截肢完全切除者可短",
          dose: "2 g",
          freq: "QD",
          duration: "通常 6 週",
        },
        {
          label: "Open fracture prophylaxis, type III（開放性骨折預防，第三型）",
          note: "合併 combination regimen。理想 6 小時內給。72 小時或傷口閉合後 24 小時。MRSA 風險、水暴露、糞便/梭菌汙染需另加藥",
          dose: "2 g",
          freq: "QD",
          duration: "72 小時",
        },
        {
          label: "Prosthetic joint infection（人工關節感染）",
          note: "經驗或導向治療",
          dose: "2 g",
          freq: "QD",
          duration: "4–6 週",
        },
        {
          label: "Septic arthritis（化膿性關節炎）",
          note: "導向治療（GNB）或經驗治療（外傷性，無 PsA 風險）。合併 combination regimen。總療程 3–4 週（無骨髓炎），含口服降階",
          dose: "2 g",
          freq: "QD",
          duration: "3–4 週",
        },
      ],
    },

    // ═══ 12. Pneumonia / Respiratory ═══
    {
      id: "pneumonia",
      label: "Pneumonia / Respiratory（肺炎 / 呼吸道感染）",
      desc: "CAP、急性中耳炎",
      scenarios: [
        {
          label: "Community-acquired pneumonia（CAP，住院，無 PsA 風險）",
          note: "合併適當藥物。血行穩定者 1 g QD 即足夠；重症部分專家用 2 g。總療程 ≥5 天（含口服降階），停藥前需臨床穩定",
          dose: "1–2 g",
          freq: "QD",
          duration: "≥5 天",
        },
        {
          label: "Acute otitis media（急性中耳炎）",
          note: "替代藥物（非嚴重 non-IgE 型 penicillin 過敏）",
          dose: "1–2 g",
          freq: "QD",
          duration: "3 天",
          route: "IM 或 IV",
        },
      ],
    },

    // ═══ 13. STI ═══
    {
      id: "sti",
      label: "Sexually transmitted infections（性傳染病）",
      desc: "淋病、軟性下疳、梅毒、PID、附睪炎等",
      scenarios: [
        {
          label: "Chancroid（軟性下疳）",
          note: "HIV 病人療效數據有限",
          dose: "250 mg",
          freq: "單劑",
          duration: "單劑",
          route: "IM",
        },
        {
          label: "Empiric post-sexual assault（性侵後經驗治療）",
          note: "合併 combination regimen。體重 ≥150 kg 用 1 g",
          dose: "500 mg（≥150 kg 用 1 g）",
          freq: "單劑",
          duration: "單劑",
          route: "IM",
        },
        {
          label: "Epididymitis, inpatient（附睪炎，住院）",
          note: "有 STI 風險者合併 doxycycline。退燒 24 小時後轉口服，總療程 10–14 天",
          dose: "1 g",
          freq: "QD",
          duration: "10–14 天（含口服降階）",
        },
        {
          label: "Epididymitis, outpatient（附睪炎，門診）",
          note: "合併 doxycycline。insertive anal sex 者改用 levofloxacin。≥150 kg 用 1 g",
          dose: "500 mg（≥150 kg 用 1 g）",
          freq: "單劑",
          duration: "單劑",
          route: "IM",
        },
        {
          label: "Gonococcal - Uncomplicated（淋病，非複雜）",
          note: "子宮頸/咽/直腸/尿道。≥150 kg 用 1 g。合併 chlamydia 治療（若未排除）。咽部淋病建議 7–14 天後 test-of-cure",
          dose: "500 mg（≥150 kg 用 1 g）",
          freq: "單劑",
          duration: "單劑",
          route: "IM",
        },
        {
          label: "Gonococcal - Conjunctivitis（淋菌性結膜炎）",
          note: "合併 chlamydia 治療（若未排除）",
          dose: "1 g",
          freq: "單劑",
          duration: "單劑",
          route: "IM",
        },
        {
          label: "Gonococcal - Disseminated（散播性淋菌感染）",
          note: "tenosynovitis/dermatitis/polyarthralgia：改善後可轉 IM 500 mg（≥150 kg 用 1 g）QD 完成 ≥7 天。Purulent arthritis 常需 ≥7–14 天 IV",
          dose: "1 g",
          freq: "QD",
          duration: "≥7–14 天",
          route: "IV（首選）或 IM",
        },
        {
          label: "PID, mild-moderate（骨盆腔炎，輕中度）",
          note: "合併 doxycycline + metronidazole。≥150 kg 用 1 g",
          dose: "500 mg（≥150 kg 用 1 g）",
          freq: "單劑",
          duration: "單劑",
          route: "IM",
        },
        {
          label: "PID, severe（骨盆腔炎，重度，含 TOA）",
          note: "合併 doxycycline + metronidazole。部分專家用 2 g QD。持續改善 24–48 小時後轉口服完成 14 天",
          dose: "1 g（部分專家 2 g）",
          freq: "QD",
          duration: "14 天（含口服降階）",
        },
        {
          label: "Syphilis - Early（早期梅毒：初/次/早潛伏 <1 年）",
          note: "替代藥物（非嚴重 non-IgE 型 penicillin 過敏）。最佳劑量/療程未確立，建議諮詢專家",
          dose: "1 g",
          freq: "QD",
          duration: "10–14 天",
          route: "IM 或 IV",
        },
        {
          label: "Syphilis - Late（晚期梅毒：晚潛伏 >1 年 / 三期，CSF 正常）",
          note: "替代藥物，諮詢專家",
          dose: "1–2 g",
          freq: "QD",
          duration: "10–14 天",
          route: "IM 或 IV",
        },
        {
          label: "Neurosyphilis（含眼/耳梅毒）",
          note: "Penicillin 為首選；ceftriaxone 保留給無法 desensitization 者。部分專家偏好 2 g QD",
          dose: "1–2 g",
          freq: "QD",
          duration: "10–14 天",
          route: "IM 或 IV",
        },
      ],
    },

    // ═══ 14. Peritonitis / SBP ═══
    {
      id: "peritonitis_sbp",
      label: "Peritonitis / SBP（腹膜炎 / 自發性細菌性腹膜炎）",
      desc: "PD 腹膜炎、SBP 預防與治療",
      scenarios: [
        {
          label: "PD peritonitis（腹膜透析腹膜炎）",
          note: "腹腔內給藥優先（除非 sepsis）。1 g 加入透析液 QD，至少留置 6 小時。反應良好者 ≥2–3 週；5 天未改善考慮拔管 + 系統性抗生素 14 天",
          dose: "1 g",
          freq: "QD（IP 給藥）",
          duration: "≥2–3 週",
          route: "IP（腹腔內）",
        },
        {
          label: "SBP, primary prophylaxis（SBP 一級預防）",
          note: "限有 advanced cirrhosis + active GI bleeding 病人",
          dose: "1 g",
          freq: "QD",
          duration: "≤7 天",
        },
        {
          label: "SBP, treatment（SBP 治療）",
          note: "限無 sepsis 且無 MDR 風險病人。發燒與腹痛緩解後可停",
          dose: "2 g",
          freq: "QD",
          duration: "5–7 天",
        },
      ],
    },

    // ═══ 15. Skin & soft tissue / Other ═══
    {
      id: "ssti_other",
      label: "SSTI / Other infection（皮膚軟組織 / 其他感染）",
      desc: "SSTI、齒源性、鼠咬熱、TSS、Vibrio",
      scenarios: [
        {
          label: "Skin & soft tissue infection（皮膚軟組織感染）",
          note: "包含特定手術傷口感染、壞死性感染。常合併 combination regimen。壞死性：持續到不需清創 + 改善 + 退燒 ≥48 hr",
          dose: "1–2 g",
          freq: "QD",
          duration: "依感染範圍與反應",
        },
        {
          label: "Odontogenic infection（齒源性軟組織感染）",
          note: "替代藥物（無法用 penicillin 者）。合併 metronidazole。改善後轉口服，總療程 7–14 天。合併外科處理",
          dose: "2 g",
          freq: "QD",
          duration: "7–14 天（含口服降階）",
        },
        {
          label: "Rat bite fever, uncomplicated（鼠咬熱，非複雜）",
          note: "改善後可轉口服完成 14 天療程",
          dose: "1 g",
          freq: "QD",
          duration: "14 天（含口服降階）",
        },
        {
          label: "Rat bite fever, serious invasive（鼠咬熱，嚴重侵入性）",
          note: "菌血症、腦膜炎、心內膜炎等。腦膜炎改用 2 g Q12H。心內膜炎 4 週",
          dose: "2 g（腦膜炎 2 g Q12H）",
          freq: "QD",
          duration: "依感染部位（心內膜炎 4 週）",
        },
        {
          label: "Toxic shock syndrome, streptococcal（鏈球菌毒性休克症候群）",
          note: "替代藥物。合併 clindamycin。菌血症 ≥14 天",
          dose: "1–2 g",
          freq: "Q12H",
          duration: "依嚴重度（菌血症 ≥14 天）",
        },
        {
          label: "Vibrio vulnificus infection（創傷弧菌感染）",
          note: "菌血症或嚴重傷口感染。合併 combination regimen。早期治療改善預後",
          dose: "1–2 g",
          freq: "QD",
          duration: "7–14 天",
        },
        {
          label: "Surgical prophylaxis, colorectal（大腸直腸手術預防）",
          note: "替代藥物。合併 metronidazole。術前 60 分鐘內。保留給一/二代 cephalosporin 抗藥性高的地區。Clean / clean-contaminated 不需術後再給",
          dose: "2 g",
          freq: "單劑",
          duration: "單劑（術前）",
        },
      ],
    },

    // ═══ 16. UTI ═══
    {
      id: "uti",
      label: "Urinary tract infection（泌尿道感染）",
      desc: "複雜性 UTI / 腎盂腎炎",
      scenarios: [
        {
          label: "Complicated UTI / Pyelonephritis（複雜性 UTI / 腎盂腎炎）",
          note: "經驗治療用於無抗藥風險者；重症考慮當地 antibiogram。48 小時內改善者總療程 5–7 天（含口服降階）；全程 ceftriaxone 7 天",
          dose: "1–2 g",
          freq: "QD",
          duration: "5–7 天",
          route: "IV 或 IM",
        },
        {
          label: "UTI in pregnancy（孕婦 UTI）",
          note: "症狀改善後轉適當口服。總療程 14 天；部分專家在 48 小時內改善者用 7–10 天",
          dose: "1 g",
          freq: "QD",
          duration: "14 天（或 7–10 天）",
        },
        {
          label: "Prostatitis, acute bacterial（急性細菌性前列腺炎）",
          note: "療程 2–4 週",
          dose: "1–2 g",
          freq: "QD",
          duration: "2–4 週",
        },
      ],
    },

  ], // ← end of indications

  // ──────────────────────────────────────────────────────────────
  // calculate()
  // Ceftriaxone 幾乎都是固定劑量，不需要體重計算
  // 主要判斷：ARC → 需要 2 g Q12H
  //          CrCl <15 + 肝功能不全 → >2 g/day 未被研究
  // ──────────────────────────────────────────────────────────────
  calculate({ crcl, rrt, indicationData }) {
    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const warnings: string[] = [];

      // ARC 判斷
      const isARC = rrt === "none" && crcl >= 150;
      // CrCl <15 判斷
      const isSevereCKD = rrt === "none" && crcl < 15;

      // 基本劑量資訊（直接從 scenario 讀）
      const dose = sc.dose ?? "1–2 g";
      const freq = sc.freq ?? "QD";
      const duration = sc.duration ?? "—";
      const route = sc.route ?? "IV";

      // ARC 提醒（不改動基本劑量，但另外加提醒 row）
      let arcNote = "";
      if (isARC) {
        arcNote = "⚡ ARC（CrCl ≥150）：經驗治療或 MIC = 2 的病原建議改為 2 g Q12H（依 Monte Carlo simulation）";
        warnings.push(arcNote);
      }

      // 嚴重 CKD 提醒
      if (isSevereCKD) {
        warnings.push("⚠️ CrCl <15：不需調整劑量，但 >2 g/day 未被研究。合併肝功能不全者（膽汁排泄下降）需密切監測");
      }

      // RRT 提醒
      if (rrt === "hd") {
        warnings.push("💡 HD：透析清除率低（poorly dialyzed），不需調整。但 >2 g/day 未被研究；合併肝功能不全者需密切監測。替代方案：2 g 3x/week 透析後（MIC ≤1 可達 PD target）");
      }
      if (rrt === "pd") {
        warnings.push("💡 PD：透析清除率低（poorly dialyzed），不需調整。>2 g/day 合併肝功能不全者需密切監測");
      }
      if (rrt === "cvvh") {
        warnings.push("💡 CRRT / PIRRT：不需調整劑量");
      }

      // 支數計算（用 dose 字串裡的最大劑量估算）
      let maxDose_mg = 2000; // 預設 2 g
      if (dose.includes("250 mg")) maxDose_mg = 250;
      else if (dose.includes("500 mg")) maxDose_mg = 500;
      else if (dose.includes("1 g") && !dose.includes("2 g") && !dose.includes("1–2")) maxDose_mg = 1000;
      else if (dose.includes("1–2 g")) maxDose_mg = 2000;
      else if (dose.includes("2 g")) maxDose_mg = 2000;

      const rows: any[] = [
        { label: "建議劑量", value: `${dose} ${route}`, highlight: true },
        { label: "給藥頻率", value: freq, highlight: true },
        { label: "療程", value: duration },
        { label: "每次取藥", value: `${toHalfVials(maxDose_mg)} Cefin（每支 2 g）` },
      ];

      // ARC 時另外加一行建議
      if (isARC) {
        rows.push({
          label: "⚡ ARC 建議劑量",
          value: "2 g Q12H IV（1 支 Q12H）",
          highlight: true,
        });
      }

      if (sc.note) {
        rows.push({ label: "備註", value: sc.note });
      }

      return {
        title: sc.label,
        rows,
        warnings,
      };
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
        heading: "抗菌譜重點",
        body:
          "【涵蓋】\n" +
          "• 大部分 Enterobacteriaceae（E. coli、Klebsiella、Proteus 等）\n" +
          "• Streptococci（包括 S. pneumoniae，但高度抗藥需看 MIC）\n" +
          "• N. meningitidis、N. gonorrhoeae\n" +
          "• H. influenzae（含 β-lactamase 陽性株）\n" +
          "• HACEK organisms（Haemophilus spp.、Aggregatibacter、Cardiobacterium、Eikenella、Kingella — 口腔慢生長 GNB，culture-negative endocarditis 常見原因）\n\n" +
          "【不涵蓋】\n" +
          "• MRSA\n" +
          "• Enterococcus spp.\n" +
          "• Pseudomonas aeruginosa（與其他三代不同，如 ceftazidime）\n" +
          "• Acinetobacter\n" +
          "• ESBL-producing organisms（大部分抗藥）\n" +
          "• Anaerobes（需合併 metronidazole）\n" +
          "• Listeria monocytogenes",
      },
      {
        heading: "ARC（Augmented Renal Clearance）",
        body:
          "ICU 常見。年輕（<55 歲）、外傷/大手術後、sepsis、燒傷、血液腫瘤病人高風險。\n" +
          "需 8–24 小時 measured urinary CrCl ≥130 mL/min/1.73 m² 來確認。\n\n" +
          "ARC 時建議：\n" +
          "• CrCl ≥150：經驗治療或 MIC = 2 → 改為 2 g Q12H（Monte Carlo simulation）\n" +
          "• 標準 QD 給藥在 ARC 時可能無法達到 PD target（%fT>MIC）",
      },
      {
        heading: "腎功能調整",
        body:
          "• CrCl >15：不需調整\n" +
          "• CrCl <15：不需調整，但 >2 g/day 未被研究；合併肝功能不全者（膽汁排泄下降）需監測\n" +
          "• HD：poorly dialyzed，不需調整。替代：2 g 3x/week post-HD（MIC ≤1 可達 PD target）\n" +
          "• PD：不需調整\n" +
          "• CRRT / PIRRT：不需調整",
      },
      {
        heading: "肝功能",
        body: "Child-Pugh A–C：不需調整劑量。",
      },
      {
        heading: "重要注意事項",
        body:
          "• 不可與含鈣溶液（如 Ringer's lactate、TPN）混合或同時從同一管路輸注（沈澱風險）\n" +
          "• 新生兒（≤28 天）禁忌與含鈣 IV 液併用\n" +
          "• 高劑量或長期使用可能導致膽汁淤積或膽道假性結石（biliary sludging/pseudolithiasis）\n" +
          "• 與 aminoglycoside 合用時需分開給藥（physical incompatibility）",
      },
      {
        heading: "院內品項",
        body: "Cefin 針（舒復靜脈注射劑）2 g / Vial",
      },
    ],
  },
};