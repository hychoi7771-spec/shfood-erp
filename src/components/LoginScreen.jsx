import { useState } from "react";
import { DB } from "../lib/supabase";
import { C, css } from "../lib/styles";
import { ROLES } from "../lib/config";

const DEMO = [
  {id:"ceo",   pw:"shfood@ceo",  name:"대표이사", role:"admin"},
  {id:"admin", pw:"shfood2025!", name:"관리자",   role:"admin"},
  {id:"kim",   pw:"kim1234",     name:"김대리",   role:"manager"},
  {id:"lee",   pw:"lee1234",     name:"이사원",   role:"sales"},
  {id:"park",  pw:"park1234",    name:"박사원",   role:"warehouse"},
];

export default function LoginScreen({ onLogin }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!id || !pw) { setErr("아이디와 비밀번호를 입력하세요"); return; }
    setLoading(true); setErr("");
    try {
      const rows = await DB.getUsers();
      const user = rows.find(u => u.id === id && u.pw === pw);
      if (!user) { setErr("아이디 또는 비밀번호가 올바르지 않습니다."); setLoading(false); return; }
      const session = { ...user, loginAt: new Date().toISOString() };
      localStorage.setItem("shfood_session", JSON.stringify(session));
      onLogin(session);
    } catch {
      const user = DEMO.find(u => u.id === id && u.pw === pw);
      if (!user) { setErr("아이디 또는 비밀번호가 올바르지 않습니다."); setLoading(false); return; }
      const session = { ...user, dept: user.role === "admin" ? "경영" : "영업팀", loginAt: new Date().toISOString() };
      localStorage.setItem("shfood_session", JSON.stringify(session));
      onLogin(session);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Pretendard','Malgun Gothic',sans-serif", padding:16 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🍡</div>
          <div style={{ fontSize:22, fontWeight:800, color:C.accent }}>㈜에스에이치푸드</div>
          <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>통합 ERP 시스템</div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:32 }}>
          <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:22, textAlign:"center" }}>직원 로그인</div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:C.muted, display:"block", marginBottom:4 }}>아이디</label>
            <input style={{ ...css.input, fontSize:15 }} placeholder="아이디" value={id}
              onChange={e=>setId(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoFocus />
          </div>
          <div style={{ marginBottom:18 }}>
            <label style={{ fontSize:12, color:C.muted, display:"block", marginBottom:4 }}>비밀번호</label>
            <input type="password" style={{ ...css.input, fontSize:15 }} placeholder="비밀번호" value={pw}
              onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
          </div>
          {err && <div style={{ background:"#ef444422", border:"1px solid #ef444444", borderRadius:8, padding:"10px 12px", color:C.red, fontSize:12, marginBottom:14 }}>⚠️ {err}</div>}
          <button onClick={handleLogin} disabled={loading}
            style={{ width:"100%", background:C.accent, color:"#fff", border:"none", borderRadius:10, padding:"13px", fontSize:15, fontWeight:700, cursor:"pointer", opacity:loading?0.7:1 }}>
            {loading ? "로그인 중..." : "로그인"}
          </button>

          <div style={{ marginTop:20, padding:14, background:"#0f1117", borderRadius:8 }}>
            <div style={{ fontSize:11, color:C.muted, marginBottom:8, fontWeight:600 }}>테스트 계정 (클릭 시 자동입력)</div>
            {DEMO.map(u=>(
              <div key={u.id} onClick={()=>{ setId(u.id); setPw(u.pw); setErr(""); }}
                style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", cursor:"pointer", borderBottom:`1px solid ${C.border}22`, fontSize:12 }}>
                <span style={{ color:C.text }}>{u.name} <span style={{ color:C.muted }}>({u.id})</span></span>
                <span style={{ background:ROLES[u.role].color+"22", color:ROLES[u.role].color, borderRadius:4, padding:"1px 7px", fontSize:10, fontWeight:700 }}>{ROLES[u.role].label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
