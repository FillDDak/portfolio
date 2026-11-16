import type { Metadata } from "next";
import {
  deleteSkill,
  deleteSkillCategory,
  moveSkill,
  moveSkillCategory,
  saveSkill,
  saveSkillCategory,
} from "@/actions/content";
import {
  ActionForm,
  ConfirmDeleteButton,
  FieldError,
  MoveButtons,
  SubmitButton,
} from "@/components/admin/action-form";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { fieldClass, labelClass } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "스킬" };

function LevelSelect({ id, defaultValue = "USED" }: { id: string; defaultValue?: string }) {
  return (
    <select id={id} name="level" defaultValue={defaultValue} className={`${fieldClass} sm:w-48`}>
      <option value="USED">실무·프로젝트 사용</option>
      <option value="LEARNED">학습 경험</option>
    </select>
  );
}

export default async function SkillsPage() {
  await requireAdmin();
  const categories = await db.skillCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { skills: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="스킬"
        description="분류별로 스킬을 관리합니다. 스킬이 하나도 없는 분류는 공개 페이지에 보이지 않습니다."
      />

      <div className="space-y-5">
        {categories.map((category, categoryIndex) => (
          <Panel key={category.id}>
            <div className="flex flex-wrap items-end gap-2">
              <ActionForm action={saveSkillCategory} className="min-w-0 flex-1">
                <input type="hidden" name="id" value={category.id} />
                <label htmlFor={`category-${category.id}`} className={labelClass}>
                  분류 이름
                </label>
                <div className="flex gap-2">
                  <input
                    id={`category-${category.id}`}
                    name="name"
                    defaultValue={category.name}
                    required
                    maxLength={30}
                    className={fieldClass}
                  />
                  <SubmitButton variant="secondary" className="shrink-0">
                    저장
                  </SubmitButton>
                </div>
                <FieldError name="name" />
              </ActionForm>
              <MoveButtons
                action={moveSkillCategory}
                id={category.id}
                isFirst={categoryIndex === 0}
                isLast={categoryIndex === categories.length - 1}
                label={`${category.name} 분류`}
              />
              <ActionForm action={deleteSkillCategory} showStatus={false}>
                <input type="hidden" name="id" value={category.id} />
                <ConfirmDeleteButton
                  title={`‘${category.name}’ 분류를 삭제할까요?`}
                  description={
                    category.skills.length > 0
                      ? `이 분류의 스킬 ${category.skills.length}개도 함께 삭제되며 되돌릴 수 없습니다.`
                      : undefined
                  }
                />
              </ActionForm>
            </div>

            <ul className="mt-4 divide-y divide-line border-y border-line">
              {category.skills.map((skill, skillIndex) => (
                <li key={skill.id} className="flex flex-wrap items-start gap-2 py-3">
                  <ActionForm action={saveSkill} className="min-w-0 flex-1">
                    <input type="hidden" name="id" value={skill.id} />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <label htmlFor={`skill-name-${skill.id}`} className="sr-only">
                        스킬 이름
                      </label>
                      <input
                        id={`skill-name-${skill.id}`}
                        name="name"
                        defaultValue={skill.name}
                        required
                        maxLength={40}
                        className={fieldClass}
                      />
                      <label htmlFor={`skill-level-${skill.id}`} className="sr-only">
                        숙련도
                      </label>
                      <LevelSelect id={`skill-level-${skill.id}`} defaultValue={skill.level} />
                      <SubmitButton variant="secondary" className="shrink-0">
                        저장
                      </SubmitButton>
                    </div>
                    <FieldError name="name" />
                  </ActionForm>
                  <MoveButtons
                    action={moveSkill}
                    id={skill.id}
                    isFirst={skillIndex === 0}
                    isLast={skillIndex === category.skills.length - 1}
                    label={skill.name}
                  />
                  <ActionForm action={deleteSkill} showStatus={false}>
                    <input type="hidden" name="id" value={skill.id} />
                    <ConfirmDeleteButton title={`‘${skill.name}’ 스킬을 삭제할까요?`} />
                  </ActionForm>
                </li>
              ))}
              {category.skills.length === 0 ? (
                <li className="py-3 text-muted">아직 스킬이 없습니다.</li>
              ) : null}
            </ul>

            <ActionForm action={saveSkill} resetOnSuccess className="mt-4">
              <input type="hidden" name="categoryId" value={category.id} />
              <p className={labelClass}>스킬 추가</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor={`new-skill-${category.id}`} className="sr-only">
                  새 스킬 이름
                </label>
                <input
                  id={`new-skill-${category.id}`}
                  name="name"
                  required
                  maxLength={40}
                  placeholder="예: Spring Boot"
                  className={fieldClass}
                />
                <label htmlFor={`new-skill-level-${category.id}`} className="sr-only">
                  숙련도
                </label>
                <LevelSelect id={`new-skill-level-${category.id}`} />
                <SubmitButton pendingText="추가 중…" className="shrink-0">
                  추가
                </SubmitButton>
              </div>
              <FieldError name="name" />
            </ActionForm>
          </Panel>
        ))}

        <Panel title="분류 추가">
          <ActionForm action={saveSkillCategory} resetOnSuccess>
            <label htmlFor="new-category" className="sr-only">
              새 분류 이름
            </label>
            <div className="flex gap-2">
              <input
                id="new-category"
                name="name"
                required
                maxLength={30}
                placeholder="예: Monitoring"
                className={fieldClass}
              />
              <SubmitButton pendingText="추가 중…" className="shrink-0">
                추가
              </SubmitButton>
            </div>
            <FieldError name="name" />
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
