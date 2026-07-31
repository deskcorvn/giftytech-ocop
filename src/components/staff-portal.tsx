"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { api, ApiFailure, Brand, formatDateTime, humanFileSize, Icon } from "@/components/portal-kit";

type QueueItem = {
  id: string;
  version: number;
  submittedAt: string;
  learner: { id: string; displayName: string };
  enrollment: { id: string; organizationName: string; productName: string };
  cohort: { id: string; code: string };
  task: { code: string; title: string; gateCode: string };
  evidenceCount: number;
};

type Field = { key: string; label: string; kind: string };
type SubmissionDetail = {
  id: string;
  task: {
    code: string;
    title: string;
    fieldSchema: Field[];
    contentSchema: { mentorCriteria?: string[]; selfCheck?: string[]; promise?: string };
  };
  version: number;
  status: string;
  payload: Record<string, unknown>;
  submittedAt: string;
  evidence: Array<{ id: string; code: string; name: string; mimeType: string; sizeBytes: number }>;
  reviews: Array<{ decision: string; score: number | null; feedback: string; reviewerName: string; createdAt: string }>;
};

type ReviewResult = { enrollmentId: string; nextTaskCode: string | null; gateAccepted: boolean; programCompleted: boolean };

function readableValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value ?? "Chưa có thông tin");
}

function DecisionBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { ACCEPT: "Đạt", REVISION_REQUIRED: "Cần bổ sung", REJECT: "Không đạt" };
  return <span className={`staff-decision decision-${status.toLowerCase()}`}>{labels[status] ?? status}</span>;
}

function Queue({ items, selectedId, onSelect }: { items: QueueItem[]; selectedId?: string; onSelect: (item: QueueItem) => void }) {
  return (
    <aside className="staff-queue" aria-label="Bài đang chờ duyệt">
      <div className="staff-queue-heading"><div><small>CÔNG VIỆC HÔM NAY</small><h2>{items.length} bài chờ duyệt</h2></div><Icon name="file" size={28} /></div>
      {items.length ? <div className="staff-queue-list">{items.map((item) => (
        <button key={item.id} onClick={() => onSelect(item)} className={selectedId === item.id ? "active" : ""}>
          <span className="staff-avatar">{item.learner.displayName.trim().charAt(0).toUpperCase()}</span>
          <span><strong>{item.learner.displayName}</strong><small>{item.enrollment.productName || item.enrollment.organizationName}</small><em>{item.task.title} · {formatDateTime(item.submittedAt)}</em></span>
          <Icon name="arrow" size={20} />
        </button>
      ))}</div> : <div className="staff-empty-small"><Icon name="check" size={36} /><strong>Đã duyệt hết bài</strong><span>Khi học viên nộp bài mới, bài sẽ xuất hiện tại đây.</span></div>}
    </aside>
  );
}

function ReviewPanel({ item, detail, busy, onReview }: {
  item: QueueItem;
  detail: SubmissionDetail;
  busy: boolean;
  onReview: (decision: "ACCEPT" | "REVISION_REQUIRED" | "REJECT", score: number, feedback: string) => Promise<void>;
}) {
  const [score, setScore] = useState(100);
  const [feedback, setFeedback] = useState("Nội dung rõ ràng, đúng với minh chứng và đạt yêu cầu của bước này.");
  const [decision, setDecision] = useState<"ACCEPT" | "REVISION_REQUIRED" | "REJECT">("ACCEPT");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onReview(decision, score, feedback);
  };

  return (
    <main className="staff-review">
      <header className="staff-submission-head">
        <div><span className="staff-kicker">{item.cohort.code} · BẢN {detail.version}</span><h1>{detail.task.title}</h1><p>{detail.task.contentSchema.promise}</p></div>
        <div className="staff-learner-card"><Icon name="user" size={24} /><span><strong>{item.learner.displayName}</strong><small>{item.enrollment.organizationName} · {item.enrollment.productName}</small></span></div>
      </header>

      <section className="staff-section">
        <div className="staff-section-title"><span>1</span><div><h2>Kết quả học viên đã làm</h2><p>Đối chiếu nội dung với dữ liệu và minh chứng thực tế.</p></div></div>
        <div className="staff-answer-grid">{detail.task.fieldSchema.map((field) => (
          <article key={field.key}><small>{field.label}</small><div>{readableValue(detail.payload[field.key])}</div></article>
        ))}</div>
      </section>

      <section className="staff-section">
        <div className="staff-section-title"><span>2</span><div><h2>Minh chứng</h2><p>Chỉ chấp nhận ảnh, tệp hoặc đường dẫn phản ánh việc học viên đã làm thật.</p></div></div>
        {detail.evidence.length ? <div className="staff-evidence-list">{detail.evidence.map((file) => (
          <a key={file.id} href={`/api/ocop/evidence/${file.id}`} target="_blank" rel="noreferrer"><Icon name="file" size={24} /><span><strong>{file.name}</strong><small>{file.code} · {humanFileSize(file.sizeBytes)}</small></span><Icon name="external" size={19} /></a>
        ))}</div> : <div className="staff-warning"><Icon name="warning" size={24} /> Bài này chưa có tệp minh chứng.</div>}
      </section>

      <section className="staff-section staff-criteria">
        <div className="staff-section-title"><span>3</span><div><h2>Chuẩn duyệt của giáo án</h2><p>Đạt khi tất cả tiêu chí cốt lõi bên dưới đều đúng.</p></div></div>
        <ul>{(detail.task.contentSchema.mentorCriteria ?? []).map((criterion) => <li key={criterion}><Icon name="check" size={21} /><span>{criterion}</span></li>)}</ul>
      </section>

      {detail.reviews.length ? <section className="staff-section"><h2>Lịch sử phản hồi</h2>{detail.reviews.map((review, index) => <article className="staff-history" key={`${review.createdAt}-${index}`}><DecisionBadge status={review.decision} /><strong>{review.reviewerName} · {formatDateTime(review.createdAt)}</strong><p>{review.feedback}</p></article>)}</section> : null}

      <form className="staff-review-form" onSubmit={submit}>
        <h2>4. Chốt kết quả</h2>
        <div className="staff-decision-buttons">
          <button type="button" className={decision === "ACCEPT" ? "active accept" : ""} onClick={() => { setDecision("ACCEPT"); setScore(100); setFeedback("Nội dung rõ ràng, đúng với minh chứng và đạt yêu cầu của bước này."); }}><Icon name="check" size={22} /> Đạt · mở bước tiếp</button>
          <button type="button" className={decision === "REVISION_REQUIRED" ? "active revise" : ""} onClick={() => { setDecision("REVISION_REQUIRED"); setScore(60); setFeedback("Anh/chị vui lòng bổ sung điểm còn thiếu theo hướng dẫn cụ thể dưới đây."); }}><Icon name="refresh" size={22} /> Cần bổ sung</button>
          <button type="button" className={decision === "REJECT" ? "active reject" : ""} onClick={() => { setDecision("REJECT"); setScore(0); setFeedback("Minh chứng chưa phản ánh đúng việc thực hành của bước này. Anh/chị vui lòng làm lại theo hướng dẫn."); }}><Icon name="close" size={22} /> Không đạt</button>
        </div>
        <label><span>Điểm (0–100)</span><input type="number" min="0" max="100" value={score} onChange={(event) => setScore(Number(event.target.value))} /></label>
        <label><span>Phản hồi dễ hiểu cho học viên</span><textarea rows={5} minLength={10} required value={feedback} onChange={(event) => setFeedback(event.target.value)} /><small>Nêu rõ: điểm nào đã tốt, cần sửa gì, và làm thế nào để sửa.</small></label>
        <button className="easy-primary-button" disabled={busy}>{busy ? "Đang lưu kết quả…" : decision === "ACCEPT" ? "Xác nhận đạt và mở bước tiếp" : "Gửi hướng dẫn cho học viên"} <Icon name="arrow" size={22} /></button>
      </form>
    </main>
  );
}

