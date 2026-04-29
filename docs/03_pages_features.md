# 페이지별 기능 상세

> 최종 업데이트: 2026-04-29

---

## 라우팅 구조

| 경로 | 컴포넌트 | 역할 |
|:---|:---|:---|
| `/` | LandingPage | 로그인 / 회원가입 |
| `/dashboard` | DashboardPage | 주간 대시보드 (조회 전용) |
| `/input` | InputPage | 수익·지출 입력 |
| `/exp` | ExpPage | 경험치 계산기 |
| `/goals` | GoalsPage | 목표 아이템 관리 |
| `/characters` | CharactersPage | 캐릭터 관리 + ROI |
| `/settings` | SettingsPage | 설정 |

---

## 1. LandingPage (`/`)

- 닉네임·비밀번호 입력 → `POST /api/auth/login` 또는 `POST /api/auth/register`
- 응답 `token` → `localStorage` 저장, `user` → AuthContext 저장
- 로그인 성공 시 `/dashboard` 리다이렉트
- 유효성: 닉네임 2자 이상, 비밀번호 6자 이상

---

## 2. DashboardPage (`/dashboard`)

### 역할
주간 대시보드 + 전체 누적 통계. 조회 전용 화면.

### 헤더 주간 내비게이션
- ◀ / ▶ 버튼으로 ±1주 이동
- 📅 달력 버튼 토글 → 달력 패널 표시
- "이번 주" 버튼: 현재 주가 아닌 경우에만 표시

### 달력 패널
- 기록이 있는 가장 오래된 주부터 현재 주까지 월별 그룹으로 표시
- 각 주 블록: 날짜 (MM/DD) + 순수익 표시
  - 흑자: 초록색 배경, 적자: 빨간색 배경, 데이터 없음: 회색
  - 현재 선택 주: 강조 테두리, 이번 주(실제): 점선 테두리
- 블록 클릭 → 해당 주 데이터로 이동 + 달력 자동 닫힘

### 이번 주 요약 카드 (3칸)
- `ledger.totalIncome` / `ledger.totalExpense` / `ledger.netAmount`
- `GET /api/ledger` (week 파라미터: 이번 주면 생략, 과거 주면 weekStart 날짜 전달)

### 캐릭터 탭
- "전체" + 등록된 캐릭터 목록. 본캐 ⭐ 표시
- "+" 버튼 → `/characters`로 이동

### 이번 주 내역 (좌측 그리드)
- `ledger.entries` 배열 표시
- 카테고리 아이콘 (소문자 키): `boss`→⚔️, `hunting`→👾, `auction`→🏪, `sol_erda`→🔮, `cube`→🎲, `starforce`→⭐, `spell_trace`→📜, `other`→💫
- 수입 초록, 지출 빨강
- ✕ 버튼 → `DELETE /api/ledger/{id}`

### 메소 잔액 + 수익 추이 차트 (우측 그리드)
- 인벤 / 창고 / 합계 표시
- "수정" → 인라인 폼 → `PUT /api/auth/meso-balance`
- 최근 8주 바 차트: `GET /api/ledger/weeks` 데이터 사용 (수입/지출)

### 드랍 아이템 섹션 (3-state flow)
- `GET /api/boss/drops/weekly` (week 파라미터 동일 로직)
- 상태별 배지 및 버튼:

| status | 배지 | 버튼 |
|:---|:---|:---|
| `holding` | 📦 보유 중 (파랑) | "경매장 등록" → `PATCH /api/boss/drops/{id}/list` |
| `listed` | 🏪 경매장 등록 중 (노랑) | "판매 처리" → 인라인 폼 |
| `sold` | ✅ 판매 완료 (초록) | 없음 |

- 판매 폼: 판매 금액 + 판매 날짜 → `PATCH /api/boss/drops/{id}/sell`
- 판매 완료 시 가계부에 AUCTION 수익 자동 반영 (백엔드 처리)

### 전체 누적 통계
- `GET /api/ledger/weeks` → 총 수입 / 총 지출 / 총 순수익 합산
- 주간별 목록 (클릭 → 해당 주로 이동)

---

## 3. InputPage (`/input`)

### 역할
보스 처치 기록 + 수익/지출 직접 입력. 탭 없이 `lg:grid-cols-2` 레이아웃.

### 보스 처치 기록 (BossSection)

1. 보스 유형 필터: 전체 / 일간 / 주간 / 월간
2. 보스 선택 → 난이도 선택
3. **보스+난이도 선택 즉시**: `GET /api/boss/drops/items?bossName=&difficulty=` 호출 → 드랍 아이템 목록 인라인 표시
4. 드랍 아이템 체크/선택 (복수 선택 가능)
5. 결정석 가격 자동 미리보기
6. 파티 인원 선택 (기본 6명, 더스크·칼로스·발키리 아르테리아는 4명)
7. 처치 날짜 + 캐릭터 선택
8. "기록하기" 버튼:
   - `POST /api/boss/kill` → kill ID 획득
   - 선택한 드랍 아이템 각각 `POST /api/boss/kills/{killId}/drops`
