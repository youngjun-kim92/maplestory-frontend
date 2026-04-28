# 페이지별 기능 상세

---

## 1. LoginPage / RegisterPage (`/login`, `/register`) — 기능 #1

### 동작 흐름
1. 닉네임·비밀번호 입력
2. `POST /api/auth/login` 또는 `POST /api/auth/register` 호출
3. 응답의 `token`을 `localStorage`에, `user` 객체를 AuthContext에 저장
4. `/dashboard`로 리다이렉트

### 유효성 검사
- 닉네임: 2자 이상
- 비밀번호: 6자 이상
- 회원가입 시 비밀번호 확인 일치 여부

---

## 2. Dashboard (`/dashboard`) — 기능 #2, #10

### 역할
이번 주 수입·지출 요약 + 현재 보유 메소 현황을 한눈에 보여주는 View 화면.

### 주요 UI 요소

| 요소 | 설명 |
|:---|:---|
| 캐릭터 탭 | 등록된 캐릭터 목록 탭 (본캐 첫 번째). "+" 버튼으로 캐릭터 추가 |
| 주간 네비게이션 | 이전 주 / 이번 주 / 다음 주 이동. `"4/24(목) ~ 4/30(수)"` 형식 표시 |
| 요약 카드 3개 | 총수입 / 총지출 / 순수익 (`summary.totalIncome`, `totalExpense`, `netProfit`) |
| 메소 잔액 카드 | 인벤 메소 + 창고 메소 = 합계. "수정" 버튼 → `PUT /api/auth/meso-balance` |
| 항목 리스트 | 날짜 / 카테고리 아이콘 / 설명 / 금액. 수입 초록, 지출 빨강 |
| 목표 지연 경고 | 지출 추가 후 `goalWarnings` 배열이 있으면 경고 토스트 또는 배너 표시 |

### 카테고리 아이콘 매핑 (예시)
| category | 아이콘 | 한국어 |
|---|---|---|
| `boss` | ⚔️ | 보스 |
| `hunting` | 🐾 | 사냥 |
| `auction` | 🏷️ | 경매장 |
| `sol_erda` | 💎 | 솔 에르다 |
| `cube` | 🎲 | 큐브 |
| `starforce` | ⭐ | 스타포스 |
| `spell_trace` | 📜 | 주문서 |
| `other` | 📦 | 기타 |

### 주간 계산 로직
- 메이플스토리 주간 초기화 기준: **매주 목요일 00:00**
- `weekStart` = 해당 날짜가 속한 주의 목요일
- 예: 2026-04-28(화) → weekStart = 2026-04-24(목)
- 주간 네비게이션: ±7일 이동

---

## 3. InputPage (`/input`) — 기능 #2, #4, #5, #8

### 역할
메소를 입력하는 전용 화면. 탭 3개로 구성.

### 탭 1: 보스 수익 입력
1. 캐릭터 선택 (선택사항)
2. 날짜 선택 (기본값: 오늘)
3. `resetType` 기준 일간/주간/월간 탭으로 보스 목록 분류
4. 보스 선택 → 난이도 선택 → 결정석 가격 자동 미리보기
5. "기록하기" → `POST /api/boss/kill`
6. 성공 시 결정석 가격이 다이어리에 자동 합산됨 안내

### 탭 2: 수익/지출 직접 입력
- 캐릭터 선택, 날짜, 수입/지출 토글, 카테고리, 금액, 메모
- **수입 카테고리**: `hunting`(사냥), `auction`(경매장), `sol_erda`(솔 에르다), `other`(기타)
- **지출 카테고리**: `cube`(큐브), `starforce`(스타포스), `spell_trace`(주문서), `other`(기타)
- `sol_erda` 선택 시: 조각 개수 입력 → `개수 × user.solErdaFragmentPrice` 자동 환산 미리보기
  - 개당 가격 미설정 시: 설정 페이지 안내 링크 표시
- 제출 → `POST /api/ledger`
- 응답 `goalWarnings` 배열이 비어있지 않으면 경고 토스트 표시

### 탭 3: 경험치 계산기
- 현재 레벨, 현재 경험치(%), 시간당 평균 경험치(%), 목표 레벨(선택) 입력
- `POST /api/stats/exp-calculator`
- 결과: `hoursToTarget`(시간), `daysToTarget`(일)

---

## 4. StatsPage (`/stats`) — 기능 #3, #7, #9

### 사냥 vs 보스 수익 추이 차트
- `GET /api/ledger/income-trend?weeks=8`
- 반환: `[{ weekStart, bossIncome, huntingIncome, auctionIncome, totalIncome }]`
- **라인 차트 (Recharts)**: 주별 보스(파랑) / 사냥(초록) / 경매장(주황) 수익 추이
- **파이 차트**: 최근 4주 합산 기준 비율

