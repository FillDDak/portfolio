import type { Metadata } from "next";
import { deleteCertificate, moveCertificate, saveCertificate } from "@/actions/content";
import {
  ActionForm,
  ConfirmDeleteButton,
  FieldError,
  MoveButtons,
  SubmitButton,
} from "@/components/admin/action-form";
import { EmptyState, PageHeader, Panel } from "@/components/admin/page-header";
import { fieldClass, labelClass } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";

// 관리자 화면은 로딩 표시 없이, 데이터를 다 받은 뒤 완성된 화면으로 바로 바꾼다(아래 layout.tsx 설명 참고).
export const instant = false;

export const metadata: Metadata = { title: "자격증" };

function CertificateFields({
  idPrefix,
  values,
}: {
  idPrefix: string;
  values?: { name: string; issuer: string; acquiredAt: string };
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_11rem]">
      <div>
        <label htmlFor={`${idPrefix}-name`} className={labelClass}>
          이름
        </label>
        <input
          id={`${idPrefix}-name`}
          name="name"
          defaultValue={values?.name}
          required
          maxLength={80}
          placeholder="정보처리기사"
          className={fieldClass}
        />
        <FieldError name="name" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-issuer`} className={labelClass}>
          발급기관
        </label>
        <input
          id={`${idPrefix}-issuer`}
          name="issuer"
          defaultValue={values?.issuer}
          required
          maxLength={80}
          placeholder="한국산업인력공단"
          className={fieldClass}
        />
        <FieldError name="issuer" />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-date`} className={labelClass}>
          취득일
        </label>
        <input
          id={`${idPrefix}-date`}
          name="acquiredAt"
          type="date"
          defaultValue={values?.acquiredAt}
          required
          className={fieldClass}
        />
        <FieldError name="acquiredAt" />
      </div>
    </div>
  );
}

export default async function CertificatesPage() {
  await requireAdmin();
  const certificates = await db.certificate.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  return (
    <div className="max-w-4xl">
      <PageHeader title="자격증" description="위에서부터 순서대로 공개 페이지에 표시됩니다." />

      <div className="space-y-4">
        {certificates.length === 0 ? (
          <EmptyState>등록한 자격증이 없습니다. 자격증 섹션은 공개 페이지에 표시되지 않습니다.</EmptyState>
        ) : null}

        {certificates.map((certificate, index) => (
          <Panel key={certificate.id}>
            <ActionForm action={saveCertificate}>
              <input type="hidden" name="id" value={certificate.id} />
              <CertificateFields idPrefix={`certificate-${certificate.id}`} values={certificate} />
              <div className="mt-3">
                <SubmitButton variant="secondary">저장</SubmitButton>
              </div>
            </ActionForm>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
              <MoveButtons
                action={moveCertificate}
                id={certificate.id}
                isFirst={index === 0}
                isLast={index === certificates.length - 1}
                label={certificate.name}
              />
              <ActionForm action={deleteCertificate} showStatus={false}>
                <input type="hidden" name="id" value={certificate.id} />
                <ConfirmDeleteButton title={`‘${certificate.name}’ 자격증을 삭제할까요?`} />
              </ActionForm>
            </div>
          </Panel>
        ))}

        <Panel title="자격증 추가">
          <ActionForm action={saveCertificate} resetOnSuccess>
            <CertificateFields idPrefix="new-certificate" />
            <div className="mt-3">
              <SubmitButton pendingText="추가 중…">추가</SubmitButton>
            </div>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
