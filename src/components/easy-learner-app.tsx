"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, Brand, formatDateTime, humanFileSize, Icon } from "@/components/portal-kit";

type TaskState = "LOCKED" | "READY" | "IN_PROGRESS" | "SUBMITTED" | "REVISION_REQUIRED" | "ACCEPTED";

type JourneyTask = {
  code: string;
  title: string;
  objective: string;
  promise: string;
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
  submittedAt?: string;
  review?: { decision: string; feedback: string; score: number | null; reviewedAt: string } | null;
};

export type LearnerJourney = {
  learner: { id: string; username: string; displayName: string };
  enrollment: { id: string; status: string; organizationName: string; productName: string; province: string; primaryChannel: string };
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

type LearningContent = {
  promise: string;
  whyItMatters: string;
  prepare: string[];
  microSteps: Array<{ title: string; detail: string }>;
  chatgpt: { purpose: string; prompt: string; reminder: string };
  selfCheck: string[];
  commonMistakes: string[];
  mentorCriteria: string[];
  fieldHints: Record<string, string>;
  sample?: { title: string; note: string; data: Record<string, unknown> } | null;
};

type EvidenceRequirement = {
  code: string;
  title: string;
  description: string;
  required: boolean;
  allowedMimeTypes: string[];
  maxSizeBytes: number;
  maxFiles: number;
};

type EvidenceAsset = { id: string; code: string; name: string; mimeType: string; sizeBytes: number; submissionId: string | null; createdAt: string };

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
  contentSchema: LearningContent;
  aiContext: {
    learnerName: string;
    organizationName: string;
    productName: string;
    province: string;
    primaryChannel?: string | null;
    approvedFacts?: unknown;
    pendingFacts?: unknown;
    previousOutputs: Record<string, Record<string, unknown>>;
  };
  evidenceRequirements: EvidenceRequirement[];
  evidenceAssets: EvidenceAsset[];
  progress: { state: TaskState; version: number } | null;
  draft: { version: number; payload: Record<string, unknown>; updatedAt?: string } | null;
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

type SpeechRecognitionResultEventLike = { results: ArrayLike<{ 0: { transcript: string } }> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const TASK_STATE_LABEL: Record<TaskState, string> = {
  LOCKED: "Chưa đến bước này",
  READY: "Sẵn sàng",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Mentor đang kiểm tra",
  REVISION_REQUIRED: "Cần bổ sung",
  ACCEPTED: "Đã hoàn thành",
};

const LESSON_STEPS = [
  { id: "guide", label: "Hiểu việc", icon: "home" },
  { id: "chatgpt", label: "Làm cùng AI", icon: "chat" },
  { id: "form", label: "Điền kết quả", icon: "pencil" },
  { id: "evidence", label: "Nộp minh chứng", icon: "camera" },
] as const;

type LessonStep = (typeof LESSON_STEPS)[number]["id"];

function valueToText(value: unknown) {
  if (value === true) return "Đã xác nhận";
  if (value === false) return "Chưa xác nhận";
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value ?? "");
}

function flattenPromptValues(detail: TaskDetail, payload: Record<string, unknown>) {
  const previous = Object.values(detail.aiContext.previousOutputs ?? {}).reduce<Record<string, unknown>>((result, item) => ({ ...result, ...(item ?? {}) }), {});
  return {
    ...detail.aiContext,
    ...previous,
    ...payload,
    approvedFacts: valueToText(detail.aiContext.approvedFacts),
    restrictedFacts: valueToText(detail.aiContext.pendingFacts),
    draftData: valueToText(payload),
    completedOutputs: valueToText(detail.aiContext.previousOutputs),
  };
}

function buildPrompt(detail: TaskDetail, payload: Record<string, unknown>) {
  const values = flattenPromptValues(detail, payload);
  return detail.contentSchema.chatgpt.prompt.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const value = values[key.trim() as keyof typeof values];
    const text = valueToText(value).trim();
    return text && text !== "{}" ? text : `[HÃY ĐIỀN: ${key.trim()}]`;
  });
}

function TopHeader({ journey, largeType, onToggleType, onOpenMap, onOpenHelp, onLogout }: {
  journey: LearnerJourney;
  largeType: boolean;
  onToggleType: () => void;
  onOpenMap: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="easy-header">
      <Brand compact />
      <div className="easy-header-actions">
        <button onClick={onToggleType} className={largeType ? "active" : ""} aria-pressed={largeType}><span className="easy-aa">A</span> Chữ lớn</button>
        <button onClick={onOpenMap}><Icon name="map" size={21} /> <span>Lộ trình</span></button>
        <button onClick={onOpenHelp}><Icon name="help" size={21} /> <span>Trợ giúp</span></button>
        <span className="easy-user-name">{journey.learner.displayName}</span>
        <button onClick={onLogout} title="Đăng xuất"><Icon name="logout" size={21} /><span className="sr-only">Đăng xuất</span></button>
      </div>
    </header>
  );
}

