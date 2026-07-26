import type { ClinicalPearls } from "../types";

const carbapenemValproate =
  "• Valproate / divalproex（Depakine）：通常不建議併用。Carbapenem 會使 valproate 濃度在 24-48 小時內明顯下降，可能低於治療範圍並增加 breakthrough seizure 風險；單純提高 Depakine 劑量常無法補回濃度。\n" +
  "• 建議處置：優先改用非 carbapenem 抗生素；若 carbapenem 不可避免，請會診神經科/臨床藥師，暫時加上或改用其他抗癲癇藥（常見如 levetiracetam），並監測 total/free valproate 濃度與癲癇症狀。\n" +
  "• 停 carbapenem 後 valproate 濃度常需數天到 1-2 週才回升；若期間曾提高 Depakine 劑量，停 carbapenem 後要避免濃度反彈中毒。";

const probenecidBetaLactam =
  "• Probenecid：可降低多數 beta-lactam 腎小管分泌，使抗生素濃度與半衰期上升；非刻意延長暴露時通常避免併用，或加強腎功能與神經毒性/副作用監測。";

const betaLactamBleeding =
  "• Warfarin / heparin / DOAC 或血小板低下、營養不良者：部分 beta-lactam 可能增加出血或 PT/INR 延長風險；療程較長或高風險病人建議追蹤 CBC、PT/INR 與出血徵象。";

const cephalosporinNephrotoxins =
  "• Aminoglycoside、loop diuretic（如 furosemide）、其他腎毒性藥物：可能增加腎毒性風險，尤其 ICU、CKD、脫水或高劑量療程；建議追蹤 SCr、尿量，並確認 beta-lactam 已依腎功能調整。\n" +
  "• Warfarin / anticoagulants：長療程、營養不良、膽汁鬱積或低白蛋白者較容易 PT/INR 上升；建議加強 INR 與出血監測。";

const fluoroquinoloneCommon =
  "• 含多價陽離子的口服品項：制酸劑、sucralfate、鐵、鋅、鈣、鎂、鋁、綜合維他命、管灌配方會降低口服吸收；口服 FQ 請前後間隔至少 2 小時，管灌病人需特別標註。\n" +
  "• Warfarin：可能使 INR/PT 上升並增加出血；併用時建議治療中與停藥後數天追蹤 INR。\n" +
  "• 降血糖藥/胰島素：可能造成低血糖或高血糖，老人、CKD、敗血症病人尤其要監測 glucose。\n" +
  "• QT-prolonging drugs（amiodarone、sotalol、macrolide、antipsychotics 等）：QT 延長風險增加；低 K/Mg、結構性心臟病或 baseline QTc 高者避免或監測 ECG、K、Mg。\n" +
  "• Corticosteroids：肌腱炎/肌腱斷裂風險增加；>60 歲、器官移植、CKD 病人更需避免非必要併用。";

const azoleCyp =
  "• Warfarin：INR 可能明顯上升；建議開始、調整與停藥後加強 INR 監測，必要時預先減量。\n" +
  "• Tacrolimus / cyclosporine / sirolimus：濃度與毒性可能上升；建議預先規劃減量、密集測 trough，並監測 SCr、K、血壓與神經毒性。\n" +
  "• Statins（尤其 simvastatin/lovastatin，部分 atorvastatin）：肌病與 rhabdomyolysis 風險增加；優先暫停或改 pravastatin/rosuvastatin 並監測 CK/肌痛。\n" +
  "• Phenytoin、sulfonylureas、QT-prolonging drugs：可能增加濃度、低血糖或 QT 風險；依藥物追蹤濃度、glucose、ECG、K/Mg。\n" +
  "• Rifampin / rifabutin / carbamazepine / phenytoin 等強誘導劑：azole 暴露下降、治療失敗風險高；多數情境需避免或改藥，若不得已需 TDM。";

