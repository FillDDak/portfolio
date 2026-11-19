/**
 * 프로필 사진에서 보이는 정사각형 부분을 계산한다.
 * 관리자 화면의 미리보기(브라우저)와 실제 자르기(서버)가 같은 계산을 쓰도록 한곳에 둔다.
 *
 * x, y: 정사각형 가운데의 위치(원본 너비·높이에 대한 비율, 0~1)
 * zoom: 1 이면 원본의 짧은 변을 꽉 채우는 가장 큰 정사각형, 2 면 그 절반 크기의 정사각형
 */
export type PhotoCrop = { x: number; y: number; zoom: number };

export const PHOTO_ZOOM_MIN = 1;
export const PHOTO_ZOOM_MAX = 3;

export const DEFAULT_PHOTO_CROP: PhotoCrop = { x: 0.5, y: 0.5, zoom: 1 };

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return (min + max) / 2;
  return Math.min(max, Math.max(min, value));
}

/** 정사각형이 원본 밖으로 나가지 않도록 위치와 배율을 맞춘다. */
export function clampCrop(crop: PhotoCrop, width: number, height: number): PhotoCrop {
  const zoom = clamp(crop.zoom, PHOTO_ZOOM_MIN, PHOTO_ZOOM_MAX);
  const side = Math.min(width, height) / zoom;
  const halfX = side / 2 / width;
  const halfY = side / 2 / height;
  return {
    x: clamp(crop.x, halfX, 1 - halfX),
    y: clamp(crop.y, halfY, 1 - halfY),
    zoom,
  };
}

/** 원본에서 잘라 낼 정사각형(px, 정수). */
export function cropRect(crop: PhotoCrop, width: number, height: number) {
  const fitted = clampCrop(crop, width, height);
  const size = Math.max(1, Math.floor(Math.min(width, height) / fitted.zoom));
  const left = Math.min(width - size, Math.max(0, Math.round(fitted.x * width - size / 2)));
  const top = Math.min(height - size, Math.max(0, Math.round(fitted.y * height - size / 2)));
  return { left, top, size };
}