function ProgressBar({ journey }: { journey: LearnerJourney }) {
  const accepted = journey.tasks.filter((task) => task.state === "ACCEPTED").length;
  return (
    <div className="easy-progress" aria-label={`Đã hoàn thành ${accepted} trên ${journey.tasks.length} bước`}>
      <div><span style={{ width: `${journey.progress.acceptedPercent}%` }} /></div>
      <strong>{accepted}/{journey.tasks.length} bước đã hoàn thành</strong>
      <span>{journey.progress.acceptedPercent}%</span>
    </div>
  );
}

function WaitingCard({ task, onOpenHelp }: { task: JourneyTask; onOpenHelp: () => void }) {
  const expected = task.submittedAt ? new Date(new Date(task.submittedAt).getTime() + 24 * 60 * 60 * 1000) : null;
  return (
    <section className="easy-waiting-card">
      <span className="easy-round-icon blue"><Icon name="clock" size={30} /></span>
      <div>
        <span className="easy-eyebrow">Bài đã được gửi thành công</span>
        <h2>Mentor đang kiểm tra “{task.title}”</h2>
        <p>Bạn chưa cần làm thêm. Khi bài đạt, bước tiếp theo sẽ tự mở.</p>
        {expected ? <div className="easy-sla"><strong>Dự kiến phản hồi</strong><span>Trước {formatDateTime(expected)}</span></div> : null}
        <button className="easy-secondary-button" onClick={onOpenHelp}><Icon name="help" size={22} /> Tôi cần được hỗ trợ</button>
      </div>
    </section>
  );
}

function HomeView({ journey, currentTask, onStart, onOpenMap, onOpenHelp }: {
  journey: LearnerJourney;
  currentTask: JourneyTask | null;
  onStart: () => void;
  onOpenMap: () => void;
  onOpenHelp: () => void;
}) {
  const firstName = journey.learner.displayName.trim().split(/\s+/).slice(-2).join(" ");
  if (journey.certificate) {
    return (
      <main className="easy-main easy-home-main">
        <ProgressBar journey={journey} />
        <section className="easy-complete-card">
          <span className="easy-round-icon gold"><Icon name="award" size={34} /></span>
          <span className="easy-eyebrow">Bạn đã hoàn thành hành trình</span>
          <h1>Chúc mừng {firstName}!</h1>
          <p>Toàn bộ đầu ra đã được xác minh và lưu trong snapshot chứng chỉ.</p>
          <a className="easy-primary-button" href={`/certificate/${journey.certificate.publicId}`}>Xem chứng chỉ của tôi <Icon name="arrow" size={23} /></a>
        </section>
      </main>
    );
  }

  if (!currentTask) {
    return (
      <main className="easy-main easy-home-main">
        <ProgressBar journey={journey} />
        <section className="easy-complete-card">
          <span className="easy-round-icon green"><Icon name="check" size={34} /></span>
          <h1>Bạn đã làm xong tất cả các bước</h1>
          <p>Ban tổ chức đang chốt kết quả và phát hành chứng chỉ. Bạn sẽ thấy chứng chỉ tại đây sau khi hoàn tất.</p>
          <button className="easy-secondary-button" onClick={onOpenHelp}>Hỏi ban tổ chức</button>
        </section>
      </main>
    );
  }

  if (currentTask.state === "SUBMITTED") return <main className="easy-main easy-home-main"><ProgressBar journey={journey} /><WaitingCard task={currentTask} onOpenHelp={onOpenHelp} /></main>;

  return (
    <main className="easy-main easy-home-main">
      <ProgressBar journey={journey} />
      <section className="easy-welcome">
        <span>Chào {firstName}, hôm nay mình chỉ làm <strong>một việc</strong>.</span>
        <h1>{currentTask.state === "REVISION_REQUIRED" ? "Mentor đã gửi góp ý cho bạn" : "Bước tiếp theo của bạn"}</h1>
      </section>
      {currentTask.review?.feedback ? (
        <section className="easy-feedback-banner">
          <span className="easy-round-icon coral"><Icon name="refresh" size={26} /></span>
          <div><strong>Mentor đề nghị bổ sung</strong><p>{currentTask.review.feedback}</p></div>
        </section>
      ) : null}
      <section className="easy-today-card">
        <div className="easy-today-top">
          <span className="easy-step-number">BƯỚC {currentTask.position}/{journey.tasks.length}</span>
          <span className={`easy-status state-${currentTask.state.toLowerCase()}`}>{TASK_STATE_LABEL[currentTask.state]}</span>
        </div>
        <h2>{currentTask.title}</h2>
        <p className="easy-task-promise">{currentTask.promise || currentTask.objective}</p>
        <div className="easy-task-meta"><span><Icon name="clock" size={21} /> Khoảng {currentTask.estimateMinutes} phút</span><span><Icon name="camera" size={21} /> Có minh chứng cần nộp</span></div>
        <button className="easy-primary-button easy-big-button" onClick={onStart}>
          {currentTask.state === "REVISION_REQUIRED" ? "Sửa bài theo góp ý" : currentTask.state === "IN_PROGRESS" ? "Tiếp tục việc đang làm" : "Bắt đầu từng bước"}
          <Icon name="arrow" size={26} />
        </button>
      </section>
      <div className="easy-home-links"><button onClick={onOpenMap}><Icon name="map" size={23} /> Xem toàn bộ lộ trình</button><button onClick={onOpenHelp}><Icon name="help" size={23} /> Tôi chưa biết làm</button></div>
    </main>
  );
}

