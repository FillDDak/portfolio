import type { Metadata } from "next";
import { saveProfile } from "@/actions/content";
import { ActionForm, FieldError, SubmitButton } from "@/components/admin/action-form";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { fieldClass, helpClass, labelClass, textareaClass } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "자기소개·링크" };

export default async function ProfilePage() {
  await requireAdmin();
  const profile = await db.profile.findUniqueOrThrow({ where: { id: 1 } });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="자기소개·링크"
        description="홈 첫 화면에 보이는 내용입니다. 비워 둔 항목은 공개 페이지에 표시되지 않습니다."
      />
      <ActionForm action={saveProfile} className="space-y-5">
        <Panel title="소개">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className={labelClass}>
                이름
              </label>
              <input id="name" name="name" defaultValue={profile.name} required maxLength={30} className={fieldClass} />
              <FieldError name="name" />
            </div>
            <div>
              <label htmlFor="jobTitle" className={labelClass}>
                직무
              </label>
              <input id="jobTitle" name="jobTitle" defaultValue={profile.jobTitle} required maxLength={40} className={fieldClass} />
              <FieldError name="jobTitle" />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="tagline" className={labelClass}>
              한 줄 소개
            </label>
            <input id="tagline" name="tagline" defaultValue={profile.tagline} required maxLength={80} className={fieldClass} />
            <FieldError name="tagline" />
          </div>
          <div className="mt-4">
            <label htmlFor="bio" className={labelClass}>
              자기소개
            </label>
            <textarea id="bio" name="bio" defaultValue={profile.bio} rows={5} maxLength={600} className={textareaClass} />
            <p className={helpClass}>2~3문장을 권장합니다. 첫 화면에서 스크롤 없이 버튼까지 보이려면 짧을수록 좋습니다.</p>
            <FieldError name="bio" />
          </div>
          <div className="mt-4">
            <label htmlFor="coreStack" className={labelClass}>
              핵심 스택
            </label>
            <input
              id="coreStack"
              name="coreStack"
              defaultValue={profile.coreStack}
              maxLength={300}
              placeholder="Java, Spring Boot, MySQL"
              className={fieldClass}
            />
            <p className={helpClass}>쉼표로 구분합니다. 5~6개 이내를 권장합니다.</p>
            <FieldError name="coreStack" />
          </div>
        </Panel>

        <Panel title="링크">
          <div className="space-y-4">
            {(
              [
                ["githubUrl", "GitHub", profile.githubUrl, "https://github.com/아이디"],
                ["velogUrl", "Velog", profile.velogUrl, "https://velog.io/@아이디"],
                ["notionUrl", "Notion", profile.notionUrl, "https://www.notion.so/…"],
              ] as const
            ).map(([name, label, value, placeholder]) => (
              <div key={name}>
                <label htmlFor={name} className={labelClass}>
                  {label}
                </label>
                <input
                  id={name}
                  name={name}
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  defaultValue={value}
                  maxLength={300}
                  placeholder={placeholder}
                  className={fieldClass}
                />
                <FieldError name={name} />
              </div>
            ))}
            <div>
              <label htmlFor="contactEmail" className={labelClass}>
                공개 이메일
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                defaultValue={profile.contactEmail}
                maxLength={254}
                placeholder="me@example.com"
                className={fieldClass}
              />
              <p className={helpClass}>
                문의 섹션에 복사 버튼과 함께 보입니다. 누구나 볼 수 있으니 공개해도 되는 주소만 적어 주세요.
              </p>
              <FieldError name="contactEmail" />
            </div>
          </div>
        </Panel>

        <SubmitButton className="w-full sm:w-auto sm:min-w-32">저장</SubmitButton>
      </ActionForm>
    </div>
  );
}
