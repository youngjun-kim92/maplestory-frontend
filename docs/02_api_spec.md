# 백엔드 API 명세

> 백엔드 서버: `http://localhost:8080`
> 프론트엔드에서는 Vite 프록시를 통해 `/api/*` → `http://localhost:8080/api/*` 로 전달됩니다.

---

## 인증 방식

모든 보호 API는 요청 헤더에 JWT 토큰이 필요합니다.

```
Authorization: Bearer {JWT_TOKEN}
```

토큰은 로그인/회원가입 응답에서 받아 `localStorage`에 저장합니다.

---

## 1. 인증 (`/api/auth`)

### POST `/api/auth/register` — 회원가입
- 인증 불필요
- **Request Body**
  ```json
  {
    "nickname": "캐릭터닉네임",
    "password": "비밀번호"
  }
  ```
- **Response** `201 Created`
  ```json
  { "token": "eyJ..." }
  ```

### POST `/api/auth/login` — 로그인
- 인증 불필요
- **Request Body**
  ```json
  {
    "nickname": "캐릭터닉네임",
    "password": "비밀번호"
  }
  ```
- **Response** `200 OK`
  ```json
  { "token": "eyJ..." }
  ```

### GET `/api/auth/profile` — 내 프로필 조회
- 인증 필요
- **Response** `200 OK`
  ```json
  {
    "id": 1,
    "nickname": "캐릭터닉네임",
    "solErdaFragmentPrice": 50000
  }
  ```

### PUT `/api/auth/sol-erda-price?price={금액}` — 솔 에르다 조각 가격 설정
- 인증 필요
- **Query Param**: `price` (Long, 0 이상)
- **Response** `204 No Content`

---

## 2. 가계부 (`/api/ledger`)

### GET `/api/ledger?week={YYYY-MM-DD}` — 주간 가계부 조회
- 인증 필요
- **Query Param**: `week` (선택, 없으면 현재 주)
- **Response** `200 OK`
  ```json
  {
    "weekStart": "2026-04-24",
    "weekEnd": "2026-04-30",
    "totalIncome": 5000000000,
    "totalExpense": 1000000000,
    "netAmount": 4000000000,
    "entries": [ ... ],
    "overspendingWarning": {
      "triggered": true,
      "message": "이번 지출로 인해 목표 아이템 구매가 2주 지연되었습니다.",
      "delayedWeeks": 2,
      "affectedGoalName": "에테르넬 완드"
    }
  }
  ```

### POST `/api/ledger` — 가계부 항목 추가
- 인증 필요
- **Request Body**
  ```json
  {
    "type": "INCOME",
    "category": "BOSS",
    "amount": 500000000,
    "description": "카오스 벨룸",
    "entryDate": "2026-04-28",
    "characterId": null
  }
  ```
  - `type`: `INCOME` | `EXPENSE`
  - `category`: `BOSS` | `HUNTING` | `TRADE` | `CUBE` | `STARFORCE` | `OTHER_INCOME` | `OTHER_EXPENSE`
- **Response** `201 Created` — 갱신된 주간 가계부 객체

### DELETE `/api/ledger/{id}` — 항목 삭제
- 인증 필요
- **Response** `204 No Content`

### GET `/api/ledger/weeks` — 주차 목록 조회
- 인증 필요
- **Response** `200 OK`
  ```json
  [
    { "weekStart": "2026-04-24", "totalIncome": 5000000000, "totalExpense": 1000000000 }
  ]
  ```

### GET `/api/ledger/stats?weeks={n}` — 카테고리별 통계
- 인증 필요
- **Query Param**: `weeks` (기본값 4)
- **Response** `200 OK` — `[카테고리명, 금액][]`

---

## 3. 보스 (`/api/boss`)

### GET `/api/boss/list` — 보스 목록 조회
- 인증 불필요
- **Response** `200 OK`
  ```json
  [
    { "id": 1, "name": "카오스 벨룸", "difficulty": "카오스", "crystalPrice": 119070000 }
  ]
  ```

### POST `/api/boss/kill` — 보스 처치 기록
- 인증 필요
- **Request Body**
  ```json
  {
    "bossName": "카오스 벨룸",
    "difficulty": "카오스",
    "killDate": "2026-04-28",
    "characterId": null
  }
  ```
- **Response** `201 Created` — `BossKill` 객체

### GET `/api/boss/weekly?week={YYYY-MM-DD}` — 주간 보스 처치 기록
- 인증 필요
- **Response** `200 OK` — `BossKill[]`

