import { useState, useEffect } from "react";
import { DB } from "../lib/supabase";
import { C, css, fmtW } from "../lib/styles";
import Spinner from "./Spinner";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [specialPrices, setSpecialPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code:"", name:"", type:"제품", spec:"" });
  const [editCode, setEditCode] = useState(null);
  const [showSpForm, setShowSpForm] = useState(false);
  const [spForm, setSpForm] = useState({ customer_name:"", price:"", vat_included:"포함" });

  useEffect(() => {
    Promise.all([DB.getProducts(), DB.getSpecialPrices()])
      .then(([prods, sps]) => { setProducts(prods); setSpecialPrices(sps); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = products.filter(p =>
    p.name?.includes(search) || p.code?.includes(search) || p.spec?.includes(search)
  );

  const selectedSPs = selected ? specialPrices.filter(sp => sp.product_code === selected.code) : [];

  const saveProduct = async () => {
    if (!form.code || !form.name) return alert("품목코드와 품목명을 입력하세요");
    try {
      if (editCode) {
        await DB.updateProduct(editCode, { name:form.name, type:form.type, spec:form.spec });
        setProducts(p => p.map(pr => pr.code === editCode ? { ...pr, ...form } : pr));
      } else {
        if (products.find(p => p.code === form.code)) return alert("이미 존재하는 코드입니다");
        await DB.addProduct(form);
        setProducts(p => [...p, form]);
      }
      setShowForm(false); setEditCode(null);
      setForm({ code:"", name:"", type:"제품", spec:"" });
    } catch { alert("저장 실패. DB 연결을 확인하세요."); }
  };

  const removeProduct = async (code, name) => {
    if (!confirm(`'${name}' 품목을 삭제하시겠습니까?`)) return;
    try { await DB.deleteProduct(code); setProducts(p => p.filter(pr => pr.code !== code)); if (selected?.code === code) setSelected(null); }
    catch { alert("삭제 실패"); }
  };

  const addSpecialPrice = async () => {
    if (!spForm.customer_name || !spForm.price) return alert("거래처명과 단가를 입력하세요");
    try {
      const row = { product_code: selected.code, customer_name: spForm.customer_name, price: parseInt(spForm.price), vat_included: spForm.vat_included };
      const [saved] = await DB.addSpecialPrice(row);
      setSpecialPrices(p => [...p, saved]);
      setShowSpForm(false); setSpForm({ customer_name:"", price:"", vat_included:"포함" });
    } catch { alert("저장 실패"); }
  };

  const removeSpecialPrice = async (id) => {
    if (!confirm("특별단가를 삭제하시겠습니까?")) return;
    try { await DB.deleteSpecialPrice(id); setSpecialPrices(p => p.filter(sp => sp.id !== id)); }
    catch { alert("삭제 실패"); }
  };

  if (loading) return <Spinner text="품목 불러오는 중..." />;

  return (
    <div style={{ display:"grid", gridTemplateColumns: selected ? "1fr 340px" : "1fr", gap:16 }}>
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>품목·단가 <span style={{ fontSize:13, color:C.muted, fontWeight:400 }}>{filtered.length}건</span></h2>
          <div style={{ display:"flex", gap:8 }}>
            <input style={{ ...css.input, width:200 }} placeholder="품목명·코드·규격 검색" value={search} onChange={e=>setSearch(e.target.value)} />
            <button style={css.btn(C.green)} onClick={() => { setShowForm(true); setEditCode(null); setForm({ code:"", name:"", type:"제품", spec:"" }); }}>+ 추가</button>
          </div>
        </div>
        <div style={{ ...css.card, overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:400 }}>
            <thead><tr>
              {["코드","품목명","구분","규격","특별단가","관리"].map(h => <th key={h} style={css.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={6} style={{ ...css.td, textAlign:"center", color:C.muted, padding:32 }}>데이터 없음</td></tr>
                : filtered.map(p => {
                  const spCount = specialPrices.filter(sp => sp.product_code === p.code).length;
                  return (
                    <tr key={p.code} onClick={() => setSelected(selected?.code === p.code ? null : p)} style={{ cursor:"pointer", background: selected?.code === p.code ? `${C.accent}18` : "transparent" }}>
                      <td style={{ ...css.td, color:C.muted, fontSize:11 }}>{p.code}</td>
                      <td style={{ ...css.td, fontWeight:600 }}>{p.name}</td>
                      <td style={css.td}><span style={css.badge(C.cyan)}>{p.type}</span></td>
                      <td style={{ ...css.td, color:C.muted }}>{p.spec}</td>
                      <td style={css.td}>{spCount > 0 ? <span style={css.badge(C.yellow)}>{spCount}건</span> : <span style={{ color:C.muted, fontSize:11 }}>-</span>}</td>
                      <td style={css.td} onClick={e=>e.stopPropagation()}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => { setForm({...p}); setEditCode(p.code); setShowForm(true); }} style={{ background:`${C.accent}22`, color:C.accent, border:"none", borderRadius:6, padding:"3px 10px", cursor:"pointer", fontSize:11, fontWeight:700 }}>수정</button>
                          <button onClick={() => removeProduct(p.code, p.name)} style={{ background:`${C.red}22`, color:C.red, border:"none", borderRadius:6, padding:"3px 10px", cursor:"pointer", fontSize:11, fontWeight:700 }}>삭제</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700 }}>{selected.name}</div>
              <div style={{ fontSize:11, color:C.muted }}>특별단가</div>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button style={css.btn(C.green, true)} onClick={() => setShowSpForm(true)}>+ 추가</button>
              <button style={css.btn(C.muted, true)} onClick={() => setSelected(null)}>✕</button>
            </div>
          </div>
          <div style={css.card}>
            {selectedSPs.length === 0
              ? <div style={{ color:C.muted, textAlign:"center", padding:24, fontSize:13 }}>특별단가 없음</div>
              : selectedSPs.map(sp => (
                <div key={sp.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}22` }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{sp.customer_name}</div>
                    <div style={{ fontSize:11, color:C.muted }}>VAT {sp.vat_included}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontWeight:700, color:C.accent }}>{fmtW(sp.price)}</span>
                    <button onClick={() => removeSpecialPrice(sp.id)} style={{ background:`${C.red}22`, color:C.red, border:"none", borderRadius:6, padding:"2px 8px", cursor:"pointer", fontSize:11 }}>삭제</button>
                  </div>
                </div>
              ))
            }
          </div>
          {showSpForm && (
            <div style={{ ...css.card, marginTop:12 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>특별단가 추가</div>
              <div style={{ display:"grid", gap:8 }}>
                <div><label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:3 }}>거래처명</label><input style={css.input} placeholder="거래처명" value={spForm.customer_name} onChange={e=>setSpForm(p=>({...p,customer_name:e.target.value}))} /></div>
                <div><label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:3 }}>단가 (원)</label><input type="number" style={css.input} placeholder="0" value={spForm.price} onChange={e=>setSpForm(p=>({...p,price:e.target.value}))} /></div>
                <div><label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:3 }}>VAT</label>
                  <select style={{ ...css.select, width:"100%" }} value={spForm.vat_included} onChange={e=>setSpForm(p=>({...p,vat_included:e.target.value}))}>
                    <option value="포함">포함</option><option value="별도">별도</option>
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:10 }}>
                <button style={css.btn(C.muted, true)} onClick={() => setShowSpForm(false)}>취소</button>
                <button style={css.btn(C.green, true)} onClick={addSpecialPrice}>저장</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"#000a", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
          <div style={{ ...css.card, width:"100%", maxWidth:360 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <h3 style={{ margin:0 }}>{editCode ? "품목 수정" : "품목 추가"}</h3>
              <button style={css.btn(C.muted, true)} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div style={{ display:"grid", gap:10 }}>
              {[{label:"품목코드",field:"code",ph:"코드",disabled:!!editCode},{label:"품목명",field:"name",ph:"옛날찹쌀떡 30개입"},{label:"규격",field:"spec",ph:"30개입"}].map(({label,field,ph,disabled}) => (
                <div key={field}><label style={{ fontSize:12, color:C.muted, display:"block", marginBottom:3 }}>{label}</label>
                  <input style={{ ...css.input, opacity:disabled?0.5:1 }} placeholder={ph} disabled={disabled} value={form[field]} onChange={e=>setForm(p=>({...p,[field]:e.target.value}))} /></div>
              ))}
              <div><label style={{ fontSize:12, color:C.muted, display:"block", marginBottom:3 }}>구분</label>
                <select style={{ ...css.select, width:"100%" }} value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                  {["제품","상품","원재료","반제품","부재료"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:14 }}>
              <button style={css.btn(C.muted)} onClick={() => setShowForm(false)}>취소</button>
              <button style={css.btn(C.green)} onClick={saveProduct}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
