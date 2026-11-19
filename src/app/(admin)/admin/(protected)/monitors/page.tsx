import type { Metadata } from "next";
import { deleteMonitor, moveMonitor, saveMonitor } from "@/actions/content";
import {
  ActionForm,
  ConfirmDeleteButton,
  FieldError,
  MoveButtons,
  SubmitButton,
} from "@/components/admin/action-form";
import { EmptyState, PageHeader, Panel } from "@/components/admin/page-header";
import { fieldClass, helpClass, labelClass } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";

// 관리자 화면은 로딩 표시 없이, 데이터를 다 받은 뒤 완성된 화면으로 바로 바꾼다(아래 layout.tsx 설명 참고).
export const instant = false;

export const metadata: Metadata = { title: "상태 감시" };

function MonitorFields({
  idPrefix,
  values,
}: {
  idPrefix: string;
  values?: { name: string; description: string; url: string; isActive: boolean };
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
        <div>
          <label htmlFor={`${idPrefix}-name`} className={labelClass}>
            이름
          </label>
          <input
            id={`${idPrefix}-name`}
            name="name"
            defaultValue={values?.name}
            required
            maxLength={40}
            placeholder="서비스 이름"
            className={fieldClass}
          />
          <FieldError name="name" />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-url`} className={labelClass}>
            주소
          </label>
          <input
            id={`${idPrefix}-url`}
            name="url"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={values?.url}
            required
            maxLength={300}
            placeholder="https://example.com"
            className={fieldClass}
          />
          <FieldError name="url" />
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor={`${idPrefix}-description`} className={labelClass}>
          설명 <span className="font-normal text-muted">(선택)</span>
        </label>
        <input
          id={`${idPrefix}-description`}
          name="description"
          defaultValue={values?.description}
          maxLength={120}
          placeholder="예: 회원가입·로그인을 담당하는 인증 API 서버"
          aria-describedby={`${idPrefix}-description-help`}
          className={fieldClass}
        />
        <p id={`${idPrefix}-description-help`} className={helpClass}>
          상태 페이지에서 이름 아래에 보입니다. 주소는 글자로 보이지 않고, ‘사이트 방문’ 버튼을 누르면 그 주소로 이동합니다.
        </p>
        <FieldError name="description" />
      </div>
      <label className="mt-2 flex min-h-11 w-fit items-center gap-2.5">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={values?.isActive ?? true}
          className="size-5 accent-(--accent)"
        />
        <span>상태 페이지에 표시</span>
      </label>
    </>
  );
}

export default async function MonitorsPage() {
  await requireAdmin();
  const monitors = await db.monitor.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="상태 감시"
        description="상태 페이지(/status)에서 정상 여부와 응답 시간을 확인할 주소입니다. 표시할 주소가 없으면 상태 페이지 링크도 숨겨집니다. 서버가 1분마다 확인해서, 두 번 연속 응답하지 않으면 장애 메일을, 다시 응답하면 복구 메일을 문의 받는 주소로 보냅니다."
      />

      <div className="space-y-4">
        {monitors.length === 0 ? <EmptyState>등록한 주소가 없습니다.</EmptyState> : null}

        {monitors.map((monitor, index) => (
          <Panel key={monitor.id}>
            <ActionForm action={saveMonitor}>
              <input type="hidden" name="id" value={monitor.id} />
              <MonitorFields idPrefix={`monitor-${monitor.id}`} values={monitor} />
              <div className="mt-2">
                <SubmitButton variant="secondary">저장</SubmitButton>
              </div>
            </ActionForm>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
              <MoveButtons
                action={moveMonitor}
                id={monitor.id}
                isFirst={index === 0}
                isLast={index === monitors.length - 1}
                label={monitor.name}
              />
              <ActionForm action={deleteMonitor} showStatus={false}>
                <input type="hidden" name="id" value={monitor.id} />
                <ConfirmDeleteButton title={`‘${monitor.name}’ 감시 주소를 삭제할까요?`} />
              </ActionForm>
            </div>
          </Panel>
        ))}

        <Panel title="주소 추가">
          <ActionForm action={saveMonitor} resetOnSuccess>
            <MonitorFields idPrefix="new-monitor" />
            <div className="mt-2">
              <SubmitButton pendingText="추가 중…">추가</SubmitButton>
            </div>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
