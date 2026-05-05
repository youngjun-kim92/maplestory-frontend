# 페이지별 기능 상세

> 최종 업데이트: 2026-05-05 (타이머 전용 페이지 분리, 상점 캐릭터 드롭박스 개선)

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
| `/shop` | ShopPage | 직거래·아이템 구매 기록 |
| `/characters` | CharactersPage | 캐릭터 관리 + ROI |
| `/settings` | SettingsPage | 설정 |
| `/timer` | TimerPage | 사냥 타이머 (데스크탑 사이드바 최하단, 모바일 탭 미노출) |

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
- **도핑 그룹핑**: `bossKillId`가 있는 도핑 지출 항목은 해당 보스 수입 항목 아래에 서브행으로 표시
  - 보스 수입 항목에 bossKillId가 있으면 `BossGroupRows` (도핑 sub-rows + 순수익)
  - 없으면 `GET /api/boss/weekly`의 kill 정보로 synthetic `KillGroupRows` 생성
  - 필터: 8가지 (전체/수입/지출/보스/사냥/경매장/도핑/강화)
  - **orphan kill_group (도핑만 있는 합성행)은 전체/지출/도핑 필터에서만 표시** (수입/보스 등 필터 시 숨김)
  - 모든 유형 배지(수입/지출) `whiteSpace: nowrap` 적용 (줄바꿈 방지)

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
- `GET /api/boss/weekly/character-counts?week=` → 캐릭터별 주간 보스 처치 수 (Map으로 관리)
- 캐릭터명 / 직업 / 레벨 / **주간 보스 (N/12)** / 솔에르다 조각 수 표시
  - N=12: 초록색, N=0: 회색, 그 외: 파란색

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
   - **선택된 도핑 합계 > 보유 총 메소**이면 기록하기 버튼 비활성화 + 경고 메시지
   - 기록 성공 후 도핑 선택 유지 (보스 변경 시에만 자동 초기화)
4. **드랍 물욕템 체크리스트**: 보스+난이도 선택 시 `GET /api/boss/drops/items?bossName=&difficulty=` 조회
   - 아이템별 체크박스 표시 (칠흑/광휘/여명 장신구 등 카테고리 배지)
   - 기록하기 시 체크된 아이템을 `POST /api/boss/kills/{killId}/drops`로 연결
   - 보스 변경 시 체크 초기화
5. 결정석 가격 미리보기 (주간 보스 여부 배지 포함)
6. 폼 헤더 우측 "★ 즐겨찾기 등록/⭐ 즐겨찾기 저장됨" 버튼: 현재 보스·난이도·파티인원·도핑을 저장 → `POST /api/favorites`
   - 보스/난이도 미선택 시 비활성화(회색)
   - **현재 선택 조합이 이미 즐겨찾기에 있으면 "⭐ 즐겨찾기 저장됨"으로 표시** (중복 저장은 백엔드에서 방지)
7. "기록하기" → `POST /api/boss/kill`
   - 409 응답: 중복 처치 → "이미 이번 주에 처치한 보스입니다." 토스트(빨강)
   - 409 응답: 주간 한도 초과 → "이번 주 주간 보스 12개를 모두 처치했습니다." 토스트(노랑)

**난이도 한글 표시**: Easy→이지, Normal→노말, Hard→하드, Chaos→카오스, Extreme→익스트림

### 즐겨찾기 섹션
- 저장된 즐겨찾기 카드 그리드 표시
- 카드 클릭 → 해당 보스+난이도 폼에 적용, 저장된 도핑 자동 체크
- 카드 호버 시 "삭제" 버튼 표시 → `DELETE /api/favorites/{id}`

### 이번 주 처치 목록
- `GET /api/boss/weekly?characterId={id}` (선택된 캐릭터 기준, 응답에 `drops` 배열 포함)
- 처치 행: 보스명 / 난이도 / 날짜 / 수입 / 지출 / 순수익
- 각 행에 **수정(✏️)** / **삭제(✕)** 버튼:
  - 수정: 파티 인원 인라인 select → "저장" → `PATCH /api/boss/kills/{id}` `{ partySize }`
  - 삭제: confirm → `DELETE /api/boss/kills/{id}`
