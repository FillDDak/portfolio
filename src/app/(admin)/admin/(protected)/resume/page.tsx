import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { ResumeManager } from "@/components/admin/resume-manager";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "PDF 포트폴리오" };

export default async function ResumeAdminPage() {
  await requireAdmin();
  const profile = await db.profile.findUniqueOrThrow({
    where: { id: 1 },
    select: { resumeFile: true, resumeUpdatedAt: true },
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="PDF 포트폴리오"
        description="올려 두면 홈 화면에 PDF 보기 버튼이 생기고, /resume 에서 보기와 다운로드를 제공합니다."
      />
      <Panel>
        <ResumeManager
          hasFile={Boolean(profile.resumeFile)}
          updatedAt={profile.resumeUpdatedAt ? formatDateTime(profile.resumeUpdatedAt) : null}
        />
      </Panel>
    </div>
  );
}
