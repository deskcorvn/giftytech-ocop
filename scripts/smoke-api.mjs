const baseUrl = process.env.OCOP_API_BASE_URL ?? "http://localhost:3000";
const username = process.env.OCOP_SMOKE_USERNAME;
const password = process.env.OCOP_SMOKE_PASSWORD;

async function assertResponse(response, label) {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) throw new Error(`${label} failed: ${response.status} ${JSON.stringify(body)}`);
  return { body, cookie: response.headers.get("set-cookie") };
}

await assertResponse(await fetch(`${baseUrl}/api/health`), "health");
if (!username || !password) {
  console.log("Health smoke passed. Set OCOP_SMOKE_USERNAME and OCOP_SMOKE_PASSWORD for authenticated checks.");
  process.exit(0);
}

const login = await assertResponse(await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username, password }),
}), "login");
const cookie = login.cookie?.split(";")[0];
if (!cookie) throw new Error("Login did not return a session cookie.");
await assertResponse(await fetch(`${baseUrl}/api/ocop/me`, { headers: { cookie } }), "me");
await assertResponse(await fetch(`${baseUrl}/api/ocop/journey`, { headers: { cookie } }), "journey");
console.log("Authenticated OCOP API smoke passed.");
