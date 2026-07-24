import type { Drug } from './types';
import { round1 } from './shared/helpers';

// ═══════════════════════════════════════════════════════════════
// Amphotericin B
// ═══════════════════════════════════════════════════════════════
// 院內品項：
//   Fungizone（防治黴）50 mg/Vial：amphotericin B deoxycholate
//   AmBisome（脂黴素）50 mg/Vial：liposomal amphotericin B
//   Ampholipad（安畢黴）50 mg/Vial：lipid/liposomal amphotericin B
//
// 重點：
//   - Conventional 與 lipid/liposomal formulations 不可互換
//   - 腎功能不需調整，但 nephrotoxicity / K / Mg 需密切監測
//   - Fungizone 肥胖用 AdjBW；liposomal 預設用 TBW，但肥胖可考慮 cap dosing weight 100 kg
// ═══════════════════════════════════════════════════════════════

const MG_PER_VIAL = 50;

type Formulation = "deoxy" | "liposomal";
type DoseSpec = {
  formulation: Formulation;
  label: string;
  product: string;
  doseMin: number;
  doseMax?: number;
  fixedDose?: number;
  fixedDoseMax?: number;
  routeText?: string;
  duration?: string;
  note?: string;
  combo?: string;
  maxDailyMg?: number;
  capWeightAt100?: boolean;
};

function vialText(mg: number): string {
  const vials = mg / MG_PER_VIAL;
  return `${round1(vials)} 支`;
}

function doseText(mg: number): string {
  if (mg < 1) return `${round1(mg * 1000)} mcg`;
  return `${Math.round(mg)} mg（${vialText(mg)}）`;
}

function rangeText(min: number, max?: number): string {
  if (!max || max === min) return doseText(min);
  if (min < 1 || max < 1) return `${doseText(min)}-${doseText(max)}`;
  return `${Math.round(min)}-${Math.round(max)} mg（${vialText(min)}-${vialText(max)}）`;
}

function calcAdjBw(tbw: number, ibw: number | null): number | null {
  if (!tbw || !ibw) return null;
  return round1(ibw + 0.4 * (tbw - ibw));
}

function getDoseWeight(spec: DoseSpec, tbw: number, ibw: number | null, bmi: number | null) {
  if (!tbw) return { weight: 0, note: "請輸入體重", warnings: ["需要體重才能計算 mg/kg 劑量。"] };

  const warnings: string[] = [];
  if (spec.formulation === "deoxy") {
    if (bmi && bmi >= 30) {
      const adjBw = calcAdjBw(tbw, ibw);
      if (adjBw) {
        return {
          weight: adjBw,
          note: `Fungizone 肥胖劑量：AdjBW ${adjBw} kg（BMI ${round1(bmi)}）`,
          warnings,
        };
      }
      warnings.push("BMI ≥30 時 Fungizone 建議用 AdjBW；請輸入身高與性別以計算 IBW/AdjBW。暫以 TBW 粗估。");
    }
    return { weight: tbw, note: `Fungizone 劑量體重：TBW ${round1(tbw)} kg`, warnings };
  }

  if (spec.capWeightAt100 && tbw > 100) {
    warnings.push("Liposomal amphotericin B 肥胖病人：部分專家建議多數適應症 cap dosing weight 100 kg；重症/CNS/mucor 可依風險考慮不 cap。");
    return { weight: 100, note: `Liposomal 劑量體重：cap 100 kg（TBW ${round1(tbw)} kg）`, warnings };
  }

  if (bmi && bmi >= 30) {
    warnings.push("Liposomal amphotericin B：UpToDate 可用 TBW；Sanford/部分資料建議肥胖可考慮 AdjBW，critically ill 可考慮 TBW。");
  }
  return { weight: tbw, note: `Liposomal 劑量體重：TBW ${round1(tbw)} kg`, warnings };
}

