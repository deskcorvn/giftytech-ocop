"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { EasyLearnerApp } from "@/components/easy-learner-app";
import { StaffPortal } from "@/components/staff-portal";
import { api, ApiFailure, Brand, Icon } from "@/components/portal-kit";

type User = { id: string; username: string; displayName: string; role: "LEARNER" | "MENTOR" | "COORDINATOR" | "ADMIN" };
type Journey = Parameters<typeof EasyLearnerApp>[0]["journey"];

const FIVE_STAGES = [
  ["01", "Chuẩn bị dữ liệu", "Kiểm kê thông tin thật đang có"],
  ["02", "Ngày đào tạo", "Tạo hồ sơ, nội dung và hình ảnh mẫu"],
  ["03", "Ứng dụng 7 ngày", "Đăng thật, trả lời thật, ghi nhận thật"],
  ["04", "Đồng hành ngày 30", "Chuẩn hóa và duy trì thói quen"],
  ["05", "Đánh giá & hỗ trợ", "Chốt kết quả và hướng đi tiếp"],
] as const;

function GuestPortal({ onLoggedIn }: { onLoggedIn: () => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const login = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) });
      await onLoggedIn();
    } catch (reason) {
      setError(reason instanceof ApiFailure ? reason.message : "Chưa thể đăng nhập. Anh/chị vui lòng thử lại.");
    } finally { setBusy(false); }
  };

  return (
    <div className="guest-shell">
      <header className="guest-header"><Brand /><div className="guest-help"><Icon name="help" size={20} /><span>Cần hỗ trợ? <strong>Gọi điều phối viên lớp</strong></span></div></header>
      <main className="guest-main">
        <section className="guest-intro">
          <span className="guest-eyebrow">CHƯƠNG TRÌNH OCOP 30 NGÀY</span>
          <h1>Mỗi lần một việc.<br /><em>Làm theo là được.</em></h1>
          <p>Hệ thống hướng dẫn từng bước bằng chữ lớn, có mẫu sẵn và mentor kiểm tra. Anh/chị chỉ cần điện thoại, thông tin thật của sản phẩm và tài khoản ChatGPT.</p>
          <div className="guest-promises"><span><Icon name="check" size={23} /> Không cần giỏi công nghệ</span><span><Icon name="check" size={23} /> Không phải nhớ toàn bộ giáo án</span><span><Icon name="check" size={23} /> Chỉ mở bước mới khi bài trước đã đạt</span></div>
        </section>
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-icon"><Icon name="user" size={32} /></div>
          <h2 id="login-title">Vào hành trình của tôi</h2>
          <p>Dùng tài khoản do lớp học cung cấp.</p>
          <form onSubmit={login}>
            <label><span>Tên đăng nhập</span><input autoComplete="username" autoCapitalize="none" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Ví dụ: quanghai.learner" required /></label>
            <label><span>Mật khẩu</span><div className="password-field"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" minLength={8} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}><Icon name="eye" size={22} /></button></div></label>
            {error ? <div className="login-error" role="alert"><Icon name="warning" size={21} />{error}</div> : null}
            <button className="easy-primary-button" disabled={busy}>{busy ? "Đang đăng nhập…" : "Bắt đầu làm từng bước"}<Icon name="arrow" size={23} /></button>
          </form>
          <small><Icon name="lock" size={17} /> Bài làm và minh chứng của anh/chị được lưu riêng tư.</small>
        </section>
      </main>
      <section className="guest-roadmap" aria-label="Năm chặng chương trình"><div className="guest-roadmap-heading"><span>BẢN ĐỒ HÀNH TRÌNH</span><strong>5 chặng · 10 việc · 30 ngày</strong></div><div className="guest-stage-list">{FIVE_STAGES.map(([number, title, description]) => <article key={number}><span>{number}</span><div><strong>{title}</strong><small>{description}</small></div></article>)}</div></section>
      <footer className="guest-footer">GiftyID · Đồng hành OCOP Hải Phòng <span>Học thật · Làm thật · Minh chứng thật</span></footer>
    </div>
  );
}

export function LearnerPortal() {
  const [user, setUser] = useState<User | null>(null);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");

  const refresh = useCallback(async () => {
    setFatalError("");
    try {
      const me = await api<{ user: User }>("/api/ocop/me");
      setUser(me.user);
      if (me.user.role === "LEARNER") setJourney(await api<Journey>("/api/ocop/journey"));
      else setJourney(null);
    } catch (error) {
      if (error instanceof ApiFailure && error.status === 401) { setUser(null); setJourney(null); }
      else setFatalError(error instanceof Error ? error.message : "Không thể tải hành trình.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null); setJourney(null);
  };

  if (loading) return <div className="easy-loading"><Brand /><span /><strong>Đang mở hành trình của anh/chị…</strong></div>;
  if (fatalError) return <div className="easy-fatal"><Icon name="warning" size={48} /><h1>Chưa mở được hành trình</h1><p>{fatalError}</p><button onClick={() => { setLoading(true); void refresh(); }}><Icon name="refresh" size={22} /> Thử lại</button></div>;
  if (!user) return <GuestPortal onLoggedIn={refresh} />;
  if (user.role !== "LEARNER") return <StaffPortal user={user} onLogout={logout} />;
  if (!journey) return <div className="easy-fatal"><Icon name="warning" size={48} /><h1>Chưa có lớp học</h1><p>Tài khoản chưa được xếp vào chương trình. Vui lòng liên hệ điều phối viên.</p><button onClick={() => void logout()}>Đăng xuất</button></div>;
  return <EasyLearnerApp journey={journey} onRefresh={refresh} onLogout={logout} />;
}
