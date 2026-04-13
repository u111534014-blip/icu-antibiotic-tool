import { round1, round2 } from './shared/helpers';
import type { Drug } from './types';

export const bactrim: Drug = {
  name: "Bactrim",
  subtitle: "Trimethoprim-sulfamethoxazole",
  needsRenal: true,
  needsWeight: true,
  needsHepatic: false,
  searchTerms: [
    "bactrim", "baktar", "septra", "co-trimoxazole",
    "trimethoprim", "sulfamethoxazole", "tmp-smx", "tmp/smx", "smx-tmp",
    "sevatrim", "雪白淨", "morcasin", "孟克杏",
    "PJP", "PCP",
  ],

  indications: [
    // ─── 一般感染（General） ───
    {
      id: "general",
      label: "一般劑量參考（General dosing）",
      desc: "未指定適應症時的標準劑量",
      scenarios: [
        {
          label: "標準口服 / 靜脈劑量",
          note: "UpToDate Adult dosing 同時列 Oral 與 IV，兩種劑型皆可",
          // 無 preferred：兩種劑型並列
          po: {
            fixedDose: "1–2 DS tab Q12–24H",
            detail: "DS tab = TMP 160 mg + SMX 800 mg（= 2 錠 Morcasin）",
          },
          iv: {
            dosePerKg: { min: 8, max: 20 },
            divisions: 2,
            freq: "Q6–12H",
          },
        },
      ],
    },

    // ─── PJP 治療與預防 ───
    {
      id: "pjp",
      label: "Pneumocystis pneumonia（PJP / PCP）",
      desc: "肺囊蟲肺炎",
      scenarios: [
        {
          label: "中重度感染：治療",
          note: "PaO₂ <70 mm Hg 或 A-a gradient ≥35 → 加上類固醇。療程 21 天",
          preferred: "IV",
          iv: {
            dosePerKg: { min: 15, max: 20 },
            divisions: 4,
            freq: "Q6H",
          },
          po: {
            fixedDose: "2 DS tab TID（PO 三次）",
            detail: "輕中度感染或 IV 改 PO；療程 21 天",
          },
        },
        {
          label: "初級或次級預防",
          note: "HIV：CD4 <200；移植後或免疫低下宿主皆適用",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab QD（首選）或 1 SS tab QD 或 1 DS tab 每週 3 次",
            detail: "DS = TMP 160 mg；SS = TMP 80 mg（= 1 錠 Morcasin）",
          },
        },
      ],
    },

    // ─── SSTI ───
    {
      id: "ssti",
      label: "Skin & Soft Tissue Infection（SSTI 皮膚軟組織感染）",
      desc: "膿瘍、蜂窩性組織炎等",
      scenarios: [
        {
          label: "Abscess（膿瘍）",
          note: "體重 >70 kg 建議採用較高劑量；療程 ≥5 天，依嚴重度可延長至 14 天",
          preferred: "PO",
          po: {
            fixedDose: "1–2 DS tab BID",
            tmpMgMin: 160, tmpMgMax: 320, tmpFreq: "Q12H",
          },
          iv: {
            dosePerKg: { min: 8, max: 10 },
            divisions: 2,
            freq: "Q12H",
          },
        },
        {
          label: "Cellulitis（蜂窩性組織炎，化膿性 / MRSA 風險）",
          note: "建議加上 beta-hemolytic streptococci 覆蓋（如 amoxicillin、cephalexin）",
          preferred: "PO",
          po: {
            fixedDose: "1–2 DS tab BID",
            tmpMgMin: 160, tmpMgMax: 320, tmpFreq: "Q12H",
          },
          iv: {
            dosePerKg: { min: 8, max: 10 },
            divisions: 2,
            freq: "Q12H",
          },
        },
        {
          label: "Cellulitis 長期抑制（Long-term suppression）",
          note: "復發性葡萄球菌 cellulitis 於完成治療後使用",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab QD–BID",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "QD–BID",
          },
        },
        {
          label: "Impetigo / Ecthyma（膿痂疹，懷疑或確認 MRSA）",
          note: "膿痂疹病灶多或群聚感染才考慮全身治療；療程 7 天",
          preferred: "PO",
          po: {
            fixedDose: "1–2 DS tab BID × 7 天",
            tmpMgMin: 160, tmpMgMax: 320, tmpFreq: "Q12H",
          },
        },
      ],
    },

    // ─── UTI ───
    {
      id: "uti",
      label: "Urinary Tract Infection（UTI 泌尿道感染）",
      desc: "膀胱炎、腎盂腎炎等",
      scenarios: [
        {
          label: "Acute uncomplicated cystitis（急性單純性膀胱炎）",
          note: "若當地抗藥性 >20% 或多重抗藥性風險高，避免使用。女性 3 天，男性 7 天",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab BID",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
        },
        {
          label: "Complicated UTI / Pyelonephritis（複雜性 UTI / 腎盂腎炎）",
          note: "症狀於 48 小時內改善者，總療程 5–7 天",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab BID",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
        },
        {
          label: "Cystitis 預防（復發性感染）",
          note: "持續性預防或性交後預防",
          preferred: "PO",
          po: {
            fixedDose: "½ SS tab QD 或每週 3 次",
            detail: "SS tab = TMP 80 mg（= 1 錠 Morcasin）",
            // 預防性用藥不產生 IV 換算
          },
        },
      ],
    },

    // ─── Stenotrophomonas maltophilia ───
    {
      id: "stenotrophomonas",
      label: "Stenotrophomonas maltophilia infection",
      desc: "嗜麥芽窄食單胞菌感染",
      scenarios: [
        {
          label: "Cystitis（單純性膀胱炎）",
          preferred: "PO",
          po: {
            fixedDose: "TMP 160 mg Q12H",
            detail: "= 1 DS tab BID",
          },
          iv: {
            dosePerKg: { min: 4, max: 4 },
            divisions: 2,
            freq: "Q12H",
          },
        },
        {
          label: "HAP / VAP / Bacteremia（醫院或呼吸器相關肺炎、菌血症）",
          note: "建議合併使用其他適當藥物。專家建議 max 960 mg/day（TMP）",
          preferred: "IV",
          iv: {
            dosePerKg: { min: 8, max: 15 },
            divisions: 3,
            freq: "Q8H",
          },
          po: {
            fixedDose: "2 DS tab BID",
            detail: "或 10–15 mg/kg/day 分 2–3 次",
          },
        },
      ],
    },

    // ─── Nocardiosis ───
    {
      id: "nocardiosis",
      label: "Nocardiosis（諾卡氏菌感染）",
      desc: "建議做藥敏試驗",
      scenarios: [
        {
          label: "皮膚或淋巴皮膚型感染",
          note: "無其他器官侵犯",
          preferred: "PO",
          po: {
            fixedDose: "5–10 mg/kg/day 分 2 次",
            detail: "依 TMP 計算",
          },
        },
        {
          label: "肺部感染（輕中度，免疫正常）",
          preferred: "PO",
          po: {
            fixedDose: "5–10 mg/kg/day 分 2 次",
            detail: "依 TMP 計算",
          },
        },
        {
          label: "肺部感染（輕中度，免疫低下）",
          preferred: "PO",
          po: {
            fixedDose: "15 mg/kg/day 分 3–4 次",
            detail: "依 TMP 計算",
          },
        },
        {
          label: "嚴重肺部感染 / CNS / 散播性 / 菌血症",
          note: "需合併用藥；療程通常 3 個月至 1 年以上",
          preferred: "IV",
          iv: {
            dosePerKg: { min: 15, max: 15 },
            divisions: 4,
            freq: "Q6H",
          },
        },
      ],
    },

    // ─── Toxoplasmosis ───
    {
      id: "toxoplasmosis",
      label: "Toxoplasma gondii encephalitis（弓形蟲腦炎）",
      desc: "治療與預防",
      scenarios: [
        {
          label: "治療",
          note: "至少 6 週；不完全反應時需延長。UpToDate 原文 \"Oral, IV:\"，兩種劑型皆可",
          // 無 preferred：兩種劑型皆可
          po: {
            fixedDose: "10 mg/kg/day 分 2 次",
            detail: "依 TMP 計算",
          },
          iv: {
            dosePerKg: { min: 10, max: 10 },
            divisions: 2,
            freq: "Q12H",
          },
        },
        {
          label: "次級預防（chronic maintenance）",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab BID",
            detail: "DS tab = TMP 160 mg",
          },
        },
      ],
    },

    // ─── Bacterial meningitis ───
    {
      id: "meningitis",
      label: "Bacterial meningitis（細菌性腦膜炎）",
      desc: "MRSA、Listeria、E. coli、其他腸桿菌科",
      scenarios: [
        {
          label: "MRSA / Listeria / 其他敏感菌",
          preferred: "IV",
          iv: {
            dosePerKg: { min: 5, max: 5 },
            divisions: 4,
            freq: "Q6–8H",
          },
        },
      ],
    },

    // ─── Intracranial / spinal epidural abscess ───
    {
      id: "cnsAbscess",
      label: "Intracranial / Spinal epidural abscess（顱內或脊髓硬膜外膿瘍）",
      desc: "MRSA 替代藥物",
      scenarios: [
        {
          label: "MRSA 顱內或脊髓硬膜外膿瘍",
          note: "療程 4–8 週（脊髓硬膜外）或 6–8 週（腦部）",
          preferred: "IV",
          iv: {
            dosePerKg: { min: 5, max: 5 },
            divisions: 3,
            freq: "Q8–12H",
          },
        },
      ],
    },

    // ─── Endocarditis ───
    {
      id: "endocarditis",
      label: "Endocarditis（心內膜炎）",
      desc: "S. aureus 口服降階治療",
      scenarios: [
        {
          label: "S. aureus 心內膜炎（口服降階）",
          note: "資料有限；非首選。MRSA 或對 penicillin 過敏的 MSSA。連同初期 IV 療程共 6 週",
          preferred: "PO",
          po: {
            fixedDose: "2 DS tab BID × 6 週",
            tmpMgMin: 320, tmpMgMax: 320, tmpFreq: "Q12H",
          },
        },
      ],
    },

    // ─── Osteomyelitis ───
    {
      id: "osteomyelitis",
      label: "Osteomyelitis / Discitis（骨髓炎 / 椎間盤炎）",
      desc: "MRSA 或革蘭氏陰性菌",
      scenarios: [
        {
          label: "Gram-negative 感染",
          preferred: "PO",
          po: {
            fixedDose: "1–2 DS tab BID",
            tmpMgMin: 160, tmpMgMax: 320, tmpFreq: "Q12H",
          },
        },
        {
          label: "MRSA 感染",
          note: "建議合併 rifampin。療程通常 6 週。PO 和 IV 劑量相同，UpToDate 未指定首選",
          // 無 preferred：UpToDate 原文為 "Oral, IV:"，兩種劑型皆可
          po: {
            fixedDose: "5–10 mg/kg/day 分 2–3 次（依 TMP）",
            detail: "或 7–12 mg/kg/day 分 2–3 次",
          },
          iv: {
            dosePerKg: { min: 5, max: 10 },
            divisions: 3,
            freq: "Q8H",
          },
        },
      ],
    },

    // ─── Septic arthritis ───
    {
      id: "septicArthritis",
      label: "Septic arthritis（化膿性關節炎）",
      desc: "MRSA 治療或 MSSA 替代藥物",
      scenarios: [
        {
          label: "MRSA / MSSA",
          note: "口服降階療法。療程 3–4 週",
          preferred: "PO",
          po: {
            fixedDose: "2 DS tab BID 或 4 mg/kg BID（max 320 mg/dose）",
            tmpMgMin: 320, tmpMgMax: 320, tmpFreq: "Q12H",
          },
        },
      ],
    },

    // ─── Prosthetic joint infection ───
    {
      id: "pji",
      label: "Prosthetic joint infection（人工關節感染）",
      desc: "MRSA / Enterobacteriaceae 口服續用",
      scenarios: [
        {
          label: "口服延續治療",
          note: "S. aureus 感染建議合併 rifampin。最少 3 個月",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab BID",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
        },
      ],
    },

    // ─── Prostatitis ───
    {
      id: "prostatitis",
      label: "Prostatitis（前列腺炎）",
      desc: "急性 / 慢性",
      scenarios: [
        {
          label: "Acute bacterial prostatitis",
          note: "療程 2–4 週",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab BID",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
        },
        {
          label: "Chronic bacterial prostatitis",
          note: "療程 4–6 週",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab BID",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
        },
      ],
    },

    // ─── Diabetic foot infection ───
    {
      id: "diabeticFoot",
      label: "Diabetic foot infection（糖尿病足感染）",
      desc: "輕中度感染、MRSA 風險",
      scenarios: [
        {
          label: "輕中度糖尿病足感染",
          note: "可作為 empiric 或致病菌導向治療（含 MRSA）；常合併用藥。皮膚軟組織為主療程 1–2 週",
          preferred: "PO",
          po: {
            fixedDose: "1–2 DS tab BID",
            tmpMgMin: 160, tmpMgMax: 320, tmpFreq: "Q12H",
          },
        },
      ],
    },

    // ─── Intra-abdominal infection ───
    {
      id: "iai",
      label: "Intra-abdominal infection（腹腔內感染）",
      desc: "急性憩室炎等",
      scenarios: [
        {
          label: "Acute diverticulitis（門診治療或降階）",
          note: "需合併 metronidazole；療程 4–14 天",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab BID + Metronidazole",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
        },
      ],
    },

    // ─── COPD acute exacerbation ───
    {
      id: "copd",
      label: "COPD acute exacerbation（COPD 急性惡化）",
      desc: "替代藥物",
      scenarios: [
        {
          label: "COPD 急性惡化",
          note: "Pseudomonas 風險或預後不良者避免使用。療程 5–7 天",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab Q12H × 5–7 天",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
        },
      ],
    },

    // ─── Mastitis ───
    {
      id: "mastitis",
      label: "Mastitis, lactational（哺乳期乳腺炎）",
      desc: "MRSA 風險",
      scenarios: [
        {
          label: "哺乳期乳腺炎",
          note: "用於無法使用首選藥物或 MRSA 風險者。療程 10–14 天",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab BID × 10–14 天",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
        },
      ],
    },

    // ─── SBP prophylaxis ───
    {
      id: "sbpProphylaxis",
      label: "SBP prophylaxis（自發性細菌性腹膜炎預防）",
      desc: "次級或初級預防",
      scenarios: [
        {
          label: "預防",
          note: "肝硬化合併急性 GI 出血或 ascites protein <1 g/dL 等高風險者",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab QD",
            detail: "DS tab = TMP 160 mg",
            // 預防用藥不產生 IV 換算
          },
        },
      ],
    },

    // ─── Cyclosporiasis / Cystoisosporiasis ───
    {
      id: "cyclosporiasis",
      label: "Cyclosporiasis / Cystoisosporiasis（環孢子蟲症 / 等孢子蟲症）",
      desc: "感染性腹瀉",
      scenarios: [
        {
          label: "Cyclosporiasis 治療",
          note: "療程 7–10 天；HIV 病人 14 天；移植病人 10 天",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab BID",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
        },
        {
          label: "Cystoisosporiasis 治療",
          note: "免疫正常 7–10 天；免疫低下需更長療程。IV 保留給無法吸收或無法耐受口服者",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab BID 或 TMP 160 mg QID",
            detail: "嚴重時可增至 QID 或延長至 21–28 天",
          },
          iv: {
            dosePerKg: { min: 8, max: 8 },
            divisions: 4,
            freq: "Q6H",
          },
        },
      ],
    },

    // ─── Salmonella / Shigella ───
    {
      id: "salmonellaShigella",
      label: "Salmonella / Shigella infection（沙門氏 / 志賀氏菌感染）",
      desc: "胃腸炎、菌血症",
      scenarios: [
        {
          label: "Nontyphoidal Salmonella（嚴重或高風險）",
          note: "免疫正常 10–14 天；HIV 14 天以上。UpToDate 同時列 Oral 與 IV",
          // 無 preferred：兩種劑型皆可
          iv: {
            dosePerKg: { min: 8, max: 10 },
            divisions: 3,
            freq: "Q8H",
          },
          po: {
            fixedDose: "1 DS tab Q12H",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
        },
        {
          label: "Shigellosis",
          note: "建議先確認藥敏；療程 5–7 天。UpToDate 同時列 Oral 與 IV",
          // 無 preferred：兩種劑型皆可
          po: {
            fixedDose: "1 DS tab Q12H",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
          iv: {
            dosePerKg: { min: 4, max: 4 },
            divisions: 2,
            freq: "Q12H",
          },
        },
      ],
    },

    // ─── Q fever ───
    {
      id: "qFever",
      label: "Q fever, acute（Q 熱急性症狀，孕婦替代）",
      desc: "Coxiella burnetii",
      scenarios: [
        {
          label: "急性 Q 熱",
          note: "症狀 3 天內治療最有效。非孕婦療程 14 天；孕婦請諮詢感染科",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab BID × 14 天",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
        },
      ],
    },

    // ─── Plague ───
    {
      id: "plague",
      label: "Plague（鼠疫，Yersinia pestis）",
      desc: "替代藥物",
      scenarios: [
        {
          label: "暴露後預防",
          note: "療程 7 天",
          preferred: "PO",
          po: {
            fixedDose: "5 mg/kg/dose Q12H × 7 天",
            detail: "依 TMP 計算",
          },
        },
        {
          label: "治療",
          note: "療程 7–14 天，臨床改善後再多幾天。UpToDate 原文 \"Oral, IV:\"，兩種劑型皆可",
          // 無 preferred：兩種劑型皆可
          iv: {
            dosePerKg: { min: 5, max: 5 },
            divisions: 3,
            freq: "Q8H",
          },
          po: {
            fixedDose: "5 mg/kg Q8H",
            detail: "依 TMP 計算",
          },
        },
      ],
    },

    // ─── Brucellosis ───
    {
      id: "brucellosis",
      label: "Brucellosis（布氏桿菌病）",
      desc: "替代藥物（孕婦首選）",
      scenarios: [
        {
          label: "Neurobrucellosis / Endocarditis",
          note: "≥12 週（可能需 6 個月）。需合併用藥",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab BID",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
        },
        {
          label: "Uncomplicated brucellosis",
          note: "需合併用藥。療程 6 週",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab BID × 6 週",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
        },
      ],
    },

    // ─── Melioidosis ───
    {
      id: "melioidosis",
      label: "Melioidosis / Glanders（類鼻疽 / 鼻疽）",
      desc: "Burkholderia pseudomallei / B. mallei",
      scenarios: [
        {
          label: "Initial intensive therapy（依體重調整）",
          note: "與 ceftazidime 或 meropenem 合併，14 天起跳。UpToDate 原文 \"Oral, IV:\"：IV 劑量與 PO 相同",
          // 無 preferred：兩種劑型皆可
          po: {
            fixedDose: "<40 kg：160 mg Q12H｜40–60 kg：240 mg Q12H｜>60 kg：320 mg Q12H",
            detail: "依 TMP 計算；IV 劑量同 PO",
          },
        },
        {
          label: "Eradication therapy（完成 intensive 後）",
          note: "口服維持治療。最少 3 個月（骨頭或 CNS 為 6 個月）",
          preferred: "PO",
          po: {
            fixedDose: "<40 kg：160 mg Q12H｜40–60 kg：240 mg Q12H｜>60 kg：320 mg Q12H",
            detail: "依 TMP 計算",
          },
        },
      ],
    },

    // ─── Bartonella ───
    {
      id: "bartonella",
      label: "Bartonella spp. infection（巴東體菌感染）",
      desc: "貓抓病等",
      scenarios: [
        {
          label: "Cat scratch disease, lymphadenitis（貓抓病淋巴炎）",
          note: "療程 7–10 天",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab BID × 7–10 天",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
        },
        {
          label: "Cat scratch disease, disseminated（CNS、視網膜炎）",
          note: "需合併 rifampin。CNS 10–14 天；視網膜炎 4–6 週",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab BID",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
          iv: {
            dosePerKg: { min: 4, max: 4 },
            divisions: 2,
            freq: "Q12H",
          },
        },
      ],
    },

    // ─── Bite wound ───
    {
      id: "biteWound",
      label: "Bite wound infection（動物或人類咬傷）",
      desc: "預防或治療（替代藥物）",
      scenarios: [
        {
          label: "咬傷預防或治療",
          note: "需合併厭氧菌覆蓋。預防 3–5 天；感染 5–14 天",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab BID + 厭氧菌覆蓋",
            tmpMgMin: 160, tmpMgMax: 160, tmpFreq: "Q12H",
          },
        },
      ],
    },

    // ─── Surgical prophylaxis ───
    {
      id: "surgicalProphylaxis",
      label: "Surgical prophylaxis（外科預防）",
      desc: "高風險泌尿外科操作",
      scenarios: [
        {
          label: "高風險膀胱鏡 / 經直腸前列腺切片",
          note: "手術切口前 60–120 分鐘給藥",
          preferred: "PO",
          po: {
            fixedDose: "1 DS tab × 1（術前 60–120 分鐘）",
            detail: "DS tab = TMP 160 mg",
          },
        },
      ],
    },
  ],

  extraFields: [
    { key: "waterLimit", type: "toggle", label: "限水病人", default: false },
  ],

  calculate({ dosing_weight, crcl, rrt, indicationData, extras }) {
    let hasIV = false;

    // 依腎功能調整劑量的 helper（IV、PO 共用邏輯）
    // 回傳 { factor, freq, warning }
    const renalAdjust = (origFreq: any) => {
      if (rrt === "hd") {
        return { factor: 0.5, freq: "Q24H（透析後）", warning: "HD 病人建議劑量減半" };
      } else if (rrt === "cvvh") {
        return { factor: 0.5, freq: "Q12H", warning: "CVVH 建議維持 Q12H" };
      } else if (rrt === "pd") {
        return { factor: 0.5, freq: "Q24H", warning: "PD 病人比照 CrCl <15 處理（劑量減半）" };
      } else if (crcl < 15) {
        return { factor: 0.5, freq: "Q24H", warning: "CrCl < 15 建議減半並 Q24H" };
      } else if (crcl <= 30) {
        return { factor: 0.5, freq: origFreq, warning: "CrCl 15–30 建議劑量減半" };
      }
      return { factor: 1, freq: origFreq, warning: null };
    };

    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const result = {
        title: sc.label,
        note: sc.note,
        preferred: sc.preferred,
        subResults: [] as any[],
      };

      // ── PO ──
      if (sc.po) {
        const poRows: any[] = [];
        const poWarnings: any[] = [];

        // 若有提供 tmpMg，套用腎功能調整邏輯
        if (sc.po.tmpMgMin != null) {
          const adj = renalAdjust(sc.po.tmpFreq || "");
          if (adj.warning) poWarnings.push(adj.warning);

          // 原始（未調整）劑量作為參考
          poRows.push({ label: "常規劑量", value: sc.po.fixedDose });

          // 若腎功能需調整，顯示調整後的 mg 和頻率
          if (adj.factor < 1) {
            const adjMin = sc.po.tmpMgMin * adj.factor;
            const adjMax = sc.po.tmpMgMax * adj.factor;
            const doseStr = adjMin === adjMax
              ? `TMP ${round1(adjMin)} mg`
              : `TMP ${round1(adjMin)} – ${round1(adjMax)} mg`;
            poRows.push({ label: "調整後單次劑量", value: doseStr, highlight: true });
            poRows.push({ label: "給藥頻率", value: adj.freq, highlight: true });

            // 顯示調整後的 Morcasin 錠數（1 錠 = 80 mg TMP）
            const tabMin = adjMin / 80;
            const tabMax = adjMax / 80;
            const tabStr = tabMin === tabMax
              ? `${round2(tabMin)} 錠`
              : `${round2(tabMin)} – ${round2(tabMax)} 錠`;
            poRows.push({ label: "院內品項（調整後）", value: `${tabStr} Morcasin（每錠 TMP 80 mg）` });
          } else {
            // 腎功能正常：顯示原始的 Morcasin 錠數
            const tabMin = sc.po.tmpMgMin / 80;
            const tabMax = sc.po.tmpMgMax / 80;
            const tabStr = tabMin === tabMax
              ? `${tabMin} 錠`
              : `${tabMin} – ${tabMax} 錠`;
            poRows.push({ label: "院內品項", value: `${tabStr} Morcasin（每錠 TMP 80 mg）` });
          }
        } else {
          // 沒有 tmpMg（預防性用藥、固定劑量）→ 不做腎調整
          poRows.push({ label: "建議劑量", value: sc.po.fixedDose, highlight: true });
        }

        if (sc.po.detail) {
          poRows.push({ label: "品項說明", value: sc.po.detail });
        }
        result.subResults.push({
          route: "PO",
          isPreferred: sc.preferred === "PO",
          rows: poRows,
          warnings: poWarnings,
        });
      }

      // ── IV ──
      // 情況 1：有明確的 iv 區塊（dosePerKg 公式）
      if (sc.iv) {
        hasIV = true;
        const adj = renalAdjust(sc.iv.freq);
        const ivWarnings = adj.warning ? [adj.warning] : [];

        let s_min = (dosing_weight * sc.iv.dosePerKg.min) / sc.iv.divisions * adj.factor;
        let s_max = (dosing_weight * sc.iv.dosePerKg.max) / sc.iv.divisions * adj.factor;

        const amp_min = round2(s_min / 80);
        const amp_max = round2(s_max / 80);

        result.subResults.push({
          route: "IV",
          isPreferred: sc.preferred === "IV",
          rows: [
            { label: "建議單次劑量", value: `TMP ${round1(s_min)} – ${round1(s_max)} mg`, highlight: true },
            { label: "給藥頻率", value: adj.freq, highlight: true },
            { label: "建議抽藥支數", value: `${amp_min} – ${amp_max} 支（Sevatrim）` },
          ],
          warnings: ivWarnings,
        });
      }
      // 情況 2：PO 有 tmpMg 但沒有 iv 區塊 → 自動產生 IV 換算
      //   依據：TMP/SMX 的 PO 生體可用率接近 100%，臨床常 PO ↔ IV 等量換算
      else if (sc.po?.tmpMgMin != null && !sc.iv) {
        hasIV = true;
        const adj = renalAdjust(sc.po.tmpFreq || "（依 PO 頻率）");
        const ivWarnings = ["此 IV 劑量為由 PO 等量換算（TMP/SMX 口服生體可用率接近 100%）"];
        if (adj.warning) ivWarnings.push(adj.warning);

        const s_min = sc.po.tmpMgMin * adj.factor;
        const s_max = sc.po.tmpMgMax * adj.factor;
        const amp_min = round2(s_min / 80);
        const amp_max = round2(s_max / 80);

        const doseStr = s_min === s_max
          ? `TMP ${round1(s_min)} mg`
          : `TMP ${round1(s_min)} – ${round1(s_max)} mg`;
        const ampStr = amp_min === amp_max
          ? `${amp_min} 支（Sevatrim）`
          : `${amp_min} – ${amp_max} 支（Sevatrim）`;

        result.subResults.push({
          route: "IV",
          isPreferred: false,   // UpToDate 原文首選 PO，IV 為等量換算
          rows: [
            { label: "建議單次劑量", value: doseStr, highlight: true },
            { label: "給藥頻率", value: adj.freq, highlight: true },
            { label: "建議抽藥支數", value: ampStr },
          ],
          warnings: ivWarnings,
        });
      }

      return result;
    });

    const pharmacistInput = hasIV ? {
      label: "💉 藥師決定給予支數（IV 配藥用）",
      placeholder: "例：2 或 2.5",
      suffix: "支",
      calcDilution(ampules: any) {
        const a = parseFloat(ampules);
        if (!a || a <= 0) return null;
        const vol = extras.waterLimit ? a * 75 : a * 125;
        return {
          text: `請抽取 ${a} 支 Sevatrim，加入 ${Math.round(vol)} mL D5W`,
          note: extras.waterLimit ? "（限水配方：75 mL/支）" : "（標準配方：125 mL/支）",
        };
      },
    } : null;

    return { scenarioResults, pharmacistInput };
  },
};
