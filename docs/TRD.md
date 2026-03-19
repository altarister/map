# 기술 참조 문서 (Technical Reference Document)

**버전**: 4.0.0  
**최종 업데이트**: 2026-02-25  
**주요 변경사항**: Canvas 기반 맵 레이어 전환, 모듈화 아키텍처 정립

---

## 1. 프로젝트 개요

이 프로젝트는 대한민국의 행정구역(시/군)을 학습하고, 물류 경로 및 거리 감각을 익히기 위한 인터랙티브 게임입니다. React와 TypeScript를 기반으로 구축되었으며, 확장 가능한 **N-Stage 아키텍처**를 통해 다양한 학습 단계를 제공합니다.

### 주요 기술 스택

#### Core

- **React 18**: UI 프레임워크
- **TypeScript**: 타입 안전성
- **Vite**: 빌드 도구

#### State Management

- **Context API**: `GameContext`, `SettingsContext`

#### Map Rendering (v3.0 - D3 기반)

- **d3-geo**: GeoJSON 투영 및 SVG path 생성
- **d3-zoom**: 커서 기준 줌/팬 인터랙션
- **d3-selection**: SVG 요소 선택 및 조작
- **d3-transition**: 부드러운 애니메이션

#### Styling

- **Tailwind CSS**: 유틸리티 기반 스타일링

---

## 2. 아키텍처 (Architecture)

### 2.1 디렉토리 구조

프로젝트는 기능별로 명확하게 분리된 구조를 따릅니다.

```
src/
├── game/               # 🧠 게임 코어 엔진 및 비즈니스 로직
│   ├── core/           # 핵심 타입 및 인터페이스 (전략 패턴 베이스)
│   ├── stages/         # 각 레벨별 실제 구동되는 게임 로직 (Stage1, Stage2...)
│   └── systems/        # 부가 시스템 (인텔 데이터 파서 등)
├── components/
│   ├── game/           # Map, QuizPanel, ScoreBoard, Overlays 등
│   ├── layout/         # GameLayout, TopBar
│   └── ui/             # Button, Modal 등 재사용 컴포넌트
├── contexts/           # 전역 상태 관리
│   ├── GameContext.tsx
│   ├── GeoDataContext.tsx
│   └── SettingsContext.tsx
├── hooks/              # 비즈니스 로직 및 D3 제어 (상세 역할은 2.2절 참조)
│   ├── useGameLogic.ts             # 게임 점수/출제/상태 관리
│   ├── useGeoData.ts               # GeoJSON 데이터 로드
│   ├── useLocalStorage.ts          # 유저 설정/최고 점수 저장
│   ├── useMapAutoZoom.ts           # 부드러운 자동 스크롤 애니메이션
│   ├── useMapCrossfadeTransition.ts# 줌 레벨 스위칭 시 깜빡임 방지
│   ├── useMapDimensions.ts         # 브라우저 리사이즈 반응
│   ├── useMapFeatures.ts           # 화면 내 보이는 폴리곤 영역 최적화 필터링
│   ├── useMapGeometry.ts           # 지구 좌표 ↔ 픽셀 좌표 수학적 투영/변환
│   ├── useMapScale.ts              # 줌 비율에 따른 선 굵기 보정
│   ├── useMapStyles.ts             # 상태에 따른 지역 색상 칠하기
│   └── useMapZoom.ts               # D3 줌/팬 동작 및 Canvas transform 제어
├── services/           # 비즈니스 로직 서비스
│   └── MasteryStorage.ts # 숙련도 기록 저장
├── styles/             # 공통 스타일
├── lib/                # 유틸리티 함수
└── types/              # 공통 타입 정의
    ├── game.ts
    └── geo.ts
```



### 2.2 Custom Hooks 아키텍처 (`src/hooks/`)

프로젝트의 비즈니스 로직과 D3 렌더링 최적화는 11개의 훅 단위로 분리되어 있으며, 역할과 저장소(State) 위치에 따라 다음과 같이 3개 그룹으로 나뉩니다.

**1. 전역 시스템 훅 (Context 연동)**
- **`useGameLogic.ts`**: 게임 점수, 단계, 문제 출제 및 정답 검증 로직. 데이터는 `GameContext`에 저장.
- **`useGeoData.ts`**: 대용량 GeoJSON 지도 데이터를 브라우저에 로드 및 인메모리 적재. 데이터는 `GeoDataContext`에 저장.

**2. 스토리지 훅 (영구 저장소 연동)**
- **`useLocalStorage.ts`**: 환경설정 및 최고 점수 등 휘발되지 않아야 할 데이터를 브라우저 `localStorage`에 영구 기록 및 불러오기.

