import "server-only";
import * as simpleIcons from "simple-icons";
import { EXTRA_TECH_ICONS } from "./extra";
import { looseTechKey, TECH_ALIASES, techKey } from "./normalize";

/**
 * 기술 이름으로 단색 로고를 찾는다.
 * 아이콘 모음(약 3,400개)은 서버에서만 쓰고, 방문자에게는 화면에 쓰인 아이콘의 모양만 HTML 로 보낸다.
 */
export type TechIcon = { title: string; viewBox: string; path: string };

const SIMPLE_ICONS_VIEWBOX = "0 0 24 24";

let index: Map<string, TechIcon> | null = null;

/** 처음 찾을 때 한 번만 이름 → 아이콘 표를 만든다. */
function getIndex(): Map<string, TechIcon> {
  if (index) return index;
  const map = new Map<string, TechIcon>();
  for (const icon of Object.values(simpleIcons)) {
    if (!icon || typeof icon !== "object" || !("slug" in icon)) continue;
    const entry = { title: icon.title, viewBox: SIMPLE_ICONS_VIEWBOX, path: icon.path };
    map.set(icon.slug, entry);
    const byTitle = techKey(icon.title);
    if (!map.has(byTitle)) map.set(byTitle, entry);
  }
  for (const [id, icon] of Object.entries(EXTRA_TECH_ICONS)) {
    map.set(`extra:${id}`, icon);
  }
  index = map;
  return map;
}

/** 아이콘이 없으면 null. 이름이 조금 달라도(대소문자, 띄어쓰기, 흔한 줄임말) 찾는다. */
export function findTechIcon(name: string): TechIcon | null {
  const map = getIndex();
  const loose = looseTechKey(name);
  if (!loose) return null;
  const alias = TECH_ALIASES[loose];
  if (alias) return map.get(alias) ?? null;
  const found = map.get(techKey(name)) ?? map.get(loose);
  if (found) return found;
  // AWS EC2, AWS S3 처럼 AWS 서비스는 서비스별 로고가 없어서 AWS 로고를 쓴다.
  if (loose.startsWith("aws")) return map.get("extra:aws") ?? null;
  return null;
}
