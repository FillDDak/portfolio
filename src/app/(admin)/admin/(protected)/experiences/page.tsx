import type { Metadata } from "next";
import { deleteExperience, saveExperience } from "@/actions/content";
import { ActionForm, ConfirmDeleteButton, FieldError, SubmitButton } from "@/components/admin/action-form";
import { EmptyState, PageHeader, Panel } from "@/components/admin/page-header";
import { fieldClass, helpClass, labelClass } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { EXPERIENCE_KIND_LABEL, EXPERIENCE_KINDS, type ExperienceKind } from "@/lib/validation/content";

// 관리자 화면은 로딩 표시 없이, 데이터를 다 받은 뒤 완성된 화면으로 바로 바꾼다(아래 layout.tsx 설명 참고).
export const instant = false;

export const metadata: Metadata = { title: "경험" };

type ExperienceValues = {
  kind: string;
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  description: string;
  projectId: number | null;
};

type ProjectOption = { id: number; title: string; isPublished: boolean };

const PLACEHOLDER: Record<ExperienceKind, { title: string; subtitle: string }> = {
  EDUCATION: { title: "○○대학교", subtitle: "컴퓨터공학과 학사 졸업" },
  TRAINING: { title: "○○ 백엔드 부트캠프", subtitle: "Java 백엔드 개발자 과정 (960시간)" },
  ACTIVITY: { title: "○○ 해커톤", subtitle: "백엔드 개발 · 팀장" },
  AWARD: { title: "○○ 해커톤 우수상", subtitle: "○○협회" },
};

function ExperienceFields({
  idPrefix,
  values,
  projects,
}: {
  idPrefix: string;
  values?: ExperienceValues;
  projects: ProjectOption[];
}) {
  const kind = (values?.kind ?? "EDUCATION") as ExperienceKind;
  const placeholder = PLACEHOLDER[kind] ?? PLACEHOLDER.EDUCATION;
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[9rem_1fr_1fr]">
        <div>
          <label htmlFor={`${idPrefix}-kind`} className={labelClass}>
            종류
          </label>
          <select id={`${idPrefix}-kind`} name="kind" defaultValue={kind} className={fieldClass}>
            {EXPERIENCE_KINDS.map((option) => (
              <option key={option} value={option}>
                {EXPERIENCE_KIND_LABEL[option]}
              </option>
            ))}
          </select>
          <FieldError name="kind" />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-title`} className={labelClass}>
            이름
          </label>
          <input
            id={`${idPrefix}-title`}
            name="title"
            defaultValue={values?.title}
            required
            maxLength={80}
            placeholder={placeholder.title}
            className={fieldClass}
          />
          <FieldError name="title" />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-subtitle`} className={labelClass}>
            세부 내용 <span className="font-normal text-muted">(선택)</span>
          </label>
          <input
            id={`${idPrefix}-subtitle`}
            name="subtitle"
            defaultValue={values?.subtitle}
            maxLength={100}
            placeholder={placeholder.subtitle}
            className={fieldClass}
          />
          <FieldError name="subtitle" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-start`} className={labelClass}>
            시작 월
          </label>
          <input
            id={`${idPrefix}-start`}
            name="startDate"
            type="month"
            defaultValue={values?.startDate}
            required
            className={fieldClass}
          />
          <p className={helpClass}>수상은 받은 달을 넣습니다.</p>
          <FieldError name="startDate" />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-end`} className={labelClass}>
            종료 월 <span className="font-normal text-muted">(선택)</span>
          </label>
          <input
            id={`${idPrefix}-end`}
            name="endDate"
            type="month"
            defaultValue={values?.endDate}
            className={fieldClass}
          />
          <p className={helpClass}>비워 두면 “진행 중”으로 표시됩니다. 수상은 비워 둡니다.</p>
          <FieldError name="endDate" />
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-description`} className={labelClass}>
          설명 <span className="font-normal text-muted">(선택)</span>
        </label>
        <textarea
          id={`${idPrefix}-description`}
          name="description"
          defaultValue={values?.description}
          maxLength={300}
          rows={2}
          placeholder="Spring Boot·JPA 기반 팀 프로젝트 3회, 팀장 1회"
          className={fieldClass}
        />
        <p className={helpClass}>배운 것이나 성과를 한두 줄로 적습니다. 줄바꿈은 그대로 보입니다.</p>
        <FieldError name="description" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-project`} className={labelClass}>
          관련 프로젝트 <span className="font-normal text-muted">(선택)</span>
        </label>
        <select
          id={`${idPrefix}-project`}
          name="projectId"
          defaultValue={values?.projectId ?? ""}
          className={fieldClass}
        >
          <option value="">없음</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
              {project.isPublished ? "" : " (비공개)"}
            </option>
          ))}
        </select>
        <p className={helpClass}>이 경험에서 만든 프로젝트로 가는 링크가 붙습니다. 비공개 프로젝트는 링크가 보이지 않습니다.</p>
        <FieldError name="projectId" />
      </div>
    </div>
  );
}

export default async function ExperiencesPage() {
  await requireAdmin();
  const [experiences, projects] = await Promise.all([
    db.experience.findMany({ orderBy: [{ startDate: "desc" }, { id: "asc" }] }),
    db.project.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, title: true, isPublished: true },
    }),
  ]);
  // 공개 페이지와 같은 순서(종류별)로 보여 준다.
  const sorted = EXPERIENCE_KINDS.flatMap((kind) => experiences.filter((item) => item.kind === kind));

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="경험"
        description="학력 → 교육 → 활동 → 수상 순서로 묶이고, 묶음 안에서는 최근 것부터 공개 페이지에 표시됩니다."
      />

      <div className="space-y-4">
        {sorted.length === 0 ? (
          <EmptyState>등록한 경험이 없습니다. 경험 섹션은 공개 페이지에 표시되지 않습니다.</EmptyState>
        ) : null}

        {sorted.map((experience) => (
          <Panel key={experience.id}>
            <ActionForm action={saveExperience}>
              <input type="hidden" name="id" value={experience.id} />
              <ExperienceFields idPrefix={`experience-${experience.id}`} values={experience} projects={projects} />
              <div className="mt-3">
                <SubmitButton variant="secondary">저장</SubmitButton>
              </div>
            </ActionForm>
            <div className="mt-3 flex justify-end border-t border-line pt-3">
              <ActionForm action={deleteExperience} showStatus={false}>
                <input type="hidden" name="id" value={experience.id} />
                <ConfirmDeleteButton title={`‘${experience.title}’ 경험을 삭제할까요?`} />
              </ActionForm>
            </div>
          </Panel>
        ))}

        <Panel title="경험 추가">
          <ActionForm action={saveExperience} resetOnSuccess>
            <ExperienceFields idPrefix="new-experience" projects={projects} />
            <div className="mt-3">
              <SubmitButton pendingText="추가 중…">추가</SubmitButton>
            </div>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