**3. 지도(Map) 마이크로 컨트롤 훅 (로컬 상태 & D3 제어 연동)**
- **`useMapZoom.ts`**: D3 라이브러리를 통해 마우스 휠 줌/드래그 이벤트를 관장하고 `transform(x, y, k)` 상태 유지.
- **`useMapAutoZoom.ts`**: 정답/오답 타겟 좌표로 지도를 부드럽게 자동 스크롤하는 애니메이션 로직.
- **`useMapCrossfadeTransition.ts`**: 줌 인/아웃 시 LOD(레벨 오브 디테일)가 바뀔 때 화면 깜빡임을 방지하는 CSS 투명도 조절 로직.
- **`useMapDimensions.ts`**: 브라우저 창 크기(Resize) 변화를 실시간 감지하여 캔버스 크기를 즉각 재계산.
- **`useMapFeatures.ts`**: 렌더링 성능 최적화를 위해 방대한 GeoJSON 중 "현재 화면 Bounding Box" 내부에 있는 폴리곤만 필터링.
- **`useMapGeometry.ts`**: D3.js 기반으로 지구상 좌표(Lon/Lat)를 브라우저 픽셀(X/Y)로 투영(Projection) 및 변환.
- **`useMapScale.ts`**: 줌 스케일 레벨에 비례하여 렌더링되는 선의 굵기를 동적으로 적절히 보정.
- **`useMapStyles.ts`**: 정답/오답/Hover 등 게임 이벤트 상태와 `themes.ts` 상수 색상값을 매핑해주는 붓 역할.

### 2.3 디자인 패턴: 전략 패턴 (Strategy Pattern)

게임의 각 단계를 독립적인 모듈로 관리하기 위해 **전략 패턴**을 도입했습니다. 이를 통해 새로운 레벨을 추가할 때 기존 코드를 수정하지 않고 확장할 수 있습니다.

**핵심 인터페이스 (`src/game/core/types.ts`)**

