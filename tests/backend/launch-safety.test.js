import assert from "node:assert/strict";
import test from "node:test";

import { paymentConfigurationReady } from "../../functions/_lib/config.js";
import { validateModerationTransition } from "../../functions/_lib/domain.js";
import { readJson } from "../../functions/_lib/http.js";

test("checkout readiness requires live mode and every settlement credential", () => {
  const ready = {
    RANKOFF_MODE: "production",
    PAYMENTS_ENABLED: "true",
    DODO_ENVIRONMENT: "live_mode",
    DODO_PRODUCT_ID: "product_1",
    DODO_PAYMENTS_API_KEY: "api_key",
    DODO_PAYMENTS_WEBHOOK_KEY: "webhook_key",
  };
  assert.equal(paymentConfigurationReady(ready), true);
  assert.equal(paymentConfigurationReady({ ...ready, DODO_PAYMENTS_WEBHOOK_KEY: "" }), false);
  assert.equal(paymentConfigurationReady({ ...ready, DODO_ENVIRONMENT: "test_mode" }), false);
  assert.equal(paymentConfigurationReady({ ...ready, PAYMENTS_ENABLED: "false" }), false);
});

test("moderation transitions require a reason and removed is terminal", () => {
  assert.equal(validateModerationTransition("pending_review", "approved"), "approved");
  assert.equal(validateModerationTransition("suspended", "approved"), "approved");
  assert.throws(
    () => validateModerationTransition("approved", "suspended"),
    (error) => error.code === "moderation_reason_required",
  );
  assert.throws(
    () => validateModerationTransition("removed", "approved"),
    (error) => error.code === "invalid_moderation_transition",
  );
});

test("JSON reader rejects streamed bodies over the limit", async () => {
  const oversized = JSON.stringify({ value: "x".repeat(17 * 1024) });
  const request = new Request("https://rankoff.my/api/test", {
    method: "POST",
    body: oversized,
    headers: { "content-type": "application/json" },
  });
  await assert.rejects(readJson(request), (error) => error.code === "payload_too_large");
});
