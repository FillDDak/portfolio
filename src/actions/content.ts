"use server";

import { updateTag } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth/guard";
import { CACHE_TAGS } from "@/lib/data/public";
import { db } from "@/lib/db";
import { moveInList, type Direction } from "@/lib/reorder";
import { deleteStored } from "@/lib/upload/storage";
import {
  certificateSchema,
  experienceSchema,
  flattenErrors,
  monitorSchema,
  profileSchema,
  projectSchema,
  skillCategorySchema,
  skillSchema,
} from "@/lib/validation/content";

/*
 * 관리자 화면의 저장·삭제·순서 변경.
 * 모든 동작은 첫 줄에서 requireAdmin() 으로 세션을 확인하고,
 * 저장 뒤에는 해당 데이터의 캐시 태그를 갱신해서 공개 페이지에 바로 반영한다.
 */

const formId = (formData: FormData, name = "id") => Number(formData.get(name));
const formText = (formData: FormData, name: string) => String(formData.get(name) ?? "");
const formDirection = (formData: FormData): Direction =>
  formData.get("direction") === "up" ? "up" : "down";

/** 예상하지 못한 오류를 화면에 보여줄 메시지로 바꾼다. */
function unexpected(error: unknown, action: string): ActionResult {
  console.error(`[admin] ${action} 실패`, error);
  return fail(`${action}하지 못했습니다. 잠시 후 다시 시도해 주세요.`);
}

/* ── 자기소개와 링크 ─────────────────────────────────────── */

export async function saveProfile(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(flattenErrors(parsed.error));
  try {
    await db.profile.update({ where: { id: 1 }, data: parsed.data });
    updateTag(CACHE_TAGS.profile);
    return ok("저장했습니다.");
  } catch (error) {
    return unexpected(error, "저장");
  }
}

/* ── 프로젝트 ────────────────────────────────────────────── */

export async function saveProject(id: number | null, input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return invalid(flattenErrors(parsed.error));
  const { tags, images, endDate, coverImage, ...fields } = parsed.data;

  try {
    const sameSlug = await db.project.findUnique({ where: { slug: fields.slug }, select: { id: true } });
    if (sameSlug && sameSlug.id !== id) {
      return invalid({ slug: "이미 다른 프로젝트가 쓰고 있는 주소(slug)입니다." });
    }

    const data = {
      ...fields,
      endDate: endDate || null,
      coverImage: coverImage || null,
    };
    const tagRows = tags.map((name, sortOrder) => ({ name, sortOrder }));
    const imageRows = images.map((image, sortOrder) => ({ ...image, sortOrder }));

    if (id === null) {
      const last = await db.project.aggregate({ _max: { sortOrder: true } });
      const created = await db.project.create({
        data: {
          ...data,
          sortOrder: (last._max.sortOrder ?? -1) + 1,
          tags: { create: tagRows },
          images: { create: imageRows },
        },
      });
      updateTag(CACHE_TAGS.projects);
      return ok("프로젝트를 추가했습니다.", created.id);
    }

    const before = await db.project.findUnique({
      where: { id },
      select: { coverImage: true, images: { select: { file: true } } },
    });
    if (!before) return fail("프로젝트를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.");

    await db.$transaction([
      db.projectTag.deleteMany({ where: { projectId: id } }),
      db.projectImage.deleteMany({ where: { projectId: id } }),
      db.project.update({
        where: { id },
        data: { ...data, tags: { create: tagRows }, images: { create: imageRows } },
      }),
    ]);

    // 더 이상 쓰지 않는 이미지 파일은 디스크에서 지운다.
    const kept = new Set([data.coverImage, ...images.map((image) => image.file)]);
    const previous = [before.coverImage, ...before.images.map((image) => image.file)];
    await Promise.all(
      previous.filter((file) => file && !kept.has(file)).map((file) => deleteStored("images", file)),
    );

    updateTag(CACHE_TAGS.projects);
    return ok("저장했습니다.", id);
  } catch (error) {
    return unexpected(error, "저장");
  }
}

export async function deleteProject(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = formId(formData);
  try {
    const project = await db.project.findUnique({
      where: { id },
      select: { coverImage: true, images: { select: { file: true } } },
    });
    if (!project) return fail("프로젝트를 찾을 수 없습니다.");
    await db.project.delete({ where: { id } });
    await Promise.all(
      [project.coverImage, ...project.images.map((image) => image.file)].map((file) =>
        deleteStored("images", file),
      ),
    );
    updateTag(CACHE_TAGS.projects);
    return ok("삭제했습니다.");
  } catch (error) {
    return unexpected(error, "삭제");
  }
}