```typescript
interface StageStrategy {
  config: LevelConfig; // 단계 메타데이터 (이름, 설명, 해금조건, 지도옵션 등)

  // 문제 생성: 현재 맵 데이터를 기반으로 문제 출제
  generateQuestion(ctx: StageContext): GameQuestion;

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

### 2.4 UI 컴포넌트의 단일 진실 공급원 (SSOT) 적용

- `Map.tsx`, `SettingsModal.tsx`, `GameModeSelectScreen.tsx` 등의 UI 컴포넌트는 현재 단계의 특정 숫자(예: `currentStage === 1`)에 의존하여 하드코딩된 UI를 그리지 않습니다.
- 대신, `StageStrategy.config` 객체(타입: `LevelConfig`)를 통해 해당 단계의 배지, 이름, 설명, 맵 표시 옵션(`forceShowTownGeometry`)과 해금 조건(`unlockCondition`)을 동적으로 전달받아 렌더링합니다.

---

## 3. 데이터 흐름 및 상태 관리

### 3.1 핵심 상태 (Game State)

`GameContext`와 `useGameLogic` 훅을 통해 게임의 전반적인 상태를 관리합니다.

- **`currentStage`**: 현재 플레이 중인 게임 단계 (SettingsContext)
- **`currentQuestion`**: 현재 문제 객체 (레벨별로 타입 상이)
- **`levelState`**: 레벨 내부의 임시 상태 (예: 경로 찾기 중 '상차지 선택 완료' 상태)
- **`score`**: 점수 및 소요 시간
- **`answeredRegions`**: 정답을 맞춘 지역 목록 (지도 시각화용)

### 3.2 게임 라이프사이클 (Game Lifecycle)

안정적인 게임 진행을 위해 **명확한 상태 전이 및 초기화 시퀀스**를 따릅니다.

1.  **Level Change (Initialization Phase):**
    - `currentStage` 변경 감지 시 `gameState`를 `LOADING`으로 전환.
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
4.  **전략 위임:** 현재 활성화된 `StageStrategy.validateAnswer`로 처리를 위임합니다.
5.  **결과 반환:** 전략은 `CORRECT`, `WRONG`, `CONTINUE` 중 하나의 상태를 반환합니다.
    - **CORRECT:** 점수 증가, 다음 문제 출제.
    - **WRONG:** 오답 카운트 증가, 피드백 표시.
    - **CONTINUE:** `levelState` 업데이트 (예: 다음 단계로 진행).

---

## 4. 개발 방향성 (Development Direction)

### 4.1 구조적 안정성 지향 (Structural Stability)

- **임기응변식 패치 지양:** 문제가 발생했을 때 단편적인 수정보다는 시스템의 구조적 원인을 파악하고 해결합니다.
- **명확한 시퀀스:** 게임의 상태 변화(초기화 → 진행 → 종료)를 명확한 시퀀스로 정의하여 예측 가능성을 높입니다.

### 4.2 모듈 간 결합도 최소화 (Loose Coupling)

- **책임 분리:** 각 모듈(View, Logic, Strategy)은 자신의 역할에만 집중하며, 서로의 내부 구현에 의존하지 않습니다.
- **인터페이스 통신:** 정해진 인터페이스(`StageStrategy`, `UserInput`)를 통해서만 데이터를 주고받습니다.

---

## 5. 레벨 상세 구현 (Level Implementation)

### 5.1 Level 1: 지역 위치 익히기 - 챕터 1 (Location Mastery)

- **목표:** 선택된 시/군/구(Chapter)의 **모든 하위 행정동**을 완벽하게 암기하기.
- **진행 방식 (Mastery Loop):**
  1.  **Select:** `GameOptionSelectScreen`에서 하나의 챕터(시/군)를 선택.
  2.  **Queue:** 해당 챕터의 모든 행정동을 큐(Queue/Deck)에 등록.
  3.  **Play:** 큐에서 하나씩 꺼내 문제를 제시.
      - **정답:** 큐에서 제거, 숙련도(%) 증가.
      - **오답:** **큐에서 제거되지 않음**, 리스트의 뒤쪽으로 재삽입(Retry).
  4.  **Clear:** 큐가 0이 될 때까지 무한 반복.
- **저장소:** `MasteryStorage`를 통해 챕터별 최고 숙련도(%)를 로컬 스토리지에 영구 저장.
- **난이도 모드:**
  - **Normal:** 지도에 지역명(Label) 표시 (학습용).
  - **Hard:** 지역명 숨김 (실전용).

### 5.2 Level 2: 경로 시각화 (Route Visualization)

- **목표:** 상차지(출발)와 하차지(도착)를 순서대로 선택하여 경로를 완성하기.
- **문제 타입:** `LOCATE_PAIR` (start, end 포함)
- **로직:**
  1.  **State:** `FIND_START` → `FIND_END`
  2.  `FIND_START` 상태에서 상차지 클릭 시 → `CONTINUE` 반환 및 `levelState`를 `FIND_END`로 변경.
  3.  `FIND_END` 상태에서 하차지 클릭 시 → `CORRECT` 반환.
- **오버레이:**
  - 상차지 선택 후: 상차지 위치에 마커 표시.
  - 정답 후: 상차지와 하차지를 잇는 선 표시.

### 5.3 Level 3: 거리 추정 (Distance)

- **목표:** 두 지점 사이의 직선 거리를 추정.
- **문제 타입:** `ESTIMATE_DIST`
- **로직:** 사용자 입력 거리와 실제 거리(Haversine 공식) 비교, 오차율에 따라 점수 차등.
- **오버레이:** 두 지점을 잇는 점선과 마커 표시.

---

## 6. UI/UX 컴포넌트

### 6.1 Interactive Map (`Map.tsx`)

**v4.0 - Canvas + SVG 혼합 레이어 아키텍처**

#### 레이어 구조

지도는 렌더링 특성에 따라 3개의 독립적인 레이어로 구성됩니다.

```
┌─────────────── z-index 20: SVG 레이어 ────────────────────┐
│  <svg ref={svgRef}>                                       │
│    <g ref={gRef} style="CSS transform (translate+scale)"> │
│      HighlightOverlay  ← 호버/피드백 오버레이 (SVG)        │
│      InteractionLayer  ← 클릭/호버 이벤트 감지 (SVG)      │
│      RegionLabel       ← 지역명 텍스트, font-size=14/k    │
│    </g>                                                    │
│  </svg>                                                    │
├─────────────── z-index 1: Road Canvas ────────────────────┤
│  RoadLayer (5-canvas)  ← 도로망 (Canvas, Imperative)      │
├─────────────── z-index 0: BaseMap Canvas ─────────────────┤
│  BaseMapLayerCanvas    ← 지형/행정구역 (Canvas, Imperative)│
└───────────────────────────────────────────────────────────┘
```

#### 줌 제어 (`useMapZoom`)

`useMapZoom` 훅은 D3 zoom 이벤트를 구독하고, 연결된 모든 Canvas 레이어와 SVG 레이어를 통합 제어합니다.

```typescript
// 모든 Canvas 레이어를 배열로 주입 (확장 시 이 배열만 변경)
const {
  svgRef,
  gRef,
  transform: zoomTransform,
  zoomTo,
} = useMapZoom({
  width,
  height,
  onZoom: handleZoom,
  canvasLayerRefs: [baseMapLayerRef, roadLayerRef], // CanvasLayerHandle[]
});