9. 결정석 가격은 백엔드에서 가계부 BOSS 수익으로 자동 저장

**난이도 한글 표시**: Easy→이지, Normal→노말, Hard→하드, Chaos→카오스, Extreme→익스트림

### 수익 / 지출 (GeneralSection)

- 수입/지출 토글 (수입: 초록, 지출: 빨강)
- **수입 카테고리**: `hunting`, `auction`, `sol_erda`, `other`
- **지출 카테고리**: `cube`, `starforce`, `spell_trace`, `other`
- `sol_erda` 선택 시: 조각 개수 입력 → `개수 × user.solErdaFragmentPrice` 환산 미리보기
  - 개당 가격 미설정 시: `/settings` 안내 링크
- 날짜 + 캐릭터 + 메모 (선택)
- 제출 → `POST /api/ledger`
  - **type/category 값은 소문자** (`income`/`expense`, `hunting` 등)
  - 저장 실패 시 에러 메시지 표시

---

## 4. ExpPage (`/exp`)

### 경험치 계산기
- 입력: 현재 레벨, 현재 경험치(%), 시간당 평균 경험치(%), 목표 레벨(선택)
- `POST /api/stats/exp-calculator`
- 결과: 소요 시간(시간/분), 소요 일수
- 초기화 버튼으로 폼 리셋

---

## 5. GoalsPage (`/goals`)

### 목표 관리
- 목록: `GET /api/goals`
- 등록: `POST /api/goals` — `{ itemName, targetAmount }`
- 수정: `PUT /api/goals/{id}`
- 달성: `PATCH /api/goals/{id}/achieve`
- 삭제: `DELETE /api/goals/{id}`

### 달성 예측
- "예측 보기" → `GET /api/goals/{id}/estimate`

| 필드 | 설명 |
|:---|:---|
| `currentSavings` | 현재 누적 순수익 |
| `remaining` | 남은 금액 |
| `progressPercent` | 0~100 진행률 바 |
| `avgWeeklyNet` | 최근 4주 주간 순수익 평균 |
| `weeksRemaining` | 예상 남은 주수 (null이면 데이터 부족) |
| `estimatedDate` | 예상 달성일 |

---

## 6. CharactersPage (`/characters`)

### 캐릭터 목록 및 관리
- `GET /api/characters` (본캐 먼저, 이후 등록순)
- 등록: name(필수), jobClass, level, isMain, initialInvestment
- 수정: `PUT /api/characters/{id}`, 삭제: `DELETE /api/characters/{id}`

### 손익분기점 (ROI)
- `GET /api/characters/{id}/roi`
- `isBreakEvenReached = true` → "✅ 투자금 회수 완료!"
- `isBreakEvenReached = false` → 프로그레스 바 + 남은 금액 + 예상 주수
- `weeksToBreakEven = null` → "보스 수익 기록이 없습니다."

### 익명 수익 비교
- `GET /api/stats/comparison`
- 내 주간 평균 vs 전체 평균 / 백분위 / 메시지 표시

---

## 7. SettingsPage (`/settings`)

| 기능 | API | 비고 |
|:---|:---|:---|
| 솔 에르다 조각 낱개 가격 | `PUT /api/auth/sol-erda-price?price={금액}` | Query param, 빈 body |
| 현재 보유 메소 | `PUT /api/auth/meso-balance` | `{ inventoryMeso, storageMeso }` |

- 저장 성공/실패 여부 메시지 표시
- user 컨텍스트 갱신 후 폼 값 자동 동기화

---

## 공통

### 메소 포맷 (`formatMeso`)
```ts
// 1억 2,340만 / 3,400만 / 9,900 형태로 표시
formatMeso(123_400_000)  // "1억 2,340만"
formatMeso(34_000_000)   // "3,400만"
```

### 주간 기준
- 매주 **목요일 00:00** 기준 초기화
- `getWeekStart(date)`: 해당 날짜가 속한 주의 목요일 반환
- `weekStart` 파라미터: `YYYY-MM-DD` 형식의 목요일 날짜

### API 열거값 (모두 소문자)
| 구분 | 값 |
|:---|:---|
| EntryType | `income`, `expense` |
| EntryCategory | `boss`, `hunting`, `trade`, `auction`, `sol_erda`, `cube`, `starforce`, `spell_trace`, `other` |
| DropStatus | `holding`, `listed`, `sold` |
| ResetType | `daily`, `weekly`, `monthly` |

### 레이아웃
- **데스크탑**: 좌측 사이드바 (`w-56`) + 메인 컨텐츠 (`max-w-6xl`)
- **모바일**: 하단 고정 탭바 (6개 항목)
- 상단 헤더: 로고(🍁 MaplePlanner), 닉네임 뱃지, 로그아웃

### 인증
- JWT → `localStorage['token']`
- Axios 인터셉터: 모든 요청에 `Authorization: Bearer {token}` 자동 첨부
- 401 응답 시 token 삭제 + `/`로 리다이렉트
