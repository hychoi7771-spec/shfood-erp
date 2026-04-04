// ===================== Supabase 설정 =====================
// .env 파일에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 를 설정하세요
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export async function sb(table, method = "GET", body = null, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    "Prefer": method === "POST" ? "return=representation" : "",
  };
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export const DB = {
  // 직원
  getUsers:    ()            => sb("users", "GET", null, "?order=created_at"),
  addUser:     (u)           => sb("users", "POST", u),
  updateUser:  (id, u)       => sb(`users?id=eq.${id}`, "PATCH", u),
  deleteUser:  (id)          => sb(`users?id=eq.${id}`, "DELETE"),

  // 매출
  getSales:    ()            => sb("sales", "GET", null, "?order=date.desc"),
  getSaleItems:(saleId)      => sb("sale_items", "GET", null, `?sale_id=eq.${saleId}`),
  addSale:     (s)           => sb("sales", "POST", s),
  addSaleItems:(items)       => sb("sale_items", "POST", items),
  updateSale:  (id, s)       => sb(`sales?id=eq.${id}`, "PATCH", s),
  deleteSale:  (id)          => sb(`sales?id=eq.${id}`, "DELETE"),

  // 재고
  getInventory:()            => sb("inventory", "GET", null, "?order=product_name"),
  updateStock: (code, stock) => sb(`inventory?product_code=eq.${encodeURIComponent(code)}`, "PATCH", { stock, updated_at: new Date().toISOString() }),

  // 비용
  getExpenses: ()            => sb("expenses", "GET", null, "?order=month,category"),
  addExpense:  (e)           => sb("expenses", "POST", e),
  deleteExpense:(id)         => sb(`expenses?id=eq.${id}`, "DELETE"),

  // 거래처
  getCustomers:   ()         => sb("customers", "GET", null, "?order=name"),
  addCustomer:    (c)        => sb("customers", "POST", c),
  updateCustomer: (code, c)  => sb(`customers?code=eq.${encodeURIComponent(code)}`, "PATCH", c),
  deleteCustomer: (code)     => sb(`customers?code=eq.${encodeURIComponent(code)}`, "DELETE"),

  // 품목
  getProducts:    ()         => sb("products", "GET", null, "?order=name"),
  addProduct:     (p)        => sb("products", "POST", p),
  updateProduct:  (code, p)  => sb(`products?code=eq.${encodeURIComponent(code)}`, "PATCH", p),
  deleteProduct:  (code)     => sb(`products?code=eq.${encodeURIComponent(code)}`, "DELETE"),

  // 특별단가
  getSpecialPrices:      ()     => sb("special_prices", "GET", null, "?order=customer_name"),
  getSpecialPricesByProduct:(code) => sb("special_prices", "GET", null, `?product_code=eq.${encodeURIComponent(code)}&order=customer_name`),
  addSpecialPrice:       (sp)   => sb("special_prices", "POST", sp),
  deleteSpecialPrice:    (id)   => sb(`special_prices?id=eq.${id}`, "DELETE"),

  // 발주관리
  getPOs:      ()          => sb("purchase_orders",       "GET",  null, "?order=created_at.desc"),
  getPOItems:  (poId)      => sb("purchase_order_items",  "GET",  null, `?purchase_order_id=eq.${poId}`),
  addPO:       (po)        => sb("purchase_orders",       "POST", po),
  addPOItems:  (items)     => sb("purchase_order_items",  "POST", items),
  updatePO:    (id, po)    => sb(`purchase_orders?id=eq.${id}`, "PATCH", po),
  deletePO:    (id)        => sb(`purchase_orders?id=eq.${id}`, "DELETE"),
};