export function StaffPortal({ user, onLogout }: { user: { displayName: string; role: string }; onLogout: () => Promise<void> }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadQueue = useCallback(async (preferredId?: string) => {
    const items = await api<QueueItem[]>("/api/ocop/mentor/queue");
    setQueue(items);
    const next = items.find((entry) => entry.id === preferredId) ?? items[0] ?? null;
    setSelected(next);
    if (next) setDetail(await api<SubmissionDetail>(`/api/ocop/submissions/${next.id}`));
    else setDetail(null);
  }, []);

  useEffect(() => { void Promise.resolve().then(() => loadQueue().catch((error) => setMessage(error instanceof Error ? error.message : "Không tải được hàng chờ.")).finally(() => setLoading(false))); }, [loadQueue]);

  const choose = async (item: QueueItem) => {
    setSelected(item);
    setDetail(null);
    try { setDetail(await api<SubmissionDetail>(`/api/ocop/submissions/${item.id}`)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Không tải được bài nộp."); }
  };

  const review = async (decision: "ACCEPT" | "REVISION_REQUIRED" | "REJECT", score: number, feedback: string) => {
    if (!selected) return;
    setBusy(true); setMessage("");
    try {
      const result = await api<ReviewResult>("/api/ocop/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ submissionId: selected.id, idempotencyKey: crypto.randomUUID(), decision, score, feedback, criticalFlags: [] }) });
      if (result.programCompleted) {
        await api("/api/ocop/certificates/issue", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enrollmentId: result.enrollmentId, idempotencyKey: crypto.randomUUID() }) });
      }
      setMessage(result.programCompleted ? "Đã duyệt bài cuối và cấp chứng chỉ." : decision === "ACCEPT" ? "Đã xác nhận đạt. Bước tiếp theo đã mở cho học viên." : "Đã gửi hướng dẫn bổ sung cho học viên.");
      await loadQueue();
    } catch (error) {
      setMessage(error instanceof ApiFailure ? error.message : "Chưa thể lưu kết quả. Vui lòng thử lại.");
    } finally { setBusy(false); }
  };

  const roleLabel = useMemo(() => ({ MENTOR: "Mentor", COORDINATOR: "Điều phối viên", ADMIN: "Quản trị viên" }[user.role] ?? user.role), [user.role]);

  return (
    <div className="staff-shell">
      <header className="staff-topbar"><Brand compact /><div><span>{roleLabel}</span><strong>{user.displayName}</strong><button onClick={() => void onLogout()}><Icon name="logout" size={20} /> Đăng xuất</button></div></header>
      {message ? <div className="staff-toast" role="status">{message}<button onClick={() => setMessage("")}><Icon name="close" size={18} /></button></div> : null}
      {loading ? <div className="easy-loading"><span /><strong>Đang tải bài chờ duyệt…</strong></div> : <div className="staff-layout"><Queue items={queue} selectedId={selected?.id} onSelect={(item) => void choose(item)} />{selected && detail ? <ReviewPanel key={detail.id} item={selected} detail={detail} busy={busy} onReview={review} /> : <main className="staff-empty"><Icon name="award" size={56} /><h1>Không còn bài chờ duyệt</h1><p>Hàng chờ đã được xử lý hết. Học viên sẽ thấy bước mới ngay sau khi bài được chấp nhận.</p><button onClick={() => void loadQueue()}><Icon name="refresh" size={21} /> Kiểm tra lại</button></main>}</div>}
    </div>
  );
}
