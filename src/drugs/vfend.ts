import { round1 } from './shared/helpers';
import type { Drug } from './types';

// ═══════════════════════════════════════════════════════════════
// Vfend (Voriconazole)
// ═══════════════════════════════════════════════════════════════
// 院內品項：
//   IV: Vfend 針（黴飛凍晶注射劑）200 mg/Vial
//   PO: Vfend 錠（黴飛膜衣錠）200 mg/錠
//   PO: Voriconazole 錠（威剋黴膜衣錠）200 mg/錠（臨採）
//
// ⚠️ TDM 目標濃度：1–5.5 μg/mL（trough）
// ⚠️ 肥胖：UpToDate 用 AdjBW；熱病用 IBW（結果會在備註顯示熱病建議）
// ⚠️ CrCl <50：熱病建議避免 IV（vehicle SBECD 蓄積），改 PO
// ⚠️ 不具 mucormycosis 活性
export const vfend: Drug = {
  name: "Vfend",
  subtitle: "Voriconazole",
  needsRenal: true,
  needsWeight: true,
  needsHepatic: true,
  weightStrategy: "AdjBW_if_obese",
  searchTerms: [
    "vfend", "voriconazole", "triazole",
    "黴飛", "威剋黴", "antifungal",
  ],

  indications: [
    // ─── Aspergillosis ───
    {
      id: "aspergillosis_abpa",
      label: "Aspergillosis - Allergic bronchopulmonary (ABPA)",
      desc: "過敏性支氣管肺麴菌症",
      scenarios: [
        {
          label: "ABPA（類固醇無法減量或 ABPA 惡化）",
          note: "合併全身性類固醇。療程 ≥16 週。可給 loading 400 mg BID × 2 doses",
          preferred: "PO",
          po: {
            fixedDose: "200 mg BID",
            detail: "口服僅需，Loading 可選 400 mg BID × 2 doses",
            tabs: 1,   // 每次 1 錠
          },
        },
      ],
    },
    {
      id: "aspergillosis_cavitary",
      label: "Aspergillosis - Chronic cavitary pulmonary",
      desc: "慢性空洞型肺麴菌症",
      scenarios: [
        {
          label: "慢性空洞型肺麴菌症",
          note: "療程 ≥6–12 個月，部分需終生治療。虛弱或低體重（BMI <18.5）病人考慮 150 mg BID",
          preferred: "PO",
          iv: {
            loadingPerKg: { min: 6, max: 6 }, loadingDoses: 2,
            maintPerKg: { min: 4, max: 4 }, freq: "Q12H",
          },
          po: {
            fixedDose: "200–300 mg BID",
            weightBased: "3–4 mg/kg BID",
            tabsMin: 1, tabsMax: 1.5,
          },
        },
      ],
    },
    {
      id: "aspergillosis_invasive",
      label: "Aspergillosis - Invasive（侵襲性麴菌症）",
      desc: "含散播性與肺外感染",
      scenarios: [
        {
          label: "Loading Dose（負荷劑量）",
          note: "嚴重或進展性感染時，部分專家合併其他抗黴菌藥物",
          preferred: "IV",
          iv: {
            loadingPerKg: { min: 6, max: 6 }, loadingDoses: 2,
            freq: "Q12H",
            isLoading: true,
          },
        },
        {
          label: "Maintenance Dose（維持劑量）",
          note: "療程 ≥6–12 週；免疫低下病人需更長。穩定後可改 PO",
          preferred: "IV",
          iv: {
            maintPerKg: { min: 4, max: 4 }, freq: "Q12H",
          },
          po: {
            fixedDose: "200–300 mg BID",
            weightBased: "3–4 mg/kg BID",
            tabsMin: 1, tabsMax: 1.5,
          },
        },
      ],
    },

    // ─── Blastomycosis ───
    {
      id: "blastomycosis",
      label: "Blastomycosis（芽生菌病）",
      desc: "輕中度或 Amphotericin B 降階後",
      scenarios: [
        {
          label: "Loading Dose",
          preferred: "IV",
          iv: {
            loadingPerKg: { min: 6, max: 6 }, loadingDoses: 2,
            freq: "Q12H",
            isLoading: true,
          },
        },
        {
          label: "Maintenance",
          note: "療程 6–12 個月；中重度散播性、骨關節、CNS 或免疫低下 ≥12 個月",
          preferred: "IV",
          iv: {
            maintPerKg: { min: 3, max: 3 }, freq: "Q12H",
            note: "注意：此適應症 maintenance 為 3 mg/kg（非一般 4 mg/kg）",
          },
          po: {
            fixedDose: "200–400 mg BID",
            tabsMin: 1, tabsMax: 2,
          },
        },
      ],
    },

    // ─── Candidiasis ───
    {
      id: "candidemia",
      label: "Candidemia / Disseminated candidiasis",
      desc: "念珠菌血症（替代療法）",
      scenarios: [
        {
          label: "Initial therapy - Loading",
          note: "持續治療至最後一次陰性血培養後 ≥14 天且症狀緩解",
          preferred: "IV",
          iv: {
            loadingFixed_mg: 400, loadingDoses: 2,
            loadingPerKg: { min: 6, max: 6 },
            freq: "Q12H",
            isLoading: true,
          },
        },
        {
          label: "Initial therapy - Maintenance",
          preferred: "IV",
          iv: {
            maintFixed_mg_min: 200, maintFixed_mg_max: 300,
            maintPerKg: { min: 3, max: 4 },
            freq: "Q12H",
          },
          po: {
            fixedDose: "200–300 mg BID",
            weightBased: "3–4 mg/kg BID",
            tabsMin: 1, tabsMax: 1.5,
          },
        },
        {
          label: "Step-down therapy（口服降階）",
          note: "僅用於臨床穩定且血培養轉陰的病人。C. krusei 首選 voriconazole；C. glabrata 需較高劑量",
          preferred: "PO",
          po: {
            fixedDose: "200 mg BID（C. glabrata：200–300 mg BID）",
            weightBased: "3–4 mg/kg BID",
            tabsMin: 1, tabsMax: 1.5,
          },
        },
      ],
    },
    {
      id: "candida_endocarditis",
      label: "Candida endocarditis / device infection",
      desc: "口服降階療法",
      scenarios: [
        {
          label: "Step-down therapy",
          note: "僅保留給 fluconazole 抗藥但 voriconazole 敏感的菌株。裝置感染 4 週、心內膜炎 ≥6 週（術後）",
          preferred: "PO",
          po: {
            fixedDose: "200–300 mg BID",
            weightBased: "3–4 mg/kg BID",
            tabsMin: 1, tabsMax: 1.5,
          },
        },
      ],
    },
    {
      id: "candida_esophageal",
      label: "Candidiasis - Esophageal（食道念珠菌症）",
      desc: "Fluconazole 抗藥或 HIV 病人替代",
      scenarios: [
        {
          label: "食道念珠菌症",
          note: "療程 14–28 天",
          preferred: "PO",
          iv: {
            maintFixed_mg_min: 200, maintFixed_mg_max: 200,
            maintPerKg: { min: 3, max: 3 },
            freq: "Q12H",
          },
          po: {
            fixedDose: "200 mg BID",
            weightBased: "3 mg/kg BID",
            tabsMin: 1, tabsMax: 1,
          },
        },
      ],
    },
    {
      id: "candida_oropharyngeal",
      label: "Candidiasis - Oropharyngeal（口咽念珠菌症）",
      desc: "Fluconazole 抗藥替代",
      scenarios: [
        {
          label: "口咽念珠菌症",
          note: "療程最長 28 天",
          preferred: "PO",
          po: {
            fixedDose: "200 mg BID",
            tabsMin: 1, tabsMax: 1,
          },
        },
      ],
    },

    // ─── Coccidioidomycosis ───
    {
      id: "coccidioidomycosis",
      label: "Coccidioidomycosis, refractory（球黴菌病，難治性）",
      desc: "骨關節、肺部、腦膜炎",
      scenarios: [
        {
          label: "非腦膜炎感染（骨關節 / 肺部）",
          note: "療程依感染部位與免疫狀態而定；部分需終生治療",
          preferred: "PO",
          po: {
            fixedDose: "Loading 400 mg BID × 2 doses，接 200 mg BID",
            tabsMin: 1, tabsMax: 2,
          },
        },
        {
          label: "腦膜炎",
          note: "因復發率高，需終生治療",
          preferred: "PO",
          po: {
            fixedDose: "Loading 400 mg BID × 2 doses，接 200–400 mg BID",
            tabsMin: 1, tabsMax: 2,
          },
        },
      ],
    },

    // ─── Cryptococcal meningitis ───
    {
      id: "cryptococcal",
      label: "Cryptococcal meningitis（隱球菌腦膜炎）",
      desc: "Consolidation 與 Maintenance",
      scenarios: [
        {
          label: "Consolidation",
          note: "療程 8 週",
          preferred: "PO",
          po: {
            fixedDose: "200 mg BID × 8 週",
            tabsMin: 1, tabsMax: 1,
          },
        },
        {
          label: "Maintenance (Suppression)",
          note: "依免疫狀態持續約 12 個月",
          preferred: "PO",
          po: {
            fixedDose: "200 mg BID",
            tabsMin: 1, tabsMax: 1,
          },
        },
      ],
    },

    // ─── Fusariosis ───
    {
      id: "fusariosis",
      label: "Fusariosis, invasive（鐮刀菌病，侵襲性）",
      desc: "替代藥物",
      scenarios: [
        {
          label: "Loading Dose",
          note: "嚴重免疫低下或 CNS 感染建議合併其他抗黴菌藥。CNS 可能需 6 mg/kg BID 高劑量並 TDM",
          preferred: "IV",
          iv: {
            loadingPerKg: { min: 6, max: 6 }, loadingDoses: 2,
            freq: "Q12H",
            isLoading: true,
          },
        },
        {
          label: "Maintenance",
          preferred: "IV",
          iv: {
            maintPerKg: { min: 4, max: 4 }, freq: "Q12H",
          },
          po: {
            fixedDose: "200–300 mg BID",
            tabsMin: 1, tabsMax: 1.5,
          },
        },
      ],
    },

    // ─── Histoplasmosis ───
    {
      id: "histoplasmosis",
      label: "Histoplasmosis（組織胞漿菌病）",
      desc: "Itraconazole 不耐受時替代",
      scenarios: [
        {
          label: "Treatment",
          note: "輕中度肺 6–12 週；中重度肺 ≥12 週；免疫低下 / CNS / 散播性 ≥12 個月",
          preferred: "PO",
          po: {
            fixedDose: "Loading 400 mg BID × 2 doses，接 200–300 mg BID",
            tabsMin: 1, tabsMax: 2,
          },
        },
        {
          label: "Long-term suppression（次級預防，免疫低下）",
          preferred: "PO",
          po: {
            fixedDose: "200 mg BID",
            tabsMin: 1, tabsMax: 1,
          },
        },
      ],
    },

    // ─── Neutropenic fever ───
    {
      id: "neutropenicFever",
      label: "Neutropenic fever（發熱性嗜中性球低下）",
      desc: "Empiric 抗黴菌治療（替代）",
      scenarios: [
        {
          label: "Loading Dose",
          preferred: "IV",
          iv: {
            loadingPerKg: { min: 6, max: 6 }, loadingDoses: 2,
            freq: "Q12H",
            isLoading: true,
          },
        },
        {
          label: "Maintenance",
          preferred: "IV",
          iv: {
            maintPerKg: { min: 4, max: 4 }, freq: "Q12H",
          },
          po: {
            fixedDose: "200–300 mg BID",
            weightBased: "3–4 mg/kg BID",
            tabsMin: 1, tabsMax: 1.5,
          },
        },
      ],
    },

    // ─── Prophylaxis ───
    {
      id: "prophylaxisHeme",
      label: "Prophylaxis - Hematologic malignancy / HCT",
      desc: "侵襲性黴菌感染預防",
      scenarios: [
        {
          label: "預防（血液惡性或造血幹細胞移植）",
          note: "療程依免疫抑制程度而定",
          preferred: "IV",
          iv: {
            maintPerKg: { min: 4, max: 4 }, freq: "Q12H",
            note: "此適應症通常無需 loading",
          },
          po: {
            fixedDose: "200 mg BID",
            tabsMin: 1, tabsMax: 1,
          },
        },
      ],
    },
    {
      id: "prophylaxisSOT",
      label: "Prophylaxis - Solid organ transplant",
      desc: "實體器官移植後",
      scenarios: [
        {
          label: "預防（實體器官移植）",
          note: "可選 loading dose；療程依移植中心規範而定",
          preferred: "IV",
          iv: {
            loadingPerKg: { min: 6, max: 6 }, loadingDoses: 2,
            maintPerKg: { min: 4, max: 4 }, freq: "Q12H",
          },
          po: {
            fixedDose: "200 mg BID（可選 loading 400 mg BID × 2 doses）",
            tabsMin: 1, tabsMax: 1,
          },
        },
      ],
    },

    // ─── Scedosporiosis ───
    {
      id: "scedosporiosis",
      label: "Scedosporiosis（賽多孢子菌病）",
      desc: "",
      scenarios: [
        {
          label: "Loading Dose",
          preferred: "IV",
          iv: {
            loadingPerKg: { min: 6, max: 6 }, loadingDoses: 2,
            freq: "Q12H",
            isLoading: true,
          },
        },
        {
          label: "Maintenance",
          note: "療程通常較長，依臨床反應與免疫狀態而定",
          preferred: "IV",
          iv: {
            maintPerKg: { min: 4, max: 4 }, freq: "Q12H",
          },
          po: {
            fixedDose: "Loading 400 mg BID × 2 doses，接 200–300 mg BID",
            tabsMin: 1, tabsMax: 1.5,
          },
        },
      ],
    },

    // ─── Talaromycosis ───
    {
      id: "talaromycosis",
      label: "Talaromycosis（塔拉羅黴菌病，原 Penicilliosis）",
      desc: "替代藥物",
      scenarios: [
        {
          label: "輕度感染 - Induction",
          note: "僅用於有皮膚病灶但無黴菌血症。12 週後接 maintenance",
          preferred: "PO",
          po: {
            fixedDose: "Loading 400 mg BID × 2 doses，接 200 mg BID × 12 週",
            tabsMin: 1, tabsMax: 2,
          },
        },
        {
          label: "中重度 - Induction（無法用 Amphotericin B）",
          note: "療程 2 週後接 consolidation",
          preferred: "IV",
          iv: {
            loadingPerKg: { min: 6, max: 6 }, loadingDoses: 2,
            maintPerKg: { min: 4, max: 4 }, freq: "Q12H",
          },
          po: {
            fixedDose: "Loading 600 mg BID × 2 doses，接 400 mg Q12H × 2 週",
            tabsMin: 2, tabsMax: 3,
          },
        },
        {
          label: "Consolidation",
          note: "接續 induction 後 10 週",
          preferred: "PO",
          po: {
            fixedDose: "200 mg BID × 10 週",
            tabsMin: 1, tabsMax: 1,
          },
        },
        {
          label: "Chronic maintenance（次級預防）",
          note: "HIV 病人需 CD4 ≥100 且病毒抑制 ≥6 個月才停藥",
          preferred: "PO",
          po: {
            fixedDose: "200 mg BID",
            tabsMin: 1, tabsMax: 1,
          },
        },
      ],
    },
  ],

  extraFields: [],

  calculate({ dosing_weight, crcl, rrt, hepatic, indicationData }) {
    // ── 肝功能調整 factor（依熱病 PK 研究建議）──
    // Normal：無調整
    // Child-Pugh A/B：Loading 標準 + Maintenance 50%
    // Child-Pugh C：Loading 50% + Maintenance 25%
    const hepFactor = (() => {
      if (hepatic === "A" || hepatic === "B") {
        return { loadF: 1, maintF: 0.5, note: `Child-Pugh ${hepatic}：Loading 標準、Maintenance 50%（熱病建議）` };
      } else if (hepatic === "C") {
        return { loadF: 0.5, maintF: 0.25, note: "Child-Pugh C：Loading 50%、Maintenance 25%（熱病 PK 研究）" };
      }
      // normal 或未選
      return { loadF: 1, maintF: 1, note: null };
    })();

    // ── IV vehicle 警告（CrCl <50 時）──
    const ivVehicleWarning = (rrt === "none" && crcl > 0 && crcl < 50)
      ? "⚠️ 熱病建議：CrCl <50 避免 IV 劑型（vehicle SBECD 蓄積風險）。建議改用 PO 劑型"
      : null;

    // ── Helper：把原始 mg 數取整到最接近的半支（100 mg 倍數 = 0.5 支）──
    const roundToHalfVial = (mg: number) => Math.round(mg / 100) * 100;

    // ── Helper：組出「適應症常規劑量」文字（描述 UpToDate 原始建議，不含調整）──
    const buildUsualDoseLabel = (sc: any) => {
      const parts: any[] = [];
      if (sc.iv) {
        const ivParts: any[] = [];
        if (sc.iv.loadingPerKg) {
          const L = sc.iv.loadingPerKg.min === sc.iv.loadingPerKg.max
            ? `${sc.iv.loadingPerKg.min} mg/kg`
            : `${sc.iv.loadingPerKg.min}–${sc.iv.loadingPerKg.max} mg/kg`;
          ivParts.push(`${L} ${sc.iv.freq} × ${sc.iv.loadingDoses} doses`);
        }
        if (sc.iv.loadingFixed_mg) {
          ivParts.push(`或 ${sc.iv.loadingFixed_mg} mg ${sc.iv.freq} × ${sc.iv.loadingDoses} doses`);
        }
        if (sc.iv.maintPerKg) {
          const M = sc.iv.maintPerKg.min === sc.iv.maintPerKg.max
            ? `${sc.iv.maintPerKg.min} mg/kg`
            : `${sc.iv.maintPerKg.min}–${sc.iv.maintPerKg.max} mg/kg`;
          const prefix = sc.iv.loadingPerKg ? "then " : "";
          ivParts.push(`${prefix}${M} ${sc.iv.freq}`);
        }
        if (sc.iv.maintFixed_mg_min) {
          const MF = sc.iv.maintFixed_mg_min === sc.iv.maintFixed_mg_max
            ? `${sc.iv.maintFixed_mg_min} mg`
            : `${sc.iv.maintFixed_mg_min}–${sc.iv.maintFixed_mg_max} mg`;
          ivParts.push(`或 ${MF} ${sc.iv.freq}`);
        }
        if (ivParts.length) parts.push(`IV: ${ivParts.join(", ")}`);
      }
      if (sc.po) {
        const poParts = [sc.po.fixedDose];
        if (sc.po.weightBased) poParts.push(`或 ${sc.po.weightBased}`);
        parts.push(`PO: ${poParts.join(" ")}`);
      }
      return parts.join("｜");
    };

    const scenarioResults = indicationData.scenarios.map((sc: any) => {
      const result = {
        title: sc.label,
        note: sc.note,
        preferred: sc.preferred,
        subResults: [] as any[],
      };

      // ── IV ──
      if (sc.iv) {
        const ivRows: any[] = [];
        const ivWarnings: any[] = [];

        // 最上面顯示適應症常規劑量
        ivRows.push({ label: "適應症常規劑量", value: buildUsualDoseLabel(sc) });

        // Loading dose（weight-based）
        if (sc.iv.loadingPerKg) {
          const load_min_raw = dosing_weight * sc.iv.loadingPerKg.min * hepFactor.loadF;
          const load_max_raw = dosing_weight * sc.iv.loadingPerKg.max * hepFactor.loadF;
          const load_min = roundToHalfVial(load_min_raw);
          const load_max = roundToHalfVial(load_max_raw);
          const vialMin = load_min / 200;
          const vialMax = load_max / 200;

          const loadStr = load_min === load_max
            ? `${load_min} mg`
            : `${load_min} – ${load_max} mg`;
          const vialStr = vialMin === vialMax ? `${vialMin} 支` : `${vialMin}–${vialMax} 支`;
          const rawStr = load_min_raw === load_max_raw
            ? `原始計算 ${round1(load_min_raw)} mg`
            : `原始計算 ${round1(load_min_raw)}–${round1(load_max_raw)} mg`;

          ivRows.push({
            label: "Loading Dose",
            value: `${loadStr} IV × ${sc.iv.loadingDoses} doses（${vialStr} Vfend / 劑）`,
            highlight: true,
          });
          ivRows.push({ label: "取整依據", value: `${rawStr}，取整到最近的半支（100 mg 倍數）` });
          ivRows.push({ label: "頻率", value: sc.iv.freq });
        }

        // Loading fixed (candidemia only) - alternative
        if (sc.iv.loadingFixed_mg) {
          const adjLoad = sc.iv.loadingFixed_mg * hepFactor.loadF;
          ivRows.push({
            label: "── 固定劑量替代方案 ──",
            value: "",
          });
          ivRows.push({
            label: "Loading（固定劑量）",
            value: `${adjLoad} mg IV × ${sc.iv.loadingDoses} doses（${Math.ceil(adjLoad / 200)} 支 Vfend）`,
          });
        }

        // Maintenance dose（weight-based）
        if (sc.iv.maintPerKg) {
          const maint_min_raw = dosing_weight * sc.iv.maintPerKg.min * hepFactor.maintF;
          const maint_max_raw = dosing_weight * sc.iv.maintPerKg.max * hepFactor.maintF;
          const maint_min = roundToHalfVial(maint_min_raw);
          const maint_max = roundToHalfVial(maint_max_raw);
          const vialMin = maint_min / 200;
          const vialMax = maint_max / 200;

          const maintStr = maint_min === maint_max
            ? `${maint_min} mg`
            : `${maint_min} – ${maint_max} mg`;
          const vialStr = vialMin === vialMax ? `${vialMin} 支` : `${vialMin}–${vialMax} 支`;
          const rawStr = maint_min_raw === maint_max_raw
            ? `原始計算 ${round1(maint_min_raw)} mg`
            : `原始計算 ${round1(maint_min_raw)}–${round1(maint_max_raw)} mg`;

          ivRows.push({
            label: sc.iv.loadingPerKg ? "Maintenance Dose" : "建議劑量",
            value: `${maintStr} IV（${vialStr} Vfend / 劑）`,
            highlight: true,
          });
          ivRows.push({ label: "取整依據", value: `${rawStr}，取整到最近的半支（100 mg 倍數）` });
          if (!sc.iv.loadingPerKg) ivRows.push({ label: "頻率", value: sc.iv.freq });
        }

        // Maintenance fixed - alternative
        if (sc.iv.maintFixed_mg_min) {
          const adjMin = sc.iv.maintFixed_mg_min * hepFactor.maintF;
          const adjMax = sc.iv.maintFixed_mg_max * hepFactor.maintF;
          const mFixStr = adjMin === adjMax ? `${adjMin} mg` : `${adjMin}–${adjMax} mg`;
          ivRows.push({
            label: "Maintenance（固定劑量替代）",
            value: `${mFixStr} IV ${sc.iv.freq}`,
          });
        }

        if (sc.iv.note) ivRows.push({ label: "備註", value: sc.iv.note });
        if (hepFactor.note) ivWarnings.push(hepFactor.note);
        if (ivVehicleWarning) ivWarnings.push(ivVehicleWarning);

        result.subResults.push({
          route: "IV",
          isPreferred: sc.preferred === "IV",
          rows: ivRows,
          warnings: ivWarnings,
        });
      }

      // ── PO ──
      if (sc.po) {
        const poRows: any[] = [];
        const poWarnings: any[] = [];

        // 最上面顯示適應症常規劑量
        poRows.push({ label: "適應症常規劑量", value: buildUsualDoseLabel(sc) });

        poRows.push({ label: "建議劑量", value: sc.po.fixedDose, highlight: true });
        if (sc.po.weightBased) {
          poRows.push({ label: "或體重計算", value: sc.po.weightBased });
        }

        // 院內錠數（依 fixedDose 固定值）
        if (sc.po.tabsMin != null) {
          const tabStr = sc.po.tabsMin === sc.po.tabsMax
            ? `${sc.po.tabsMin} 錠`
            : `${sc.po.tabsMin}–${sc.po.tabsMax} 錠`;
          poRows.push({ label: "院內品項", value: `${tabStr} Vfend 錠 / 威剋黴（每錠 200 mg）` });
        }

        // 肝功能備註（PO 也需調整）
        if (hepFactor.note) {
          poWarnings.push(`${hepFactor.note}。實際 PO 劑量請依 TDM 調整`);
        }

        if (sc.po.detail) poRows.push({ label: "說明", value: sc.po.detail });

        result.subResults.push({
          route: "PO",
          isPreferred: sc.preferred === "PO",
          rows: poRows,
          warnings: poWarnings,
        });
      }

      return result;
    });

    return {
      scenarioResults,
      infoBox: {
        text: "💊 TDM 目標 trough 濃度 1–5.5 μg/mL｜⚠️ 不具 mucormycosis 活性｜🔄 PO 與 IV 可互換、穩定後改 PO｜⚖️ UpToDate 肥胖用 AdjBW，熱病建議 IBW",
        bg: "#EFF6FF", border: "#93C5FD", color: "#1E40AF",
      },
    };
  },
};
