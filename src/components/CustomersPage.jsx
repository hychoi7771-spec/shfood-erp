import { useState, useEffect } from "react";
import { DB } from "../lib/supabase";
import { C, css } from "../lib/styles";
import Spinner from "./Spinner";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code:"", name:"", ceo:"", tel:"", mobile:"" });
  const [editCode, setEditCode] = useState(null);

  useEffect(() => {
    DB.getCustomers().then(rows => { setCustomers(rows); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c =>
    c.name?.includes(search) || c.ceo?.includes(search) || c.code?.includes(search)
  );

  const save = async () => {
    if (!form.code || !form.name) return alert("거래처코드와 거래처명을 입력하세요");
    try {
      if (editCode) {
        await DB.updateCustomer(editCode, { name:form.name, ceo:form.ceo, tel:form.tel, mobile:form.mobile });
        setCustomers(p => p.map(c => c.code === editCode ? { ...c, ...form } : c));
      } else {
        if (customers.find(c => c.code === form.code)) return alert("이미 존재하는 코드입니다");
        await DB.addCustomer(form);
        setCustomers(p => [...p, form]);
      }
      setShowForm(false); setEditCode(null);
      setForm({ code:"", name:"", ceo:"", tel:"", mobile:"" });
    } catch { alert("저장 실패. DB 연결을 확인하세요."); }
  };

  const remove = async (code, name) => {
    if (!confirm(`'${name}' 거래처를 삭제하시겠습니까?`)) return;
    try { await DB.deleteCustomer(code); setCustomers(p => p.filter(c => c.code !== code)); }
    catch { alert("삭제 실패"); }
  };

  if (loading) return <Spinner text="거래처 불러오는 중..." />;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>거래처 <span style={{ fontSize:13, color:C.muted, fontWeight:400 }}>{filtered.length}건</span></h2>
        <div style={{ display:"flex", gap:8 }}>
          <input style={{ ...css.input, width:200 }} placeholder="이름·대표·코드 검색" value={search} onChange={e=>setSearch(e.target.value)} />
          <button style={css.btn(C.green)} onClick={() => { setShowForm(true); setEditCode(null); setForm({ code:"", name:"", ceo:"", tel:"", mobile:"" }); }}>+ 추가</button>
        </div>
      </div>
      <div style={{ ...css.card, overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
          <thead><tr>
            {["코드","거래처명","대표자","전화","휴대폰","관리"].map(h => <th key={h} style={css.th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={6} style={{ ...css.td, textAlign:"center", color:C.muted, padding:32 }}>데이터 없음</td></tr>
              : filtered.map(c => (
                <tr key={c.code}>
                  <td style={{ ...css.td, color:C.muted, fontSize:11 }}>{c.code}</td>
                  <td style={{ ...css.td, fontWeight:600 }}>{c.name}</td>
                  <td style={css.td}>{c.ceo}</td>
                  <td style={css.td}>{c.tel}</td>
                  <td style={css.td}>{c.mobile}</td>
                  <td style={css.td}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => { setForm({...c}); setEditCode(c.code); setShowForm(true); }} style={{ background:`${C.accent}22`, color:C.accent, border:"none", borderRadius:6, padding:"3px 10px", cursor:"pointer", fontSize:11, fontWeight:700 }}>수정</button>
                      <button onClick={() => remove(c.code, c.name)} style={{ background:`${C.red}22`, color:C.red, border:"none", borderRadius:6, padding:"3px 10px", cursor:"pointer", fontSize:11, fontWeight:700 }}>삭제</button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"#000a", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:16 }}>
          <div style={{ ...css.card, width:"100%", maxWidth:380 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <h3 style={{ margin:0 }}>{editCode ? "거래처 수정" : "거래처 추가"}</h3>
              <button style={css.btn(C.muted, true)} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div style={{ display:"grid", gap:10 }}>
              {[{label:"거래처코드",field:"code",ph:"코드",disabled:!!editCode},{label:"거래처명",field:"name",ph:"(주)예시"},{label:"대표자",field:"ceo",ph:"홍길동"},{label:"전화",field:"tel",ph:"02-0000-0000"},{label:"휴대폰",field:"mobile",ph:"010-0000-0000"}].map(({label,field,ph,disabled}) => (
                <div key={field}>
                  <label style={{ fontSize:12, color:C.muted, display:"block", marginBottom:3 }}>{label}</label>
                  <input style={{ ...css.input, opacity:disabled?0.5:1 }} placeholder={ph} disabled={disabled} value={form[field]} onChange={e=>setForm(p=>({...p,[field]:e.target.value}))} />
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:14 }}>
              <button style={css.btn(C.muted)} onClick={() => setShowForm(false)}>취소</button>
              <button style={css.btn(C.green)} onClick={save}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
