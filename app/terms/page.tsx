export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">이용약관</h1>
      <p className="text-sm text-muted-foreground">최종 업데이트: 2026년 4월</p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">1. 서비스 개요</h2>
        <p className="text-sm">LinkPi는 Pi Node 운영자를 위한 모니터링 및 커뮤니티 플랫폼입니다. Pi Network 계정을 통해 로그인하여 이용할 수 있습니다.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">2. 이용 조건</h2>
        <p className="text-sm">본 서비스는 Pi Browser를 통해 Pi Network 계정으로 인증한 사용자만 이용할 수 있습니다. 허위 정보 입력, 서비스 악용 행위는 금지됩니다.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">3. 프리미엄 구독</h2>
        <p className="text-sm">프리미엄 구독은 1 Pi/월이며, Pi Network 결제 시스템을 통해 처리됩니다. 구독 기간 만료 후 자동 갱신되지 않으며, 환불은 Pi Network 정책에 따릅니다.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">4. 커뮤니티 규칙</h2>
        <p className="text-sm">타인을 비방하거나 불법적인 내용을 게시하는 행위는 금지됩니다. 운영자는 부적절한 게시물을 삭제할 권리를 가집니다.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">5. 면책 조항</h2>
        <p className="text-sm">LinkPi는 Pi Network의 공식 서비스가 아닙니다. 서비스 이용 중 발생하는 Pi 자산 손실에 대해 책임을 지지 않습니다.</p>
      </section>
    </div>
  )
}