function StepRail({ current }: { current: LessonStep }) {
  const currentIndex = LESSON_STEPS.findIndex((step) => step.id === current);
  return (
    <nav className="easy-step-rail" aria-label="Các phần của bài học">
      {LESSON_STEPS.map((step, index) => (
        <div key={step.id} className={index < currentIndex ? "done" : index === currentIndex ? "current" : ""}>
          <span>{index < currentIndex ? <Icon name="check" size={17} /> : index + 1}</span>
          <small>{step.label}</small>
        </div>
      ))}
    </nav>
  );
}

function GuideStep({ content, onNext }: { content: LearningContent; onNext: () => void }) {
  const [showMistakes, setShowMistakes] = useState(false);
  return (
    <div className="easy-lesson-section">
      <div className="easy-section-lead"><span className="easy-round-icon green"><Icon name="home" size={29} /></span><div><span className="easy-eyebrow">Phần 1 · Hiểu việc cần làm</span><h2>{content.promise}</h2></div></div>
      <section className="easy-why-box"><strong>Vì sao cần làm việc này?</strong><p>{content.whyItMatters}</p></section>
      <section className="easy-content-block"><h3>Chuẩn bị trước khi bắt đầu</h3><div className="easy-large-checklist">{content.prepare.map((item) => <div key={item}><span><Icon name="check" size={18} /></span><p>{item}</p></div>)}</div></section>
      <section className="easy-content-block"><h3>Làm lần lượt theo các bước nhỏ</h3><div className="easy-micro-steps">{content.microSteps.map((step, index) => <article key={step.title}><span>{index + 1}</span><div><strong>{step.title}</strong><p>{step.detail}</p></div></article>)}</div></section>
      <button className="easy-disclosure" onClick={() => setShowMistakes((value) => !value)} aria-expanded={showMistakes}><Icon name="warning" size={22} /> Những lỗi thường gặp <span>{showMistakes ? "−" : "+"}</span></button>
      {showMistakes ? <ul className="easy-warning-list">{content.commonMistakes.map((item) => <li key={item}>{item}</li>)}</ul> : null}
      <div className="easy-bottom-action"><button className="easy-primary-button easy-big-button" onClick={onNext}>Tôi đã hiểu, sang phần dùng ChatGPT <Icon name="arrow" size={25} /></button></div>
    </div>
  );
}

