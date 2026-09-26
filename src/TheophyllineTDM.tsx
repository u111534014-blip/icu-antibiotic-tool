import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import DateTime24Input from "./DateTime24Input";

type Formulation="ir"|"er12"|"er24"|"iv";
type Context="none"|"inhibitor"|"inducer"|"smoking"|"quitSmoking"|"illness";
const ACCENT="#0D9488";
const n=(v:string)=>Number.parseFloat(v)||0;
const hoursBetween=(start:string,end:string)=>{
  if(!start||!end)return null;
  const diff=(new Date(end).getTime()-new Date(start).getTime())/3600000;
  return Number.isFinite(diff)&&diff>=0?diff:null;
};
const showDateTime=(value:string)=>value?value.replace("T"," "):"--";
function Card({title,children}:{title:string;children:ReactNode}){return <section style={S.card}><div style={S.cardTitle}>{title}</div>{children}</section>}
function Field({label,hint,children}:{label:string;hint?:string;children:ReactNode}){return <label style={S.field}><span style={S.label}>{label}</span>{children}{hint&&<span style={S.hint}>{hint}</span>}</label>}
function Note({title,children,open=false}:{title:string;children:ReactNode;open?:boolean}){return <details open={open} style={S.note}><summary style={S.summary}>{title}</summary><div style={S.noteBody}>{children}</div></details>}
function Table({columns,rows}:{columns:string[];rows:string[][]}){return <div style={S.tableWrap}><table style={S.table}><thead><tr>{columns.map(x=><th key={x} style={S.th}>{x}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((x,j)=><td key={j} style={j===0?S.tdStrong:S.td}>{x}</td>)}</tr>)}</tbody></table></div>}

