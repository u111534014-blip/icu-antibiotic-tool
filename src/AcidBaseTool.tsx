import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

const ACCENT = "#0D9488";
const ROLIKAN_MEQ_PER_ML = 0.83;
const ROLIKAN_ML_PER_AMP = 20;
const ROLIKAN_MEQ_PER_AMP = 16.66;
const ROLIKAN_BOT_ML = 250;
const ROLIKAN_BOT_MEQ = ROLIKAN_MEQ_PER_ML * ROLIKAN_BOT_ML;

type Tab = "abg" | "bicarb" | "study";
type Duration = "acute" | "chronic" | "unknown";
type VolumeStatus = "shock" | "euvolemic" | "overload" | "unknown";

function n(value: string) {
  return parseFloat(value) || 0;
}

function hasValue(value: string) {
  return value.trim() !== "" && Number.isFinite(parseFloat(value));
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function rangeText(center: number, width: number, unit = "") {
  return `${round(center - width)}-${round(center + width)}${unit}`;
}

function pHStatus(pH: number) {
  if (!pH) return "請輸入 pH";
  if (pH < 7.35) return "Acidemia";
  if (pH > 7.45) return "Alkalemia";
  return "pH 接近正常：仍可能是 mixed disorder";
}

function agStatus(agCorr: number) {
  if (!agCorr) return "請輸入 Na / Cl / HCO3";
  if (agCorr > 30) return "Marked high anion gap";
  if (agCorr > 12) return "High anion gap";
  return "Normal anion gap";
}

function deltaInterpretation(deltaRatio: number) {
  if (!Number.isFinite(deltaRatio) || deltaRatio <= 0) return "不適用或資料不足";
  if (deltaRatio < 0.4) return "NAGMA 為主，或 HAGMA 合併明顯 bicarbonate loss";
  if (deltaRatio < 0.8) return "HAGMA + NAGMA mixed disorder";
  if (deltaRatio <= 2) return "大致符合單純 HAGMA";
  return "HAGMA + metabolic alkalosis，或慢性 respiratory acidosis 代償";
}

function primaryDisorder(pH: number, pco2: number, hco3: number) {
  if (!pH || !pco2 || !hco3) return "請輸入 pH / PaCO2 / HCO3";

  const acidemia = pH < 7.35;
  const alkalemia = pH > 7.45;
  const lowHco3 = hco3 < 22;
  const highHco3 = hco3 > 26;
  const lowPco2 = pco2 < 35;
  const highPco2 = pco2 > 45;

  if (acidemia) {
    if (lowHco3 && highPco2) return "Mixed metabolic acidosis + respiratory acidosis";
    if (lowHco3) return "Primary metabolic acidosis";
    if (highPco2) return "Primary respiratory acidosis";
    return "Acidemia，但 HCO3/PaCO2 不典型，請確認資料或 mixed disorder";
  }

  if (alkalemia) {
    if (highHco3 && lowPco2) return "Mixed metabolic alkalosis + respiratory alkalosis";
    if (highHco3) return "Primary metabolic alkalosis";
    if (lowPco2) return "Primary respiratory alkalosis";
    return "Alkalemia，但 HCO3/PaCO2 不典型，請確認資料或 mixed disorder";
  }

  if (lowHco3 && lowPco2) return "pH normal with metabolic acidosis + respiratory compensation，或 mixed disorder";
  if (highHco3 && highPco2) return "pH normal with respiratory acidosis / metabolic alkalosis pattern，需看病程與代償";
  if (lowHco3 && highPco2) return "pH normal 但兩者都往酸方向：mixed acidosis 需警覺";
  if (highHco3 && lowPco2) return "pH normal 但兩者都往鹼方向：mixed alkalosis 需警覺";
  return "pH、PaCO2、HCO3 大致在常見範圍";
}

function compensationSummary(pco2: number, hco3: number, duration: Duration) {
  if (!pco2 || !hco3) {
    return {
      title: "資料不足",
      expected: "-",
      interpretation: "請輸入 PaCO2 與 HCO3",
    };
  }

  if (hco3 < 22) {
    const expected = 1.5 * hco3 + 8;
    const low = expected - 2;
    const high = expected + 2;
    const interpretation = pco2 > high
      ? "PaCO2 高於 Winter formula：合併 respiratory acidosis / ventilation 不足"
      : pco2 < low
        ? "PaCO2 低於 Winter formula：合併 respiratory alkalosis / 過度換氣"
        : "PaCO2 符合 Winter formula：呼吸代償大致合理";
    return {
      title: "Metabolic acidosis compensation",
      expected: `Expected PaCO2 = 1.5 x HCO3 + 8 ±2 = ${rangeText(expected, 2, " mmHg")}`,
      interpretation,
    };
  }

  if (hco3 > 26) {
    const expected = 40 + 0.7 * (hco3 - 24);
    const interpretation = pco2 > expected + 5
      ? "PaCO2 高於預期：合併 respiratory acidosis"
      : pco2 < expected - 5
        ? "PaCO2 低於預期：合併 respiratory alkalosis"
        : "PaCO2 符合 metabolic alkalosis 的呼吸代償";
    return {
      title: "Metabolic alkalosis compensation",
      expected: `Expected PaCO2 ≈ 40 + 0.7 x (HCO3 - 24) ±5 = ${rangeText(expected, 5, " mmHg")}`,
      interpretation,
    };
  }

  if (pco2 > 45) {
    const delta = (pco2 - 40) / 10;
    const acute = 24 + delta;
    const chronic = 24 + 3.5 * delta;
    const chosen = duration === "acute" ? acute : duration === "chronic" ? chronic : null;
    const interpretation = chosen
      ? hco3 < chosen - 3
        ? "HCO3 低於預期：合併 metabolic acidosis"
        : hco3 > chosen + 3
          ? "HCO3 高於預期：合併 metabolic alkalosis"
          : "HCO3 與所選病程的 respiratory acidosis 代償大致相符"
      : "若急性 respiratory acidosis，HCO3 約每 PaCO2 +10 上升 1；慢性約上升 3-4。請依病程選擇。";
    return {
      title: "Respiratory acidosis compensation",
      expected: `Acute HCO3 ≈ ${round(acute)} mEq/L；Chronic HCO3 ≈ ${round(chronic)} mEq/L`,
      interpretation,
    };
  }

  if (pco2 < 35) {
    const delta = (40 - pco2) / 10;
    const acute = 24 - 2 * delta;
    const chronic = 24 - 5 * delta;
    const chosen = duration === "acute" ? acute : duration === "chronic" ? chronic : null;
    const interpretation = chosen
      ? hco3 < chosen - 3
        ? "HCO3 低於預期：合併 metabolic acidosis"
        : hco3 > chosen + 3
          ? "HCO3 高於預期：合併 metabolic alkalosis"
          : "HCO3 與所選病程的 respiratory alkalosis 代償大致相符"
      : "若急性 respiratory alkalosis，HCO3 約每 PaCO2 -10 下降 2；慢性約下降 4-5。請依病程選擇。";
    return {
      title: "Respiratory alkalosis compensation",
      expected: `Acute HCO3 ≈ ${round(acute)} mEq/L；Chronic HCO3 ≈ ${round(chronic)} mEq/L`,
      interpretation,
    };
  }

  return {
    title: "Compensation",
    expected: "PaCO2/HCO3 未明顯偏離常見範圍",
    interpretation: "若臨床仍懷疑酸鹼異常，可重複 ABG/VBG 或補齊電解質、albumin、lactate。",
  };
}

function ResultRow({ label, value, note, highlight = false }: { label: string; value: string; note?: string; highlight?: boolean }) {
  return (
    <div style={{ ...S.resultRow, ...(highlight ? S.resultRowHighlight : {}) }}>
      <div>
        <div style={S.resultLabel}>{label}</div>
        {note && <div style={S.resultNote}>{note}</div>}
      </div>
      <strong style={S.resultValue}>{value}</strong>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label>
      <span style={S.label}>{label}</span>
      {children}
      {hint && <div style={S.fieldHint}>{hint}</div>}
    </label>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul style={S.bulletList}>
      {items.map((item) => <li key={item} style={S.bulletItem}>{item}</li>)}
    </ul>
  );
}

function StudyCard({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} style={S.studyCard}>
      <summary style={S.studySummary}>{title}</summary>
      <div style={S.studyBody}>{children}</div>
    </details>
  );
}

