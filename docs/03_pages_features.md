# 페이지별 기능 상세

> 최종 업데이트: 2026-05-05

---

## 라우팅 구조

| 경로 | 컴포넌트 | 역할 |
|:---|:---|:---|
| `/` | LandingPage | 로그인 / 회원가입 |
| `/dashboard` | DashboardPage | 주간 대시보드 (조회 전용) |
| `/boss` | BossPage | 보스 처치 기록 |
| `/hunting` | HuntingPage | 사냥 수익 기록 |
| `/ledger` | LedgerPage | 메소 강화 지출 기록 |
| `/auction` | AuctionPage | 경매장 수익/지출 기록 |
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
- **달력 열릴 때 항상 오늘 날짜 기준 월로 초기화** (선택된 주의 월이 아님)
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

### 이번 주 내역
- `ledger.entries` 배열 표시
- 카테고리 아이콘 (소문자 키): `boss`→⚔️, `hunting`→👾, `auction`→🏪, `sol_erda`→🔮, `cube`→🎲, `starforce`→⭐, `spell_trace`→📜, `additional_option`→🪄, `other`→💫
- 수입 초록, 지출 빨강
- ✕ 버튼 → `DELETE /api/ledger/{id}`

### 메소 잔액 + 수익 추이 차트
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

### 캐릭터 현황 테이블
- `GET /api/characters` → 등록된 캐릭터 목록
- 캐릭터명 / 직업 / 레벨 / 솔에르다 조각 수 표시

### 캐릭터별 수입/지출 테이블
- `GET /api/characters/stats` → 캐릭터별 수입/지출/순수익 집계
- 캐릭터명 / 총 수입 / 총 지출 / 순수익 표시

### 전체 누적 통계
- `GET /api/ledger/weeks` → 총 수입 / 총 지출 / 총 순수익 합산
- 주간별 목록 (클릭 → 해당 주로 이동)

---

## 3. BossPage (`/boss`)

### 캐릭터 선택 (페이지 최상단)
- 페이지 헤더에 단일 캐릭터 드롭다운 배치
- 캐릭터 변경 시 즐겨찾기, 기록 폼, 처치 목록 모두 해당 캐릭터로 갱신

### 주간 수익 요약 카드
- 이번 주 보스 수익 (전체 캐릭터 합산)
- 주간 보스 합계: X / 90 (전체 캐릭터 합산, `GET /api/boss/kills/weekly` 필터 없음)
- 캐릭터별 X/12 배지: 주간 보스를 처치한 캐릭터마다 `이름 N/12` 배지 표시

### 보스 처치 기록

1. 보스 선택 → 난이도 선택
2. 파티 인원 선택, 처치 날짜
3. 도핑 선택: **체크박스** (복수 선택 가능) — `GET /api/boss/doping/list` 목록 사용
4. 결정석 가격 미리보기 (주간 보스 여부 배지 포함)
5. 보스+난이도 선택 시 "⭐ 즐겨찾기" 버튼 노출 → `POST /api/favorites` (기록하기 버튼 옆)
6. "기록하기" → `POST /api/boss/kill`
   - 409 응답: 중복 처치 → "이미 이번 주에 처치한 보스입니다." 토스트(빨강)
   - 409 응답: 주간 한도 초과 → "이번 주 주간 보스 12개를 모두 처치했습니다." 토스트(노랑)

**난이도 한글 표시**: Easy→이지, Normal→노말, Hard→하드, Chaos→카오스, Extreme→익스트림

### 즐겨찾기 팝업
- "★ 즐겨찾기" 버튼 → 즐겨찾기 팝업 오픈 (페이지 상단 `selectedCharId` 사용)
- "이번 주 전체 입력" 버튼: 즐겨찾기 목록 전체 일괄 POST
- 즐겨찾기 클릭 → 해당 보스+난이도 폼에 적용, 저장된 도핑 자동 체크

