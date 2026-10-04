import assert from "node:assert/strict";
import { test } from "node:test";
import { MODELS } from "../packages/backend/src/providers/llm.ts";
import { CAPABILITIES } from "../packages/backend/src/editorial/models.ts";

test("qwen3.8-max verification preset shares the DashScope endpoint and sends strict JSON with thinking disabled", () => {
  const max = MODELS["qwen3.8-max"];
  assert.ok(max, "the verification model must have a named preset rather than falling back to default");
  assert.deepEqual(max, {
    key: "qwen3.8-max", service: "dashscope", model: "qwen3.8-max",
    baseUrlEnv: "DASHSCOPE_BASE_URL", apiKeyEnv: "DASHSCOPE_API_KEY",
    extra: { enable_thinking: false }, jsonMode: true,
  });
  assert.equal(max.baseUrlEnv, MODELS["qwen3.8-flash"]!.baseUrlEnv);
  assert.equal(max.apiKeyEnv, MODELS["qwen3.8-flash"]!.apiKeyEnv);
  assert.equal(CAPABILITIES.verification.env, "VERIFICATION_MODEL");
  assert.equal(CAPABILITIES.verification.default, "default");
});

test("the ordinary DeepSeek verifier uses DashScope credentials and disables thinking in JSON mode", () => {
  assert.deepEqual(MODELS["dashscope-deepseek-v4.1-flash"], {
    key: "dashscope-deepseek-v4.1-flash", service: "dashscope", model: "deepseek-v4.1-flash",
    baseUrlEnv: "DASHSCOPE_BASE_URL", apiKeyEnv: "DASHSCOPE_API_KEY",
    extra: { enable_thinking: false }, jsonMode: true,
  });
});
