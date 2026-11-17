"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { LockIcon, SendIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import { RecipientEmail } from "./contact-email";
import type { ContactResponse } from "@/app/api/contact/route";
import {
  CONTACT_LIMITS,
  type ContactField,
  type ContactFieldErrors,
} from "@/lib/validation/contact-limits";

const rowClass =
  "grid grid-cols-[5.75rem_1fr] items-center border-b border-line px-4 md:grid-cols-[7rem_1fr] md:px-5";
const labelClass = "text-[0.9375rem] text-muted";
const inputClass =
  "min-h-12 w-full bg-transparent text-base text-foreground placeholder:text-muted/70 focus:outline-none";

type Status =
  | { type: "idle" }
  | { type: "sending" }
  | { type: "success" }
  | { type: "error"; message: string };

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const fieldOrder: ContactField[] = ["name", "email", "organization", "subject", "body"];

/**
 * 메일 작성 화면처럼 구성한 문의 폼.
 * 받는 사람은 이름을 고정 표시하고, 관리자가 공개 이메일을 정해 두었으면 그 주소와 복사 버튼을 함께 보인다.
 * 폼이 실제로 메일을 보내는 수신 주소는 서버 환경 변수(CONTACT_TO)에만 둔다.
 */
export function ContactForm({
  recipientName,
  recipientEmail,
}: {
  recipientName: string;
  recipientEmail?: string;
}) {
  const statusRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const sendingRef = useRef(false);
  const errorIdPrefix = useId();

  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  // Turnstile 은 서버에 환경 변수가 있을 때만 켠다. 설정은 요청 시점의 값을 받아 온다.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/contact")
      .then((response) => (response.ok ? response.json() : null))
      .then((config: { turnstileSiteKey: string | null } | null) => {
        if (!cancelled && config?.turnstileSiteKey) setTurnstileSiteKey(config.turnstileSiteKey);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!turnstileSiteKey) return;
    const sitekey = turnstileSiteKey;

    function render() {
      if (!window.turnstile || !turnstileRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey,
        callback: (token) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      });
    }

    if (window.turnstile) {
      render();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [turnstileSiteKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // 전송 중에 다시 누르는 것을 막는다(버튼 비활성화와 별개로 한 번 더 확인).
    if (sendingRef.current) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const values = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      organization: String(data.get("organization") ?? ""),
      subject: String(data.get("subject") ?? ""),
      body: String(data.get("body") ?? ""),
      website: String(data.get("website") ?? ""),
      turnstileToken,
    };

    // 서버와 같은 스키마로 먼저 검증한다. 스키마는 전송할 때만 불러와 첫 화면 자바스크립트를 줄인다.
    const { contactSchema, toFieldErrors } = await import("@/lib/validation/contact");
    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = toFieldErrors(parsed.error);
      setErrors(fieldErrors);
      setStatus({ type: "error", message: "입력한 내용을 다시 확인해 주세요." });
      focusFirstError(form, fieldErrors);
      return;
    }

    if (turnstileSiteKey && !turnstileToken) {
      setErrors({});
      setStatus({ type: "error", message: "자동 입력 방지 확인을 완료해 주세요." });
      return;
    }

    sendingRef.current = true;
    setErrors({});
    setStatus({ type: "sending" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = (await response.json().catch(() => null)) as ContactResponse | null;

      if (result?.ok) {
        form.reset();
        setStatus({ type: "success" });
      } else {
        const fieldErrors = result?.fieldErrors ?? {};
        setErrors(fieldErrors);
        setStatus({
          type: "error",
          message: result?.message ?? "메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.",
        });
        focusFirstError(form, fieldErrors);
      }
    } catch {
      setStatus({
        type: "error",
        message: "네트워크 문제로 보내지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.",
      });
    } finally {
      sendingRef.current = false;
      // Turnstile 토큰은 한 번만 쓸 수 있어서 매번 새로 받는다.
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
        setTurnstileToken("");
      }
    }
  }

  function focusFirstError(form: HTMLFormElement, fieldErrors: ContactFieldErrors) {
    const first = fieldOrder.find((field) => fieldErrors[field]);
    if (!first) return;
    const element = form.elements.namedItem(first);
    if (element instanceof HTMLElement) element.focus();
  }

  // 결과 안내가 화면 밖에 있으면 보이는 위치로 옮긴다(모바일 키보드에 가려지는 경우 대비).
  useEffect(() => {
    if (status.type === "success") {
      statusRef.current?.focus();
    }
  }, [status.type]);

  const sending = status.type === "sending";
  const errorId = (field: ContactField) => `${errorIdPrefix}-${field}-error`;
  const describedBy = (field: ContactField) => (errors[field] ? errorId(field) : undefined);

  if (status.type === "success") {
    return (
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        className="rounded-xl border border-line bg-surface p-6 focus:outline-none md:p-8"
      >
        <p className="inline-flex items-center rounded-md bg-success-soft px-2.5 py-1 text-sm font-semibold text-success">
          전송 완료
        </p>
        <p className="mt-3 text-xl font-bold tracking-tight">문의가 전달되었습니다.</p>
        <p className="mt-2 text-muted">
          확인한 뒤 적어 주신 메일 주소로 답장드리겠습니다. 감사합니다.
        </p>
        <button
          type="button"
          onClick={() => setStatus({ type: "idle" })}
          className={buttonClass("secondary", "mt-5")}
        >
          새 문의 작성
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={sending}
      className="overflow-hidden rounded-xl border border-line bg-surface focus-within:border-line-strong"
    >
      <div className={rowClass}>
        <span className={labelClass}>받는 사람</span>
        <div className="flex min-h-12 flex-wrap items-center gap-x-2 py-1 font-medium">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2.5 py-1 text-[0.9375rem]">
            {recipientName}
            <LockIcon width={14} height={14} className="text-muted" />
            <span className="sr-only">(고정, 수정할 수 없음)</span>
          </span>
          {recipientEmail ? <RecipientEmail email={recipientEmail} /> : null}
        </div>
      </div>

      <Row
        label="보내는 사람"
        htmlFor="contact-name"
        error={errors.name}
        errorId={errorId("name")}
      >
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={CONTACT_LIMITS.name}
          placeholder="이름"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy("name")}
          className={inputClass}
        />
      </Row>
      <Row label="메일 주소" htmlFor="contact-email" error={errors.email} errorId={errorId("email")}>
        <input
          id="contact-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={CONTACT_LIMITS.email}
          placeholder="답장받을 메일 주소"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy("email")}
          className={inputClass}
        />
      </Row>
      <Row
        label={
          <>
            소속 <span className="text-[0.8125rem]">(선택)</span>
          </>
        }
        htmlFor="contact-organization"
        error={errors.organization}
        errorId={errorId("organization")}
      >
        <input
          id="contact-organization"
          name="organization"
          type="text"
          autoComplete="organization"
          maxLength={CONTACT_LIMITS.organization}
          placeholder="회사나 팀 이름"
          aria-invalid={Boolean(errors.organization)}
          aria-describedby={describedBy("organization")}
          className={inputClass}
        />
      </Row>
      <Row label="제목" htmlFor="contact-subject" error={errors.subject} errorId={errorId("subject")}>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          required
          maxLength={CONTACT_LIMITS.subject}
          placeholder="문의 제목"
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={describedBy("subject")}
          className={inputClass}
        />
      </Row>

      {/* 허니팟: 사람에게는 보이지 않고 키보드로도 닿지 않는다. 값이 채워지면 서버가 봇으로 판단한다. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-website">이 칸은 비워 두세요</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="px-4 pt-3 md:px-5">
        <label htmlFor="contact-body" className="sr-only">
          내용
        </label>
        <textarea
          id="contact-body"
          name="body"
          required
          rows={7}
          maxLength={CONTACT_LIMITS.bodyMax}
          placeholder="내용을 적어 주세요."
          aria-invalid={Boolean(errors.body)}
          aria-describedby={describedBy("body")}
          className="block w-full resize-y bg-transparent text-base leading-[1.7] text-foreground placeholder:text-muted/70 focus:outline-none"
        />
        {errors.body ? (
          <p id={errorId("body")} className="pb-2 text-sm font-medium text-danger">
            {errors.body}
          </p>
        ) : null}
      </div>

      {turnstileSiteKey ? <div ref={turnstileRef} className="px-4 pb-3 md:px-5" /> : null}

      <div className="border-t border-line px-4 py-3 md:px-5">
        <div
          ref={statusRef}
          role="alert"
          aria-live="assertive"
          className={
            status.type === "error"
              ? "mb-3 rounded-lg bg-danger-soft px-3.5 py-2.5 text-[0.9375rem] font-medium text-danger"
              : "sr-only"
          }
        >
          {status.type === "error" ? status.message : ""}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">적어 주신 메일 주소로 답장드립니다.</p>
          <button
            type="submit"
            disabled={sending}
            className={buttonClass("primary", "w-full sm:w-auto sm:min-w-28")}
          >
            <SendIcon width={18} height={18} />
            {sending ? "보내는 중…" : "보내기"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Row({
  label,
  htmlFor,
  error,
  errorId,
  children,
}: {
  label: React.ReactNode;
  htmlFor: string;
  error?: string;
  errorId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-line">
      <div className="grid grid-cols-[5.75rem_1fr] items-center px-4 md:grid-cols-[7rem_1fr] md:px-5">
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
        {children}
      </div>
      {error ? (
        <p
          id={errorId}
          className="-mt-1 pb-2 pl-[calc(5.75rem+1rem)] text-sm font-medium text-danger md:pl-[calc(7rem+1.25rem)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