export default function AcidBaseTool() {
  const [tab, setTab] = useState<Tab>("abg");
  const [pH, setPH] = useState("7.25");
  const [pco2, setPco2] = useState("30");
  const [hco3, setHco3] = useState("14");
  const [na, setNa] = useState("140");
  const [cl, setCl] = useState("106");
  const [albumin, setAlbumin] = useState("3.0");
  const [lactate, setLactate] = useState("4");
  const [glucose, setGlucose] = useState("120");
  const [bun, setBun] = useState("20");
  const [measuredOsm, setMeasuredOsm] = useState("");
  const [duration, setDuration] = useState<Duration>("unknown");
  const [weight, setWeight] = useState("60");
  const [targetHco3, setTargetHco3] = useState("16");
  const [volumeStatus, setVolumeStatus] = useState<VolumeStatus>("unknown");
  const [severeHyperK, setSevereHyperK] = useState(false);
  const [renalFailure, setRenalFailure] = useState(false);

  const calc = useMemo(() => {
    const ph = n(pH);
    const co2 = n(pco2);
    const bic = n(hco3);
    const sodium = n(na);
    const chloride = n(cl);
    const hasAlbumin = hasValue(albumin);
    const hasLactate = hasValue(lactate);
    const hasGlucose = hasValue(glucose);
    const hasBun = hasValue(bun);
    const hasMeasuredOsm = hasValue(measuredOsm);
    const alb = hasAlbumin ? n(albumin) : 4;
    const lac = n(lactate);
    const glu = n(glucose);
    const urea = n(bun);
    const osm = n(measuredOsm);
    const wt = n(weight);
    const target = n(targetHco3);

    const ag = sodium && chloride && bic ? sodium - chloride - bic : 0;
    const agCorr = ag ? ag + 2.5 * (4 - alb) : 0;
    const deltaAg = agCorr > 12 ? agCorr - 12 : 0;
    const deltaHco3 = bic < 24 ? 24 - bic : 0;
    const deltaRatio = deltaAg > 0 && deltaHco3 > 0 ? deltaAg / deltaHco3 : 0;
    const osmCalc = sodium && hasGlucose && hasBun ? 2 * sodium + glu / 18 + urea / 2.8 : 0;
    const osmGap = hasMeasuredOsm && osmCalc ? osm - osmCalc : 0;
    const bicarbDeficit = wt && target > bic ? 0.5 * wt * (target - bic) : 0;
    const rolMl = bicarbDeficit / ROLIKAN_MEQ_PER_ML;
    const rolAmp = bicarbDeficit / ROLIKAN_MEQ_PER_AMP;
    const comp = compensationSummary(co2, bic, duration);
    const metAcidosisExpectedPco2 = bic < 22 ? 1.5 * bic + 8 : 0;
    const metAlkalosisExpectedPco2 = bic > 26 ? 40 + 0.7 * (bic - 24) : 0;
    const mixedRespAcidosisByMetAcidosis = Boolean(bic < 22 && co2 && co2 > metAcidosisExpectedPco2 + 2);
    const mixedRespAlkalosisByMetAcidosis = Boolean(bic < 22 && co2 && co2 < metAcidosisExpectedPco2 - 2);
    const mixedRespAcidosisByMetAlkalosis = Boolean(bic > 26 && co2 && co2 > metAlkalosisExpectedPco2 + 5);
    const mixedRespAlkalosisByMetAlkalosis = Boolean(bic > 26 && co2 && co2 < metAlkalosisExpectedPco2 - 5);
    const agCauseNote = agCorr > 12
      ? "High AG：優先想 lactate/shock/sepsis、ketoacidosis、renal failure/uremia、toxin（methanol/ethylene glycol/propylene glycol）、salicylate、5-oxoproline。"
      : bic < 22
        ? "Normal AG metabolic acidosis：常見 diarrhea/腸液流失、RTA、早期 renal failure、大量 NS、acetazolamide；可看 urine anion gap/osm gap 協助分 GI vs renal。"
        : "AG 正常且 HCO3 未明顯偏低時，通常不支持 metabolic acidosis；仍需看 albumin 是否很低。";
    const deltaCauseNote = deltaRatio > 0
      ? deltaRatio < 0.4
        ? "Delta 很低：偏 NAGMA，或 HAGMA 同時合併大量 bicarbonate loss，例如 diarrhea/RTA/大量 NS。"
        : deltaRatio < 0.8
          ? "Delta 偏低：HAGMA + NAGMA mixed disorder，很常見於 sepsis/AKI 同時大量 NS 或 diarrhea。"
          : deltaRatio <= 2
            ? "Delta 0.8-2：大致符合單純 HAGMA，但仍要對照臨床。"
            : "Delta >2：HAGMA 合併 metabolic alkalosis，或慢性 respiratory acidosis 的 HCO3 原本就高。"
      : "只有 corrected AG 升高且 HCO3 下降時，delta ratio 才有判讀價值。";
    const osmCauseNote = hasMeasuredOsm
      ? osmGap > 20
        ? "Osmolar gap 明顯升高：若合併 high AG acidosis，需高度懷疑 toxic alcohol，及早找毒物/腎臟科。"
        : osmGap > 10
          ? "Osmolar gap 輕度升高：可見 ethanol、mannitol、propylene glycol、早期 toxic alcohol；需看病史與趨勢。"
          : "Osmolar gap 未明顯升高；但 toxic alcohol 晚期 osm gap 可下降，不能單靠一次數值排除。"
      : "若懷疑 toxic alcohol、原因不明 high AG acidosis 或意識改變，可補 measured serum Osm 算 osmolar gap。";

    const safetyNotes: string[] = [];
    if (ph && ph <= 7.1) safetyNotes.push("pH <=7.10：若病人不穩、嚴重酸血症、renal failure 或高血鉀，需及早請 ICU/nephrology 評估。");
    if (agCorr > 12 && hasLactate && lac < 2) safetyNotes.push("High AG 但 lactate 不高：請想 ketoacidosis、renal failure、toxin、salicylate 等。");
    if (agCorr > 12 && !hasLactate) safetyNotes.push("High AG 但 lactate 未填：若臨床懷疑 sepsis/shock/ischemia，建議補 lactate。");
    if (hasMeasuredOsm && osmGap > 10) safetyNotes.push("Osmolar gap >10：若合併 high AG acidosis，需警覺 toxic alcohol。");
    if (severeHyperK) safetyNotes.push("合併高血鉀時，NaHCO3 只是輔助；保護心肌、移鉀與排鉀要同步。");
    if (volumeStatus === "overload") safetyNotes.push("水腫/肺水腫或少尿時，NaHCO3 sodium/volume load 需謹慎，可能需 RRT。");
    if (mixedRespAcidosisByMetAcidosis) safetyNotes.push("Metabolic acidosis 合併 PaCO2 高於 Winter formula 預期：代表通氣代償不足或合併 respiratory acidosis，pH 可能快速惡化，需優先評估 ventilation/airway/呼吸器設定。");
    const likelyDka = bic < 18 && agCorr > 12 && hasGlucose && glu >= 250;
    const likelyLactic = agCorr > 12 && hasLactate && lac >= 2;
    const considerToxinRenal = agCorr > 12 && (!hasLactate || lac < 2) && (!hasGlucose || glu < 250);
    const likelyNagma = bic < 22 && agCorr <= 12;
    const likelyRespAcidosis = co2 > 45 || mixedRespAcidosisByMetAcidosis || mixedRespAcidosisByMetAlkalosis;
    const likelyRespAlkalosis = co2 < 35 || mixedRespAlkalosisByMetAcidosis || mixedRespAlkalosisByMetAlkalosis;
    const primaryByCompensation = mixedRespAcidosisByMetAcidosis
      ? "Metabolic acidosis + mixed respiratory acidosis / ventilation 不足"
      : mixedRespAlkalosisByMetAcidosis
        ? "Metabolic acidosis + mixed respiratory alkalosis / 過度換氣"
        : mixedRespAcidosisByMetAlkalosis
          ? "Metabolic alkalosis + mixed respiratory acidosis"
          : mixedRespAlkalosisByMetAlkalosis
            ? "Metabolic alkalosis + mixed respiratory alkalosis"
            : primaryDisorder(ph, co2, bic);
    const routeHints: { title: string; reason: string; priority: "high" | "medium" | "low" }[] = [];
    if (bic < 22) {
      if (agCorr > 12) {
        routeHints.push({ title: "先走 High anion gap metabolic acidosis 路線", reason: `HCO3 ${round(bic)} 偏低且 corrected AG ${round(agCorr)} 偏高。接著用 lactate、glucose/ketone、renal function、osmolar gap/毒物線索分流。`, priority: "high" });
      } else if (agCorr) {
        routeHints.push({ title: "先走 Normal anion gap metabolic acidosis 路線", reason: `HCO3 ${round(bic)} 偏低，但 corrected AG ${round(agCorr)} 未升高。優先想 diarrhea/腸液流失、RTA、大量 NS 或 early renal failure。`, priority: "high" });
      } else {
        routeHints.push({ title: "先補 Na / Cl，再判斷 AG 路線", reason: "HCO3 偏低，但 Na/Cl/HCO3 資料不足，暫時無法分 high AG 或 normal AG。", priority: "medium" });
      }
    }
    if (likelyDka) {
      routeHints.push({ title: "DKA / mixed DKA-HHS 路線優先", reason: `High AG + HCO3 ${round(bic)} + glucose ${round(glu)}，請補 ketone/beta-hydroxybutyrate 與 K，處置以 fluids/K/insulin 為主。`, priority: "high" });
    }
    if (likelyLactic) {
      routeHints.push({ title: "Lactic acidosis / shock / sepsis 路線優先", reason: `Lactate ${round(lac)} 升高，請優先看 perfusion、source control、氧合、感染與 shock 處置。`, priority: "high" });
    }
    if (considerToxinRenal) {
      routeHints.push({ title: "Toxin / renal failure / salicylate 路線", reason: "High AG 但目前沒有 lactate 或 glucose 線索足以解釋，請補 ketone、Cr/BUN、salicylate、measured Osm/osmolar gap。", priority: "medium" });
    }
    if (likelyRespAcidosis) {
      routeHints.push({
        title: "同時看 Respiratory acidosis 路線",
        reason: mixedRespAcidosisByMetAcidosis
          ? `HCO3 ${round(bic)} 時 Winter formula 預期 PaCO2 約 ${rangeText(metAcidosisExpectedPco2, 2, " mmHg")}，但實測 ${round(co2)}：代償不夠，請檢查通氣不足、鎮靜/opioid、COPD/asthma、airway 或呼吸器設定。`
          : mixedRespAcidosisByMetAlkalosis
            ? `Metabolic alkalosis 預期 PaCO2 約 ${rangeText(metAlkalosisExpectedPco2, 5, " mmHg")}，但實測 ${round(co2)} 更高：需同步看通氣不足原因。`
            : `PaCO2 ${round(co2)} 偏高，需檢查通氣不足、鎮靜/opioid、COPD/asthma、airway 或呼吸器設定。`,
        priority: "high",
      });
    }
    if (likelyRespAlkalosis) {
      routeHints.push({
        title: "同時看 Respiratory alkalosis 路線",
        reason: mixedRespAlkalosisByMetAcidosis
          ? `HCO3 ${round(bic)} 時 Winter formula 預期 PaCO2 約 ${rangeText(metAcidosisExpectedPco2, 2, " mmHg")}，但實測 ${round(co2)} 更低：合併過度換氣，常見 sepsis、疼痛焦慮、hypoxemia、PE、肝病或 salicylate early phase。`
          : mixedRespAlkalosisByMetAlkalosis
            ? `Metabolic alkalosis 預期 PaCO2 約 ${rangeText(metAlkalosisExpectedPco2, 5, " mmHg")}，但實測 ${round(co2)} 更低：需同步看 respiratory alkalosis 原因。`
            : `PaCO2 ${round(co2)} 偏低，常見 sepsis、疼痛焦慮、hypoxemia、PE、肝病或 salicylate early phase。`,
        priority: "high",
      });
    }
    if (routeHints.length === 0) {
      routeHints.push({ title: "先補資料或看趨勢", reason: "目前資料沒有明顯指向單一路徑；建議回頭確認 pH/PaCO2/HCO3、Na/Cl、lactate、glucose/ketone、renal function 與病人狀態。", priority: "low" });
    }
    const nextSteps: string[] = [];
    if (likelyDka) {
      nextSteps.push("DKA / mixed DKA-HHS 可能：抽 beta-hydroxybutyrate/urine ketone、serum Osm，先補 isotonic crystalloid，K <3.5 先補 K 並暫緩 insulin；K >=3.5 後以 regular insulin infusion 0.1 units/kg/hr，glucose <250 後加 D5/D10 並持續 insulin 到 ketoacidosis resolution。");
    }
    if (likelyLactic) {
      nextSteps.push("Lactic acidosis：優先找 shock/sepsis/hypoxemia/ischemia/seizure/藥物；處理 perfusion、氧合、source control 與感染治療。NaHCO3 多為 bridge，核心仍是逆轉原因。");
    }
    if (considerToxinRenal) {
      nextSteps.push("High AG 但 lactate/glucose 不高：補 creatinine/BUN、ketone、salicylate level、measured Osm/osmolar gap；有毒物疑慮時及早 toxicology/nephrology。");
    }
    if (likelyNagma) {
      nextSteps.push("NAGMA：看 diarrhea/ileostomy/NG drainage、大量 NS、acetazolamide、RTA。可補 urine Na/K/Cl 算 urine anion gap；若是 bicarbonate loss，補 bicarbonate 較合理。");
    }
    if (likelyRespAcidosis) {
      nextSteps.push(mixedRespAcidosisByMetAcidosis
        ? "Mixed disorder：PaCO2 高於 Winter formula 預期，代表 metabolic acidosis 的呼吸代償不夠。請優先檢查 ventilation：鎮靜/opioid、airway obstruction、COPD/asthma、呼吸肌疲乏與 ventilator minute ventilation。"
        : "Respiratory acidosis：檢查通氣不足原因，包含鎮靜/opioid、airway obstruction、COPD/asthma、呼吸肌疲乏與 ventilator minute ventilation。");
    }
    if (likelyRespAlkalosis) {
      nextSteps.push(mixedRespAlkalosisByMetAcidosis
        ? "Mixed disorder：PaCO2 低於 Winter formula 預期，代表 metabolic acidosis 合併過度換氣。請檢查 sepsis、疼痛焦慮、hypoxemia、PE、肝病、salicylate early phase；不要只用鎮靜把呼吸壓下來。"
        : "Respiratory alkalosis：檢查 sepsis、疼痛焦慮、hypoxemia、PE、肝病、salicylate early phase；不要只用鎮靜把呼吸壓下來。");
    }
    if (nextSteps.length === 0) {
      nextSteps.push("目前沒有明顯單一路徑；請對照病人狀態、重抽趨勢、藥物/輸液、renal function、lactate/ketone 與呼吸器設定。");
    }

    return {
      ph, co2, bic, sodium, chloride, alb, lac, glu, urea, osm, hasAlbumin, hasLactate, hasGlucose, hasBun, hasMeasuredOsm, ag, agCorr, deltaAg, deltaHco3,
      deltaRatio, osmCalc, osmGap, bicarbDeficit, rolMl, rolAmp, comp,
      primary: primaryByCompensation,
      phText: pHStatus(ph),
      agText: agStatus(agCorr),
      deltaText: deltaInterpretation(deltaRatio),
      agCauseNote,
      deltaCauseNote,
      osmCauseNote,
      likelyDka,
      likelyLactic,
      considerToxinRenal,
      likelyNagma,
      likelyRespAcidosis,
      likelyRespAlkalosis,
      mixedRespAcidosisByMetAcidosis,
      mixedRespAlkalosisByMetAcidosis,
      routeHints,
      nextSteps,
      safetyNotes,
    };
  }, [pH, pco2, hco3, na, cl, albumin, lactate, glucose, bun, measuredOsm, duration, weight, targetHco3, volumeStatus, severeHyperK]);

  const showBicarbCaution = volumeStatus === "overload" || renalFailure || calc.ph <= 7.1 || severeHyperK;

  return (
    <div>
      <header style={S.header}>
        <div style={S.kicker}>Acid-Base & ABG</div>
        <h1 style={S.title}>酸鹼異常 / ABG 判讀</h1>
        <div style={S.subtitle}>先判斷 pH，再看 primary disorder、代償、anion gap、delta gap 與 osmolar gap。</div>
      </header>

      <section style={S.notice}>
        <div style={S.noticeTitle}>使用方式</div>
        <div>pH、PaCO2、HCO3 是 ABG 判讀核心；Na/Cl/HCO3 用來算 anion gap。Albumin、lactate、glucose、BUN、Measured Osm 可先空白，但結果會少一些原因判讀。急性不穩定、pH 很低、毒物疑慮、DKA/HHS、CRRT 或呼吸器調整時，仍需回到病人與團隊決策。</div>
      </section>

      <div style={S.tabBar}>
        {([
          ["abg", "ABG 判讀"],
          ["bicarb", "NaHCO3 補鹼"],
          ["study", "讀書筆記"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} style={{ ...S.tabButton, ...(tab === id ? S.tabButtonActive : {}) }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "abg" && (
        <>
          <section style={S.section}>
            <div style={S.sectionTitle}>輸入 ABG / Chemistry</div>
            <div style={S.grid3}>
              <Field label="pH">
                <input value={pH} onChange={(e) => setPH(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="PaCO2" hint="mmHg">
                <input value={pco2} onChange={(e) => setPco2(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="HCO3" hint="mEq/L">
                <input value={hco3} onChange={(e) => setHco3(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="Na">
                <input value={na} onChange={(e) => setNa(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="Cl">
                <input value={cl} onChange={(e) => setCl(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="Albumin" hint="g/dL；可空白，空白時以 4 g/dL 估算 corrected AG。">
                <input value={albumin} onChange={(e) => setAlbumin(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="Lactate" hint="mmol/L；可空白，但 high AG 原因判讀會較不完整。">
                <input value={lactate} onChange={(e) => setLactate(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="Glucose" hint="mg/dL；可空白，但 DKA/HHS 與 calculated Osm 判讀會受限。">
                <input value={glucose} onChange={(e) => setGlucose(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="BUN" hint="mg/dL；可空白，但 calculated Osm 需 BUN。">
                <input value={bun} onChange={(e) => setBun(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="Measured Osm" hint="選填；這是另開 serum/plasma osmolality 實測值，不是一般 chemistry 自動換算。">
                <input value={measuredOsm} onChange={(e) => setMeasuredOsm(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="呼吸性病程" hint="指 PaCO2 改變發生多久；<24 hr 多半視為急性，>=3-5 days 多半視為慢性，1-3 days 或 acute on chronic 可先選不確定。">
                <select value={duration} onChange={(e) => setDuration(e.target.value as Duration)} style={S.select}>
                  <option value="unknown">不確定</option>
                  <option value="acute">急性</option>
                  <option value="chronic">慢性</option>
                </select>
              </Field>
            </div>
          </section>

          <div style={S.layoutGrid}>
            <section style={S.section}>
              <div style={S.sectionTitle}>判讀結果</div>
              <div style={S.resultCard}>
                <ResultRow label="1. pH" value={calc.phText} highlight={calc.ph < 7.35 || calc.ph > 7.45} />
                <ResultRow label="2. Primary disorder" value={calc.primary} highlight />
                <ResultRow label="3. Compensation" value={calc.comp.interpretation} note={calc.comp.expected} highlight={calc.comp.interpretation.includes("合併")} />
              </div>

              <div style={S.resultCard}>
                <div style={S.cardTitle}>Anion gap / Delta</div>
                <ResultRow label="AG" value={calc.ag ? `${round(calc.ag)} mEq/L` : "請輸入 Na/Cl/HCO3"} note="AG = Na - Cl - HCO3" />
                <ResultRow label="Albumin-corrected AG" value={calc.agCorr ? `${round(calc.agCorr)} mEq/L：${calc.agText}` : "請輸入 albumin"} note="Corrected AG = AG + 2.5 x (4 - albumin)" highlight={calc.agCorr > 12} />
                <div style={S.explainBox}>{calc.agCauseNote}</div>
                <ResultRow label="Delta ratio" value={calc.deltaRatio ? `${round(calc.deltaRatio, 2)}：${calc.deltaText}` : "不適用"} note="Delta ratio = (corrected AG - 12) / (24 - HCO3)" highlight={calc.deltaRatio > 0 && (calc.deltaRatio < 0.8 || calc.deltaRatio > 2)} />
                <div style={S.explainBox}>{calc.deltaCauseNote}</div>
              </div>

              <div style={S.resultCard}>
                <div style={S.cardTitle}>Osmolar gap</div>
                <ResultRow label="Calculated Osm" value={calc.osmCalc ? `${round(calc.osmCalc)} mOsm/kg` : "需 Na + glucose + BUN 才能換算"} note="Calculated Osm = 2 x Na + glucose/18 + BUN/2.8" />
                <ResultRow label="Osmolar gap" value={calc.hasMeasuredOsm && calc.osmCalc ? `${round(calc.osmGap)} mOsm/kg` : "需 measured Osm + calculated Osm"} note="Measured Osm 是另開的 serum/plasma osmolality；osmolar gap = measured - calculated。" highlight={calc.osmGap > 10} />
                <div style={S.explainBox}>{calc.osmCauseNote}</div>
              </div>
            </section>

            <section style={S.section}>
              <div style={S.sectionTitle}>下一步提醒</div>
              <div style={S.actionBox}>
                <div style={S.actionTitle}>臨床優先順序</div>
                <Bullets items={[
                  "先看病人是否 unstable：shock、hypoxemia、arrhythmia、seizure、意識改變。",
                  "若 metabolic acidosis：先看 lactate、ketone/glucose、renal function、toxins、diarrhea/RTA、藥物與輸液。",
                  "若 respiratory disorder：看呼吸器、鎮靜、COPD/asthma、肺水腫、PE、sepsis pain/anxiety、CNS 驅動。",
                  "若代償不合理：不要硬說是代償，通常就是 mixed disorder。",
                ]} />
              </div>
              <div style={S.routeBox}>
                <div style={S.actionTitle}>選路提示</div>
                <div style={S.routeList}>
                  {calc.routeHints.map((route) => (
                    <div key={`${route.title}-${route.reason}`} style={{ ...S.routeItem, ...(route.priority === "high" ? S.routeItemHigh : route.priority === "medium" ? S.routeItemMedium : {}) }}>
                      <strong>{route.title}</strong>
                      <span>{route.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={S.actionBox}>
                <div style={S.actionTitle}>原因導向下一步</div>
                <Bullets items={calc.nextSteps} />
              </div>
              <div style={S.actionBox}>
                <div style={S.actionTitle}>處置路徑詳解</div>
                <StudyCard title="DKA / mixed DKA-HHS" open={calc.likelyDka}>
                  <Bullets items={[
                    "先補資料：K、Cr/BUN、serum Osm、beta-hydroxybutyrate 或 ketone、anion gap trend；同時找誘因如感染、停 insulin、MI/stroke、steroid、SGLT2 inhibitor。",
                    "補液：低血容積或休克先給 isotonic crystalloid；之後依 corrected Na、osm、心腎功能與尿量調整。",
                    "K 安全門：K <3.5 mEq/L 先補 K 並暫緩 insulin；K 3.5-5.2 補 K 並開始 insulin；K >5.2 先不補 K，但 2-4 hr 內反覆追蹤。",
                    "Insulin：K 安全後常用 regular insulin infusion 0.1 units/kg/hr；目的在關閉 ketogenesis，不只是降血糖。",
                    "Glucose <250 mg/dL 後：加 D5/D10，繼續 insulin 直到 AG 關閉、HCO3/pH 改善且可轉皮下 insulin。",
                    "NaHCO3：DKA 通常不 routine 使用；極嚴重酸血症才依 protocol/醫師評估。",
                  ]} />
                </StudyCard>

                <StudyCard title="Lactic acidosis / shock / sepsis" open={calc.likelyLactic}>
                  <Bullets items={[
                    "先判斷灌流：血壓、MAP、尿量、skin mottling、意識、lactate trend、ScvO2/echo/IVC 或動態輸液反應。",
                    "處置核心：氧合、適量 crystalloid、vasopressor（septic shock 常用 norepinephrine）、source control、感染時及早給適當抗生素。",
                    "找非感染原因：hypoxemia、seizure、ischemic bowel/limb、cardiogenic shock、肝衰竭、beta-agonist、metformin 或其他藥物。",
                    "重抽趨勢：lactate clearance 比單次 lactate 更有用；若 lactate 上升或 pH 惡化，要回頭看 source/perfusion。",
                    "NaHCO3：多半只是 bridge；嚴重 acidemia、AKI 或高血鉀時可評估，但核心仍是逆轉低灌流。",
                  ]} />
                </StudyCard>

                <StudyCard title="High AG：toxin / renal failure / salicylate" open={calc.considerToxinRenal}>
                  <Bullets items={[
                    "補檢驗：Cr/BUN、ketone、lactate、salicylate level、acetaminophen level、measured serum Osm、urinalysis（calcium oxalate crystal）、必要時 toxic alcohol level。",
                    "病史線索：不明意識改變、視覺症狀、腎衰竭、飲用不明液體、antifreeze、酒精替代品、propylene glycol 暴露、過量用藥。",
                    "Osmolar gap 升高 + high AG：早期 toxic alcohol 風險高；不要等 confirm level 才會診 toxicology/nephrology。",
                    "Salicylate：常混合 respiratory alkalosis + metabolic acidosis；避免插管後通氣不足造成 pH 快速下降。",
                    "Renal failure/uremia：若酸中毒、高血鉀、volume overload 或尿毒症症狀持續，及早評估 RRT。",
                  ]} />
                </StudyCard>

                <StudyCard title="NAGMA / hyperchloremic metabolic acidosis" open={calc.likelyNagma}>
                  <Bullets items={[
                    "常見原因：diarrhea、ileostomy、pancreatic/biliary drainage、RTA、大量 normal saline、acetazolamide、早期 renal failure。",
                    "先看 chloride 與輸液史：大量 NS 後 Cl 高、AG 正常、HCO3 低，很常見。",
                    "分 GI vs renal：可補 urine Na/K/Cl 算 urine anion gap；negative 較支持 GI bicarbonate loss，positive 較支持 renal acidification problem。",
                    "治療：處理流失原因、改 balanced crystalloid、補 K/Mg；若 bicarbonate loss 明確或 pH/HCO3 很低，可考慮 bicarbonate 補充。",
                    "Type 4 RTA 常合併高血鉀：想 diabetic nephropathy、ACEi/ARB、MRA、trimethoprim、heparin、adrenal insufficiency。",
                  ]} />
                </StudyCard>

                <StudyCard title="Respiratory acidosis" open={calc.likelyRespAcidosis}>
                  <Bullets items={[
                    "先看病人：意識、呼吸功、SpO2、airway、ETCO2/ABG trend；若 unstable 要先確保 airway/ventilation。",
                    "找 hypoventilation：opioid/benzodiazepine/鎮靜、COPD/asthma、airway obstruction、肺水腫、胸壁/神經肌肉、呼吸肌疲乏。",
                    "插管/呼吸器病人：看 minute ventilation、tidal volume、RR、dead space、auto-PEEP、plateau pressure；避免只追求 PaCO2 正常而傷肺。",
                    "若是 chronic CO2 retainer：不要只因 PaCO2 高就過度通氣，重點是 pH、臨床與 baseline。",
                  ]} />
                </StudyCard>

                <StudyCard title="Respiratory alkalosis" open={calc.likelyRespAlkalosis}>
                  <Bullets items={[
                    "常見原因：sepsis、疼痛焦慮、hypoxemia、PE、肝病、懷孕、CNS disease、salicylate early phase。",
                    "先排危險原因：SpO2/PaO2、CXR、PE 風險、sepsis source、salicylate level、疼痛與 withdrawal。",
                    "若在呼吸器上：檢查設定是否過度通氣、patient-ventilator dyssynchrony、疼痛/躁動造成 overbreathing。",
                    "不要只用鎮靜把呼吸壓下來；先確認是不是 hypoxemia、shock、PE 或毒物在推動過度換氣。",
                  ]} />
                </StudyCard>
              </div>
              {calc.safetyNotes.length > 0 && (
                <div style={S.warning}>
                  <strong>需要特別注意</strong>
                  <Bullets items={calc.safetyNotes} />
                </div>
              )}
              <StudyCard title="快速背法：四步驟" open>
                <ol style={S.orderedList}>
                  <li>看 pH：acidemia or alkalemia。</li>
                  <li>看誰跟 pH 同方向：HCO3 低是 metabolic acidosis；PaCO2 高是 respiratory acidosis。</li>
                  <li>算代償：代償不夠或過頭就是 mixed disorder。</li>
                  <li>若 metabolic acidosis，必算 corrected AG 和 delta ratio。</li>
                </ol>
              </StudyCard>
            </section>
          </div>
        </>
      )}

      {tab === "bicarb" && (
        <>
          <section style={S.section}>
            <div style={S.sectionTitle}>NaHCO3 / Rolikan 補鹼計算</div>
            <div style={S.grid3}>
              <Field label="體重" hint="kg">
                <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="目前 HCO3">
                <input value={hco3} onChange={(e) => setHco3(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="目標 HCO3" hint="嚴重酸血症常先抓 10-16，不一定補到正常。">
                <input value={targetHco3} onChange={(e) => setTargetHco3(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="pH">
                <input value={pH} onChange={(e) => setPH(e.target.value)} inputMode="decimal" style={S.input} />
              </Field>
              <Field label="容量狀態">
                <select value={volumeStatus} onChange={(e) => setVolumeStatus(e.target.value as VolumeStatus)} style={S.select}>
                  <option value="unknown">不確定</option>
                  <option value="shock">Shock / 低灌流</option>
                  <option value="euvolemic">大致 euvolemic</option>
                  <option value="overload">水腫 / 肺水腫 / 限水</option>
                </select>
              </Field>
            </div>
            <div style={S.checkGrid}>
              <label style={S.checkboxRow}>
                <input type="checkbox" checked={severeHyperK} onChange={(e) => setSevereHyperK(e.target.checked)} />
                <span>合併高血鉀</span>
              </label>
              <label style={S.checkboxRow}>
                <input type="checkbox" checked={renalFailure} onChange={(e) => setRenalFailure(e.target.checked)} />
                <span>AKI/CKD/少尿或可能需要 RRT</span>
              </label>
            </div>
          </section>

          <div style={S.layoutGrid}>
            <section style={S.section}>
              <div style={S.sectionTitle}>補鹼估算</div>
              <div style={S.resultCard}>
                <ResultRow label="Bicarbonate deficit" value={calc.bicarbDeficit ? `${round(calc.bicarbDeficit)} mEq` : "目標 HCO3 未高於目前值"} note="粗估公式：0.5 x BW x (目標 HCO3 - 目前 HCO3)" highlight={calc.bicarbDeficit > 0} />
                <ResultRow label="Rolikan 7% amp" value={calc.bicarbDeficit ? `約 ${round(calc.rolMl)} mL = ${round(calc.rolAmp, 1)} amp` : "-"} note={`Rolikan 7% 20 mL/Amp = ${ROLIKAN_MEQ_PER_AMP} mEq；${ROLIKAN_MEQ_PER_ML} mEq/mL。`} />
                <ResultRow label="Rolikan 常備瓶" value={`250 mL/bot ≈ ${round(ROLIKAN_BOT_MEQ)} mEq`} note="若開 infusion，務必把 sodium load 與總液體量一起算進去。" />
                <ResultRow label="常見初始策略" value={calc.ph <= 7.1 || severeHyperK ? "可先考慮 50 mEq，重抽 ABG/chem 後再補；嚴重者依 pH/HCO3/Na 逐步補到 100-150 mEq。" : "若不是嚴重酸血症或高血鉀，先治療原因，NaHCO3 不一定有幫助。"} highlight={showBicarbCaution} />
              </div>

              {showBicarbCaution && (
                <div style={S.warning}>
                  <strong>補 NaHCO3 前先想一下</strong>
                  <Bullets items={[
                    "會帶入 sodium 與 volume，水腫、心衰、少尿/無尿要小心。",
                    "可能讓 ionized Ca 下降、造成 alkalosis、CO2 產生增加；通氣不足時 CO2 可能更難排。",
                    "Lactic acidosis / shock 的核心是灌流與 source control；NaHCO3 多半是 bridge，不是根治。",
                    "若 severe AKI/ESRD 且酸血症或高血鉀持續，應及早評估 RRT。",
                  ]} />
                </div>
              )}
            </section>

            <section style={S.section}>
              <div style={S.sectionTitle}>什麼時候比較會考慮 NaHCO3？</div>
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>情境</th>
                      <th style={S.th}>想法</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style={S.tdStrong}>Severe acidemia</td><td style={S.td}>pH 約 {"<="}7.1-7.2、血流動力不穩或 catecholamine 反應差時，可作 bridge；仍要處理原因。</td></tr>
                    <tr><td style={S.tdStrong}>高血鉀 + 酸中毒</td><td style={S.td}>NaHCO3 可輔助把 K 往細胞內移，但不能取代 calcium、insulin/glucose 或排鉀。</td></tr>
                    <tr><td style={S.tdStrong}>Bicarbonate loss</td><td style={S.td}>Diarrhea、RTA、腸液流失等 NAGMA，補 bicarbonate 通常較合理。</td></tr>
                    <tr><td style={S.tdStrong}>Renal failure acidosis</td><td style={S.td}>若有 volume overload、少尿或酸中毒持續，可能比起一直補 NaHCO3 更需要 RRT。</td></tr>
                    <tr><td style={S.tdStrong}>DKA</td><td style={S.td}>通常不 routine 使用；極低 pH 才依 DKA protocol 考慮。</td></tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}

      {tab === "study" && (
        <section style={S.section}>
          <div style={S.sectionTitle}>讀書筆記</div>

          <StudyCard title="1. 酸鹼判讀總流程" open>
            <ol style={S.orderedList}>
              <li>先判斷 pH：低於 7.35 是 acidemia，高於 7.45 是 alkalemia。</li>
              <li>找 primary disorder：跟 pH 同方向的變化通常是主因。HCO3 代表 metabolic，PaCO2 代表 respiratory。</li>
              <li>算 expected compensation：身體代償有範圍，但不會完全把 pH 補回正常；若超出預期就是 mixed disorder。</li>
              <li>只要有 metabolic acidosis，就算 AG，並用 albumin 校正。</li>
              <li>若 corrected AG 高，再看 delta ratio，找 HAGMA 是否合併 NAGMA 或 metabolic alkalosis。</li>
            </ol>
          </StudyCard>

          <StudyCard title="2. 代償公式速查">
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Primary disorder</th>
                    <th style={S.th}>Expected compensation</th>
                    <th style={S.th}>超出範圍代表</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td style={S.tdStrong}>Metabolic acidosis</td><td style={S.td}>Winter formula：PaCO2 = 1.5 x HCO3 + 8 ±2</td><td style={S.td}>PaCO2 太高是 resp acidosis；太低是 resp alkalosis。</td></tr>
                  <tr><td style={S.tdStrong}>Metabolic alkalosis</td><td style={S.td}>PaCO2 ≈ 40 + 0.7 x (HCO3 - 24) ±5</td><td style={S.td}>PaCO2 太高/低代表合併 respiratory disorder。</td></tr>
                  <tr><td style={S.tdStrong}>Resp acidosis acute</td><td style={S.td}>PaCO2 每 +10，HCO3 約 +1</td><td style={S.td}>HCO3 過低想 metabolic acidosis；過高想 metabolic alkalosis。</td></tr>
                  <tr><td style={S.tdStrong}>Resp acidosis chronic</td><td style={S.td}>PaCO2 每 +10，HCO3 約 +3-4</td><td style={S.td}>COPD chronic retainer 常見；急性惡化會在慢性基礎上再上升 PaCO2。</td></tr>
                  <tr><td style={S.tdStrong}>Resp alkalosis acute</td><td style={S.td}>PaCO2 每 -10，HCO3 約 -2</td><td style={S.td}>過低想 metabolic acidosis；過高想 metabolic alkalosis。</td></tr>
                  <tr><td style={S.tdStrong}>Resp alkalosis chronic</td><td style={S.td}>PaCO2 每 -10，HCO3 約 -4-5</td><td style={S.td}>常見於長期 hyperventilation、肝病、懷孕、高海拔等。</td></tr>
                </tbody>
              </table>
            </div>
          </StudyCard>

          <StudyCard title="3. Winter formula 是什麼？">
            <p style={S.paragraph}>Winter formula 是用在 <strong>metabolic acidosis</strong> 的呼吸代償公式。當 HCO3 下降時，身體會用過度換氣把 PaCO2 降低，試著把 pH 拉回來。公式是：</p>
            <div style={S.formulaBox}>Expected PaCO2 = 1.5 x HCO3 + 8 ± 2</div>
            <Bullets items={[
              "如果實際 PaCO2 落在預期範圍：代表呼吸代償大致合理。",
              "如果實際 PaCO2 比預期高：病人沒有換氣到該有的程度，合併 respiratory acidosis，例如呼吸衰竭、COPD、鎮靜/opioid、呼吸肌疲乏。",
              "如果實際 PaCO2 比預期低：病人換氣超過代償需求，合併 respiratory alkalosis，例如 sepsis、疼痛焦慮、hypoxemia、PE、肝病。",
              "例：HCO3 = 14，Expected PaCO2 = 1.5 x 14 + 8 = 29，合理範圍約 27-31 mmHg。若實測 PaCO2 45，就不是單純 metabolic acidosis，而是合併 respiratory acidosis。",
            ]} />
          </StudyCard>

          <StudyCard title="4. 呼吸性病程怎麼選？">
            <p style={S.paragraph}>這個選項只影響 respiratory acidosis / alkalosis 的代償判讀。意思是：PaCO2 的異常是剛發生，還是已經持續好幾天？因為腎臟需要時間調整 HCO3，急性和慢性的 expected HCO3 會差很多。</p>
            <Bullets items={[
              "時間抓法：幾分鐘到數小時、通常 <24 hr 視為急性；>=3-5 days 視為慢性；1-3 days 是灰色區，常只能當方向。",
              "急性 respiratory acidosis：PaCO2 突然上升，例如 opioid/benzodiazepine 過量、急性呼吸衰竭、插管前通氣不足；HCO3 通常只小幅上升。",
              "慢性 respiratory acidosis：PaCO2 長期偏高，例如 COPD chronic CO2 retention、obesity hypoventilation；HCO3 會因腎臟代償而明顯上升。",
              "急性加慢性：COPD 病人這次 pneumonia、AECOPD 或鎮靜後 PaCO2 又更高，常見 baseline HCO3 已高，再疊加急性 respiratory acidosis。",
              "急性 respiratory alkalosis：突然過度換氣，例如 sepsis、疼痛焦慮、hypoxemia、PE；HCO3 下降幅度較小。",
              "慢性 respiratory alkalosis：長期 hyperventilation，例如懷孕、肝病、高海拔；HCO3 會下降較多。",
              "不知道病程時：選「不確定」，並找 baseline ABG/VBG、過去 chemistry 的 HCO3、病史和呼吸器趨勢來判斷。",
            ]} />
          </StudyCard>

          <StudyCard title="5. High anion gap metabolic acidosis">
            <p style={S.paragraph}>常用記憶法可用 GOLDMARK：Glycols、Oxoproline、L-lactate、D-lactate、Methanol、Aspirin、Renal failure、Ketoacidosis。</p>
            <Bullets items={[
              "Lactate：shock、sepsis、低灌流、seizure、beta-agonist、肝功能差。",
              "Ketoacidosis：DKA、alcoholic ketoacidosis、starvation ketosis；看 glucose、ketone/beta-hydroxybutyrate。",
              "Renal failure：uremic acid retention，常合併 K/Phos 上升與 volume issue。",
              "Toxin：methanol、ethylene glycol、propylene glycol、salicylate；常需要 osmolar gap、尿沉渣、毒物檢驗與解毒/透析評估。",
              "5-oxoproline：長期 acetaminophen、營養不良、敗血症或腎功能差時可見。",
            ]} />
          </StudyCard>

          <StudyCard title="6. DKA 造成酸中毒時，下一步做什麼？">
            <p style={S.paragraph}>DKA 是 high anion gap metabolic acidosis。判讀看到 HCO3 低、AG 高、血糖高時，下一步不是先補 NaHCO3，而是確認 ketone、補液、補鉀、給 insulin，並找誘發原因。</p>
            <Bullets items={[
              "先確認：glucose、serum/urine ketone 或 beta-hydroxybutyrate、anion gap、K、Cr、serum Osm；同時找感染、停 insulin、MI/stroke、steroid/SGLT2 inhibitor 等誘因。",
              "補液：多數成人先給 isotonic crystalloid；休克或低血容積先處理灌流，之後依 Na、osm、心腎功能調整。",
              "K 是 insulin 前的安全門：K <3.5 mEq/L 時先補 K，暫緩 insulin；K 3.5-5.2 通常 insulin + 補 K；K >5.2 先不補 K 但密切追蹤。",
              "Insulin：K 安全後常用 regular insulin infusion 0.1 units/kg/hr；目標是關閉 ketogenesis，不只是降血糖。",
              "當 glucose 降到約 <250 mg/dL 後，加 D5/D10 繼續 insulin，直到 anion gap 關閉、HCO3/pH 改善且可轉皮下 insulin。",
              "NaHCO3：DKA 通常不 routine 使用；只有極嚴重酸血症才依 protocol/醫師評估。",
            ]} />
          </StudyCard>

          <StudyCard title="7. Normal anion gap metabolic acidosis">
            <p style={S.paragraph}>NAGMA 常是 bicarbonate 掉了，或腎臟排酸/產 ammonium 有問題。臨床上最常問：是 GI loss 還是 renal tubular/renal failure？</p>
            <Bullets items={[
              "GI bicarbonate loss：diarrhea、ileostomy、pancreatic/biliary drainage。",
              "Renal tubular acidosis：type 1 distal、type 2 proximal、type 4 hypoaldosteronism；type 4 常合併高血鉀。",
              "藥物與輸液：大量 normal saline 可造成 hyperchloremic metabolic acidosis；acetazolamide 會造成 bicarbonaturia。",
              "早期 renal failure 或 recovery phase 也可見 NAGMA。",
            ]} />
          </StudyCard>

          <StudyCard title="8. Metabolic alkalosis 怎麼想">
            <Bullets items={[
              "先想 chloride-responsive：嘔吐/NG suction、利尿劑、volume contraction；尿 chloride 常偏低或受利尿劑影響。",
              "Chloride-resistant：mineralocorticoid excess、Cushing、licorice、Bartter/Gitelman；常伴高血壓或 K wasting。",
              "治療核心通常不是給酸，而是補 chloride、補 K、調整利尿劑、處理 volume 與 mineralocorticoid effect。",
            ]} />
          </StudyCard>

          <StudyCard title="9. Respiratory disorder 在 ICU 要想什麼">
            <Bullets items={[
              "Respiratory acidosis：通氣不足。看鎮靜、opioid/benzodiazepine、COPD/asthma、airway obstruction、呼吸肌疲乏、ventilator minute ventilation。",
              "Respiratory alkalosis：過度換氣。常見 sepsis、pain/anxiety、hypoxemia、PE、肝病、懷孕、salicylate early phase。",
              "呼吸器病人不要只看 PaCO2，要一起看 pH、minute ventilation、dead space、plateau pressure、lung protective strategy。",
            ]} />
          </StudyCard>

          <StudyCard title="10. Measured Osm / Calculated Osm 是什麼？">
            <p style={S.paragraph}>Measured Osm 是實驗室用 osmometer 量出來的 serum/plasma osmolality，通常要另外開檢驗，不是一般 chemistry 自動出來。Calculated Osm 是用抽血數值換算的估計值。</p>
            <div style={S.formulaBox}>Calculated Osm = 2 x Na + glucose/18 + BUN/2.8</div>
            <Bullets items={[
              "Osmolar gap = measured Osm - calculated Osm。",
              "若 high anion gap metabolic acidosis + osmolar gap 升高，要想 toxic alcohol，例如 methanol、ethylene glycol、propylene glycol。",
              "早期 toxic alcohol osmolar gap 可能先升高，代謝成酸後 anion gap 變高；晚期 osmolar gap 可能下降，所以不能靠單一數值完全排除。",
              "若 glucose 或 BUN 還沒出來，就不能可靠計算 calculated Osm / osmolar gap。",
            ]} />
          </StudyCard>

          <StudyCard title="11. VBG 可以用嗎？">
            <p style={S.paragraph}>很多穩定病人的酸鹼趨勢可用 VBG 協助，但 PaCO2 與氧合判讀仍以 ABG 較準。休克、呼吸衰竭、呼吸器調整、CO poisoning 或需要精準 PaO2/PaCO2 時，回到 ABG。</p>
          </StudyCard>

          <StudyCard title="主要參考">
            <Bullets items={[
              "Merck/MSD Manual Professional Edition: Acid-base disorders and metabolic acidosis overview.",
              "EMCrit Internet Book of Critical Care: Acid-base interpretation and metabolic acidosis chapters.",
              "常用內科/ICU acid-base compensation formulas：Winter formula、anion gap albumin correction、delta ratio、osmolar gap calculation。",
            ]} />
          </StudyCard>
        </section>
      )}
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  header: { textAlign: "center", padding: "16px 0 24px" },
  kicker: { fontSize: 12, fontWeight: 900, color: ACCENT, textTransform: "uppercase", letterSpacing: 0, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: 0, margin: 0 },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 4, lineHeight: 1.5 },
  notice: { background: "#F0FDFA", border: "1px solid #99F6E4", color: "#115E59", borderRadius: 12, padding: 14, marginBottom: 16, lineHeight: 1.55, fontSize: 13 },
  noticeTitle: { color: "#0F766E", fontWeight: 900, marginBottom: 4, fontSize: 14 },
  tabBar: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))", gap: 8, background: "#E2E8F0", padding: 4, borderRadius: 12, marginBottom: 16 },
  tabButton: { border: "none", borderRadius: 9, background: "transparent", color: "#475569", padding: "10px 8px", fontSize: 13, fontWeight: 900, cursor: "pointer" },
  tabButtonActive: { background: "#FFFFFF", color: ACCENT, boxShadow: "0 1px 3px rgba(15,23,42,0.12)" },
  section: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", boxSizing: "border-box", overflow: "hidden" },
  sectionTitle: { fontSize: 13, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0, marginBottom: 14 },
  layoutGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 16 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 12 },
  checkGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 8, marginTop: 12 },
  label: { display: "block", fontSize: 12, color: "#64748B", fontWeight: 800, marginBottom: 6 },
  fieldHint: { color: "#94A3B8", fontSize: 11, lineHeight: 1.45, marginTop: 4 },
  input: { width: "100%", boxSizing: "border-box", border: "2px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 15, color: "#0F172A", outline: "none", background: "#fff" },
  select: { width: "100%", boxSizing: "border-box", border: "2px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 15, color: "#0F172A", outline: "none", background: "#fff" },
  checkboxRow: { display: "flex", alignItems: "flex-start", gap: 8, color: "#475569", fontSize: 13, lineHeight: 1.45 },
  resultCard: { border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, marginBottom: 12, background: "#FFFFFF" },
  cardTitle: { color: "#0F172A", fontSize: 14, fontWeight: 900, marginBottom: 8 },
  resultRow: { display: "grid", gridTemplateColumns: "minmax(110px, 0.85fr) minmax(0, 1.3fr)", gap: 10, padding: "9px 0", borderBottom: "1px solid #EEF2F7", alignItems: "start" },
  resultRowHighlight: { background: "#F0FDFA", marginLeft: -8, marginRight: -8, paddingLeft: 8, paddingRight: 8, borderRadius: 6, borderBottom: "none" },
  resultLabel: { color: "#64748B", fontSize: 13, fontWeight: 800 },
  resultNote: { color: "#94A3B8", fontSize: 12, lineHeight: 1.45, marginTop: 3 },
  resultValue: { color: "#0F172A", fontSize: 14, lineHeight: 1.55, wordBreak: "break-word", fontWeight: 800 },
  explainBox: { background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#475569", borderRadius: 8, padding: "8px 10px", fontSize: 12, lineHeight: 1.55, margin: "6px 0 10px" },
  actionBox: { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, marginBottom: 12 },
  actionTitle: { color: "#0F172A", fontSize: 14, fontWeight: 900, marginBottom: 8 },
  routeBox: { background: "#FFFFFF", border: "1px solid #CCFBF1", borderRadius: 10, padding: 12, marginBottom: 12 },
  routeList: { display: "grid", gap: 8 },
  routeItem: { border: "1px solid #E2E8F0", background: "#F8FAFC", borderRadius: 9, padding: "9px 10px", display: "flex", flexDirection: "column", gap: 4, color: "#475569", fontSize: 12, lineHeight: 1.5 },
  routeItemHigh: { borderColor: "#99F6E4", background: "#F0FDFA", color: "#115E59" },
  routeItemMedium: { borderColor: "#BFDBFE", background: "#EFF6FF", color: "#1E3A8A" },
  warning: { background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.55, marginTop: 10 },
  studyCard: { border: "1px solid #E2E8F0", background: "#FFFFFF", borderRadius: 10, padding: "0 12px", marginBottom: 10 },
  studySummary: { cursor: "pointer", color: "#0F172A", fontSize: 14, fontWeight: 900, padding: "12px 0", listStylePosition: "inside" },
  studyBody: { color: "#334155", fontSize: 13, lineHeight: 1.65, padding: "0 0 12px" },
  paragraph: { margin: "0 0 10px", color: "#334155", lineHeight: 1.65 },
  bulletList: { margin: "0 0 0 18px", padding: 0, color: "#334155", fontSize: 13, lineHeight: 1.65 },
  bulletItem: { marginBottom: 4 },
  orderedList: { margin: "0 0 0 18px", padding: 0, color: "#334155", fontSize: 13, lineHeight: 1.65 },
  tableWrap: { overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 680 },
  th: { textAlign: "left", padding: "10px 12px", background: "#F8FAFC", color: "#475569", fontSize: 12, fontWeight: 800, borderBottom: "1px solid #E2E8F0", verticalAlign: "top" },
  td: { padding: "10px 12px", borderBottom: "1px solid #EEF2F7", color: "#334155", fontSize: 13, lineHeight: 1.55, verticalAlign: "top" },
  tdStrong: { padding: "10px 12px", borderBottom: "1px solid #EEF2F7", color: "#0F172A", fontSize: 13, lineHeight: 1.55, verticalAlign: "top", fontWeight: 800 },
};
