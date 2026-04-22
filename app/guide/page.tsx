import { Download, Shield, Bell, Trophy, MessageCircle } from 'lucide-react'

const DOWNLOAD_URL = 'https://github.com/kmm851010-maker/node-guardian/releases/latest/download/NodeGuardian.exe'

export default function GuidePage() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* 헤더 */}
      <div className="text-center space-y-3">
        <div className="text-5xl">🛡️</div>
        <h1 className="text-3xl font-bold text-violet-600">Node Guardian</h1>
        <p className="text-muted-foreground">Pi Node 자동 모니터링 프로그램</p>
        <a
          href={DOWNLOAD_URL}
          className="inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 transition-colors"
        >
          <Download size={18} />
          NodeGuardian.exe 다운로드
        </a>
        <p className="text-xs text-muted-foreground">Windows 10/11 · Python 설치 불필요</p>
      </div>

      {/* 기능 소개 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Shield, title: '노드 프로세스 감시', desc: 'Pi GUI, Docker 중단 감지' },
          { icon: Bell, title: '실시간 알림', desc: '텔레그램 + 폰 푸시 알림' },
          { icon: Trophy, title: 'LinkPi 랭킹 연동', desc: '업타임 기반 순위 반영' },
          { icon: MessageCircle, title: '커뮤니티 연동', desc: '노드 상태 자동 공유' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="border rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Icon size={16} className="text-violet-500" />
              {title}
            </div>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      {/* 설치 가이드 */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">📋 설치 및 사용 방법</h2>

        {[
          {
            step: 1,
            title: 'NodeGuardian.exe 다운로드',
            desc: '위 버튼을 클릭해 exe 파일을 다운받습니다. 원하는 폴더에 저장하세요.',
            note: 'Windows SmartScreen 경고가 뜨면 "추가 정보" → "실행" 클릭',
          },
          {
            step: 2,
            title: '처음 실행 — 설정 마법사',
            desc: '프로그램을 실행하면 설정 창이 자동으로 뜹니다. Pi 사용자명(Pi Browser 로그인 ID)을 입력하고 "저장하고 시작하기"를 클릭합니다.',
            note: '설정 파일(.env)은 exe와 같은 폴더에 자동 생성됩니다.',
          },
          {
            step: 3,
            title: '텔레그램 알림 설정',
            desc: '텔레그램에서 @serge_node_guardian_bot 을 검색해 대화를 시작합니다.',
            code: '/start 파이사용자명\n예시: /start leechwile',
          },
          {
            step: 4,
            title: 'LinkPi 앱 로그인 (폰 푸시 알림)',
            desc: 'Pi Browser에서 pilink.vercel.app 접속 후 Pi 로그인하면 폰 푸시 알림도 활성화됩니다.',
          },
          {
            step: 5,
            title: '트레이 아이콘으로 상태 확인',
            desc: '작업표시줄 트레이에 색상 아이콘이 표시됩니다.',
            items: ['🟢 초록 — 정상', '🟡 노랑 — 경고 (GUI 중단 등)', '🔴 빨강 — 위험 (Docker/노드 중단)', '⚪ 회색 — 시작 중'],
          },
          {
            step: 6,
            title: 'PC 시작 시 자동 실행 (선택)',
            desc: 'exe 파일 바로가기를 만들어 시작 프로그램 폴더에 넣으면 PC 켤 때 자동 시작됩니다.',
            code: 'Win+R → shell:startup → 바로가기 붙여넣기',
          },
        ].map(({ step, title, desc, note, code, items }) => (
          <div key={step} className="border rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-violet-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                {step}
              </span>
              <h3 className="font-semibold">{title}</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-10">{desc}</p>
            {note && (
              <p className="text-xs text-yellow-600 bg-yellow-50 rounded-lg px-3 py-2 ml-10">⚠️ {note}</p>
            )}
            {code && (
              <pre className="text-xs bg-muted rounded-lg px-3 py-2 ml-10 font-mono whitespace-pre-wrap">{code}</pre>
            )}
            {items && (
              <ul className="text-sm text-muted-foreground ml-10 space-y-1">
                {items.map(item => <li key={item}>{item}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* 문의 */}
      <div className="border rounded-xl p-4 text-center space-y-2">
        <p className="font-semibold">문의 및 커뮤니티</p>
        <p className="text-sm text-muted-foreground">
          LinkPi 앱 내 QnA 게시판을 이용해주세요.
        </p>
        <a href="/" className="text-violet-600 text-sm font-medium hover:underline">
          LinkPi 앱 바로가기 →
        </a>
      </div>
    </div>
  )
}
