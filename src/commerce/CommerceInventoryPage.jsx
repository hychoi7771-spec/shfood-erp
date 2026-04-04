import { useState } from "react";
import { C, css, fmt, fmtW } from "../lib/styles";
import { MOCK_PRODUCTS, CHANNELS } from "./mockData";

const CHANNEL_COLORS = { "쿠팡":C.yellow, "스마트스토어":C.green, "홈쇼핑":C.purple };

// TODO[MOCK] MOCK_PRODUCTS → 실제 API 응답으로 교체, mockData import 삭제
export default function CommerceInventoryPage() {
  const [products, setProducts] = useState(MOCK_PRODUCTS); // TODO[MOCK]
  const [filterCh, setFilterCh] = useState("전체");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState(0);
  const [editMinVal, setEditMinVal] = useState(0);

  const filtered = products.filter(p => {
    if (filterCh !== "전체" && p.channel !== filterCh) return false;
    if (search && !p.name.includes(search) && !p.sku.includes(search)) return false;
    return true;
  });

  const updateStock = (id, stock, min_stock) => {
    setProducts(prev => prev.map(p => p.id === id
      ? { ...p, stock: Number(stock), min_stock: Number(min_stock), status: Number(stock)===0?"품절":Number(stock)<=Number(min_stock)?"재고부족":"판매중" }
      : p
    ));
    setEditId(null);
  };

  // KPI
  const totalStock  = filtered.reduce((s,p)=>s+p.stock, 0);
  const stockValue  = filtered.reduce((s,p)=>s+(p.stock * p.cost_price), 0);
  const outCount    = filtered.filter(p=>p.stock===0).length;
  const lowCount    = filtered.filter(p=>p.stock>0&&p.stock<=p.min_stock).length;

  // 채널별 재고 현황
  const byCh = CHANNELS.filter(c=>c!=="전체").map(ch => {
    const chProds = products.filter(p=>p.channel===ch);
    return {
      channel: ch,
      total: chProds.reduce((s,p)=>s+p.stock,0),
      value: chProds.reduce((s,p)=>s+(p.stock*p.cost_price),0),
      outOfStock: chProds.filter(p=>p.stock===0).length,
      products: chProds.length,
    };
  });

  return (
    <div>
      {/* TODO[MOCK] 아래 배너 삭제 */}
      <div style={{ background:"#ff6b0022", border:"1px solid #ff6b0066", borderRadius:8, padding:"8px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#ff6b00", fontWeight:700 }}>
        ⚠️ MOCK 데이터 표시 중 — API 연동 후 이 배너와 mockData.js import를 삭제하세요
      </div>
      {/* 헤더 */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>📊 재고 현황</h2>
          <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>이커머스 채널별 재고를 관리합니다</div>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:20 }}>
        {[
          { label:"총 재고 수량",   val:fmt(totalStock)+"개",  color:C.accent },
          { label:"재고 자산 가치", val:fmtW(stockValue),     color:C.green },
          { label:"재고부족",       val:lowCount+"개",         color:C.yellow },
          { label:"품절",           val:outCount+"개",         color:C.red },
        ].map(k => (
          <div key={k.label} style={{ ...css.card, textAlign:"center", borderTop:`3px solid ${k.color}` }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{k.label}</div>
            <div style={{ fontSize:18, fontWeight:800, color:k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* 채널별 요약 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12, marginBottom:20 }}>
        {byCh.map(ch => (
          <div key={ch.channel} style={{ ...css.card, borderLeft:`4px solid ${CHANNEL_COLORS[ch.channel]||C.muted}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontWeight:700, fontSize:13 }}>{ch.channel}</span>
              <span style={css.badge(CHANNEL_COLORS[ch.channel]||C.muted)}>{ch.products}개 상품</span>
            </div>
            <div style={{ fontSize:11, color:C.muted, marginBottom:2 }}>총 재고</div>
            <div style={{ fontSize:20, fontWeight:800, color:CHANNEL_COLORS[ch.channel]||C.muted, marginBottom:6 }}>{fmt(ch.total)}개</div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
              <span style={{ color:C.muted }}>재고가치</span>
              <span style={{ color:C.text, fontWeight:600 }}>{fmtW(ch.value)}</span>
            </div>
            {ch.outOfStock > 0 && (
              <div style={{ marginTop:6, padding:"3px 8px", background:`${C.red}22`, borderRadius:4, fontSize:11, color:C.red, fontWeight:700 }}>
                ⚠️ 품절 {ch.outOfStock}개
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div style={{ ...css.card, marginBottom:14, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <input style={{ ...css.input, width:180 }} placeholder="상품명·SKU 검색" value={search} onChange={e=>setSearch(e.target.value)} />
        <div style={{ display:"flex", gap:4 }}>
          {CHANNELS.map(ch => (
            <button key={ch} style={{ ...css.btn(filterCh===ch ? (CHANNEL_COLORS[ch]||C.accent) : C.border, true), color: filterCh===ch ? "#fff" : C.text }} onClick={()=>setFilterCh(ch)}>{ch}</button>
          ))}
        </div>
        <span style={{ marginLeft:"auto", fontSize:12, color:C.muted }}>{filtered.length}개 상품</span>
      </div>

      {/* 재고 테이블 */}
      <div style={{ ...css.card, overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:560 }}>
          <thead><tr>
            <th style={css.th}>SKU</th>
            <th style={css.th}>상품명</th>
            <th style={css.th}>채널</th>
            <th style={css.thR}>현재고</th>
            <th style={css.thR}>최소재고</th>
            <th style={css.thR}>재고가치</th>
            <th style={css.th}>상태</th>
            <th style={css.th}>재고 수정</th>
          </tr></thead>
          <tbody>
            {filtered.map(p => {
              const isEdit = editId === p.id;
              const statusColor = p.stock===0 ? C.red : p.stock<=p.min_stock ? C.yellow : C.green;
              const statusLabel = p.stock===0 ? "품절" : p.stock<=p.min_stock ? "부족" : "정상";
              return (
                <tr key={p.id} style={{ background: p.stock===0 ? `${C.red}08` : p.stock<=p.min_stock ? `${C.yellow}08` : "transparent" }}>
                  <td style={{ ...css.td, fontSize:11, fontFamily:"monospace", color:C.muted }}>{p.sku}</td>
                  <td style={{ ...css.td, fontWeight:600, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</td>
                  <td style={css.td}><span style={css.badge(CHANNEL_COLORS[p.channel]||C.muted)}>{p.channel}</span></td>
                  <td style={css.tdR}>
                    {isEdit
                      ? <input type="number" style={{ ...css.input, width:72, textAlign:"right" }} value={editVal} onChange={e=>setEditVal(e.target.value)} autoFocus />
                      : <span style={{ color:statusColor, fontWeight:700, fontSize:14 }}>{fmt(p.stock)}</span>
                    }
                  </td>
                  <td style={css.tdR}>
                    {isEdit
                      ? <input type="number" style={{ ...css.input, width:72, textAlign:"right" }} value={editMinVal} onChange={e=>setEditMinVal(e.target.value)} />
                      : <span style={{ color:C.muted }}>{fmt(p.min_stock)}</span>
                    }
                  </td>
                  <td style={{ ...css.tdR, color:C.muted }}>{fmtW(p.stock * p.cost_price)}</td>
                  <td style={css.td}><span style={css.badge(statusColor)}>{statusLabel}</span></td>
                  <td style={css.td}>
                    {isEdit
                      ? <div style={{ display:"flex", gap:4 }}>
                          <button style={css.btn(C.green,true)} onClick={()=>updateStock(p.id, editVal, editMinVal)}>저장</button>
                          <button style={css.btn(C.muted,true)} onClick={()=>setEditId(null)}>취소</button>
                        </div>
                      : <button style={css.btn(C.accent,true)} onClick={()=>{ setEditId(p.id); setEditVal(p.stock); setEditMinVal(p.min_stock); }}>수정</button>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background:`${C.accent}08` }}>
              <td colSpan={3} style={{ ...css.td, fontWeight:700, fontSize:12 }}>합계</td>
              <td style={{ ...css.tdR, fontWeight:800, color:C.accent }}>{fmt(filtered.reduce((s,p)=>s+p.stock,0))}개</td>
              <td style={css.td}/>
              <td style={{ ...css.tdR, fontWeight:800, color:C.green }}>{fmtW(filtered.reduce((s,p)=>s+(p.stock*p.cost_price),0))}</td>
              <td colSpan={2} style={css.td}/>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 경고 목록 */}
      {filtered.some(p=>p.stock<=p.min_stock) && (
        <div style={{ ...css.card, marginTop:16, borderLeft:`4px solid ${C.yellow}` }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.yellow, marginBottom:10 }}>⚠️ 재고 경고 목록</div>
          {filtered.filter(p=>p.stock<=p.min_stock).map(p => (
            <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}22` }}>
              <div>
                <span style={{ fontWeight:600, fontSize:13 }}>{p.name}</span>
                <span style={{ ...css.badge(CHANNEL_COLORS[p.channel]||C.muted), marginLeft:8 }}>{p.channel}</span>
              </div>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <span style={{ fontSize:12, color:C.muted }}>최소: {p.min_stock}개</span>
                <span style={{ fontSize:14, fontWeight:800, color:p.stock===0?C.red:C.yellow }}>
                  현재: {p.stock}개
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
