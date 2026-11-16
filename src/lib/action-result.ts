/** Server Action 이 화면에 돌려주는 결과 */
export type ActionResult =
  | { ok: true; message?: string; id?: number }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export const ok = (message?: string, id?: number): ActionResult => ({ ok: true, message, id });

export const fail = (message: string, fieldErrors?: Record<string, string>): ActionResult => ({
  ok: false,
  message,
  fieldErrors,
});

export const invalid = (fieldErrors: Record<string, string>): ActionResult => ({
  ok: false,
  message: "입력한 내용을 다시 확인해 주세요.",
  fieldErrors,
});
