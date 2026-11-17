import Link from "next/link";
import { ArrowUpRightIcon, FileIcon, MailIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import type { PublicProfile } from "@/lib/data/public";
import { getProfileLinks, profileLinkIcons } from "./profile-links";

/**
 * 첫 화면. 스크롤 없이 이름, 직무, 한 줄 소개, 핵심 스택, 주요 버튼이 보여야 한다.
 * 값이 없는 항목(핵심 스택, PDF, 외부 링크)은 자리 자체를 만들지 않는다.
 */
export function Hero({ profile }: { profile: PublicProfile }) {
  const links = getProfileLinks(profile);

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

        {/* 이 사이트 안에서 하는 행동(문의, PDF)은 버튼으로 두고, 외부 프로필은 그 아래 가벼운 링크 한 줄로 둔다. */}
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap md:mt-9 md:gap-3">
          <a
            href="#contact"
            className={buttonClass("primary", `sm:min-w-36 ${profile.hasResume ? "" : "col-span-2"}`)}
          >
            <MailIcon />
            문의하기
          </a>
          {profile.hasResume ? (
            <Link href="/resume" className={buttonClass("secondary", "sm:min-w-36")}>
              <FileIcon />
              PDF 보기
            </Link>
          ) : null}
        </div>

        {links.length > 0 ? (
          <ul aria-label="외부 프로필" className="mt-3 flex flex-wrap gap-x-5 md:mt-4">
            {links.map((link) => {
              const Icon = profileLinkIcons[link.key];
              return (
                <li key={link.key}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group -mx-1 inline-flex min-h-11 items-center gap-2 px-1 text-[0.9375rem] font-semibold text-muted transition-colors hover:text-foreground"
                  >
                    <Icon width={18} height={18} />
                    {link.label}
                    <ArrowUpRightIcon
                      width={14}
                      height={14}
                      className="transition-colors group-hover:text-accent-ink"
                    />
                    <span className="sr-only">(새 탭에서 열림)</span>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
