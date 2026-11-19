"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { ProfilePhotoResponse } from "@/app/api/admin/profile-photo/route";
import { buttonClass } from "@/components/ui/button";
import {
  clampCrop,
  PHOTO_ZOOM_MAX,
  PHOTO_ZOOM_MIN,
  type PhotoCrop,
} from "@/lib/profile-photo/crop";

export type PhotoSource = { url: string; width: number; height: number; crop: PhotoCrop };

/** 편집 상자 한 변(px). 휴대폰 화면에도 들어가는 크기. */
const EDITOR_SIZE = 240;
/** 방향키 한 번에 움직이는 거리(편집 상자 기준 px) */
const KEY_STEP = 8;

/** 원본 사진을 정해진 위치·배율로 잘라 보여 준다. 서버가 자르는 것과 같은 계산을 쓴다. */
function CropView({
  source,
  crop,
  size,
  className,
}: {
  source: PhotoSource;
  crop: PhotoCrop;
  size: number;
  className: string;
}) {
  const shortSide = Math.min(source.width, source.height);
  const scale = (size / shortSide) * crop.zoom;
  const side = shortSide / crop.zoom;
  const left = crop.x * source.width - side / 2;
  const top = crop.y * source.height - side / 2;
  return (
    <div className={`relative shrink-0 overflow-hidden bg-surface-2 ${className}`} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 관리자 미리보기용 원본 */}
      <img
        src={source.url}
        alt=""
        draggable={false}
        className="absolute top-0 left-0 max-w-none select-none"
        style={{
          width: source.width * scale,
          height: source.height * scale,
          transform: `translate(${-left * scale}px, ${-top * scale}px)`,
        }}
      />
    </div>
  );
}

/** 보이는 부분 고르기: 사진을 끌거나 방향키로 옮기고, 막대로 확대한다. */
export function ProfilePhotoPosition({ source }: { source: PhotoSource }) {
  const router = useRouter();
  const [crop, setCrop] = useState<PhotoCrop>(source.crop);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const drag = useRef<{ pointerId: number; startX: number; startY: number; crop: PhotoCrop } | null>(null);

  const shortSide = Math.min(source.width, source.height);
  const changed =
    Math.abs(crop.x - source.crop.x) > 1e-4 ||
    Math.abs(crop.y - source.crop.y) > 1e-4 ||
    Math.abs(crop.zoom - source.crop.zoom) > 1e-4;

  function update(next: PhotoCrop) {
    setCrop(clampCrop(next, source.width, source.height));
    setMessage(null);
  }

  /** 편집 상자에서 dx, dy(px) 만큼 사진을 끌었을 때의 새 위치. 사진을 오른쪽으로 끌면 보이는 부분은 왼쪽으로 간다. */
  function moved(from: PhotoCrop, dx: number, dy: number): PhotoCrop {
    const scale = (EDITOR_SIZE / shortSide) * from.zoom;
    return { ...from, x: from.x - dx / scale / source.width, y: from.y - dy / scale / source.height };
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, crop };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    update(moved(start.crop, event.clientX - start.startX, event.clientY - start.startY));
  }

  function onPointerEnd() {
    drag.current = null;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    // 방향키는 '보이는 부분'을 그 방향으로 옮긴다(사진은 반대로 움직인다).
    const d = delta[event.key];
    if (d) {
      event.preventDefault();
      update(moved(crop, d[0], d[1]));
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      update({ ...crop, zoom: crop.zoom + 0.1 });
    } else if (event.key === "-") {
      event.preventDefault();
      update({ ...crop, zoom: crop.zoom - 0.1 });
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    let error: string | null = null;
    try {
      const response = await fetch("/api/admin/profile-photo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(crop),
      });
      const result = (await response.json().catch(() => null)) as ProfilePhotoResponse | null;
      if (!result?.ok) error = result?.message ?? "요청을 처리하지 못했습니다.";
    } catch {
      error = "네트워크 문제로 요청을 처리하지 못했습니다.";
    }
    setSaving(false);
    if (error) {
      setMessage({ ok: false, text: error });
    } else {
      setMessage({ ok: true, text: "보이는 부분을 저장했습니다." });
      router.refresh();
    }
  }

  return (
    <div>
      <p className="mb-2 text-[0.9375rem] font-medium" id="photo-position-label">
        보이는 부분
      </p>
      <div className="flex flex-wrap items-start gap-5">
        <div
          role="group"
          tabIndex={0}
          aria-labelledby="photo-position-label"
          aria-describedby="photo-position-help"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onKeyDown={onKeyDown}
          data-testid="photo-position-editor"
          className="cursor-grab touch-none rounded-3xl outline-offset-4 active:cursor-grabbing"
        >
          <CropView source={source} crop={crop} size={EDITOR_SIZE} className="rounded-3xl border border-line" />
        </div>

        <div className="min-w-0 flex-1 basis-48">
          <p className="text-sm text-muted">모바일 미리보기</p>
          <CropView source={source} crop={crop} size={80} className="mt-1.5 rounded-full border border-line" />

          <label htmlFor="photo-zoom" className="mt-4 block text-sm font-medium">
            확대 <span className="font-mono text-muted">{crop.zoom.toFixed(1)}배</span>
          </label>
          <input
            id="photo-zoom"
            type="range"
            min={PHOTO_ZOOM_MIN}
            max={PHOTO_ZOOM_MAX}
            step={0.05}
            value={crop.zoom}
            onChange={(event) => update({ ...crop, zoom: Number(event.target.value) })}
            className="mt-1 h-11 w-full max-w-60 accent-(--accent)"
          />

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!changed || saving}
              className={buttonClass("primary")}
            >
              {saving ? "저장 중…" : "위치 저장"}
            </button>
            <button
              type="button"
              onClick={() => update(source.crop)}
              disabled={!changed || saving}
              className={buttonClass("secondary")}
            >
              되돌리기
            </button>
          </div>
        </div>
      </div>
      <p id="photo-position-help" className="mt-2 text-sm text-muted">
        사진을 끌어서 옮기고, 막대로 확대합니다. 키보드로는 방향키(Shift 를 누르면 크게), +/- 로 확대·축소할
        수 있습니다. 위치 저장을 눌러야 공개 화면에 반영됩니다.
      </p>
      <p
        role={message && !message.ok ? "alert" : "status"}
        className={
          !message
            ? "sr-only"
            : message.ok
              ? "mt-3 rounded-lg bg-success-soft px-3.5 py-2.5 text-[0.9375rem] font-medium text-success"
              : "mt-3 rounded-lg bg-danger-soft px-3.5 py-2.5 text-[0.9375rem] font-medium text-danger"
        }
      >
        {message?.text ?? ""}
      </p>
    </div>
  );
}
