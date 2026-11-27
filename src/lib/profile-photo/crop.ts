/**
 * 프로필 사진에서 보이는 부분(가로 3 : 세로 4)을 계산한다.
 * 관리자 화면의 미리보기(브라우저)와 실제 자르기(서버)가 같은 계산을 쓰도록 한곳에 둔다.
 *
 * x, y: 보이는 부분 가운데의 위치(원본 너비·높이에 대한 비율, 0~1)
 * zoom: 1 이면 원본 안에 들어가는 가장 큰 3:4 영역, 2 면 그 절반 크기의 영역
 */
export type PhotoCrop = { x: number; y: number; zoom: number };

/** 보이는 부분의 가로 ÷ 세로 */
export const PHOTO_ASPECT = 3 / 4;

export const PHOTO_ZOOM_MIN = 1;
export const PHOTO_ZOOM_MAX = 3;

export const DEFAULT_PHOTO_CROP: PhotoCrop = { x: 0.5, y: 0.5, zoom: 1 };

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return (min + max) / 2;
  return Math.min(max, Math.max(min, value));
}

/** 배율이 zoom 일 때 보이는 부분의 크기(원본 px, 소수 포함) */
export function cropSize(width: number, height: number, zoom: number) {
  const fullWidth = Math.min(width, height * PHOTO_ASPECT);
  return { width: fullWidth / zoom, height: fullWidth / PHOTO_ASPECT / zoom };
}

/** 보이는 부분이 원본 밖으로 나가지 않도록 위치와 배율을 맞춘다. */
export function clampCrop(crop: PhotoCrop, width: number, height: number): PhotoCrop {
  const zoom = clamp(crop.zoom, PHOTO_ZOOM_MIN, PHOTO_ZOOM_MAX);
  const size = cropSize(width, height, zoom);
  const halfX = size.width / 2 / width;
  const halfY = size.height / 2 / height;
  return {
    x: clamp(crop.x, halfX, 1 - halfX),
    y: clamp(crop.y, halfY, 1 - halfY),
    zoom,
  };
}

/** 원본에서 잘라 낼 영역(px, 정수). */
export function cropRect(crop: PhotoCrop, width: number, height: number) {
  const fitted = clampCrop(crop, width, height);
  const size = cropSize(width, height, fitted.zoom);
  // 1066.666… 처럼 나누어떨어지지 않는 값은 내리되, 799.999… 같은 계산 오차는 800 으로 본다.
  const cropWidth = Math.max(1, Math.min(width, Math.floor(size.width + 1e-6)));
  const cropHeight = Math.max(1, Math.min(height, Math.floor(size.height + 1e-6)));
  const left = Math.min(width - cropWidth, Math.max(0, Math.round(fitted.x * width - cropWidth / 2)));
  const top = Math.min(height - cropHeight, Math.max(0, Math.round(fitted.y * height - cropHeight / 2)));
  return { left, top, width: cropWidth, height: cropHeight };
}
