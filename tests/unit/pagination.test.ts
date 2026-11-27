import { describe, expect, it } from "vitest";
import { clampPage, pageCount, pageItems } from "@/lib/pagination";

describe("pageCount", () => {
  it("글이 없어도 1페이지", () => {
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(10, 10)).toBe(1);
    expect(pageCount(11, 10)).toBe(2);
    expect(pageCount(30, 10)).toBe(3);
  });
});

describe("clampPage", () => {
  it("숫자가 아니거나 1보다 작으면 1, 마지막보다 크면 마지막", () => {
    expect(clampPage(null, 3)).toBe(1);
    expect(clampPage("abc", 3)).toBe(1);
    expect(clampPage("0", 3)).toBe(1);
    expect(clampPage("-2", 3)).toBe(1);
    expect(clampPage("1.5", 3)).toBe(1);
    expect(clampPage("2", 3)).toBe(2);
    expect(clampPage("99", 3)).toBe(3);
  });
});

describe("pageItems", () => {
  it("7페이지 이하는 모두 보인다", () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("앞쪽, 가운데, 뒤쪽에서 항목 수가 7개로 같다", () => {
    expect(pageItems(1, 12)).toEqual([1, 2, 3, 4, 5, "gap", 12]);
    expect(pageItems(4, 12)).toEqual([1, 2, 3, 4, 5, "gap", 12]);
    expect(pageItems(6, 12)).toEqual([1, "gap", 5, 6, 7, "gap", 12]);
    expect(pageItems(9, 12)).toEqual([1, "gap", 8, 9, 10, 11, 12]);
    expect(pageItems(12, 12)).toEqual([1, "gap", 8, 9, 10, 11, 12]);
  });
});