// 줌 이벤트 처리 (2-Phase)
// Phase 1 - 매 프레임 (60fps): CSS transform만 변경 (리렌더링 없음)
//   → gRef: translate(x,y) scale(k)
//   → Canvas: setCssTransform(current, lastDrawn) 상대적 이동
//   → setTransform(k): 라벨 font-size=14/k 즉시 반영
// Phase 2 - 줌 종료: Canvas 완전 재드로우 + React state 동기화
//   → canvas.draw(t)
//   → setTransform(t) (최종 확정)
```

#### CanvasLayerHandle 인터페이스 (`src/types/canvas.ts`)

모든 Canvas 기반 레이어가 구현해야 하는 공통 인터페이스입니다. `useMapZoom`은 이 인터페이스만 의존하므로 레이어가 추가되어도 훅 내부 변경이 불필요합니다.

```typescript
export interface CanvasLayerHandle {
  draw: (transform: { x: number; y: number; k: number }) => void;
  setCssTransform: (
    current: { x: number; y: number; k: number },
    start: { x: number; y: number; k: number },
  ) => void;
}
```

#### 라벨 크기 고정 원리 (`RegionLabel.tsx`)

라벨은 `<g ref={gRef}>` 내부에 있어 CSS `scale(k)`가 적용됩니다.  
`font-size = 14 / k`로 scale을 정확히 상쇄하여 14px 시각 크기를 유지합니다.  
`useMapZoom`이 zoom 이벤트마다 `setTransform`을 호출하므로 k값이 항상 최신 → 스냅 없음.

```typescript
const finalFontSize = TARGET_SCREEN_FONT_SIZE / transform.k; // 14/k
// gRef의 CSS scale(k) × font-size(14/k) = 14px (항상 일정)
```

#### 주요 기능

- **커서 위치 기준 줌**: d3-zoom 네이티브 기능
- **드래그 팬**: 부드러운 지도 이동
- **프로그래밍 방식 줌 애니메이션** (`zoomTo`): easeInOutQuad 커스텀 애니메이션
- **LOD (Level of Detail)**: 줌 레벨 1.5x 기준 시/군 ↔ 읍/면/동 자동 전환
- **MapScale**: 현재 축척 표시 (예: "2 km")

### 6.2 LOD (Level of Detail) System

**자동 레벨 전환**

```tsx
const LOD_THRESHOLD = 1.5;
const showTownGeometry = zoomTransform.k >= LOD_THRESHOLD;
const featuresToRender = showTownGeometry ? features : filteredCityFeatures;
```

- **Zoom < 1.5x**: 시/군 단위 (적은 polygon 수, 빠른 렌더링)
- **Zoom ≥ 1.5x**: 읍/면/동 단위 (상세 지형)

### 6.3 Quiz Panel (`QuizPanel.tsx`)

- **동적 지시문:** `getStageStrategy(currentStage).renderInstruction(...)`을 통해 현재 문제 상황에 맞는 텍스트를 렌더링합니다.
- **레벨별 컨트롤**: Level 3의 경우 거리 입력 폼 표시.

### 6.4 Tactical Intel System (`IntelPopup.tsx`)

- **역할**: 사용자의 우클릭 인터랙션에 반응하여 해당 지역의 전술 정보(지명, 인접 지역, 도로)를 표시합니다.
- **특징**:
  - **Glassmorphism UI**: 야간 훈련 지도 컨셉의 반투명 스타일링.
  - **Portal-free**: `Map` 컴포넌트 내부에서 절대 위치(`absolute`)로 렌더링되어 줌/팬 컨텍스트와 무관하게 화면 좌표(`clientX`, `clientY`)를 따릅니다.
  - **Dismissal**: 외부 클릭(`click-outside`) 또는 닫기 버튼으로 제어됩니다.

---

## 7. 데이터 처리

### 7.1 GeoJSON 로딩 (`useGeoData`)

```tsx
const { data: mapData, cityData, loading, error } = useGeoData();
```

- **시/군/자치구**: `/data/skorea_municipalities_geo_simple.json` (전국 250개 → 경기도 42개 필터링)
- **읍/면/법정동**: `/data/skorea_submunicipalities_geo_simple.json` (전국 3504개 → 경기도 563개 필터링)

### 7.2 필터링 로직

```tsx
const gyeonggiCodes = ['41', ...]; // 경기도 시/군 코드
const filteredCity = level2.features.filter(f =>
  gyeonggiCodes.includes(f.properties.code)
);
```

### 7.3 데이터 스키마 및 그룹핑 (Data Schema & Grouping)

**원본 데이터 (Raw Data)**

`public/data/gyeonggi_bupjeongdong.geojson` 파일의 최소 조각(Terminal Node)은 10자리의 코드를 가진 법정동 또는 법정리입니다.

```typescript
interface RawRegionProperties {
  code: string; // 10자리 법정구역 코드 (예: "4161025025" 산이리)
  name: string; // 지역 이름 (예: "태전동", "산이리")
  SIG_KOR_NM?: string; // 소속 시군구 (예: "경기도")
  EMD_KOR_NM?: string; // 소속 읍면동 (예: "초월읍") - 단, VWORLD 리 데이터에는 이 필드가 완벽하지 않음
}
```

**동적 가상 객체 생성 (Dynamic Grouping)**

"기본 훈련" 모드 등에서는 리(Ri) 단위가 아닌 읍/면/동 덩어리로 출제해야 합니다. 이를 위해 `useGeoData` 로드 시점에 앞 **8자리 코드(읍/면/동 수준)**를 기준으로 여러 리 폴리곤을 묶어 하나의 논리적 덩어리(Virtual Polygon)로 취급하는 그룹핑 로직을 수행합니다.

- **코드 구조:**
  - `41` (시도 - 경기도)
  - `610` (시군구 - 광주시) 
  - `250` (읍면동 - 초월읍) 
  - `25` (리 - 산이리)
- **그룹핑 기준:** `feature.properties.code.substring(0, 8)` 이 같은 것들은 하나의 `EupMyeon` 그룹으로 관리합니다.

### 7.4 데이터 영속성 (Data Persistence)

`MasteryStorage` 서비스를 통해 브라우저 `localStorage`에 학습 데이터를 영구 저장합니다.

| Key               | Value Type    | Description                    | Example                       |
| :---------------- | :------------ | :----------------------------- | :---------------------------- |
| `map-mastery-v1`  | `JSON Object` | 챕터(시/군)별 최고 숙련도 기록 | `{"41110": 100, "41130": 45}` |
| `game-difficulty` | `string`      | 난이도 설정 (NORMAL / HARD)    | `"HARD"`                      |
| `game-level`      | `number`      | 마지막으로 플레이한 레벨       | `1`                           |

**Schema Detail (`map-mastery-v1`)**

```typescript
interface MasteryRecord {
  [regionCode: string]: number; // 0 ~ 100 (Integer)
  // regionCode: 행정동 코드 앞 5자리 (시/군/구 단위)
  // number: 해당 챕터의 클리어 퍼센티지
}
```

---

### 7.5 Data Enrichment: Centroids

`IntelSystem`의 인접 지역 계산(`geoDistance`) 성능을 최적화하기 위해, 데이터 로딩 시점(`useGeoData`)에 모든 Feature의 중심점(Centroid)을 미리 계산하여 메모리에 캐싱합니다.

```typescript
// useGeoData.ts
import { geoCentroid } from "d3-geo";

