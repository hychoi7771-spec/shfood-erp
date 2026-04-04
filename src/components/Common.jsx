import { C, css } from "../lib/styles";
import { MONTHS, MONTH_NAMES } from "../lib/config";

export function StatusBadge({status}){
  const colors={"수금완료":C.green,"미수":C.red,"부분수금":C.yellow};
  return <span style={css.badge(colors[status]||C.muted)}>{status}</span>;
}

export function PeriodSelector({period,setPeriod}){
  return (
    <div style={{...css.card,marginBottom:20,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
      <span style={{fontSize:12,color:C.muted,fontWeight:600}}>기간</span>
      <select style={css.select} value={period.year} onChange={e=>setPeriod(p=>({...p,year:e.target.value}))}>
        <option value="2024">2024년</option><option value="2025">2025년</option><option value="2026">2026년</option>
      </select>
      <select style={css.select} value={period.startMonth} onChange={e=>setPeriod(p=>({...p,startMonth:e.target.value}))}>
        {MONTHS.map((m,i)=><option key={m} value={m}>{MONTH_NAMES[i]}</option>)}
      </select>
      <span style={{color:C.muted}}>~</span>
      <select style={css.select} value={period.endMonth} onChange={e=>setPeriod(p=>({...p,endMonth:e.target.value}))}>
        {MONTHS.map((m,i)=><option key={m} value={m}>{MONTH_NAMES[i]}</option>)}
      </select>
      <button style={css.btn(C.green,true)} onClick={()=>setPeriod({year:"2025",startMonth:"01",endMonth:"03"})}>1분기</button>
      <button style={css.btn(C.accent,true)} onClick={()=>setPeriod({year:"2025",startMonth:"01",endMonth:"06"})}>상반기</button>
      <button style={css.btn(C.purple,true)} onClick={()=>setPeriod({year:"2025",startMonth:"01",endMonth:"12"})}>연간</button>
    </div>
  );
}
