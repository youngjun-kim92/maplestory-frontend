# 백엔드 API 명세

> 백엔드 서버: `http://localhost:8080`
> Vite 프록시 설정: `/api/*` → `http://localhost:8080/api/*`

---

## 인증 방식

모든 보호 API는 요청 헤더에 JWT 토큰이 필요합니다.

```
Authorization: Bearer {JWT_TOKEN}
```

토큰은 로그인/회원가입 응답에서 받아 `localStorage`에 저장합니다.

---

## 공통 UserResponse 형태

로그인·회원가입·프로필 조회 응답에서 공통으로 사용됩니다.

```json
{
  "id": 1,
  "nickname": "캐릭터닉네임",
  "solErdaFragmentPrice": 1200,
  "inventoryMeso": 500000000,
  "storageMeso": 2000000000,
  "totalMeso": 2500000000,
  "createdAt": "2026-04-28T12:00:00"
}
```

---

## 1. 인증 (`/api/auth`)

### POST `/api/auth/register` — 회원가입
- 인증 불필요
- **Request Body**
  ```json
  { "nickname": "닉네임(2~20자)", "password": "비밀번호(6자 이상)" }
  ```
- **Response** `201 Created`
  ```json
  { "token": "eyJ...", "user": { /* UserResponse */ } }
  ```

### POST `/api/auth/login` — 로그인
- 인증 불필요
- **Request Body**
  ```json
  { "nickname": "닉네임", "password": "비밀번호" }
  ```
- **Response** `200 OK`
  ```json
  { "token": "eyJ...", "user": { /* UserResponse */ } }
  ```

### GET `/api/auth/profile` — 내 프로필 조회
- 인증 필요
- **Response** `200 OK` — `UserResponse`

### PUT `/api/auth/sol-erda-price?price={금액}` — 솔 에르다 조각 낱개 가격 설정
- 인증 필요
- **Query Param**: `price` (Long, 0 이상)
- **Response** `204 No Content`

### PUT `/api/auth/meso-balance` — 현재 보유 메소 기록
- 인증 필요
- **Request Body**
  ```json
  { "inventoryMeso": 500000000, "storageMeso": 2000000000 }
  ```
- **Response** `200 OK` — `UserResponse` (totalMeso = inventoryMeso + storageMeso)

---

## 2. 가계부 (`/api/ledger`)

### 중요: 타입·카테고리 열거값 (모두 소문자)

**type**
| 값 | 설명 |
|---|---|
| `income` | 수입 |
| `expense` | 지출 |

**category**
| 값 | 설명 | type |
|---|---|---|
| `boss` | 보스 결정석 | income |
| `hunting` | 사냥 메소 | income |
| `auction` | 경매장 거래 | income |
| `sol_erda` | 솔 에르다 조각 | income |
| `cube` | 큐브 | expense |
| `starforce` | 스타포스 | expense |
| `spell_trace` | 주문서 | expense |
| `other` | 기타 | income/expense |

---

### GET `/api/ledger?week={YYYY-MM-DD}` — 주간 가계부 조회
- 인증 필요
- **Query Param**: `week` (선택. 없으면 현재 주의 목요일 날짜)
- **Response** `200 OK`
  ```json
  {
    "weekStart": "2026-04-24",
    "entries": [
      {
        "id": 1,
        "type": "income",
        "category": "boss",
        "amount": 119070000,
        "description": "카오스 벨룸 hard 결정석",
        "entryDate": "2026-04-28",
        "weekStart": "2026-04-24",
        "characterId": 2,
        "characterName": "부캐닉네임",
        "createdAt": "2026-04-28T14:00:00"
      }
    ],
    "summary": {
      "totalIncome": 500000000,
      "totalExpense": 100000000,
      "netProfit": 400000000
    }
  }
  ```

### POST `/api/ledger` — 가계부 항목 직접 추가
- 인증 필요
- **Request Body**
  ```json
  {
    "type": "income",
    "category": "hunting",
    "amount": 200000000,
    "description": "헤이스트 B2 사냥",
    "entryDate": "2026-04-28",
    "characterId": null
  }
  ```
- **Response** `201 Created`
  ```json
  {
    "entry": { /* LedgerEntryResponse */ },
    "goalWarnings": [
      {
        "goalId": 1,
        "itemName": "드래곤 로어",
        "delayWeeks": 2,
        "message": "이번 지출로 인해 '드래곤 로어' 목표 달성이 약 2주 지연되었습니다."
      }
    ]
  }
  ```
  - `goalWarnings`: 지출 입력 시에만 내용이 있을 수 있음. 수입이면 빈 배열.

### DELETE `/api/ledger/{id}` — 항목 삭제
- 인증 필요
- **Response** `204 No Content`

