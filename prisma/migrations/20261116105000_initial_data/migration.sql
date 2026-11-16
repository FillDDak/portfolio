-- 운영에 필요한 최소 초기 데이터. 더미 콘텐츠는 넣지 않는다 (prisma/seed.dev.ts 참고).
INSERT INTO "Profile" ("id", "name", "jobTitle", "tagline", "bio", "coreStack", "githubUrl", "velogUrl", "notionUrl", "updatedAt")
VALUES (
  1,
  '최현규',
  '백엔드 개발자',
  '깊이 고민하고 확실하게 구현하는 개발자',
  '문제의 원인을 끝까지 파고들어 이해한 뒤에 구현하는 백엔드 개발자 최현규입니다. 동작하는 코드에서 멈추지 않고, 왜 그렇게 동작하는지 설명할 수 있을 때까지 확인합니다. 배우고 고민한 과정은 기록으로 남겨 공유합니다.',
  '',
  'https://github.com/FillDDak',
  'https://velog.io/@cgr456/posts',
  '',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

INSERT INTO "SkillCategory" ("name", "sortOrder") VALUES
  ('Backend', 0),
  ('Frontend', 1),
  ('Database', 2),
  ('Infra·DevOps', 3),
  ('Tools', 4);

INSERT INTO "Monitor" ("name", "url", "isActive", "sortOrder") VALUES
  ('przo.kr', 'https://przo.kr', 1, 0);
