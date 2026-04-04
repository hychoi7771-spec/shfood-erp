// ===================== 권한 =====================
export const ROLES = {
  admin:    { label:"관리자",   color:"#a855f7", menus:["dashboard","sales","settlement","inventory","purchase","customers","products","pl","bs","cashflow","vat","closing","channel","ai","ecount","hometax","users"] },
  manager:  { label:"팀장",     color:"#4f8ef7", menus:["dashboard","sales","settlement","inventory","purchase","customers","products","pl","bs","cashflow","vat","closing","channel","ai","ecount","hometax"] },
  sales:    { label:"영업담당", color:"#22c55e", menus:["dashboard","sales","settlement","customers","products"] },
  warehouse:{ label:"물류담당", color:"#eab308", menus:["dashboard","inventory","purchase","products"] },
};

export const NAV=[
  {id:"dashboard", label:"대시보드",   icon:"📊", group:"운영"},
  {id:"sales",     label:"매출전표",   icon:"📋", group:"운영"},
  {id:"settlement",label:"정산·미수금",icon:"💰", group:"운영"},
  {id:"inventory", label:"재고관리",   icon:"📦", group:"운영"},
  {id:"purchase",  label:"발주관리",   icon:"🛒", group:"운영"},
  {id:"customers", label:"거래처",     icon:"🏢", group:"운영"},
  {id:"products",  label:"품목·단가",  icon:"🏷️", group:"운영"},
  {id:"pl",        label:"손익계산서", icon:"📈", group:"재무"},
  {id:"bs",        label:"재무상태표", icon:"🏦", group:"재무"},
  {id:"cashflow",  label:"매출채권",   icon:"💸", group:"재무"},
  {id:"vat",       label:"부가세자료", icon:"🧾", group:"재무"},
  {id:"closing",   label:"월마감·결산",icon:"📅", group:"재무"},
  {id:"channel",   label:"채널별분석", icon:"📡", group:"재무"},
  {id:"ai",        label:"AI 질의",    icon:"🤖", group:"분석"},
  {id:"ecount",    label:"이카운트 연동",icon:"🔄", group:"연동"},
  {id:"hometax",   label:"홈택스 연동", icon:"🏛️", group:"연동"},
  {id:"users",     label:"직원관리",   icon:"👥", group:"관리"},
];

export const MONTHS=["01","02","03","04","05","06","07","08","09","10","11","12"];
export const MONTH_NAMES=["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

// ===================== 샘플 데이터 (DB 미연결 시 fallback) =====================
export const SAMPLE_SALES=[
  {id:"s01",date:"2025-01-05",customer:"(주)다크호스",channel:"B2B",items:[{productCode:"24150",productName:"콩쑥개떡 32개입",qty:20,unitPrice:15000,amount:300000}],totalAmount:300000,vat:30000,grandTotal:330000,costAmount:180000,status:"수금완료",memo:""},
  {id:"s02",date:"2025-02-03",customer:"(주)공영홈쇼핑",channel:"홈쇼핑",items:[{productCode:"24150",productName:"콩쑥개떡 32개입",qty:100,unitPrice:14000,amount:1400000}],totalAmount:1400000,vat:140000,grandTotal:1540000,costAmount:840000,status:"수금완료",memo:""},
  {id:"s03",date:"2025-03-01",customer:"쿠팡(주)",channel:"쿠팡",items:[{productCode:"쿠팡0003",productName:"옛날찹쌀떡 30개입(쿠팡)",qty:80,unitPrice:10031,amount:802480}],totalAmount:802480,vat:80248,grandTotal:882728,costAmount:481488,status:"수금완료",memo:""},
  {id:"s04",date:"2025-03-15",customer:"(주)편한사람들",channel:"B2B",items:[{productCode:"331523",productName:"제주쑥인절미",qty:20,unitPrice:10300,amount:206000}],totalAmount:206000,vat:20600,grandTotal:226600,costAmount:123600,status:"미수",memo:""},
  {id:"s05",date:"2025-03-28",customer:"(주)엔에스쇼핑",channel:"홈쇼핑",items:[{productCode:"240945",productName:"쑥버무리(3팩)",qty:80,unitPrice:11830,amount:946400}],totalAmount:946400,vat:94640,grandTotal:1041040,costAmount:567840,status:"미수",memo:""},
];
export const SAMPLE_INV=[
  {productCode:"24150",productName:"콩쑥개떡 32개입",stock:250,minStock:50},
  {productCode:"24761",productName:"옛날찹쌀떡 30개입",stock:180,minStock:50},
  {productCode:"24152",productName:"흑임자인절미",stock:120,minStock:30},
  {productCode:"208382",productName:"오색꽃떡국떡",stock:300,minStock:100},
  {productCode:"24697",productName:"벚꽃찹쌀떡",stock:45,minStock:50},
  {productCode:"240945",productName:"쑥버무리(3팩)",stock:200,minStock:80},
];
export const SAMPLE_EXP=[
  {id:1,month:"01",category:"인건비",name:"직원급여",amount:3500000},
  {id:2,month:"01",category:"물류비",name:"택배비",amount:420000},
  {id:3,month:"01",category:"임차료",name:"임차료",amount:800000},
  {id:4,month:"02",category:"인건비",name:"직원급여",amount:3500000},
  {id:5,month:"02",category:"물류비",name:"택배비",amount:510000},
  {id:6,month:"02",category:"임차료",name:"임차료",amount:800000},
  {id:7,month:"03",category:"인건비",name:"직원급여",amount:3500000},
  {id:8,month:"03",category:"물류비",name:"택배비",amount:680000},
  {id:9,month:"03",category:"임차료",name:"임차료",amount:800000},
  {id:10,month:"03",category:"광고선전비",name:"온라인 광고",amount:450000},
];
