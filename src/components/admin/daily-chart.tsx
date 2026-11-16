"use client";

import { useState } from "react";

export type ChartPoint = { date: string; views: number; visitors: number };

const WIDTH = 720;
const HEIGHT = 240;
// 모바일에서는 차트가 절반 크기로 줄어들어 글자를 키우므로(globals.css 의 .chart-text) 여백을 넉넉히 둔다.
const PAD = { top: 14, right: 8, bottom: 34, left: 48 };

/** 축 눈금에 쓸 보기 좋은 최댓값 (1, 2, 5 × 10ⁿ) */
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 5, 10]) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

const shortDate = (date: string) => `${Number(date.slice(5, 7))}.${Number(date.slice(8, 10))}`;

/**
 * 일별 조회수 막대 차트 (단일 계열).
 * - 색은 포인트 색 하나만 쓰고, 값과 축 글자는 본문 글자색을 쓴다.
 * - 막대에 마우스를 올리거나 키보드로 이동하면 그날의 값을 보여준다.
 * - 같은 데이터를 아래 "표로 보기"에서 확인할 수 있다.
 */
export function DailyChart({ points, label }: { points: ChartPoint[]; label: string }) {
  const [active, setActive] = useState<number | null>(null);

  const max = niceMax(Math.max(...points.map((point) => point.views), 0));
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const slot = plotWidth / Math.max(points.length, 1);
  const barWidth = Math.max(2, Math.min(18, slot - 2));
  const y = (value: number) => PAD.top + plotHeight - (value / max) * plotHeight;
  const ticks = [0, max / 2, max];
  const total = points.reduce((sum, point) => sum + point.views, 0);
  const current = active === null ? null : points[active];
  // 날짜 라벨은 겹치지 않게 일정 간격으로만 표시한다.
  const labelEvery = Math.ceil(points.length / 7);

  return (
    <figure>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-semibold">{label}</span>
        <span className="text-sm text-muted tabular-nums" aria-live="polite">
          {current
            ? `${current.date.replaceAll("-", ".")} · 조회 ${current.views.toLocaleString("ko-KR")}회 · 방문자 ${current.visitors.toLocaleString("ko-KR")}명`
            : `합계 ${total.toLocaleString("ko-KR")}회`}
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${label}. 최근 ${points.length}일 합계 ${total}회. 자세한 값은 아래 표를 참고하세요.`}
        className="mt-3 h-auto w-full"
        onMouseLeave={() => setActive(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--line)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 10}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="chart-text"
              fill="var(--muted)"
            >
              {tick.toLocaleString("ko-KR")}
            </text>
          </g>
        ))}

        {points.map((point, index) => {
          const x = PAD.left + slot * index + (slot - barWidth) / 2;
          const top = y(point.views);
          const height = PAD.top + plotHeight - top;
          const radius = Math.min(3, barWidth / 2, height);
          return (
            <g key={point.date}>
              {/* 막대: 위쪽만 둥글게, 아래는 기준선에 붙인다 */}
              {height > 0 ? (
                <path
                  d={`M${x},${top + height} V${top + radius} Q${x},${top} ${x + radius},${top} H${x + barWidth - radius} Q${x + barWidth},${top} ${x + barWidth},${top + radius} V${top + height} Z`}
                  fill="var(--accent-ink)"
                  opacity={active === null || active === index ? 1 : 0.45}
                />
              ) : null}
              {/* 마우스·터치 영역은 막대보다 넓게 잡는다 */}
              <rect
                x={PAD.left + slot * index}
                y={PAD.top}
                width={slot}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setActive(index)}
                onClick={() => setActive(index)}
              />
              {index % labelEvery === 0 ? (
                <text
                  x={PAD.left + slot * index + slot / 2}
                  y={HEIGHT - 10}
                  textAnchor="middle"
                  className="chart-text"
                  fill="var(--muted)"
                >
                  {shortDate(point.date)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <details className="mt-2">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-[0.9375rem] font-medium text-accent-ink">
          표로 보기
        </summary>
        <div className="max-h-72 overflow-auto rounded-lg border border-line">
          <table className="w-full text-[0.9375rem] tabular-nums">
            <thead className="sticky top-0 bg-surface-2 text-left">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  날짜
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  조회
                </th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">
                  방문자
                </th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((point) => (
                <tr key={point.date} className="border-t border-line">
                  <td className="px-3 py-2">{point.date.replaceAll("-", ".")}</td>
                  <td className="px-3 py-2 text-right">{point.views.toLocaleString("ko-KR")}</td>
                  <td className="px-3 py-2 text-right">{point.visitors.toLocaleString("ko-KR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
