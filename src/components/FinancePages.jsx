import { useState, useMemo } from "react";
import { C, css, fmtW, pct } from "../lib/styles";
import { MONTHS, MONTH_NAMES } from "../lib/config";
import { PeriodSelector } from "./Common";

export function BalanceSheet({sales,expenses,period,setPeriod}){
  const fS=sales.filter(s=>s.date?.slice(5,7)>=period.startMonth&&s.date?.slice(5,7)<=period.endMonth&&s.date?.startsWith(period.year));
  const fE=expenses.filter(e=>e.month>=period.startMonth&&e.month<=period.endMonth);
  const collected=fS.reduce((s,r)=>r.status==="수금완료"?s+(r.grandTotal||r.grand_total||0):r.status==="부분수금"?s+(r.collected||0):s,0);
  const receivable=fS.reduce((s,r)=>r.status==="수금완료"?s:r.status==="부분수금"?s+(r.grandTotal||r.grand_total||0)-(r.collected||0):s+(r.grandTotal||r.grand_total||0),0);
  const totalExp=fE.reduce((s,e)=>s+Number(e.amount),0);
  const cogs=fS.reduce((s,r)=>s+(r.costAmount||r.cost_amount||0),0);
  const cash=Math.max(collected-totalExp-cogs,0);
  const vatPayable=fS.reduce((s,r)=>s+(r.vat||0),0);
  const totalAssets=cash+receivable+8500000+1200000+3000000;
  const totalLiab=2300000+vatPayable+850000;
  const equity=totalAssets-totalLiab;
  return (
    <div>
      <h2 style={{margin:"0 0 16px",fontSize:20,fontWeight:800}}>재무상태표</h2>
      <PeriodSelector period={period} setPeriod={setPeriod}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:16}}>
        {[{label:"자산 총계",value:totalAssets,color:C.accent},{label:"부채 총계",value:totalLiab,color:C.red},{label:"순자산(자본)",value:equity,color:C.green}].map(c=>(
          <div key={c.label} style={{...css.card,textAlign:"center",borderTop:`4px solid ${c.color}`}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:6}}>{c.label}</div>
            <div style={{fontSize:20,fontWeight:800,color:c.color}}>{fmtW(c.value)}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={css.card}>
          <div style={{fontWeight:700,color:C.accent,marginBottom:12}}>자산</div>
          {[{n:"현금·현금성자산",v:cash,note:"수금-비용"},{n:"매출채권(미수금)",v:receivable,note:"미수금합계"},{n:"재고자산(추정)",v:8500000,note:"3PL보관"},{n:"비품",v:1200000,note:""},{n:"보증금",v:3000000,note:""}].map(a=>(
            <div key={a.n} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}22`,fontSize:13}}>
              <span>{a.n}</span><span style={{fontWeight:600}}>{fmtW(a.v)}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",fontWeight:800,color:C.accent}}><span>자산 총계</span><span>{fmtW(totalAssets)}</span></div>
        </div>
        <div style={css.card}>
          <div style={{fontWeight:700,color:C.red,marginBottom:12}}>부채 + 자본</div>
          {[{n:"매입채무",v:2300000},{n:"부가세예수금",v:vatPayable},{n:"미지급비용",v:850000}].map(l=>(
            <div key={l.n} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}22`,fontSize:13}}>
              <span>{l.n}</span><span style={{fontWeight:600}}>{fmtW(l.v)}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",fontWeight:700,color:C.red}}><span>부채 총계</span><span>{fmtW(totalLiab)}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",fontWeight:700,color:C.green}}><span>자본(순자산)</span><span>{fmtW(equity)}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",fontWeight:800,color:C.accent}}><span>부채+자본 총계</span><span>{fmtW(totalLiab+equity)}</span></div>
        </div>
      </div>
    </div>
  );
}

