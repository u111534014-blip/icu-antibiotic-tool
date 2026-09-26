import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import DateTime24Input from "./DateTime24Input";

type Organ = "kidney" | "liver" | "heart" | "lung";
type Regimen = "tac" | "combo" | "everolimus";
type Interaction = "none" | "strongInhibitor" | "moderateInhibitor" | "strongInducer" | "diarrhea" | "stoppingSmoking";
const ACCENT = "#0D9488";
const n = (v: string) => Number.parseFloat(v) || 0;
const fmt = (v: number) => Number.isFinite(v) ? v.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1") : "--";
const hoursBetween=(start:string,end:string)=>{
  if(!start||!end)return null;
  const diff=(new Date(end).getTime()-new Date(start).getTime())/3600000;
  return Number.isFinite(diff)&&diff>=0?diff:null;
};
const showDateTime=(value:string)=>value?value.replace("T"," "):"--";

function Card({ title, children }: { title: string; children: ReactNode }) { return <section style={S.card}><div style={S.cardTitle}>{title}</div>{children}</section>; }
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) { return <label style={S.field}><span style={S.label}>{label}</span>{children}{hint&&<span style={S.hint}>{hint}</span>}</label>; }
function Table({ columns, rows }: { columns: string[]; rows: string[][] }) { return <div style={S.tableWrap}><table style={S.table}><thead><tr>{columns.map(x=><th key={x} style={S.th}>{x}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((x,j)=><td key={j} style={j===0?S.tdStrong:S.td}>{x}</td>)}</tr>)}</tbody></table></div>; }
function Note({ title, children, open=false }: { title: string; children: ReactNode; open?: boolean }) { return <details open={open} style={S.note}><summary style={S.summary}>{title}</summary><div style={S.noteBody}>{children}</div></details>; }

function targetFor(organ: Organ, months: number, regimen: Regimen) {
  const early = months < 1;
  const intermediate = months < 6;
  let tac = organ === "liver" ? (early ? [6,10] : [4,8]) : organ === "heart" ? (months < 3 ? [10,15] : intermediate ? [8,12] : [5,10]) : organ === "lung" ? (months < 3 ? [10,15] : [8,12]) : (months < 3 ? [8,12] : intermediate ? [6,10] : [5,8]);
  if (regimen === "combo") tac = organ === "liver" ? (early ? [4,7] : [3,5]) : organ === "heart" ? [3,8] : organ === "lung" ? [5,10] : [3,7];
  const evero = regimen === "everolimus" && organ === "heart" ? [6,10] : [3,8];
  return { tac, evero, label: "常用參考；最終以移植中心 protocol 與個案風險為準" };
}

