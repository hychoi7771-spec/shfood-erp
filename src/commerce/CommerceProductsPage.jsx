import { useState } from "react";
import { C, css, fmtW, genId, todayStr } from "../lib/styles";
import { MOCK_PRODUCTS, CHANNELS, CATEGORIES, PRODUCT_STATUSES } from "./mockData";

const CHANNEL_COLORS = { "쿠팡":C.yellow, "스마트스토어":C.green, "홈쇼핑":C.purple, "전체":C.muted };
const STATUS_COLORS  = { "판매중":C.green, "일시중지":C.yellow, "품절":C.red, "재고부족":C.yellow };

const EMPTY_FORM = {
  sku:"", name:"", category:"떡류", channel:"쿠팡",
  selling_price:0, cost_price:0, stock:0, min_stock:20,
  status:"판매중", image_url:"",
};

// TODO[MOCK] MOCK_PRODUCTS → 실제 API 응답으로 교체, mockData import 삭제
export default function CommerceProductsPage() {
  const [products, setProducts] = useState(MOCK_PRODUCTS); // TODO[MOCK]
  const [filterCh, setFilterCh] = useState("전체");
  const [filterStatus, setFilterStatus] = useState("전체");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [selected, setSelected] = useState(null);

  const filtered = products.filter(p => {
    if (filterCh !== "전체" && p.channel !== filterCh) return false;
    if (filterStatus !== "전체" && p.status !== filterStatus) return false;
    if (search && !p.name.includes(search) && !p.sku.includes(search)) return false;
    return true;
  });

  const F = (field) => ({
    value: form[field],
    onChange: e => setForm(p => ({ ...p, [field]: e.target.value })),
  });

  const openNew = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); };
  const openEdit = (p) => { setForm({ ...p }); setEditId(p.id); setShowForm(true); };

  const save = () => {
    if (!form.sku || !form.name) return alert("SKU와 상품명을 입력하세요");
    if (editId) {
      setProducts(prev => prev.map(p => p.id === editId ? { ...p, ...form, selling_price:Number(form.selling_price), cost_price:Number(form.cost_price), stock:Number(form.stock), min_stock:Number(form.min_stock) } : p));
    } else {
      if (products.find(p => p.sku === form.sku)) return alert("이미 존재하는 SKU입니다");
      setProducts(prev => [...prev, { ...form, id: genId(), selling_price:Number(form.selling_price), cost_price:Number(form.cost_price), stock:Number(form.stock), min_stock:Number(form.min_stock), created_at: todayStr() }]);
    }
    setShowForm(false); setEditId(null);
  };

  const remove = (id, name) => {
    if (!confirm(`'${name}' 상품을 삭제하시겠습니까?`)) return;
    setProducts(prev => prev.filter(p => p.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const margin = (p) => p.selling_price > 0 ? (((p.selling_price - p.cost_price) / p.selling_price) * 100).toFixed(1) : "-";

  // 요약 KPI
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === "판매중").length;
  const outOfStock = products.filter(p => p.status === "품절" || p.stock === 0).length;
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.min_stock).length;

  return (
    <div>
      {/* TODO[MOCK] 아래 배너 삭제 */}
      <div style={{ background:"#ff6b0022", border:"1px solid #ff6b0066", borderRadius:8, padding:"8px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#ff6b00", fontWeight:700 }}>
        ⚠️ MOCK 데이터 표시 중 — API 연동 후 이 배너와 mockData.js import를 삭제하세요
      </div>
      {/* 헤더 */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>📦 상품 등록/관리</h2>
          <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>이커머스 채널 상품을 등록하고 관리합니다</div>
        </div>
        <button style={css.btn(C.green)} onClick={openNew}>+ 상품 등록</button>
      </div>

      {/* KPI */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:12, marginBottom:20 }}>
        {[
          { label:"전체 상품", val:totalProducts+"개", color:C.accent },
          { label:"판매중",    val:activeProducts+"개", color:C.green },
          { label:"재고부족",  val:lowStock+"개",       color:C.yellow },
          { label:"품절",      val:outOfStock+"개",     color:C.red },
        ].map(k => (
          <div key={k.label} style={{ ...css.card, textAlign:"center", borderTop:`3px solid ${k.color}` }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{k.label}</div>
            <div style={{ fontSize:20, fontWeight:800, color:k.color }}>{k.val}</div>
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
        <div style={{ display:"flex", gap:4 }}>
          {["전체",...PRODUCT_STATUSES].map(s => (
            <button key={s} style={{ ...css.btn(filterStatus===s ? C.accent : C.border, true), color: filterStatus===s ? "#fff" : C.text }} onClick={()=>setFilterStatus(s)}>{s}</button>
          ))}
        </div>
        <span style={{ marginLeft:"auto", fontSize:12, color:C.muted }}>{filtered.length}건</span>
      </div>

      {/* 테이블 */}
      <div style={{ display:"grid", gridTemplateColumns: selected ? "1fr 320px" : "1fr", gap:16 }}>
        <div style={{ ...css.card, overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
            <thead><tr>
              <th style={css.th}>SKU</th>
              <th style={css.th}>상품명</th>
              <th style={css.th}>채널</th>
              <th style={css.th}>카테고리</th>
              <th style={css.thR}>판매가</th>
              <th style={css.thR}>원가</th>
              <th style={css.thR}>마진율</th>
              <th style={css.thR}>재고</th>
              <th style={css.th}>상태</th>
              <th style={css.th}>관리</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={10} style={{ ...css.td, textAlign:"center", color:C.muted, padding:40 }}>상품이 없습니다</td></tr>
                : filtered.map(p => (
                  <tr key={p.id} onClick={()=>setSelected(selected?.id===p.id ? null : p)}
                    style={{ cursor:"pointer", background: selected?.id===p.id ? `${C.accent}18` : "transparent" }}>
                    <td style={{ ...css.td, fontSize:11, fontFamily:"monospace", color:C.muted }}>{p.sku}</td>
                    <td style={{ ...css.td, fontWeight:600, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</td>
                    <td style={css.td}><span style={css.badge(CHANNEL_COLORS[p.channel]||C.muted)}>{p.channel}</span></td>
                    <td style={{ ...css.td, fontSize:12 }}>{p.category}</td>
                    <td style={{ ...css.tdR, fontWeight:700 }}>{fmtW(p.selling_price)}</td>
                    <td style={{ ...css.tdR, color:C.muted }}>{fmtW(p.cost_price)}</td>
                    <td style={{ ...css.tdR, color:Number(margin(p))>=30?C.green:Number(margin(p))>=15?C.yellow:C.red, fontWeight:700 }}>{margin(p)}%</td>
                    <td style={{ ...css.tdR, color:p.stock===0?C.red:p.stock<=p.min_stock?C.yellow:C.text, fontWeight:700 }}>{p.stock}</td>
                    <td style={css.td}><span style={css.badge(STATUS_COLORS[p.status]||C.muted)}>{p.status}</span></td>
                    <td style={css.td} onClick={e=>e.stopPropagation()}>
                      <div style={{ display:"flex", gap:4 }}>
                        <button style={{ background:`${C.accent}22`, color:C.accent, border:"none", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:11, fontWeight:700 }} onClick={()=>openEdit(p)}>수정</button>
                        <button style={{ background:`${C.red}22`, color:C.red, border:"none", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontSize:11, fontWeight:700 }} onClick={()=>remove(p.id,p.name)}>삭제</button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* 상세 패널 */}
        {selected && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={css.card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:800 }}>{selected.name}</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:3, fontFamily:"monospace" }}>{selected.sku}</div>
                </div>
                <button style={css.btn(C.muted,true)} onClick={()=>setSelected(null)}>✕</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  { label:"채널",    val:<span style={css.badge(CHANNEL_COLORS[selected.channel]||C.muted)}>{selected.channel}</span> },
                  { label:"카테고리", val:selected.category },
                  { label:"판매가",  val:<span style={{ color:C.accent, fontWeight:700 }}>{fmtW(selected.selling_price)}</span> },
                  { label:"원가",    val:fmtW(selected.cost_price) },
                  { label:"마진율",  val:<span style={{ color:Number(margin(selected))>=30?C.green:C.yellow, fontWeight:700 }}>{margin(selected)}%</span> },
                  { label:"마진액",  val:fmtW(selected.selling_price - selected.cost_price) },
                  { label:"재고",    val:<span style={{ color:selected.stock===0?C.red:selected.stock<=selected.min_stock?C.yellow:C.green, fontWeight:700 }}>{selected.stock}개</span> },
                  { label:"최소재고", val:`${selected.min_stock}개` },
                ].map(item => (
                  <div key={item.label} style={{ padding:"8px 0", borderBottom:`1px solid ${C.border}22` }}>
                    <div style={{ fontSize:10, color:C.muted, marginBottom:3 }}>{item.label}</div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{item.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:14, display:"flex", gap:8 }}>
                <button style={{ ...css.btn(C.accent), flex:1 }} onClick={()=>openEdit(selected)}>✏️ 수정</button>
                <button style={{ ...css.btn(C.red), flex:1 }} onClick={()=>remove(selected.id, selected.name)}>🗑️ 삭제</button>
              </div>
            </div>

            {/* 수익성 분석 */}
            <div style={{ ...css.card, borderTop:`3px solid ${C.purple}` }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.purple, marginBottom:10 }}>📊 수익성 분석</div>
              {[
                { label:"판매가 (소비자가)", val:fmtW(selected.selling_price), color:C.text },
                { label:"원가", val:`(${fmtW(selected.cost_price)})`, color:C.red },
                { label:"채널 수수료 (10% 추정)", val:`(${fmtW(Math.round(selected.selling_price * 0.1))})`, color:C.yellow },
                { label:"배송비 (2,500원 추정)", val:"(₩2,500)", color:C.yellow },
              ].map(item => (
                <div key={item.label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:12 }}>
                  <span style={{ color:C.muted }}>{item.label}</span>
                  <span style={{ color:item.color, fontWeight:600 }}>{item.val}</span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderTop:`1px solid ${C.border}`, marginTop:4 }}>
                <span style={{ fontSize:13, fontWeight:700 }}>실수익 (추정)</span>
                <span style={{ fontSize:15, fontWeight:800, color:C.green }}>
                  {fmtW(selected.selling_price - selected.cost_price - Math.round(selected.selling_price * 0.1) - 2500)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 등록/수정 모달 */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"#000a", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
          <div style={{ ...css.card, width:"100%", maxWidth:600, maxHeight:"92vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h3 style={{ margin:0 }}>{editId ? "상품 수정" : "상품 등록"}</h3>
              <button style={css.btn(C.muted,true)} onClick={()=>setShowForm(false)}>✕</button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {/* SKU */}
              <div style={{ gridColumn:"1/-1" }}>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:4 }}>SKU <span style={{ color:C.red }}>*</span></label>
                <input style={{ ...css.input, opacity: editId?0.5:1 }} placeholder="24150-K" disabled={!!editId} {...F("sku")} />
              </div>
              {/* 상품명 */}
              <div style={{ gridColumn:"1/-1" }}>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:4 }}>상품명 <span style={{ color:C.red }}>*</span></label>
                <input style={css.input} placeholder="콩쑥개떡 32개입" {...F("name")} />
              </div>
              {/* 채널 */}
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:4 }}>판매 채널</label>
                <select style={{ ...css.select, width:"100%" }} {...F("channel")}>
                  {CHANNELS.filter(c=>c!=="전체").map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {/* 카테고리 */}
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:4 }}>카테고리</label>
                <select style={{ ...css.select, width:"100%" }} {...F("category")}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {/* 판매가 */}
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:4 }}>판매가 (원)</label>
                <input type="number" style={css.input} placeholder="18900" {...F("selling_price")} />
              </div>
              {/* 원가 */}
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:4 }}>원가 (원)</label>
                <input type="number" style={css.input} placeholder="9200" {...F("cost_price")} />
              </div>
              {/* 재고 */}
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:4 }}>현재 재고</label>
                <input type="number" style={css.input} placeholder="100" {...F("stock")} />
              </div>
              {/* 최소재고 */}
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:4 }}>최소 재고 (알림 기준)</label>
                <input type="number" style={css.input} placeholder="20" {...F("min_stock")} />
              </div>
              {/* 상태 */}
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:4 }}>상태</label>
                <select style={{ ...css.select, width:"100%" }} {...F("status")}>
                  {PRODUCT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              {/* 이미지 URL */}
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:4 }}>이미지 URL</label>
                <input style={css.input} placeholder="https://..." {...F("image_url")} />
              </div>
            </div>

            {/* 마진 미리보기 */}
            {form.selling_price > 0 && form.cost_price > 0 && (
              <div style={{ marginTop:14, padding:12, background:`${C.accent}11`, borderRadius:8, display:"flex", gap:20, flexWrap:"wrap" }}>
                <div style={{ fontSize:12 }}>
                  <span style={{ color:C.muted }}>마진율 </span>
                  <b style={{ color:C.green }}>
                    {(((Number(form.selling_price)-Number(form.cost_price))/Number(form.selling_price))*100).toFixed(1)}%
                  </b>
                </div>
                <div style={{ fontSize:12 }}>
                  <span style={{ color:C.muted }}>마진액 </span>
                  <b style={{ color:C.green }}>{fmtW(Number(form.selling_price)-Number(form.cost_price))}</b>
                </div>
              </div>
            )}

            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:20 }}>
              <button style={css.btn(C.muted)} onClick={()=>setShowForm(false)}>취소</button>
              <button style={css.btn(C.green)} onClick={save}>💾 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
