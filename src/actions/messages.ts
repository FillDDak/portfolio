"use server";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";

/** 받은 문의의 읽음 상태를 바꾼다. */
export async function setMessageRead(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const isRead = formData.get("isRead") === "true";
  try {
    await db.contactMessage.update({ where: { id }, data: { isRead } });
    return ok();
  } catch (error) {
    console.error("[admin] 문의 읽음 처리 실패", error);
    return fail("변경하지 못했습니다. 이미 삭제된 문의일 수 있습니다.");
  }
}

/** 읽지 않은 문의를 한 번에 모두 읽음으로 바꾼다. */
export async function markAllMessagesRead(): Promise<ActionResult> {
  await requireAdmin();
  try {
    const { count } = await db.contactMessage.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return ok(count > 0 ? `${count.toLocaleString("ko-KR")}건을 읽음 처리했습니다.` : "읽지 않은 문의가 없습니다.");
  } catch (error) {
    console.error("[admin] 문의 전체 읽음 처리 실패", error);
    return fail("변경하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

export async function deleteMessage(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  try {
    await db.contactMessage.delete({ where: { id: Number(formData.get("id")) } });
    return ok("삭제했습니다.");
  } catch (error) {
    console.error("[admin] 문의 삭제 실패", error);
    return fail("삭제하지 못했습니다. 이미 삭제된 문의일 수 있습니다.");
  }
}
