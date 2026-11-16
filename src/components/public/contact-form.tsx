import { LockIcon, SendIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";

const rowClass =
  "grid grid-cols-[5.75rem_1fr] items-center border-b border-line px-4 md:grid-cols-[7rem_1fr] md:px-5";
const labelClass = "text-[0.9375rem] text-muted";
const inputClass =
  "min-h-12 w-full bg-transparent text-base text-foreground placeholder:text-muted/70 focus:outline-none";

/**
 * 메일 작성 화면처럼 구성한 문의 폼.
 * 받는 사람은 이름만 고정 표시하고 실제 주소는 서버 환경 변수에만 둔다.
 */
export function ContactForm({ recipientName }: { recipientName: string }) {
  return (
    <form className="overflow-hidden rounded-xl border border-line bg-surface focus-within:border-line-strong">
      <div className={rowClass}>
        <span className={labelClass}>받는 사람</span>
        <p className="flex min-h-12 items-center gap-2 font-medium">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2.5 py-1 text-[0.9375rem]">
            {recipientName}
            <LockIcon width={14} height={14} className="text-muted" />
          </span>
          <span className="sr-only">(고정, 수정할 수 없음)</span>
        </p>
      </div>
      <div className={rowClass}>
        <label htmlFor="contact-name" className={labelClass}>
          보내는 사람
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={50}
          placeholder="이름"
          className={inputClass}
        />
      </div>
      <div className={rowClass}>
        <label htmlFor="contact-email" className={labelClass}>
          메일 주소
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="답장받을 메일 주소"
          className={inputClass}
        />
      </div>
      <div className={rowClass}>
        <label htmlFor="contact-organization" className={labelClass}>
          소속 <span className="text-[0.8125rem]">(선택)</span>
        </label>
        <input
          id="contact-organization"
          name="organization"
          type="text"
          autoComplete="organization"
          maxLength={80}
          placeholder="회사나 팀 이름"
          className={inputClass}
        />
      </div>
      <div className={rowClass}>
        <label htmlFor="contact-subject" className={labelClass}>
          제목
        </label>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          required
          maxLength={120}
          placeholder="문의 제목"
          className={inputClass}
        />
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
          maxLength={5000}
          placeholder="내용을 적어 주세요."
          className="block w-full resize-y bg-transparent text-base leading-[1.7] text-foreground placeholder:text-muted/70 focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
        <p className="text-sm text-muted">적어 주신 메일 주소로 답장드립니다.</p>
        <button type="submit" className={buttonClass("primary", "w-full sm:w-auto sm:min-w-28")}>
          <SendIcon width={18} height={18} />
          보내기
        </button>
      </div>
    </form>
  );
}
