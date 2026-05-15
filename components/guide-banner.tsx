'use client'

import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronUp, Smartphone, Monitor, Download, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react'

const DOWNLOAD_URL = 'https://github.com/kmm851010-maker/node-guardian/releases/latest/download/NodeGuardian.exe'

type GuideTab = 'pi' | 'pc'

interface Step {
  title: string
  desc: string
  note?: string
  warn?: string
  code?: string
  img?: string
}

const PI_STEPS: Step[] = [
  {
    title: 'Pi 앱을 실행하고 브라우저 탭 열기',
    desc: '스마트폰에서 Pi Network 앱을 실행합니다. 하단 메뉴에서 지구본 모양의 "Browser" 탭을 누르세요.',
    note: 'Pi Browser는 Pi 앱 안에 내장되어 있어 별도 설치가 필요 없습니다.',
  },
  {
    title: '주소창에 사이트 주소 입력',
    desc: 'Pi Browser 상단 주소창을 누르고 아래 주소를 입력한 뒤 이동하세요.',
    code: 'pilink.vercel.app',
  },
  {
    title: '오른쪽 상단 "Pi 로그인" 버튼 클릭',
    desc: '사이트에 접속하면 우측 상단에 보라색 "Pi 로그인" 버튼이 보입니다. 버튼을 눌러주세요.',
    note: '"Pi 로그인" 버튼은 Pi Browser에서만 보입니다. 일반 브라우저에서는 표시되지 않아요.',
  },
  {
    title: 'Pi 계정 인증',
    desc: 'Pi 앱에서 인증 팝업이 뜨면 "Allow" 또는 "허용" 버튼을 누르세요. 자동으로 로그인됩니다.',
    warn: '팝업이 뜨지 않으면 Pi 앱을 재시작한 뒤 다시 시도해주세요.',
  },
  {
    title: '대시보드에서 내 노드 상태 확인',
    desc: '로그인 후 대시보드에서 내 Pi 노드 상태, 포트 현황, 이벤트 로그를 실시간으로 확인할 수 있습니다.',
    note: 'Node Guardian PC 프로그램이 실행 중이어야 노드 상태가 표시됩니다.',
  },
  {
    title: '텔레그램 알림 설정 (권장)',
    desc: 'Pi Browser에서는 웹 푸시 알림이 지원되지 않아 텔레그램 알림을 권장합니다. 노드에 이상이 생기면 텔레그램으로 즉시 알림을 받을 수 있습니다.',
    code: '① 텔레그램에서 @serge_node_guardian_bot 검색\n② 채팅창에서 /start 입력\n③ 봇이 답장한 숫자(Chat ID)를 복사\n④ 프로필 탭 → 텔레그램 알림 → ID 입력 후 연결',
    note: '연결 성공 시 텔레그램으로 확인 메시지가 옵니다.',
  },
]

