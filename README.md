# GiftyID OCOP Platform

Backend và data platform độc lập cho hành trình học OCOP 30 ngày. Repo này không chứa website marketing và không dùng Google Sheets làm nguồn dữ liệu runtime.

## Phạm vi đã triển khai

- PostgreSQL/Neon + Prisma migration.
- User, credential và session cookie lưu trong DB, có thể thu hồi.
- Version giáo trình, stage, 10 nhiệm vụ, EV01–EV16 và rubric.
- Cohort, enrollment, consent và khởi tạo tiến độ.
- Journey, task, draft đa thiết bị với optimistic concurrency.
- Submission idempotent; tách trạng thái đã nộp và đã được chấp nhận.
- Private evidence trên Vercel Blob; tải/xóa phải qua authorization.
- Mentor queue, review, revision loop và critical flags.
- G0–G4, mở khóa tuần tự và audit trail.
- Dashboard theo mẫu số N0, report snapshot.
- Certificate snapshot bất biến, mã xác minh và trang in chứng chỉ.
- Seed hai case Nước mắm Quang Hải: hành trình mới và hành trình đã hoàn thành.

## Chạy local

Yêu cầu Node.js 20+, npm và PostgreSQL.

```bash
docker compose up -d
cp .env.example .env
```

Trong `.env`, dùng local URL cho cả `DATABASE_URL` và `DIRECT_URL`:

```text
postgresql://ocop:ocop_local_password@localhost:54329/ocop
```

Đặt ba mật khẩu seed tối thiểu 12 ký tự, sau đó:

```bash
npm install
npm run db:deploy
npm run db:seed
npm run dev
```

Mở `http://localhost:3000`. Health check tại `/api/health`.

## Tài khoản seed

| Username | Vai trò | Trạng thái |
|---|---|---|
| `quanghai.learner` | Learner | Bắt đầu từ G0 |
| `quanghai.completed` | Learner | Hoàn tất, có chứng chỉ |
| `ocop.mentor` | Mentor | Duyệt submission |
| `ocop.admin` | Admin | Điều phối và cấp chứng chỉ |

Mật khẩu lấy từ biến môi trường, không được commit vào Git.

## Kiểm tra chất lượng

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Không dùng `prisma db push` cho production. Migration production chạy bằng `npm run db:deploy` trong CI.

## Tài liệu

- [Kiến trúc](docs/ARCHITECTURE.md)
- [API contract](docs/API.md)
- [Tích hợp GiftyID](docs/GIFTYID-INTEGRATION.md)
- [Runbook pilot](docs/PILOT-RUNBOOK.md)
