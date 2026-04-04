import { useMemo } from "react";
import { C, css, fmtW } from "../lib/styles";

export default function SettlementPage({sales,onCollect}){
  const byCust=useMemo(()=>{
    const map={};
    sales.forEach(s=>{
      const gt=s.grandTotal||s.grand_total||0;
      if(!map[s.customer]) map[s.customer]={customer:s.customer,total:0,collected:0,receivable:0};
      map[s.customer].total+=gt;
      if(s.status==="수금완료") map[s.customer].collected+=gt;
      else if(s.status==="부분수금") map[s.customer].collected+=(s.collected||0);
    });
    Object.values(map).forEach(v=>v.receivable=v.total-v.collected);
    return Object.values(map).sort((a,b)=>b.receivable-a.receivable);
  },[sales]);
  const totalRec=byCust.reduce((s,c)=>s+c.receivable,0);
  return (
    <div>
      <h2 style={{margin:"0 0 6px",fontSize:20,fontWeight:800}}>정산 · 미수금</h2>
      <div style={{color:C.muted,marginBottom:20,fontSize:13}}>총 미수금: <b style={{color:C.red,fontSize:18}}>{fmtW(totalRec)}</b></div>
      <div style={{...css.card,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:400}}>
          <thead><tr><th style={css.th}>거래처</th><th style={css.thR}>총매출</th><th style={css.thR}>수금액</th><th style={css.thR}>미수금</th><th style={css.th}>조치</th></tr></thead>
          <tbody>{byCust.map(c=>(
            <tr key={c.customer}>
              <td style={{...css.td,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.customer}</td>
              <td style={css.tdR}>{fmtW(c.total)}</td>
              <td style={{...css.tdR,color:C.green}}>{fmtW(c.collected)}</td>
              <td style={{...css.tdR,fontWeight:c.receivable>0?700:400,color:c.receivable>0?C.red:C.muted}}>{fmtW(c.receivable)}</td>
              <td style={css.td}>{c.receivable>0&&<button style={css.btn(C.green,true)} onClick={()=>onCollect(c.customer)}>수금처리</button>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