const PC_STEPS: Step[] = [
  {
    title: 'PC 일반 브라우저에서 사이트 접속',
    desc: '크롬, 엣지 등 일반 브라우저에서 아래 주소로 접속하세요. 다운로드 버튼은 PC에서만 보입니다.',
    code: 'pilink.vercel.app',
    note: '스마트폰 Pi Browser에서는 다운로드 버튼이 표시되지 않아요. 반드시 PC에서 접속하세요.',
  },
  {
    title: '상단 "프로그램 다운로드" 버튼 클릭',
    desc: 'PC 화면 오른쪽 상단의 보라색 "프로그램 다운로드" 버튼을 눌러 NodeGuardian.exe 파일을 받으세요.',
    warn: '브라우저가 다운로드를 차단하면 "유지" 또는 "Keep" 버튼을 눌러 계속 진행하세요.',
  },
  {
    title: 'Windows 보안 경고 처리',
    desc: '처음 실행 시 Windows SmartScreen 경고창이 뜰 수 있습니다. 이는 새 프로그램이라 생기는 정상적인 경고입니다.',
    code: '① "추가 정보" 또는 "More info" 클릭\n② "실행" 또는 "Run anyway" 클릭',
    note: '이 프로그램은 오픈소스이며 소스코드를 GitHub에서 누구나 확인할 수 있습니다.',
  },
  {
    title: '설정 마법사 — Pi 정보 입력',
    desc: '프로그램을 실행하면 설정 창이 자동으로 뜹니다. 아래 정보를 입력하세요.',
    code: '• Pi 사용자명: Pi 앱에서 사용하는 닉네임\n  (예: piuser123, johnpi)\n• 입력 후 "저장하고 시작하기" 클릭',
    note: '사용자명을 모르면 Pi 앱 → 프로필에서 @ 뒤에 오는 이름입니다.\n\n닉네임을 잘못 입력했다면? NodeGuardian.exe와 같은 폴더에 생성된 .env 파일을 삭제한 뒤 프로그램을 다시 실행하면 설정 창이 다시 뜹니다.',
  },
  {
    title: '모니터링 시작 확인',
    desc: '설정 완료 후 프로그램이 자동으로 노드 감시를 시작합니다. 윈도우 작업표시줄 오른쪽 하단 트레이 아이콘을 확인하세요.',
    code: '🟢 초록 — 노드 정상 작동 중\n🟡 노랑 — 경고 (일부 프로세스 중단)\n🔴 빨강 — 위험 (노드 중단)\n⚪ 회색 — 시작 중 또는 확인 불가',
    note: '리소스 사용량: RAM 약 25~40MB, CPU 0~0.1% 수준으로 매우 가볍습니다. 백그라운드에서 실행해도 PC 성능에 영향을 주지 않습니다.',
  },
  {
    title: 'Pi Browser에서 상태 확인',
    desc: '이제 스마트폰 Pi Browser에서 pilink.vercel.app 에 접속하면 방금 설치한 노드의 상태가 실시간으로 표시됩니다.',
    note: '노드가디언 파일을 설치한 PC의 노드 고유번호를 Pi Browser에 로그인한 계정 프로필에 등록하셔야 정상적으로 서로 연결되어 실시간 연동이 됩니다.',
  },
  {
    title: '재부팅 후 자동 시작 등록 (강력 권장)',
    desc: 'PC가 재부팅되면 NodeGuardian이 자동으로 다시 실행되도록 Windows 시작 프로그램에 등록하세요. 등록하지 않으면 Windows 업데이트나 정전 후 재부팅 시 노드 감시가 중단됩니다.',
    code: '① NodeGuardian.exe 파일에 우클릭 → "바로 가기 만들기"\n② 키보드에서 Win키 + R 동시에 누르기\n③ 실행 창에 아래를 입력 후 확인\n   shell:startup\n④ 열린 폴더에 ①에서 만든 바로가기를 붙여넣기\n\n✅ 이제 PC를 재시작해도 자동으로 실행됩니다.',
    note: '등록 확인 방법: 작업 관리자(Ctrl+Shift+Esc) → 시작 프로그램 탭 → NodeGuardian 항목이 "사용"으로 표시되면 완료.',
    warn: '시작 프로그램 폴더 위치: C:\\Users\\[사용자명]\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup',
  },
]

interface Props {
  onClose?: () => void
  fullPage?: boolean
}

