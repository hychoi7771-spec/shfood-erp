import { useMemo } from "react";
import { C, css, fmtW, pct } from "../lib/styles";
import { PeriodSelector } from "./Common";

export default function ChannelAnalysis({sales,period,setPeriod}){
  const fS=sales.filter(s=>s.date?.slice(5,7)>=period.startMonth&&s.date?.slice(5,7)<=period.endMonth&&s.date?.startsWith(period.year));
  const byChannel=useMemo(()=>{
    const map={};
    fS.forEach(s=>{const ch=s.channel||"B2B";if(!map[ch])map[ch]={channel:ch,revenue:0,cogs:0,vat:0,count:0};map[ch].revenue+=(s.totalAmount||s.total_amount||0);map[ch].cogs+=(s.costAmount||s.cost_amount||0);map[ch].vat+=(s.vat||0);map[ch].count++;});
    return Object.values(map).sort((a,b)=>b.revenue-a.revenue);
  },[fS]);
  const total=byChannel.reduce((s,c)=>s+c.revenue,0);
  const COLORS={"스마트스토어":C.green,"쿠팡":C.yellow,"홈쇼핑":C.purple,"B2B":C.accent,"기타":C.muted};
  return (
    <div>
      <h2 style={{margin:"0 0 16px",fontSize:20,fontWeight:800}}>채널별 분석</h2>
      <PeriodSelector period={period} setPeriod={setPeriod}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:16}}>
        {byChannel.map(c=>{const color=COLORS[c.channel]||C.muted;return(
          <div key={c.channel} style={{...css.card,borderTop:`4px solid ${color}`}}>
            <div style={{fontWeight:700,marginBottom:4}}>{c.channel}</div>
            <div style={{fontSize:20,fontWeight:800,color}}>{fmtW(c.revenue)}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:4}}>{pct(c.revenue,total)} · 마진 {c.revenue>0?((c.revenue-c.cogs)/c.revenue*100).toFixed(1):0}%</div>
          </div>
        );})}
      </div>
      <div style={css.card}>
        <div style={{display:"flex",height:28,borderRadius:8,overflow:"hidden",gap:2,marginBottom:12}}>
          {byChannel.map(c=>{const w=total>0?(c.revenue/total*100):0;const color=COLORS[c.channel]||C.muted;return w>3?<div key={c.channel} style={{width:`${w}%`,background:color,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:10,fontWeight:700,color:"#fff",whiteSpace:"nowrap"}}>{c.channel} {w.toFixed(0)}%</span></div>:null;})}
        </div>
      </div>
    </div>
  );
}