function ChatGptStep({ detail, payload, onNext, onReturnDetected, notify }: {
  detail: TaskDetail;
  payload: Record<string, unknown>;
  onNext: () => void;
  onReturnDetected: () => void;
  notify: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const prompt = useMemo(() => buildPrompt(detail, payload), [detail, payload]);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      notify("Đã sao chép câu lệnh. Bây giờ bạn có thể mở ChatGPT và dán vào.");
    } catch {
      setShowPrompt(true);
      notify("Hãy nhấn giữ vào câu lệnh bên dưới để sao chép.");
    }
  }

  async function openChatGpt() {
    if (!copied) await copyPrompt();
    sessionStorage.setItem("ocop_left_for_chatgpt", detail.code);
    window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && sessionStorage.getItem("ocop_left_for_chatgpt") === detail.code) {
        sessionStorage.removeItem("ocop_left_for_chatgpt");
        onReturnDetected();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [detail.code, onReturnDetected]);

  return (
    <div className="easy-lesson-section">
      <div className="easy-section-lead"><span className="easy-round-icon purple"><Icon name="spark" size={29} /></span><div><span className="easy-eyebrow">Phần 2 · Làm cùng ChatGPT</span><h2>AI giúp sắp xếp, bạn là người kiểm tra sự thật</h2></div></div>
      <section className="easy-chat-purpose"><p>{detail.contentSchema.chatgpt.purpose}</p></section>
      <div className="easy-chat-steps">
        <article><span>1</span><div><strong>Sao chép câu lệnh đã chuẩn bị</strong><p>Câu lệnh đã có tên sản phẩm và quy tắc không được bịa dữ liệu.</p></div></article>
        <article><span>2</span><div><strong>Mở ChatGPT và dán câu lệnh</strong><p>Chờ ChatGPT trả lời rồi đọc lại, chưa cần tin ngay.</p></div></article>
        <article><span>3</span><div><strong>Quay lại GiftyID</strong><p>Nội dung đang làm đã được giữ. Bạn sẽ tiếp tục đúng phần điền kết quả.</p></div></article>
      </div>
      <div className="easy-chat-actions">
        <button className="easy-secondary-button easy-big-button" onClick={copyPrompt}><Icon name="copy" size={25} /> {copied ? "Đã sao chép" : "1. Sao chép câu lệnh"}</button>
        <button className="easy-primary-button easy-big-button" onClick={openChatGpt}><Icon name="external" size={25} /> 2. Mở ChatGPT</button>
      </div>
      <button className="easy-prompt-preview" onClick={() => setShowPrompt((value) => !value)} aria-expanded={showPrompt}><Icon name="eye" size={22} /> {showPrompt ? "Ẩn câu lệnh" : "Xem câu lệnh trước khi sao chép"}</button>
      {showPrompt ? <pre className="easy-prompt-text">{prompt}</pre> : null}
      <section className="easy-ai-reminder"><Icon name="warning" size={24} /><div><strong>Nhớ kiểm tra lại</strong><p>{detail.contentSchema.chatgpt.reminder}</p></div></section>
      <button className="easy-text-link" onClick={onNext}>Tôi không dùng ChatGPT, chuyển sang tự điền <Icon name="arrow" size={20} /></button>
    </div>
  );
}

function SampleBox({ detail, field }: { detail: TaskDetail; field: DynamicField }) {
  const [open, setOpen] = useState(false);
  const sampleValue = detail.contentSchema.sample?.data?.[field.key];
  if (sampleValue === undefined) return null;
  return (
    <div className="easy-sample-box">
      <button onClick={() => setOpen((value) => !value)} aria-expanded={open}><Icon name="eye" size={21} /> Xem ví dụ Nước mắm Quang Hải <span>{open ? "−" : "+"}</span></button>
      {open ? <div><p>{valueToText(sampleValue)}</p><small>{detail.contentSchema.sample?.note}</small></div> : null}
    </div>
  );
}

