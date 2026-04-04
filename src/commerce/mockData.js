// =====================================================================
// TODO[MOCK] 이 파일 전체를 삭제하고 실제 API 호출로 교체하세요
//   - 쿠팡 Wing API: https://developers.coupang.com
//   - 네이버 커머스 API: https://apicenter.commerce.naver.com
// =====================================================================

export const MOCK_PRODUCTS = [
  { id:"cp001", sku:"24150-K", name:"콩쑥개떡 32개입", category:"떡류", channel:"쿠팡", selling_price:18900, cost_price:9200, stock:120, min_stock:30, status:"판매중", image_url:"", created_at:"2025-01-10" },
  { id:"cp002", sku:"24761-K", name:"옛날찹쌀떡 30개입", category:"떡류", channel:"쿠팡", selling_price:15900, cost_price:7800, stock:85, min_stock:30, status:"판매중", image_url:"", created_at:"2025-01-10" },
  { id:"cp003", sku:"24150-N", name:"콩쑥개떡 32개입", category:"떡류", channel:"스마트스토어", selling_price:19500, cost_price:9200, stock:120, min_stock:20, status:"판매중", image_url:"", created_at:"2025-01-15" },
  { id:"cp004", sku:"240945-K", name:"쑥버무리(3팩)", category:"떡류", channel:"쿠팡", selling_price:13900, cost_price:6500, stock:200, min_stock:50, status:"판매중", image_url:"", created_at:"2025-02-01" },
  { id:"cp005", sku:"331523-N", name:"제주쑥인절미", category:"인절미", channel:"스마트스토어", selling_price:14500, cost_price:6800, stock:15, min_stock:20, status:"재고부족", image_url:"", created_at:"2025-02-10" },
  { id:"cp006", sku:"24152-N", name:"흑임자인절미", category:"인절미", channel:"스마트스토어", selling_price:16900, cost_price:8200, stock:0, min_stock:20, status:"품절", image_url:"", created_at:"2025-02-15" },
  { id:"cp007", sku:"24697-K", name:"벚꽃찹쌀떡", category:"찹쌀떡", channel:"쿠팡", selling_price:12900, cost_price:6100, stock:45, min_stock:30, status:"판매중", image_url:"", created_at:"2025-03-01" },
  { id:"cp008", sku:"208382-H", name:"오색꽃떡국떡", category:"떡국떡", channel:"홈쇼핑", selling_price:22000, cost_price:10500, stock:300, min_stock:100, status:"판매중", image_url:"", created_at:"2025-03-05" },
];

export const MOCK_ORDERS = [
  { id:"ord001", order_no:"K-20250328-001", channel:"쿠팡", product_name:"콩쑥개떡 32개입", sku:"24150-K", qty:3, unit_price:18900, total:56700, status:"배송중", buyer:"홍길동", address:"서울 강남구", ordered_at:"2025-03-28 09:12" },
  { id:"ord002", order_no:"K-20250328-002", channel:"쿠팡", product_name:"옛날찹쌀떡 30개입", sku:"24761-K", qty:2, unit_price:15900, total:31800, status:"배송완료", buyer:"김철수", address:"경기 성남시", ordered_at:"2025-03-28 10:35" },
  { id:"ord003", order_no:"N-20250328-001", channel:"스마트스토어", product_name:"콩쑥개떡 32개입", sku:"24150-N", qty:1, unit_price:19500, total:19500, status:"신규", buyer:"이영희", address:"부산 해운대구", ordered_at:"2025-03-28 11:02" },
  { id:"ord004", order_no:"K-20250328-003", channel:"쿠팡", product_name:"쑥버무리(3팩)", sku:"240945-K", qty:5, unit_price:13900, total:69500, status:"신규", buyer:"박지성", address:"인천 남동구", ordered_at:"2025-03-28 11:47" },
  { id:"ord005", order_no:"N-20250328-002", channel:"스마트스토어", product_name:"제주쑥인절미", sku:"331523-N", qty:2, unit_price:14500, total:29000, status:"취소", buyer:"최민준", address:"대구 수성구", ordered_at:"2025-03-27 14:20" },
  { id:"ord006", order_no:"K-20250327-001", channel:"쿠팡", product_name:"벚꽃찹쌀떡", sku:"24697-K", qty:4, unit_price:12900, total:51600, status:"배송완료", buyer:"정수연", address:"광주 서구", ordered_at:"2025-03-27 08:55" },
  { id:"ord007", order_no:"K-20250327-002", channel:"쿠팡", product_name:"콩쑥개떡 32개입", sku:"24150-K", qty:2, unit_price:18900, total:37800, status:"배송완료", buyer:"강민호", address:"서울 마포구", ordered_at:"2025-03-27 13:10" },
  { id:"ord008", order_no:"H-20250326-001", channel:"홈쇼핑", product_name:"오색꽃떡국떡", sku:"208382-H", qty:10, unit_price:22000, total:220000, status:"배송완료", buyer:"오세훈", address:"서울 종로구", ordered_at:"2025-03-26 20:00" },
];

// TODO[MOCK] 아래 상수들은 실제 API 연동 시 삭제 불필요 (그대로 유지)
export const CHANNELS = ["전체","쿠팡","스마트스토어","홈쇼핑"];
export const CATEGORIES = ["떡류","인절미","찹쌀떡","떡국떡","기타"];
export const ORDER_STATUSES = ["신규","준비중","배송중","배송완료","취소","반품"];
export const PRODUCT_STATUSES = ["판매중","일시중지","품절","재고부족"];
