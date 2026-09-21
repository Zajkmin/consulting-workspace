import { clearSupabaseAuthCallback, isSupabaseSessionReady, parseSupabaseAuthCallback } from "../src/services/supabase/auth-callback.ts";

const tests: Array<{ name: string; run: () => void }> = [
  {
    name: "recovery fragment valid",
    run: () => {
      const parsed = parseSupabaseAuthCallback("https://example.com/auth/set-password#access_token=abc&refresh_token=def&type=recovery");
      if (parsed.kind !== "fragment" || parsed.mode !== "recovery") {
        throw new Error("recovery fragment should parse as recovery");
      }
    },
  },
  {
    name: "invite fragment valid",
    run: () => {
      const parsed = parseSupabaseAuthCallback("https://example.com/auth/set-password#access_token=abc&refresh_token=def&type=invite");
      if (parsed.kind !== "fragment" || parsed.mode !== "invite") {
        throw new Error("invite fragment should parse as invite");
      }
    },
  },
  {
    name: "missing access token",
    run: () => {
      const parsed = parseSupabaseAuthCallback("https://example.com/auth/set-password#refresh_token=def&type=recovery");
      if (parsed.kind !== "invalid-fragment" || parsed.reason !== "missing-access-token") {
        throw new Error("missing access token should be rejected");
      }
    },
  },
  {
    name: "missing refresh token",
    run: () => {
      const parsed = parseSupabaseAuthCallback("https://example.com/auth/set-password#access_token=abc&type=recovery");
      if (parsed.kind !== "invalid-fragment" || parsed.reason !== "missing-refresh-token") {
        throw new Error("missing refresh token should be rejected");
      }
    },
  },
  {
    name: "invalid type",
    run: () => {
      const parsed = parseSupabaseAuthCallback("https://example.com/auth/set-password#access_token=abc&refresh_token=def&type=magiclink");
      if (parsed.kind !== "invalid-fragment" || parsed.reason !== "invalid-auth-type") {
        throw new Error("invalid auth type should be rejected");
      }
    },
  },
  {
    name: "pkce code parsed",
    run: () => {
      const parsed = parseSupabaseAuthCallback("https://example.com/auth/set-password?code=test-code&flow_id=test-flow");
      if (parsed.kind !== "pkce" || parsed.code !== "test-code" || parsed.flowId !== "test-flow") {
        throw new Error("pkce code should parse");
      }
    },
  },
  {
    name: "no callback",
    run: () => {
      const parsed = parseSupabaseAuthCallback("https://example.com/auth/set-password");
      if (parsed.kind !== "none") {
        throw new Error("empty url should produce no callback");
      }
    },
  },
  {
    name: "callback already processed and cleared",
    run: () => {
      const cleaned = clearSupabaseAuthCallback("https://example.com/auth/set-password?code=test-code&flow_id=test-flow&type=recovery#access_token=abc&refresh_token=def");
      if (cleaned.search.includes("code") || cleaned.search.includes("flow_id") || cleaned.hash) {
        throw new Error("callback should be cleared after processing");
      }
    },
  },
  {
    name: "existing valid session supported",
    run: () => {
      if (!isSupabaseSessionReady({ user: { id: "user-1" } })) {
        throw new Error("existing session is not recognized as ready");
      }
      if (isSupabaseSessionReady({ user: null })) {
        throw new Error("empty session should not be ready");
      }
    },
  },
];

let passed = 0;
for (const test of tests) {
  try {
    test.run();
    passed += 1;
    console.log(`PASS: ${test.name}`);
  } catch (error) {
    console.error(`FAIL: ${test.name}`);
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.exitCode === undefined) {
  console.log(`All ${passed} local auth helper tests passed.`);
}
