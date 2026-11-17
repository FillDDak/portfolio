/**
 * 관리자 화면 사이를 이동할 때 보이는 로딩 표시.
 * 관리자 페이지는 요청마다 로그인 확인과 DB 조회를 하므로, 메뉴를 누르면 이 표시를 먼저 보여 주고 내용을 이어서 채운다.
 */
export default function AdminLoading() {
  return (
    <p role="status" className="text-muted">
      불러오는 중…
    </p>
  );
}
