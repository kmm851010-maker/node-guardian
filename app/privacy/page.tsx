export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">개인정보처리방침</h1>
      <p className="text-sm text-muted-foreground">최종 업데이트: 2026년 4월</p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">1. 수집하는 정보</h2>
        <p className="text-sm">LinkPi는 Pi Network 로그인 시 Pi 사용자 ID 및 사용자명을 수집합니다. 노드 운영 상태, 이벤트 로그, 커뮤니티 게시물 등 사용자가 직접 입력한 정보를 저장합니다.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">2. 정보의 이용</h2>
        <p className="text-sm">수집된 정보는 노드 모니터링 서비스 제공, 커뮤니티 기능 운영, 랭킹 산출 목적으로만 사용됩니다.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">3. 정보의 보관</h2>
        <p className="text-sm">사용자 데이터는 Supabase 클라우드 데이터베이스에 안전하게 저장됩니다. 계정 삭제 요청 시 관련 데이터를 모두 삭제합니다.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">4. 제3자 공유</h2>
        <p className="text-sm">수집된 개인정보는 법적 요구가 있는 경우를 제외하고 제3자에게 공유하지 않습니다.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">5. Pi Network</h2>
        <p className="text-sm">본 앱은 Pi Network SDK를 통해 인증 및 결제 기능을 제공합니다. Pi Network의 개인정보처리방침도 함께 적용됩니다.</p>
      </section>
    </div>
  )
}
