# MaplePlanner Frontend — Claude Code 지시사항

## 프로젝트
메이플스토리 유저를 위한 가계부 + 통계 웹앱.
백엔드(Spring Boot)는 `localhost:8080`에서 이미 실행 중이며, Vite 프록시로 `/api/*` 자동 전달됨.

## 기술 스택
- React 19 + TypeScript, Vite
- Tailwind CSS v4
- React Router DOM v7
- Axios
- Recharts (차트)

## 디자인 원칙 (반드시 준수)
- **테마**: 메이플스토리 감성의 귀여운 "다이어리(일기장)" 느낌
- **색감**: 따뜻한 파스텔톤 (연한 노랑·민트·핑크 계열)
- **폰트**: Noto Sans KR 또는 Gaegu
- **UX 분리 원칙**: "입력 화면(Input)"과 "기록 조회 화면(View)"을 완전히 분리

## 핵심 규칙
- 메소는 항상 한국식 포맷 (`1억 2,340만`). `formatMeso()` 유틸 필수 구현
- 주간 기준: 매주 **목요일** 00:00 초기화 (weekStart = 해당 주의 목요일 날짜)
- API type/category 값은 **소문자** (`income`/`expense`, `boss`/`hunting`/`auction`/`sol_erda`/`cube`/`starforce`/`spell_trace`/`other`)
- JWT 토큰은 `localStorage` 저장, 모든 인증 요청에 `Authorization: Bearer {token}` 헤더

## 문서 (작업 전 반드시 참고)
- [02_api_spec.md](docs/02_api_spec.md) — 전체 API 엔드포인트 + 정확한 응답 형태
- [03_pages_features.md](docs/03_pages_features.md) — 페이지별 기능 상세 + UI 설명
- [00_overview.md](docs/00_overview.md) — 프로젝트 전체 개요
- [01_project_structure.md](docs/01_project_structure.md) — 디렉터리 구조

## 주요 페이지 라우팅
| 경로 | 역할 |
|---|---|
| `/` | 랜딩 (로그인/회원가입) |
| `/dashboard` | 주간 다이어리 View (조회 전용) |
| `/input` | 수익·지출 입력 (보스/직접입력/경험치계산기 탭) |
| `/stats` | 사냥/보스 추이 차트 + 익명 비교 |
| `/goals` | 목표 아이템 + 달성 예측 |
| `/characters` | 캐릭터 관리 + 손익분기점 |
| `/settings` | 솔에르다 가격·메소 잔액 설정 |