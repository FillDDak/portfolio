"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { buttonClass, type ButtonVariant } from "@/components/ui/button";
import { errorClass } from "@/components/ui/field";
import type { ActionResult } from "@/lib/action-result";

type FormContextValue = { pending: boolean; result: ActionResult | null };
const FormContext = createContext<FormContextValue>({ pending: false, result: null });

/**
 * 관리자 폼 공통 틀. Server Action 을 호출하고 성공·실패 메시지를 보여준다.
 * 브라우저 기본 전송 대신 직접 호출해서, 저장에 실패해도 입력한 내용이 지워지지 않는다.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  showStatus = true,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  /** 추가 폼처럼 성공하면 입력 칸을 비워야 할 때 */
  resetOnSuccess?: boolean;
  /** 순서 변경 버튼처럼 성공 메시지가 필요 없을 때 false */
  showStatus?: boolean;
  onSuccess?: (result: ActionResult) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return; // 중복 전송 방지
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(form, submitter);

    startTransition(async () => {
      try {
        const next = await action(formData);
        setResult(next);
        if (next.ok) {
          if (resetOnSuccess) form.reset();
          onSuccess?.(next);
          // 목록과 다른 폼이 최신 데이터로 다시 그려지게 한다.
          router.refresh();
        }
      } catch {
        setResult({
          ok: false,
          message: "요청을 처리하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.",
        });
      }
    });
  }

  return (
    <FormContext.Provider value={{ pending, result }}>
      <form onSubmit={handleSubmit} noValidate className={className} aria-busy={pending}>
        {children}
        {showStatus ? <FormStatus /> : <FormErrorOnly />}
      </form>
    </FormContext.Provider>
  );
}

/** 성공·실패 메시지 */
export function FormStatus() {
  const { result } = useContext(FormContext);
  const message = result?.message;
  return (
    <p
      role={result && !result.ok ? "alert" : "status"}
      className={
        !message
          ? "sr-only"
          : result?.ok
            ? "mt-3 rounded-lg bg-success-soft px-3.5 py-2.5 text-[0.9375rem] font-medium text-success"
            : "mt-3 rounded-lg bg-danger-soft px-3.5 py-2.5 text-[0.9375rem] font-medium text-danger"
      }
    >
      {message ?? ""}
    </p>
  );
}

function FormErrorOnly() {
  const { result } = useContext(FormContext);
  if (!result || result.ok) return null;
  return (
    <p role="alert" className="mt-2 text-sm font-medium text-danger">
      {result.message}
    </p>
  );
}

/** 특정 입력 칸의 오류 메시지 */
export function FieldError({ name }: { name: string }) {
  const { result } = useContext(FormContext);
  const message = result && !result.ok ? result.fieldErrors?.[name] : undefined;
  if (!message) return null;
  return <p className={errorClass}>{message}</p>;
}

export function SubmitButton({
  children,
  pendingText = "저장 중…",
  variant = "primary",
  className = "",
  name,
  value,
  ariaLabel,
  disabled = false,
}: {
  children: ReactNode;
  pendingText?: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  name?: string;
  value?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const { pending } = useContext(FormContext);
  return (
    <button
      type="submit"
      name={name}
      value={value}
      aria-label={ariaLabel}
      disabled={pending || disabled}
      className={buttonClass(variant, className)}
    >
      {pending ? pendingText : children}
    </button>
  );
}

/** 삭제 버튼. 확인 창을 거친 뒤에만 실제로 전송한다. */
export function ConfirmDeleteButton({
  label = "삭제",
  title,
  description = "삭제하면 되돌릴 수 없습니다.",
  className = "",
}: {
  label?: string;
  /** 확인 창 제목. 예: "‘쿠폰 시스템’ 프로젝트를 삭제할까요?" */
  title: string;
  description?: string;
  className?: string;
}) {
  const { pending } = useContext(FormContext);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={pending}
        onClick={() => dialogRef.current?.showModal()}
        className={buttonClass("danger", className)}
      >
        {pending ? "삭제 중…" : label}
      </button>
      <dialog
        ref={dialogRef}
        className="confirm"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="p-5">
          <p className="text-lg font-bold tracking-tight">{title}</p>
          <p className="mt-1.5 text-muted">{description}</p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className={buttonClass("secondary")}
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                dialogRef.current?.close();
                // 확인 창은 폼 안에 있으므로 가장 가까운 폼을 전송한다.
                buttonRef.current?.form?.requestSubmit();
              }}
              className={buttonClass("primary", "bg-danger text-white hover:bg-danger/90")}
            >
              삭제
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** 위/아래 순서 변경 버튼 한 쌍 */
export function MoveButtons({
  action,
  id,
  isFirst,
  isLast,
  label,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  id: number;
  isFirst: boolean;
  isLast: boolean;
  /** 화면 낭독기용 대상 이름 */
  label: string;
}) {
  return (
    <ActionForm action={action} showStatus={false} className="flex gap-1">
      <input type="hidden" name="id" value={id} />
      <SubmitButton
        name="direction"
        value="up"
        variant="secondary"
        pendingText="↑"
        disabled={isFirst}
        ariaLabel={`${label} 위로 이동`}
        className="size-11 px-0"
      >
        ↑
      </SubmitButton>
      <SubmitButton
        name="direction"
        value="down"
        variant="secondary"
        pendingText="↓"
        disabled={isLast}
        ariaLabel={`${label} 아래로 이동`}
        className="size-11 px-0"
      >
        ↓
      </SubmitButton>
    </ActionForm>
  );
}