function buildSubResult(spec: DoseSpec, tbw: number, ibw: number | null, bmi: number | null) {
  const weightInfo = getDoseWeight(spec, tbw, ibw, bmi);
  const warnings = [...weightInfo.warnings];
  const routeText = spec.routeText || "IV";

  let minDose = spec.fixedDose ?? (spec.doseMin * weightInfo.weight);
  let maxDose = spec.fixedDoseMax ?? spec.fixedDose ?? ((spec.doseMax ?? spec.doseMin) * weightInfo.weight);

  if (spec.maxDailyMg && maxDose > spec.maxDailyMg) {
    warnings.push(`已套用上限 ${spec.maxDailyMg} mg/day；若為非常嚴重感染，請與 ID/主治醫師確認風險效益。`);
    minDose = Math.min(minDose, spec.maxDailyMg);
    maxDose = Math.min(maxDose, spec.maxDailyMg);
  }

  const rows: any[] = [
    { label: "建議劑量", value: spec.fixedDose ? `${rangeText(minDose, maxDose)} ${routeText}` : `${spec.doseMin}${spec.doseMax ? `-${spec.doseMax}` : ""} mg/kg/day ${routeText} = ${rangeText(minDose, maxDose)}`, highlight: true },
    { label: "院內品項", value: `${spec.product}，50 mg/Vial` },
  ];

  if (!spec.fixedDose) rows.push({ label: "劑量體重", value: weightInfo.note });
  if (spec.duration) rows.push({ label: "療程", value: spec.duration });
  if (spec.combo) rows.push({ label: "合併/降階", value: spec.combo });
  if (spec.note) rows.push({ label: "備註", value: spec.note });

  rows.push({ label: "腎功能調整", value: "不需調整（CKD、HD、PD、CRRT、SLED 皆不需調整）；但需密切監測 SCr、K、Mg。" });

  if (spec.formulation === "deoxy") {
    warnings.push("Fungizone 與 liposomal/lipid formulations 不可互換；錯拿劑型可能造成嚴重過量。");
    warnings.push("Fungizone nephrotoxicity/infusion reaction 較高；系統性感染一般優先考慮 lipid/liposomal formulation。");
  } else {
    warnings.push("AmBisome/Ampholipad 與 Fungizone 不可互換；同樣 50 mg/vial 但 mg/kg 劑量不同。");
  }

  return {
    route: "IV",
    customLabel: spec.label,
    customLabelBg: spec.formulation === "deoxy" ? "#FEF3C7" : "#DBEAFE",
    customLabelColor: spec.formulation === "deoxy" ? "#92400E" : "#1E40AF",
    rows,
    warnings,
  };
}

