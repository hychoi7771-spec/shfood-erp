import { useState, useMemo, useEffect, useCallback } from "react";
import { DB } from "./lib/supabase";
import { C, css, fmtW } from "./lib/styles";
import { ROLES, NAV, SAMPLE_SALES, SAMPLE_INV, SAMPLE_EXP } from "./lib/config";

import LoginScreen from "./components/LoginScreen";
import Spinner from "./components/Spinner";
import Dashboard from "./components/Dashboard";
import SalesPage from "./components/SalesPage";
import SettlementPage from "./components/SettlementPage";
import InventoryPage from "./components/InventoryPage";
import CustomersPage from "./components/CustomersPage";
import ProductsPage from "./components/ProductsPage";
import PLStatement from "./components/PLStatement";
import { BalanceSheet, CashFlow, VATReport, MonthlyClosing } from "./components/FinancePages";
import ChannelAnalysis from "./components/ChannelAnalysis";
import AIPage from "./components/AIPage";
import UsersPage from "./components/UsersPage";
import PurchaseOrdersPage from "./components/PurchaseOrdersPage";
import ECountSyncPage from "./components/ECountSyncPage";
import HometaxPage from "./components/HometaxPage";

// Commerce 모듈
import CommerceProductsPage from "./commerce/CommerceProductsPage";
import CommerceOrdersPage from "./commerce/CommerceOrdersPage";
import CommerceInventoryPage from "./commerce/CommerceInventoryPage";
import CommerceDashboard from "./commerce/CommerceDashboard";

export default function SHFoodERP() {
  const [currentUser, setCurrentUser] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("shfood_session")); } catch { return null; }
  });
  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;
  return <ERPMain currentUser={currentUser} onLogout={()=>{ localStorage.removeItem("shfood_session"); setCurrentUser(null); }} />;
}