function FormStep({ detail, payload, onChange, onNext, notify }: {
  detail: TaskDetail;
  payload: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onNext: () => void;
  notify: (message: string) => void;
}) {
  const [fieldIndex, setFieldIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const field = detail.fieldSchema[fieldIndex];
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const value = payload[field?.key];

  function fieldIsValid() {
    if (!field || field.required === false) return true;
    if (field.kind === "checkbox") return value === true;
    if (field.kind === "number") return typeof value === "number" && value >= (field.min ?? 0);
    const text = String(value ?? "").trim();
    return text.length >= (field.minLength ?? 1);
  }

  function nextField() {
    if (!fieldIsValid()) {
      notify(field.kind === "checkbox" ? "Bạn cần xác nhận mục này trước khi tiếp tục." : `Vui lòng điền đủ “${field.label}”.`);
      return;
    }
    if (fieldIndex < detail.fieldSchema.length - 1) setFieldIndex((index) => index + 1);
    else onNext();
  }

  function startVoice() {
    const browserWindow = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      notify("Điện thoại này chưa hỗ trợ nhập giọng nói trong trình duyệt. Bạn có thể dùng nút micro trên bàn phím.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "vi-VN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      onChange(field.key, `${String(value ?? "").trim()}${value ? " " : ""}${transcript}`.trim());
    };
    recognition.onerror = () => notify("Chưa nghe rõ. Bạn hãy nói lại gần micro hoặc dùng bàn phím.");
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  if (!field) return null;
  return (
    <div className="easy-lesson-section">
      <div className="easy-question-progress"><div><span style={{ width: `${((fieldIndex + 1) / detail.fieldSchema.length) * 100}%` }} /></div><strong>Câu {fieldIndex + 1}/{detail.fieldSchema.length}</strong></div>
      <div className="easy-question-card">
        <span className="easy-eyebrow">Phần 3 · Điền kết quả của bạn</span>
        <h2>{field.label}</h2>
        <p className="easy-field-hint">{detail.contentSchema.fieldHints?.[field.key] ?? "Điền theo dữ liệu thật của sản phẩm. Nếu chưa chắc, hãy ghi rõ cần xác nhận."}</p>
        {field.kind === "checkbox" ? (
          <label className="easy-big-checkbox"><input type="checkbox" checked={value === true} onChange={(event) => onChange(field.key, event.target.checked)} /><span><Icon name="check" size={24} /></span><strong>Tôi xác nhận nội dung này</strong></label>
        ) : field.kind === "textarea" ? (
          <textarea className="easy-answer-input" rows={7} value={String(value ?? "")} onChange={(event) => onChange(field.key, event.target.value)} placeholder="Chạm vào đây để nhập câu trả lời…" autoFocus />
        ) : (
          <input className="easy-answer-input" type={field.kind === "number" ? "number" : field.kind === "url" ? "url" : "text"} min={field.min} value={String(value ?? "")} onChange={(event) => onChange(field.key, field.kind === "number" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value)} placeholder={field.kind === "url" ? "https://…" : "Nhập câu trả lời…"} autoFocus />
        )}
        {field.kind === "text" || field.kind === "textarea" ? <button className={`easy-voice-button ${listening ? "listening" : ""}`} onClick={startVoice} disabled={listening}><Icon name="microphone" size={24} /> {listening ? "Đang nghe…" : "Nói thay vì gõ"}</button> : null}
        <SampleBox detail={detail} field={field} />
      </div>
      <div className="easy-question-actions">
        <button className="easy-secondary-button" onClick={() => setFieldIndex((index) => Math.max(0, index - 1))} disabled={fieldIndex === 0}><Icon name="back" size={23} /> Câu trước</button>
        <button className="easy-primary-button" onClick={nextField}>{fieldIndex === detail.fieldSchema.length - 1 ? "Xong phần điền" : "Câu tiếp theo"}<Icon name="arrow" size={23} /></button>
      </div>
      <p className="easy-autosave-note"><Icon name="save" size={18} /> Nội dung tự lưu trên điện thoại khi bạn chuyển sang ChatGPT hoặc ứng dụng khác.</p>
    </div>
  );
}

function EvidenceStep({ detail, onUpload, onSave, onSubmit, busy, notify }: {
  detail: TaskDetail;
  onUpload: (requirement: EvidenceRequirement, file: File) => void;
  onSave: () => void;
  onSubmit: () => void;
  busy: string;
  notify: (message: string) => void;
}) {
  const [checks, setChecks] = useState<boolean[]>(detail.contentSchema.selfCheck.map(() => false));
  const currentAssets = detail.evidenceAssets.filter((asset) => !asset.submissionId);
  const previousAssets = detail.progress?.state === "REVISION_REQUIRED" ? detail.submissions[0]?.evidence ?? [] : [];
  const allAssets = [...currentAssets, ...previousAssets];
  const missingEvidence = detail.evidenceRequirements.filter((requirement) => requirement.required && !allAssets.some((asset) => asset.code === requirement.code));
  const allChecked = checks.every(Boolean);

  function submitIfReady() {
    if (missingEvidence.length) {
      notify(`Bạn còn thiếu minh chứng: ${missingEvidence.map((item) => item.code).join(", ")}.`);
      return;
    }
    if (!allChecked) {
      notify("Hãy tự kiểm tra và đánh dấu đủ các mục trước khi nộp.");
      return;
    }
    onSubmit();
  }

  return (
    <div className="easy-lesson-section">
      <div className="easy-section-lead"><span className="easy-round-icon green"><Icon name="camera" size={29} /></span><div><span className="easy-eyebrow">Phần 4 · Minh chứng và tự kiểm tra</span><h2>Chụp bằng chứng thật, kiểm tra rồi mới nộp</h2></div></div>
      <section className="easy-content-block"><h3>Minh chứng cần có</h3><div className="easy-evidence-list">{detail.evidenceRequirements.map((requirement) => {
        const files = allAssets.filter((asset) => asset.code === requirement.code);
        return <article key={requirement.code} className={files.length ? "complete" : ""}>
          <div className="easy-evidence-title"><span>{files.length ? <Icon name="check" size={22} /> : <Icon name="camera" size={22} />}</span><div><strong>{requirement.title}</strong><p>{requirement.description}</p></div></div>
          {files.map((asset) => <div className="easy-file-pill" key={asset.id}><Icon name="file" size={19} /><span>{asset.name}</span><small>{humanFileSize(asset.sizeBytes)}</small></div>)}
          <div className="easy-file-actions">
            <label className="easy-secondary-button"><Icon name="camera" size={23} /> Chụp ảnh<input type="file" accept="image/*" capture="environment" disabled={Boolean(busy)} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(requirement, file); event.currentTarget.value = ""; }} /></label>
            <label className="easy-secondary-button"><Icon name="upload" size={23} /> Chọn ảnh/PDF<input type="file" accept={requirement.allowedMimeTypes.join(",")} disabled={Boolean(busy)} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(requirement, file); event.currentTarget.value = ""; }} /></label>
          </div>
        </article>;
      })}</div></section>
      <section className="easy-content-block"><h3>Tự kiểm tra trước khi nộp</h3><p className="easy-check-intro">Đọc từng câu và chỉ đánh dấu khi bạn đã kiểm tra thật.</p><div className="easy-submit-checklist">{detail.contentSchema.selfCheck.map((item, index) => <label key={item}><input type="checkbox" checked={checks[index]} onChange={(event) => setChecks((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.checked : value))} /><span><Icon name="check" size={20} /></span><p>{item}</p></label>)}</div></section>
      <section className="easy-mentor-box"><Icon name="eye" size={25} /><div><strong>Mentor sẽ kiểm tra gì?</strong><ul>{detail.contentSchema.mentorCriteria.map((item) => <li key={item}>{item}</li>)}</ul></div></section>
      <div className="easy-submit-actions"><button className="easy-secondary-button easy-big-button" onClick={onSave} disabled={Boolean(busy)}><Icon name="save" size={24} /> {busy === "save" ? "Đang lưu…" : "Lưu và làm sau"}</button><button className="easy-primary-button easy-big-button" onClick={submitIfReady} disabled={Boolean(busy)}>{busy === "submit" ? "Đang nộp…" : "Nộp để mentor kiểm tra"}<Icon name="arrow" size={25} /></button></div>
      {missingEvidence.length ? <p className="easy-missing-note">Còn thiếu {missingEvidence.length} loại minh chứng bắt buộc.</p> : null}
    </div>
  );
}

