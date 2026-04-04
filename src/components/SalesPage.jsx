import { useState, useEffect, useRef } from "react";
import { DB } from "../lib/supabase";
import { C, css, fmt, fmtW, todayStr, genId } from "../lib/styles";
import { StatusBadge } from "./Common";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY;

async function ocrTaxInvoice(file) {
  if (!ANTHROPIC_KEY) throw new Error("VITE_ANTHROPIC_KEY가 .env에 설정되지 않았습니다");
  const base64 = await new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result.split(",")[1]);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
  const prompt = `이 세금계산서에서 다음 정보를 추출해 JSON으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.
{
  "date": "작성일자 YYYY-MM-DD 형식 (없으면 오늘)",
  "buyer_name": "공급받는자(매수인) 상호명",
  "channel": "다음 중 하나: B2B, 스마트스토어, 쿠팡, 홈쇼핑, 기타",
  "items": [
    { "product_name": "품목명", "qty": 수량(숫자), "unit_price": 단가(숫자), "amount": 공급가액(숫자) }
  ]
}
숫자는 콤마 없이 순수 숫자로. 품목이 없으면 빈 배열.`;
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
        { type: "image", source: { type: "base64", media_type: file.type || "image/jpeg", data: base64 } },
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

const CUSTOMERS_LIST=["(주)다크호스","(주)공영홈쇼핑","쿠팡(주)","스마트스토어","(주)편한사람들","(주)엔에스쇼핑","농업회사법인 블루밍그린 주식회사","주식회사 욜로그룹","(주)엘에이치케어","하루앤컴퍼니","주식회사 온휴컴퍼니","주식회사 한경어게인","네오포텐","주식회사 케이엔541","후후커머스","주식회사 태범프레시"];
const PRODUCTS_LIST=[{code:"24150",name:"콩쑥개떡 32개입",spec:"1.92kg"},{code:"24761",name:"옛날찹쌀떡 30개입",spec:"1.8kg"},{code:"24152",name:"흑임자인절미",spec:"750g"},{code:"208382",name:"오색꽃떡국떡",spec:"500g"},{code:"240945",name:"쑥버무리(3팩)",spec:"250g*3"},{code:"24697",name:"벚꽃찹쌀떡",spec:"420g"},{code:"331523",name:"제주쑥인절미",spec:"1kg"},{code:"332889",name:"콩인절미",spec:"1kg"},{code:"쿠팡0003",name:"옛날찹쌀떡 30개입(쿠팡)",spec:"1.8kg"},{code:"쿠팡0004",name:"할매손맛약밥(쿠팡)",spec:"600g"},{code:"쿠팡0005",name:"탱글쫄우동4팩(쿠팡)",spec:"256g*4"},{code:"24154",name:"강낭콩쑥개떡 1박스",spec:"1.92kg"},{code:"65421",name:"꿀떡 1kg",spec:"1kg"},{code:"65422",name:"바람떡",spec:"1kg"},{code:"64823",name:"카스테라경단",spec:"750g"},{code:"64824",name:"단호박인절미",spec:"750g"}];