### 이번 주 처치 목록
- `GET /api/boss/weekly?characterId={id}` (선택된 캐릭터 기준)
- 처치 행: 보스명 / 난이도 / 날짜 / 수입 / 지출 / 순수익
- 각 행에 **수정(✏️)** / **삭제(✕)** 버튼:
  - 수정: 파티 인원 인라인 select → "저장" → `PATCH /api/boss/kills/{id}` `{ partySize }`
  - 삭제: confirm → `DELETE /api/boss/kills/{id}`
- 목록 상단 배지: 이 캐릭터 주간 보스 X/12 + "⭐ 즐겨찾기 저장" 버튼

---

## 4. HuntingPage (`/hunting`)

### 캐릭터 선택 (페이지 최상단)
- 페이지 헤더에 단일 캐릭터 드롭다운 배치 (캐릭터 없으면 등록 링크)
- 캐릭터 변경 시 사냥 기록 목록 + 기록 폼 제출 캐릭터 모두 갱신

### 사냥 수익 기록

- 수익 금액 입력 + QuickAmountButtons (+1억/+5천만/+1천만/+1백만)
- 솔 에르다 조각 개수 입력 + 빠른 버튼 (+5개/+10개/+30개)
  - `개수 × user.solErdaFragmentPrice` 환산 미리보기
- 날짜 입력
- 제출 → `POST /api/hunting/sessions` (characterId: 페이지 상단 선택된 캐릭터)

### 이번 주 사냥 기록 목록
- `GET /api/hunting/sessions?characterId={id}` (선택된 캐릭터 기준)
- 날짜 / 솔 에르다 조각 수 / 순수익 표시

---

## 5. LedgerPage (`/ledger`) — 메소 강화

### 역할
큐브·스타포스·추가옵션 지출 기록 전용.

### 캐릭터 선택 (페이지 최상단)
- 페이지 헤더에 단일 캐릭터 드롭다운 배치 ("전체" 옵션 포함)
- 캐릭터 변경 시 지출 내역 목록 + 주간 요약 + 기록 폼 제출 캐릭터 모두 갱신
- `GET /api/ledger?characterId={id}` (전체 선택 시 파라미터 생략)

### 지갑 현황
- 인벤토리 / 창고 / 합계 메소 표시
- "메소 잔액 수정" → 인라인 폼 → `PUT /api/auth/meso-balance`
- QuickAmountButtons로 빠른 금액 입력

### 메소 강화 지출 입력
- **카테고리**: 큐브 / 스타포스 / 추가옵션 — 라디오 pill 버튼
- 금액 입력 + QuickAmountButtons + 한국어 금액 표시 (toKoreanAmount)
- 날짜 + 메모
- 제출 → `POST /api/ledger` (type: `expense`, category: `cube`/`starforce`/`additional_option`, characterId: 페이지 상단 선택)

### 이번 주 메소 강화 내역
- `boss`, `hunting`, `auction`, `doping` 카테고리 항목 자동 제외 (강화 지출만 표시)
- 카테고리 배지 + 설명 + 캐릭터명 + 금액 + 날짜
- ✕ 버튼 → `DELETE /api/ledger/{id}`

---

## 6. AuctionPage (`/auction`) — 경매장

### 캐릭터 선택 (페이지 최상단)
- 페이지 헤더에 단일 캐릭터 드롭다운 배치 ("전체" 옵션 포함)
- 캐릭터 변경 시 이번 주 내역 목록 + 기록 폼 제출 캐릭터 모두 갱신

### 수입 탭 (경매장 판매)

**아이템 판매 모드:**
- 아이템명 (선택) + 날짜
- 판매 금액 입력 + QuickAmountButtons + 한국어 금액 표시
- PC방 체크박스 (PC방 접속 중)
- 수수료 자동 계산:
  - PC방 체크 → 3%
  - MVP 실버 이상 (SILVER/GOLD/DIAMOND/RED/BLACK) → 3%
  - 그 외 (일반/브론즈) → 5%
- 예상 실수령 금액 미리보기
- 제출 → `POST /api/ledger` (type: `income`, category: `auction`, amount: 수수료 제외 순액)

