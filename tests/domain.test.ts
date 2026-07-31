import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../src/lib/api/errors";
import { EVIDENCE_DEFINITIONS, QUANG_HAI_ANSWERS, TASKS } from "../src/lib/curriculum/ocop-v1";
import { TASK_LEARNING_CONTENT, buildTaskLearningContent } from "../src/lib/curriculum/ocop-learning-content";
import { nextGate } from "../src/lib/domain/gates";
import { hashJson, stableStringify } from "../src/lib/domain/hash";
import { validateTaskPayload } from "../src/lib/domain/validation";
import { decryptEvidenceBytes, detectEvidenceMime, encryptEvidenceBytes } from "../src/lib/services/evidence-service";

test("stableStringify and hashJson ignore object key order", () => {
  assert.equal(stableStringify({ b: 2, a: 1 }), stableStringify({ a: 1, b: 2 }));
  assert.equal(hashJson({ b: 2, a: 1 }), hashJson({ a: 1, b: 2 }));
});

test("nextGate follows G0 to G4 and stops", () => {
  assert.equal(nextGate("G0"), "G1");
  assert.equal(nextGate("G3"), "G4");
  assert.equal(nextGate("G4"), null);
});

test("task validation accepts valid dynamic fields", () => {
  assert.doesNotThrow(() => validateTaskPayload([
    { key: "title", label: "Tiêu đề", kind: "text", minLength: 4 },
    { key: "count", label: "Số lượng", kind: "number", min: 2 },
    { key: "confirmed", label: "Xác nhận", kind: "checkbox" },
  ], { title: "OCOP", count: 2, confirmed: true }));
});

test("task validation rejects pending facts in public copy", () => {
  assert.throws(
    () => validateTaskPayload([{ key: "facebookPost", label: "Bài Facebook", kind: "textarea", minLength: 10 }], { facebookPost: "Thông tin CHỜ XÁC THỰC chưa được duyệt" }),
    (error) => error instanceof ApiError && error.code === "task_validation_failed",
  );
});

test("curriculum is complete and totals 100 percent", () => {
  assert.equal(TASKS.length, 10);
  assert.equal(TASKS.reduce((sum, task) => sum + task.weight, 0), 100);
  assert.equal(new Set(TASKS.map((task) => task.code)).size, TASKS.length);
  assert.deepEqual(EVIDENCE_DEFINITIONS.map((item) => item.code), Array.from({ length: 16 }, (_, index) => `EV${String(index + 1).padStart(2, "0")}`));
  assert.deepEqual(new Set(TASKS.flatMap((task) => task.evidenceCodes)), new Set(EVIDENCE_DEFINITIONS.map((item) => item.code)));
});

test("Quang Hai fixture satisfies every task form from start to finish", () => {
  for (const task of TASKS) {
    assert.doesNotThrow(
      () => validateTaskPayload(task.fields, QUANG_HAI_ANSWERS[task.code]),
      `Fixture failed at ${task.code}`,
    );
  }
});

test("every task has a complete guided lesson and mentor rubric", () => {
  assert.deepEqual(new Set(Object.keys(TASK_LEARNING_CONTENT)), new Set(TASKS.map((task) => task.code)));
  for (const task of TASKS) {
    const content = TASK_LEARNING_CONTENT[task.code];
    assert.ok(content.promise.length >= 30, `${task.code} needs a clear promise`);
    assert.ok(content.whyItMatters.length >= 50, `${task.code} needs a practical reason`);
    assert.ok(content.prepare.length >= 3, `${task.code} needs preparation guidance`);
    assert.ok(content.microSteps.length >= 3, `${task.code} needs micro steps`);
    assert.ok(content.chatgpt.prompt.length >= 250, `${task.code} needs a useful ChatGPT prompt`);
    assert.ok(content.chatgpt.reminder.length >= 40, `${task.code} needs an AI truth reminder`);
    assert.ok(content.selfCheck.length >= 3, `${task.code} needs learner self-checks`);
    assert.ok(content.commonMistakes.length >= 2, `${task.code} needs common mistakes`);
    assert.ok(content.mentorCriteria.length >= 3, `${task.code} needs a mentor rubric`);
    assert.deepEqual(new Set(Object.keys(content.fieldHints)), new Set(task.fields.map((field) => field.key)));
    const withSample = buildTaskLearningContent(task.code, QUANG_HAI_ANSWERS[task.code]);
    assert.equal(withSample.sample?.title, "Ví dụ tham khảo: Nước mắm Quang Hải");
  }
});

test("evidence MIME detection checks file signatures", () => {
  assert.equal(detectEvidenceMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(detectEvidenceMime(Buffer.from("%PDF-1.7\n", "ascii")), "application/pdf");
  assert.equal(detectEvidenceMime(Buffer.from("not-an-image", "ascii")), null);
});

test("evidence encryption is authenticated and reversible", () => {
  const key = Buffer.alloc(32, 7);
  const source = Buffer.from("private OCOP evidence", "utf8");
  const encrypted = encryptEvidenceBytes(source, key);
  assert.notDeepEqual(encrypted, source);
  assert.deepEqual(decryptEvidenceBytes(encrypted, key), source);
  encrypted[encrypted.length - 1] ^= 1;
  assert.throws(() => decryptEvidenceBytes(encrypted, key));
});