### 카테고리별 상세 통계
- `GET /api/ledger/stats?weeks=4`
- 반환: `[{ category, type, total, count, average }]`
- 수입/지출 각각 카테고리별 바 차트

### 익명 수익 비교
- `GET /api/stats/comparison`
- 반환: `{ userAvgWeeklyIncome, globalAvgWeeklyIncome, totalUsers, percentile, message }`
- `message` 필드 그대로 표시
- `totalUsers < 2`이면 "비교할 데이터가 충분하지 않습니다." 안내

### 경험치 계산기
- InputPage 탭 3과 동일한 UI를 이 페이지에도 별도 섹션으로 제공 가능

---

## 5. GoalsPage (`/goals`) — 기능 #4, #10

### 목표 카드 구성
- 목표 이름, 목표 금액 표시
- "예측 보기" 클릭 → `GET /api/goals/{id}/estimate`

**예측 응답 필드**
| 필드 | 설명 |
|:---|:---|
| `currentSavings` | 현재 누적 순수익 |
| `remaining` | 남은 금액 (targetAmount - currentSavings) |
| `progressPercent` | 0~100 진행률 |
| `avgWeeklyNet` | 최근 4주 주간 순수익 평균 |
| `weeksRemaining` | 예상 남은 주수 (null이면 데이터 부족) |
| `estimatedDate` | 예상 달성일 |

- 진행률 바 표시
- `weeksRemaining`이 null이면 "수익 데이터가 부족합니다. 먼저 기록을 추가해주세요."

### 목표 관리
| 버튼 | 동작 |
|:---|:---|
| 추가 | POST /api/goals |
| 수정 | PUT /api/goals/{id} |
| 달성 | PATCH /api/goals/{id}/achieve |
| 삭제 | DELETE /api/goals/{id} |

---

## 6. CharactersPage (`/characters`) — 기능 #5, #6

### 캐릭터 목록 및 관리
- `GET /api/characters` → 본캐 먼저, 이후 등록순
- 등록 폼: name(필수), jobClass, level, isMain, initialInvestment

### 손익분기점 (기능 #5)
- `isMain=false` && `initialInvestment > 0` 인 캐릭터에 "ROI 계산" 버튼 표시
- `GET /api/characters/{id}/roi`

**결과 표시**
| 상태 | UI |
|:---|:---|
| `isBreakEvenReached = true` | "✅ 투자금 회수 완료!" + 순수익 표시 |
| `isBreakEvenReached = false` | 초기투자 / 누적 보스수익 / 주간 평균 / 남은 주수 프로그레스 바 |
| `weeksToBreakEven = null` | "보스 수익 기록이 없습니다." |

**ROI 응답 필드**
```
characterId, characterName, initialInvestment,
cumulativeBossIncome, weeklyAvgBossIncome,
weeksToBreakEven, isBreakEvenReached, remainingToBreakEven
```

### 익명 수익 비교 (기능 #6)
- `GET /api/stats/comparison`
- 내 주간 평균(`userAvgWeeklyIncome`) vs 전체 평균(`globalAvgWeeklyIncome`) 비교 바
- `percentile`, `message` 표시

---

## 7. SettingsPage (`/settings`)

| 기능 | API |
|:---|:---|
| 솔 에르다 조각 낱개 가격 설정 | `PUT /api/auth/sol-erda-price?price={금액}` |
| 현재 보유 메소 기록 (인벤 + 창고) | `PUT /api/auth/meso-balance` |

---

## 공통 컴포넌트

### 메소 포맷 유틸 (필수 구현)

```ts
function formatMeso(amount: number): string {
  if (amount >= 100_000_000) {
    const uk = Math.floor(amount / 100_000_000);
    const man = Math.floor((amount % 100_000_000) / 10_000);
    return man > 0 ? `${uk}억 ${man.toLocaleString()}만` : `${uk}억`;
  }
  if (amount >= 10_000) {
    return `${Math.floor(amount / 10_000).toLocaleString()}만`;
  }
  return amount.toLocaleString();
}
```

### Layout
- **데스크탑**: 좌측 사이드바 (아이콘 + 텍스트)
- **모바일**: 하단 고정 탭바
- 상단 헤더: 로고, 닉네임, 로그아웃

### 상태 관리
- 로그인 상태·유저 정보: `AuthContext`
- 페이지별 데이터: `useState` + `useEffect`
- 데이터 갱신: 추가/수정/삭제 후 fetch 재호출