// ...
f.properties.centroid = geoCentroid(f); // [lon, lat]
```

---

## 8. 주요 아키텍처 결정 (Architecture Decisions)

### AD-001: react-simple-maps → D3 직접 렌더링 마이그레이션

**날짜**: 2026-02-14  
**버전**: v3.0.0

#### 문제

`@vnedyalk0v/react19-simple-maps`의 `<Geographies>` 컴포넌트에 WeakMap 기반 캐싱 버그 존재. 시/군/자치구 (42개) ↔ 읍/면/법정동 (563개) 전환 시 563개 지역이 표시되지 않음.

#### 결정

D3 (d3-geo, d3-zoom, d3-selection)를 사용한 직접 SVG 렌더링으로 전환.

#### 근거

1. **완전한 제어**: 캐싱 로직을 직접 관리
2. **성능**: 563개 지역 렌더링 성공
3. **커서 기준 줌**: d3-zoom의 네이티브 기능 활용
4. **유지보수성**: 검증된 D3 라이브러리 사용

#### 트레이드오프

**장점:**

- ✅ 캐싱 버그 완전 해결
- ✅ 성능 향상 (563개 지역 렌더링)
- ✅ 커서 위치 기준 줌
- ✅ 부드러운 애니메이션 (d3-transition)
- ✅ 완전한 제어 가능

**단점:**

- ⚠️ Level 2/Level 3 게임 모드에서 `Marker`/`Line` 재구현 필요
- ⚠️ 초기 학습 곡선 (D3 API)

#### 영향받는 파일

- `src/components/game/Map.tsx`: 완전 재작성
- `src/game/stages/Stage2_Route/index.tsx`: Marker/Line 재구현 필요
- `src/game/stages/Stage3_Distance/index.tsx`: Marker/Line 재구현 필요

### 8.2 AD-002: 지도 렌더링 최적화 - 계층형 아키텍처 (Layered Architecture)

**날짜**: 2026-02-15  
**대상**: `Map.tsx` 리팩토링 및 성능 최적화

#### 문제 (Context)

React의 Virtual DOM은 강력하지만, SVG 내의 수백/수천 개 `path` 요소가 빈번하게 업데이트되면 브라우저의 Layout/Paint 비용이 급증합니다.
특히 `mousemove` 이벤트에 따라 `hoveredRegion` 상태가 변경될 때마다 전체 지도를 리렌더링하면, 마우스 커서를 따라갈 때 프레임 드랍(렉)이 발생할 수 있습니다.

#### 해결 방안 (Solution)

지도를 **변경 빈도(Frequency of Change)**에 따라 3개의 논리적 레이어로 분리하고, `React.memo`를 통해 불필요한 리렌더링을 차단합니다.

1.  **Base Layer (정적 배경)**
    - **역할**: 전체 행정구역(Context Layer + Active Game Layer)을 그립니다.
    - **특징**: 가장 무거운 계층입니다.
    - **갱신 조건**: 오직 **정답을 맞췄을 때(`answeredRegions` 변경)**만 리렌더링됩니다.
    - **최적화**: `hoveredRegion` prop을 전달받지 않음으로써, 마우스 이동 시 리렌더링을 원천 차단합니다.

2.  **Highlight Layer (동적 오버레이)**
    - **역할**: 현재 호버된 지역(하나의 `path`) 또는 오답 피드백(빨간색 채우기)을 그립니다.
    - **특징**: 매우 가볍습니다(Path 1~2개).
    - **갱신 조건**: `hoveredRegion` 또는 `lastFeedback` 변경 시 리렌더링됩니다.
    - **최적화**: 배경을 투명하게 처리하고, Base Layer 위에 덧그립니다(Z-Index).

3.  **Interaction Layer (이벤트 핸들러)**
    - **역할**: 시각적 요소 없이 투명한 영역으로 마우스 이벤트를 감지합니다.
    - **특징**: 렌더링 비용이 거의 없습니다.
    - **최적화**: 이벤트 위임(Event Delegation)을 활용하거나, 단순히 좌표 계산만 수행합니다.

#### 기대 효과

- **60FPS 보장**: 마우스 이동 시 연산량이 `O(N)`에서 `O(1)`로 감소합니다.
- **코드 가독성**: 렌더링 로직(Base)과 인터랙션 로직(Highlight/Event)이 분리되어 유지보수가 용이합니다.

### 8.3 AD-003: 고성능 도로망 렌더링 (High-Performance Road Network)

**날짜**: 2026-02-15  
**대상**: `RoadLayer.tsx`, `useMapZoom.ts`

#### 문제 (Context)

- 7만 개 이상의 도로 세그먼트를 SVG로 렌더링 시 심각한 DOM 부하 발생.
- React Rendering Cycle(비동기)과 D3 Zoom Event(동기) 간의 **타이밍 불일치**로 인해, 줌/팬 동작 시 도로 레이어가 지도에서 분리되어 "둥둥 떠다니는(Floating/Wobble)" 현상 발생.

#### 해결 방안 (Solution)

**Multi-Canvas Dual-Sync Architecture**를 도입하여 성능과 동기화를 모두 해결했습니다.

1.  **5-Layer Canvas Architecture**
    - 도로 위계(Motorway, Trunk, Primary, Secondary, Others)별로 **5개의 독립된 Canvas** 사용.
    - **이유**: 레이어별 `z-index` 및 `opacity` 독립 제어 가능. 복잡한 도로망의 깊이감 구현.

2.  **Dual Synchronization Strategy (핵심)**
    - **Sync via Event (Imperative)**: `d3-zoom` 이벤트 발생 시, React 상태 업데이트를 기다리지 않고 **즉시(Synchronously)** 캔버스 `draw()` 메서드를 호출.
    - **Sync via Render (LayoutEffect)**: React 컴포넌트 마운트/업데이트 시 `useLayoutEffect`를 사용하여 **Browser Paint 이전에** 렌더링 완료.
    - **결과**: SVG(지도)와 Canvas(도로)가 단 1프레임의 오차도 없이 완벽하게 동기화됨.

3.  **Spatial Indexing & Culling**
    - `d3-quadtree`를 사용하여 화면에 보이는 도로만 실시간으로 필터링 (`O(logN)`).
    - **Viewport Culling**: 현재 줌 레벨과 뷰포트 영역을 계산하여 렌더링 부하 최소화.

#### 트레이드오프

- **복잡도 증가**: React의 선언적 패턴을 일부 우회(Imperative Handle)해야 함.
- **메모리 사용**: Canvas 인스턴스가 늘어남에 따라 메모리 사용량 소폭 증가 (허용 범위 내).

### 8.4 AD-004: 기본 지도 레이어 Canvas 전환 (`BaseMapLayerCanvas`)

**날짜**: 2026-02-25  
**버전**: v4.0.0

#### 문제

SVG `<path>` 기반의 `BaseMapLayer`는 정답 처리 시 `answeredRegions` 상태가 변경될 때마다 수백 개의 SVG 요소를 전체 리렌더링해야 함. 또한 D3 zoom의 CSS transform과 React 렌더링 사이클 불일치로 지형 레이어가 순간적으로 위치 이탈하는 현상 발생.

#### 결정

`BaseMapLayer.tsx` (SVG) → `BaseMapLayerCanvas.tsx` (Canvas)로 교체.  
`RoadLayer`와 동일한 **Imperative Canvas + Dual-Sync Architecture** 적용.

#### 구현 상세

- **`CANVAS_SCALE = 2.0`**: 화면 크기의 2배(각 방향 50% 여백) Canvas 사전 렌더링으로 빠른 팬/줌 버퍼 확보
- **`draw(t)`**: 줌 종료 시 전체 재드로우 (좌표계 변환 포함)
- **`setCssTransform(current, start)`**: 줌 도중 CSS transform으로 부드럽게 이동 (재드로우 없음)
- **`initialTransform` prop 지침 (강제 네이밍 규약)**: `BaseMapLayerCanvas`, `RoadLayer` 등 모든 캔버스 기반 지형 요소 컴포넌트에서 초기 뷰 제어용 prop 이름은 무조건 **`initialTransform`**으로 정립합니다. 컴포넌트 개발자에게 이 값이 "가변 반응형 상태가 아닌 첫 마운트/리사이즈의 1회성 초기 렌더링(LayoutEffect) 전용 값"임을 시각적으로 강제하기 위함입니다. 이를 `transform`으로 네이밍하면 무의식적인 `useEffect` 의존성 추가로 인해 60fps 줌-팬 이벤트 트래픽이 그대로 리렌더링 부하로 직결될 위험이 있습니다. (이후 화면 변화는 React State를 거치지 않고 전적으로 `draw()`, `setCssTransform()` 명령형 훅을 사용해 동기화합니다.)

#### 트레이드오프

- ✅ 줌 중 지형 부드러움 (CSS transform)
- ✅ 정답 처리 시 Canvas 부분 갱신으로 SVG 리렌더링 비용 제거
- ⚠️ Canvas API 직접 사용으로 복잡도 증가

### 8.5 AD-005: 맵 렌더링 모듈화 아키텍처 정립

**날짜**: 2026-02-25  
**버전**: v4.0.0

#### 배경

`RoadLayer`, `BaseMapLayerCanvas` 등 Canvas 레이어가 증가하면서 `useMapZoom`이 각 레이어를 직접 named prop으로 참조하는 구조가 되어, 레이어 추가 시마다 훅 내부를 수정해야 하는 문제 발생.

#### 결정 및 구현

**1. `CanvasLayerHandle` 공유 인터페이스 (`src/types/canvas.ts`)**

- `draw` / `setCssTransform` 두 메서드를 정의한 공통 계약
- `RoadLayerHandle`, `BaseMapLayerHandle` 모두 이를 extend

**2. `useMapZoom` 레이어 의존성 일반화**

```typescript
// 변경 전: named prop으로 레이어마다 추가 필요
roadLayerRef?: RefObject<any>;
baseMapLayerRef?: RefObject<any>;

