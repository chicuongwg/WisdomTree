// Self-check for the token layer (src/lib/sign.ts). It is the whole of
// authentication in dev mode, so the properties that matter — a tampered
// token is rejected, an expired one is rejected, and a token minted for one
// purpose is never accepted as the other — get one runnable check each.
//
// Run: npx tsx scripts/sign.test.ts
import assert from "node:assert/strict";
import { signDownload, signSession, verifyDownload, verifySession } from "../src/lib/sign";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

check("a session round-trips", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  assert.equal(verifySession(signSession(userId)), userId);
});

check("a download round-trips, dots in the value included", () => {
  const grant = verifyDownload(signDownload("objects/ab.cd/file.v2.pdf", "Báo cáo.pdf"));
  assert.deepEqual(grant, { objectKey: "objects/ab.cd/file.v2.pdf", filename: "Báo cáo.pdf" });
});

check("a tampered payload is rejected", () => {
  const token = signSession("22222222-2222-2222-2222-222222222222");
  const [payload, mac] = [token.slice(0, token.lastIndexOf(".")), token.slice(token.lastIndexOf(".") + 1)];
  const forged = Buffer.from("session.99999999999999.attacker", "utf8").toString("base64url");
  assert.equal(verifySession(`${forged}.${mac}`), null);
  assert.equal(verifySession(`${payload}.${"A".repeat(mac.length)}`), null);
});

check("garbage is rejected without throwing", () => {
  for (const junk of ["", ".", "not-a-token", "a.b.c"]) {
    assert.equal(verifySession(junk), null);
    assert.equal(verifyDownload(junk), null);
  }
});

check("an expired token is rejected", () => {
  // Negative TTL: signed already-expired, so no clock manipulation is needed.
  assert.equal(verifyDownload(signDownload("k", "f", -1)), null);
});

check("purposes do not cross: a session is not a download grant, nor the reverse", () => {
  // Both halves share one HMAC key — the purpose tag is the only thing
  // keeping them apart, so this is the check that must never regress.
  assert.equal(verifyDownload(signSession("33333333-3333-3333-3333-333333333333")), null);
  assert.equal(verifySession(signDownload("objects/secret", "secret.pdf")), null);
});

console.log(`\n${passed} checks passed.`);