export const MAJOR_INTERACTIONS: Record<string, ClinicalPearls> = {
  bactrim: {
    title: "重大交互作用",
    sections: [
      {
        heading: "TMP-SMX",
        body:
          "• Warfarin：CYP2C9 抑制與腸道菌相改變可使 INR 上升；建議 3-5 天內追蹤 INR，療程中與停藥後也要監測出血。\n" +
          "• ACEI / ARB / spironolactone / eplerenone / amiloride / triamterene / K 補充：TMP 有 amiloride-like 效應，會增加高血鉀風險；建議追蹤 K、SCr，CKD/老人/高劑量 PJP 治療尤其小心。\n" +
          "• Methotrexate：增加骨髓抑制與黏膜炎風險；盡量避免，若必要需監測 CBC、口腔黏膜、腎功能，並確認 folinic acid rescue 計畫。\n" +
          "• Phenytoin、sulfonylureas：濃度/作用可能上升；監測 phenytoin level、CNS 毒性與低血糖。",
      },
    ],
  },
  mepem: {
    title: "重大交互作用",
    sections: [
      { heading: "Carbapenem + Depakine / Valproate", body: carbapenemValproate },
      { heading: "其他", body: probenecidBetaLactam },
    ],
  },
  ertapenem: {
    title: "重大交互作用",
    sections: [
      { heading: "Carbapenem + Depakine / Valproate", body: carbapenemValproate },
      { heading: "其他", body: probenecidBetaLactam },
    ],
  },
  imipenem: {
    title: "重大交互作用",
    sections: [
      { heading: "Carbapenem + Depakine / Valproate", body: carbapenemValproate },
      {
        heading: "Imipenem 專屬注意",
        body:
          "• Ganciclovir：曾有 generalized seizures 報告；除非效益大於風險，通常避免併用。\n" +
          "• Probenecid：會增加 imipenem 濃度與半衰期，不建議併用。\n" +
          "• 併用其他降低 seizure threshold 藥物或腎功能不全時：務必確認腎調，並監測 myoclonus、意識改變、癲癇。",
      },
    ],
  },
  unasyn: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Ampicillin / Sulbactam",
        body:
          "• Allopurinol：ampicillin 類併用 allopurinol 皮疹風險增加；若出現廣泛皮疹需評估停藥與過敏。\n" +
          `${probenecidBetaLactam}\n` +
          `${betaLactamBleeding}`,
      },
    ],
  },
  tazocin: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Piperacillin / Tazobactam",
        body:
          "• Vancomycin：AKI 風險增加；若需併用，建議每日 SCr/尿量、vanco AUC/TDM，並每日評估是否可 de-escalation 或改 cefepime/meropenem 等替代方案。\n" +
          "• Methotrexate：可能降低 MTX 清除；若必要併用，需追蹤 MTX level、CBC、SCr、黏膜炎，並確認 rescue/水化鹼化策略。\n" +
          "• Heparin / oral anticoagulants：建議追蹤 PT/INR、aPTT 或出血徵象。\n" +
          "• Vecuronium 等非去極化肌肉鬆弛劑：可能延長 neuromuscular blockade，ICU 病人注意甦醒延遲與呼吸肌無力。\n" +
          `${probenecidBetaLactam}`,
      },
    ],
  },
  brosym: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Cefoperazone / Sulbactam",
        body:
          "• Warfarin / heparin / DOAC、營養不良、膽汁鬱積、長療程：cefoperazone 可能造成 hypoprothrombinemia；建議追蹤 PT/INR、出血徵象，必要時補充 vitamin K。\n" +
          "• Alcohol：可能出現 disulfiram-like reaction；治療期間與停藥後數天避免飲酒或含酒精製劑。\n" +
          "• Aminoglycosides / loop diuretics / nephrotoxins：併用時監測腎功能；若需合併 aminoglycoside，避免同袋混合並沖管。",
      },
    ],
  },
  flomoxef: {
    title: "重大交互作用",
    sections: [{ heading: "Flomoxef", body: cephalosporinNephrotoxins }],
  },
  ceftriaxone: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Ceftriaxone",
        body:
          "• Calcium-containing IV solutions（含 TPN、Ringer、Hartmann）：不可同時 Y-site 或同袋混合；非新生兒若需先後給藥，需以相容液完整沖管。\n" +
          "• Vancomycin、aminoglycosides、fluconazole 等：與 ceftriaxone 混合可能物理不相容；間歇輸注請分開給、沖管。\n" +
          `${betaLactamBleeding}`,
      },
    ],
  },
  zavicefta: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Ceftazidime / Avibactam",
        body:
          "• Probenecid / 強 OAT inhibitor：可能降低 avibactam 排除，不建議併用。\n" +
          "• 重大 CYP 交互作用少；臨床重點是依腎功能即時調整，避免腎功能改善後劑量不足或腎功能惡化後神經毒性。\n" +
          `${betaLactamBleeding}`,
      },
    ],
  },
  cefepime: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Cefepime",
        body:
          "• Aminoglycosides：nephrotoxicity/ototoxicity 風險增加；併用時追蹤 SCr、尿量與 aminoglycoside level。\n" +
          "• Loop diuretics（如 furosemide）：腎毒性風險增加；建議追蹤 SCr、尿量。\n" +
          "• 降低 seizure threshold 藥物、腎功能不全或高齡：cefepime neurotoxicity 風險上升；務必依 CrCl 調整並監測意識改變、myoclonus、癲癇。",
      },
    ],
  },
  ceftazidime: {
    title: "重大交互作用",
    sections: [{ heading: "Ceftazidime", body: cephalosporinNephrotoxins }],
  },
  cefoxitin: {
    title: "重大交互作用",
    sections: [{ heading: "Cefoxitin", body: cephalosporinNephrotoxins }],
  },
  ceftaroline: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Ceftaroline",
        body:
          "• 重大 CYP 交互作用少；與常見 CYP substrate/inhibitor/inducer 無明顯臨床交互作用預期。\n" +
          "• 長療程或合併抗凝血藥時仍建議追蹤 CBC、PT/INR 與出血徵象；腎功能變動時需即時調整劑量。",
      },
    ],
  },
  cefmetazole: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Cefmetazole",
        body:
          "• Warfarin / anticoagulants、營養不良、長療程：可能增加 PT/INR 延長與出血風險；建議追蹤 PT/INR、CBC、出血徵象，必要時補充 vitamin K。\n" +
          "• Alcohol：具有 N-methylthiotetrazole-like side chain 的 cephamycin 類需注意 disulfiram-like reaction；治療期間與停藥後數天避免飲酒或含酒精製劑。\n" +
          "• Aminoglycosides / loop diuretics / nephrotoxins：併用時監測腎功能。",
      },
    ],
  },
  zerbaxa: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Ceftolozane / Tazobactam",
        body:
          "• Probenecid / OAT1/OAT3 inhibitors：可能增加 tazobactam 暴露；通常不需為此調整，但腎功能不穩或高劑量時仍建議監測副作用。\n" +
          "• 重大 CYP 交互作用少；臨床重點是依腎功能即時調整，CRRT/ARC 病人避免低估劑量。\n" +
          `${betaLactamBleeding}`,
      },
    ],
  },
  levofloxacin: {
    title: "重大交互作用",
    sections: [{ heading: "Fluoroquinolone 共通", body: fluoroquinoloneCommon }],
  },
  ciprofloxacin: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Ciprofloxacin 專屬",
        body:
          "• Tizanidine：禁忌併用，可能造成嚴重低血壓與嗜睡。\n" +
          "• Theophylline、caffeine、clozapine、ropinirole、duloxetine 等 CYP1A2 substrates：濃度可能上升；能避免就避免，必要時監測濃度或毒性並調整劑量。",
      },
      { heading: "Fluoroquinolone 共通", body: fluoroquinoloneCommon },
    ],
  },
  fluconazole: {
    title: "重大交互作用",
    sections: [{ heading: "Azole CYP 交互作用", body: azoleCyp }],
  },
  vfend: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Voriconazole",
        body:
          "• 禁忌/通常避免：rifampin、rifabutin、carbamazepine、long-acting barbiturates、St. John's wort、sirolimus、ergot alkaloids、部分 QT-prolonging drugs（如 pimozide/quinidine）。\n" +
          "• Efavirenz / ritonavir：需依劑量判斷是否禁忌或調整；合併 ART 時建議直接查交互作用並做 voriconazole TDM。\n" +
          "• Tacrolimus/cyclosporine/warfarin/statins/benzodiazepines/opioids：濃度或作用可能上升；先規劃減量，追蹤 trough、INR、鎮靜與肝毒性。\n" +
          "• 強誘導劑會使 voriconazole 濃度不足；任何交互作用或重症 mold infection 都建議 TDM。",
      },
    ],
  },
  cresemba: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Isavuconazole",
        body:
          "• 強 CYP3A4 inhibitors（ketoconazole、高劑量 ritonavir 等）與強 CYP3A4 inducers（rifampin、carbamazepine、St. John's wort、長效 barbiturates）：禁忌併用。\n" +
          "• Tacrolimus / sirolimus / cyclosporine：isavuconazole 為中度 CYP3A4 inhibitor，建議追蹤 trough、SCr、K、血壓並調整免疫抑制劑。\n" +
          "• Digoxin / P-gp substrates：可能需監測濃度或毒性。\n" +
          "• QT：isavuconazole 會縮短 QT，familial short QT syndrome 禁用；與其他縮短 QT 藥物併用需小心。",
      },
    ],
  },
  vancomycin: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Vancomycin",
        body:
          "• Piperacillin/tazobactam：AKI 風險增加；併用時建議每日 SCr/尿量、vanco AUC/TDM，並每日評估是否可縮窄或換藥。\n" +
          "• Aminoglycosides、amphotericin B、polymyxin B、colistin、calcineurin inhibitors、IV contrast、NSAIDs：腎毒性相加；需更密集監測 SCr、尿量與 vanco 濃度。\n" +
          "• Aminoglycosides / loop diuretics：ototoxicity 風險增加；若有耳鳴、聽力改變、眩暈需停看。\n" +
          "• Anesthetic agents：可能增加 infusion reaction；手術/麻醉情境注意輸注速率與低血壓。",
      },
    ],
  },
  teicoplanin: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Teicoplanin",
        body:
          "• Aminoglycosides、amphotericin B、polymyxin B、calcineurin inhibitors、IV contrast、NSAIDs：腎毒性相加；建議追蹤 SCr、尿量，療程長或重症可考慮 TDM。\n" +
          "• Aminoglycosides / loop diuretics：ototoxicity 風險增加；監測耳鳴、聽力變化、眩暈。\n" +
          "• Warfarin / anticoagulants：若病人營養差、長療程或感染本身造成 INR 波動，建議追蹤 INR 與出血。",
      },
    ],
  },
  polymyxinB: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Polymyxin B",
        body:
          "• Vancomycin、aminoglycosides、amphotericin B、calcineurin inhibitors、IV contrast、NSAIDs：腎毒性相加；建議每日 SCr/尿量，避免不必要 nephrotoxin。\n" +
          "• Neuromuscular blockers、aminoglycosides、全身麻醉藥：可能加重 neuromuscular blockade，增加呼吸肌無力/呼吸抑制風險；ICU 病人注意離線困難、肌無力。\n" +
          "• 其他 neurotoxic 藥物：監測 paresthesia、dizziness、ataxia、confusion；出現明顯神經毒性需評估降劑量或停藥。",
      },
    ],
  },
  tygacil: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Tigecycline",
        body:
          "• Warfarin：R/S-warfarin 暴露可能上升；併用時建議追蹤 PT/INR 或其他抗凝血檢驗。\n" +
          "• Tacrolimus / cyclosporine：可能增加 calcineurin inhibitor trough；併用時追蹤 trough、SCr、K、血壓與神經毒性。\n" +
          "• Oral contraceptives：抗菌藥可能降低避孕效果；治療期間建議加用非荷爾蒙避孕。",
      },
    ],
  },
  anidulafungin: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Anidulafungin",
        body:
          "• 臨床顯著交互作用少；與 cyclosporine、tacrolimus、voriconazole、rifampin、liposomal amphotericin B 併用通常不需調整 anidulafungin 劑量。\n" +
          "• 若與其他肝毒性藥物或 amphotericin B 併用，仍建議依臨床狀況追蹤 LFT、SCr、K/Mg。",
      },
    ],
  },
  micafungin: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Micafungin",
        body:
          "• Sirolimus、nifedipine、itraconazole：暴露可能上升；併用時監測毒性，必要時減量。\n" +
          "• 與 tacrolimus/cyclosporine/voriconazole/fluconazole 多數情境不需調整 micafungin；移植病人仍按免疫抑制劑 trough 管理。\n" +
          "• 合併其他肝毒性藥物時建議追蹤 LFT。",
      },
    ],
  },
  amphotericinB: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Amphotericin B",
        body:
          "• Aminoglycosides、cyclosporine/tacrolimus、pentamidine、vancomycin、polymyxin B、IV contrast、NSAIDs：腎毒性相加；需密集監測 SCr、尿量、K、Mg，並盡量減少其他 nephrotoxin。\n" +
          "• Digoxin / antiarrhythmics / QT-risk drugs：amphotericin B 造成低 K/低 Mg 會增加 digoxin toxicity 與心律不整；需積極補 K/Mg、監測 ECG/濃度。\n" +
          "• Flucytosine：常用於 cryptococcosis，但 amphotericin B 腎毒性會增加 flucytosine 毒性；需追蹤 CBC、SCr，必要時測 flucytosine level。\n" +
          "• Corticosteroids / ACTH：低血鉀風險增加；若只是為預防 infusion reaction，使用最低有效策略並追蹤電解質。\n" +
          "• Neuromuscular blockers：低血鉀可加強肌肉鬆弛效果；麻醉/ICU 病人注意呼吸肌無力。",
      },
    ],
  },
  acyclovir: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Acyclovir",
        body:
          "• Nephrotoxins（vancomycin、aminoglycosides、amphotericin B、calcineurin inhibitors、IV contrast、NSAIDs）：crystal nephropathy/AKI 風險增加；需足夠 hydration、避免快速推注、追蹤 SCr/尿量。\n" +
          "• Probenecid / cimetidine：可能降低 acyclovir renal clearance、增加暴露；腎功能差或高劑量 IV 時更需監測神經毒性。\n" +
          "• Mycophenolate mofetil：腎功能不全時兩者代謝物可能累積；移植病人注意 CBC、腎功能與神經症狀。",
      },
    ],
  },
  ganciclovir: {
    title: "重大交互作用",
    sections: [
      {
        heading: "Ganciclovir",
        body:
          "• Imipenem/cilastatin：曾有 generalized seizures 報告；除非效益大於風險，通常避免併用。\n" +
          "• Zidovudine、TMP-SMX、dapsone、flucytosine、mycophenolate、chemotherapy 等骨髓抑制藥物：neutropenia、anemia、thrombocytopenia 風險增加；建議追蹤 CBC/diff，必要時調整免疫抑制或使用 G-CSF。\n" +
          "• Nephrotoxins / probenecid：可能增加 ganciclovir 暴露或腎毒性；需依 CrCl 調整並追蹤 SCr、CBC。\n" +
          "• Didanosine：濃度可能上升且毒性增加；目前臨床少用，但若遇到需避免或嚴密監測。",
      },
    ],
  },
};

export function getMajorInteractions(drugId: string): ClinicalPearls | null {
  return MAJOR_INTERACTIONS[drugId] ?? null;
}