export default function TransplantTDM() {
  const [organ,setOrgan]=useState<Organ>("kidney");
  const [months,setMonths]=useState("6");
  const [regimen,setRegimen]=useState<Regimen>("tac");
  const [tacDose,setTacDose]=useState("");
  const [tacLevel,setTacLevel]=useState("");
  const [everDose,setEverDose]=useState("");
  const [everLevel,setEverLevel]=useState("");
  const [interaction,setInteraction]=useState<Interaction>("none");
  const [lastDoseTime,setLastDoseTime]=useState("");
  const [levelTime,setLevelTime]=useState("");
  const [trueTrough,setTrueTrough]=useState(false);
  const [steadyState,setSteadyState]=useState(false);
  const [copied,setCopied]=useState(false);
  const target=useMemo(()=>targetFor(organ,n(months),regimen),[organ,months,regimen]);
  const showTac=regimen!=="everolimus";
  const showEver=regimen!=="tac";
  const interactionInfo: Record<Interaction,{title:string;effect:string;action:string}> = {
    none:{title:"未選重大交互作用",effect:"仍需核對完整 medication list、飲食與近期停藥。",action:"一般於 dose／交互作用改變後約 48-72 小時開始重測；依器官、時程與中心 protocol 加密。"},
    strongInhibitor:{title:"強 CYP3A inhibitor",effect:"Tacrolimus／everolimus 暴露可大幅上升。常見：voriconazole、posaconazole、itraconazole、clarithromycin、ritonavir/cobicistat。",action:"優先避免或由移植團隊預先大幅減量／暫停；不可只等症狀。密集 trough、SCr、K、神經毒性監測。"},
    moderateInhibitor:{title:"中度 inhibitor",effect:"Fluconazole、diltiazem、verapamil、amiodarone、isavuconazole、grapefruit 等可能升高濃度。",action:"預先規劃減量並提早複測；影響程度個體差異大，不宜套固定百分比。"},
    strongInducer:{title:"強 CYP3A inducer",effect:"Rifampin/rifabutin、carbamazepine、phenytoin、phenobarbital、St John's wort 可使濃度下降並增加排斥風險。",action:"能避免就避免。若不得已，須移植團隊密集 TDM；停 inducer 後誘導作用仍會延續，避免先前加量造成反彈中毒。"},
    diarrhea:{title:"顯著腹瀉／腸炎",effect:"Tacrolimus 濃度可能反而升高，且脫水會放大腎毒性；不能假設吸收差就濃度低。",action:"儘快測 trough、SCr、K、Mg，治療腹瀉並在恢復期再次追蹤。"},
    stoppingSmoking:{title:"配方、食物或服藥方式改變",effect:"Tacrolimus 各 immediate/extended-release 製劑不可 mg-for-mg 隨意互換；食物時間改變也會影響暴露。",action:"確認商品、劑型、給藥時間與空腹狀態；轉換後按中心流程重新 TDM。"},
  };
  const interpret=(level:number, range:number[])=>!level?"尚未輸入濃度":level<range[0]?"低於參考目標":level>range[1]?"高於參考目標":"位於參考目標內";
  const interpretEn=(level:number, range:number[])=>!level?"level not entered":level<range[0]?"below the reference target":level>range[1]?"above the reference target":"within the reference target";
  const proportional=(dose:number,level:number,range:number[],increment:number)=>{
    if(!dose||!level)return null; const midpoint=(range[0]+range[1])/2; const raw=dose*midpoint/level; return Math.max(increment,Math.round(raw/increment)*increment);
  };
  const tacEstimate=proportional(n(tacDose),n(tacLevel),target.tac,0.5);
  const everEstimate=proportional(n(everDose),n(everLevel),target.evero,0.5);
  const samplingHours=hoursBetween(lastDoseTime,levelTime);
  const unsafeEstimate=interaction!=="none"||!trueTrough||!steadyState||samplingHours===null;
  const note=[
    "=== Transplant Immunosuppression TDM Note ===",
    `Organ: ${organ}; time since transplant: ${months || "--"} month(s).`,
    `Regimen: ${regimen === "combo" ? "tacrolimus + everolimus" : regimen}.`,
    showTac?`Tacrolimus: ${tacDose||"--"} mg/day; trough ${tacLevel||"--"} ng/mL; reference target ${target.tac[0]}-${target.tac[1]} ng/mL (${interpretEn(n(tacLevel),target.tac)}).`:"",
    showEver?`Everolimus: ${everDose||"--"} mg/day; trough ${everLevel||"--"} ng/mL; reference target ${target.evero[0]}-${target.evero[1]} ng/mL (${interpretEn(n(everLevel),target.evero)}).`:"",
    `Sampling: last dose ${showDateTime(lastDoseTime)}; level drawn ${showDateTime(levelTime)}${samplingHours!==null?` (${samplingHours.toFixed(1)} hr after the last dose)`:""}. ${trueTrough?"Reported pre-dose trough":"Trough timing not confirmed"}; ${steadyState?"steady state reported":"steady state not confirmed"}.`,
    `Interaction/context: ${({none:"No major interaction selected; complete medication reconciliation is still required.",strongInhibitor:"Strong CYP3A inhibitor selected. Avoid if possible; coordinate preemptive dose reduction or holding and intensive TDM with the transplant team.",moderateInhibitor:"Moderate CYP3A inhibitor selected. Plan a conservative preemptive adjustment and earlier repeat trough.",strongInducer:"Strong CYP3A inducer selected. Avoid if possible; induction may persist after discontinuation and requires intensive TDM.",diarrhea:"Significant diarrhea/enteritis selected. Tacrolimus exposure may increase; monitor trough, SCr, potassium, magnesium, and volume status.",stoppingSmoking:"Formulation, food timing, or administration method changed. Verify the exact product and repeat TDM after conversion."} as Record<Interaction,string>)[interaction]}`,
    "Targets are center-, organ-, time-, regimen-, assay-, and risk-specific. Confirm with the transplant team before changing therapy.",
  ].filter(Boolean).join("\n");
  const copy=async()=>{await navigator.clipboard.writeText(note);setCopied(true);setTimeout(()=>setCopied(false),1500)};

  return <div>
    <header style={S.header}><div style={S.kicker}>Solid organ transplant</div><h1 style={S.title}>Tacrolimus / Everolimus TDM</h1><p style={S.subtitle}>器官、移植時程、合併方案與交互作用一起判讀</p></header>
    <div style={S.notice}><strong>可以合併使用。</strong>Tacrolimus + everolimus 通常採 reduced-exposure tacrolimus；兩者濃度都要監測，不能把各自單藥的標準 target 直接疊加。</div>
    <Card title="治療情境"><div style={S.grid3}>
      <Field label="移植器官"><select value={organ} onChange={e=>setOrgan(e.target.value as Organ)} style={S.input}><option value="kidney">Kidney</option><option value="liver">Liver</option><option value="heart">Heart</option><option value="lung">Lung</option></select></Field>
      <Field label="移植後時間" hint="months"><input value={months} onChange={e=>setMonths(e.target.value)} inputMode="decimal" style={S.input}/></Field>
      <Field label="目前方案"><select value={regimen} onChange={e=>setRegimen(e.target.value as Regimen)} style={S.input}><option value="tac">Tacrolimus-based</option><option value="combo">Tacrolimus + everolimus</option><option value="everolimus">Everolimus / CNI-free</option></select></Field>
    </div><div style={S.targetBanner}><span>目前參考 target</span><strong>{showTac&&`Tac ${target.tac[0]}-${target.tac[1]} ng/mL`}{showTac&&showEver?" · ":""}{showEver&&`Everolimus ${target.evero[0]}-${target.evero[1]} ng/mL`}</strong><small>{target.label}</small></div></Card>
    <Card title="目前劑量與濃度"><div style={S.grid2}>
      {showTac&&<><Field label="Tacrolimus total daily dose" hint="mg/day"><input value={tacDose} onChange={e=>setTacDose(e.target.value)} inputMode="decimal" style={S.input}/></Field><Field label="Tacrolimus whole-blood trough" hint="ng/mL"><input value={tacLevel} onChange={e=>setTacLevel(e.target.value)} inputMode="decimal" style={S.input}/></Field></>}
      {showEver&&<><Field label="Everolimus total daily dose" hint="mg/day"><input value={everDose} onChange={e=>setEverDose(e.target.value)} inputMode="decimal" style={S.input}/></Field><Field label="Everolimus whole-blood trough" hint="ng/mL"><input value={everLevel} onChange={e=>setEverLevel(e.target.value)} inputMode="decimal" style={S.input}/></Field></>}
    </div><div style={S.grid2}><DateTime24Input label="最後一劑給藥時間" value={lastDoseTime} onChange={setLastDoseTime} labelStyle={S.label} inputStyle={S.dateTimeInput}/><DateTime24Input label="抽血時間" value={levelTime} onChange={setLevelTime} labelStyle={S.label} inputStyle={S.dateTimeInput}/></div><div style={S.checkRow}><label><input type="checkbox" checked={trueTrough} onChange={e=>setTrueTrough(e.target.checked)}/> 確認抽血後、下一劑前的 true trough</label><label><input type="checkbox" checked={steadyState} onChange={e=>setSteadyState(e.target.checked)}/> 劑量穩定至少約 48-72 hr</label></div>
      {samplingHours!==null&&<div style={S.timingSummary}>抽血距最後一劑 <strong>{samplingHours.toFixed(1)} 小時</strong>；仍請核對原訂給藥間隔與抽血後是否尚未給下一劑。</div>}
      <div style={S.resultGrid}>{showTac&&<div style={S.result}><span>Tacrolimus</span><strong>{interpret(n(tacLevel),target.tac)}</strong><small>{tacEstimate?`比例估算約 ${fmt(tacEstimate)} mg/day`:`輸入劑量與 trough 後顯示粗估`}</small></div>}{showEver&&<div style={S.result}><span>Everolimus</span><strong>{interpret(n(everLevel),target.evero)}</strong><small>{everEstimate?`比例估算約 ${fmt(everEstimate)} mg/day`:`輸入劑量與 trough 後顯示粗估`}</small></div>}</div>
      <div style={unsafeEstimate?S.warn:S.info}><strong>{unsafeEstimate?"目前不適合直接採用比例估算。":"比例估算只作 dose-planning 起點。"}</strong>{unsafeEstimate?"先確認採血時點、steady state 與交互作用；若疑似排斥、毒性或 graft dysfunction，不能只靠濃度改劑量。":"仍須依移植中心 protocol、劑型、臨床毒性與 graft 狀態決定實際調整幅度。"}</div>
    </Card>
    <Card title="交互作用與特殊情境"><Field label="目前最重要的變化"><select value={interaction} onChange={e=>setInteraction(e.target.value as Interaction)} style={S.input}><option value="none">無已知重大變化／尚未核對</option><option value="strongInhibitor">強 CYP3A inhibitor</option><option value="moderateInhibitor">中度 CYP3A inhibitor</option><option value="strongInducer">強 CYP3A inducer</option><option value="diarrhea">顯著腹瀉／腸炎</option><option value="stoppingSmoking">劑型、食物或服藥方式改變</option></select></Field><div style={interaction==="none"?S.info:S.warn}><strong>{interactionInfo[interaction].title}</strong>{interactionInfo[interaction].effect}<br/>{interactionInfo[interaction].action}</div></Card>
    <Card title="TDM Note"><pre style={S.pre}>{note}</pre><button onClick={copy} style={S.copy}>{copied?"已複製":"複製英文 TDM Note"}</button></Card>
    <Note title="不同器官為什麼 target 不同？" open><p style={S.p}>排斥風險、免疫原性、可接受毒性與合併免疫抑制策略都不同。一般是移植早期與高排斥風險使用較高 exposure，穩定後降低；合併 everolimus、MMF 或腎毒性時常降低 tacrolimus target。表內數字是常用參考，不取代移植中心 protocol。</p><Table columns={["情境","常用參考概念"]} rows={[["Kidney","Tacrolimus 常見 early 8-12、之後 5-8 ng/mL；合併 everolimus 時多降至約 3-7。"],["Liver","EASL 2024：Tac 6-10 ng/mL first month、之後 4-8；腎保護 combination 可更低。"],["Heart","Tacrolimus 常隨時間由約 10-15 降至 5-10；Everolimus + CNI 常用 3-8 ng/mL。"],["Lung","Tacrolimus 常見 early 10-15、穩定後約 8-12，但中心差異大。"]]}/></Note>
    <Note title="若懷疑急性排斥反應"><p style={S.p}><strong>低 trough 不是排斥的診斷，正常 trough 也不能排除排斥。</strong>先聯絡 transplant team，確認 adherence、採血時點、交互作用、感染與 graft function；多數器官需影像、DSA 與 biopsy 分型。</p><Table columns={["器官","常見處置框架"]} rows={[["Kidney","盡可能 biopsy 分型；T-cell mediated rejection 常先 corticosteroid，steroid-resistant/recurrent 可用 lymphocyte-depleting therapy；AMR 常需 center-specific PLEX/IVIG ± B-cell/plasma-cell directed therapy。"],["Liver","先排除 vascular/biliary complication、感染與藥物傷害並 biopsy；mild 可優化 maintenance，moderate-severe 常用 pulse corticosteroid；steroid-resistant 或 AMR 需升級專科治療。"],["Heart","依 endomyocardial biopsy、graft function 與 hemodynamics 分級；高劑量 steroid 常為起始，hemodynamic compromise/steroid-resistant 可能需 ATG；AMR 另採專門方案。"],["Lung","通常 bronchoscopy/BAL/transbronchial biopsy；acute cellular rejection 常用 systemic pulse steroid，refractory 或 AMR 需專科升級治療。"]]}/><div style={S.danger}><strong>不要只為了「追高 trough」延誤 rejection work-up。</strong>同時有感染時，盲目加強免疫抑制可能造成嚴重傷害。</div></Note>
    <Note title="安全監測"><Table columns={["藥物","除了 trough 還要看"]} rows={[["Tacrolimus","SCr/尿量、K、Mg、BP、glucose、tremor/encephalopathy/seizure、QT、TMA；腹瀉時特別注意濃度升高。"],["Everolimus","CBC、lipid、proteinuria/renal function、LFT、口腔潰瘍、wound healing、edema、感染、noninfectious pneumonitis、TMA。"]]}/></Note>
    <div style={S.sources}>主要依據：Prograf 與 Zortress US prescribing information；ISHLT Heart Transplant Guideline 2023；EASL Liver Transplantation Guideline 2024；KDIGO Kidney Transplant Recipient Guideline。目標與 rejection treatment 必須以病人所屬移植中心 protocol 為準。</div>
  </div>;
}

