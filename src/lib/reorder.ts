export type Direction = "up" | "down";

/**
 * 목록에서 항목 하나를 한 칸 위/아래로 옮긴 뒤의 id 순서를 돌려준다.
 * 맨 위에서 위로, 맨 아래에서 아래로처럼 옮길 수 없는 경우와 없는 id 는 null.
 */
export function moveInList(ids: number[], id: number, direction: Direction): number[] | null {
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return null;
  const next = [...ids];
  const current = next[index] as number;
  next[index] = next[target] as number;
  next[target] = current;
  return next;
}