export function CashFlow({sales,period,setPeriod}){
  const byCust=useMemo(()=>{
    const map={};
    sales.filter(s=>s.date?.startsWith(period.year)).forEach(s=>{
      const gt=s.grandTotal||s.grand_total||0;
      if(!map[s.customer]) map[s.customer]={customer:s.customer,total:0,collected:0};
      map[s.customer].total+=gt;
      if(s.status==="수금완료") map[s.customer].collected+=gt;
      else if(s.status==="부분수금") map[s.customer].collected+=(s.collected||0);
    });
    return Object.values(map).map(v=>({...v,receivable:v.total-v.collected})).sort((a,b)=>b.receivable-a.receivable);
  },[sales,period.year]);
  const totals=byCust.reduce((a,c)=>({total:a.total+c.total,collected:a.collected+c.collected,receivable:a.receivable+c.receivable}),{total:0,collected:0,receivable:0});
  return (
    <div>
      <h2 style={{margin:"0 0 16px",fontSize:20,fontWeight:800}}>매출채권 현황</h2>
      <PeriodSelector period={period} setPeriod={setPeriod}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:16}}>
        {[{label:"총 매출채권",value:totals.total,color:C.accent},{label:"수금 완료",value:totals.collected,color:C.green},{label:"미수금 잔액",value:totals.receivable,color:C.red}].map(c=>(
          <div key={c.label} style={{...css.card,textAlign:"center"}}><div style={{fontSize:12,color:C.muted,marginBottom:6}}>{c.label}</div><div style={{fontSize:20,fontWeight:800,color:c.color}}>{fmtW(c.value)}</div></div>
        ))}
      </div>
      <div style={{...css.card,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:380}}>
          <thead><tr><th style={css.th}>거래처</th><th style={css.thR}>총매출</th><th style={css.thR}>수금액</th><th style={css.thR}>미수금</th><th style={css.th}>수금율</th></tr></thead>
          <tbody>{byCust.filter(c=>c.total>0).map(c=>(
            <tr key={c.customer}>
              <td style={{...css.td,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.customer}</td>
              <td style={css.tdR}>{fmtW(c.total)}</td>
              <td style={{...css.tdR,color:C.green}}>{fmtW(c.collected)}</td>
              <td style={{...css.tdR,fontWeight:c.receivable>0?700:400,color:c.receivable>0?C.red:C.muted}}>{fmtW(c.receivable)}</td>
              <td style={{...css.td,fontSize:12}}>{pct(c.collected,c.total)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

export function VATReport({sales,period,setPeriod}){
  const fS=sales.filter(s=>s.date?.slice(5,7)>=period.startMonth&&s.date?.slice(5,7)<=period.endMonth&&s.date?.startsWith(period.year));
  const totalSupply=fS.reduce((s,r)=>s+(r.totalAmount||r.total_amount||0),0);
  const totalVat=fS.reduce((s,r)=>s+(r.vat||0),0);
  const byCust={};
  fS.forEach(s=>{if(!byCust[s.customer])byCust[s.customer]={customer:s.customer,supply:0,vat:0,count:0};byCust[s.customer].supply+=(s.totalAmount||s.total_amount||0);byCust[s.customer].vat+=(s.vat||0);byCust[s.customer].count++;});
  return (
    <div>
      <h2 style={{margin:"0 0 16px",fontSize:20,fontWeight:800}}>부가세 신고자료</h2>
      <PeriodSelector period={period} setPeriod={setPeriod}/>
      <div style={{...css.card,marginBottom:14,background:`${C.yellow}11`,borderColor:C.yellow}}>
        <div style={{fontWeight:700,color:C.yellow,marginBottom:4}}>📋 {period.year}년 부가가치세 ({period.startMonth}~{period.endMonth}월)</div>
        <div style={{fontSize:12,color:C.muted}}>※ 신고 참고자료입니다. 세무사에 확인하세요.</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:16}}>
        {[{label:"공급가액",value:totalSupply,color:C.accent},{label:"매출세액",value:totalVat,color:C.yellow},{label:"합계",value:totalSupply+totalVat,color:C.green}].map(c=>(
          <div key={c.label} style={{...css.card,textAlign:"center"}}><div style={{fontSize:12,color:C.muted,marginBottom:6}}>{c.label}</div><div style={{fontSize:20,fontWeight:800,color:c.color}}>{fmtW(c.value)}</div></div>
        ))}
      </div>
      <div style={{...css.card,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:420}}>
          <thead><tr><th style={css.th}>거래처</th><th style={css.thR}>건수</th><th style={css.thR}>공급가액</th><th style={css.thR}>세액</th><th style={css.thR}>합계</th></tr></thead>
          <tbody>{Object.values(byCust).map((c)=>(
            <tr key={c.customer}><td style={css.td}>{c.customer}</td><td style={css.tdR}>{c.count}</td><td style={css.tdR}>{fmtW(c.supply)}</td><td style={{...css.tdR,color:C.yellow}}>{fmtW(c.vat)}</td><td style={{...css.tdR,fontWeight:700}}>{fmtW(c.supply+c.vat)}</td></tr>
          ))}</tbody>
          <tfoot><tr style={{background:`${C.accent}11`}}><td style={{...css.td,fontWeight:800}}>합계</td><td style={{...css.tdR,fontWeight:700}}>{Object.values(byCust).reduce((s,c)=>s+c.count,0)}</td><td style={{...css.tdR,fontWeight:800,color:C.accent}}>{fmtW(totalSupply)}</td><td style={{...css.tdR,fontWeight:800,color:C.yellow}}>{fmtW(totalVat)}</td><td style={{...css.tdR,fontWeight:800,color:C.green}}>{fmtW(totalSupply+totalVat)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}

export function MonthlyClosing({sales,expenses}){
  const [closed,setClosed]=useState({"01":true,"02":true});
  const data=MONTHS.map((m,i)=>{
    const mS=sales.filter(s=>s.date?.slice(5,7)===m&&s.date?.startsWith("2025"));
    const mE=expenses.filter(e=>e.month===m);
    const revenue=mS.reduce((s,r)=>s+(r.totalAmount||r.total_amount||0),0);
    const cogs=mS.reduce((s,r)=>s+(r.costAmount||r.cost_amount||0),0);
    const expTotal=mE.reduce((s,e)=>s+Number(e.amount),0);
    const opProfit=revenue-cogs-expTotal;
    const vat=mS.reduce((s,r)=>s+(r.vat||0),0);
    const receivable=mS.filter(r=>r.status!=="수금완료").reduce((s,r)=>r.status==="부분수금"?s+(r.grandTotal||r.grand_total||0)-(r.collected||0):s+(r.grandTotal||r.grand_total||0),0);
    return {month:m,name:MONTH_NAMES[i],revenue,opProfit,vat,receivable,count:mS.length,closed:!!closed[m]};
  });
  return (
    <div>
      <h2 style={{margin:"0 0 16px",fontSize:20,fontWeight:800}}>월마감 · 결산</h2>
      <div style={{...css.card,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
          <thead><tr><th style={css.th}>월</th><th style={css.thR}>매출</th><th style={css.thR}>영업이익</th><th style={css.thR}>부가세</th><th style={css.thR}>미수금</th><th style={css.th}>전표</th><th style={css.th}>마감</th></tr></thead>
          <tbody>{data.map(m=>(
            <tr key={m.month} style={{opacity:m.revenue===0?0.4:1,background:m.closed?`${C.green}08`:"transparent"}}>
              <td style={{...css.td,fontWeight:700}}>{m.name}</td>
              <td style={css.tdR}>{m.revenue>0?fmtW(m.revenue):"-"}</td>
              <td style={{...css.tdR,color:m.opProfit>=0?C.cyan:C.red}}>{m.revenue>0?fmtW(m.opProfit):"-"}</td>
              <td style={{...css.tdR,color:C.yellow}}>{m.vat>0?fmtW(m.vat):"-"}</td>
              <td style={{...css.tdR,color:m.receivable>0?C.red:C.muted}}>{fmtW(m.receivable)}</td>
              <td style={{...css.td,textAlign:"center"}}>{m.count||"-"}</td>
              <td style={css.td}>{m.revenue>0?<button style={css.btn(m.closed?C.muted:C.green,true)} onClick={()=>setClosed(p=>({...p,[m.month]:!p[m.month]}))}>{m.closed?"🔒 마감":"마감하기"}</button>:"-"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
