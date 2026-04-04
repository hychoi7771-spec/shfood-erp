import { useState, useRef } from "react";
import { C, css, fmtW } from "../lib/styles";
import { MONTHS, MONTH_NAMES } from "../lib/config";
import { PeriodSelector } from "./Common";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY;

async function ocrReceipt(file) {
  if (!ANTHROPIC_KEY) throw new Error("VITE_ANTHROPIC_KEY가 .env에 설정되지 않았습니다");
  const base64 = await new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result.split(",")[1]);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
  const prompt = `이 영수증에서 다음 정보를 추출해 JSON으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.
{
  "date": "날짜 YYYY-MM-DD 형식 (없으면 오늘)",
  "store_name": "가맹점/상호명",
  "amount": 총금액(숫자, 콤마없이),
  "category": "다음 중 하나: 인건비, 물류비, 임차료, 소모품비, 통신비, 수수료, 광고선전비, 접대비, 기타"
}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: file.type || "image/jpeg", data: base64 } },
        { type: "text", text: prompt },
      ]}],
    }),
  });
  if (!res.ok) throw new Error(`API 오류 ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSON 파싱 실패");
  return JSON.parse(match[0]);
}

export default function PLStatement({sales,expenses,onAddExpense,period,setPeriod}){
  const [addOpen,setAddOpen]=useState(false);
  const [newExp,setNewExp]=useState({month:"03",category:"인건비",name:"",amount:""});
  const [ocrLoading,setOcrLoading]=useState(false);
  const [ocrPreview,setOcrPreview]=useState(null);
  const fileInputRef=useRef();

  const handleOCR = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrPreview(URL.createObjectURL(file));
    setOcrLoading(true);
    try {
      const result = await ocrReceipt(file);
      const month = result.date ? result.date.slice(5,7) : newExp.month;
      setNewExp(p => ({
        ...p,
        month:    month,
        name:     result.store_name || p.name,
        amount:   result.amount    || p.amount,
        category: result.category  || p.category,
      }));
    } catch(err) {
      alert("OCR 실패: " + err.message);
    }
    setOcrLoading(false);
    e.target.value = "";
  };
  const fS=sales.filter(s=>s.date?.slice(5,7)>=period.startMonth&&s.date?.slice(5,7)<=period.endMonth&&s.date?.startsWith(period.year));
  const fE=expenses.filter(e=>e.month>=period.startMonth&&e.month<=period.endMonth);
  const revenue=fS.reduce((s,r)=>s+(r.totalAmount||r.total_amount||0),0);
  const cogs=fS.reduce((s,r)=>s+(r.costAmount||r.cost_amount||0),0);
  const grossProfit=revenue-cogs;
  const expTotal=fE.reduce((s,e)=>s+Number(e.amount),0);
  const opProfit=grossProfit-expTotal;
  const vat=fS.reduce((s,r)=>s+(r.vat||0),0);
  const expByCat={};
  fE.forEach(e=>{expByCat[e.category]=(expByCat[e.category]||0)+Number(e.amount);});
  const Row=({label,value,bold,color,indent=0,border})=>(
    <tr style={{background:bold?`${C.accent}08`:"transparent",borderTop:border?`1px solid ${C.border}`:"none"}}>
      <td style={{...css.td,paddingLeft:14+indent*16,fontSize:bold?13:12,fontWeight:bold?700:400,color:bold?C.text:C.muted}}>{label}</td>
      <td style={{...css.tdR,fontWeight:bold?800:400,color:color||C.text,fontSize:bold?14:13}}>{value>=0?fmtW(value):<span style={{color:C.red}}>({fmtW(Math.abs(value))})</span>}</td>
      <td style={{...css.tdR,fontSize:11,color:C.muted}}>{revenue>0?`${(value/revenue*100).toFixed(1)}%`:"-"}</td>
    </tr>
  );
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:800}}>손익계산서</h2>
        <button style={css.btn(C.purple)} onClick={()=>setAddOpen(true)}>+ 비용 추가</button>
      </div>
      <PeriodSelector period={period} setPeriod={setPeriod}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:16}}>
        {[{label:"매출액",value:revenue,color:C.accent},{label:"매출총이익",value:grossProfit,color:C.green},{label:"영업이익",value:opProfit,color:opProfit>=0?C.cyan:C.red},{label:"부가세",value:vat,color:C.yellow}].map(c=>(
          <div key={c.label} style={{...css.card,borderLeft:`4px solid ${c.color}`,padding:14}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{c.label}</div>
            <div style={{fontSize:18,fontWeight:800,color:c.color}}>{fmtW(c.value)}</div>
            <div style={{fontSize:10,color:C.muted}}>{revenue>0?`${(c.value/revenue*100).toFixed(1)}%`:""}</div>
          </div>
        ))}
      </div>
      <div style={css.card}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={css.th}>항목</th><th style={css.thR}>금액</th><th style={css.thR}>비율</th></tr></thead>
          <tbody>
            <Row label="Ⅰ. 매출액" value={revenue} bold color={C.accent} border/>
            <Row label="Ⅱ. 매출원가 (추정 60%)" value={cogs} bold border/>
            <Row label="Ⅲ. 매출총이익" value={grossProfit} bold color={C.green} border/>
            <Row label="Ⅳ. 판매비와 관리비" value={expTotal} bold border/>
            {Object.entries(expByCat).map(([cat,amt])=><Row key={cat} label={cat} value={amt} indent={1}/>)}
            <Row label="Ⅴ. 영업이익" value={opProfit} bold color={opProfit>=0?C.cyan:C.red} border/>
          </tbody>
        </table>
      </div>
      {addOpen&&(
        <div style={{position:"fixed",inset:0,background:"#000a",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:16}}>
          <div style={{...css.card,width:"100%",maxWidth:420}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><h3 style={{margin:0}}>비용 추가</h3><button style={css.btn(C.muted,true)} onClick={()=>{setAddOpen(false);setOcrPreview(null);}}>✕</button></div>

            {/* OCR 영수증 업로드 */}
            <div style={{marginBottom:14,padding:10,background:`${C.cyan}11`,border:`1px solid ${C.cyan}33`,borderRadius:8}}>
              <div style={{fontSize:11,fontWeight:700,color:C.cyan,marginBottom:6}}>📷 영수증 OCR 자동입력</div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleOCR}/>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <button style={{...css.btn(C.cyan),fontSize:11}} onClick={()=>fileInputRef.current.click()} disabled={ocrLoading}>
                  {ocrLoading?"⏳ 분석 중...":"📎 영수증 업로드"}
                </button>
                {!ANTHROPIC_KEY&&<span style={{fontSize:10,color:C.red}}>⚠️ VITE_ANTHROPIC_KEY 필요</span>}
              </div>
              {ocrPreview&&!ocrLoading&&(
                <div style={{marginTop:6,display:"flex",alignItems:"center",gap:6}}>
                  <img src={ocrPreview} alt="영수증" style={{height:48,borderRadius:4,border:`1px solid ${C.border}`,objectFit:"cover"}}/>
                  <span style={{fontSize:10,color:C.green,fontWeight:700}}>✅ 자동입력 완료 — 확인 후 저장</span>
                  <button style={{...css.btn(C.muted,true),fontSize:10}} onClick={()=>setOcrPreview(null)}>✕</button>
                </div>
              )}
            </div>

            <div style={{display:"grid",gap:10}}>
              <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>월</label><select style={{...css.select,width:"100%"}} value={newExp.month} onChange={e=>setNewExp(p=>({...p,month:e.target.value}))}>{MONTHS.map((m,i)=><option key={m} value={m}>{MONTH_NAMES[i]}</option>)}</select></div>
              <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>분류</label><select style={{...css.select,width:"100%"}} value={newExp.category} onChange={e=>setNewExp(p=>({...p,category:e.target.value}))}>{["인건비","물류비","임차료","소모품비","통신비","수수료","광고선전비","접대비","기타"].map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>항목명</label><input style={css.input} value={newExp.name} onChange={e=>setNewExp(p=>({...p,name:e.target.value}))} placeholder="직원급여, 택배비 등"/></div>
              <div><label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>금액</label><input type="number" style={css.input} value={newExp.amount} onChange={e=>setNewExp(p=>({...p,amount:e.target.value}))} placeholder="0"/></div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
              <button style={css.btn(C.muted)} onClick={()=>setAddOpen(false)}>취소</button>
              <button style={css.btn(C.green)} onClick={async()=>{
                if(!newExp.name||!newExp.amount) return alert("항목명과 금액을 입력하세요");
                await onAddExpense({...newExp,amount:Number(newExp.amount)});
                setAddOpen(false);
                setOcrPreview(null);
                setNewExp({month:"03",category:"인건비",name:"",amount:""});
              }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
