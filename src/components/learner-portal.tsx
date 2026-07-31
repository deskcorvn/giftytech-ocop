"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

type Program = {
  code: string;
  name: string;
  version: number;
  title: string;
  description: string;
};

type CurriculumTask = {
  code: string;
  title: string;
  objective: string;
  instructions: string;
  position: number;
  estimateMinutes: number;
  weight: number;
  gateCode: string;
  evidenceCodes: string[];
  outputCount: number;
};

type CurriculumStage = {
  code: string;
  title: string;
  position: number;
  tasks: CurriculumTask[];
};

type TaskState = "LOCKED" | "READY" | "IN_PROGRESS" | "SUBMITTED" | "REVISION_REQUIRED" | "ACCEPTED";

type JourneyTask = {
  code: string;
  title: string;
  objective: string;
  instructions: string;
  position: number;
  stage: { code: string; title: string };
  gateCode: string;
  estimateMinutes: number;
  weight: number;
  state: TaskState;
  progressVersion: number;
  draftVersion: number;
  submittedVersion?: number;
  submissionStatus?: string;
  evidence: Array<{ code: string; title: string; required: boolean; allowedMimeTypes: string[]; maxSizeBytes: number }>;
};

type Journey = {
  learner: { id: string; username: string; displayName: string };
  enrollment: {
    id: string;
    status: string;
    organizationName: string;
    productName: string;
    province: string;
    primaryChannel: string;
  };
  cohort: { id: string; code: string; name: string; startAt: string; endAt: string };
  program: { code: string; version: number; title: string; description: string };
  stages: Array<{ code: string; title: string; position: number }>;
  tasks: JourneyTask[];
  progress: { acceptedPercent: number; submittedPercent: number; totalWeight: number };
  gates: Array<{ code: string; status: string; reason?: string; version: number }>;
  nextAction: { taskCode: string; state: TaskState; title: string } | null;
  certificate: { publicId: string; status: string } | null;
};

type DynamicField = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "url" | "number" | "checkbox";
  required?: boolean;
  minLength?: number;
  min?: number;
};

type TaskDetail = {
  code: string;
  title: string;
  objective: string;
  instructions: string;
  stage: { code: string; title: string };
  gateCode: string;
  weight: number;
  estimateMinutes: number;
  fieldSchema: DynamicField[];
  evidenceRequirements: Array<{
    code: string;
    title: string;
    description: string;
    required: boolean;
    allowedMimeTypes: string[];
    maxSizeBytes: number;
    maxFiles: number;
  }>;
  evidenceAssets: Array<{
    id: string;
    code: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    submissionId: string | null;
    createdAt: string;
  }>;
  progress: { state: TaskState; version: number } | null;
  draft: { version: number; payload: Record<string, unknown> } | null;
  submissions: Array<{
    id: string;
    version: number;
    payload: Record<string, unknown>;
    status: string;
    submittedAt: string;
    evidence: Array<{ id: string; code: string; name: string; mimeType: string; sizeBytes: number }>;
    reviews: Array<{ decision: string; score: number | null; feedback: string; criticalFlags: string[]; createdAt: string }>;
  }>;
};

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string; details?: unknown } };

class ApiFailure extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin", ...init });
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body?.ok) {
    const failure = body && !body.ok ? body.error : null;
    throw new ApiFailure(response.status, failure?.code ?? "request_failed", failure?.message ?? "Không thể kết nối hệ thống.", failure?.details);
  }
  return body.data;
}

const STATE_META: Record<TaskState, { label: string; short: string; icon: string }> = {
  LOCKED: { label: "Chưa mở khóa", short: "Khóa", icon: "lock" },
  READY: { label: "Sẵn sàng thực hiện", short: "Sẵn sàng", icon: "play" },
  IN_PROGRESS: { label: "Đang thực hiện", short: "Đang làm", icon: "pencil" },
  SUBMITTED: { label: "Đang chờ mentor xác minh", short: "Chờ duyệt", icon: "clock" },
  REVISION_REQUIRED: { label: "Mentor yêu cầu bổ sung", short: "Bổ sung", icon: "refresh" },
  ACCEPTED: { label: "Đã xác minh đạt", short: "Đã đạt", icon: "check" },
};

