import { useState } from "react";
import { C, css, fmtW } from "../lib/styles";

export default function AIPage({sales,inventory,stats}){
  const [query,setQuery]=useState("");
  const [answer,setAnswer]=useState("");
  const [loading,setLoading]=useState(false);
  const samples=["이번달 매출 요약","미수금 많은 거래처는?","재고 부족 품목","채널별 매출 비교"];
  const ask=async(q)=>{
    const qr=q||query;if(!qr.trim())return;
    setLoading(true);setAnswer("");
    const ctx=`㈜에스에이치푸드 ERP 데이터:\n총매출(공급가): ${fmtW(stats.totalSales)}\n미수금: ${fmtW(stats.receivable)}\n재고부족: ${stats.lowStock}개\n최근매출:\n${sales.slice(-8).map(s=>`[${s.date}] ${s.customer} / ${s.channel||"B2B"} / ${fmtW(s.grandTotal||s.grand_total||0)} / ${s.status}`).join("\n")}\n재고:\n${inventory.map(i=>`  ${i.productName||i.product_name}: ${i.stock}개`).join("\n")}\n\n질문: ${qr}\n\n한국어로 간결하게 답해주세요.`;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:ctx}]})});
      const data=await res.json();
      setAnswer(data.content?.[0]?.text||"응답 없음");
    }catch(e){setAnswer("오류: "+e.message);}
    setLoading(false);
  };
  return (
    <div>
      <h2 style={{margin:"0 0 6px",fontSize:20,fontWeight:800}}>🤖 AI 경영 질의</h2>
      <p style={{color:C.muted,marginBottom:16,fontSize:13}}>DB 데이터를 기반으로 자연어로 질문하세요</p>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
        {samples.map(s=><button key={s} style={{...css.btn(C.border,true),color:C.text}} onClick={()=>{setQuery(s);ask(s);}}>{s}</button>)}
      </div>
      <div style={{...css.card,marginBottom:14}}>
        <div style={{display:"flex",gap:8}}>
          <input style={{...css.input,flex:1}} placeholder="질문 입력..." value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask()}/>
          <button style={css.btn(C.accent)} onClick={()=>ask()} disabled={loading}>{loading?"분석중...":"질문"}</button>
        </div>
      </div>
      {(loading||answer)&&<div style={{...css.card,borderLeft:`4px solid ${C.accent}`}}>
        <div style={{fontSize:11,color:C.muted,marginBottom:8}}>🤖 AI 답변</div>
        {loading?<div style={{color:C.muted}}>분석 중...</div>:<div style={{fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{answer}</div>}
      </div>}
    </div>
  );
}