export function GuideBanner({ onClose, fullPage = false }: Props) {
  const [tab, setTab] = useState<GuideTab>('pc')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [isPiBrowser, setIsPiBrowser] = useState(false)

  useEffect(() => {
    setIsPiBrowser(typeof window !== 'undefined' && !!(window as any).Pi)
  }, [])

  const steps = tab === 'pi' ? PI_STEPS : PC_STEPS

  return (
    <div className={`bg-white ${fullPage ? '' : 'rounded-2xl border shadow-lg'} overflow-hidden`}>
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base">📱 LinkPi 시작 가이드</h2>
            <p className="text-xs text-violet-200 mt-0.5">① PC 프로그램 설치 → ② Pi Browser 연동 순서로 진행하세요</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => { setTab('pc'); setExpanded(null) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              tab === 'pc' ? 'bg-white text-violet-700' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Monitor size={13} /> 1단계 · PC 프로그램 설치
          </button>
          <button
            onClick={() => { setTab('pi'); setExpanded(null) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              tab === 'pi' ? 'bg-white text-violet-700' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Smartphone size={13} /> 2단계 · Pi Browser 연동
          </button>
        </div>
      </div>

      {/* 탭 설명 */}
      <div className={`px-4 py-2 text-xs font-medium flex items-center gap-2 ${tab === 'pi' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
        {tab === 'pi' ? (
          <><Smartphone size={12} /> <span><b>2단계</b> · PC 프로그램 설치 완료 후 진행하세요 · Pi Browser에서 pilink.vercel.app 접속</span></>
        ) : (
          <><Monitor size={12} /> <span><b>1단계 먼저!</b> · PC에 프로그램을 먼저 설치해야 Pi Browser와 연동됩니다</span></>
        )}
      </div>

      {/* PC 다운로드 버튼 — PC 일반 브라우저에서만 표시 (모바일/Pi Browser 숨김) */}
      {tab === 'pc' && (
        <div className="hidden md:block px-4 py-3 bg-violet-50 border-b">
          <a
            href={DOWNLOAD_URL}
            className="flex items-center justify-center gap-2 w-full py-3 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors active:scale-95"
          >
            <Download size={16} />
            NodeGuardian.exe 다운로드
          </a>
          <p className="text-xs text-center text-muted-foreground mt-1.5">Windows 10/11 · 설치 프로그램 없음 · 무료</p>
        </div>
      )}

      {/* 단계별 가이드 */}
      <div className="px-4 py-3 space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="border rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                expanded === i ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700'
              }`}>
                {i + 1}
              </span>
              <span className="text-sm font-medium flex-1">{step.title}</span>
              {expanded === i
                ? <ChevronUp size={16} className="text-muted-foreground shrink-0" />
                : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
            </button>

            {expanded === i && (
              <div className="px-4 pb-4 space-y-2 bg-muted/10">
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>

                {step.code && (
                  <pre className="text-xs bg-gray-900 text-green-400 rounded-lg px-3 py-2.5 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {step.code}
                  </pre>
                )}

                {step.note && (
                  <div className="flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2">
                    <CheckCircle2 size={13} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">{step.note}</p>
                  </div>
                )}

                {step.warn && (
                  <div className="flex items-start gap-2 bg-yellow-50 rounded-lg px-3 py-2">
                    <AlertCircle size={13} className="text-yellow-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-yellow-700 leading-relaxed">{step.warn}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 하단 문의 안내 */}
      <div className="px-4 py-3 bg-muted/30 border-t text-center">
        <p className="text-xs text-muted-foreground">
          설치 중 문제가 생겼나요? <span className="text-violet-600 font-medium">QnA 게시판</span>에 질문해주세요!
        </p>
      </div>
    </div>
  )
}

// 앱 내 플로팅 가이드 버튼 + 드로어
export default function GuideDrawer() {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const seen = localStorage.getItem('guide_banner_seen')
    if (!seen) setDismissed(false)
  }, [])

  const dismiss = () => {
    localStorage.setItem('guide_banner_seen', '1')
    setDismissed(true)
  }

  return (
    <>
      {/* 첫 방문 배너 */}
      {!dismissed && (
        <div className="mx-4 mt-3 rounded-2xl border-2 border-violet-200 bg-violet-50 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="text-2xl">👋</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-violet-800">처음 방문하셨나요?</p>
              <p className="text-xs text-violet-600">LinkPi 시작 가이드를 확인해보세요!</p>
            </div>
            <button onClick={dismiss} className="p-1 text-violet-400 hover:text-violet-600"><X size={16} /></button>
          </div>
          <div className="px-4 pb-3 flex gap-2">
            <button
              onClick={() => { setOpen(true); dismiss() }}
              className="flex-1 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
            >
              📖 가이드 보기
            </button>
            <button onClick={dismiss} className="px-4 py-2 bg-white border border-violet-200 rounded-xl text-sm text-violet-600 hover:bg-violet-50 transition-colors">
              나중에
            </button>
          </div>
        </div>
      )}

      {/* 플로팅 도움말 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 bg-violet-600 text-white rounded-full shadow-lg flex items-center gap-1.5 px-3 py-2 hover:bg-violet-700 transition-colors active:scale-95"
        title="설치 가이드"
      >
        <HelpCircle size={15} />
        <span className="text-xs font-bold">사용법</span>
      </button>

      {/* 가이드 드로어 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-y-auto"
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            <GuideBanner onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
