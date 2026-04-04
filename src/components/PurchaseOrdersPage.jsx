import { useState, useEffect, useRef } from "react";
import { DB, sb } from "../lib/supabase";
import { C, css, fmt, fmtW, todayStr } from "../lib/styles";
import Spinner from "./Spinner";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY;

async function ocrDocument(file) {
  if (!ANTHROPIC_KEY) throw new Error("VITE_ANTHROPIC_KEY가 .env에 설정되지 않았습니다");
  const base64 = await new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result.split(",")[1]);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
  const mediaType = file.type || "image/jpeg";
  const prompt = `이 문서(세금계산서 또는 거래명세서)에서 다음 정보를 추출해 JSON으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.
{
  "supplier_name": "공급자(판매자) 상호명",
  "ordered_date": "날짜 YYYY-MM-DD 형식",
  "items": [
    { "product_name": "품목명", "quantity": 수량(숫자), "unit_price": 단가(숫자), "subtotal": 소계(숫자) }
  ]
}
숫자는 콤마 없이 순수 숫자로. 날짜가 없으면 오늘 날짜. 품목이 없으면 빈 배열.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        { type: "text", text: prompt },
      ]}],
    }),
  });
  if (!res.ok) throw new Error(`API 오류 ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("JSON 파싱 실패");
  return JSON.parse(match[0]);
}