export default function TheophyllineTDM(){
  const [formulation,setFormulation]=useState<Formulation>("er12");
  const [dailyDose,setDailyDose]=useState("");
  const [level,setLevel]=useState("");
  const [lastDoseTime,setLastDoseTime]=useState("");
  const [levelTime,setLevelTime]=useState("");
  const [steady,setSteady]=useState(false);
  const [symptoms,setSymptoms]=useState(false);
  const [context,setContext]=useState<Context>("none");
  const [copied,setCopied]=useState(false);
  const info:Record<Context,{title:string;effect:string;action:string}>={
    none:{title:"未選重大變化",effect:"仍須核對完整 medication list、吸菸狀態、發燒與肝心功能。",action:"若抽血時點與 steady state 正確，再依濃度與症狀判讀。"},
    inhibitor:{title:"Clearance 下降／濃度可能升高",effect:"Ciprofloxacin、erythromycin/clarithromycin、fluvoxamine、cimetidine、zileuton、高劑量 allopurinol 等可能升高濃度。",action:"避免或預先減量並提早複測；出現 nausea、vomiting、tremor、tachyarrhythmia 或 seizure 時立即停藥評估。"},
    inducer:{title:"Clearance 增加／濃度可能下降",effect:"Rifampin、carbamazepine、phenytoin、phenobarbital 等可能降低濃度。",action:"避免僅依單一低值大幅加量；inducer 停用後濃度可能反彈，需再次 TDM。"},
    smoking:{title:"目前持續吸菸",effect:"Tobacco 或 marijuana smoke 可誘導 CYP1A2、增加 theophylline clearance；效果來自煙霧，不是 nicotine 本身。",action:"需求可能較高，但仍依濃度調整；住院無法吸菸時要當作『突然停菸』處理。"},
    quitSmoking:{title:"近期停菸／住院後無法吸菸",effect:"CYP1A2 induction 逐漸消退，原本穩定劑量可能造成濃度上升與中毒。",action:"儘早複測並考慮預先減量；出院恢復吸菸時濃度又可能下降。"},
    illness:{title:"急性疾病造成 clearance 下降",effect:"高燒、sepsis、肝功能不全、急性肺水腫或 heart failure 可降低 clearance；高齡也增加風險。",action:"避免依原長期劑量照給；密切 TDM，優先處理毒性與急性病因。"},
  };
  const result=useMemo(()=>{
    const c=n(level),dose=n(dailyDose); if(!c)return {tone:"gray",title:"尚未輸入濃度",action:"先確認製劑、最後一劑與抽血時間。",estimate:null as number|null};
    if(symptoms||c>=20)return {tone:"red",title:c>=30?"嚴重中毒範圍":"可能中毒",action:"立即停用 theophylline，心電圖與連續監測，抽 K/glucose/renal function；反覆測濃度。seizure、嚴重 arrhythmia 或高濃度需立即毒物／腎臟專科評估 extracorporeal removal。",estimate:null};
    if(c>=15)return {tone:"amber",title:"偏高",action:"即使未達 20 mcg/mL，副作用風險已增加；重新確認採血時點、交互作用與症狀，通常考慮保守減量並複測。",estimate:dose?Math.round(dose*.9/25)*25:null};
    if(c>=10)return {tone:"green",title:"常用 efficacy/safety 目標內",action:"多數效益可在 10-15 mcg/mL 取得；若臨床穩定通常維持，不為了追到 20 而加量。",estimate:dose||null};
    if(c>=5)return {tone:"blue",title:"5-10 mcg/mL：可能已有部分效果",action:"先看適應症與臨床反應。若控制良好可不必追高；若效果不足，確認 adherence、時點與交互作用後再小幅調整。",estimate:dose?Math.round(dose*1.15/25)*25:null};
    return {tone:"blue",title:"低濃度",action:"先排除非 steady state、漏服、錯誤抽血時點、吸菸或 inducer；若確需調整，以小幅增加並重新 TDM，避免一次追高。",estimate:dose?Math.round(dose*1.25/25)*25:null};
  },[dailyDose,level,symptoms]);
  const hoursAfter=hoursBetween(lastDoseTime,levelTime);
  const timingValid=steady&&hoursAfter!==null;
  const toneStyle=result.tone==="red"?S.red:result.tone==="amber"?S.amber:result.tone==="green"?S.green:result.tone==="blue"?S.blue:S.gray;
  const concentration=n(level);
  const assessmentEn=!concentration?"Level not entered; confirm formulation and sampling time.":symptoms||concentration>=20?"Possible theophylline toxicity. Hold therapy and obtain urgent ECG, electrolytes, glucose, renal function, and serial levels; escalate to poison/nephrology support when severe.":concentration>=15?"Concentration is above the preferred 10-15 mcg/mL range. Reassess timing, symptoms, interactions, and consider a conservative reduction.":concentration>=10?"Concentration is within the usual 10-15 mcg/mL efficacy/safety target.":concentration>=5?"Concentration is 5-10 mcg/mL; partial benefit may be present. Adjust only if clinical control is inadequate after confirming timing and adherence.":"Low concentration. Verify steady state, adherence, sampling time, smoking, and enzyme inducers before increasing the dose.";
  const contextEn=({none:"No major clearance change selected; complete medication reconciliation and clinical review are still required.",inhibitor:"A clearance inhibitor is present; avoid if possible, consider preemptive dose reduction, and repeat the level early.",inducer:"A clearance inducer is present; avoid large reflex dose increases and repeat TDM when the inducer is started or stopped.",smoking:"Active smoking may increase clearance through smoke-related CYP1A2 induction; reassess if smoking status changes.",quitSmoking:"Recent smoking cessation may reduce clearance and increase toxicity risk; repeat the level early and consider preemptive reduction.",illness:"Fever, sepsis, heart failure, or hepatic dysfunction may reduce clearance; use a conservative dose and close TDM."} as Record<Context,string>)[context];
  const note=["=== Theophylline TDM Note ===",`Formulation: ${formulation}; current dose: ${dailyDose||"--"} mg/day.`,`Last dose: ${showDateTime(lastDoseTime)}. Level drawn: ${showDateTime(levelTime)}${hoursAfter!==null?` (${hoursAfter.toFixed(1)} hr after the last dose)`:""}.`,`Serum theophylline: ${level||"--"} mcg/mL.`,`Steady state: ${steady?"reported":"not confirmed"}. Toxicity symptoms: ${symptoms?"present":"not reported"}.`,`Assessment: ${assessmentEn}`,`Interaction/context: ${contextEn}`,result.estimate&&!symptoms?`Dose-planning estimate: approximately ${result.estimate} mg/day; verify formulation, timing, interaction trajectory, and clinical response before use.`:""].filter(Boolean).join("\n");
  const copy=async()=>{await navigator.clipboard.writeText(note);setCopied(true);setTimeout(()=>setCopied(false),1500)};
  return <div>
    <header style={S.header}><div style={S.kicker}>Respiratory pharmacology</div><h1 style={S.title}>Theophylline TDM</h1><p style={S.subtitle}>濃度、製劑、採血時點、吸菸與急性病況一起判讀</p></header>
    <div style={S.notice}><strong>Narrow therapeutic index。</strong>濃度不能脫離症狀與採血時點判讀；噁心、嘔吐、明顯 tremor、tachyarrhythmia 或 seizure 時，即使結果尚未回報也要先按中毒處理。</div>
    <Card title="目前治療與採血"><div style={S.grid2}>
      <Field label="製劑"><select value={formulation} onChange={e=>setFormulation(e.target.value as Formulation)} style={S.input}><option value="ir">Immediate-release PO</option><option value="er12">Extended-release Q12H</option><option value="er24">Extended-release Q24H</option><option value="iv">IV aminophylline / theophylline</option></select></Field>
      <Field label="目前 total daily dose" hint="mg/day"><input value={dailyDose} onChange={e=>setDailyDose(e.target.value)} inputMode="decimal" style={S.input}/></Field>
      <Field label="Serum theophylline" hint="mcg/mL = mg/L"><input value={level} onChange={e=>setLevel(e.target.value)} inputMode="decimal" style={S.input}/></Field>
      <DateTime24Input label="最後一劑給藥時間" value={lastDoseTime} onChange={setLastDoseTime} labelStyle={S.label} inputStyle={S.dateTimeInput}/>
      <DateTime24Input label="抽血時間" value={levelTime} onChange={setLevelTime} labelStyle={S.label} inputStyle={S.dateTimeInput}/>
    </div><div style={S.checkRow}><label><input type="checkbox" checked={steady} onChange={e=>setSteady(e.target.checked)}/> 劑量穩定且已達 steady state</label><label><input type="checkbox" checked={symptoms} onChange={e=>setSymptoms(e.target.checked)}/> 有疑似 toxicity symptoms</label></div>
      {hoursAfter!==null&&<div style={S.timingSummary}>抽血距最後一劑 <strong>{hoursAfter.toFixed(1)} 小時</strong></div>}
      <div style={{...S.result,...toneStyle}}><strong>{result.title}</strong><span>{result.action}</span>{result.estimate&&!symptoms&&<small>粗估 dose-planning：{result.estimate} mg/day；不是可直接執行的處方。</small>}</div>
      {!timingValid&&<div style={S.warn}><strong>目前採血品質尚未確認。</strong>Theophylline 不同 ER 製劑的 peak 時點不同，不能把所有濃度都當 trough。請記錄產品、給藥與抽血時間；若疑似中毒則不必等待 steady state。</div>}
    </Card>
    <Card title="交互作用與 clearance 變化"><Field label="目前最重要的變化"><select value={context} onChange={e=>setContext(e.target.value as Context)} style={S.input}><option value="none">無已知重大變化／尚未核對</option><option value="inhibitor">加入 clearance inhibitor</option><option value="inducer">加入 clearance inducer</option><option value="smoking">持續吸菸</option><option value="quitSmoking">近期停菸／住院禁菸</option><option value="illness">高燒、sepsis、HF 或 hepatic dysfunction</option></select></Field><div style={context==="none"?S.info:S.warn}><strong>{info[context].title}</strong>{info[context].effect}<br/>{info[context].action}</div></Card>
    <Card title="TDM Note"><pre style={S.pre}>{note}</pre><button style={S.copy} onClick={copy}>{copied?"已複製":"複製英文 TDM Note"}</button></Card>
    <Note title="目標濃度怎麼看？" open><Table columns={["濃度","解讀"]} rows={[["5-10 mcg/mL","可能已有 bronchodilator/anti-inflammatory effect；若控制良好，不一定需要追高。"],["10-15 mcg/mL","多數病人兼顧 efficacy 與安全性的常用目標。"],["15-20 mcg/mL","效益增加有限、副作用增加；通常不把 20 當作常規追求目標。"],[">=20 mcg/mL","中毒風險明顯增加；停止給藥並立即評估。慢性中毒在較低濃度也可能很嚴重，尤其高齡或低 protein binding。"]]}/></Note>
    <Note title="採血時間"><p style={S.p}>不要只寫「theophylline level」。應同時記錄商品／IR 或 ER 製劑、劑量、最後一劑時間、抽血時間與是否 steady state。若要評估維持治療，通常在新劑量約 3 天後或達 steady state 再測；特定 Q24H/Q12H 製劑應依產品說明選擇 peak 或 trough 時點。若懷疑中毒，立即抽血並 serial level，不需等正確例行時點。</p></Note>
    <Note title="中毒時不能只看一個數字"><Table columns={["問題","處置重點"]} rows={[["輕微症狀","先停藥、ECG、K/Mg/glucose/renal function、重複濃度並找交互作用。"],["Seizure","Benzodiazepine 為起始治療；避免以 phenytoin 作為 theophylline-related seizure 的主要治療。"],["嚴重 arrhythmia / shock","依 ACLS 與毒物專科建議處理；積極矯正低 K，但注意濃度下降後 rebound hyperkalemia。"],["嚴重或持續上升濃度","及早聯絡 poison center/毒物與腎臟專科評估 multiple-dose activated charcoal 與 extracorporeal treatment。慢性中毒的透析門檻通常比急性 overdose 更低。"]]}/></Note>
    <div style={S.sources}>主要依據：current US theophylline prescribing information。Theophylline 現今多非 asthma/COPD 常規第一線；使用與 target 應依適應症、製劑、臨床反應與院內流程個別化。</div>
  </div>
}

