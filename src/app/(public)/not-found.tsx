import { NotFoundView } from "@/components/not-found-view";

/** 공개 페이지가 notFound() 를 호출했을 때(PDF 나 상태 페이지가 꺼져 있을 때 등) 헤더·푸터 안에 보이는 화면 */
export default function PublicNotFound() {
  return <NotFoundView />;
}
