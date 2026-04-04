// Supabase Edge Function — 이카운트 API CORS 프록시
// 배포: npx supabase functions deploy ecount-proxy

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    const { path, session_id, payload } = await req.json();

    if (!path) {
      return new Response(JSON.stringify({ error: "path 필드 필요" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const ecountUrl = "https://oapi.ecounterp.com" + path;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session_id) headers["SESSION_ID"] = session_id;

    const ecountRes = await fetch(ecountUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload ?? {}),
    });

    const text = await ecountRes.text();
    // 항상 200 반환 — ECount 에러는 body의 Status 필드로 구분
    return new Response(text, {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
