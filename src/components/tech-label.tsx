import { findTechIcon, type TechIcon } from "@/lib/tech-icons";

/** 단색 기술 로고. 글자색(currentColor)을 따라가서 라이트·다크 모드에서 모두 보인다. */
export function TechIconSvg({ icon, className = "" }: { icon: TechIcon; className?: string }) {
  return (
    <svg
      viewBox={icon.viewBox}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={`size-[1.0625em] shrink-0 ${className}`}
    >
      <path d={icon.path} />
    </svg>
  );
}

/**
 * 기술 이름 앞에 로고를 붙인다. 로고를 찾지 못하면 이름만 보인다.
 * 감싸는 요소에 inline-flex items-center gap-1.5 를 주어 쓴다.
 */
export function TechLabel({ name }: { name: string }) {
  const icon = findTechIcon(name);
  return (
    <>
      {icon ? <TechIconSvg icon={icon} /> : null}
      {name}
    </>
  );
}
