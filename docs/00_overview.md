# 메이플 가계부 — 프로젝트 전체 개요

## 서비스 소개

메이플스토리 유저의 게임 내 경제 활동을 스마트하게 관리해주는 **종합 유틸리티 웹 서비스**입니다.
수익·지출 기록, 보스/사냥터 효율 분석, 목표 달성 예측, 부캐 투자 회수 계산 등 10가지 핵심 기능을 제공합니다.

---

## 기술 스택

| 구분 | 기술 |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8 |
| **스타일** | Tailwind CSS v4 (`@tailwindcss/vite`) |
| **라우팅** | React Router DOM v7 |
| **HTTP 클라이언트** | Axios v1 |
| **차트** | Recharts v3 |
| **Backend** | Spring Boot 3, Spring Security, JWT |
| **DB** | MySQL (`maple_planner`) |

---

## 레포지토리 구조

```
maplestory-frontend/   ← 이 저장소
maplestory-backend/    ← Spring Boot 백엔드 (별도 저장소)
```

---

## 10가지 핵심 기능 요약

| # | 기능명 | 담당 페이지 |
| :-: | :--- | :--- |
| 1 | 닉네임+비밀번호 간편 회원가입 / 로그인 | LoginPage, RegisterPage |
| 2 | 목요일 기준 누적형 주간 가계부 | LedgerPage |
| 3 | 사냥터/보스 수익 효율 통계 (차트) | BossPage, HuntingPage |
| 4 | 보스 결정석 가격 자동 계산 | BossPage |
| 5 | 솔 에르다 조각 수동 환산 | HuntingPage |
| 6 | 목표 아이템 달성 예측 | GoalsPage |
| 7 | 레벨업 경험치 계산기 | StatsPage |
| 8 | 부캐릭터 손익분기점(ROI) 계산기 | CharactersPage |
| 9 | 익명 기반 유저 평균 수익 비교 | StatsPage |
| 10 | 과소비 경고 및 목표 지연 알림 | LedgerPage |

---

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 시작 (백엔드 8080 자동 프록시)
npm run dev
# → http://localhost:5173

# 3. 프로덕션 빌드
npm run build
```

> **전제 조건**: 백엔드 서버가 `localhost:8080`에서 실행 중이어야 합니다.

---

## 문서 목록

| 파일 | 내용 |
| :--- | :--- |
| `00_overview.md` | 이 파일. 전체 개요 |
| `01_project_structure.md` | 디렉터리 구조 및 파일별 역할 |
| `02_api_spec.md` | 백엔드 API 명세 (엔드포인트 전체) |
| `03_pages_features.md` | 페이지별 기능 상세 설명 |
