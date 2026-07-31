import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../src/lib/api/errors";
import { EVIDENCE_DEFINITIONS, QUANG_HAI_ANSWERS, TASKS } from "../src/lib/curriculum/ocop-v1";
import { nextGate } from "../src/lib/domain/gates";
import { hashJson, stableStringify } from "../src/lib/domain/hash";
import { validateTaskPayload } from "../src/lib/domain/validation";
import { detectEvidenceMime } from "../src/lib/services/evidence-service";

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

test("evidence MIME detection checks file signatures", () => {
  assert.equal(detectEvidenceMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(detectEvidenceMime(Buffer.from("%PDF-1.7\n", "ascii")), "application/pdf");
  assert.equal(detectEvidenceMime(Buffer.from("not-an-image", "ascii")), null);
});
