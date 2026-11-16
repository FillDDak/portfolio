import { ContactForm } from "@/components/public/contact-form";
import { Hero } from "@/components/public/hero";
import {
  CertificatesSection,
  LinksSection,
  ProjectsSection,
  SkillsSection,
  getProfileLinks,
} from "@/components/public/home-sections";
import { Section } from "@/components/public/section";
import {
  getCertificates,
  getProfile,
  getPublishedProjects,
  getSkillGroups,
} from "@/lib/data/public";

export default async function HomePage() {
  const [profile, projects, skillGroups, certificates] = await Promise.all([
    getProfile(),
    getPublishedProjects(),
    getSkillGroups(),
    getCertificates(),
  ]);
  const links = getProfileLinks(profile);

  // 데이터가 없는 섹션은 만들지 않고, 번호는 실제로 보이는 섹션에만 순서대로 매긴다.
  let index = 0;

  return (
    <>
      <Hero profile={profile} />
      {projects.length > 0 ? <ProjectsSection index={++index} projects={projects} /> : null}
      {skillGroups.length > 0 ? <SkillsSection index={++index} groups={skillGroups} /> : null}
      {certificates.length > 0 ? (
        <CertificatesSection index={++index} certificates={certificates} />
      ) : null}
      {links.length > 0 ? <LinksSection index={++index} links={links} /> : null}
      <Section
        id="contact"
        index={++index}
        title="문의"
        description="채용 제안이나 궁금한 점을 남겨 주세요. 작성하신 내용은 메일로 바로 전달됩니다."
      >
        <div className="max-w-3xl">
          <ContactForm recipientName={profile.name} />
        </div>
      </Section>
    </>
  );
}