export default function SalesPage({sales,inventory,onAddSale}){
  const [showForm,setShowForm]=useState(false);
  const [filter,setFilter]=useState({customer:"",month:""});
  const filtered=sales.filter(s=>{
    if(filter.customer&&!s.customer.includes(filter.customer)) return false;
    if(filter.month&&!s.date?.startsWith(filter.month)) return false;
    return true;
  });
  const totals=filtered.reduce((a,s)=>({amount:a.amount+(s.totalAmount||s.total_amount||0),vat:a.vat+(s.vat||0),grand:a.grand+(s.grandTotal||s.grand_total||0)}),{amount:0,vat:0,grand:0});
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:800}}>매출전표</h2>
        <button style={css.btn(C.green)} onClick={()=>setShowForm(true)}>+ 매출 입력</button>
      </div>
      <div style={{...css.card,marginBottom:14,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <input style={{...css.input,width:180}} placeholder="거래처 검색" value={filter.customer} onChange={e=>setFilter(f=>({...f,customer:e.target.value}))}/>
        <input type="month" style={{...css.input,width:140}} value={filter.month} onChange={e=>setFilter(f=>({...f,month:e.target.value}))}/>
        <button style={css.btn(C.muted,true)} onClick={()=>setFilter({customer:"",month:""})}>초기화</button>
        <div style={{marginLeft:"auto",fontSize:12,color:C.muted}}>합계: <b style={{color:C.accent}}>{fmtW(totals.grand)}</b></div>
      </div>
      <div style={{...css.card,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
          <thead><tr>
            <th style={css.th}>날짜</th><th style={css.th}>거래처</th><th style={css.th}>채널</th>
            <th style={css.thR}>공급가</th><th style={css.thR}>부가세</th><th style={css.thR}>합계</th>
            <th style={css.th}>상태</th>
          </tr></thead>
          <tbody>
            {filtered.length===0?<tr><td colSpan={7} style={{...css.td,textAlign:"center",color:C.muted,padding:32}}>데이터 없음</td></tr>
              :filtered.map(s=>(
              <tr key={s.id}>
                <td style={{...css.td,fontSize:12}}>{s.date}</td>
                <td style={{...css.td,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.customer}</td>
                <td style={css.td}><span style={css.badge(s.channel==="쿠팡"?C.yellow:s.channel==="홈쇼핑"?C.purple:s.channel==="스마트스토어"?C.green:C.accent)}>{s.channel||"B2B"}</span></td>
                <td style={css.tdR}>{fmtW(s.totalAmount||s.total_amount||0)}</td>
                <td style={{...css.tdR,color:C.muted}}>{fmtW(s.vat||0)}</td>
                <td style={{...css.tdR,fontWeight:700}}>{fmtW(s.grandTotal||s.grand_total||0)}</td>
                <td style={css.td}><StatusBadge status={s.status}/></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr style={{background:`${C.accent}11`}}>
            <td colSpan={3} style={{...css.td,fontWeight:700}}>합계 ({filtered.length}건)</td>
            <td style={{...css.tdR,fontWeight:700}}>{fmtW(totals.amount)}</td>
            <td style={{...css.tdR,color:C.muted,fontWeight:700}}>{fmtW(totals.vat)}</td>
            <td style={{...css.tdR,fontWeight:800,color:C.accent,fontSize:15}}>{fmtW(totals.grand)}</td>
            <td/>
          </tr></tfoot>
        </table>
      </div>
      {showForm&&<SaleForm onClose={()=>setShowForm(false)} onSave={async(s)=>{ await onAddSale(s); setShowForm(false); }}/>}
    </div>
  );
}

function SaleForm({onClose,onSave}){
  const [date,setDate]=useState(todayStr());
  const [customer,setCustomer]=useState("");
  const [channel,setChannel]=useState("B2B");
  const [memo,setMemo]=useState("");
  const [items,setItems]=useState([{productCode:"",productName:"",qty:1,unitPrice:0,amount:0}]);
  const [saving,setSaving]=useState(false);
  const [custSearch,setCustSearch]=useState("");
  const [showCustDrop,setShowCustDrop]=useState(false);
  const [dbCustomers,setDbCustomers]=useState([]);
  const [dbProducts,setDbProducts]=useState([]);
  const [dbSps,setDbSps]=useState([]);
  const [loadingDb,setLoadingDb]=useState(true);
  const [ocrLoading,setOcrLoading]=useState(false);
  const [ocrPreview,setOcrPreview]=useState(null);
  const fileInputRef=useRef();

  const handleOCR = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrPreview(URL.createObjectURL(file));
    setOcrLoading(true);
    try {
      const result = await ocrTaxInvoice(file);
      if (result.date)       setDate(result.date);
      if (result.channel)    setChannel(result.channel);
      if (result.buyer_name) { setCustomer(result.buyer_name); setCustSearch(result.buyer_name); }
      if (result.items?.length) {
        setItems(result.items.map(it => ({
          productCode: "",
          productName: it.product_name || "",
          qty:         Number(it.qty)        || 1,
          unitPrice:   Number(it.unit_price) || 0,
          amount:      Number(it.amount)     || (Number(it.qty||1) * Number(it.unit_price||0)),
        })));
      }
    } catch(err) {
      alert("OCR 실패: " + err.message);
    }
    setOcrLoading(false);
    e.target.value = "";
  };

  useEffect(()=>{
    Promise.all([DB.getCustomers(),DB.getProducts(),DB.getSpecialPrices()])
      .then(([c,p,sp])=>{ setDbCustomers(c); setDbProducts(p); setDbSps(sp); })
      .catch(()=>{ setDbCustomers(CUSTOMERS_LIST.map(n=>({name:n,code:n}))); setDbProducts(PRODUCTS_LIST.map(p=>({...p,code:p.code,name:p.name}))); })
      .finally(()=>setLoadingDb(false));
  },[]);

  const filteredC=custSearch.length>=1
    ? dbCustomers.filter(c=>c.name?.includes(custSearch)||c.code?.includes(custSearch)).slice(0,8)
    : [];

  const lookupSpecialPrice=(custName,productCode)=>{
    const sp=dbSps.find(s=>s.product_code===productCode&&s.customer_name===custName);
    return sp?sp.price:null;
  };

  const handleCustomerSelect=(custName)=>{
    setCustomer(custName); setCustSearch(custName); setShowCustDrop(false);
    setItems(prev=>prev.map(item=>{
      if(!item.productCode) return item;
      const sp=dbSps.find(s=>s.product_code===item.productCode&&s.customer_name===custName);
      if(sp) return {...item,unitPrice:sp.price,amount:(Number(item.qty)||1)*sp.price};
      return item;
    }));
  };

  const updateItem=(idx,field,value)=>{
    setItems(prev=>{
      const next=[...prev];
      next[idx]={...next[idx],[field]:value};
      if(field==="productCode"){
        const p=dbProducts.find(p=>p.code===value);
        if(p){ next[idx].productName=p.name; }
        if(customer){
          const sp=lookupSpecialPrice(customer,value);
          if(sp){ next[idx].unitPrice=sp; next[idx].amount=(Number(next[idx].qty)||1)*sp; }
        }
      }
      if(field==="qty"||field==="unitPrice") next[idx].amount=(Number(next[idx].qty)||0)*(Number(next[idx].unitPrice)||0);
      return next;
    });
  };

  const totalAmount=items.reduce((s,i)=>s+(i.amount||0),0);
  const vat=Math.round(totalAmount*0.1);
  const grandTotal=totalAmount+vat;

  const handleSave=async()=>{
    if(!customer) return alert("거래처를 선택하세요");
    if(items.some(i=>!i.productCode)) return alert("품목을 선택하세요");
    setSaving(true);
    await onSave({id:genId(),date,customer,channel,memo,items,totalAmount,vat,grandTotal,costAmount:Math.round(totalAmount*0.6)});
    setSaving(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#000a",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:16}} onClick={()=>setShowCustDrop(false)}>
      <div style={{...css.card,width:"100%",maxWidth:720,maxHeight:"92vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0}}>매출전표 입력 {loadingDb&&<span style={{fontSize:11,color:C.muted,fontWeight:400}}>DB 로딩중...</span>}</h3>
          <button style={css.btn(C.muted,true)} onClick={()=>{setOcrPreview(null);onClose();}}>✕</button>
        </div>

        {/* OCR 세금계산서 업로드 */}
        <div style={{marginBottom:14,padding:10,background:`${C.cyan}11`,border:`1px solid ${C.cyan}33`,borderRadius:8}}>
          <div style={{fontSize:11,fontWeight:700,color:C.cyan,marginBottom:6}}>📷 세금계산서 OCR 자동입력</div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleOCR}/>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <button style={{...css.btn(C.cyan),fontSize:11}} onClick={()=>fileInputRef.current.click()} disabled={ocrLoading}>
              {ocrLoading?"⏳ 분석 중...":"📎 세금계산서 업로드"}
            </button>
            {!ANTHROPIC_KEY&&<span style={{fontSize:10,color:C.red}}>⚠️ VITE_ANTHROPIC_KEY 필요</span>}
            {ocrLoading&&<span style={{fontSize:10,color:C.cyan}}>AI가 세금계산서를 분석 중...</span>}
          </div>
          {ocrPreview&&!ocrLoading&&(
            <div style={{marginTop:6,display:"flex",alignItems:"center",gap:6}}>
              <img src={ocrPreview} alt="세금계산서" style={{height:48,borderRadius:4,border:`1px solid ${C.border}`,objectFit:"cover"}}/>
              <span style={{fontSize:10,color:C.green,fontWeight:700}}>✅ 자동입력 완료 — 내용 확인 후 저장</span>
              <button style={{...css.btn(C.muted,true),fontSize:10}} onClick={()=>setOcrPreview(null)}>✕</button>
            </div>
          )}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
          <div>
            <label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>날짜</label>
            <input type="date" style={css.input} value={date} onChange={e=>setDate(e.target.value)}/>
          </div>
          <div style={{position:"relative"}}>
            <label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>
              거래처 <span style={{color:C.accent,fontSize:10}}>{dbCustomers.length>0?`(${dbCustomers.length}건)`:""}</span>
            </label>
            <input style={css.input} placeholder="거래처 검색..." value={custSearch}
              onChange={e=>{setCustSearch(e.target.value);setCustomer("");setShowCustDrop(true);}}
              onFocus={()=>setShowCustDrop(true)}/>
            {showCustDrop&&filteredC.length>0&&(
              <div style={{position:"absolute",top:"100%",left:0,right:0,background:C.card,border:`1px solid ${C.border}`,borderRadius:8,zIndex:200,maxHeight:200,overflowY:"auto",boxShadow:"0 4px 20px #0006"}}>
                {filteredC.map(c=>(
                  <div key={c.code} style={{padding:"8px 12px",cursor:"pointer",fontSize:12,borderBottom:`1px solid ${C.border}22`}}
                    onMouseDown={()=>handleCustomerSelect(c.name)}>
                    <div style={{fontWeight:600}}>{c.name}</div>
                    <div style={{fontSize:10,color:C.muted}}>{c.code}</div>
                  </div>
                ))}
              </div>
            )}
            {customer&&<div style={{fontSize:10,color:C.green,marginTop:2}}>✓ {customer}</div>}
          </div>
          <div>
            <label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>채널</label>
            <select style={{...css.select,width:"100%"}} value={channel} onChange={e=>setChannel(e.target.value)}>
              <option>B2B</option><option>스마트스토어</option><option>쿠팡</option><option>홈쇼핑</option><option>기타</option>
            </select>
          </div>
        </div>

        {customer&&(
          <div style={{background:`${C.green}11`,border:`1px solid ${C.green}44`,borderRadius:8,padding:"6px 12px",marginBottom:10,fontSize:11,color:C.green}}>
            💡 특별단가 자동 적용됨 — 품목 선택 시 <b>{customer}</b> 거래처 특별단가로 자동 입력됩니다
          </div>
        )}

        <table style={{width:"100%",borderCollapse:"collapse",marginBottom:10}}>
          <thead><tr>
            <th style={css.th}>품목 <span style={{color:C.muted,fontSize:10,fontWeight:400}}>{dbProducts.length>0?`(${dbProducts.length}건)`:""}</span></th>
            <th style={css.th}>수량</th><th style={css.th}>단가</th><th style={css.thR}>금액</th><th/>
          </tr></thead>
          <tbody>{items.map((item,idx)=>{
            const hasSpecialPrice=item.productCode&&customer&&dbSps.find(s=>s.product_code===item.productCode&&s.customer_name===customer);
            return(
            <tr key={idx}>
              <td style={{padding:"5px 8px"}}>
                <select style={{...css.select,width:"100%",fontSize:12}} value={item.productCode} onChange={e=>updateItem(idx,"productCode",e.target.value)}>
                  <option value="">-- 품목 선택 --</option>
                  {dbProducts.map(p=><option key={p.code} value={p.code}>{p.name}{p.spec?` (${p.spec})`:""}</option>)}
                </select>
              </td>
              <td style={{padding:"5px 8px"}}><input type="number" style={{...css.input,width:65}} value={item.qty} onChange={e=>updateItem(idx,"qty",Number(e.target.value))}/></td>
              <td style={{padding:"5px 8px"}}>
                <input type="number" style={{...css.input,width:110,border:hasSpecialPrice?`1px solid ${C.green}88`:undefined}} value={item.unitPrice} onChange={e=>updateItem(idx,"unitPrice",Number(e.target.value))}/>
                {hasSpecialPrice&&<div style={{fontSize:9,color:C.green,marginTop:1}}>★ 특별단가</div>}
              </td>
              <td style={{...css.tdR,fontWeight:600}}>{fmtW(item.amount)}</td>
              <td style={{padding:"5px 8px"}}>{items.length>1&&<button style={css.btn(C.red,true)} onClick={()=>setItems(p=>p.filter((_,i)=>i!==idx))}>✕</button>}</td>
            </tr>
            );
          })}</tbody>
        </table>
        <button style={{...css.btn(C.accent,true),marginBottom:12}} onClick={()=>setItems(p=>[...p,{productCode:"",productName:"",qty:1,unitPrice:0,amount:0}])}>+ 품목 추가</button>
        <div style={{background:`${C.accent}11`,borderRadius:8,padding:14,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:C.muted}}>공급가액</span><b>{fmtW(totalAmount)}</b></div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:C.muted}}>부가세 (10%)</span><span>{fmtW(vat)}</span></div>
          <div style={{display:"flex",justifyContent:"space-between",borderTop:`1px solid ${C.border}`,paddingTop:8}}><b>합계</b><b style={{fontSize:18,color:C.accent}}>{fmtW(grandTotal)}</b></div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:12,color:C.muted,display:"block",marginBottom:3}}>메모</label>
          <input style={css.input} value={memo} onChange={e=>setMemo(e.target.value)} placeholder="메모..."/>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button style={css.btn(C.muted)} onClick={onClose}>취소</button>
          <button style={css.btn(C.green)} onClick={handleSave} disabled={saving}>{saving?"저장중...":"저장 (DB)"}</button>
        </div>
      </div>
    </div>
  );
}
