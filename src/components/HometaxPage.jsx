import { useState, useEffect, useRef } from "react";
import { sb } from "../lib/supabase";
import { C, css, fmtW, todayStr } from "../lib/styles";
import Spinner from "./Spinner";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY;

async function ocrHometaxImage(file) {
  if (!ANTHROPIC_KEY) throw new Error("VITE_ANTHROPIC_KEY가 .env에 설정되지 않았습니다");
  const base64 = await new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result.split(",")[1]);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
  const prompt = `이 세금계산서 이미지에서 모든 세금계산서 데이터를 추출해 JSON 배열로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.
[
  {
    "approval_no": "승인번호(없으면 빈 문자열)",
    "type": "발행 또는 수취",
    "issue_date": "작성일자 YYYY-MM-DD 형식",
    "supplier_no": "공급자 사업자번호(없으면 빈 문자열)",
    "supplier_name": "공급자 상호명",
    "buyer_no": "공급받는자 사업자번호(없으면 빈 문자열)",
    "buyer_name": "공급받는자 상호명",
    "supply_amt": 공급가액(숫자),
    "tax_amt": 세액(숫자),
    "total_amt": 합계금액(숫자),
    "memo": "비고(없으면 빈 문자열)"
  }
]
숫자는 콤마 없이 순수 숫자로. 세금계산서가 1건이면 배열에 1개 항목.`;

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
      max_tokens: 2048,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: file.type || "image/jpeg", data: base64 } },
        { type: "text", text: prompt },
      ]}],
    }),
  });
  if (!res.ok) throw new Error(`API 오류 ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("JSON 파싱 실패");
  return JSON.parse(match[0]);
}

export default function HometaxPage() {
  const [tab, setTab] = useState("upload");
  const [parseResult, setParseResult] = useState([]);
  const [parseError, setParseError] = useState("");
  const [fileName, setFileName] = useState("");
  const [savedList, setSavedList] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState("전체");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreview, setOcrPreview] = useState(null);
  const imgInputRef = useRef();

  const handleImageOCR = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setFileName(file.name); setParseResult([]); setParseError("");
    setOcrPreview(URL.createObjectURL(file));
    setOcrLoading(true);
    try {
      const results = await ocrHometaxImage(file);
      if (!results.length) { setParseError("인식된 세금계산서 데이터가 없습니다"); setOcrLoading(false); return; }
      const normalized = results.map(r => ({
        approval_no:   r.approval_no   || "",
        type:          r.type          || "발행",
        issue_date:    r.issue_date    || todayStr(),
        supplier_no:   r.supplier_no   || "",
        supplier_name: r.supplier_name || "",
        buyer_no:      r.buyer_no      || "",
        buyer_name:    r.buyer_name    || "",
        supply_amt:    Number(r.supply_amt) || 0,
        tax_amt:       Number(r.tax_amt)    || 0,
        total_amt:     Number(r.total_amt)  || (Number(r.supply_amt||0) + Number(r.tax_amt||0)),
        memo:          r.memo || "",
      }));
      setParseResult(normalized); setParseError("");
    } catch(err) {
      setParseError("OCR 실패: " + err.message);
    }
    setOcrLoading(false);
    e.target.value = "";
  };

  const parseCSV = (text) => {
    const clean = text.replace(/^\uFEFF/,"").trim();
    const lines = clean.split(/\r?\n/).filter(l=>l.trim());
    if (lines.length < 2) { setParseError("파일에 데이터가 없습니다"); return; }

    const headers = lines[0].split(",").map(h=>h.replace(/^"|"$/g,"").trim());
    const colIdx = (...cands) => { for(const c of cands){ const i=headers.findIndex(h=>h.includes(c)); if(i>=0) return i; } return -1; };

    const COL = {
      approvalNo:   colIdx("승인번호","승인"),
      type:         colIdx("구분","유형","세금계산서구분"),
      issueDate:    colIdx("작성일자","발급일","작성일"),
      supplierNo:   colIdx("공급자사업자","공급자 사업자"),
      supplierName: colIdx("공급자상호","공급자 상호","공급자"),
      buyerNo:      colIdx("공급받는자사업자","공급받는자 사업자"),
      buyerName:    colIdx("공급받는자상호","공급받는자 상호","공급받는자"),
      supplyAmt:    colIdx("공급가액","공급 가액"),
      taxAmt:       colIdx("세액","부가세"),
      totalAmt:     colIdx("합계금액","합계","총금액"),
      memo:         colIdx("비고","메모","품목"),
    };

    const splitCSVLine = (line) => {
      const cells=[]; let cur="", inQ=false;
      for(const ch of line){ if(ch==='"'){inQ=!inQ;}else if(ch===","&&!inQ){cells.push(cur);cur="";}else{cur+=ch;} }
      cells.push(cur); return cells;
    };

    const parsed=[];
    for(let i=1;i<lines.length;i++){
      const cells=splitCSVLine(lines[i]);
      if(cells.length<5) continue;
      const get=(idx)=>idx>=0?(cells[idx]||"").replace(/^"|"$/g,"").trim():"";
      const getNum=(idx)=>{ const v=get(idx).replace(/,/g,""); return isNaN(Number(v))?0:Number(v); };
      const dateRaw=get(COL.issueDate);
      const dateStr=dateRaw.replace(/(\d{4})(\d{2})(\d{2})/,"$1-$2-$3").replace(/\./g,"-").replace(/-+$/,"");
      const supply=getNum(COL.supplyAmt), tax=getNum(COL.taxAmt);
      parsed.push({
        approval_no:   get(COL.approvalNo),
        type:          get(COL.type)||"발행",
        issue_date:    dateStr||todayStr(),
        supplier_no:   get(COL.supplierNo),
        supplier_name: get(COL.supplierName),
        buyer_no:      get(COL.buyerNo),
        buyer_name:    get(COL.buyerName),
        supply_amt:    supply,
        tax_amt:       tax,
        total_amt:     getNum(COL.totalAmt)||supply+tax,
        memo:          get(COL.memo),
      });
    }
    if(!parsed.length){setParseError("파싱된 데이터가 없습니다. 파일 형식을 확인하세요");return;}
    setParseResult(parsed); setParseError("");
  };

  const handleFile = (e) => {
    const file=e.target.files?.[0]; if(!file)return;
    setFileName(file.name); setParseResult([]); setParseError("");
    const reader=new FileReader();
    reader.onload=(ev)=>{ try{parseCSV(ev.target.result);}catch(err){setParseError("파일 읽기 실패: "+err.message);} };
    reader.readAsText(file, "UTF-8");
  };

  const loadSaved = async () => {
    setLoadingSaved(true);
    try{ const r=await sb("hometax_invoices","GET",null,"?order=issue_date.desc&limit=500"); setSavedList(r); }
    catch{ setSavedList([]); }
    setLoadingSaved(false);
  };

  useEffect(()=>{ if(tab==="saved")loadSaved(); },[tab]);

  const saveToDb = async () => {
    if(!parseResult.length)return;
    setSaving(true);
    try{
      await sb("hometax_invoices","POST",parseResult);
      alert(`${parseResult.length}건 저장 완료!`);
      setParseResult([]); setFileName(""); setTab("saved");
    }catch(e){
      if(e.message?.includes("hometax_invoices")){
        const sql=`CREATE TABLE hometax_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  approval_no VARCHAR(50), type VARCHAR(20) DEFAULT '발행',
  issue_date DATE, supplier_no VARCHAR(20), supplier_name VARCHAR(200),
  buyer_no VARCHAR(20), buyer_name VARCHAR(200),
  supply_amt NUMERIC(15,2) DEFAULT 0, tax_amt NUMERIC(15,2) DEFAULT 0,
  total_amt NUMERIC(15,2) DEFAULT 0, memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE hometax_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON hometax_invoices FOR ALL USING (true) WITH CHECK (true);`;
        alert("hometax_invoices 테이블이 없습니다.\nSupabase SQL Editor에서 아래 SQL을 실행하세요:\n\n"+sql);
      } else { alert("저장 실패: "+e.message); }
    }
    setSaving(false);
  };

  const filtered = savedList.filter(r=>filterType==="전체"||r.type===filterType);
  const totalSupply = filtered.reduce((s,r)=>s+(Number(r.supply_amt)||0),0);
  const totalTax    = filtered.reduce((s,r)=>s+(Number(r.tax_amt)||0),0);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:800}}>🏛️ 홈택스 세금계산서 연동</h2>
          <div style={{fontSize:12,color:C.muted,marginTop:2}}>홈택스 CSV 파일을 업로드하여 세금계산서를 관리합니다</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {["upload","saved"].map(t=>(
            <button key={t} style={{...css.btn(tab===t?C.accent:C.border,true),color:tab===t?"#fff":C.text}} onClick={()=>setTab(t)}>
              {t==="upload"?"📤 CSV 업로드":"📋 저장된 목록"}
            </button>
          ))}
        </div>
      </div>

      {tab==="upload" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>
            {/* OCR 이미지 업로드 */}
            <div style={{...css.card,borderTop:`3px solid ${C.cyan}`}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:4,color:C.cyan}}>📷 이미지 OCR <span style={{fontSize:10,fontWeight:400,color:C.muted}}>NEW</span></div>
              <div style={{fontSize:11,color:C.muted,marginBottom:12}}>세금계산서 사진/스캔 → AI 자동 추출</div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:20,border:`2px dashed ${C.cyan}44`,borderRadius:10,marginBottom:10}}>
                <div style={{fontSize:36}}>{ocrLoading?"⏳":"🖼️"}</div>
                <div style={{fontSize:12,fontWeight:600}}>{ocrLoading?"AI 분석 중...":"세금계산서 이미지"}</div>
                <div style={{fontSize:11,color:C.muted}}>JPG, PNG, WEBP 등</div>
                <input ref={imgInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImageOCR}/>
                <button style={css.btn(C.cyan)} onClick={()=>imgInputRef.current.click()} disabled={ocrLoading}>
                  {ocrLoading?"분석 중...":"🤖 이미지 업로드"}
                </button>
              </div>
              {!ANTHROPIC_KEY && <div style={{padding:"6px 10px",background:`${C.red}22`,borderRadius:6,fontSize:11,color:C.red}}>⚠️ VITE_ANTHROPIC_KEY 필요</div>}
              {ocrPreview && !ocrLoading && (
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}>
                  <img src={ocrPreview} alt="업로드" style={{height:44,borderRadius:4,border:`1px solid ${C.border}`,objectFit:"cover"}}/>
                  <span style={{fontSize:11,color:C.green,fontWeight:700}}>✅ OCR 완료</span>
                </div>
              )}
            </div>

            <div style={css.card}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>📤 CSV 업로드</div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:28,border:`2px dashed ${C.border}`,borderRadius:10,marginBottom:12}}>
                <div style={{fontSize:40}}>📄</div>
                <div style={{fontSize:13,fontWeight:600}}>홈택스 세금계산서 CSV</div>
                <div style={{fontSize:11,color:C.muted}}>발급 목록 또는 수취 목록 CSV 파일</div>
                <input id="htx-file" type="file" accept=".csv,.txt" style={{display:"none"}} onChange={handleFile}/>
                <button style={css.btn(C.accent)} onClick={()=>document.getElementById("htx-file").click()}>📁 파일 선택</button>
              </div>
              {fileName && <div style={{fontSize:12,color:C.green,marginBottom:6}}>✓ {fileName}</div>}
              {parseError && <div style={{padding:"8px 12px",background:"#ef444422",borderRadius:8,fontSize:12,color:C.red}}>{parseError}</div>}
            </div>

            <div style={css.card}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>📖 홈택스 CSV 내려받기</div>
              {[
                {n:"1",t:"홈택스 로그인",d:"www.hometax.go.kr → 공인인증서 로그인"},
                {n:"2",t:"세금계산서 조회",d:"조회/발급 → 세금계산서 → 매출/매입 세금계산서 합계표"},
                {n:"3",t:"기간 조회",d:"조회 기간 선택 후 검색"},
                {n:"4",t:"CSV 내려받기",d:"'다운로드' 버튼 → 엑셀(CSV) 선택"},
                {n:"5",t:"파일 업로드",d:"내려받은 CSV 파일을 여기에 업로드"},
              ].map(s=>(
                <div key={s.n} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:C.accent+"33",color:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{s.n}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700}}>{s.t}</div>
                    <div style={{fontSize:11,color:C.muted}}>{s.d}</div>
                  </div>
                </div>
              ))}
              <div style={{marginTop:8,padding:"8px 12px",background:"#eab30811",borderRadius:8,fontSize:11,color:C.yellow}}>
                💡 매입 세금계산서는 '매입 세금계산서 합계표'에서 동일하게 내려받으세요
              </div>
            </div>
          </div>

          {parseResult.length>0 && (
            <div style={css.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700}}>미리보기 — {parseResult.length}건</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                    공급가액 <span style={{color:C.green,fontWeight:700}}>{fmtW(parseResult.reduce((s,r)=>s+r.supply_amt,0))}</span>
                    &nbsp;| 세액 <span style={{color:C.yellow,fontWeight:700}}>{fmtW(parseResult.reduce((s,r)=>s+r.tax_amt,0))}</span>
                    &nbsp;| 합계 <span style={{color:C.accent,fontWeight:700}}>{fmtW(parseResult.reduce((s,r)=>s+r.total_amt,0))}</span>
                  </div>
                </div>
                <button style={css.btn(C.green)} onClick={saveToDb} disabled={saving}>
                  {saving?"저장 중...":`💾 ${parseResult.length}건 DB 저장`}
                </button>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    {["구분","발급일","공급자","공급받는자","공급가액","세액","합계"].map(h=><th key={h} style={css.th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {parseResult.slice(0,50).map((r,i)=>(
                      <tr key={i}>
                        <td style={css.td}><span style={{...css.badge(r.type==="발행"?C.accent:C.yellow)}}>{r.type}</span></td>
                        <td style={css.td}>{r.issue_date}</td>
                        <td style={css.td}><div style={{fontWeight:600,fontSize:12}}>{r.supplier_name}</div><div style={{fontSize:10,color:C.muted}}>{r.supplier_no}</div></td>
                        <td style={css.td}><div style={{fontWeight:600,fontSize:12}}>{r.buyer_name}</div><div style={{fontSize:10,color:C.muted}}>{r.buyer_no}</div></td>
                        <td style={css.tdR}>{fmtW(r.supply_amt)}</td>
                        <td style={css.tdR}>{fmtW(r.tax_amt)}</td>
                        <td style={css.tdR}><span style={{fontWeight:700,color:C.accent}}>{fmtW(r.total_amt)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parseResult.length>50&&<div style={{padding:"8px 12px",fontSize:12,color:C.muted}}>… 상위 50건 표시 (전체 {parseResult.length}건)</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {tab==="saved" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16}}>
            {[
              {label:"전체",       val:savedList.length+"건",                                   color:C.accent},
              {label:"발행",       val:savedList.filter(r=>r.type==="발행").length+"건",         color:C.green},
              {label:"수취",       val:savedList.filter(r=>r.type==="수취").length+"건",         color:C.yellow},
              {label:"공급가액 합계",val:fmtW(savedList.reduce((s,r)=>s+(Number(r.supply_amt)||0),0)), color:C.cyan},
              {label:"세액 합계",   val:fmtW(savedList.reduce((s,r)=>s+(Number(r.tax_amt)||0),0)),   color:C.purple},
            ].map(k=>(
              <div key={k.label} style={{...css.card,textAlign:"center"}}>
                <div style={{fontSize:11,color:C.muted,marginBottom:4}}>{k.label}</div>
                <div style={{fontSize:16,fontWeight:800,color:k.color}}>{k.val}</div>
              </div>
            ))}
          </div>
          <div style={css.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:13,fontWeight:700}}>세금계산서 목록</div>
              <div style={{display:"flex",gap:6}}>
                {["전체","발행","수취"].map(f=>(
                  <button key={f} style={{...css.btn(filterType===f?C.accent:C.border,true),color:filterType===f?"#fff":C.text}} onClick={()=>setFilterType(f)}>{f}</button>
                ))}
                <button style={css.btn(C.muted,true)} onClick={loadSaved}>🔄 새로고침</button>
              </div>
            </div>
            {loadingSaved ? <Spinner text="불러오는 중..."/> : filtered.length===0 ? (
              <div style={{textAlign:"center",padding:48,color:C.muted}}>
                <div style={{fontSize:32,marginBottom:10}}>🏛️</div>
                저장된 세금계산서가 없습니다.<br/>
                <span style={{fontSize:12}}>CSV 업로드 탭에서 홈택스 데이터를 올려주세요</span>
              </div>
            ) : (
              <>
                <div style={{fontSize:12,color:C.muted,marginBottom:8}}>
                  {filtered.length}건 | 공급가액 <span style={{color:C.green,fontWeight:700}}>{fmtW(totalSupply)}</span> | 세액 <span style={{color:C.yellow,fontWeight:700}}>{fmtW(totalTax)}</span>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>
                      {["구분","발급일","공급자","공급받는자","공급가액","세액","합계","승인번호"].map(h=><th key={h} style={css.th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {filtered.map((r,i)=>(
                        <tr key={i}>
                          <td style={css.td}><span style={{...css.badge(r.type==="발행"?C.accent:C.yellow)}}>{r.type}</span></td>
                          <td style={css.td}>{r.issue_date}</td>
                          <td style={css.td}><div style={{fontWeight:600,fontSize:12}}>{r.supplier_name}</div><div style={{fontSize:10,color:C.muted}}>{r.supplier_no}</div></td>
                          <td style={css.td}><div style={{fontWeight:600,fontSize:12}}>{r.buyer_name}</div><div style={{fontSize:10,color:C.muted}}>{r.buyer_no}</div></td>
                          <td style={css.tdR}>{fmtW(r.supply_amt)}</td>
                          <td style={css.tdR}>{fmtW(r.tax_amt)}</td>
                          <td style={css.tdR}><span style={{fontWeight:700,color:C.accent}}>{fmtW(r.total_amt)}</span></td>
                          <td style={{...css.td,fontSize:10,fontFamily:"monospace",color:C.muted}}>{(r.approval_no||"").slice(0,16)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr>
                      <td colSpan={4} style={{...css.td,fontWeight:700,textAlign:"right",fontSize:12}}>합계</td>
                      <td style={{...css.tdR,fontWeight:800,color:C.green}}>{fmtW(totalSupply)}</td>
                      <td style={{...css.tdR,fontWeight:800,color:C.yellow}}>{fmtW(totalTax)}</td>
                      <td style={{...css.tdR,fontWeight:800,color:C.accent}}>{fmtW(totalSupply+totalTax)}</td>
                      <td style={css.td}></td>
                    </tr></tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