function LessonView({ journey, taskCode, onBack, onJourneyRefresh, notify }: {
  journey: LearnerJourney;
  taskCode: string;
  onBack: () => void;
  onJourneyRefresh: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [step, setStep] = useState<LessonStep>("guide");
  const [busy, setBusy] = useState("");

  const loadDetail = useCallback(async () => {
    const result = await api<TaskDetail>(`/api/ocop/tasks/${encodeURIComponent(taskCode)}`);
    setDetail(result);
    const serverPayload = result.draft?.payload ?? result.submissions[0]?.payload ?? {};
    try {
      const local = JSON.parse(localStorage.getItem(`ocop_draft_${journey.enrollment.id}_${taskCode}`) ?? "null") as { payload?: Record<string, unknown> } | null;
      setPayload({ ...serverPayload, ...(local?.payload ?? {}) });
    } catch {
      setPayload(serverPayload);
    }
    if (result.progress?.state === "REVISION_REQUIRED") setStep("form");
    return result;
  }, [journey.enrollment.id, taskCode]);

  useEffect(() => { void Promise.resolve().then(loadDetail).catch((error) => notify(error instanceof Error ? error.message : "Không tải được bài học.")); }, [loadDetail, notify]);

  useEffect(() => {
    if (!detail) return;
    localStorage.setItem(`ocop_draft_${journey.enrollment.id}_${taskCode}`, JSON.stringify({ payload, updatedAt: new Date().toISOString() }));
  }, [detail, journey.enrollment.id, payload, taskCode]);

  async function runAction(name: string, action: () => Promise<unknown>, success: string) {
    setBusy(name);
    try {
      await action();
      notify(success);
      await onJourneyRefresh();
      await loadDetail();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Thao tác chưa thành công.");
      throw error;
    } finally {
      setBusy("");
    }
  }

  function saveDraft() {
    if (!detail) return;
    void runAction("save", () => api(`/api/ocop/drafts/${encodeURIComponent(detail.code)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), expectedVersion: detail.draft?.version ?? 0, payload }),
    }), "Đã lưu bản nháp trên hệ thống.").catch(() => undefined);
  }

  function uploadEvidence(requirement: EvidenceRequirement, file: File) {
    if (!detail) return;
    if (file.size > requirement.maxSizeBytes) {
      notify(`Tệp quá lớn. Tối đa ${humanFileSize(requirement.maxSizeBytes)}.`);
      return;
    }
    const form = new FormData();
    form.set("file", file);
    form.set("taskCode", detail.code);
    form.set("evidenceCode", requirement.code);
    form.set("idempotencyKey", crypto.randomUUID());
    void runAction(`upload-${requirement.code}`, () => api("/api/ocop/evidence/upload", { method: "POST", body: form }), `Đã tải “${file.name}”.`).catch(() => undefined);
  }

  function submitTask() {
    if (!detail?.progress) return;
    if (!window.confirm("Bạn xác nhận dữ liệu và minh chứng đã kiểm tra đúng thực tế?")) return;
    const newEvidence = detail.evidenceAssets.filter((asset) => !asset.submissionId).map((asset) => asset.id);
    const reusableEvidence = detail.progress.state === "REVISION_REQUIRED" ? (detail.submissions[0]?.evidence ?? []).map((asset) => asset.id) : [];
    void runAction("submit", () => api("/api/ocop/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taskCode: detail.code, idempotencyKey: crypto.randomUUID(), expectedVersion: detail.progress?.version, payload, evidenceAssetIds: [...new Set([...newEvidence, ...reusableEvidence])] }),
    }), "Đã nộp bài. Mentor sẽ phản hồi trong khoảng 24 giờ.").then(() => {
      localStorage.removeItem(`ocop_draft_${journey.enrollment.id}_${taskCode}`);
      onBack();
    }).catch(() => undefined);
  }

  if (!detail) return <main className="easy-main"><div className="easy-loading-card"><span /><span /><span /></div></main>;
  return (
    <main className="easy-main easy-lesson-main">
      <div className="easy-lesson-header"><button onClick={onBack} className="easy-back-button"><Icon name="back" size={23} /> Về việc hôm nay</button><div><span>Bước {journey.tasks.find((task) => task.code === detail.code)?.position}/{journey.tasks.length}</span><strong>{detail.title}</strong></div><button onClick={saveDraft} className="easy-save-top"><Icon name="save" size={21} /> Lưu</button></div>
      <StepRail current={step} />
      {detail.submissions[0]?.reviews[0]?.feedback && detail.progress?.state === "REVISION_REQUIRED" ? <section className="easy-feedback-banner lesson"><span className="easy-round-icon coral"><Icon name="refresh" size={26} /></span><div><strong>Mentor muốn bạn bổ sung</strong><p>{detail.submissions[0].reviews[0].feedback}</p></div></section> : null}
      {step === "guide" ? <GuideStep content={detail.contentSchema} onNext={() => setStep("chatgpt")} /> : null}
      {step === "chatgpt" ? <ChatGptStep detail={detail} payload={payload} onNext={() => setStep("form")} onReturnDetected={() => { setStep("form"); notify("Chào mừng bạn quay lại. Hãy điền kết quả đã kiểm tra vào từng câu bên dưới."); }} notify={notify} /> : null}
      {step === "form" ? <FormStep detail={detail} payload={payload} onChange={(key, value) => setPayload((current) => ({ ...current, [key]: value }))} onNext={() => setStep("evidence")} notify={notify} /> : null}
      {step === "evidence" ? <EvidenceStep detail={detail} onUpload={uploadEvidence} onSave={saveDraft} onSubmit={submitTask} busy={busy} notify={notify} /> : null}
    </main>
  );
}

function RoadmapModal({ journey, onClose }: { journey: LearnerJourney; onClose: () => void }) {
  return (
    <div className="easy-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="easy-modal easy-roadmap-modal" role="dialog" aria-modal="true" aria-labelledby="roadmap-title">
        <header><div><span className="easy-eyebrow">Toàn bộ chương trình</span><h2 id="roadmap-title">Lộ trình 30 ngày của bạn</h2></div><button onClick={onClose}><Icon name="close" size={26} /><span className="sr-only">Đóng</span></button></header>
        <ProgressBar journey={journey} />
        <div className="easy-roadmap-list">{journey.stages.map((stage, stageIndex) => <section key={stage.code}><div className="easy-roadmap-stage"><span>{stageIndex + 1}</span><strong>{stage.title}</strong></div>{journey.tasks.filter((task) => task.stage.code === stage.code).map((task) => <article key={task.code} className={`state-${task.state.toLowerCase()}`}><span>{task.state === "ACCEPTED" ? <Icon name="check" size={20} /> : task.state === "LOCKED" ? <Icon name="lock" size={19} /> : task.position}</span><div><strong>{task.title}</strong><small>{TASK_STATE_LABEL[task.state]}</small></div></article>)}</section>)}</div>
        <button className="easy-primary-button easy-big-button" onClick={onClose}>Quay lại việc hôm nay</button>
      </section>
    </div>
  );
}

function HelpModal({ journey, onClose, notify }: { journey: LearnerJourney; onClose: () => void; notify: (message: string) => void }) {
  const [category, setCategory] = useState("Không biết bước tiếp theo");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (description.trim().length < 10) {
      notify("Bạn hãy mô tả thêm một chút để mentor có thể hỗ trợ đúng việc.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/ocop/incidents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cohortId: journey.cohort.id, enrollmentId: journey.enrollment.id, severity: "S3", category, description, idempotencyKey: crypto.randomUUID() }) });
      notify("Đã gửi yêu cầu. Ban tổ chức sẽ phản hồi trong ngày làm việc.");
      onClose();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Chưa gửi được yêu cầu hỗ trợ.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="easy-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="easy-modal easy-help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <header><div><span className="easy-eyebrow">Đừng ngại hỏi</span><h2 id="help-title">Bạn đang cần giúp việc gì?</h2></div><button onClick={onClose}><Icon name="close" size={26} /><span className="sr-only">Đóng</span></button></header>
        <label>Chọn vấn đề<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Không biết bước tiếp theo</option><option>Không sử dụng được ChatGPT</option><option>Không tải được ảnh minh chứng</option><option>Thông tin sản phẩm chưa rõ</option><option>Cần mentor gọi lại</option><option>Vấn đề khác</option></select></label>
        <label>Mô tả ngắn<textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ví dụ: Tôi đã mở ChatGPT nhưng không biết dán câu lệnh vào đâu…" /></label>
        <p className="easy-help-promise"><Icon name="clock" size={21} /> Ban tổ chức phản hồi trong ngày làm việc. Việc đang làm của bạn vẫn được giữ nguyên.</p>
        <button className="easy-primary-button easy-big-button" onClick={submit} disabled={busy}>{busy ? "Đang gửi…" : "Gửi yêu cầu hỗ trợ"}<Icon name="arrow" size={24} /></button>
      </section>
    </div>
  );
}

export function EasyLearnerApp({ journey, onRefresh, onLogout }: { journey: LearnerJourney; onRefresh: () => Promise<void>; onLogout: () => Promise<void> }) {
  const [screen, setScreen] = useState<"home" | "lesson">("home");
  const [activeTaskCode, setActiveTaskCode] = useState(journey.nextAction?.taskCode ?? "");
  const [showMap, setShowMap] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [largeType, setLargeType] = useState(true);
  const [notice, setNotice] = useState("");
  const currentTask = journey.tasks.find((task) => task.code === (journey.nextAction?.taskCode ?? activeTaskCode)) ?? null;

  useEffect(() => {
    Promise.resolve().then(() => setLargeType(localStorage.getItem("ocop_large_type") !== "false"));
  }, []);

  const notify = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => current === message ? "" : current), 6000);
  }, []);

  async function startOrContinue() {
    if (!currentTask) return;
    setActiveTaskCode(currentTask.code);
    if (currentTask.state === "READY") {
      try {
        await api(`/api/ocop/tasks/${encodeURIComponent(currentTask.code)}/start`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), expectedVersion: currentTask.progressVersion }) });
        await onRefresh();
      } catch (error) {
        notify(error instanceof Error ? error.message : "Chưa mở được bài học.");
        return;
      }
    }
    setScreen("lesson");
  }

  function toggleType() {
    setLargeType((value) => {
      localStorage.setItem("ocop_large_type", String(!value));
      return !value;
    });
  }

  return (
    <div className={`easy-app ${largeType ? "easy-large-type" : ""}`}>
      <TopHeader journey={journey} largeType={largeType} onToggleType={toggleType} onOpenMap={() => setShowMap(true)} onOpenHelp={() => setShowHelp(true)} onLogout={() => void onLogout()} />
      {notice ? <div className="easy-toast" role="status"><Icon name="check" size={22} /><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div> : null}
      {screen === "home" ? <HomeView journey={journey} currentTask={currentTask} onStart={() => void startOrContinue()} onOpenMap={() => setShowMap(true)} onOpenHelp={() => setShowHelp(true)} /> : <LessonView journey={journey} taskCode={activeTaskCode} onBack={() => setScreen("home")} onJourneyRefresh={onRefresh} notify={notify} />}
      {showMap ? <RoadmapModal journey={journey} onClose={() => setShowMap(false)} /> : null}
      {showHelp ? <HelpModal journey={journey} onClose={() => setShowHelp(false)} notify={notify} /> : null}
    </div>
  );
}
