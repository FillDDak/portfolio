import { cacheTag } from "next/cache";
import { db } from "@/lib/db";

// ① 단계 확인용 임시 화면. ② 단계에서 실제 홈 화면으로 교체한다.
async function getProfile() {
  "use cache";
  cacheTag("profile");
  return db.profile.findUnique({ where: { id: 1 } });
}

export default async function Home() {
  const profile = await getProfile();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">{profile?.name}</h1>
      <p>{profile?.tagline}</p>
    </main>
  );
}
