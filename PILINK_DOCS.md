# LinkPi — 프로젝트 문서

> Pi Network 노드 운영자를 위한 모니터링 · 커뮤니티 플랫폼

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [아키텍처](#3-아키텍처)
4. [주요 기능](#4-주요-기능)
5. [사용자 가이드](#5-사용자-가이드)
6. [Node Guardian 연동](#6-node-guardian-연동)
7. [알림 시스템](#7-알림-시스템)
8. [API 엔드포인트](#8-api-엔드포인트)
9. [환경 변수](#9-환경-변수)

---

## 1. 프로젝트 개요

LinkPi(pilink)는 Pi Network 노드 운영자를 위한 웹 플랫폼입니다.
PC에 설치된 **Node Guardian** 앱과 연동하여 노드 상태를 실시간으로 모니터링하고,
운영자들이 정보를 공유할 수 있는 커뮤니티 공간을 제공합니다.

- **URL**: https://pilink.vercel.app
- **접근 방법**: 조회는 일반 브라우저, 로그인·참여는 Pi Browser(모바일)에서만 가능

---

## 2. 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS + shadcn/ui |
| 데이터베이스 | Supabase (PostgreSQL) |
| 인증 | Pi Network SDK (Pi Browser OAuth) |
| 배포 | Vercel (Hobby) |
| 알림 | Telegram Bot API |
| 푸시 | Web Push (VAPID) — Pi Browser 미지원으로 보조 역할 |
| 외부 Cron | cron-job.org (워치독 15분 주기) |

---

## 3. 아키텍처

```
[스마트폰 Pi Browser]
        │ Pi OAuth 로그인
        ▼
[LinkPi 웹앱 (Vercel)]
        │ REST API
        ▼
[Supabase DB]
        ▲
        │ HTTP POST (이벤트·하트비트)
[PC Node Guardian.exe]
        │
        ├─ 프로세스 감시 (psutil)
        ├─ 포트 감시 (socket)
        └─ 재부팅 감지 (uptime)

[cron-job.org] ──15분마다──▶ /api/cron/node-watchdog
[Vercel Cron]  ──주 1회──▶  /api/cron/weekly-summary
               ──일 1회──▶  /api/rankings/calculate
```

---

## 4. 주요 기능

### 4-1. 대시보드 (Pi Browser 전용)
- **내 노드 현재 상태**: 프로세스 상태 (정상 / 경고 / 중단 / 오프라인)
- **마지막 신호 시간**: Node Guardian 하트비트 기준
- **주간 가동률**: 최근 7일 다운타임 계산 (%)
- **일별 가동률 그리드**: 7칸 컬러 + % 표시 (데이터 없는 날은 `—`)
- **이벤트 기록**: 무한 스크롤, 클릭 시 전체 메시지 펼침

**가동률 계산 방식**
- `process_critical` / `port_critical` / `node_offline` → 다운타임 시작
- `process_recovery` / `port_recovery` / `startup` / `node_online` → 다운타임 종료
- 오차 범위: PC 종료 최대 15분, 90초 미만 단기 중단 미반영

### 4-2. 커뮤니티
- 게시글 작성·수정·삭제 (프리미엄 전용)
- 좋아요 (프리미엄 전용)
- 댓글·대댓글 (프리미엄 전용)
- 무한 스크롤 페이지네이션
- 로딩 애니메이션 (좋아요·등록 버튼)

### 4-3. QnA
- 질문 등록·수정·삭제 (프리미엄 전용)
- 미해결 / 해결됨 필터
- 채택 기능: 질문자가 베스트 답변 선정 → 채택자 랭킹 +5점 보너스
- 좋아요·댓글·대댓글 (프리미엄 전용)

### 4-4. 랭킹
- 주간 포인트 기반 순위
- 포인트 항목: 게시글 작성, 좋아요 받기, 댓글 채택 등
- 매주 일요일 자동 집계 (Vercel Cron)

### 4-5. 프로필
- Pi 계정 정보 표시
- 노드 고유키 등록
- 노드 점수 입력
- 텔레그램 알림 연결 / 해제

### 4-6. 프리미엄
- 1회 결제로 영구 사용
- 게시글·댓글·좋아요 등 참여 기능 전체 활성화

---

## 5. 사용자 가이드

### Pi Browser (모바일) 사용법

1. Pi Network 앱 실행 → 하단 Browser 탭
2. 주소창에 `pilink.vercel.app` 입력
3. 우측 상단 **Pi 로그인** 클릭 → Pi 앱 인증 팝업 허용
4. 대시보드에서 노드 상태 확인

### PC 프로그램 설치 (Node Guardian)

1. PC 일반 브라우저에서 `pilink.vercel.app` 접속
2. **프로그램 다운로드** 버튼 클릭 → `NodeGuardian.exe` 저장
3. 실행 시 Windows SmartScreen 경고 → "추가 정보" → "실행"
4. 설정 마법사에서 Pi 사용자명 입력 (예: `piuser123`)
5. 저장하고 시작하기 클릭 → 트레이 아이콘 확인
6. (선택) 시작 프로그램 등록: `Win+R` → `shell:startup` → 바로가기 붙여넣기

### 텔레그램 알림 연결

1. 텔레그램에서 `@serge_node_guardian_bot` 검색
2. `/start` 입력 → 봇이 Chat ID 답장
3. LinkPi 프로필 탭 → 텔레그램 알림 → Chat ID 입력 → 연결

---

## 6. Node Guardian 연동

Node Guardian은 PC에서 실행되는 Python 기반 모니터링 에이전트입니다.
PyInstaller로 단일 exe 패키징되어 있습니다.

### 감시 대상

| 레이어 | 대상 | 판정 기준 |
|--------|------|-----------|
| 프로세스 | Docker, Pi Node 관련 프로세스 | 3회 연속 미감지(90초) → critical |
| 포트 | 31400~31409 (Pi Node 포트) | 전체 닫힘 3분 지속 → critical |
| 재부팅 | 시스템 uptime | 시작 시 1회 감지 |

### 이벤트 전송 주기

| 이벤트 | 조건 |
|--------|------|
| `startup` | 앱 시작 시 1회 |
| `process_critical` | 프로세스 중단 감지 시 |
| `process_warning` | GUI 중단 감지 시 |
| `process_recovery` | 복구 시 |
| `port_critical` | 포트 전체 차단 지속 시 |
| `port_recovery` | 포트 복구 시 |
| `heartbeat` | 5분마다 (DB에 저장 안 됨, last_seen만 갱신) |

### 오프라인 감지 (Watchdog)

- cron-job.org가 15분마다 `/api/cron/node-watchdog` 호출
- `last_seen` 기준 10분 초과 시 오프라인으로 판정
- 최초 감지: 텔레그램 알림 즉시 발송
- 지속 중: 1시간마다 재알림
- 복구 시: 텔레그램 복구 알림 발송

---

## 7. 알림 시스템

### 텔레그램 봇 (`@serge_node_guardian_bot`)

| 명령어 | 설명 |
|--------|------|
| `/start` | Chat ID 안내 |
| `/status` | 내 노드 현재 상태 조회 |

### 자동 알림 종류

| 알림 | 발송 조건 |
|------|-----------|
| 🚨 노드 서비스 중단 | 프로세스 critical |
| ⚠️ Pi Network GUI 중단 | 프로세스 warning |
| ✅ 프로세스 정상 복구 | 복구 이벤트 |
| 🚨 노드 포트 완전 차단 | 포트 critical |
| ✅ 포트 정상 복구 | 포트 복구 |
| 🔴 노드 가디언 응답 없음 | PC 종료 / 앱 중단 (워치독) |
| ✅ 노드 가디언 재접속 | 워치독 복구 감지 |
| 📊 주간 노드 리포트 | 매주 월요일 09:00 KST |

---

## 8. API 엔드포인트

### 공개 (인증 불필요)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/node-status` | 노드 상태 조회 |
| GET | `/api/node-events` | 이벤트 목록 조회 |
| GET | `/api/node-stats` | 주간·일별 가동률 통계 |
| GET | `/api/posts` | 게시글 목록 |
| GET | `/api/rankings` | 랭킹 조회 |

### Node Guardian 전용 (`x-pilink-secret` 헤더 필요)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/node-events` | 이벤트 수신 및 상태 업데이트 |

### Cron (`x-pilink-secret` 또는 `?secret=` 파라미터)
| 메서드 | 경로 | 주기 |
|--------|------|------|
| GET | `/api/cron/node-watchdog` | 15분 (cron-job.org) |
| GET | `/api/cron/weekly-summary` | 매주 월요일 (Vercel Cron) |
| GET | `/api/rankings/calculate` | 매주 일요일 (Vercel Cron) |

### Telegram
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/telegram-webhook` | 봇 메시지 수신 |
| GET | `/api/telegram-webhook` | 웹훅 URL 등록 |
| GET/POST/DELETE | `/api/telegram-subscribe` | 구독 관리 |

---

## 9. 환경 변수

`.env.local` 파일에 설정 (Git에 포함되지 않음)

| 변수명 | 설명 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 (서버 전용) |
| `PILINK_API_SECRET` | Node Guardian ↔ API 인증 시크릿 |
| `TELEGRAM_BOT_TOKEN` | 텔레그램 봇 토큰 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push 공개 키 |
| `VAPID_PRIVATE_KEY` | Web Push 비공개 키 |
| `VAPID_EMAIL` | Web Push 이메일 |
| `CRON_SECRET` | Vercel Cron 인증 토큰 |

---

*최종 업데이트: 2026-04-23*
