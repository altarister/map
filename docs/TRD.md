# 기술 참조 문서 (Technical Reference Document)

## 1. 프로젝트 개요

이 프로젝트는 대한민국의 행정구역(시/군)을 학습하고, 물류 경로 및 거리 감각을 익히기 위한 인터랙티브 게임입니다. React와 TypeScript를 기반으로 구축되었으며, 확장 가능한 **N-Stage 아키텍처**를 통해 다양한 학습 단계를 제공합니다.

### 주요 기술 스택

- **Core:** React 18, TypeScript, Vite
- **State Management:** Context API (`GameContext`, `SettingsContext`)
- **Map Rendering:** `@vnedyalk0v/react19-simple-maps`, `d3-geo`
- **Styling:** Tailwind CSS

---

## 2. 아키텍처 (Architecture)

### 2.1 디렉토리 구조

프로젝트는 기능별로 명확하게 분리된 구조를 따릅니다.

```
src/
├── game/
│   ├── core/           # 핵심 타입 및 인터페이스
│   ├── levels/         # 각 레벨별 로직 (Generator, Validator, Strategy)
│   │   ├── Level1_Location/
│   │   ├── Level2_Route/
│   │   └── registry.ts # 레벨 등록 및 관리
│   └── ui/             # 게임 관련 공통 UI (현재 components/game에 혼재, 정리 예정)
├── components/
│   └── game/           # Map, QuizPanel 등 게임 컴포넌트
├── contexts/           # 전역 상태 관리
├── hooks/              # 비즈니스 로직 (useGameLogic 등)
└── types/              # 공통 타입 정의
```

### 2.2 디자인 패턴: 전략 패턴 (Strategy Pattern)

게임의 각 단계를 독립적인 모듈로 관리하기 위해 **전략 패턴**을 도입했습니다. 이를 통해 새로운 레벨을 추가할 때 기존 코드를 수정하지 않고 확장할 수 있습니다.

**핵심 인터페이스 (`src/game/core/types.ts`)**

```typescript
interface LevelStrategy {
  config: LevelConfig; // 레벨 설정 (이름, 설명 등)

  // 문제 생성: 현재 맵 데이터를 기반으로 문제 출제
  generateQuestion(ctx: LevelContext): GameQuestion;

  // 정답 검증: 사용자 입력과 현재 상태를 확인하여 결과 반환
  validateAnswer(
    question: GameQuestion,
    input: UserInput,
    state?: any,
  ): ValidationResult;

  // UI 렌더링: 문제 유형에 따른 지시문 표시
  renderInstruction(question: GameQuestion, step?: number): ReactNode;

  // 지도 오버레이: 레벨 특화 시각화 (예: 경로 선, 마커 등)
  renderMapOverlay(
    question: GameQuestion,
    mapData: RegionFeature[],
    state?: any,
  ): ReactNode;
}
```

---

## 3. 데이터 흐름 및 상태 관리

### 3.1 핵심 상태 (Game State)

`GameContext`와 `useGameLogic` 훅을 통해 게임의 전반적인 상태를 관리합니다.

- **`currentLevel`**: 현재 플레이 중인 레벨 (SettingsContext)
- **`currentQuestion`**: 현재 문제 객체 (레벨별로 타입 상이)
- **`levelState`**: 레벨 내부의 임시 상태 (예: 경로 찾기 중 '상차지 선택 완료' 상태)
- **`score`**: 점수 및 소요 시간
- **`answeredRegions`**: 정답을 맞춘 지역 목록 (지도 시각화용)

### 3.2 게임 라이프사이클 (Game Lifecycle)

안정적인 게임 진행을 위해 **명확한 상태 전이 및 초기화 시퀀스**를 따릅니다.

1.  **Level Change (Initialization Phase):**
    - `currentLevel` 변경 감지 시 `gameState`를 `LOADING`으로 전환.
    - `currentQuestion`, `levelState` 등 이전 레벨의 잔존 데이터 초기화.
    - 사용자 입력(`checkAnswer`) 원천 차단.
2.  **Start New Game:**
    - 새로운 레벨 전략 로드 및 첫 문제 생성.
    - `gameState`를 `PLAYING`으로 전환하여 게임 시작.
3.  **Validation Loop:**
    - `PLAYING` 상태에서만 사용자 입력을 처리하여 상태 불일치(Race Condition) 방지.

### 3.3 사용자 입력 처리 흐름

