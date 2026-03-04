import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <section>
      <h1>관리자 대시보드</h1>
      <p>{user?.name || user?.employeeId}님, 반갑습니다.</p>
      <div className="card-grid">
        <article className="card">
          <h3>사용자 관리</h3>
          <p>사용자 생성, 삭제, 복구와 비밀번호 변경을 처리합니다.</p>
        </article>
        <article className="card">
          <h3>정산 엑셀 업로드</h3>
          <p>기사 정산 엑셀 파일을 업로드합니다.</p>
        </article>
        <article className="card">
          <h3>공지사항</h3>
          <p>공지 작성, 수정, 삭제와 미확인자 조회를 지원합니다.</p>
        </article>
      </div>
    </section>
  );
}
