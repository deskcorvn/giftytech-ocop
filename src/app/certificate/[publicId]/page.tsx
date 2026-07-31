import { getPublicCertificate } from "@/lib/services/certificate-service";

export const dynamic = "force-dynamic";

export default async function CertificatePage({ params }: { params: Promise<{ publicId: string }> }) {
  const certificate = await getPublicCertificate((await params).publicId);
  return (
    <main>
      <article className="card certificate">
        <div className="eyebrow">Chứng nhận hoàn thành có thể xác minh</div>
        <h1>Chương trình OCOP 30 ngày</h1>
        <p>GiftyID xác nhận học viên đã hoàn thành các đầu ra và gate trong phiên bản giáo trình được ghi nhận.</p>
        <div className="score">{certificate.score}/100</div>
        <dl>
          <div><dt>Học viên</dt><dd>{certificate.learnerName}</dd></div>
          <div><dt>Sản phẩm</dt><dd>{certificate.productName}</dd></div>
          <div><dt>Đơn vị</dt><dd>{certificate.organizationName}</dd></div>
          <div><dt>Địa phương</dt><dd>{certificate.province}</dd></div>
          <div><dt>Chương trình</dt><dd>{certificate.programName} · v{certificate.programVersion}</dd></div>
          <div><dt>Ngày cấp</dt><dd>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(certificate.issuedAt)}</dd></div>
        </dl>
        <p>Mã xác minh: <strong>{certificate.publicId}</strong></p>
        <div className="status"><span className="dot" /> {certificate.status === "ISSUED" ? "Còn hiệu lực" : "Đã thu hồi"}</div>
      </article>
    </main>
  );
}
