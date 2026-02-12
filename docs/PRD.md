# [PRD] 일달 트레이너 (1DAL Trainer) : 화물 배차 훈련 시뮬레이터

**프로젝트 코드명**: Freight Mapper
**작성일**: 2026-02-12
**버전**: 2.1.0 (Training Focus)

---

## 1. 프로젝트 개요 (Overview)

### 1.1 배경

화물 배차 경쟁에서 승리하려면 **"지역 위치", "이동 경로", "적정 단가"**를 0.5초 안에 직관적으로 판단해야 합니다. 이를 위해 평상시에 게임처럼 즐기며 감각을 익힐 수 있는 시뮬레이터가 필요합니다.

### 1.2 목표

- **위치 암기**: 수도권 주요 시/군/구의 위치를 조건 반사적으로 클릭할 수 있게 함.
- **거리 감각**: 지도상의 두 지점을 보고 실제 주행 거리와 소요 시간을 오차 범위 10% 내로 유추.
- **수익성 판단**: 거리/시간/톤수 대비 적정 운임을 계산하여 '똥콜'과 '꿀짐'을 구분하는 뇌지컬 배양.

---

## 2. 핵심 기능 및 학습 로드맵 (Learning Roadmap)

사용자의 판단력을 단계별로 높이기 위해 5단계 레벨 시스템을 도입합니다.

### Level 1: 지역 위치 (Location)

- **목표**: "안산시 단원구"라는 텍스트를 보자마자 지도에서 위치를 클릭.
- **기능**:
  - 수도권(서울/경기/인천) 행정구역 지도 렌더링.
  - 랜덤 퀴즈 생성 및 정답/오답 피드백.
  - 콤보 시스템으로 연속 정답 시 점수 부스팅.

### Level 2: 경로 시각화 (Route)

- **목표**: 상차지와 하차지 두 지점을 연결하고 대략적인 경로를 머릿속에 그림.
- **기능**:
  - 두 개의 지역(Origin, Destination) 순차 클릭.
  - 두 지점을 잇는 직선/곡선 오버레이 표시.
  - 시각적 연결성 강화.

### Level 3: 거리 추정 (Distance)

- **목표**: 지도상의 시각적 거리를 보고 '실제 주행 거리(km)'를 유추.
- **기능**:
  - 사용자에게 슬라이더/입력창을 통해 예상 거리 입력 유도.
  - Haversine 공식 또는 TMAP 데이터 기반의 실제 거리와 비교.
  - 오차율(Error Rate)에 따른 점수 차등 지급.

### Level 4: 시간 예측 (Time)

- **목표**: 거리와 교통 상황(가정)을 고려해 소요 시간을 예측.
- **기능**:
  - "오전 8시 출근 시간대" 등 변수 부여.
  - 예상 소요 시간 입력 및 피드백.

### Level 5: 단가 심사 (Pricing)

- **목표**: 최종적으로 이 콜을 잡을지 말지 결정 (Go / No-Go).
- **기능**:
  - 가상의 화물 공고 (상/하차지, 톤수, 단가) 생성.
  - 사용자의 수락/거절 결정에 따른 가상 수익(Net Profit) 계산.
  - "당신은 이 콜을 잡아서 3만 원 손해를 봤습니다" 등의 구체적 피드백.

---

## 3. 기술 스택 (Tech Stack)

- **Core**: React, TypeScript, Vite
- **State**: Context API (GameContext, SettingsContext)
- **Map Engine**: `react-simple-maps` (D3-geo 기반)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel / GitHub Pages

---

## 4. 사용자 인터페이스 (UI)

### 4.1 메인 화면 (Dashboard)

- 현재 레벨 및 경험치(XP) 표시.
- "훈련 시작" 버튼.
- 최근 기록 및 통계 그래프.

### 4.2 게임 화면 (In-Game)

- **상단**: 현재 점수, 콤보 상태.
- **중앙**: 인터랙티브 지도 (Zoom/Pan 가능).
- **하단**: 퀴즈 질문(지역명 등) 및 컨트롤 패널(거리 입력 등).

---

## 5. 데이터 구조 (Data Schema)

### 5.1 Region Feature (GeoJSON)

```typescript
interface RegionFeature {
  properties: {
    code: string; // 행정동 코드
    name: string; // 지역명 (예: 강남구)
    base_price_factor?: number; // 지역별 단가 가중치
  };
  geometry: any;
}
```

### 5.2 Game Log

```typescript
interface GameLog {
  level: number;
  score: number;
  accuracy: number; // 정답률
  timestamp: Date;
  details: {
    question: string;
    userAnswer: string;
    isCorrect: boolean;
    reactionTime: number; // 반응 속도 (ms)
  }[];
}
```