### GET `/api/boss/stats` — 보스별 누적 수익 통계
- 인증 필요
- **Response** `200 OK`
  ```json
  [
    {
      "bossName": "카오스 벨룸",
      "difficulty": "카오스",
      "killCount": 10,
      "totalRevenue": 1190700000
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
  - `solErdaFragments`: 선택. 입력 시 설정된 조각 가격으로 자동 환산되어 합산
- **Response** `201 Created` — `HuntingSession` 객체

### GET `/api/hunting/sessions?week={YYYY-MM-DD}` — 주간 사냥 세션 조회
- 인증 필요
- **Response** `200 OK`
  ```json
  [
    {
      "id": 1,
      "mapName": "헤이스트 B2",
      "durationMinutes": 60,
      "income": 500000000,
      "solErdaFragments": 5,
      "solErdaValue": 250000,
      "totalIncome": 500250000,
      "sessionDate": "2026-04-28",
      "characterId": null,
      "characterName": null
    }
  ]
  ```

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
- **Request Body**: `{ "itemName": "에테르넬 완드", "targetAmount": 5000000000 }`
- **Response** `201 Created` — `Goal` 객체

### GET `/api/goals` — 목표 목록 조회
- 인증 필요
- **Response** `200 OK` — `Goal[]`
  ```json
  [
    {
      "id": 1,
      "itemName": "에테르넬 완드",
      "targetAmount": 5000000000,
      "achieved": false,
      "createdAt": "2026-04-01T00:00:00",
      "achievedAt": null
    }
  ]
  ```

### PUT `/api/goals/{id}` — 목표 수정
- 인증 필요
- **Request Body**: `{ "itemName": "...", "targetAmount": 0 }`

### DELETE `/api/goals/{id}` — 목표 삭제
- **Response** `204 No Content`

### PATCH `/api/goals/{id}/achieve` — 목표 달성 처리
- **Response** `200 OK` — 갱신된 `Goal` 객체

### GET `/api/goals/{id}/estimate` — 달성 예측 조회
- 인증 필요
- **Response** `200 OK`
  ```json
  {
    "goalId": 1,
    "itemName": "에테르넬 완드",
    "targetAmount": 5000000000,
    "currentSavings": 1000000000,
    "remainingAmount": 4000000000,
    "avgWeeklyIncome": 500000000,
    "estimatedWeeks": 8,
    "estimatedDate": "2026-06-23"
  }
  ```

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
- **Response** `200 OK` — `MapleCharacter[]`

### PUT `/api/characters/{id}` — 캐릭터 수정

### DELETE `/api/characters/{id}` — 캐릭터 삭제

### GET `/api/characters/{id}/roi` — 손익분기점 조회
- 인증 필요
- **Response** `200 OK`
  ```json
  {
    "characterId": 2,
    "characterName": "부캐닉네임",
    "initialInvestment": 3000000000,
    "totalBossRevenue": 1000000000,
    "weeklyBossRevenue": 200000000,
    "weeksUntilBreakEven": 10,
    "alreadyProfitable": false
  }
  ```

---

## 7. 통계 (`/api/stats`)

### GET `/api/stats/comparison` — 익명 수익 비교
- 인증 필요
- **Response** `200 OK`
  ```json
  {
    "myWeeklyAvg": 800000000,
    "allUsersWeeklyAvg": 500000000,
    "percentile": 72,
    "message": "내 사냥 수익은 전체 유저 상위 28%입니다."
  }
  ```

### POST `/api/stats/exp-calculator` — 경험치 계산
- 인증 불필요
- **Request Body**
  ```json
  {
    "currentLevel": 260,
    "currentExpPercent": 45.5,
    "avgExpPerHour": 2000000000,
    "targetLevel": 261
  }
  ```
- **Response** `200 OK`
  ```json
  {
    "currentLevel": 260,
    "targetLevel": 261,
    "requiredExp": 1234567890,
    "estimatedHours": 2,
    "estimatedMinutes": 37
  }
  ```

---

## 에러 응답 형식

| HTTP 코드 | 의미 |
| :-: | :--- |
| 400 | 요청 유효성 검사 실패 |
| 401 | 토큰 없음 / 만료 / 잘못된 토큰 |
| 403 | 권한 없음 (다른 유저의 리소스 접근) |
| 404 | 리소스 없음 |
| 500 | 서버 내부 오류 |
