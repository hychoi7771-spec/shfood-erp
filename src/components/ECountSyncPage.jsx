import { useState } from "react";
import { DB } from "../lib/supabase";
import { C, css, fmtW, todayStr } from "../lib/styles";

export default function ECountSyncPage() {
  const STORAGE_KEY = "shfood_ecount_config";
  const loadCfg = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; } };

  const [tab, setTab] = useState("config");
  const [form, setForm] = useState(() => { const c=loadCfg(); return { zone:"KR", com_code:c.com_code||"", user_id:c.user_id||"", api_cert_key:c.api_cert_key||"" }; });
  const [sessionId, setSessionId] = useState(()=>loadCfg().session_id||"");
  const [connStatus, setConnStatus] = useState(()=>loadCfg().session_id?"connected":"idle");
  const [connError, setConnError] = useState("");
  const [period, setPeriod] = useState({ start: new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0")+"-01", end: todayStr() });
  const [syncing, setSyncing] = useState(false);
  const [rows, setRows] = useState([]);
  const [syncError, setSyncError] = useState("");
  const [saving, setSaving] = useState(false);

  const PROXY = import.meta.env.VITE_ECOUNT_PROXY_URL || "";
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

  // Edge Function을 통해 이카운트 API 호출
  const callEcount = async (path, payload = {}, session_id = "") => {
    if (!PROXY) throw new Error("VITE_ECOUNT_PROXY_URL이 .env에 설정되지 않았습니다.\n설정 탭 하단 안내를 참고하세요.");
    const res = await fetch(PROXY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ path, session_id, payload }),
    });
    const data = await res.json();
    // ECount API 오류 메시지 추출
    if (!res.ok || data?.Status === 500 || data?.Status === "500") {
      const msg = data?.Data?.message || data?.Data?.Message || data?.Error?.Message || data?.RESULT?.MESSAGE || JSON.stringify(data);
      throw new Error(msg);
    }
    return data;
  };

  const connect = async () => {
    if (!form.com_code || !form.user_id || !form.api_cert_key) { setConnError("모든 필드를 입력하세요"); return; }
    if (!PROXY) { setConnStatus("error"); setConnError("VITE_ECOUNT_PROXY_URL이 .env에 없습니다. 아래 '배포 방법' 탭을 참고하세요."); return; }
    setConnStatus("connecting"); setConnError("");
    try {
      const data = await callEcount("/OAPI/V2/OAPILogin", {
        ZONE: form.zone, COM_CODE: form.com_code, USER_ID: form.user_id, API_CERT_KEY: form.api_cert_key,
      });
      if (data?.Status==="200" && data?.Data?.Datas?.SESSION_ID) {
        const sid = data.Data.Datas.SESSION_ID;
        setSessionId(sid); setConnStatus("connected");
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...form, session_id:sid }));
      } else {
        setConnStatus("error");
        setConnError("연결 실패: " + (data?.Error?.Message || data?.RESULT?.MESSAGE || JSON.stringify(data)));
      }
    } catch(e) {
      setConnStatus("error");
      setConnError("오류: " + e.message);
    }
  };

  const fetchSales = async () => {
    if (!sessionId) { setSyncError("먼저 이카운트에 연결하세요"); return; }
    setSyncing(true); setSyncError(""); setRows([]);
    try {
      const s=period.start.replace(/-/g,""), e=period.end.replace(/-/g,"");
      const data = await callEcount("/OAPI/V2/Sale/GetList", {
        ZONE: form.zone, COM_CODE: form.com_code, BASE_DATE: s, END_DATE: e, LIMIT_COUNT: 1000, START_NUM: 1,
      }, sessionId);
      if (data?.Status==="200") { setRows(data?.Data?.Datas||[]); }
      else { setSyncError("조회 실패: " + (data?.Error?.Message||data?.RESULT?.MESSAGE||JSON.stringify(data))); }
    } catch(e) { setSyncError("조회 오류: " + e.message); }
    setSyncing(false);
  };

  const saveRows = async () => {
    if (!rows.length) return;
    setSaving(true);
    try {
      const payload = rows.map(r=>({
        date: (r.IO_DATE||todayStr()).replace(/(\d{4})(\d{2})(\d{2})/,"$1-$2-$3"),
        customer: r.CUST_CODE_NAME||r.CUST_CODE||"",
        channel: "이카운트",
        amount: Number(r.SUPPLY_AMT||r.AMOUNT||0),
        tax: Number(r.VAT_AMT||0),
        total: Number(r.TOTAL_AMT||r.AMOUNT||0),
        status: "완료",
        memo: `이카운트 | ${r.IO_TYPE_GUBUN_CODE||""} | ${r.PROD_CODE||""}`,
      }));
      await DB.addSale(payload);
      alert(`${payload.length}건 매출전표에 저장 완료!`);
      setRows([]);
    } catch(e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  };

  const CONN_COLOR = { idle:C.muted, connecting:C.yellow, connected:C.green, error:C.red };
  const CONN_LABEL = { idle:"미연결", connecting:"연결 중...", connected:"✓ 연결됨", error:"연결 실패" };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:800}}>🔄 이카운트 ERP 연동</h2>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>이카운트 매출 데이터를 자동으로 가져옵니다</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{...css.badge(CONN_COLOR[connStatus]),fontSize:12,padding:"4px 12px"}}>{CONN_LABEL[connStatus]}</span>
          {["config","sync","guide"].map(t=>(
            <button key={t} style={{...css.btn(tab===t?C.accent:C.border,true),color:tab===t?"#fff":C.text}} onClick={()=>setTab(t)}>
              {t==="config"?"⚙️ 설정":t==="sync"?"📥 매출 동기화":"📖 가이드"}
            </button>
          ))}
        </div>
      </div>

      {tab==="config" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={css.card}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:16}}>⚙️ API 연결 설정</div>
            {[
              {key:"zone",         label:"Zone",       ph:"KR"},
              {key:"com_code",     label:"회사코드",    ph:"이카운트 회사코드 (8자리)"},
              {key:"user_id",      label:"사용자 ID",   ph:"이카운트 로그인 ID"},
              {key:"api_cert_key", label:"API 인증키",  ph:"환경설정 > OPEN API 인증키", pw:true},
            ].map(f=>(
              <div key={f.key} style={{marginBottom:12}}>
                <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>{f.label}</label>
                <input style={css.input} placeholder={f.ph} value={form[f.key]} type={f.pw?"password":"text"}
                  onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} />
              </div>
            ))}
            {connError && <div style={{padding:"10px 12px",background:"#ef444422",border:"1px solid #ef444444",borderRadius:8,fontSize:12,color:C.red,marginBottom:12,lineHeight:1.6}}>{connError}</div>}
            <div style={{display:"flex",gap:8}}>
              <button style={{...css.btn(C.accent),flex:1}} onClick={connect} disabled={connStatus==="connecting"}>
                {connStatus==="connecting"?"연결 중...":"🔗 연결 테스트"}
              </button>
            </div>
          </div>
          <div style={css.card}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:16}}>📋 연결 상태</div>
            {[
              {label:"상태",       val:CONN_LABEL[connStatus], color:CONN_COLOR[connStatus]},
              {label:"회사코드",   val:loadCfg().com_code||"-"},
              {label:"사용자 ID",  val:loadCfg().user_id||"-"},
              {label:"Session ID", val:sessionId?sessionId.slice(0,22)+"…":"없음", mono:true},
            ].map(item=>(
              <div key={item.label} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.border}33`}}>
                <span style={{fontSize:12,color:C.muted}}>{item.label}</span>
                <span style={{fontSize:12,fontWeight:600,color:item.color||C.text,fontFamily:item.mono?"monospace":"inherit"}}>{item.val}</span>
              </div>
            ))}
            {connStatus==="connected" && (
              <div style={{marginTop:14,padding:12,background:"#22c55e11",border:"1px solid #22c55e33",borderRadius:8,fontSize:12,color:C.green}}>
                ✅ 연결 성공! '매출 동기화' 탭에서 데이터를 가져오세요.
              </div>
            )}
          </div>
        </div>
      )}

      {tab==="sync" && (
        <div>
          <div style={{...css.card,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>📥 매출 데이터 조회</div>
            <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
              <div>
                <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>시작일</label>
                <input type="date" style={{...css.input,width:160}} value={period.start} onChange={e=>setPeriod(p=>({...p,start:e.target.value}))} />
              </div>
              <div>
                <label style={{fontSize:11,color:C.muted,display:"block",marginBottom:4}}>종료일</label>
                <input type="date" style={{...css.input,width:160}} value={period.end} onChange={e=>setPeriod(p=>({...p,end:e.target.value}))} />
              </div>
              <button style={css.btn(C.accent)} onClick={fetchSales} disabled={syncing||!sessionId}>
                {syncing?"조회 중...":"🔍 이카운트 매출 조회"}
              </button>
              {rows.length>0 && (
                <button style={css.btn(C.green)} onClick={saveRows} disabled={saving}>
                  {saving?"저장 중...":`💾 ${rows.length}건 DB 저장`}
                </button>
              )}
            </div>
            {!sessionId && <div style={{marginTop:10,fontSize:12,color:C.red}}>⚠️ 먼저 '설정' 탭에서 이카운트에 연결하세요</div>}
            {syncError && <div style={{marginTop:10,padding:"10px 12px",background:"#ef444422",borderRadius:8,fontSize:12,color:C.red}}>{syncError}</div>}
          </div>
          {rows.length>0 ? (
            <div style={css.card}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>
                조회 결과 — {rows.length}건 | 합계 {fmtW(rows.reduce((s,r)=>s+Number(r.TOTAL_AMT||r.AMOUNT||0),0))}
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    {["전표일자","거래처","품목","공급가액","부가세","합계","비고"].map(h=><th key={h} style={css.th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {rows.slice(0,100).map((r,i)=>(
                      <tr key={i}>
                        <td style={css.td}>{(r.IO_DATE||"").replace(/(\d{4})(\d{2})(\d{2})/,"$1-$2-$3")}</td>
                        <td style={css.td}>{r.CUST_CODE_NAME||r.CUST_CODE||"-"}</td>
                        <td style={css.td}>{r.PROD_CODE_NAME||r.PROD_CODE||"-"}</td>
                        <td style={css.tdR}>{fmtW(r.SUPPLY_AMT||r.AMOUNT||0)}</td>
                        <td style={css.tdR}>{fmtW(r.VAT_AMT||0)}</td>
                        <td style={css.tdR}><span style={{fontWeight:700,color:C.accent}}>{fmtW(r.TOTAL_AMT||r.AMOUNT||0)}</span></td>
                        <td style={{...css.td,fontSize:11,color:C.muted}}>{r.IO_TYPE_GUBUN_CODE||""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length>100&&<div style={{padding:"8px 12px",fontSize:12,color:C.muted}}>… 상위 100건만 표시 (전체 {rows.length}건)</div>}
              </div>
            </div>
          ) : !syncing && (
            <div style={{...css.card,textAlign:"center",padding:60,color:C.muted}}>
              <div style={{fontSize:32,marginBottom:12}}>📥</div>
              기간을 선택하고 '이카운트 매출 조회'를 클릭하세요
            </div>
          )}
        </div>
      )}

      {tab==="guide" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={css.card}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:16}}>📖 전체 연동 절차</div>
            {[
              {n:"1",t:"API 인증키 발급",    d:"이카운트 로그인 → 환경설정 → OPEN API 설정 → API 인증키 발급"},
              {n:"2",t:"Supabase CLI 설치",  d:"npm install -g supabase"},
              {n:"3",t:"Edge Function 배포", d:"프로젝트 루트에서: npx supabase functions deploy ecount-proxy"},
              {n:"4",t:".env URL 입력",      d:"Supabase 대시보드 → Edge Functions → ecount-proxy URL 복사 → .env의 VITE_ECOUNT_PROXY_URL에 입력"},
              {n:"5",t:"개발서버 재시작",    d:"npm run dev (환경변수 반영)"},
              {n:"6",t:"설정 탭에서 연결",   d:"회사코드, 사용자 ID, API 인증키 입력 → 연결 테스트"},
              {n:"7",t:"매출 동기화",        d:"'매출 동기화' 탭에서 기간 선택 → 조회 → DB 저장"},
            ].map(s=>(
              <div key={s.n} style={{display:"flex",gap:12,marginBottom:12,padding:12,background:"#0f1117",borderRadius:8}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:C.accent,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,flexShrink:0}}>{s.n}</div>
                <div><div style={{fontSize:12,fontWeight:700,marginBottom:2}}>{s.t}</div><div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>{s.d}</div></div>
              </div>
            ))}
          </div>
          <div style={css.card}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>🚀 Edge Function 배포 명령어</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:10,lineHeight:1.6}}>
              프로젝트 폴더에서 아래 명령어를 순서대로 실행하세요.<br/>
              파일은 이미 <code style={{color:C.cyan}}>supabase/functions/ecount-proxy/index.ts</code>에 생성되어 있습니다.
            </div>
            {[
              {label:"1. Supabase 로그인",   cmd:"npx supabase login"},
              {label:"2. 프로젝트 연결",      cmd:`npx supabase link --project-ref nqxmqnwapjqdwoefvwtr`},
              {label:"3. Function 배포",      cmd:"npx supabase functions deploy ecount-proxy"},
            ].map(item=>(
              <div key={item.label} style={{marginBottom:10}}>
                <div style={{fontSize:11,color:C.muted,marginBottom:3}}>{item.label}</div>
                <div style={{background:"#0f1117",borderRadius:6,padding:"8px 12px",fontFamily:"monospace",fontSize:12,color:"#22c55e",userSelect:"all"}}>
                  {item.cmd}
                </div>
              </div>
            ))}
            <div style={{marginTop:10,padding:"10px 12px",background:`${C.cyan}11`,border:`1px solid ${C.cyan}33`,borderRadius:8,fontSize:11,color:C.cyan,lineHeight:1.7}}>
              배포 후 Supabase 대시보드 → Edge Functions → ecount-proxy → URL을 복사해<br/>
              <b>.env</b>의 <code>VITE_ECOUNT_PROXY_URL</code>에 붙여넣고 개발서버를 재시작하세요.
            </div>
            <div style={{marginTop:10,padding:"8px 12px",background:`${PROXY?"#22c55e":"#ef4444"}11`,border:`1px solid ${PROXY?"#22c55e":"#ef4444"}44`,borderRadius:8,fontSize:12,fontWeight:700,color:PROXY?C.green:C.red}}>
              {PROXY ? "✅ VITE_ECOUNT_PROXY_URL 설정됨" : "⚠️ VITE_ECOUNT_PROXY_URL 미설정 — .env 확인 필요"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
