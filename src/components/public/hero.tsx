import Link from "next/link";
import { FileIcon, GitHubIcon, MailIcon, PenIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import type { PublicProfile } from "@/lib/data/public";

/**
 * 첫 화면. 스크롤 없이 이름, 직무, 한 줄 소개, 핵심 스택, 주요 버튼이 보여야 한다.
 * 값이 없는 항목(핵심 스택, PDF, 링크)은 자리 자체를 만들지 않는다.
 */
export function Hero({ profile }: { profile: PublicProfile }) {
  const buttonCount =
    1 + Number(profile.hasResume) + Number(Boolean(profile.githubUrl)) + Number(Boolean(profile.velogUrl));
  // 모바일 2열 배치에서 버튼 수가 홀수면 문의하기를 한 줄 전체로 넓혀 빈칸이 생기지 않게 한다.
  const primaryWide = buttonCount % 2 === 1 ? "col-span-2" : "";

  return (
    <section aria-labelledby="hero-heading" className="fade-in">
      <div className="mx-auto max-w-5xl px-5 pt-8 pb-12 md:px-8 md:pt-20 md:pb-24">
        <p className="flex items-center gap-2.5 text-[0.9375rem] font-semibold text-accent-ink md:text-base">
          <span aria-hidden="true" className="h-px w-6 bg-accent-ink" />
          {profile.jobTitle}
        </p>
        <h1
          id="hero-heading"
          className="mt-2 text-[2.5rem] leading-[1.15] font-bold tracking-tight md:mt-3 md:text-[4rem]"
        >
          {profile.name}
        </h1>
        <p className="mt-2.5 text-xl leading-snug font-medium tracking-tight md:mt-4 md:text-[1.75rem]">
          {profile.tagline}
        </p>

        {profile.bio ? (
          <p className="mt-4 max-w-[42rem] text-muted md:mt-6 md:text-[1.0625rem]">{profile.bio}</p>
        ) : null}

        {profile.coreStack.length > 0 ? (
          <div className="mt-5 md:mt-7">
            <h2 className="sr-only">핵심 스택</h2>
            <ul className="flex flex-wrap gap-1.5 md:gap-2">
              {profile.coreStack.map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-line bg-surface px-2.5 py-1 font-mono text-[0.8125rem] font-medium md:text-sm"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap md:mt-9 md:gap-3">
          <a href="#contact" className={buttonClass("primary", `sm:min-w-32 ${primaryWide}`)}>
            <MailIcon />
            문의하기
          </a>
          {profile.hasResume ? (
            <Link href="/resume" className={buttonClass("secondary", "sm:min-w-32")}>
              <FileIcon />
              PDF 보기
            </Link>
          ) : null}
          {profile.githubUrl ? (
            <a
              href={profile.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("secondary", "sm:min-w-32")}
            >
              <GitHubIcon />
              GitHub
              <span className="sr-only">(새 탭에서 열림)</span>
            </a>
          ) : null}
          {profile.velogUrl ? (
            <a
              href={profile.velogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("secondary", "sm:min-w-32")}
            >
              <PenIcon />
              Velog
              <span className="sr-only">(새 탭에서 열림)</span>
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
