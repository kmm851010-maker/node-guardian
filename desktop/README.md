# Node Guardian

> Pi Node 운영자를 위한 오픈소스 모니터링 도구

## 🔒 투명성 선언

이 프로그램은 사용자의 노드 데이터를 외부로 전송하지 않습니다.
텔레그램으로 전송되는 것은 "재부팅됨", "노드 중단", "복구됨"과 같은
이벤트 메시지뿐입니다. 노드 성능 데이터, IP 주소, 개인 정보는
일절 수집하지 않습니다.

직접 코드를 확인하시려면 `src/` 폴더를 살펴보세요.

## 기능

- PC 재부팅 감지 및 알림
- Pi Node 핵심 프로세스 감시 (com.docker.backend, Docker Desktop, Pi Network GUI)
- 노드 포트 감시 (31401-31403)
- 텔레그램 알림 (이상 감지 및 복구)

## 설치

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# .env 파일에 텔레그램 봇 토큰과 채팅 ID 입력
```

## 실행

```bash
python -m src.main
```

## 라이선스

MIT
