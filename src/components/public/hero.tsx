import { ArrowUpRightIcon, FileIcon, MailIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import { TechLabel } from "@/components/tech-label";
import type { PublicProfile } from "@/lib/data/public";
import { getProfileLinks, profileLinkIcons } from "./profile-links";

/**
 * 첫 화면. 스크롤 없이 이름, 직무, 한 줄 소개, 핵심 스택, 주요 버튼이 보여야 한다.
 * 값이 없는 항목(핵심 스택, PDF, 외부 링크)은 자리 자체를 만들지 않는다.
 */
export function Hero({ profile }: { profile: PublicProfile }) {
  const links = getProfileLinks(profile);
  const photo = profile.photoUrl ? { url: profile.photoUrl, alt: `${profile.name} 프로필 사진` } : null;

  return (
    <section id="about" aria-labelledby="hero-heading" className="fade-in">
      <div className="mx-auto max-w-5xl px-5 pt-8 pb-12 md:flex md:items-center md:gap-12 md:px-8 md:pt-20 md:pb-24 lg:gap-16">
        <div className="min-w-0 md:flex-1">
          {/* 모바일: 첫 화면에서 버튼이 밀려나지 않도록 사진을 이름 옆에 작은 원형으로 둔다. */}
          <div className="flex items-center gap-4">
            {photo ? <ProfilePhoto photo={photo} className="size-20 shrink-0 rounded-full border border-line md:hidden" /> : null}
            <div className="min-w-0">
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
            </div>
          </div>
          <p className="mt-2.5 text-xl leading-snug font-medium tracking-tight md:mt-4 md:text-[1.75rem]">
            {profile.tagline}
          </p>

          {profile.bio ? (
            // 관리자 화면에서 입력한 줄바꿈을 그대로 보여 준다(연속된 공백은 하나로 줄인다).
            <p className="mt-4 max-w-[42rem] whitespace-pre-line text-muted md:mt-6 md:text-[1.0625rem]">
              {profile.bio}
            </p>
          ) : null}

          {profile.coreStack.length > 0 ? (
            <div className="mt-5 md:mt-7">
              <h2 className="sr-only">핵심 스택</h2>
              <ul className="flex flex-wrap gap-1.5 md:gap-2">
                {profile.coreStack.map((item) => (
                  <li
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 font-mono text-[0.8125rem] font-medium md:text-sm"
                  >
                    <TechLabel name={item} />
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
              // 사이트 안에 띄우지 않고, 새 탭에서 브라우저 PDF 뷰어로 바로 연다.
              <a
                href="/resume/file"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("secondary", "sm:min-w-36")}
              >
                <FileIcon />
                PDF 보기
                <span className="sr-only">(새 탭에서 열림)</span>
              </a>
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
                      data-track={`link:profile:${link.key}`}
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

        {/* PC: 글 오른쪽에 크게 둔다. */}
        {photo ? (
          <ProfilePhoto
            photo={photo}
            className="hidden size-60 shrink-0 rounded-3xl border border-line md:block lg:size-72"
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * 업로드 시 이미 800px 정사각형 webp 로 만들어 두었다.
 * 모바일용과 PC용이 같은 주소라서 브라우저는 한 번만 내려받는다(보이지 않는 쪽은 화면 읽기 프로그램도 건너뛴다).
 */
function ProfilePhoto({ photo, className }: { photo: { url: string; alt: string }; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 업로드 시 이미 크기를 맞춘 webp 로 변환했다
    <img
      src={photo.url}
      alt={photo.alt}
      width={800}
      height={800}
      fetchPriority="high"
      className={`bg-surface-2 object-cover ${className}`}
    />
  );
}
