import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRightIcon, FileIcon } from "@/components/icons";
import { PdfViewer } from "@/components/public/pdf-viewer";
import { buttonClass } from "@/components/ui/button";
import { getProfile } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "PDF 포트폴리오",
  description: "최현규의 포트폴리오를 PDF 로 보거나 내려받을 수 있습니다.",
  alternates: { canonical: "/resume" },
};

export default async function ResumePage() {
  const profile = await getProfile();
  // 파일이 없는 동안에는 이 페이지 자체가 없는 것으로 처리한다.
  if (!profile.hasResume) notFound();

  // 파일을 교체하면 주소가 달라져서 브라우저가 예전 파일을 다시 쓰지 않는다.
  const version = profile.resumeUpdatedAt ? `?v=${Date.parse(profile.resumeUpdatedAt)}` : "";
  const viewUrl = `/resume/file${version}`;
  const downloadUrl = `/resume/file?download=1`;

  return (
    <div className="mx-auto max-w-5xl px-5 pt-8 pb-16 md:px-8 md:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.875rem] leading-tight font-bold tracking-tight md:text-[2.25rem]">
            PDF 포트폴리오
          </h1>
          <p className="mt-2 text-muted">
            아래에서 바로 보거나 파일로 내려받을 수 있습니다.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2.5 sm:flex sm:w-auto">
          <a href={viewUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
            <ArrowUpRightIcon width={18} height={18} />새 탭에서 열기
          </a>
          <a href={downloadUrl} download className={buttonClass("primary")}>
            <FileIcon width={18} height={18} />
            다운로드
          </a>
        </div>
      </div>

      <PdfViewer src={viewUrl} />
    </div>
  );
}
