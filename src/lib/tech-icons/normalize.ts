/**
 * 기술 이름을 아이콘 모음(Simple Icons)의 이름 규칙에 맞춘다.
 * 대소문자·띄어쓰기·하이픈을 무시하고, 기호는 Simple Icons 처럼 글자로 바꾼다(Node.js → nodedotjs, C++ → cplusplus).
 */
export function techKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replaceAll("+", "plus")
    .replaceAll(".", "dot")
    .replaceAll("#", "sharp")
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]/g, "");
}

/** 기호까지 모두 버린 이름(Node.js → nodejs). 흔히 쓰는 줄임말·다른 표기를 찾을 때 쓴다. */
export function looseTechKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * 같은 기술의 다른 표기 → 아이콘 이름.
 * "extra:" 로 시작하면 Simple Icons 에 없어서 따로 넣은 아이콘(extra.ts)이다.
 */
export const TECH_ALIASES: Record<string, string> = {
  java: "extra:java",
  jdk: "extra:java",
  aws: "extra:aws",
  amazonwebservices: "extra:aws",
  slack: "extra:slack",
  springframework: "spring",
  k8s: "kubernetes",
  postgres: "postgresql",
  js: "javascript",
  ts: "typescript",
  nodejs: "nodedotjs",
  node: "nodedotjs",
  nextjs: "nextdotjs",
  next: "nextdotjs",
  vuejs: "vuedotjs",
  vue: "vuedotjs",
  nuxtjs: "nuxt",
  reactjs: "react",
  kafka: "apachekafka",
  tomcat: "apachetomcat",
  maven: "apachemaven",
  airflow: "apacheairflow",
  junit: "junit5",
  intellij: "intellijidea",
  mongo: "mongodb",
  golang: "go",
  gcp: "googlecloud",
  bash: "gnubash",
  jwt: "jsonwebtokens",
  githubaction: "githubactions",
};
