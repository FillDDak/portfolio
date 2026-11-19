import { describe, expect, it } from "vitest";
import { clampCrop, cropRect } from "@/lib/profile-photo/crop";

describe("프로필 사진 자르기 계산", () => {
  it("배율 1 이면 짧은 변을 꽉 채우는 정사각형을 가운데에서 자른다", () => {
    expect(cropRect({ x: 0.5, y: 0.5, zoom: 1 }, 1200, 800)).toEqual({ left: 200, top: 0, size: 800 });
  });

  it("가로로 긴 사진은 좌우로만 움직이고, 끝을 넘으면 끝에 붙는다", () => {
    expect(cropRect({ x: 0, y: 0.9, zoom: 1 }, 1200, 800)).toEqual({ left: 0, top: 0, size: 800 });
    expect(cropRect({ x: 1, y: 0.1, zoom: 1 }, 1200, 800)).toEqual({ left: 400, top: 0, size: 800 });
  });

  it("확대하면 정사각형이 작아지고 원하는 위치로 옮길 수 있다", () => {
    expect(cropRect({ x: 0.25, y: 0.25, zoom: 2 }, 800, 1200)).toEqual({ left: 0, top: 100, size: 400 });
  });

  it("배율은 1~3 으로, 잘못된 숫자는 안전한 값으로 맞춘다", () => {
    expect(clampCrop({ x: 0.5, y: 0.5, zoom: 10 }, 900, 900).zoom).toBe(3);
    expect(clampCrop({ x: 0.5, y: 0.5, zoom: 0 }, 900, 900).zoom).toBe(1);
    expect(clampCrop({ x: Number.NaN, y: 0.5, zoom: 1 }, 1200, 800).x).toBe(0.5);
  });
});