// 변경 후: 배열로 일반화, 훅 내부 변경 없이 무한 확장
canvasLayerRefs?: RefObject<CanvasLayerHandle>[];
// 내부: canvasLayerRefs.forEach(ref => ref.current?.draw(t))
```

**3. 테마 색상 중앙화 (`src/styles/themes.ts`)**

- `MAP_THEME_COLORS`: Map.tsx의 로컬 상수 제거, 단일 소스로 이동
- `ROAD_THEME_COLORS`: RoadLayer.tsx의 로컬 상수 제거, 단일 소스로 이동
- 향후 테마 추가 시 이 파일만 수정

**4. 줌 중 라벨 실시간 추적 개선**

- `useMapZoom`의 `zoom` 이벤트 핸들러에서 `setTransform` 호출 추가
- Canvas 레이어: imperative이므로 state 변경에도 재드로우 없음
- SVG 라벨: `font-size=14/k`가 최신 k로 계산되어 스냅 없이 고정 크기 유지

---

## 9. 향후 확장 계획 (Roadmap)

### 단기 (1-2주)

- **Level 2/3 Marker/Line 재구현**: D3 기반 컴포넌트 생성
- **디버그 로그 정리**: 프로덕션 빌드 최적화
- **TRD 업데이트**: 현재 문서 (완료)

### 중기 (1-2개월)

- **Level 4 (Time)**: 거리와 평균 속도를 기반으로 소요 시간 계산
- **Level 5 (Profit)**: 운임과 비용을 계산하여 오더 수락 여부 판단

### 장기 (3개월+)

- **Dashboard**: 레벨/경험치, 통계 그래프
- **성능 최적화**: 대용량 GeoJSON 처리
- **모바일 최적화**: 터치 이벤트 지원

---

## 10. 개발 가이드 (Architecture Guidelines)

> **[시니어 개발자 (Al)의 코멘트: Stage 1 리팩토링 및 린트 확보 직후]**
> "이 정도면 라이브 서버에 올릴 만한 MVP(Minimum Viable Product)는 훌륭하게 뽑혔습니다. 여러분이 만들어 낸 Map 아키텍처는 이제 견고한 캔틸레버 구조와 같습니다. 코어를 건드리지 않고도 오버레이 계층에 얼마든지 무거운 UI를 얹어도 지도 줌아웃의 60fps가 무너지지 않습니다. 푹 쉬시고, 다음 스테이지 기획이 완료되면 다시 뵙겠습니다!"

### 10.1 코어 컴포넌트 수정 금지 (Strict OCP 원칙)

**"이미 완성된 토대는 절대 더럽히지 마라."**

`Map.tsx`가 거대한 괴물(God Object)이 되는 것을 막기 위해 지리데이터(`useMapGeometry`), 오토줌 제어(`useMapAutoZoom`), 렌더러 분리(`BaseMapLayerCanvas`) 등 모든 기능이 철저한 **단일 책임 원칙(SRP)**에 맞춰 분리되어 있습니다.
앞으로 어떤 새로운 스테이지나 게임 모드(경로 잇기, 거리 측정 등)가 추가되더라도, **기존의 `Map.tsx`나 코어 훅 파일 내부를 직접 수정하여 `if/else` 분기를 추가해서는 안 됩니다.**

새로운 기능은 소프트웨어 설계의 **확장 폐쇄 원칙(Open-Closed Principle, OCP)**을 철저히 따라, 기존 코드를 건드리지(수정 닫힘) 않고 완전히 독립된 마이크로 컴포넌트(Plugin) 형태로 얹어서(확장 열림) 지도의 렌더링 파이프라인에 주입되어야 합니다.

### 10.2 새로운 레벨 추가하기

1. **디렉토리 생성**

   ```
   src/game/stages/StageN_Name/
   ├── index.tsx       # StageStrategy 구현
   ├── generator.ts    # 문제 생성 로직
   ├── validator.ts    # 정답 검증 로직
   └── README.md       # 레벨 설명
   ```

2. **registry.ts에 등록**

   ```tsx
   import { StageNStrategy } from "./StageN_Name";

   export const GameStages: Record<number, StageStrategy> = {
     // ...
     N: StageNStrategy,
   };
   ```

### 10.3 D3 기반 오버레이 추가하기 (의존성 주입 패턴)

```tsx
// renderMapOverlay 구현 예시
renderMapOverlay: (question, mapData, state) => {
  const projection = geoMercator()
    .center([127.25, 37.55])
    .scale(8000)
    .translate([400, 300]);

  const [x, y] = projection([lon, lat]) || [0, 0];

  return (
    <g>
      <circle cx={x} cy={y} r={4} fill="red" />
      <text x={x} y={y - 10}>
        마커
      </text>
    </g>
  );
};
```

**주의사항:**

- `projection`은 Map.tsx와 동일하게 설정
- `transform.k` (줌 레벨)를 고려하여 크기 조정
- SVG 좌표계 사용 (GeoJSON 좌표를 projection으로 변환)

---

## 부록: 기술 스택 상세

### D3 모듈

- **d3-geo** (v3.1.0): GeoJSON 투영 및 path 생성
- **d3-zoom** (v3.0.0): 줌/팬 인터랙션
- **d3-selection** (v3.0.0): DOM 조작
- **d3-transition** (v3.0.1): 애니메이션

### React 생태계

- **React** (v18.3.1)
- **React DOM** (v18.3.1)
- **TypeScript** (v5.6.2)
- **Vite** (v6.0.1)

### 스타일링

- **Tailwind CSS** (v3.4.17)
- **PostCSS** (v8.4.49)