export const amphotericinB: Drug = {
  name: "Amphotericin B",
  subtitle: "Fungizone / AmBisome / Ampholipad",
  infusionTime: "Fungizone 通常 ≥4 hr；AmBisome 約 2 hr（耐受後可縮短）；皆以 D5W 稀釋，避免 NS/電解質混合",
  searchTerms: [
    "amphotericin", "amphotericin b", "fungizone", "防治黴",
    "ambisome", "脂黴素", "ampholipad", "安畢黴",
    "deoxycholate", "liposomal", "lipid", "polyene", "mucor", "mucormycosis",
  ],

  needsRenal: false,
  needsWeight: true,
  needsHepatic: false,
  weightStrategy: "TBW",

  indications: [
    {
      id: "usual_range",
      label: "Usual dosage range（劑型劑量速查）",
      desc: "Fungizone 0.5-1 mg/kg；liposomal 3-5 mg/kg",
      scenarios: [
        {
          label: "常用劑量速查",
          subResults: [
            {
              formulation: "deoxy",
              label: "Fungizone（deoxycholate）",
              product: "Fungizone（防治黴）",
              doseMin: 0.5,
              doseMax: 1,
              maxDailyMg: 150,
              note: "Usual 0.5-1 mg/kg/day；範圍 0.3-1.5 mg/kg/day。可考慮 test dose 1 mg in 20 mL D5W over 20-30 min。",
            },
            {
              formulation: "liposomal",
              label: "AmBisome / Ampholipad（liposomal/lipid）",
              product: "AmBisome（脂黴素）或 Ampholipad（安畢黴）",
              doseMin: 3,
              doseMax: 5,
              capWeightAt100: true,
              note: "系統性感染通常優先選 lipid/liposomal formulation，療效相近且 nephrotoxicity/infusion reaction 較少。",
            },
          ],
        },
      ],
    },
    {
      id: "aspergillosis",
      label: "Aspergillosis, invasive（侵襲性麴菌症）",
      desc: "Azole 禁忌/不耐受/抗藥疑慮時替代",
      scenarios: [{
        label: "Invasive aspergillosis",
        note: "Voriconazole / isavuconazole 通常優先；當 triazole 禁忌、不耐受、azole-resistant Aspergillus 疑慮，或 mucor 仍在鑑別診斷時升階/改用 amphotericin。",
        subResults: [
          { formulation: "deoxy", label: "Fungizone（resource-limited alternative）", product: "Fungizone（防治黴）", doseMin: 1, doseMax: 1.5, maxDailyMg: 150, duration: "至少 6-12 週，依感染部位、病灶範圍、免疫抑制程度調整", note: "最佳劑量未定；僅在沒有其他選擇或資源限制時使用。" },
          { formulation: "liposomal", label: "AmBisome / Ampholipad（alternative）", product: "AmBisome（脂黴素）或 Ampholipad（安畢黴）", doseMin: 3, doseMax: 5, capWeightAt100: true, duration: "至少 6-12 週；CNS 感染部分專家可用到 7.5 mg/kg/day", note: "IDSA：liposomal AmB 為 invasive aspergillosis alternative。A. terreus 對 amphotericin B 通常無效。" },
        ],
      }],
    },
    {
      id: "mucormycosis",
      label: "Mucormycosis（毛黴菌症）",
      desc: "首選之一 · 需手術清創",
      scenarios: [{
        label: "Mucormycosis",
        note: "疑似 mucor 時需早期升階，不要等 culture；需合併 surgical debridement、反轉免疫抑制/控制 DKA 或高血糖。",
        subResults: [
          { formulation: "liposomal", label: "AmBisome / Ampholipad（preferred）", product: "AmBisome（脂黴素）或 Ampholipad（安畢黴）", doseMin: 5, doseMax: 10, duration: "療程通常很長，依病灶控制、免疫狀態與 step-down azole 決定", combo: "合併 surgical debridement；嚴重免疫抑制/播散性感染部分專家會合併另一抗黴菌藥，但證據有限。", note: "CNS disease 或 solid organ transplant 部分專家偏向 10 mg/kg/day。" },
        ],
      }],
    },
    {
      id: "cryptococcosis",
      label: "Cryptococcosis（隱球菌症）",
      desc: "CNS/disseminated induction · 合併 flucytosine",
      scenarios: [{
        label: "CNS / disseminated / severe pulmonary cryptococcosis",
        note: "Induction 後接 fluconazole consolidation/maintenance；CNS disease 需注意 ICP management。",
        subResults: [
          { formulation: "deoxy", label: "Fungizone（alternative）", product: "Fungizone（防治黴）", doseMin: 0.7, doseMax: 1, maxDailyMg: 150, duration: "HIV：7 天合併 flucytosine 後 fluconazole 7 天；或 ≥2 週 induction", combo: "合併 flucytosine preferred；若無法使用可合併 fluconazole。" },
          { formulation: "liposomal", label: "AmBisome / Ampholipad（preferred in resource-abundant settings）", product: "AmBisome（脂黴素）或 Ampholipad（安畢黴）", doseMin: 3, doseMax: 4, capWeightAt100: true, duration: "通常 ≥2 週；cryptococcoma 或神經併發症可能需約 6 週", combo: "合併 flucytosine preferred；resource-limited regimen 可用 liposomal amphotericin B 10 mg/kg single dose + flucytosine + fluconazole。" },
        ],
      }],
    },
    {
      id: "candidiasis_invasive",
      label: "Candidiasis, invasive（侵襲性念珠菌症，替代）",
      desc: "Intolerance/resistance · suspected azole+echinocandin resistance",
      scenarios: [{
        label: "Candidemia / disseminated candidiasis",
        note: "Echinocandin 通常為初始首選；AmB 保留給不耐受、抗藥、或 azole+echinocandin-resistant Candida 疑慮。",
        subResults: [
          { formulation: "deoxy", label: "Fungizone（alternative）", product: "Fungizone（防治黴）", doseMin: 0.5, doseMax: 0.7, maxDailyMg: 150, duration: "至少首次陰性血培後 14 天且症狀/中性球低下緩解；遠端轉移需更久", note: "C. glabrata / C. krusei 可增加至 1 mg/kg/day。" },
          { formulation: "liposomal", label: "AmBisome / Ampholipad（alternative）", product: "AmBisome（脂黴素）或 Ampholipad（安畢黴）", doseMin: 3, doseMax: 5, capWeightAt100: true, duration: "至少首次陰性血培後 14 天且症狀/中性球低下緩解", combo: "穩定、血培轉陰且 isolate susceptible 時可 step-down to fluconazole。" },
        ],
      }],
    },
    {
      id: "candida_cns_cardiac",
      label: "Candida CNS / endocarditis / cardiac device",
      desc: "常需合併 flucytosine / device removal",
      scenarios: [{
        label: "Candida deep-seated infection",
        note: "需積極 source control：CNS device 若可移除則移除；endocarditis 評估 valve surgery；cardiac device 感染需移除 entire device。",
        subResults: [
          { formulation: "liposomal", label: "CNS candidiasis", product: "AmBisome（脂黴素）或 Ampholipad（安畢黴）", doseMin: 5, duration: "數週後依 clinical/microbiological response step-down；持續至症狀、CSF/radiology 改善", combo: "可合併 flucytosine；之後 step-down to oral azole if susceptible。" },
          { formulation: "liposomal", label: "Endocarditis / cardiac device", product: "AmBisome（脂黴素）或 Ampholipad（安畢黴）", doseMin: 3, doseMax: 5, capWeightAt100: true, duration: "瓣膜置換後 ≥6 週；generator pocket 移除後 ≥4 週；wire infection 移除後 ≥6 週", combo: "with or without flucytosine；若 device/valve 不能移除，常需長期 suppression。" },
        ],
      }],
    },
    {
      id: "candida_uti",
      label: "Candida UTI（fluconazole-resistant species）",
      desc: "Fungizone only · 尿路/膀胱沖洗",
      scenarios: [{
        label: "Candiduria / cystitis / pyelonephritis / fungus ball",
        note: "Liposomal formulation 尿中濃度不足，Candida UTI 通常使用 amphotericin B deoxycholate。",
        subResults: [
          { formulation: "deoxy", label: "Cystitis / pyelonephritis", product: "Fungizone（防治黴）", doseMin: 0.3, doseMax: 0.6, maxDailyMg: 150, duration: "1-7 天；泌尿道處置前後可用數天", combo: "Fluconazole-resistant C. glabrata pyelonephritis 可 with or without flucytosine。" },
          { formulation: "deoxy", label: "Bladder irrigation", product: "Fungizone（防治黴）", fixedDose: 50, doseMin: 0, routeText: "bladder irrigation", duration: "50 mg in 1 L sterile water once daily x 5 days", note: "一般不鼓勵 bladder irrigation，尤其原本不需要 Foley 者。" },
          { formulation: "deoxy", label: "Fungus ball irrigation", product: "Fungizone（防治黴）", fixedDose: 25, fixedDoseMax: 50, doseMin: 0, routeText: "nephrostomy irrigation", duration: "25-50 mg in 200-500 mL sterile water via nephrostomy", combo: "需合併 systemic antifungal therapy 與 urologic source control。" },
        ],
      }],
    },
    {
      id: "endophthalmitis",
      label: "Endophthalmitis（眼內炎）",
      desc: "Systemic + intraocular therapy",
      scenarios: [{
        label: "Candida / Aspergillus endophthalmitis",
        note: "Vitritis 或 macular involvement 時通常需 systemic + intravitreal therapy；內眼注射由眼科執行。",
        subResults: [
          { formulation: "deoxy", label: "Intravitreal / intracameral Fungizone", product: "Fungizone（防治黴）", fixedDose: 0.005, fixedDoseMax: 0.01, doseMin: 0, routeText: "intraocular", duration: "Intravitreal 5-10 mcg/0.1 mL sterile water；intracameral 5 mcg/0.1 mL", combo: "合併 systemic antifungal；必要時數天後 repeat intravitreal dose。" },
          { formulation: "liposomal", label: "Systemic AmBisome / Ampholipad", product: "AmBisome（脂黴素）或 Ampholipad（安畢黴）", doseMin: 3, doseMax: 5, capWeightAt100: true, duration: "Candida endogenous endophthalmitis 至少 4-6 週，直到眼科檢查 resolution", note: "Candida：保留給 fluconazole/voriconazole-resistant isolates。" },
        ],
      }],
    },
    {
      id: "endemic_mycoses",
      label: "Endemic fungi（Histoplasma / Blastomyces / Coccidioides / Sporothrix / Talaromyces）",
      desc: "Moderate-severe / CNS / disseminated induction",
      scenarios: [{
        label: "Moderately severe to severe endemic mycoses",
        note: "多數為 amphotericin induction 後 step-down oral azole（常為 itraconazole；coccidioidomycosis 依部位用 azole）。",
        subResults: [
          { formulation: "deoxy", label: "Fungizone（alternative）", product: "Fungizone（防治黴）", doseMin: 0.7, doseMax: 1, maxDailyMg: 150, duration: "非 CNS 常 1-2 週至改善；CNS histoplasmosis 4-6 週", combo: "改善後 step-down to oral azole；severe coccidioidomycosis 有些專家同時開始 oral azole。" },
          { formulation: "liposomal", label: "AmBisome / Ampholipad", product: "AmBisome（脂黴素）或 Ampholipad（安畢黴）", doseMin: 3, doseMax: 5, capWeightAt100: true, duration: "Histoplasmosis disseminated/pulmonary severe：3 mg/kg/day 1-2 週；CNS/Blastomycosis CNS：5 mg/kg/day 4-6 週", combo: "Histoplasmosis acute severe pulmonary 可合併 corticosteroids；之後 oral azole consolidation。" },
        ],
      }],
    },
    {
      id: "neutropenic_fever",
      label: "Neutropenic fever（經驗性抗黴菌）",
      desc: "Persistent fever after 4-7 days antibiotics",
      scenarios: [{
        label: "Empiric antifungal therapy",
        note: "預期 neutropenia >7-10 天且廣效抗生素 >4-7 天仍 unexplained persistent fever 時考慮；需同時評估 CT、galactomannan/BDG、culture 與 mold-active prophylaxis 暴露。",
        subResults: [
          { formulation: "liposomal", label: "AmBisome / Ampholipad（alternative）", product: "AmBisome（脂黴素）或 Ampholipad（安畢黴）", doseMin: 3, doseMax: 5, capWeightAt100: true, duration: "依 neutropenia、診斷結果與臨床反應；若找到特定感染依 pathogen 調整", note: "若疑似 mucor 或 azole breakthrough mold infection，可偏向 amphotericin-based therapy。" },
        ],
      }],
    },
  ],

  calculate({ indicationData, extras, dosing_weight }) {
    const tbw: number = extras?.tbw || dosing_weight || 0;
    const ibw: number | null = extras?.ibw ?? null;
    const bmi: number | null = extras?.bmi ?? null;

    const scenarioResults = indicationData.scenarios.map((scenario: any) => {
      const subResults = scenario.subResults.map((spec: DoseSpec) => buildSubResult(spec, tbw, ibw, bmi));
      return {
        title: scenario.label,
        note: scenario.note,
        subResults,
        warnings: [
          "⚠️ Amphotericin B conventional vs lipid/liposomal formulations 不可互換；開立與調劑時需寫清楚商品名/劑型。",
          "💧 建議 preinfusion NS 500 mL-1 L（依病人容量狀態調整），並監測 SCr、K、Mg；避免併用 nephrotoxins。",
        ],
      };
    });

    return {
      scenarioResults,
      infoBox: {
        text: "Amphotericin B 是升階/救援型抗黴菌藥。若疑似 mucormycosis、azole-resistant mold、azole/echinocandin-resistant Candida、cryptococcal CNS/disseminated disease，建議及早會診 ID 並同步處理 source control。",
        bg: "#FEF3C7",
        border: "#F59E0B",
        color: "#92400E",
      },
    };
  },

  clinicalPearls: {
    title: "臨床參考",
    sections: [
      {
        heading: "劑型與院內品項",
        body:
          "• Fungizone（防治黴）：amphotericin B deoxycholate，50 mg/Vial\n" +
          "• AmBisome（脂黴素）：liposomal amphotericin B，50 mg/Vial\n" +
          "• Ampholipad（安畢黴）：lipid/liposomal amphotericin B，50 mg/Vial\n\n" +
          "Conventional 與 lipid/liposomal formulations 不可互換，mg/kg 劑量不同；錯拿劑型可能造成嚴重過量。",
      },
      {
        heading: "何時升階到 Amphotericin B",
        body:
          "• 疑似或確診 mucormycosis：不要等 culture，及早使用 liposomal amphotericin B，並合併手術清創\n" +
          "• Invasive aspergillosis 但 triazole 禁忌/不耐受、azole-resistant Aspergillus 疑慮，或 mucor 仍在鑑別診斷\n" +
          "• Candida：對 azole/echinocandin 抗藥、不耐受，或 suspected azole- and echinocandin-resistant Candida\n" +
          "• Cryptococcal CNS/disseminated/severe pulmonary disease：作為 induction regimen 核心藥物\n" +
          "• Severe endemic mycoses（Histoplasma、Blastomyces、Coccidioides、Sporothrix、Talaromyces）需 induction therapy\n" +
          "• Neutropenic fever：廣效抗生素 >4-7 天仍 unexplained persistent fever，且預期 neutropenia >7-10 天；尤其 mold-active prophylaxis breakthrough 或 mucor 疑慮",
      },
      {
        heading: "何時需合併治療 / Source control",
        body:
          "• Mucormycosis：必須積極 surgical debridement；反轉免疫抑制、控制 DKA/高血糖\n" +
          "• Cryptococcosis：amphotericin B + flucytosine preferred；之後 fluconazole consolidation/maintenance\n" +
          "• Candida CNS / endocarditis / cardiac device：liposomal AmB ± flucytosine；CNS device、valve、pacemaker/ICD/VAD 需評估移除或手術\n" +
          "• Endophthalmitis：systemic antifungal + intravitreal/intracameral amphotericin B deoxycholate（依眼科評估）\n" +
          "• Candida fungus ball：nephrostomy irrigation + systemic antifungal + urologic source control\n" +
          "• Fusariosis：部分專家建議 liposomal AmB + voriconazole，尤其免疫抑制、嚴重病灶、皮膚病灶增加或血培持續陽性\n" +
          "• Severe coccidioidomycosis：部分專家會 amphotericin B 與 oral azole 同時起始，改善後 azole monotherapy",
      },
      {
        heading: "經驗治療考量",
        body:
          "• Candida colonization（例如痰 Candida）通常不代表肺部感染，不應單獨因此升階\n" +
          "• ICU septic shock + invasive candidiasis risk factors 時，初始多以 echinocandin 優先；AmB 保留給抗藥/不耐受/不可用\n" +
          "• Breakthrough mold infection during azole prophylaxis、rhino-orbital-cerebral disease、黑色壞死病灶、DKA、hematologic malignancy、SOT/HCT：要高度懷疑 mucor，優先 liposomal AmB + 手術評估\n" +
          "• A. terreus、Scedosporium/Pseudallescheria、Candida lusitaniae 通常不可靠 amphotericin B",
      },
      {
        heading: "抗菌譜重點",
        body:
          "【通常涵蓋】Candida albicans、C. tropicalis、C. parapsilosis、C. krusei、Cryptococcus neoformans、Mucorales、Blastomyces、Coccidioides、Histoplasma、Sporothrix、Aspergillus spp.（但不含 A. terreus）\n\n" +
          "【通常不涵蓋】Aspergillus terreus、Scedosporium、Pseudallescheria、Candida lusitaniae",
      },
      {
        heading: "腎功能、輸注與監測",
        body:
          "• 腎功能不需調整；HD/PD/CRRT/SLED 不需補劑量\n" +
          "• Fungizone nephrotoxicity 較高；若治療中 AKI，可考慮改 lipid/liposomal formulation。若仍需用 Fungizone，可考慮中斷 24-48 小時後以半量恢復，但急性嚴重感染初期應避免降低暴露\n" +
          "• 給藥前 NS 500 mL-1 L 可降低 nephrotoxicity 風險（依容量狀態調整）\n" +
          "• 監測 SCr、K、Mg、CBC、infusion reaction；必要時補 K/Mg\n" +
          "• Fungizone 通常 D5W 稀釋、避免 NS/電解質混合；輸注通常 ≥4 小時。AmBisome 常約 120 分鐘，耐受後可縮短",
      },
      {
        heading: "Obesity / ECMO",
        body:
          "• Fungizone：BMI ≥30 建議用 AdjBW；嚴重感染可考慮 TBW，但毒性較高，肥胖時部分專家建議 maximum daily dose 150 mg\n" +
          "• Liposomal amphotericin B：UpToDate 可用 TBW，部分專家建議多數適應症 maximum dosing weight 100 kg；Sanford/部分資料建議肥胖可考慮 AdjBW，critically ill 可考慮 TBW\n" +
          "• ECMO：deoxycholate circuit sequestration 較少；liposomal data conflicting，嚴重感染可考慮較高劑量或改 deoxycholate，建議會診 ID/臨床藥師",
      },
      {
        heading: "資料來源",
        body:
          "• IDSA Candidiasis guideline：lipid AmB 3-5 mg/kg/day 可作 resistance/intolerance alternative；Candida endocarditis/device infection 可 ± flucytosine 並需 source control\n" +
          "• IDSA Aspergillosis guideline：voriconazole first-line；liposomal AmB/isavuconazole alternative；select documented IPA 可考慮 voriconazole + echinocandin\n" +
          "• NIH HIV OI Cryptococcosis guideline：CNS/disseminated disease induction 使用 IV amphotericin B formulation + flucytosine\n" +
          "• ESCMID/ECMM mucormycosis guidance：liposomal/lipid-complex AmB + surgical debridement，deoxycholate 不建議優先",
      },
    ],
  },
};