const STAGE_COPY: Record<string, { kicker: string; description: string }> = {
  PREPARATION: { kicker: "Trước buổi học", description: "Thu thập dữ liệu thật, ảnh nguồn và quyền sử dụng." },
  TRAINING_DAY: { kicker: "Học cùng giảng viên", description: "Tạo bộ nội dung, hồ sơ số và công cụ trả lời khách." },
  APPLICATION_7D: { kicker: "Dùng trong thực tế", description: "Xuất bản, quan sát chỉ số và rút kinh nghiệm sau 7 ngày." },
  ACCOMPANIMENT_30D: { kicker: "Duy trì thói quen", description: "Cải tiến từ phản hồi và ghi nhật ký đến ngày thứ 30." },
  EVALUATION: { kicker: "Chốt hành trình", description: "Tự đánh giá, nhận nhận xét và lập mục tiêu tiếp theo." },
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    check: <path d="m5 12 4 4L19 6" />,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    play: <path d="m9 6 9 6-9 6Z" />,
    pencil: <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10Z" /><path d="m14 7 3 3" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M18 12a6 6 0 0 0-10-4L5 11M6 12a6 6 0 0 0 10 4l3-3" /></>,
    arrow: <><path d="M5 12h14" /><path d="m15 8 4 4-4 4" /></>,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></>,
    save: <><path d="M5 4h12l2 2v14H5Z" /><path d="M8 4v6h8V4M8 20v-6h8v6" /></>,
    file: <><path d="M7 3h7l4 4v14H7Z" /><path d="M14 3v5h5" /></>,
    logout: <><path d="M10 5H5v14h5" /><path d="M14 8l4 4-4 4M18 12H9" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    spark: <><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7Z" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Brand() {
  return (
    <div className="ocop-brand">
      <span className="ocop-brand-mark">G</span>
      <span><strong>GiftyID</strong><small>OCOP 30 ngày</small></span>
    </div>
  );
}

