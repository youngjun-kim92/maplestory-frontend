# 🍁 메이플 가계부 — Frontend

메이플스토리 유저의 게임 내 경제 활동을 스마트하게 관리해주는 **종합 유틸리티 웹 서비스** 프론트엔드입니다.

> 백엔드 저장소: [maplestory-backend](../maplestory-backend)

---

## 주요 기능

| # | 기능 | 설명 |
| :-: | :--- | :--- |
| 1 | 간편 회원가입 / 로그인 | 닉네임 + 비밀번호만으로 가입 |
| 2 | 목요일 기준 주간 가계부 | 매주 목요일 기준으로 수익·지출 누적 기록 |
| 3 | 사냥터 / 보스 수익 효율 통계 | 시간당 수익, 누적 수익 차트 비교 |
| 4 | 보스 결정석 자동 계산 | 보스·난이도 선택 시 결정석 가격 자동 합산 |
| 5 | 솔 에르다 조각 메소 환산 | 조각 낱개 가격 설정 후 사냥 기록 시 자동 환산 |
| 6 | 목표 아이템 달성 예측 | 평균 수익 기반 달성까지 남은 주수 계산 |
| 7 | 레벨업 경험치 계산기 | 시간당 경험치 입력 시 레벨업 예상 시간 계산 |
| 8 | 부캐릭터 손익분기점 계산 | 초기 투자 비용 대비 보스 수익 회수 예상 주차 |
| 9 | 익명 유저 수익 비교 | 전체 유저 평균 대비 내 수익 백분위 표시 |
| 10 | 과소비 경고 알림 | 큰 지출 발생 시 목표 달성 지연 주수 경고 |

---

## 기술 스택

- **React 19** + **TypeScript**
- **Vite 8** (번들러 + 개발 서버)
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **React Router DOM v7**
- **Axios v1** (JWT 자동 첨부 인터셉터)
- **Recharts v3** (수익 효율 차트)

---

## 시작하기

### 사전 조건

- Node.js 18 이상
- 백엔드 서버(`maplestory-backend`)가 `localhost:8080`에서 실행 중이어야 합니다.

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
# → http://localhost:5173
```

개발 서버는 `/api/*` 요청을 `http://localhost:8080`으로 자동 프록시합니다.

### 빌드

```bash
npm run build
```

---

## 프로젝트 구조

```
src/
├── api/           # 백엔드 API 호출 모듈 (axios)
├── components/    # Layout, 공통 UI (Button, Card, Input, Select)
├── contexts/      # AuthContext — JWT 및 로그인 상태 전역 관리
├── pages/         # 페이지 컴포넌트
├── types/         # TypeScript 타입 정의 (백엔드 DTO 대응)
└── utils/         # 메소 포맷, 날짜 포맷 유틸
```

### 페이지 라우팅

| 경로 | 페이지 | 인증 |
| :--- | :--- | :-: |
| `/login` | 로그인 | ❌ |
| `/register` | 회원가입 | ❌ |
| `/` | 주간 가계부 (메인) | ✅ |
| `/boss` | 보스 관리 | ✅ |
| `/hunting` | 사냥터 관리 | ✅ |
| `/goals` | 목표 아이템 | ✅ |
| `/characters` | 캐릭터(부캐) 관리 | ✅ |
| `/stats` | 통계 | ✅ |

---

## 문서

자세한 내용은 [`docs/`](./docs) 폴더를 참고하세요.

| 파일 | 내용 |
| :--- | :--- |
| [`docs/00_overview.md`](./docs/00_overview.md) | 전체 개요 및 기술 스택 |
| [`docs/01_project_structure.md`](./docs/01_project_structure.md) | 디렉터리 구조 및 파일별 역할 |
| [`docs/02_api_spec.md`](./docs/02_api_spec.md) | 백엔드 API 명세 전체 |
| [`docs/03_pages_features.md`](./docs/03_pages_features.md) | 페이지별 기능 상세 설명 |

---

## 백엔드 연동

백엔드는 `localhost:5173`에 대한 CORS를 허용하도록 설정되어 있습니다.
개발 환경에서는 Vite 프록시를 통해 별도 CORS 설정 없이 연동됩니다.

```
프론트엔드 (5173) → /api/* → 백엔드 (8080)
```