**솔 에르다 조각 판매 모드:**
- 수량 입력 + 빠른 버튼 (+10/+30/+50/+100)
- `수량 × user.solErdaFragmentPrice × (1 - feeRate)` 실수령 자동 계산
- 제출 → `POST /api/ledger` (type: `income`, category: `sol_erda`, solErdaFragments: 수량)

### 지출 탭 (경매장 구매)

- 아이템명 (선택) + 날짜
- 구매 금액 입력 + QuickAmountButtons + 한국어 금액 표시
- 제출 → `POST /api/ledger` (type: `expense`, category: `auction`)

### 이번 주 경매장 내역
- `GET /api/ledger?characterId={id}` → `auction`, `sol_erda` 카테고리 항목만 필터링
- 수입(초록)/지출(회색) 배지 + 설명 + 캐릭터명 + 금액 + 날짜
- ✕ 버튼 → `DELETE /api/ledger/{id}`

---

## 7. CharactersPage (`/characters`)

### 캐릭터 목록 및 관리
- `GET /api/characters` (본캐 먼저, 이후 등록순)
- 등록: name(필수), jobClass, level, isMain, initialInvestment, solErdaFragments
- 수정: `PUT /api/characters/{id}`, 삭제: `DELETE /api/characters/{id}`
- 일괄 등록 모달: 캐릭터 여러 명 한 번에 등록

### 손익분기점 (ROI)
- `GET /api/characters/{id}/roi`
- `isBreakEvenReached = true` → "✅ 투자금 회수 완료!"
- `isBreakEvenReached = false` → 프로그레스 바 + 남은 금액 + 예상 주수
- `weeksToBreakEven = null` → "보스 수익 기록이 없습니다."

---

## 8. SettingsPage (`/settings`)

| 기능 | API | 비고 |
|:---|:---|:---|
| 솔 에르다 조각 낱개 가격 | `PUT /api/auth/sol-erda-price?price={금액}` | Query param, 빈 body |
| 현재 보유 메소 | `PUT /api/auth/meso-balance` | `{ inventoryMeso, storageMeso }` |
| MVP 등급 설정 | `PUT /api/auth/mvp-grade` | 경매장 수수료 계산에 사용 |

- 메소 잔액: QuickAmountButtons + toKoreanAmount 표시
- 저장 성공/실패 여부 메시지 표시
- user 컨텍스트 갱신 후 폼 값 자동 동기화

---

## 공통

### 메소 포맷

```ts
formatMeso(123_400_000)   // "1억 2,340만"
formatMeso(34_000_000)    // "3,400만"
toKoreanAmount(15334333)  // "1533만 4333"  (단위 이름만, "메소" 없음)
```

### 주간 기준
- 매주 **목요일 00:00** 기준 초기화
- `getWeekStart(date)`: 해당 날짜가 속한 주의 목요일 반환
- `weekStart` 파라미터: `YYYY-MM-DD` 형식의 목요일 날짜

### API 열거값 (모두 소문자)
| 구분 | 값 |
|:---|:---|
| EntryType | `income`, `expense` |
| EntryCategory | `boss`, `hunting`, `auction`, `sol_erda`, `cube`, `starforce`, `additional_option`, `spell_trace`, `other` |
| DropStatus | `holding`, `listed`, `sold` |
| ResetType | `daily`, `weekly`, `monthly` |

### Toast 컴포넌트
- 화면 상단 중앙 고정 배너
- 타입: `error`(빨강) / `success`(초록) / `warning`(노랑)
- 3초 후 자동 닫힘

### QuickAmountButtons 컴포넌트
- +1억 / +5천만 / +1천만 / +1백만 프리셋 버튼
- 현재 값에 누적 합산

### 레이아웃
- **데스크탑**: 좌측 사이드바 (`w-56`) + 메인 컨텐츠 (`max-w-6xl`)
- **모바일**: 하단 고정 탭바
- 상단 헤더: 로고(🍁 MaplePlanner), 닉네임 뱃지, 라이트/다크 모드 토글, 로그아웃

### 인증
- JWT → `localStorage['token']`
- Axios 인터셉터: 모든 요청에 `Authorization: Bearer {token}` 자동 첨부
- 401 응답 시 token 삭제 + `/`로 리다이렉트
