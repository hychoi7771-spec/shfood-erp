import { useState } from "react";
import { C, css, fmt } from "../lib/styles";

export default function InventoryPage({inventory,onUpdateStock}){
  const [search,setSearch]=useState("");
  const [editCode,setEditCode]=useState(null);
  const [editVal,setEditVal]=useState(0);
  const filtered=inventory.filter(i=>(i.productName||i.product_name||"").includes(search));
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:800}}>재고 관리</h2>
        <input style={{...css.input,width:200}} placeholder="품목 검색..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      <div style={{...css.card,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:400}}>
          <thead><tr><th style={css.th}>품목명</th><th style={css.thR}>현재고</th><th style={css.thR}>최소재고</th><th style={css.th}>상태</th><th style={css.th}>수정</th></tr></thead>
          <tbody>{filtered.map(item=>{
            const code=item.productCode||item.product_code;
            const minS=item.minStock||item.min_stock||0;
            return (
              <tr key={code}>
                <td style={css.td}>{item.productName||item.product_name}</td>
                <td style={css.tdR}>
                  {editCode===code
                    ?<input type="number" style={{...css.input,width:80,textAlign:"right"}} value={editVal}
                        onChange={e=>setEditVal(Number(e.target.value))}
                        onBlur={()=>{onUpdateStock(code,editVal);setEditCode(null);}} autoFocus/>
                    :<span style={{color:item.stock<=minS?C.red:C.green,fontWeight:700}}>{fmt(item.stock)}</span>}
                </td>
                <td style={{...css.tdR,color:C.muted}}>{fmt(minS)}</td>
                <td style={css.td}>{item.stock===0?<span style={css.badge(C.red)}>품절</span>:item.stock<=minS?<span style={css.badge(C.yellow)}>부족</span>:<span style={css.badge(C.green)}>정상</span>}</td>
                <td style={css.td}><button style={css.btn(C.accent,true)} onClick={()=>{setEditCode(code);setEditVal(item.stock);}}>변경</button></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}
