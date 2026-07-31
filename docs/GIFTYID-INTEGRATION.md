# Tích hợp vào GiftyID

## Phương án khuyến nghị

GiftyID gọi OCOP Platform qua các route proxy server-side cùng origin, ví dụ `/api/ocop/*`. Browser chỉ nói chuyện với domain GiftyID; BFF forward cookie/session theo thiết kế triển khai. Cách này tránh để URL backend, secret hoặc logic quyền ở client.

Nếu frontend và API dùng hai subdomain cùng site, cần cấu hình credential/CORS rất chặt. Pilot nên dùng reverse proxy để đơn giản hơn.

## Thứ tự thay localStorage

1. Sau login gọi `GET /api/ocop/me`.
2. Map gọi `GET /api/ocop/journey` với `cache: no-store`.
3. Khi mở task gọi `GET /api/ocop/tasks/:taskCode`.
4. Autosave tạo UUID mới và gửi `PUT /drafts/:taskCode` cùng `expectedVersion`.
5. Nếu mất mạng, giữ draft local có `serverVersion`; khi có mạng hỏi người dùng trước khi sync.
6. Nộp bài tạo UUID mới và gửi progress version mới nhất.
7. Khi nhận `409`, fetch lại task và cho so sánh; không tự ghi đè.

## Mapping trạng thái UI

| API state | UI |
|---|---|
| `LOCKED` | Khóa, giải thích gate cần đạt |
| `READY` | Có thể bắt đầu |
| `IN_PROGRESS` | Đang làm, có draft |
| `SUBMITTED` | Chờ mentor, accepted progress chưa tăng |
| `REVISION_REQUIRED` | Ưu tiên next action và hiển thị feedback |
| `ACCEPTED` | Hoàn tất, tăng accepted progress |

Chatbot phải đóng mặc định, lazy-load và không được che CTA/form. AI chỉ hỗ trợ soạn thảo; không tự quyết định sự thật, review hoặc gate.

## Cutover

- Tích hợp read-only journey trước.
- Chuyển draft và submission sang API.
- Chuyển upload sang private evidence.
- Bật mentor/review/gate.
- Sau khi đối chiếu case Quang Hải, dừng ghi Apps Script.
- Nếu cần báo cáo Sheets, tạo job export một chiều từ report snapshot.
