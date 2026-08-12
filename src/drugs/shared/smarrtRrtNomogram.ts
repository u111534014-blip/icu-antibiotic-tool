export const SMARRT_RRT_INTENSITY_OPTIONS = [
  { id: "1.5", label: "1.5 L/hr（dialysate + replacement flow）" },
  { id: "2.5", label: "2.5 L/hr（dialysate + replacement flow）" },
  { id: "3.5", label: "3.5 L/hr（dialysate + replacement flow）" },
];

export const MEROPENEM_URINE_OPTIONS = [
  { id: "oligoanuria", label: "Urine <500 mL/day（oligoanuria）" },
  { id: "u500", label: "Urine >=500 mL/day" },
];

export const PIPTAZO_URINE_OPTIONS = [
  { id: "anuria", label: "No/minimal urine（anuria）" },
  { id: "u100", label: "Urine >=100 mL/day" },
];

export const SMARRT_TARGET_OPTIONS = [
  { id: "standard", label: "Standard target" },
  { id: "high", label: "Higher target / empiric PsA" },
];

type SmarrtSelection = {
  intensity?: string;
  urine?: string;
  target?: string;
};

function normalizeIntensity(value?: string): "1.5" | "2.5" | "3.5" {
  if (value === "2.5" || value === "3.5") return value;
  return "1.5";
}

function normalizeTarget(value?: string): "standard" | "high" {
  return value === "high" ? "high" : "standard";
}

export function getMeropenemSmarrtRows(selection: SmarrtSelection) {
  const intensity = normalizeIntensity(selection.intensity);
  const urine = selection.urine === "u500" ? "u500" : "oligoanuria";
  const target = normalizeTarget(selection.target);

  let daily = "1-1.5 g/day CI";
  if (target === "high") {
    if (urine === "u500") daily = "3 g/day CI";
    else if (intensity === "1.5") daily = "1.5-2 g/day CI";
    else daily = "2 g/day CI";
  }

  return [
    { label: "Loading dose", value: "1 g over 30 min, then immediately start CI", highlight: true },
    { label: "Continuous infusion", value: daily, highlight: true },
    { label: "RRT intensity", value: `${intensity} L/hr` },
    { label: "Urine output", value: urine === "u500" ? ">=500 mL/day" : "<500 mL/day（oligoanuria）" },
    { label: "Target", value: target === "high" ? "Higher target: steady-state >=4-8 mg/L（empiric treatment / 4xMIC for P. aeruginosa）" : "Standard target: steady-state >=2 mg/L（100% fT>MIC / 4xMIC for Enterobacterales）" },
    { label: "來源", value: "SMARRT / Roberts et al., Intensive Care Medicine 2025, Table 2（continuous RRT nomogram）" },
  ];
}

export function getPipTazoSmarrtRows(selection: SmarrtSelection) {
  const intensity = normalizeIntensity(selection.intensity);
  const urine = selection.urine === "u100" ? "u100" : "anuria";
  const target = normalizeTarget(selection.target);

  let daily = "6 g/0.75 g-8 g/1 g per day CI";
  if (target === "high") {
    if (urine === "u100") {
      if (intensity === "3.5") daily = "12 g/1.5 g-16 g/2 g per day CI";
      else daily = "10 g/1.25 g-12 g/1.5 g per day CI";
    } else if (intensity === "1.5") {
      daily = "6 g/0.75 g-8 g/1 g per day CI";
    } else if (intensity === "2.5") {
      daily = "8 g/1 g-10 g/1.25 g per day CI";
    } else {
      daily = "12 g/1.5 g-16 g/2 g per day CI";
    }
  }

  return [
    { label: "Loading dose", value: "4 g/0.5 g over 30 min, then immediately start CI", highlight: true },
    { label: "Continuous infusion", value: daily, highlight: true },
    { label: "RRT intensity", value: `${intensity} L/hr` },
    { label: "Urine output", value: urine === "u100" ? ">=100 mL/day" : "No/minimal urine（anuria）" },
    { label: "Target", value: target === "high" ? "Higher target: steady-state >=32-64 mg/L（empiric treatment / 4xMIC for P. aeruginosa）" : "Standard target: steady-state >=16 mg/L（100% fT>MIC / 4xMIC for Enterobacterales）" },
    { label: "來源", value: "SMARRT / Roberts et al., Intensive Care Medicine 2025, Table 3（continuous RRT nomogram）" },
  ];
}