export default function PurchaseOrdersPage({ currentUser }) {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [filterStatus, setFilterStatus] = useState("전체");

  const emptyForm = { supplier_name:"", ordered_date:todayStr(), expected_date:"", status:"작성중", memo:"" };
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([{ product_code:"", product_name:"", quantity:1, unit_price:0, subtotal:0 }]);
  const [editId, setEditId] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreview, setOcrPreview] = useState(null);
  const fileInputRef = useRef();

  const handleOCR = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrPreview(URL.createObjectURL(file));
    setOcrLoading(true);
    try {
      const result = await ocrDocument(file);
      if (result.supplier_name) setForm(p => ({ ...p, supplier_name: result.supplier_name }));
      if (result.ordered_date)  setForm(p => ({ ...p, ordered_date: result.ordered_date }));
      if (result.items?.length) {
        setItems(result.items.map(it => ({
          product_code: "",
          product_name: it.product_name || "",
          quantity:     Number(it.quantity)   || 1,
          unit_price:   Number(it.unit_price) || 0,
          subtotal:     Number(it.subtotal)   || (Number(it.quantity||1) * Number(it.unit_price||0)),
        })));
      }
    } catch(err) {
      alert("OCR 실패: " + err.message);
    }
    setOcrLoading(false);
    e.target.value = "";
  };

  const STATUS_COLORS = { "작성중":C.muted, "발주완료":C.accent, "입고완료":C.green, "취소":C.red };

  useEffect(() => {
    (async () => {
      try {
        const [po, pr] = await Promise.all([DB.getPOs(), DB.getProducts()]);
        setOrders(po); setProducts(pr);
      } catch { setOrders([]); setProducts([]); }
      setLoading(false);
    })();
  }, []);

  const loadItems = async (po) => {
    setSelectedPO(po); setLoadingItems(true);
    try { const rows = await DB.getPOItems(po.id); setSelectedItems(rows); }
    catch { setSelectedItems([]); }
    setLoadingItems(false);
  };

  const updateItem = (idx, field, val) => {
    setItems(prev => {
      const next = prev.map((r,i) => i===idx ? { ...r, [field]: val } : r);
      if (field === "product_code") {
        const p = products.find(p => p.code === val);
        if (p) next[idx].product_name = p.name;
      }
      if (field === "quantity" || field === "unit_price") {
        next[idx].subtotal = (Number(next[idx].quantity)||0) * (Number(next[idx].unit_price)||0);
      }
      if (field === "product_code") {
        next[idx].subtotal = (Number(next[idx].quantity)||0) * (Number(next[idx].unit_price)||0);
      }
      return next;
    });
  };

  const addItemRow = () => setItems(p => [...p, { product_code:"", product_name:"", quantity:1, unit_price:0, subtotal:0 }]);
  const removeItemRow = (idx) => setItems(p => p.filter((_,i) => i !== idx));

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setItems([{ product_code:"", product_name:"", quantity:1, unit_price:0, subtotal:0 }]);
    setOcrPreview(null);
    setShowForm(true);
  };

  const openEdit = async (po) => {
    setOcrPreview(null);
    setEditId(po.id);
    setForm({ supplier_name: po.supplier_name, ordered_date: po.ordered_date, expected_date: po.expected_date||"", status: po.status, memo: po.memo||"" });
    try {
      const rows = await DB.getPOItems(po.id);
      setItems(rows.length ? rows.map(r=>({ product_code:r.product_code||"", product_name:r.product_name||"", quantity:r.quantity, unit_price:r.unit_price, subtotal:r.subtotal })) : [{ product_code:"", product_name:"", quantity:1, unit_price:0, subtotal:0 }]);
    } catch { setItems([{ product_code:"", product_name:"", quantity:1, unit_price:0, subtotal:0 }]); }
    setShowForm(true);
  };

  const save = async () => {
    if (!form.supplier_name) return alert("공급업체명을 입력하세요");
    if (!form.ordered_date) return alert("발주일을 입력하세요");
    const validItems = items.filter(r => r.product_name && r.quantity > 0);
    if (!validItems.length) return alert("품목을 1개 이상 입력하세요");
    const total = validItems.reduce((s, r) => s + (Number(r.subtotal)||0), 0);

    try {
      if (editId) {
        await DB.updatePO(editId, { ...form, total_amount: total });
        setOrders(p => p.map(o => o.id === editId ? { ...o, ...form, total_amount: total } : o));
        await sb(`purchase_order_items?purchase_order_id=eq.${editId}`, "DELETE");
        const itemPayload = validItems.map(r => ({ purchase_order_id: editId, product_code: r.product_code, product_name: r.product_name, quantity: Number(r.quantity), unit_price: Number(r.unit_price), subtotal: Number(r.subtotal) }));
        await DB.addPOItems(itemPayload);
      } else {
        const orderNo = `PO-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, "0")}`;
        const [newPO] = await DB.addPO({ ...form, order_no: orderNo, total_amount: total, created_by: currentUser?.name || "" });
        const itemPayload = validItems.map(r => ({ purchase_order_id: newPO.id, product_code: r.product_code, product_name: r.product_name, quantity: Number(r.quantity), unit_price: Number(r.unit_price), subtotal: Number(r.subtotal) }));
        await DB.addPOItems(itemPayload);
        setOrders(p => [newPO, ...p]);
      }
      setShowForm(false); setEditId(null);
    } catch(e) { alert("저장 실패: " + e.message); }
  };

  const remove = async (po) => {
    if (!confirm(`'${po.order_no}' 발주를 삭제하시겠습니까?`)) return;
    try { await DB.deletePO(po.id); setOrders(p => p.filter(o => o.id !== po.id)); if (selectedPO?.id === po.id) { setSelectedPO(null); setSelectedItems([]); } }
    catch { alert("삭제 실패"); }
  };

  const updateStatus = async (po, status) => {
    try { await DB.updatePO(po.id, { status }); setOrders(p => p.map(o => o.id === po.id ? { ...o, status } : o)); if (selectedPO?.id === po.id) setSelectedPO(prev => ({ ...prev, status })); }
    catch { alert("상태 변경 실패"); }
  };

  const filtered = filterStatus === "전체" ? orders : orders.filter(o => o.status === filterStatus);
  const totalPending = orders.filter(o => o.status === "발주완료").reduce((s, o) => s + (Number(o.total_amount)||0), 0);

  if (loading) return <Spinner text="발주 데이터 불러오는 중..." />;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:800}}>🛒 발주관리</h2>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>총 {orders.length}건 | 미입고 대기: {fmtW(totalPending)}</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {["전체","작성중","발주완료","입고완료","취소"].map(s=>(
            <button key={s} style={{...css.btn(filterStatus===s?C.accent:C.border,true),color:filterStatus===s?"#fff":C.text}} onClick={()=>setFilterStatus(s)}>{s}</button>
          ))}
          <button style={css.btn(C.green)} onClick={openNew}>+ 발주 생성</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20}}>
        {[
          { label:"전체 발주", val:orders.length+"건", color:C.accent },
          { label:"발주완료 대기", val:orders.filter(o=>o.status==="발주완료").length+"건", color:C.yellow },
          { label:"입고완료", val:orders.filter(o=>o.status==="입고완료").length+"건", color:C.green },
          { label:"미입고 금액", val:fmtW(totalPending), color:C.red },
        ].map(k=>(
          <div key={k.label} style={{...css.card,textAlign:"center"}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{k.label}</div>
            <div style={{fontSize:18,fontWeight:800,color:k.color}}>{k.val}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:selectedPO?"1fr 1fr":"1fr",gap:16}}>
        <div style={css.card}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>발주 목록</div>
          {filtered.length === 0 ? (
            <div style={{textAlign:"center",padding:40,color:C.muted}}>발주 내역이 없습니다</div>
          ) : (
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <th style={css.th}>발주번호</th>
                  <th style={css.th}>공급업체</th>
                  <th style={css.th}>발주일</th>
                  <th style={css.th}>상태</th>
                  <th style={css.thR}>금액</th>
                  <th style={css.th}>액션</th>
                </tr></thead>
                <tbody>
                  {filtered.map(po=>(
                    <tr key={po.id} onClick={()=>loadItems(po)}
                      style={{cursor:"pointer",background:selectedPO?.id===po.id?C.border+"44":"transparent"}}>
                      <td style={css.td}><span style={{fontSize:11,fontFamily:"monospace",color:C.accent}}>{po.order_no}</span></td>
                      <td style={css.td}>{po.supplier_name}</td>
                      <td style={css.td}><span style={{fontSize:12}}>{po.ordered_date}</span></td>
                      <td style={css.td}>
                        <select value={po.status} style={{...css.select,fontSize:11,padding:"2px 6px",color:STATUS_COLORS[po.status]}}
                          onClick={e=>e.stopPropagation()}
                          onChange={e=>{ e.stopPropagation(); updateStatus(po,e.target.value); }}>
                          {["작성중","발주완료","입고완료","취소"].map(s=><option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={css.tdR}><span style={{fontWeight:700}}>{fmtW(po.total_amount)}</span></td>
                      <td style={css.td}>
                        <div style={{display:"flex",gap:4}}>
                          <button style={css.btn(C.accent,true)} onClick={e=>{e.stopPropagation();openEdit(po);}}>수정</button>
                          <button style={css.btn(C.red,true)} onClick={e=>{e.stopPropagation();remove(po);}}>삭제</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedPO && (
          <div style={css.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div>
                <div style={{fontSize:13,fontWeight:700}}>{selectedPO.order_no} 상세</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{selectedPO.supplier_name} · {selectedPO.ordered_date}</div>
              </div>
              <button style={css.btn(C.muted,true)} onClick={()=>setSelectedPO(null)}>✕ 닫기</button>
            </div>
            {selectedPO.memo && <div style={{fontSize:12,color:C.muted,marginBottom:10,padding:"6px 10px",background:"#0f1117",borderRadius:6}}>📝 {selectedPO.memo}</div>}
            {loadingItems ? <Spinner text="품목 불러오는 중..." /> : (
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    <th style={css.th}>품목코드</th>
                    <th style={css.th}>품목명</th>
                    <th style={css.thR}>수량</th>
                    <th style={css.thR}>단가</th>
                    <th style={css.thR}>소계</th>
                  </tr></thead>
                  <tbody>
                    {selectedItems.map((item,i)=>(
                      <tr key={i}>
                        <td style={css.td}><span style={{fontSize:11,fontFamily:"monospace",color:C.muted}}>{item.product_code}</span></td>
                        <td style={css.td}>{item.product_name}</td>
                        <td style={css.tdR}>{fmt(item.quantity)}</td>
                        <td style={css.tdR}>{fmtW(item.unit_price)}</td>
                        <td style={css.tdR}><span style={{fontWeight:700,color:C.accent}}>{fmtW(item.subtotal)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr>
                    <td colSpan={4} style={{...css.td,fontWeight:700,textAlign:"right"}}>합계</td>
                    <td style={{...css.tdR,fontWeight:800,color:C.green,fontSize:15}}>{fmtW(selectedPO.total_amount)}</td>
                  </tr></tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div style={{position:"fixed",inset:0,background:"#000a",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{...css.card,width:"100%",maxWidth:760,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:16,fontWeight:800}}>{editId?"발주 수정":"신규 발주 등록"}</div>
              <button style={css.btn(C.muted,true)} onClick={()=>{ setShowForm(false); setOcrPreview(null); }}>✕</button>
            </div>

            {/* OCR 자동입력 */}
            <div style={{marginBottom:16,padding:12,background:`${C.cyan}11`,border:`1px solid ${C.cyan}33`,borderRadius:8}}>
              <div style={{fontSize:12,fontWeight:700,color:C.cyan,marginBottom:8}}>📷 문서 OCR 자동입력</div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleOCR} />
                <button style={{...css.btn(C.cyan),fontSize:12}} onClick={()=>fileInputRef.current.click()} disabled={ocrLoading}>
                  {ocrLoading ? "⏳ 분석 중..." : "📎 세금계산서·거래명세서 업로드"}
                </button>
                {!ANTHROPIC_KEY && <span style={{fontSize:11,color:C.red}}>⚠️ .env에 VITE_ANTHROPIC_KEY 필요</span>}
                {ocrLoading && <span style={{fontSize:11,color:C.cyan}}>AI가 문서를 읽는 중입니다...</span>}
              </div>
              {ocrPreview && !ocrLoading && (
                <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
                  <img src={ocrPreview} alt="업로드 문서" style={{height:60,borderRadius:4,border:`1px solid ${C.border}`,objectFit:"cover"}} />
                  <span style={{fontSize:11,color:C.green,fontWeight:700}}>✅ 자동입력 완료 — 내용을 확인 후 저장하세요</span>
                  <button style={{...css.btn(C.muted,true),fontSize:10}} onClick={()=>setOcrPreview(null)}>✕</button>
                </div>
              )}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>공급업체명 *</label>
                <input style={css.input} placeholder="공급업체명" value={form.supplier_name} onChange={e=>setForm(p=>({...p,supplier_name:e.target.value}))} />
              </div>
              <div>
                <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>상태</label>
                <select style={{...css.input}} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                  {["작성중","발주완료","입고완료","취소"].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>발주일 *</label>
                <input type="date" style={css.input} value={form.ordered_date} onChange={e=>setForm(p=>({...p,ordered_date:e.target.value}))} />
              </div>
              <div>
                <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>입고 예정일</label>
                <input type="date" style={css.input} value={form.expected_date} onChange={e=>setForm(p=>({...p,expected_date:e.target.value}))} />
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>메모</label>
                <input style={css.input} placeholder="메모 (선택)" value={form.memo} onChange={e=>setForm(p=>({...p,memo:e.target.value}))} />
              </div>
            </div>

            <div style={{fontSize:12,fontWeight:700,marginBottom:8,color:C.text}}>발주 품목</div>
            <div style={{overflowX:"auto",marginBottom:12}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <th style={css.th}>품목코드</th>
                  <th style={css.th}>품목명</th>
                  <th style={{...css.th,width:70}}>수량</th>
                  <th style={{...css.th,width:110}}>단가</th>
                  <th style={css.thR}>소계</th>
                  <th style={css.th}></th>
                </tr></thead>
                <tbody>
                  {items.map((row,idx)=>(
                    <tr key={idx}>
                      <td style={css.td}>
                        <select style={{...css.select,fontSize:12,width:"100%"}} value={row.product_code}
                          onChange={e=>updateItem(idx,"product_code",e.target.value)}>
                          <option value="">선택</option>
                          {products.map(p=><option key={p.code} value={p.code}>{p.code}</option>)}
                        </select>
                      </td>
                      <td style={css.td}>
                        <input style={{...css.input,minWidth:120}} placeholder="품목명" value={row.product_name}
                          onChange={e=>updateItem(idx,"product_name",e.target.value)} />
                      </td>
                      <td style={css.td}>
                        <input type="number" style={{...css.input,width:70,textAlign:"right"}} min={1} value={row.quantity}
                          onChange={e=>updateItem(idx,"quantity",e.target.value)} />
                      </td>
                      <td style={css.td}>
                        <input type="number" style={{...css.input,width:110,textAlign:"right"}} min={0} value={row.unit_price}
                          onChange={e=>updateItem(idx,"unit_price",e.target.value)} />
                      </td>
                      <td style={css.tdR}><span style={{fontWeight:700,color:C.accent}}>{fmtW(row.subtotal)}</span></td>
                      <td style={css.td}>
                        {items.length > 1 && <button style={css.btn(C.red,true)} onClick={()=>removeItemRow(idx)}>−</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr>
                  <td colSpan={4} style={{...css.td,fontWeight:700,textAlign:"right"}}>발주 합계</td>
                  <td style={{...css.tdR,fontWeight:800,color:C.green,fontSize:15}}>
                    {fmtW(items.reduce((s,r)=>s+(Number(r.subtotal)||0),0))}
                  </td>
                  <td style={css.td}></td>
                </tr></tfoot>
              </table>
            </div>
            <button style={{...css.btn(C.border,true),marginBottom:16,color:C.text}} onClick={addItemRow}>+ 품목 추가</button>

            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button style={css.btn(C.muted)} onClick={()=>setShowForm(false)}>취소</button>
              <button style={css.btn(C.green)} onClick={save}>💾 저장 (DB)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
