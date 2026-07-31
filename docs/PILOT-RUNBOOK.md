# Pilot runbook

## Trước pilot

- Tạo Neon project và branch staging.
- Tạo Vercel Blob store ở chế độ private.
- Đặt `DATABASE_URL`, `DIRECT_URL`, `BLOB_READ_WRITE_TOKEN` và mật khẩu seed trong secret manager.
- Chạy `npm run db:deploy`, sau đó `npm run db:seed` đúng một môi trường demo.
- Đổi hoặc vô hiệu hóa tài khoản seed trước khi nhận dữ liệu thật.
- Chạy `npm run check` và `npm run smoke:api`.

## Kiểm thử bắt buộc

- Learner A không đọc được evidence của learner B.
- Cùng idempotency key không tạo submission/review trùng.
- `expectedVersion` cũ trả 409.
- Submission không tăng accepted progress trước review.
- Critical flag không thể đi cùng quyết định accept.
- Gate không qua khi còn task chưa đạt.
- G4 + đủ 100 trọng số mới cấp chứng chỉ.
- Snapshot báo cáo ghi numerator, denominator và missing count.
- Xóa evidence chưa nộp xóa cả Blob và ghi audit.
- Evidence đã gắn submission không được xóa trực tiếp.

## Backup và phục hồi

- Bật backup/PITR theo gói Neon sử dụng.
- Trước thay đổi schema lớn, tạo branch/restore point.
- Mỗi tháng diễn tập restore sang database tách biệt và chạy smoke read-only.
- Không coi file export Google Sheets là bản backup database.

## Sự cố

- DB không truy cập: `/api/health` trả 503; dừng mutation và giữ draft local.
- Blob lỗi: không tạo EvidenceAsset; upload lỗi phải cho thử lại cùng idempotency key.
- Sai dữ liệu/chứng chỉ: không sửa snapshot; dùng quy trình revoke rồi cấp bản mới có audit.
- Lộ session: revoke row Session và buộc đăng nhập lại.
