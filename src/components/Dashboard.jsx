import { C, css, fmtW, pct } from "../lib/styles";
import { StatusBadge } from "./Common";

export default function Dashboard({stats,sales,inventory,setPage,isMobile}){
  const recent=sales.slice(-6).reverse();
  const cards=[
    {label:"이번달 매출",value:fmtW(stats.monthSales),color:C.accent,icon:"📈"},
    {label:"총 매출(공급가)",value:fmtW(stats.totalSales),color:C.green,icon:"💳"},
    {label:"미수금",value:fmtW(stats.receivable),color:C.red,icon:"⚠️"},
    {label:"재고부족",value:`${stats.lowStock}개`,color:C.yellow,icon:"📦"},
  ];
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{margin:0,fontSize:isMobile?18:22,fontWeight:800}}>대시보드</h2>
        <button style={css.btn(C.green,isMobile)} onClick={()=>setPage("sales")}>+ 매출 입력</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {cards.map(c=>(
          <div key={c.label} style={{...css.card,borderLeft:`4px solid ${c.color}`,padding:isMobile?"14px":"20px"}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{c.icon} {c.label}</div>
            <div style={{fontSize:isMobile?16:22,fontWeight:800,color:c.color}}>{c.value}</div>
          </div>
        ))}
      </div>
      <div style={{...css.card,marginBottom:16}}>
        <div style={{fontWeight:700,marginBottom:14,display:"flex",justifyContent:"space-between"}}>
          최근 매출전표 <button style={css.btn(C.accent,true)} onClick={()=>setPage("sales")}>전체보기</button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:380}}>
            <thead><tr>
              <th style={css.th}>날짜</th><th style={css.th}>거래처</th>
              {!isMobile&&<th style={css.th}>채널</th>}
              <th style={css.thR}>금액</th><th style={css.th}>상태</th>
            </tr></thead>
            <tbody>{recent.map(s=>(
              <tr key={s.id}>
                <td style={{...css.td,fontSize:12}}>{s.date}</td>
                <td style={{...css.td,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:12}}>{s.customer}</td>
                {!isMobile&&<td style={css.td}><span style={css.badge(s.channel==="쿠팡"?C.yellow:s.channel==="홈쇼핑"?C.purple:s.channel==="스마트스토어"?C.green:C.accent)}>{s.channel||"B2B"}</span></td>}
                <td style={{...css.tdR,fontWeight:600,fontSize:12}}>{fmtW(s.grandTotal||s.grand_total||0)}</td>
                <td style={css.td}><StatusBadge status={s.status}/></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <div style={{...css.card,borderLeft:`4px solid ${C.purple}`}}>
        <div style={{fontWeight:700,marginBottom:12,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          📈 재무 요약
          <div style={{display:"flex",gap:8}}>
            <button style={css.btn(C.purple,true)} onClick={()=>setPage("pl")}>손익</button>
            <button style={css.btn(C.cyan,true)} onClick={()=>setPage("closing")}>마감</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:12}}>
          {[
            {label:"총수금",value:fmtW(stats.collected),color:C.green},
            {label:"미수금",value:fmtW(stats.receivable),color:C.red},
            {label:"부가세",value:fmtW(sales.reduce((s,r)=>s+(r.vat||0),0)),color:C.yellow},
            {label:"수금율",value:pct(stats.collected,stats.totalGrand),color:C.cyan},
          ].map(c=>(
            <div key={c.label} style={{textAlign:"center",padding:"8px 0"}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{c.label}</div>
              <div style={{fontSize:isMobile?14:16,fontWeight:800,color:c.color}}>{c.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