function ERPMain({ currentUser, onLogout }) {
  const allowed = ROLES[currentUser.role]?.menus || [];
  const [page, setPage] = useState("dashboard");
  const [sideOpen, setSideOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [finPeriod, setFinPeriod] = useState({year:"2025",startMonth:"01",endMonth:"03"});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingData(true);
      try {
        const [s, inv, exp] = await Promise.all([DB.getSales(), DB.getInventory(), DB.getExpenses()]);
        const salesWithItems = await Promise.all(s.map(async sale => {
          const items = await DB.getSaleItems(sale.id);
          return { ...sale, items, totalAmount: sale.total_amount, vat: sale.vat, grandTotal: sale.grand_total, costAmount: sale.cost_amount, collected: sale.collected || 0 };
        }));
        setSales(salesWithItems);
        setInventory(inv.map(i=>({...i, productCode:i.product_code, productName:i.product_name, minStock:i.min_stock})));
        setExpenses(exp.map(e=>({...e, amount:Number(e.amount)})));
      } catch {
        setDbError(true);
        setSales(SAMPLE_SALES);
        setInventory(SAMPLE_INV);
        setExpenses(SAMPLE_EXP);
      }
      setLoadingData(false);
    })();
  }, []);

  const stats = useMemo(()=>{
    const totalSales=sales.reduce((s,r)=>s+(r.totalAmount||r.total_amount||0),0);
    const totalGrand=sales.reduce((s,r)=>s+(r.grandTotal||r.grand_total||0),0);
    const collected=sales.reduce((s,r)=>{
      const gt=r.grandTotal||r.grand_total||0;
      if(r.status==="수금완료") return s+gt;
      if(r.status==="부분수금") return s+(r.collected||0);
      return s;
    },0);
    const receivable=totalGrand-collected;
    const lowStock=inventory.filter(i=>i.stock<=(i.minStock||i.min_stock||0)).length;
    const monthSales=sales.filter(r=>r.date?.startsWith("2025-03")).reduce((s,r)=>s+(r.totalAmount||r.total_amount||0),0);
    return {totalSales,totalGrand,collected,receivable,lowStock,monthSales};
  },[sales,inventory]);

  const role = ROLES[currentUser.role];

  // NAV에 커머스 항목 추가 (동적)
  const ALL_NAV = [
    ...NAV,
    {id:"commerce-dashboard", label:"커머스 대시보드", icon:"🛍️", group:"커머스"},
    {id:"commerce-products",  label:"상품 등록/관리",  icon:"📦", group:"커머스"},
    {id:"commerce-orders",    label:"주문 관리",       icon:"📋", group:"커머스"},
    {id:"commerce-inventory", label:"재고 현황",       icon:"📊", group:"커머스"},
  ];

  const ALL_GROUPS = ["운영","재무","분석","연동","커머스","관리"];
  const groups = ALL_GROUPS.filter(g=>
    ALL_NAV.filter(n=>n.group===g).some(n=>
      allowed.includes(n.id) || n.group==="커머스"
    )
  );

  const goPage = (id) => { setPage(id); setSideOpen(false); setShowUserMenu(false); };

  const addSale = useCallback(async (sale) => {
    const row = { id:sale.id, date:sale.date, customer:sale.customer, channel:sale.channel,
      total_amount:sale.totalAmount, vat:sale.vat, grand_total:sale.grandTotal,
      cost_amount:sale.costAmount, status:"미수", memo:sale.memo, created_by:currentUser.id };
    try {
      await DB.addSale(row);
      await DB.addSaleItems(sale.items.map(i=>({ sale_id:sale.id, product_code:i.productCode, product_name:i.productName, qty:i.qty, unit_price:i.unitPrice, amount:i.amount })));
      for (const item of sale.items) {
        const inv = inventory.find(i=>(i.productCode||i.product_code)===item.productCode);
        if (inv) await DB.updateStock(item.productCode, (inv.stock||0) - item.qty);
      }
    } catch { /* fallback */ }
    setSales(prev=>[...prev, { ...sale, items:sale.items }]);
    setInventory(prev=>prev.map(i=>{
      const item=sale.items.find(s=>s.productCode===(i.productCode||i.product_code));
      return item?{...i,stock:i.stock-item.qty}:i;
    }));
  },[inventory,currentUser.id]);

  const collectSale = useCallback(async (customer) => {
    try {
      const targets = sales.filter(s=>s.customer===customer&&s.status!=="수금완료");
      for (const s of targets) await DB.updateSale(s.id, {status:"수금완료"});
    } catch { /* fallback */ }
    setSales(prev=>prev.map(s=>s.customer===customer&&s.status!=="수금완료"?{...s,status:"수금완료"}:s));
  },[sales]);

  const updateStock = useCallback(async (productCode, stock) => {
    try { await DB.updateStock(productCode, stock); } catch { /* fallback */ }
    setInventory(prev=>prev.map(i=>(i.productCode||i.product_code)===productCode?{...i,stock}:i));
  },[]);

  const addExpense = useCallback(async (exp) => {
    try { await DB.addExpense(exp); } catch { /* fallback */ }
    setExpenses(prev=>[...prev,{...exp,amount:Number(exp.amount)}]);
  },[]);

  const Sidebar = ()=>(
    <div style={{width:224,background:C.card,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"18px 20px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:C.accent}}>㈜에스에이치푸드</div>
          <div style={{fontSize:10,color:C.muted,marginTop:2}}>통합 ERP {dbError?"(오프라인)":"(DB 연결됨)"}</div>
        </div>
        {isMobile&&<button onClick={()=>setSideOpen(false)} style={{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>✕</button>}
      </div>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,position:"relative"}}>
        <div onClick={()=>setShowUserMenu(p=>!p)} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"6px 8px",borderRadius:8,background:`${role.color}11`}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:role.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff",flexShrink:0}}>
            {currentUser.name[0]}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text}}>{currentUser.name}</div>
            <div style={{fontSize:10,color:role.color,fontWeight:600}}>{role.label} · {currentUser.dept}</div>
          </div>
          <span style={{fontSize:10,color:C.muted}}>▾</span>
        </div>
        {showUserMenu&&(
          <div style={{position:"absolute",left:12,right:12,top:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:8,zIndex:200,padding:4}}>
            <div style={{padding:"8px 12px",fontSize:11,color:C.muted}}>로그인: {new Date(currentUser.loginAt).toLocaleString("ko-KR")}</div>
            <div onClick={onLogout} style={{padding:"8px 12px",fontSize:13,color:C.red,cursor:"pointer",borderRadius:6,fontWeight:600}}>🚪 로그아웃</div>
          </div>
        )}
      </div>
      <nav style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
        {groups.map(g=>(
          <div key={g}>
            <div style={{padding:"10px 20px 3px",fontSize:10,fontWeight:700,color:g==="커머스"?C.cyan:C.muted,textTransform:"uppercase",letterSpacing:1}}>{g}</div>
            {ALL_NAV.filter(n=>n.group===g&&(allowed.includes(n.id)||n.group==="커머스")).map(n=>(
              <div key={n.id} onClick={()=>goPage(n.id)}
                style={{padding:"9px 20px",cursor:"pointer",display:"flex",alignItems:"center",gap:9,fontSize:13,
                  fontWeight:page===n.id?700:400,background:page===n.id?`${C.accent}22`:"transparent",
                  color:page===n.id?C.accent:C.text,borderLeft:page===n.id?`3px solid ${C.accent}`:"3px solid transparent",transition:"all .12s"}}>
                <span style={{fontSize:14}}>{n.icon}</span>{n.label}
              </div>
            ))}
          </div>
        ))}
      </nav>
      <div style={{padding:"10px 20px",borderTop:`1px solid ${C.border}`,fontSize:10,color:C.muted}}>
        {dbError ? "⚠️ DB 미연결 (데모모드)" : "✅ Supabase 연결됨"}
      </div>
    </div>
  );

  if (loadingData) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Pretendard','Malgun Gothic',sans-serif"}}>
      <Spinner text="데이터 불러오는 중..." />
    </div>
  );

  const curNav = ALL_NAV.find(n=>n.id===page);

  return (
    <div style={{display:"flex",minHeight:"100vh",background:C.bg,fontFamily:"'Pretendard','Malgun Gothic',sans-serif",color:C.text}} onClick={()=>setShowUserMenu(false)}>
      {!isMobile&&(
        <div style={{width:224,flexShrink:0}}>
          <div style={{position:"fixed",top:0,left:0,width:224,height:"100vh",zIndex:100}}><Sidebar/></div>
        </div>
      )}
      {isMobile&&sideOpen&&(
        <>
          <div onClick={()=>setSideOpen(false)} style={{position:"fixed",inset:0,background:"#000a",zIndex:150}}/>
          <div style={{position:"fixed",top:0,left:0,width:240,height:"100vh",zIndex:200}}><Sidebar/></div>
        </>
      )}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        {isMobile&&(
          <div style={{position:"sticky",top:0,zIndex:100,background:C.card,borderBottom:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>setSideOpen(true)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",color:C.text,fontSize:16}}>☰</button>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.accent}}>㈜에스에이치푸드 ERP</div>
              <div style={{fontSize:11,color:C.muted}}>{curNav?.icon} {curNav?.label}</div>
            </div>
            <div style={{width:30,height:30,borderRadius:"50%",background:role.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff"}}>
              {currentUser.name[0]}
            </div>
          </div>
        )}
        <div style={{flex:1,padding:isMobile?16:24,overflowY:"auto"}}>
          {/* ERP 페이지 */}
          {page==="dashboard"        && <Dashboard stats={stats} sales={sales} inventory={inventory} setPage={goPage} isMobile={isMobile}/>}
          {page==="sales"            && <SalesPage sales={sales} inventory={inventory} onAddSale={addSale}/>}
          {page==="settlement"       && <SettlementPage sales={sales} onCollect={collectSale}/>}
          {page==="inventory"        && <InventoryPage inventory={inventory} onUpdateStock={updateStock}/>}
          {page==="customers"        && <CustomersPage/>}
          {page==="products"         && <ProductsPage/>}
          {page==="pl"               && <PLStatement sales={sales} expenses={expenses} onAddExpense={addExpense} period={finPeriod} setPeriod={setFinPeriod}/>}
          {page==="bs"               && <BalanceSheet sales={sales} expenses={expenses} period={finPeriod} setPeriod={setFinPeriod}/>}
          {page==="cashflow"         && <CashFlow sales={sales} period={finPeriod} setPeriod={setFinPeriod}/>}
          {page==="vat"              && <VATReport sales={sales} period={finPeriod} setPeriod={setFinPeriod}/>}
          {page==="closing"          && <MonthlyClosing sales={sales} expenses={expenses}/>}
          {page==="channel"          && <ChannelAnalysis sales={sales} period={finPeriod} setPeriod={setFinPeriod}/>}
          {page==="ai"               && <AIPage sales={sales} inventory={inventory} stats={stats}/>}
          {page==="purchase"         && <PurchaseOrdersPage currentUser={currentUser}/>}
          {page==="ecount"           && <ECountSyncPage />}
          {page==="hometax"          && <HometaxPage />}
          {page==="users"            && allowed.includes("users") && <UsersPage/>}
          {/* 커머스 페이지 */}
          {page==="commerce-dashboard"  && <CommerceDashboard/>}
          {page==="commerce-products"   && <CommerceProductsPage/>}
          {page==="commerce-orders"     && <CommerceOrdersPage/>}
          {page==="commerce-inventory"  && <CommerceInventoryPage/>}
        </div>
        {isMobile&&(
          <div style={{position:"sticky",bottom:0,background:C.card,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100}}>
            {[{id:"dashboard",icon:"📊",label:"홈"},{id:"sales",icon:"📋",label:"매출"},{id:"settlement",icon:"💰",label:"정산"},{id:"inventory",icon:"📦",label:"재고"},{id:"ai",icon:"🤖",label:"AI"}]
              .filter(t=>allowed.includes(t.id)).map(t=>(
              <div key={t.id} onClick={()=>goPage(t.id)}
                style={{flex:1,padding:"10px 4px",textAlign:"center",cursor:"pointer",color:page===t.id?C.accent:C.muted,borderTop:page===t.id?`2px solid ${C.accent}`:"2px solid transparent"}}>
                <div style={{fontSize:18}}>{t.icon}</div>
                <div style={{fontSize:10,fontWeight:page===t.id?700:400,marginTop:2}}>{t.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