### GET `/api/ledger/weeks` — 주차 목록 조회
- 인증 필요
- **Response** `200 OK`
  ```json
  [
    {
      "weekStart": "2026-04-24",
      "totalIncome": 500000000,
      "totalExpense": 100000000,
      "entryCount": 5
    }
  ]
  ```

### GET `/api/ledger/stats?weeks={n}` — 카테고리별 통계
- 인증 필요
- **Query Param**: `weeks` (기본값 4)
- **Response** `200 OK`
  ```json
  [
    {
      "category": "boss",
      "type": "income",
      "total": 800000000,
      "count": 10,
      "average": 80000000
    }
  ]
  ```

### GET `/api/ledger/income-trend?weeks={n}` — 주별 수익 추이 (사냥/보스/경매장)
- 인증 필요
- **Query Param**: `weeks` (기본값 8)
- **Response** `200 OK`
  ```json
  [
    {
      "weekStart": "2026-04-24",
      "bossIncome": 400000000,
      "huntingIncome": 200000000,
      "auctionIncome": 50000000,
      "totalIncome": 650000000
    }
  ]
  ```
  - 주별 오름차순 정렬. 차트(라인/바) 데이터로 바로 사용 가능.

---

## 3. 보스 (`/api/boss`)

### GET `/api/boss/list` — 보스 목록 조회 (인증 불필요)
- **Response** `200 OK`
  ```json
  [
    {
      "id": 1,
      "bossName": "자쿰",
      "difficulty": "easy",
      "crystalPrice": 200000,
      "maxAttemptsPerWeek": 7,
      "resetType": "daily"
    }
  ]
  ```
  - **`resetType`**: `"daily"` | `"weekly"` | `"monthly"` — 보스 탭 분류에 사용
  - 일간 21개 / 주간 50개 / 월간 2개 (검은 마법사)

### POST `/api/boss/kill` — 보스 처치 기록
- 인증 필요
- **Request Body**
  ```json
  {
    "bossName": "벨룸",
    "difficulty": "chaos",
    "killDate": "2026-04-28",
    "characterId": 2
  }
  ```
- **Response** `201 Created`
  ```json
  {
    "id": 10,
    "bossName": "벨룸",
    "difficulty": "chaos",
    "crystalPrice": 9280000,
    "killDate": "2026-04-28",
    "weekStart": "2026-04-24",
    "characterId": 2,
    "characterName": "부캐닉네임",
    "createdAt": "2026-04-28T15:00:00"
  }
  ```
  - 보스 처치 기록 시 `crystalPrice`가 자동으로 `/api/ledger` (category: boss, type: income)에도 저장됩니다.

### GET `/api/boss/weekly?week={YYYY-MM-DD}` — 주간 보스 처치 기록
- 인증 필요
- **Response** `200 OK` — `BossKillResponse[]`

### GET `/api/boss/stats` — 보스별 누적 수익 통계
- 인증 필요
- **Response** `200 OK`
  ```json
  [
    {
      "bossName": "벨룸",
      "difficulty": "chaos",
      "killCount": 10,
      "totalCrystalIncome": 92800000,
      "avgCrystalPrice": 9280000
    }
  ]
  ```

---

## 4. 사냥 (`/api/hunting`)

### POST `/api/hunting/session` — 사냥 세션 기록
- 인증 필요
- **Request Body**
  ```json
  {
    "mapName": "헤이스트 B2",
    "durationMinutes": 60,
    "income": 500000000,
    "solErdaFragments": 5,
    "sessionDate": "2026-04-28",
    "characterId": null
  }
  ```
  - `solErdaFragments`: 선택 입력. 입력 시 `user.solErdaFragmentPrice × 개수`를 수익에 합산.
- **Response** `201 Created`
  ```json
  {
    "id": 1,
    "mapName": "헤이스트 B2",
    "durationMinutes": 60,
    "income": 500000000,
    "solErdaFragments": 5,
    "solErdaMesoValue": 6000,
    "totalIncome": 500006000,
    "sessionDate": "2026-04-28",
    "weekStart": "2026-04-24",
    "characterId": null,
    "characterName": null,
    "createdAt": "2026-04-28T15:00:00"
  }
  ```

### GET `/api/hunting/sessions?week={YYYY-MM-DD}` — 주간 사냥 세션 조회
- 인증 필요
- **Response** `200 OK` — `HuntingSessionResponse[]`

### GET `/api/hunting/stats` — 사냥터별 시간당 수익 통계
- 인증 필요
- **Response** `200 OK`
  ```json
  [
    {
      "mapName": "헤이스트 B2",
      "sessionCount": 5,
      "totalDurationMinutes": 300,
      "totalIncome": 2500000000,
      "incomePerHour": 500000000
    }
  ]
  ```

---

## 5. 목표 아이템 (`/api/goals`)