1.  **입력 발생:** 사용자가 지도를 클릭하면 `Map.tsx`에서 `{ type: 'MAP_CLICK', regionCode: ... }` 형태의 `UserInput` 객체를 생성합니다.
2.  **검증 요청:** `useGameLogic`의 `checkAnswer` 함수가 호출됩니다.
3.  **안전 장치:** 현재 `gameState`가 `PLAYING`이 아니거나, `currentQuestion`이 유효하지 않으면 요청을 무시합니다.
4.  **전략 위임:** 현재 활성화된 `LevelStrategy.validateAnswer`로 처리를 위임합니다.
5.  **결과 반환:** 전략은 `CORRECT`, `WRONG`, `CONTINUE` 중 하나의 상태를 반환합니다.
    - **CORRECT:** 점수 증가, 다음 문제 출제.
    - **WRONG:** 오답 카운트 증가, 피드백 표시.
    - **CONTINUE:** `levelState` 업데이트 (예: 다음 단계로 진행).

---

## 4. 개발 방향성 (Development Direction)

### 4.1 구조적 안정성 지향 (Structural Stability)

- **임기응변식 패치 지양:** 문제가 발생했을 때 단편적인 수정보다는 시스템의 구조적 원인을 파악하고 해결합니다.
- **명확한 시퀀스:** 게임의 상태 변화(초기화 -> 진행 -> 종료)를 명확한 시퀀스로 정의하여 예측 가능성을 높입니다.

### 4.2 모듈 간 결합도 최소화 (Loose Coupling)

- **책임 분리:** 각 모듈(View, Logic, Strategy)은 자신의 역할에만 집중하며, 서로의 내부 구현에 의존하지 않습니다.
- **인터페이스 통신:** 정해진 인터페이스(`LevelStrategy`, `UserInput`)를 통해서만 데이터를 주고받습니다.

---

## 5. 레벨 상세 구현 (Level Implementation)

### 4.1 Level 1: 지역 위치 익히기 (Location)

- **목표:** 제시된 지역명의 위치를 지도에서 찾기.
- **문제 타입:** `LOCATE_SINGLE`
- **로직:** 사용자가 클릭한 지역 코드가 문제의 타겟 코드와 일치하는지 단순 비교.
- **오버레이:** 별도 오버레이 없음 (기본 지역 라벨 사용).

### 4.2 Level 2: 경로 시각화 (Route Visualization)

- **목표:** 상차지(출발)와 하차지(도착)를 순서대로 선택하여 경로를 완성하기.
- **문제 타입:** `LOCATE_PAIR` (start, end 포함)
- **로직:**
  1.  **State:** `FIND_START` -> `FIND_END`
  2.  `FIND_START` 상태에서 상차지 클릭 시 -> `CONTINUE` 반환 및 `levelState`를 `FIND_END`로 변경.
  3.  `FIND_END` 상태에서 하차지 클릭 시 -> `CORRECT` 반환.
- **오버레이:**
  - 상차지 선택 후: 상차지 위치에 마커 표시.
  - (향후 확장): 상차지와 하차지를 잇는 화살표 점선 표시 등.

---

## 6. UI/UX 컴포넌트

### 6.1 Interactive Map (`Map.tsx`)

`@vnedyalk0v/react19-simple-maps`를 커스터마이징하여 구현했습니다.

- **동적 오버레이:** `getLevelStrategy(currentLevel).renderMapOverlay(...)`를 호출하여 레벨별로 필요한 시각적 요소(마커, 선 등)를 지도 위에 덧그립니다.
- **상호작용:** `ZoomableGroup`을 통한 줌/패닝 지원, 지역 클릭/호버 이벤트 처리.
- **반응형 스타일:** 정답, 오답, 호버 상태에 따라 지역 색상 및 테두리 스타일을 동적으로 계산 (`useMapStyles`).

### 6.2 Quiz Panel (`QuizPanel.tsx`)

- **동적 지시문:** `getLevelStrategy(currentLevel).renderInstruction(...)`을 통해 현재 문제 상황에 맞는 텍스트(예: "안산시 찾기" 또는 "상차지: 안산시 -> 하차지: ???")를 렌더링합니다.

---

## 7. 향후 확장 계획 (Roadmap)

- **Level 3 (Distance):** 두 지점 사이의 직선 거리를 캔버스 드래그 등으로 추정.
- **Level 4 (Time):** 거리와 평균 속도를 기반으로 소요 시간 계산.
- **Level 5 (Profit):** 운임과 비용을 계산하여 오더 수락 여부 판단.