function PublicCurriculum({ curriculum }: { curriculum: CurriculumStage[] }) {
  return (
    <section className="ocop-public-curriculum" id="giao-an">
      <div className="ocop-section-heading">
        <div><span className="ocop-overline">Giáo án thực hành</span><h2>5 chặng, 10 đầu việc, 16 minh chứng</h2></div>
        <p>Mỗi bước nói rõ việc cần làm, sản phẩm đầu ra và điều kiện để mentor xác minh. Bước sau chỉ mở khi gate trước đã đạt.</p>
      </div>
      <div className="ocop-phase-map" aria-label="Bản đồ hành trình OCOP">
        {curriculum.map((stage, index) => (
          <div className="ocop-phase-node" key={stage.code}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{stage.title}</strong>
            <small>{stage.tasks.length} bước</small>
          </div>
        ))}
      </div>
      <div className="ocop-curriculum-list">
        {curriculum.map((stage, stageIndex) => (
          <details className="ocop-curriculum-phase" key={stage.code} open={stageIndex === 0}>
            <summary>
              <span className="ocop-phase-number">{stageIndex + 1}</span>
              <span><small>{STAGE_COPY[stage.code]?.kicker}</small><strong>{stage.title}</strong></span>
              <span className="ocop-summary-count">{stage.tasks.length} nhiệm vụ</span>
            </summary>
            <div className="ocop-public-tasks">
              {stage.tasks.map((task) => (
                <article key={task.code}>
                  <span className="ocop-task-index">Bước {task.position}</span>
                  <div><h3>{task.title}</h3><p>{task.objective}</p></div>
                  <ul><li>{task.estimateMinutes} phút</li><li>{task.outputCount} trường đầu ra</li><li>{task.evidenceCodes.length} minh chứng</li></ul>
                </article>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function GuestView({ program, curriculum, onLoggedIn }: { program: Program; curriculum: CurriculumStage[]; onLoggedIn: () => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      await onLoggedIn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đăng nhập.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ocop-public-shell">
      <header className="ocop-public-header"><Brand /><nav><a href="#giao-an">Xem giáo án</a><a href="#dang-nhap" className="ocop-nav-cta">Vào học</a></nav></header>
      <main className="ocop-public-main">
        <section className="ocop-hero">
          <div className="ocop-hero-copy">
            <span className="ocop-pill"><Icon name="spark" size={16} /> Chương trình thực hành trên điện thoại</span>
            <h1>Từng bước rõ ràng.<br /><em>Làm thật, có xác minh.</em></h1>
            <p>{program.description}</p>
            <div className="ocop-hero-stats">
              <div><strong>30</strong><span>ngày đồng hành</span></div>
              <div><strong>10</strong><span>nhiệm vụ thực hành</span></div>
              <div><strong>05</strong><span>gate xác minh</span></div>
            </div>
            <a className="ocop-primary-link" href="#giao-an">Khám phá lộ trình <Icon name="arrow" size={18} /></a>
          </div>
          <form className="ocop-login-card" id="dang-nhap" onSubmit={login}>
            <span className="ocop-login-icon"><Icon name="user" size={24} /></span>
            <div><span className="ocop-overline">Khu vực học viên</span><h2>Tiếp tục hành trình</h2><p>Dùng tài khoản do ban tổ chức cung cấp.</p></div>
            <label>Tên đăng nhập<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="vidu.hocvien" required /></label>
            <label>Mật khẩu<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••••••" required minLength={8} /></label>
            {error ? <div className="ocop-form-error" role="alert">{error}</div> : null}
            <button className="ocop-primary-button" disabled={busy}>{busy ? "Đang đăng nhập…" : "Vào bản đồ học tập"}<Icon name="arrow" size={18} /></button>
            <small className="ocop-login-note">Tiến độ và minh chứng được lưu riêng tư theo từng học viên.</small>
          </form>
        </section>
        <PublicCurriculum curriculum={curriculum} />
      </main>
      <footer className="ocop-public-footer"><Brand /><span>Dữ liệu học tập có thể kiểm chứng · Hải Phòng 2026</span></footer>
    </div>
  );
}

function TaskForm({
  detail,
  payload,
  onPayloadChange,
  onStart,
  onSave,
  onSubmit,
  onUpload,
  busy,
}: {
  detail: TaskDetail;
  payload: Record<string, unknown>;
  onPayloadChange: (key: string, value: unknown) => void;
  onStart: () => void;
  onSave: () => void;
  onSubmit: () => void;
  onUpload: (requirement: TaskDetail["evidenceRequirements"][number], file: File) => void;
  busy: string;
}) {
  const state = detail.progress?.state ?? "LOCKED";
  const editable = state === "IN_PROGRESS" || state === "REVISION_REQUIRED";
  const unattachedAssets = detail.evidenceAssets.filter((asset) => !asset.submissionId);
  const latestReview = detail.submissions[0]?.reviews[0];

  return (
    <div className="ocop-task-detail">
      <div className="ocop-detail-head">
        <div><span className="ocop-overline">{detail.stage.title} · {detail.gateCode}</span><h2>{detail.title}</h2></div>
        <span className={`ocop-state-badge state-${state.toLowerCase()}`}><Icon name={STATE_META[state].icon} size={16} />{STATE_META[state].short}</span>
      </div>
      <div className="ocop-detail-meta"><span>{detail.estimateMinutes} phút dự kiến</span><span>{detail.weight}% tổng điểm</span><span>{detail.evidenceRequirements.length} loại minh chứng</span></div>

      <section className="ocop-instruction-card"><span>Mục tiêu đầu ra</span><p>{detail.objective}</p><hr /><span>Cách thực hiện</span><p>{detail.instructions}</p></section>

      {latestReview ? <section className={`ocop-review-box review-${latestReview.decision.toLowerCase()}`}><strong>Phản hồi từ mentor</strong><p>{latestReview.feedback}</p>{latestReview.score !== null ? <span>Điểm đánh giá: {latestReview.score}/100</span> : null}</section> : null}

      {state === "LOCKED" ? <div className="ocop-locked-box"><Icon name="lock" size={24} /><div><strong>Bước này chưa mở</strong><p>Hoàn thành bước trước và chờ mentor xác minh gate để tiếp tục.</p></div></div> : null}
      {state === "READY" ? <div className="ocop-start-box"><div><strong>Bạn đã sẵn sàng</strong><p>Khi bắt đầu, hệ thống sẽ lưu mốc thời gian và mở biểu mẫu đầu ra.</p></div><button className="ocop-primary-button compact" onClick={onStart} disabled={Boolean(busy)}>{busy === "start" ? "Đang mở…" : "Bắt đầu bước này"}<Icon name="arrow" size={18} /></button></div> : null}
      {state === "SUBMITTED" ? <div className="ocop-waiting-box"><Icon name="clock" size={24} /><div><strong>Đã nộp · đang chờ xác minh</strong><p>Mentor sẽ kiểm tra dữ liệu, minh chứng và điều kiện gate. Bạn sẽ được mở bước tiếp theo khi bài đạt.</p></div></div> : null}
      {state === "ACCEPTED" ? <div className="ocop-accepted-box"><Icon name="check" size={24} /><div><strong>Bước này đã được xác minh</strong><p>Sản phẩm đầu ra đã đạt điều kiện của giáo án và được ghi vào tiến độ chứng chỉ.</p></div></div> : null}

      {editable ? (
        <>
          <section className="ocop-output-section">
            <div className="ocop-subheading"><div><span className="ocop-step-chip">1</span><span><strong>Hoàn thiện sản phẩm đầu ra</strong><small>Điền đủ thông tin theo dữ liệu thật của sản phẩm.</small></span></div><span>{detail.fieldSchema.length} mục</span></div>
            <div className="ocop-dynamic-form">
              {detail.fieldSchema.map((field) => (
                <label key={field.key} className={field.kind === "checkbox" ? "ocop-checkbox-field" : ""}>
                  {field.kind === "checkbox" ? (
                    <><input type="checkbox" checked={payload[field.key] === true} onChange={(event) => onPayloadChange(field.key, event.target.checked)} /><span><strong>{field.label}</strong><small>Bắt buộc xác nhận trước khi nộp</small></span></>
                  ) : (
                    <><span>{field.label}{field.required === false ? <small> · không bắt buộc</small> : <b> *</b>}</span>
                    {field.kind === "textarea" ? <textarea value={String(payload[field.key] ?? "")} onChange={(event) => onPayloadChange(field.key, event.target.value)} rows={5} placeholder="Nhập câu trả lời có căn cứ…" /> : <input type={field.kind === "number" ? "number" : field.kind === "url" ? "url" : "text"} min={field.min} value={String(payload[field.key] ?? "")} onChange={(event) => onPayloadChange(field.key, field.kind === "number" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value)} placeholder={field.kind === "url" ? "https://…" : "Nhập thông tin…"} />}
                    {field.minLength ? <small>Tối thiểu {field.minLength} ký tự</small> : null}</>
                  )}
                </label>
              ))}
            </div>
          </section>

          <section className="ocop-output-section">
            <div className="ocop-subheading"><div><span className="ocop-step-chip">2</span><span><strong>Tải minh chứng</strong><small>Ảnh hoặc PDF thật, tối đa theo yêu cầu từng mục.</small></span></div><span>{unattachedAssets.length} tệp đã tải</span></div>
            <div className="ocop-evidence-list">
              {detail.evidenceRequirements.map((requirement) => {
                const assets = unattachedAssets.filter((asset) => asset.code === requirement.code);
                return (
                  <div className="ocop-evidence-item" key={requirement.code}>
                    <div><span className="ocop-evidence-code">{requirement.code}</span><div><strong>{requirement.title}{requirement.required ? " *" : ""}</strong><small>{requirement.description}</small></div></div>
                    {assets.map((asset) => <span className="ocop-uploaded-file" key={asset.id}><Icon name="file" size={15} />{asset.name}</span>)}
                    <label className="ocop-upload-button"><Icon name="upload" size={17} />{busy === `upload-${requirement.code}` ? "Đang tải…" : assets.length ? "Thêm tệp" : "Chọn tệp"}<input type="file" accept={requirement.allowedMimeTypes.join(",")} disabled={Boolean(busy)} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(requirement, file); event.currentTarget.value = ""; }} /></label>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="ocop-form-actions"><button className="ocop-secondary-button" onClick={onSave} disabled={Boolean(busy)}><Icon name="save" size={18} />{busy === "save" ? "Đang lưu…" : "Lưu bản nháp"}</button><button className="ocop-primary-button" onClick={onSubmit} disabled={Boolean(busy)}>{busy === "submit" ? "Đang kiểm tra…" : "Kiểm tra và nộp bài"}<Icon name="arrow" size={18} /></button></div>
        </>
      ) : null}
    </div>
  );
}

function LearnerDashboard({ journey, onRefresh, onLogout }: { journey: Journey; onRefresh: () => Promise<void>; onLogout: () => Promise<void> }) {
  const [selectedCode, setSelectedCode] = useState(journey.nextAction?.taskCode ?? journey.tasks[0]?.code ?? "");
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadDetail = useCallback(async (code: string) => {
    setDetail(null);
    try {
      const task = await api<TaskDetail>(`/api/ocop/tasks/${encodeURIComponent(code)}`);
      setDetail(task);
      setPayload(task.draft?.payload ?? task.submissions[0]?.payload ?? {});
    } catch (cause) {
      setNotice({ type: "error", message: cause instanceof Error ? cause.message : "Không tải được nội dung bước." });
    }
  }, []);

  useEffect(() => {
    if (selectedCode) void Promise.resolve().then(() => loadDetail(selectedCode));
  }, [loadDetail, selectedCode]);

  const selectedTask = journey.tasks.find((task) => task.code === selectedCode);
  const acceptedCount = journey.tasks.filter((task) => task.state === "ACCEPTED").length;
  const stageGroups = useMemo(() => journey.stages.map((stage) => ({ ...stage, tasks: journey.tasks.filter((task) => task.stage.code === stage.code) })), [journey]);

  async function runAction(name: string, action: () => Promise<unknown>, success: string) {
    setBusy(name);
    setNotice(null);
    try {
      await action();
      setNotice({ type: "success", message: success });
      await onRefresh();
      await loadDetail(selectedCode);
    } catch (cause) {
      setNotice({ type: "error", message: cause instanceof Error ? cause.message : "Thao tác chưa thành công." });
    } finally {
      setBusy("");
    }
  }

  function startTask() {
    if (!detail?.progress) return;
    void runAction("start", () => api(`/api/ocop/tasks/${encodeURIComponent(detail.code)}/start`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), expectedVersion: detail.progress?.version }) }), "Đã mở biểu mẫu. Bắt đầu làm từng mục nhé.");
  }

  function saveDraft() {
    if (!detail) return;
    void runAction("save", () => api(`/api/ocop/drafts/${encodeURIComponent(detail.code)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), expectedVersion: detail.draft?.version ?? 0, payload }) }), "Đã lưu bản nháp an toàn.");
  }

  function submitTask() {
    if (!detail?.progress) return;
    if (!window.confirm("Nộp sản phẩm đầu ra và minh chứng để mentor xác minh?")) return;
    const evidenceAssetIds = detail.evidenceAssets.filter((asset) => !asset.submissionId).map((asset) => asset.id);
    void runAction("submit", () => api("/api/ocop/submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ taskCode: detail.code, idempotencyKey: crypto.randomUUID(), expectedVersion: detail.progress?.version, payload, evidenceAssetIds }) }), "Đã nộp bài. Mentor sẽ xác minh trước khi mở bước tiếp theo.");
  }

  function uploadEvidence(requirement: TaskDetail["evidenceRequirements"][number], file: File) {
    if (!detail) return;
    const form = new FormData();
    form.set("file", file);
    form.set("taskCode", detail.code);
    form.set("evidenceCode", requirement.code);
    form.set("idempotencyKey", crypto.randomUUID());
    void runAction(`upload-${requirement.code}`, () => api("/api/ocop/evidence/upload", { method: "POST", body: form }), `Đã tải ${file.name}.`);
  }

  return (
    <div className="ocop-app-shell">
      <header className="ocop-app-header"><Brand /><div className="ocop-user-menu"><span><small>Học viên</small><strong>{journey.learner.displayName}</strong></span><span className="ocop-avatar">{journey.learner.displayName.trim().charAt(0)}</span><button onClick={() => void onLogout()} title="Đăng xuất"><Icon name="logout" size={20} /></button></div></header>
      <main className="ocop-dashboard">
        <section className="ocop-dashboard-hero">
          <div><span className="ocop-pill light"><Icon name="spark" size={16} /> {journey.cohort.name}</span><h1>Chào {journey.learner.displayName.split(" ").slice(-2).join(" ")},<br /><em>hôm nay mình làm bước nào?</em></h1><p>{journey.enrollment.productName} · {journey.enrollment.organizationName}</p></div>
          <div className="ocop-progress-card">
            <div className="ocop-progress-ring" style={{ "--progress": `${journey.progress.acceptedPercent * 3.6}deg` } as React.CSSProperties}><span><strong>{journey.progress.acceptedPercent}%</strong><small>đã xác minh</small></span></div>
            <div><span>Tiến độ hành trình</span><strong>{acceptedCount}/{journey.tasks.length} bước đã đạt</strong><small>{journey.progress.submittedPercent > journey.progress.acceptedPercent ? `${journey.progress.submittedPercent - journey.progress.acceptedPercent}% đang chờ mentor duyệt` : "Tiếp tục bước được mở bên dưới"}</small></div>
          </div>
        </section>

        {journey.certificate ? <a className="ocop-certificate-banner" href={`/certificate/${journey.certificate.publicId}`}><span><Icon name="check" size={22} /></span><div><strong>Chứng chỉ của bạn đã sẵn sàng</strong><small>Mã {journey.certificate.publicId} · Nhấn để xem và kiểm chứng</small></div><Icon name="arrow" /></a> : null}

        {notice ? <div className={`ocop-notice ${notice.type}`} role="status">{notice.type === "success" ? <Icon name="check" size={18} /> : <span>!</span>}{notice.message}<button onClick={() => setNotice(null)}>×</button></div> : null}

        <div className="ocop-workspace">
          <aside className="ocop-roadmap-panel">
            <div className="ocop-panel-heading"><div><span className="ocop-overline">Bản đồ của bạn</span><h2>Hành trình 30 ngày</h2></div><span>{acceptedCount}/{journey.tasks.length}</span></div>
            <div className="ocop-stage-timeline">
              {stageGroups.map((stage, stageIndex) => {
                const stageAccepted = stage.tasks.filter((task) => task.state === "ACCEPTED").length;
                return (
                  <section className="ocop-stage-group" key={stage.code}>
                    <div className="ocop-stage-title"><span className={stageAccepted === stage.tasks.length ? "complete" : ""}>{stageAccepted === stage.tasks.length ? <Icon name="check" size={15} /> : stageIndex + 1}</span><div><small>{STAGE_COPY[stage.code]?.kicker}</small><strong>{stage.title}</strong></div><em>{stageAccepted}/{stage.tasks.length}</em></div>
                    <div className="ocop-stage-tasks">
                      {stage.tasks.map((task) => (
                        <button key={task.code} className={`ocop-roadmap-task ${selectedCode === task.code ? "selected" : ""} state-${task.state.toLowerCase()}`} onClick={() => setSelectedCode(task.code)}>
                          <span className="ocop-task-state-icon"><Icon name={STATE_META[task.state].icon} size={16} /></span>
                          <span><strong>{task.title}</strong><small>{task.estimateMinutes} phút · {task.gateCode}</small></span>
                          <em>{STATE_META[task.state].short}</em>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </aside>
          <section className="ocop-detail-panel">
            {detail && selectedTask ? <TaskForm detail={detail} payload={payload} onPayloadChange={(key, value) => setPayload((current) => ({ ...current, [key]: value }))} onStart={startTask} onSave={saveDraft} onSubmit={submitTask} onUpload={uploadEvidence} busy={busy} /> : <div className="ocop-detail-loading"><span /><span /><span /></div>}
          </section>
        </div>
      </main>
    </div>
  );
}

export function LearnerPortal({ program, curriculum }: { program: Program; curriculum: CurriculumStage[] }) {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [status, setStatus] = useState<"loading" | "guest" | "learner">("loading");
  const [fatalError, setFatalError] = useState("");

  const loadJourney = useCallback(async () => {
    try {
      const data = await api<Journey>("/api/ocop/journey");
      setJourney(data);
      setStatus("learner");
      setFatalError("");
    } catch (cause) {
      if (cause instanceof ApiFailure && cause.status === 401) {
        setJourney(null);
        setStatus("guest");
      } else {
        setFatalError(cause instanceof Error ? cause.message : "Không tải được hành trình.");
        setStatus("guest");
      }
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadJourney); }, [loadJourney]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setJourney(null);
    setStatus("guest");
  }

  if (status === "loading") return <div className="ocop-loading-screen"><Brand /><div><span /><span /><span /></div><p>Đang mở bản đồ học tập…</p></div>;
  if (status === "learner" && journey) return <LearnerDashboard journey={journey} onRefresh={loadJourney} onLogout={logout} />;
  return <>{fatalError ? <div className="ocop-global-error">{fatalError}</div> : null}<GuestView program={program} curriculum={curriculum} onLoggedIn={loadJourney} /></>;
}