- **드랍 아이템 섹션**: `drops` 배열이 있으면 "📦 드랍 N개 ▼" 토글 버튼 표시
  - 클릭 시 접힌/펼친 상태 토글 (기본 접힘)
  - 각 드랍: `itemName` + status 배지 + 상태 전환 버튼

| status | 배지 | 버튼 |
|:---|:---|:---|
| `holding` | 보유중 (회색) | "경매 등록" → `PATCH /api/boss/drops/{id}/list` |
| `listed` | 경매중 (노랑) | "판매 완료" → 인라인 판매가 입력 → `PATCH /api/boss/drops/{id}/sell` |
| `sold` | 판매완료 (초록) | 없음 |

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
- 각 행 **✏️ 수정** / **🗑️ 삭제** 버튼:
  - 수정: 금액·조각·날짜 미리입력된 모달 → `PATCH /api/hunting/sessions/{id}`
  - 삭제: confirm → `DELETE /api/hunting/sessions/{id}`

---

## 4-1. TimerPage (`/timer`) — 사냥 타이머

> 사이드바 최하단 배치. 모바일 하단 탭에는 미노출 (URL 직접 접근 가능).

- 30분 / 20분 / 15분 / 10분 프리셋 버튼
- MM:SS 디지털 표시, 시작/일시정지/리셋
- 볼륨 슬라이더 (0–100%) + **🎵 알람 미리듣기** 버튼 (즉시 재생)
- 타이머 종료 시 Web Audio API로 부드러운 2음 차임벨 알람 (C6→G5, 1.5초 간격 × 2회)

---

## 5. LedgerPage (`/ledger`) — 메소 강화

### 역할
큐브·스타포스·추가옵션 지출 기록 전용.

### 캐릭터 선택 (페이지 최상단)
- 페이지 헤더에 단일 캐릭터 드롭다운 배치 ("전체" 옵션 포함), **기본값: 메인 캐릭터 (메인 없으면 첫 번째)**
- 캐릭터 변경 시 지출 내역 목록 + 주간 요약 + 기록 폼 제출 캐릭터 모두 갱신
- `GET /api/ledger?characterId={id}` (전체 선택 시 파라미터 생략)

### 지갑 현황
- 인벤토리 / 창고 / 합계 메소 표시
- "메소 잔액 수정" → 인라인 폼 → `PUT /api/auth/meso-balance`
- QuickAmountButtons로 빠른 금액 입력

### 메소 강화 지출 입력
- **카테고리**: 큐브 / 스타포스 / 추가옵션 — 라디오 pill 버튼
- 금액 입력 + QuickAmountButtons + 한국어 금액 표시 (toKoreanAmount)
- **입력 금액 > 보유 총 메소**이면 기록하기 버튼 비활성화 + 경고 메시지 (인벤토리/창고 업데이트 안내)
- 날짜 + 메모
- 제출 → `POST /api/ledger` (type: `expense`, category: `cube`/`starforce`/`additional_option`, characterId: 페이지 상단 선택)

### 이번 주 메소 강화 내역
- `boss`, `hunting`, `auction`, `doping` 카테고리 항목 자동 제외 (강화 지출만 표시)
- 카테고리 배지 + 설명 + 캐릭터명 + 금액 + 날짜
- ✕ 버튼 → `DELETE /api/ledger/{id}`

---

## 6. AuctionPage (`/auction`) — 경매장

### 캐릭터 선택 (페이지 최상단)
- 페이지 헤더에 단일 캐릭터 드롭다운 배치 ("전체" 옵션 포함), **기본값: 메인 캐릭터 (메인 없으면 첫 번째)**
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
- **조각 단가 설정 인라인 폼**: 수량 입력 하단에 단가 입력 + 저장 버튼 → `PUT /api/auth/sol-erda-price?price={금액}`
- 제출 → `POST /api/ledger` (type: `income`, category: `sol_erda`, solErdaFragments: 수량)

### 지출 탭 (경매장 구매)

- 아이템명 (선택) + 날짜
- 구매 금액 입력 + QuickAmountButtons + 한국어 금액 표시
- **입력 금액 > 보유 총 메소**이면 기록하기 버튼 비활성화 + 경고 메시지
- 제출 → `POST /api/ledger` (type: `expense`, category: `auction`)