const S:Record<string,CSSProperties>={
  header:{textAlign:"center",padding:"16px 14px 22px"},kicker:{color:ACCENT,fontWeight:800,fontSize:12,textTransform:"uppercase"},title:{margin:"5px 0",fontSize:26,color:"#0F172A"},subtitle:{margin:0,color:"#64748B",fontSize:14},notice:{background:"#F0FDFA",border:"1px solid #99F6E4",color:"#115E59",padding:14,borderRadius:8,lineHeight:1.65,marginBottom:14},card:{background:"#fff",border:"1px solid #E2E8F0",borderRadius:8,padding:16,marginBottom:14},cardTitle:{fontSize:14,fontWeight:800,color:"#334155",marginBottom:14},grid3:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12},grid2:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:12},field:{minWidth:0},label:{display:"block",fontSize:13,fontWeight:700,color:"#475569",marginBottom:6},hint:{display:"block",fontSize:11,color:"#94A3B8",marginTop:4},input:{width:"100%",boxSizing:"border-box",padding:"10px 12px",border:"1.5px solid #DCE4EE",borderRadius:8,background:"#fff",fontSize:15,color:"#0F172A"},dateTimeInput:{fontSize:13,minHeight:44},timingSummary:{marginTop:10,padding:"9px 12px",borderRadius:8,background:"#F8FAFC",color:"#475569",fontSize:13},targetBanner:{display:"flex",flexDirection:"column",gap:4,marginTop:14,padding:13,borderRadius:8,background:"#F0FDFA",color:"#0F766E"},checkRow:{display:"flex",flexWrap:"wrap",gap:16,marginTop:12,color:"#475569",fontSize:13},resultGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,marginTop:14},result:{display:"flex",flexDirection:"column",gap:5,padding:13,border:"1px solid #CCFBF1",borderRadius:8,background:"#F0FDFA",color:"#0F766E"},info:{padding:12,border:"1px solid #BFDBFE",borderRadius:8,background:"#EFF6FF",color:"#1E40AF",lineHeight:1.6,fontSize:13,marginTop:12},warn:{padding:12,border:"1px solid #FDE68A",borderRadius:8,background:"#FFFBEB",color:"#92400E",lineHeight:1.6,fontSize:13,marginTop:12},danger:{padding:12,border:"1px solid #FCA5A5",borderRadius:8,background:"#FEF2F2",color:"#991B1B",lineHeight:1.6,fontSize:13,marginTop:12},pre:{whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#0F172A",color:"#E2E8F0",padding:14,borderRadius:8,fontSize:12,lineHeight:1.6},copy:{width:"100%",padding:11,border:0,borderRadius:8,background:ACCENT,color:"#fff",fontWeight:800,cursor:"pointer"},note:{background:"#fff",border:"1px solid #E2E8F0",borderRadius:8,marginBottom:12,overflow:"hidden"},summary:{padding:14,fontWeight:800,color:"#334155",cursor:"pointer"},noteBody:{padding:"0 14px 14px"},p:{fontSize:14,color:"#475569",lineHeight:1.7},tableWrap:{overflowX:"auto",WebkitOverflowScrolling:"touch",WebkitTextSizeAdjust:"100%"},table:{width:"100%",borderCollapse:"collapse",minWidth:620,fontSize:13,WebkitTextSizeAdjust:"100%"},th:{textAlign:"left",padding:10,background:"#F8FAFC",color:"#64748B",borderBottom:"1px solid #E2E8F0",fontSize:13},td:{padding:10,color:"#475569",lineHeight:1.55,borderBottom:"1px solid #EEF2F7",verticalAlign:"top",fontSize:13},tdStrong:{padding:10,color:"#0F172A",fontWeight:800,borderBottom:"1px solid #EEF2F7",verticalAlign:"top",fontSize:13},sources:{color:"#94A3B8",fontSize:11,lineHeight:1.6,padding:"8px 4px 20px"}
};
