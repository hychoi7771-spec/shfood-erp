// ===================== 컬러·스타일 =====================
export const C = {
  bg:"#0f1117", card:"#1a1d27", border:"#2a2d3e",
  accent:"#4f8ef7", green:"#22c55e", red:"#ef4444",
  yellow:"#eab308", purple:"#a855f7", cyan:"#06b6d4",
  text:"#e2e8f0", muted:"#64748b"
};
export const css = {
  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px" },
  btn:(color="#4f8ef7",sm)=>({ background:color, color:"#fff", border:"none", borderRadius:8, padding:sm?"5px 12px":"8px 16px", cursor:"pointer", fontSize:sm?11:13, fontWeight:700 }),
  input:{ background:"#0f1117", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", color:C.text, fontSize:13, width:"100%", boxSizing:"border-box" },
  select:{ background:"#0f1117", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", color:C.text, fontSize:13, cursor:"pointer" },
  th:{ padding:"10px 12px", textAlign:"left", fontSize:11, fontWeight:700, color:C.muted, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" },
  thR:{ padding:"10px 12px", textAlign:"right", fontSize:11, fontWeight:700, color:C.muted, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" },
  td:{ padding:"10px 12px", fontSize:13, color:C.text, borderBottom:`1px solid ${C.border}22` },
  tdR:{ padding:"10px 12px", fontSize:13, color:C.text, borderBottom:`1px solid ${C.border}22`, textAlign:"right" },
  badge:(color)=>({ background:color+"22", color, borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700, display:"inline-block" }),
};
export const fmt=(n)=>(n||0).toLocaleString("ko-KR");
export const fmtW=(n)=>`₩${fmt(n)}`;
export const pct=(a,b)=>b?((a/b)*100).toFixed(1)+"%":"-";
export const todayStr=()=>new Date().toISOString().split("T")[0];
export const genId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
