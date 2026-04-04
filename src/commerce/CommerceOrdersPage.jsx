import { useState } from "react";
import { C, css, fmtW } from "../lib/styles";
import { MOCK_ORDERS, CHANNELS, ORDER_STATUSES } from "./mockData";

const CHANNEL_COLORS = { "쿠팡":C.yellow, "스마트스토어":C.green, "홈쇼핑":C.purple };
const STATUS_COLORS  = {
  "신규":C.accent, "준비중":C.yellow, "배송중":C.cyan,
  "배송완료":C.green, "취소":C.red, "반품":C.purple,
};

// TODO[MOCK] MOCK_ORDERS → 실제 API 응답으로 교체, mockData import 삭제
export default function CommerceOrdersPage() {
  const [orders, setOrders] = useState(MOCK_ORDERS); // TODO[MOCK]
  const [filterCh, setFilterCh] = useState("전체");
  const [filterStatus, setFilterStatus] = useState("전체");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = orders.filter(o => {
    if (filterCh !== "전체" && o.channel !== filterCh) return false;
    if (filterStatus !== "전체" && o.status !== filterStatus) return false;
    if (search && !o.order_no.includes(search) && !o.buyer.includes(search) && !o.product_name.includes(search)) return false;
    return true;
  });

  const updateStatus = (id, status) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    if (selected?.id === id) setSelected(prev => ({ ...prev, status }));
  };

  // KPI
  const today = new Date().toISOString().split("T")[0];
  const newOrders   = orders.filter(o => o.status === "신규").length;
  const shippingOrders = orders.filter(o => o.status === "배송중").length;
  const todaySales  = orders.filter(o => o.ordered_at?.startsWith("2025-03-28") && o.status !== "취소").reduce((s,o)=>s+o.total,0);
  const cancelOrders = orders.filter(o => o.status === "취소").length;

  return (
    <div>
      {/* TODO[MOCK] 아래 배너 삭제 */}
      <div style={{ background:"#ff6b0022", border:"1px solid #ff6b0066", borderRadius:8, padding:"8px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#ff6b00", fontWeight:700 }}>
        ⚠️ MOCK 데이터 표시 중 — API 연동 후 이 배너와 mockData.js import를 삭제하세요
      </div>
      {/* 헤더 */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>📋 주문 관리</h2>
          <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>전 채널 주문을 통합 관리합니다</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ ...css.badge(C.yellow), fontSize:12, padding:"4px 12px" }}>🔔 신규 {newOrders}건</span>
          <button style={css.btn(C.muted, true)} onClick={()=>{}}>🔄 새로고침</button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:12, marginBottom:20 }}>
        {[
          { label:"신규 주문",  val:newOrders+"건",           color:C.accent },
          { label:"배송중",     val:shippingOrders+"건",      color:C.cyan },
          { label:"오늘 매출",  val:fmtW(todaySales),         color:C.green },
          { label:"취소/반품",  val:cancelOrders+"건",        color:C.red },
        ].map(k => (
          <div key={k.label} style={{ ...css.card, textAlign:"center", borderTop:`3px solid ${k.color}` }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{k.label}</div>
            <div style={{ fontSize:18, fontWeight:800, color:k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div style={{ ...css.card, marginBottom:14, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <input style={{ ...css.input, width:200 }} placeholder="주문번호·구매자·상품명" value={search} onChange={e=>setSearch(e.target.value)} />
        <div style={{ display:"flex", gap:4 }}>
          {CHANNELS.map(ch => (
            <button key={ch} style={{ ...css.btn(filterCh===ch ? (CHANNEL_COLORS[ch]||C.accent) : C.border, true), color: filterCh===ch ? "#fff" : C.text }} onClick={()=>setFilterCh(ch)}>{ch}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {["전체",...ORDER_STATUSES].map(s => (
            <button key={s} style={{ ...css.btn(filterStatus===s ? (STATUS_COLORS[s]||C.accent) : C.border, true), color: filterStatus===s ? "#fff" : C.text }} onClick={()=>setFilterStatus(s)}>{s}</button>
          ))}
        </div>
        <span style={{ marginLeft:"auto", fontSize:12, color:C.muted }}>
          {filtered.length}건 · {fmtW(filtered.filter(o=>o.status!=="취소"&&o.status!=="반품").reduce((s,o)=>s+o.total,0))}
        </span>
      </div>

      {/* 주문 목록 + 상세 */}
      <div style={{ display:"grid", gridTemplateColumns: selected ? "1fr 300px" : "1fr", gap:16 }}>
        <div style={{ ...css.card, overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:580 }}>
            <thead><tr>
              <th style={css.th}>주문번호</th>
              <th style={css.th}>채널</th>
              <th style={css.th}>상품</th>
              <th style={css.th}>구매자</th>
              <th style={css.thR}>수량</th>
              <th style={css.thR}>금액</th>
              <th style={css.th}>상태</th>
              <th style={css.th}>주문일시</th>
              <th style={css.th}>처리</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={9} style={{ ...css.td, textAlign:"center", color:C.muted, padding:40 }}>주문이 없습니다</td></tr>
                : filtered.map(o => (
                  <tr key={o.id} onClick={()=>setSelected(selected?.id===o.id ? null : o)}
                    style={{ cursor:"pointer", background: selected?.id===o.id ? `${C.accent}18` : "transparent" }}>
                    <td style={{ ...css.td, fontSize:11, fontFamily:"monospace", color:C.accent }}>{o.order_no}</td>
                    <td style={css.td}><span style={css.badge(CHANNEL_COLORS[o.channel]||C.muted)}>{o.channel}</span></td>
                    <td style={{ ...css.td, maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontSize:12 }}>{o.product_name}</td>
                    <td style={{ ...css.td, fontSize:12 }}>{o.buyer}</td>
                    <td style={css.tdR}>{o.qty}</td>
                    <td style={{ ...css.tdR, fontWeight:700 }}>{fmtW(o.total)}</td>
                    <td style={css.td}><span style={css.badge(STATUS_COLORS[o.status]||C.muted)}>{o.status}</span></td>
                    <td style={{ ...css.td, fontSize:11, color:C.muted }}>{o.ordered_at}</td>
                    <td style={css.td} onClick={e=>e.stopPropagation()}>
                      <select value={o.status}
                        style={{ ...css.select, fontSize:11, padding:"2px 6px", color:STATUS_COLORS[o.status]||C.muted }}
                        onChange={e=>updateStatus(o.id, e.target.value)}>
                        {ORDER_STATUSES.map(s=><option key={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* 주문 상세 */}
        {selected && (
          <div style={css.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:C.accent, fontFamily:"monospace" }}>{selected.order_no}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{selected.ordered_at}</div>
              </div>
              <button style={css.btn(C.muted,true)} onClick={()=>setSelected(null)}>✕</button>
            </div>

            <div style={{ marginBottom:14 }}>
              <span style={css.badge(CHANNEL_COLORS[selected.channel]||C.muted)}>{selected.channel}</span>
              <span style={{ ...css.badge(STATUS_COLORS[selected.status]||C.muted), marginLeft:6 }}>{selected.status}</span>
            </div>

            {[
              { label:"상품명",   val:selected.product_name },
              { label:"SKU",      val:<span style={{ fontFamily:"monospace", fontSize:11 }}>{selected.sku}</span> },
              { label:"수량",     val:`${selected.qty}개` },
              { label:"단가",     val:fmtW(selected.unit_price) },
              { label:"주문금액", val:<span style={{ color:C.accent, fontWeight:800 }}>{fmtW(selected.total)}</span> },
              { label:"구매자",   val:selected.buyer },
              { label:"배송지",   val:<span style={{ fontSize:12 }}>{selected.address}</span> },
            ].map(item => (
              <div key={item.label} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${C.border}22`, fontSize:13 }}>
                <span style={{ color:C.muted, fontSize:12 }}>{item.label}</span>
                <span style={{ fontWeight:600 }}>{item.val}</span>
              </div>
            ))}

            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:11, color:C.muted, marginBottom:6 }}>상태 변경</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {ORDER_STATUSES.map(s => (
                  <button key={s}
                    style={{ ...css.btn(selected.status===s ? (STATUS_COLORS[s]||C.accent) : C.border, true), color: selected.status===s ? "#fff" : C.text }}
                    onClick={()=>updateStatus(selected.id, s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