export async function moveProject(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  try {
    const rows = await db.project.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    const order = moveInList(rows.map((row) => row.id), formId(formData), formDirection(formData));
    if (!order) return ok();
    await db.$transaction(
      order.map((id, sortOrder) => db.project.update({ where: { id }, data: { sortOrder } })),
    );
    updateTag(CACHE_TAGS.projects);
    return ok();
  } catch (error) {
    return unexpected(error, "순서를 변경");
  }
}

/** 목록 화면에서 공개 여부와 대표 여부를 바로 바꾼다. */
export async function toggleProjectFlag(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = formId(formData);
  const flag = formText(formData, "flag") === "isFeatured" ? "isFeatured" : "isPublished";
  try {
    const project = await db.project.findUnique({ where: { id }, select: { [flag]: true } });
    if (!project) return fail("프로젝트를 찾을 수 없습니다.");
    await db.project.update({ where: { id }, data: { [flag]: !project[flag] } });
    updateTag(CACHE_TAGS.projects);
    return ok();
  } catch (error) {
    return unexpected(error, "변경");
  }
}

/* ── 스킬 분류와 스킬 ─────────────────────────────────────── */

export async function saveSkillCategory(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = skillCategorySchema.safeParse({ name: formText(formData, "name") });
  if (!parsed.success) return invalid(flattenErrors(parsed.error));
  const id = formData.get("id") ? formId(formData) : null;
  try {
    if (id === null) {
      const last = await db.skillCategory.aggregate({ _max: { sortOrder: true } });
      await db.skillCategory.create({
        data: { ...parsed.data, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      });
    } else {
      await db.skillCategory.update({ where: { id }, data: parsed.data });
    }
    updateTag(CACHE_TAGS.skills);
    return ok(id === null ? "분류를 추가했습니다." : "저장했습니다.");
  } catch (error) {
    return unexpected(error, "저장");
  }
}

export async function deleteSkillCategory(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  try {
    // 분류에 속한 스킬도 함께 지워진다(스키마의 onDelete: Cascade).
    await db.skillCategory.delete({ where: { id: formId(formData) } });
    updateTag(CACHE_TAGS.skills);
    return ok("삭제했습니다.");
  } catch (error) {
    return unexpected(error, "삭제");
  }
}

export async function moveSkillCategory(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  try {
    const rows = await db.skillCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    const order = moveInList(rows.map((row) => row.id), formId(formData), formDirection(formData));
    if (!order) return ok();
    await db.$transaction(
      order.map((id, sortOrder) => db.skillCategory.update({ where: { id }, data: { sortOrder } })),
    );
    updateTag(CACHE_TAGS.skills);
    return ok();
  } catch (error) {
    return unexpected(error, "순서를 변경");
  }
}

export async function saveSkill(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = skillSchema.safeParse({
    name: formText(formData, "name"),
    level: formText(formData, "level"),
  });
  if (!parsed.success) return invalid(flattenErrors(parsed.error));
  const id = formData.get("id") ? formId(formData) : null;
  try {
    if (id === null) {
      const categoryId = formId(formData, "categoryId");
      const category = await db.skillCategory.findUnique({ where: { id: categoryId } });
      if (!category) return fail("분류를 찾을 수 없습니다.");
      const last = await db.skill.aggregate({ where: { categoryId }, _max: { sortOrder: true } });
      await db.skill.create({
        data: { ...parsed.data, categoryId, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      });
    } else {
      await db.skill.update({ where: { id }, data: parsed.data });
    }
    updateTag(CACHE_TAGS.skills);
    return ok(id === null ? "스킬을 추가했습니다." : "저장했습니다.");
  } catch (error) {
    return unexpected(error, "저장");
  }
}

export async function deleteSkill(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  try {
    await db.skill.delete({ where: { id: formId(formData) } });
    updateTag(CACHE_TAGS.skills);
    return ok("삭제했습니다.");
  } catch (error) {
    return unexpected(error, "삭제");
  }
}

export async function moveSkill(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  try {
    const id = formId(formData);
    const skill = await db.skill.findUnique({ where: { id }, select: { categoryId: true } });
    if (!skill) return fail("스킬을 찾을 수 없습니다.");
    const rows = await db.skill.findMany({
      where: { categoryId: skill.categoryId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    const order = moveInList(rows.map((row) => row.id), id, formDirection(formData));
    if (!order) return ok();
    await db.$transaction(
      order.map((rowId, sortOrder) => db.skill.update({ where: { id: rowId }, data: { sortOrder } })),
    );
    updateTag(CACHE_TAGS.skills);
    return ok();
  } catch (error) {
    return unexpected(error, "순서를 변경");
  }
}

/* ── 경험 ──────────────────────────────────────────────── */

export async function saveExperience(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = experienceSchema.safeParse({
    kind: formText(formData, "kind"),
    title: formText(formData, "title"),
    subtitle: formText(formData, "subtitle"),
    startDate: formText(formData, "startDate"),
    endDate: formText(formData, "endDate"),
    description: formText(formData, "description"),
    projectId: formText(formData, "projectId"),
  });
  if (!parsed.success) return invalid(flattenErrors(parsed.error));
  const id = formData.get("id") ? formId(formData) : null;
  try {
    const { projectId } = parsed.data;
    if (projectId !== null && !(await db.project.findUnique({ where: { id: projectId }, select: { id: true } }))) {
      return invalid({ projectId: "연결할 프로젝트를 찾을 수 없습니다." });
    }
    if (id === null) {
      await db.experience.create({ data: parsed.data });
    } else {
      await db.experience.update({ where: { id }, data: parsed.data });
    }
    updateTag(CACHE_TAGS.experiences);
    return ok(id === null ? "경험을 추가했습니다." : "저장했습니다.");
  } catch (error) {
    return unexpected(error, "저장");
  }
}

export async function deleteExperience(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  try {
    await db.experience.delete({ where: { id: formId(formData) } });
    updateTag(CACHE_TAGS.experiences);
    return ok("삭제했습니다.");
  } catch (error) {
    return unexpected(error, "삭제");
  }
}

/* ── 자격증 ──────────────────────────────────────────────── */

export async function saveCertificate(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = certificateSchema.safeParse({
    name: formText(formData, "name"),
    issuer: formText(formData, "issuer"),
    acquiredAt: formText(formData, "acquiredAt"),
  });
  if (!parsed.success) return invalid(flattenErrors(parsed.error));
  const id = formData.get("id") ? formId(formData) : null;
  try {
    if (id === null) {
      const last = await db.certificate.aggregate({ _max: { sortOrder: true } });
      await db.certificate.create({
        data: { ...parsed.data, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      });
    } else {
      await db.certificate.update({ where: { id }, data: parsed.data });
    }
    updateTag(CACHE_TAGS.certificates);
    return ok(id === null ? "자격증을 추가했습니다." : "저장했습니다.");
  } catch (error) {
    return unexpected(error, "저장");
  }
}

export async function deleteCertificate(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  try {
    await db.certificate.delete({ where: { id: formId(formData) } });
    updateTag(CACHE_TAGS.certificates);
    return ok("삭제했습니다.");
  } catch (error) {
    return unexpected(error, "삭제");
  }
}

export async function moveCertificate(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  try {
    const rows = await db.certificate.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    const order = moveInList(rows.map((row) => row.id), formId(formData), formDirection(formData));
    if (!order) return ok();
    await db.$transaction(
      order.map((id, sortOrder) => db.certificate.update({ where: { id }, data: { sortOrder } })),
    );
    updateTag(CACHE_TAGS.certificates);
    return ok();
  } catch (error) {
    return unexpected(error, "순서를 변경");
  }
}

/* ── 상태 페이지 감시 URL ─────────────────────────────────── */

export async function saveMonitor(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = monitorSchema.safeParse({
    name: formText(formData, "name"),
    description: formText(formData, "description"),
    url: formText(formData, "url"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return invalid(flattenErrors(parsed.error));
  const id = formData.get("id") ? formId(formData) : null;
  try {
    if (id === null) {
      const last = await db.monitor.aggregate({ _max: { sortOrder: true } });
      await db.monitor.create({
        data: { ...parsed.data, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      });
    } else {
      await db.monitor.update({ where: { id }, data: parsed.data });
    }
    updateTag(CACHE_TAGS.monitors);
    return ok(id === null ? "감시 주소를 추가했습니다." : "저장했습니다.");
  } catch (error) {
    return unexpected(error, "저장");
  }
}

export async function deleteMonitor(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  try {
    await db.monitor.delete({ where: { id: formId(formData) } });
    updateTag(CACHE_TAGS.monitors);
    return ok("삭제했습니다.");
  } catch (error) {
    return unexpected(error, "삭제");
  }
}

export async function moveMonitor(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  try {
    const rows = await db.monitor.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    const order = moveInList(rows.map((row) => row.id), formId(formData), formDirection(formData));
    if (!order) return ok();
    await db.$transaction(
      order.map((id, sortOrder) => db.monitor.update({ where: { id }, data: { sortOrder } })),
    );
    updateTag(CACHE_TAGS.monitors);
    return ok();
  } catch (error) {
    return unexpected(error, "순서를 변경");
  }
}