### 이번 주 경매장 내역
- `GET /api/ledger?characterId={id}` → `auction`, `sol_erda` 카테고리 항목만 필터링
- 수입(초록)/지출(회색) 배지 + 설명 + 캐릭터명 + 금액 + 날짜
- ✕ 버튼 → `DELETE /api/ledger/{id}`

---

## 7. ShopPage (`/shop`) — 상점

### 역할
직거래·개인 상점 수입과 아이템 구매 비용(도핑, 소비 아이템 등) 기록.

### 캐릭터 선택 (페이지 최상단)
- 페이지 헤더 우측 단일 캐릭터 드롭다운 배치 (다른 메뉴와 동일 패턴)
- "전체 캐릭터" 옵션 없음, 기본값: 메인 캐릭터 (메인 없으면 첫 번째)
- 캐릭터 변경 시 이번 주 내역 + 기록 폼 제출 캐릭터 갱신
- `GET /api/ledger?characterId={id}` 항상 특정 캐릭터 기준 조회

### 주간 요약
- 이번 주 거래 수입 / 구매 지출 KPI 카드 2개

### 탭 구조
**판매 수입 탭:**
- 아이템명·날짜 + 판매 금액 + QuickAmountButtons
- 저장 실패 시 에러 메시지 표시 (빨간 경고)
- 제출 → `POST /api/ledger` (type: `income`, category: `trade`, characterId: 선택된 캐릭터)

**아이템 구매 탭:**
- 구매 유형 선택 (도핑 / 기타)
- **구매 유형 = 도핑 선택 시**: `GET /api/boss/doping/list` 기반 도핑약 드롭박스 추가 표시
  - 선택 시 아이템명·금액 자동 입력, 직접 입력도 가능
- 아이템명·날짜 + 구매 금액 + QuickAmountButtons
- 저장 실패 시 에러 메시지 표시
- 제출 → `POST /api/ledger` (type: `expense`, category: `doping` or `other`, characterId: 선택된 캐릭터)

### 이번 주 내역
- `GET /api/ledger?characterId={id}` → `trade`, `doping`, `other` 카테고리 항목만 필터링
- 수입(초록)/지출(빨강) 배지 + 아이콘 + 설명 + 날짜 + 금액
- ✕ 버튼 → `DELETE /api/ledger/{id}`

---

## 8. CharactersPage (`/characters`)

### 캐릭터 목록 및 관리
- `GET /api/characters` (본캐 먼저, 이후 등록순)
- 등록: name(필수), jobClass, level, isMain, initialInvestment, solErdaFragments
- 수정: `PUT /api/characters/{id}`, 삭제: `DELETE /api/characters/{id}`
- 일괄 등록 모달: 캐릭터 여러 명 한 번에 등록. **메인 캐릭터는 전체 목록에서 하나만 선택 가능** (isMain 체크 시 다른 행 자동 해제)

### 손익분기점 (ROI)
- `GET /api/characters/{id}/roi`
- `isBreakEvenReached = true` → "✅ 투자금 회수 완료!"
- `isBreakEvenReached = false` → 프로그레스 바 + 남은 금액 + 예상 주수
- `weeksToBreakEven = null` → "보스 수익 기록이 없습니다."

---

## 9. SettingsPage (`/settings`)

| 기능 | API | 비고 |
|:---|:---|:---|
| 현재 보유 메소 | `PUT /api/auth/meso-balance` | `{ inventoryMeso, storageMeso }` |
| MVP 등급 설정 | `PUT /api/auth/mvp-grade` | 경매장 수수료 계산에 사용 |

- 솔 에르다 조각 단가 설정은 경매장 페이지 솔 에르다 탭에서 인라인으로 설정 (`PUT /api/auth/sol-erda-price?price={금액}`)

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
| EntryCategory | `boss`, `hunting`, `trade`, `auction`, `sol_erda`, `cube`, `starforce`, `additional_option`, `spell_trace`, `doping`, `other` |
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
- **사이드바 호버 툴팁**: md 이상 전체 너비에서 메뉴 아이템 호버 시 우측에 설명 툴팁 표시 (메소 강화 툴팁에 "수입은 대시보드에서 확인하세요" 포함)

### 인증
- JWT → `localStorage['token']`
- Axios 인터셉터: 모든 요청에 `Authorization: Bearer {token}` 자동 첨부
- 401 응답 시 token 삭제 + `/`로 리다이렉트
