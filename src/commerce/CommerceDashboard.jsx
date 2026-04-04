import { C, css, fmt, fmtW, pct } from "../lib/styles";
// TODO[MOCK] 아래 import 삭제 후 실제 API 데이터로 교체
import { MOCK_ORDERS, MOCK_PRODUCTS } from "./mockData";

const CHANNEL_COLORS = { "쿠팡":C.yellow, "스마트스토어":C.green, "홈쇼핑":C.purple };

// TODO[MOCK] MOCK_ORDERS, MOCK_PRODUCTS → 실제 API 응답으로 교체
export default function CommerceDashboard() {
  const activeOrders  = MOCK_ORDERS.filter(o=>o.status!=="취소"&&o.status!=="반품"); // TODO[MOCK]
  const totalRevenue  = activeOrders.reduce((s,o)=>s+o.total, 0);
  const newOrders     = MOCK_ORDERS.filter(o=>o.status==="신규").length;
  const shippingCount = MOCK_ORDERS.filter(o=>o.status==="배송중").length;
  const totalProducts = MOCK_PRODUCTS.filter(p=>p.status==="판매중").length;
  const outOfStock    = MOCK_PRODUCTS.filter(p=>p.stock===0).length;
  const lowStock      = MOCK_PRODUCTS.filter(p=>p.stock>0&&p.stock<=p.min_stock).length;

  // 채널별 매출
  const byChannel = ["쿠팡","스마트스토어","홈쇼핑"].map(ch => {
    const chOrders = activeOrders.filter(o=>o.channel===ch);
    return {
      channel: ch,
      revenue: chOrders.reduce((s,o)=>s+o.total, 0),
      orders: chOrders.length,
    };
  }).sort((a,b)=>b.revenue-a.revenue);

  // 최근 주문
  const recentOrders = [...MOCK_ORDERS].sort((a,b)=>b.ordered_at.localeCompare(a.ordered_at)).slice(0,6);

  // 상위 상품 (재고 기준)
  const topProducts = [...MOCK_PRODUCTS].filter(p=>p.stock>0).sort((a,b)=>b.stock-a.stock).slice(0,5);

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>🛍️ 커머스 대시보드</h2>
          <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>이커머스 전 채널 통합 현황</div>
        </div>
        <div style={{ padding:"6px 14px", background:`${C.cyan}22`, color:C.cyan, borderRadius:8, fontSize:12, fontWeight:700, border:`1px solid ${C.cyan}44` }}>
          📡 Mock 데이터 (API 연동 전)
        </div>
      </div>

      {/* 핵심 KPI */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:20 }}>
        {[
          { label:"총 매출",     val:fmtW(totalRevenue),     color:C.accent,  icon:"💰" },
          { label:"신규 주문",   val:newOrders+"건",         color:C.yellow,  icon:"🔔" },
          { label:"배송중",      val:shippingCount+"건",     color:C.cyan,    icon:"🚚" },
          { label:"판매중 상품", val:totalProducts+"개",     color:C.green,   icon:"📦" },
          { label:"재고부족",    val:lowStock+"개",          color:C.yellow,  icon:"⚠️" },
          { label:"품절",        val:outOfStock+"개",        color:C.red,     icon:"🚫" },
        ].map(k => (
          <div key={k.label} style={{ ...css.card, textAlign:"center", borderTop:`3px solid ${k.color}`, padding:"14px 12px" }}>
            <div style={{ fontSize:16, marginBottom:4 }}>{k.icon}</div>
            <div style={{ fontSize:10, color:C.muted, marginBottom:3 }}>{k.label}</div>
            <div style={{ fontSize:18, fontWeight:800, color:k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        {/* 채널별 매출 */}
        <div style={css.card}>
          <div style={{ fontWeight:700, marginBottom:14, display:"flex", justifyContent:"space-between" }}>
            📡 채널별 매출
            <span style={{ fontSize:11, color:C.muted, fontWeight:400 }}>전체 기간</span>
          </div>
          {byChannel.map(ch => {
            const share = totalRevenue > 0 ? (ch.revenue / totalRevenue * 100) : 0;
            const color = CHANNEL_COLORS[ch.channel] || C.muted;
            return (
              <div key={ch.channel} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={css.badge(color)}>{ch.channel}</span>
                    <span style={{ fontSize:12, color:C.muted }}>{ch.orders}건</span>
                  </div>
                  <div>
                    <span style={{ fontSize:13, fontWeight:700, color }}>{fmtW(ch.revenue)}</span>
                    <span style={{ fontSize:11, color:C.muted, marginLeft:6 }}>{share.toFixed(0)}%</span>
                  </div>
                </div>
                <div style={{ height:6, background:C.border, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:`${share}%`, height:"100%", background:color, borderRadius:3, transition:"width .3s" }} />
                </div>
              </div>
            );
          })}
          <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, color:C.muted }}>전체 합계</span>
            <span style={{ fontSize:15, fontWeight:800, color:C.accent }}>{fmtW(totalRevenue)}</span>
          </div>
        </div>

        {/* 주문 상태 현황 */}
        <div style={css.card}>
          <div style={{ fontWeight:700, marginBottom:14 }}>📋 주문 상태 현황</div>
          {["신규","준비중","배송중","배송완료","취소","반품"].map(status => {
            const count = MOCK_ORDERS.filter(o=>o.status===status).length;
            const statusColors = {
              "신규":C.accent, "준비중":C.yellow, "배송중":C.cyan,
              "배송완료":C.green, "취소":C.red, "반품":C.purple,
            };
            if (!count) return null;
            return (
              <div key={status} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}22` }}>
                <span style={css.badge(statusColors[status]||C.muted)}>{status}</span>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:statusColors[status]||C.text }}>{count}건</span>
                  <span style={{ fontSize:11, color:C.muted }}>
                    {fmtW(MOCK_ORDERS.filter(o=>o.status===status).reduce((s,o)=>s+o.total,0))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* 최근 주문 */}
        <div style={css.card}>
          <div style={{ fontWeight:700, marginBottom:12 }}>🕐 최근 주문</div>
          {recentOrders.map(o => (
            <div key={o.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}22` }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                  <span style={css.badge(CHANNEL_COLORS[o.channel]||C.muted)}>{o.channel}</span>
                  <span style={{ fontSize:12, color:C.text, fontWeight:600 }}>{o.buyer}</span>
                </div>
                <div style={{ fontSize:11, color:C.muted }}>{o.product_name.slice(0,16)}{o.product_name.length>16?"…":""}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13, fontWeight:700, color:C.accent }}>{fmtW(o.total)}</div>
                <div style={{ fontSize:10, color:C.muted }}>{o.ordered_at.slice(5)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 재고 현황 TOP */}
        <div style={css.card}>
          <div style={{ fontWeight:700, marginBottom:12 }}>📦 재고 현황 TOP 5</div>
          {topProducts.map(p => {
            const pct = p.stock > 0 ? Math.min((p.stock / (p.min_stock * 5)) * 100, 100) : 0;
            const color = p.stock <= p.min_stock ? C.yellow : C.green;
            return (
              <div key={p.id} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:12, fontWeight:600 }}>{p.name.slice(0,14)}{p.name.length>14?"…":""}</span>
                    <span style={{ ...css.badge(CHANNEL_COLORS[p.channel]||C.muted), fontSize:9 }}>{p.channel}</span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color }}>{fmt(p.stock)}</span>
                </div>
                <div style={{ height:4, background:C.border, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:2, transition:"width .3s" }} />
                </div>
              </div>
            );
          })}

          {/* 2단계 안내 */}
          <div style={{ marginTop:16, padding:12, background:`${C.cyan}11`, border:`1px solid ${C.cyan}33`, borderRadius:8 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.cyan, marginBottom:6 }}>🚀 2단계 예정 API 연동</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {["쿠팡 Wing API", "네이버 커머스 API"].map(api => (
                <span key={api} style={{ background:`${C.cyan}22`, color:C.cyan, borderRadius:6, padding:"3px 10px", fontSize:11, fontWeight:600 }}>
                  {api}
                </span>
              ))}
            </div>
            <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>현재 Mock 데이터로 동작 중 — API 연동 후 실시간 데이터로 전환됩니다</div>
          </div>
        </div>
      </div>
    </div>
  );
}