### POST `/api/goals` — 목표 등록
- 인증 필요
- **Request Body**: `{ "itemName": "드래곤 로어", "targetAmount": 50000000000 }`
- **Response** `201 Created` — `GoalResponse`

### GET `/api/goals` — 목표 목록 조회
- 인증 필요
- **Response** `200 OK`
  ```json
  [
    {
      "id": 1,
      "itemName": "드래곤 로어",
      "targetAmount": 50000000000,
      "isAchieved": false,
      "createdAt": "2026-04-01T00:00:00",
      "achievedAt": null
    }
  ]
  ```

### PUT `/api/goals/{id}` — 목표 수정
- **Request Body**: `{ "itemName": "...", "targetAmount": 0 }`

### DELETE `/api/goals/{id}` — 목표 삭제
- **Response** `204 No Content`

### PATCH `/api/goals/{id}/achieve` — 목표 달성 처리
- **Response** `200 OK` — `GoalResponse`

### GET `/api/goals/{id}/estimate` — 달성 예측 조회
- 인증 필요
- **Response** `200 OK`
  ```json
  {
    "goalId": 1,
    "itemName": "드래곤 로어",
    "targetAmount": 50000000000,
    "currentSavings": 10000000000,
    "remaining": 40000000000,
    "progressPercent": 20,
    "avgWeeklyNet": 500000000,
    "weeksRemaining": 80,
    "estimatedDate": "2027-11-05"
  }
  ```
  - `progressPercent`: 0~100
  - `avgWeeklyNet`: 최근 4주 (수입 - 지출) 평균
  - `weeksRemaining`: null이면 수익 데이터 부족

---

## 6. 캐릭터 (`/api/characters`)

### POST `/api/characters` — 캐릭터 등록
- 인증 필요
- **Request Body**
  ```json
  {
    "name": "부캐닉네임",
    "jobClass": "아이언 불독",
    "level": 230,
    "isMain": false,
    "initialInvestment": 3000000000
  }
  ```

### GET `/api/characters` — 캐릭터 목록 조회
- **Response** `200 OK`
  ```json
  [
    {
      "id": 2,
      "name": "부캐닉네임",
      "jobClass": "아이언 불독",
      "level": 230,
      "isMain": false,
      "initialInvestment": 3000000000,
      "createdAt": "2026-04-01T00:00:00"
    }
  ]
  ```
  - 본캐(`isMain=true`) 먼저, 이후 등록순 정렬

### PUT `/api/characters/{id}` — 캐릭터 수정 (동일 Body)
### DELETE `/api/characters/{id}` — 캐릭터 삭제

### GET `/api/characters/{id}/roi` — 손익분기점 조회
- 인증 필요
- **Response** `200 OK`
  ```json
  {
    "characterId": 2,
    "characterName": "부캐닉네임",
    "initialInvestment": 3000000000,
    "cumulativeBossIncome": 1000000000,
    "weeklyAvgBossIncome": 200000000,
    "weeksToBreakEven": 10,
    "isBreakEvenReached": false,
    "remainingToBreakEven": 2000000000
  }
  ```
  - `weeksToBreakEven`: null이면 보스 수익 데이터 없음
  - `isBreakEvenReached`: true면 투자금 회수 완료

---

## 7. 통계 (`/api/stats`)

### GET `/api/stats/comparison` — 익명 수익 비교
- 인증 필요
- **Response** `200 OK`
  ```json
  {
    "userAvgWeeklyIncome": 800000000,
    "globalAvgWeeklyIncome": 500000000,
    "totalUsers": 42,
    "percentile": 72,
    "message": "내 수익은 전체 유저 상위 28%입니다."
  }
  ```
  - `totalUsers` < 2이면 `message = "비교할 데이터가 충분하지 않습니다."`

### POST `/api/stats/exp-calculator` — 경험치 계산기 (인증 불필요)
- **Request Body**
  ```json
  {
    "currentLevel": 260,
    "currentExpPercent": 45.5,
    "avgExpPerHour": 200.0,
    "targetLevel": 261
  }
  ```
  - `targetLevel`: 선택. 없으면 currentLevel + 1
  - `avgExpPerHour`: 시간당 획득 경험치 % (예: 200.0 = 2.00%)
- **Response** `200 OK`
  ```json
  {
    "currentLevel": 260,
    "targetLevel": 261,
    "hoursToTarget": 27.3,
    "daysToTarget": 1.1
  }
  ```

---

## 에러 응답

```json
{ "message": "에러 메시지" }
```

| HTTP 코드 | 의미 |
|:-:|:---|
| 400 | 입력값 유효성 검사 실패 |
| 401 | 토큰 없음 / 만료 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 중복 닉네임 |
| 500 | 서버 내부 오류 |