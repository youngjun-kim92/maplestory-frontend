# 프로젝트 구조

## 전체 디렉터리 트리

```
maplestory-frontend/
├── docs/                         ← 프로젝트 문서 (이 폴더)
│   ├── 00_overview.md
│   ├── 01_project_structure.md
│   ├── 02_api_spec.md
│   └── 03_pages_features.md
│
├── public/                       ← 정적 자산
│
├── src/
│   ├── api/                      ← 백엔드 API 호출 모듈
│   │   ├── client.ts             ← axios 인스턴스 (JWT 인터셉터)
│   │   ├── auth.ts               ← 인증 API
│   │   ├── ledger.ts             ← 가계부 API
│   │   ├── boss.ts               ← 보스 API
│   │   ├── hunting.ts            ← 사냥 API
│   │   ├── goals.ts              ← 목표 API
│   │   ├── characters.ts         ← 캐릭터 API
│   │   └── stats.ts              ← 통계 API
│   │
│   ├── components/
│   │   ├── Layout.tsx            ← 사이드바 + 모바일 하단 탭바
│   │   └── ui/
│   │       ├── Button.tsx        ← 공통 버튼
│   │       ├── Card.tsx          ← 공통 카드 컨테이너
│   │       ├── Input.tsx         ← 공통 입력 필드
│   │       └── Select.tsx        ← 공통 셀렉트 박스
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx       ← 전역 인증 상태 (JWT, 유저 정보)
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx         ← 로그인
│   │   ├── RegisterPage.tsx      ← 회원가입
│   │   ├── LedgerPage.tsx        ← 주간 가계부 (메인)
│   │   ├── BossPage.tsx          ← 보스 관리
│   │   ├── HuntingPage.tsx       ← 사냥터 관리
│   │   ├── GoalsPage.tsx         ← 목표 아이템
│   │   ├── CharactersPage.tsx    ← 캐릭터(부캐) 관리
│   │   └── StatsPage.tsx         ← 통계 (경험치 계산 / 수익 비교)
│   │
│   ├── types/
│   │   └── index.ts              ← 모든 TypeScript 타입 정의
│   │
│   ├── utils/
│   │   └── format.ts             ← 메소 포맷, 날짜 포맷 유틸
│   │
│   ├── App.tsx                   ← 라우팅 설정
│   ├── main.tsx                  ← React 앱 엔트리포인트
│   └── index.css                 ← Tailwind CSS 전역 스타일
│
├── index.html
├── vite.config.ts                ← Vite 설정 (프록시 포함)
├── tsconfig.json
└── package.json
```

---

## 핵심 파일 상세

### `src/api/client.ts`

모든 API 호출의 기반이 되는 axios 인스턴스입니다.

- **baseURL**: `/api` (Vite 프록시를 통해 `localhost:8080/api`로 전달)
- **요청 인터셉터**: `localStorage`에서 JWT 토큰을 읽어 `Authorization: Bearer {token}` 헤더에 자동 첨부
- **응답 인터셉터**: HTTP 401 응답 시 토큰 삭제 후 `/login`으로 자동 리다이렉트

### `src/contexts/AuthContext.tsx`

전역 인증 상태를 관리하는 React Context입니다.

| 상태/함수 | 타입 | 설명 |
| :--- | :--- | :--- |
| `user` | `UserResponse \| null` | 현재 로그인한 유저 정보 |
| `token` | `string \| null` | 저장된 JWT 토큰 |
| `isLoading` | `boolean` | 초기 인증 확인 중 여부 |
| `login(token)` | `async function` | 토큰 저장 후 유저 정보 불러오기 |
| `logout()` | `function` | 토큰·유저 상태 초기화 |
| `refreshUser()` | `async function` | 유저 정보 재조회 |

### `src/App.tsx`

- **비로그인 전용 경로** (`PublicRoute`): `/login`, `/register` — 로그인 상태면 `/`로 리다이렉트
- **로그인 필요 경로** (`PrivateRoute`): 나머지 모든 경로 — 미로그인 시 `/login`으로 리다이렉트

### `src/types/index.ts`

백엔드 Java DTO와 1:1 대응하는 TypeScript 타입을 한 파일에 모아 관리합니다.

### `src/utils/format.ts`

| 함수 | 설명 | 예시 |
| :--- | :--- | :--- |
| `formatMeso(n)` | 억/만 단위 축약 | `1234567890` → `"12.3억"` |
| `formatMesoFull(n)` | 콤마 포함 전체 표기 | `1000000` → `"1,000,000 메소"` |
| `toDateString(date?)` | `Date` → `YYYY-MM-DD` | `new Date()` → `"2026-04-28"` |
| `formatDate(str)` | ISO 날짜 → 한국어 | `"2026-04-28"` → `"4월 28일"` |
| `formatWeekRange(s, e)` | 주간 범위 표기 | `"4/24 ~ 4/30"` |
| `CATEGORY_LABELS` | 카테고리 코드 → 한국어 | `BOSS` → `"보스"` |

### `vite.config.ts`

```ts
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:8080',  // Spring Boot
      changeOrigin: true,
    },
  },
}
```

개발 환경에서 `/api/*` 요청을 백엔드로 프록시합니다. CORS 문제 없이 연동됩니다.

---

## 라우팅 구조

```
/login           → LoginPage       (비로그인 전용)
/register        → RegisterPage    (비로그인 전용)
/                → LedgerPage      (로그인 필요)
/boss            → BossPage        (로그인 필요)
/hunting         → HuntingPage     (로그인 필요)
/goals           → GoalsPage       (로그인 필요)
/characters      → CharactersPage  (로그인 필요)
/stats           → StatsPage       (로그인 필요)
```
