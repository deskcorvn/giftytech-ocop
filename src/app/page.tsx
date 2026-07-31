export default function HomePage() {
  return (
    <main>
      <section className="card">
        <div className="eyebrow">GiftyID · OCOP Platform</div>
        <h1>Dữ liệu hành trình học tập có thể kiểm chứng.</h1>
        <p>
          Dịch vụ độc lập lưu tiến độ, bản nộp, minh chứng riêng tư, đánh giá mentor,
          gate, báo cáo và snapshot chứng chỉ cho chương trình OCOP 30 ngày.
        </p>
        <div className="status"><span className="dot" /> API service ready</div>
        <p>Kiểm tra vận hành tại <code>/api/health</code>. Tài liệu tích hợp nằm trong thư mục <code>docs</code>.</p>
      </section>
    </main>
  );
}
