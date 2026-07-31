# API contract

Mọi JSON response dùng envelope:

```json
{ "ok": true, "data": {} }
```

Lỗi:

```json
{ "ok": false, "error": { "code": "version_conflict", "message": "...", "details": {} } }
```

## Auth

| Method | Path | Role |
|---|---|---|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/logout` | Authenticated |
| GET | `/api/ocop/me` | Authenticated |

Login tạo cookie HTTP-only `ocop_session`. Client không đọc token bằng JavaScript.

## Learner

| Method | Path | Mục đích |
|---|---|---|
| GET | `/api/ocop/journey` | Map, progress, next action, gate |
| POST | `/api/ocop/consent` | Ghi nhận consent bắt buộc và showcase tùy chọn |
| GET | `/api/ocop/tasks/:taskCode` | Form, draft, submission, feedback |
| POST | `/api/ocop/tasks/:taskCode/start` | Chuyển READY → IN_PROGRESS |
| PUT | `/api/ocop/drafts/:taskCode` | Lưu draft có version |
| POST | `/api/ocop/evidence/upload` | Upload multipart private evidence |
| GET | `/api/ocop/evidence/:id` | Stream evidence có authorization |
| DELETE | `/api/ocop/evidence/:id` | Xóa evidence chưa dùng |
| POST | `/api/ocop/submissions` | Nộp bài |
| GET | `/api/ocop/submissions/:id` | Xem bản nộp và feedback |

Mutation JSON nhận `idempotencyKey` UUID. Draft/submission/start nhận thêm `expectedVersion` lấy từ response mới nhất.

Upload multipart gồm `file`, `taskCode`, `evidenceCode`, `idempotencyKey`. Giới hạn mặc định 4 MiB, MIME theo cấu hình EV.

## Mentor

| Method | Path | Mục đích |
|---|---|---|
| GET | `/api/ocop/mentor/queue?cohortId=` | Hàng đợi cũ nhất trước |
| POST | `/api/ocop/reviews` | Accept, yêu cầu sửa hoặc reject |
| POST | `/api/ocop/gates/:gateCode` | Ghi quyết định G0–G4 |
| POST | `/api/ocop/incidents` | Ghi sự cố S1–S4 |

## Coordinator/Admin

| Method | Path | Mục đích |
|---|---|---|
| GET/POST | `/api/ocop/cohorts` | Danh sách/tạo cohort |
| PATCH | `/api/ocop/cohorts/:id` | Chuyển trạng thái cohort theo workflow |
| GET/POST | `/api/ocop/cohorts/:id/enrollments` | Danh sách/thêm học viên |
| GET | `/api/ocop/coordinator/dashboard?cohortId=` | Funnel dùng N0 |
| POST | `/api/ocop/snapshots` | Đóng băng báo cáo D7/D30/final |
| GET | `/api/ocop/reports/:snapshotId` | Đọc snapshot |
| POST | `/api/ocop/certificates/issue` | Cấp chứng chỉ sau G4 |

## Public

| Method | Path | Mục đích |
|---|---|---|
| GET | `/api/health` | Readiness của API/DB |
| GET | `/api/ocop/certificates/:publicId` | Xác minh chứng chỉ |
| GET | `/certificate/:publicId` | Trang chứng chỉ có thể in PDF |

## Mã lỗi quan trọng

- `401 unauthorized`: chưa đăng nhập/session hết hạn.
- `403 forbidden`: sai vai trò hoặc không sở hữu entity.
- `409 version_conflict`: server có draft/progress mới hơn.
- `409 idempotency_conflict`: key đã dùng cho payload khác.
- `422 task_validation_failed`: đầu ra chưa đạt điều kiện form.
- `422 gate_not_ready`: còn task chưa được mentor chấp nhận.