const S:Record<string,CSSProperties>={header:{textAlign:"center",padding:"16px 42px 22px"},kicker:{color:ACCENT,fontWeight:800,fontSize:12,textTransform:"uppercase"},title:{margin:"5px 0",fontSize:30,color:"#0F172A"},subtitle:{margin:0,color:"#64748B",fontSize:14},notice:{background:"#F0FDFA",border:"1px solid #99F6E4",color:"#115E59",padding:14,borderRadius:8,lineHeight:1.65,marginBottom:14},card:{background:"#fff",border:"1px solid #E2E8F0",borderRadius:8,padding:16,marginBottom:14},cardTitle:{fontSize:14,fontWeight:800,color:"#334155",marginBottom:14},grid2:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12},field:{minWidth:0},label:{display:"block",fontSize:13,fontWeight:700,color:"#475569",marginBottom:6},hint:{display:"block",fontSize:11,color:"#94A3B8",marginTop:4},input:{width:"100%",boxSizing:"border-box",padding:"10px 12px",border:"1.5px solid #DCE4EE",borderRadius:8,background:"#fff",fontSize:15,color:"#0F172A"},dateTimeInput:{fontSize:13,minHeight:44},timingSummary:{marginTop:10,padding:"9px 12px",borderRadius:8,background:"#F8FAFC",color:"#475569",fontSize:13},checkRow:{display:"flex",flexWrap:"wrap",gap:16,marginTop:12,color:"#475569",fontSize:13},result:{display:"flex",flexDirection:"column",gap:5,padding:14,borderRadius:8,marginTop:14,lineHeight:1.55},red:{background:"#FEF2F2",border:"1px solid #FCA5A5",color:"#991B1B"},amber:{background:"#FFFBEB",border:"1px solid #FDE68A",color:"#92400E"},green:{background:"#ECFDF5",border:"1px solid #6EE7B7",color:"#065F46"},blue:{background:"#EFF6FF",border:"1px solid #BFDBFE",color:"#1E40AF"},gray:{background:"#F8FAFC",border:"1px solid #CBD5E1",color:"#475569"},warn:{padding:12,border:"1px solid #FDE68A",borderRadius:8,background:"#FFFBEB",color:"#92400E",lineHeight:1.6,fontSize:13,marginTop:12},info:{padding:12,border:"1px solid #BFDBFE",borderRadius:8,background:"#EFF6FF",color:"#1E40AF",lineHeight:1.6,fontSize:13,marginTop:12},pre:{whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#0F172A",color:"#E2E8F0",padding:14,borderRadius:8,fontSize:12,lineHeight:1.6},copy:{width:"100%",padding:11,border:0,borderRadius:8,background:ACCENT,color:"#fff",fontWeight:800,cursor:"pointer"},note:{background:"#fff",border:"1px solid #E2E8F0",borderRadius:8,marginBottom:12,overflow:"hidden"},summary:{padding:14,fontWeight:800,color:"#334155",cursor:"pointer"},noteBody:{padding:"0 14px 14px"},p:{fontSize:14,color:"#475569",lineHeight:1.7},tableWrap:{overflowX:"auto",WebkitOverflowScrolling:"touch",WebkitTextSizeAdjust:"100%"},table:{width:"100%",borderCollapse:"collapse",minWidth:600,fontSize:13,WebkitTextSizeAdjust:"100%"},th:{textAlign:"left",padding:10,background:"#F8FAFC",color:"#64748B",borderBottom:"1px solid #E2E8F0",fontSize:13},td:{padding:10,color:"#475569",lineHeight:1.55,borderBottom:"1px solid #EEF2F7",verticalAlign:"top",fontSize:13},tdStrong:{padding:10,color:"#0F172A",fontWeight:800,borderBottom:"1px solid #EEF2F7",verticalAlign:"top",fontSize:13},sources:{color:"#94A3B8",fontSize:11,lineHeight:1.6,padding:"8px 4px 20px"}};
