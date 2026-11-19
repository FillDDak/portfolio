import "server-only";
import { db } from "@/lib/db";

export type MessageSummary = { unread: number; total: number; latestId: number };

/**
 * 받은 문의의 현재 상태. 관리자 화면이 2초마다 이 값을 확인해서 바뀌었을 때만 화면을 다시 그린다.
 * 개수 세기 두 번이라 가볍다.
 */
export async function getMessageSummary(): Promise<MessageSummary> {
  const [unread, all] = await Promise.all([
    db.contactMessage.count({ where: { isRead: false } }),
    db.contactMessage.aggregate({ _count: { _all: true }, _max: { id: true } }),
  ]);
  return { unread, total: all._count._all, latestId: all._max.id ?? 0 };
}

/** 새 문의, 삭제, 읽음 처리 중 하나라도 있으면 값이 달라진다. */
export function messageSignature(summary: MessageSummary): string {
  return `${summary.unread}:${summary.total}:${summary.latestId}`;
}
