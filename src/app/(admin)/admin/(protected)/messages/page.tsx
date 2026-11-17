import type { Metadata } from "next";
import Link from "next/link";
import { deleteMessage, markAllMessagesRead, setMessageRead } from "@/actions/messages";
import { ActionForm, ConfirmDeleteButton, SubmitButton } from "@/components/admin/action-form";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "받은 문의" };

const PAGE_SIZE = 20;

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  await requireAdmin();
  const params = await searchParams;
  const pageNumber = Number(typeof params.page === "string" ? params.page : "1");
  const page = Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;

  const [count, unread, messages] = await Promise.all([
    db.contactMessage.count(),
    db.contactMessage.count({ where: { isRead: false } }),
    db.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="받은 문의"
        description={`전체 ${count.toLocaleString("ko-KR")}건 · 읽지 않음 ${unread.toLocaleString("ko-KR")}건. 메일 발송에 실패한 문의도 여기에 남습니다.`}
        action={
          unread > 0 ? (
            <ActionForm action={markAllMessagesRead} showStatus={false}>
              <SubmitButton variant="secondary" pendingText="처리 중…">
                전체 읽음 처리
              </SubmitButton>
            </ActionForm>
          ) : null
        }
      />

      {messages.length === 0 ? (
        <EmptyState>받은 문의가 없습니다.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`rounded-xl border bg-surface p-4 md:p-5 ${
                message.isRead ? "border-line" : "border-accent-ink/50"
              }`}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {message.isRead ? (
                  <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[0.8125rem] font-semibold text-muted">
                    읽음
                  </span>
                ) : (
                  <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[0.8125rem] font-semibold text-accent-ink">
                    새 문의
                  </span>
                )}
                {message.mailStatus === "SENT" ? null : (
                  <span className="rounded-md bg-danger-soft px-2 py-0.5 text-[0.8125rem] font-semibold text-danger">
                    {message.mailStatus === "FAILED" ? "메일 발송 실패" : "메일 발송 전"}
                  </span>
                )}
                <span className="ml-auto text-sm text-muted tabular-nums">
                  {formatDateTime(message.createdAt)}
                </span>
              </div>

              <h2 className="mt-2 text-lg font-bold tracking-tight">{message.subject}</h2>
              <p className="mt-0.5 text-[0.9375rem] text-muted">
                {message.name}
                {message.organization ? ` · ${message.organization}` : ""} ·{" "}
                <a href={`mailto:${message.email}`} className="text-accent-ink underline underline-offset-2">
                  {message.email}
                </a>
              </p>
              {/* 방문자가 쓴 내용은 텍스트로만 표시한다(HTML 로 해석하지 않는다). */}
              <p className="mt-3 border-t border-line pt-3 whitespace-pre-wrap">{message.body}</p>

              {message.mailStatus === "FAILED" && message.mailError ? (
                <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 font-mono text-[0.8125rem] break-all text-muted">
                  {message.mailError}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
                    className={buttonClass("primary")}
                  >
                    답장 쓰기
                  </a>
                  <ActionForm action={setMessageRead} showStatus={false}>
                    <input type="hidden" name="id" value={message.id} />
                    <input type="hidden" name="isRead" value={message.isRead ? "false" : "true"} />
                    <SubmitButton variant="secondary" pendingText="변경 중…">
                      {message.isRead ? "읽지 않음으로" : "읽음 처리"}
                    </SubmitButton>
                  </ActionForm>
                </div>
                <ActionForm action={deleteMessage} showStatus={false}>
                  <input type="hidden" name="id" value={message.id} />
                  <ConfirmDeleteButton title={`‘${message.subject}’ 문의를 삭제할까요?`} />
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 ? (
        <nav aria-label="쪽 이동" className="mt-4 flex items-center justify-between gap-2">
          {page > 1 ? (
            <Link href={`/admin/messages?page=${page - 1}`} className={buttonClass("secondary")}>
              ← 이전
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted tabular-nums">
            {page} / {pageCount} 쪽
          </span>
          {page < pageCount ? (
            <Link href={`/admin/messages?page=${page + 1}`} className={buttonClass("secondary")}>
              다음 →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
