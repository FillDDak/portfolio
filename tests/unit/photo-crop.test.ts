import { describe, expect, it } from "vitest";
import { clampCrop, cropRect, cropSize } from "@/lib/profile-photo/crop";

describe("프로필 사진 자르기 계산(가로 3 : 세로 4)", () => {
  it("배율 1 이면 원본에 들어가는 가장 큰 3:4 영역을 가운데에서 자른다", () => {
    // 가로로 긴 사진·정사각형: 세로를 꽉 채운다.
    expect(cropRect({ x: 0.5, y: 0.5, zoom: 1 }, 1200, 800)).toEqual({ left: 300, top: 0, width: 600, height: 800 });
    expect(cropRect({ x: 0.5, y: 0.5, zoom: 1 }, 900, 900)).toEqual({ left: 113, top: 0, width: 675, height: 900 });
    // 3:4 보다 더 세로로 긴 사진: 가로를 꽉 채운다.
    expect(cropRect({ x: 0.5, y: 0.5, zoom: 1 }, 600, 1000)).toEqual({ left: 0, top: 100, width: 600, height: 800 });
  });

  it("끝을 넘으면 끝에 붙는다", () => {
    expect(cropRect({ x: 0, y: 0.9, zoom: 1 }, 1200, 800)).toEqual({ left: 0, top: 0, width: 600, height: 800 });
    expect(cropRect({ x: 1, y: 0.1, zoom: 1 }, 1200, 800)).toEqual({ left: 600, top: 0, width: 600, height: 800 });
    expect(cropRect({ x: 1, y: 0.5, zoom: 1 }, 900, 900)).toEqual({ left: 225, top: 0, width: 675, height: 900 });
  });

  it("확대하면 영역이 작아지고 원하는 위치로 옮길 수 있다", () => {
    expect(cropRect({ x: 0.25, y: 0.25, zoom: 2 }, 800, 1200)).toEqual({ left: 0, top: 34, width: 400, height: 533 });
  });

  it("영역은 항상 3:4 이다", () => {
    for (const [width, height] of [
      [1200, 800],
      [800, 1200],
      [1600, 900],
      [480, 640],
    ]) {
      const size = cropSize(width, height, 1.7);
      expect(size.width / size.height).toBeCloseTo(3 / 4);
      expect(size.width).toBeLessThanOrEqual(width);
      expect(size.height).toBeLessThanOrEqual(height);
    }
  });

  it("배율은 1~3 으로, 잘못된 숫자는 안전한 값으로 맞춘다", () => {
    expect(clampCrop({ x: 0.5, y: 0.5, zoom: 10 }, 900, 900).zoom).toBe(3);
    expect(clampCrop({ x: 0.5, y: 0.5, zoom: 0 }, 900, 900).zoom).toBe(1);
    expect(clampCrop({ x: Number.NaN, y: 0.5, zoom: 1 }, 1200, 800).x).toBe(0.5);
  });
});
