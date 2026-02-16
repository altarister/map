# 기술 참조 문서 (Technical Reference Document)

**버전**: 3.0.0  
**최종 업데이트**: 2026-02-14  
**주요 변경사항**: D3 기반 직접 SVG 렌더링으로 마이그레이션

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
├── game/
│   ├── core/           # 핵심 타입 및 인터페이스
│   ├── levels/         # 각 레벨별 로직 (Generator, Validator, Strategy)
│   │   ├── Level1_Location/
│   │   ├── Level2_Route/
│   │   ├── Level3_Distance/
│   │   └── registry.ts # 레벨 등록 및 관리
│   └── ui/             # 게임 관련 공통 UI
├── components/
│   ├── game/           # Map, QuizPanel, ScoreBoard 등
│   ├── layout/         # GameLayout, TopBar
│   └── ui/             # Button, Modal 등 재사용 컴포넌트
├── contexts/           # 전역 상태 관리
│   ├── GameContext.tsx
│   └── SettingsContext.tsx
├── hooks/              # 비즈니스 로직
│   ├── useGameLogic.ts
│   ├── useGeoData.ts
│   ├── useMapScale.ts
│   └── useMapStyles.ts
├── services/           # 비즈니스 로직 서비스
│   └── MasteryStorage.ts # 숙련도 및 설정 영구 저장
└── types/              # 공통 타입 정의
    ├── game.ts
    └── geo.ts
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
- **명확한 시퀀스:** 게임의 상태 변화(초기화 → 진행 → 종료)를 명확한 시퀀스로 정의하여 예측 가능성을 높입니다.

### 4.2 모듈 간 결합도 최소화 (Loose Coupling)

- **책임 분리:** 각 모듈(View, Logic, Strategy)은 자신의 역할에만 집중하며, 서로의 내부 구현에 의존하지 않습니다.
- **인터페이스 통신:** 정해진 인터페이스(`LevelStrategy`, `UserInput`)를 통해서만 데이터를 주고받습니다.

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

**v3.0 - D3 기반 직접 SVG 렌더링**

#### 핵심 구현

```tsx
// D3 Projection 설정
const pathGenerator = useMemo(() => {
  const projection = geoMercator()
    .center([127.25, 37.55])  // 경기도 중심
    .scale(8000)
    .translate([400, 300]);   // 800x600 viewBox 중심

  return geoPath().projection(projection);
}, []);

// d3-zoom 설정
useEffect(() => {
  const zoomBehavior = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 8])
    .on('zoom', (event) => {
      const { x, y, k } = event.transform;
      setTransform({ x, y, k });
    });

  select(svgRef.current).call(zoomBehavior);
}, [currentData]);

// SVG 렌더링
<svg ref={svgRef} viewBox="0 0 800 600">
  <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
    {features.map(feature => (
      <path
        d={pathGenerator(feature)}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={1 / transform.k}  // 줌 레벨에 따라 조정
      />
    ))}
  </g>
</svg>
```

#### 주요 기능

- **커서 위치 기준 줌**: d3-zoom이 자동으로 마우스 커서 위치를 기준으로 줌 처리
- **드래그 팬**: 부드러운 지도 이동
- **프로그래밍 방식 줌**: 버튼 클릭 시 transition 애니메이션
- **LOD (Level of Detail)**: 줌 레벨에 따라 자동으로 Level 2 ↔ Level 3 전환
- **MapScale**: 현재 축척 표시 (예: "10 km")

### 6.2 LOD (Level of Detail) System

**자동 레벨 전환**

```tsx
const LOD_THRESHOLD = 1.5;
const shouldShowLevel3 = transform.k >= LOD_THRESHOLD;
const currentData = shouldShowLevel3 ? mapData : level2Data;
```

- **Zoom < 1.5x**: Level 2 (42개 시/군, 파란색 단색)
- **Zoom ≥ 1.5x**: Level 3 (563개 읍/면/동, 컬러풀 해시 기반)

**색상 로직**

```tsx
if (shouldShowLevel3) {
  // Level 3: 해시 기반 컬러풀
  fillColor = `hsl(${(Number(code) * 13759) % 360}, 70%, 60%)`;
} else {
  // Level 2: 단색
  fillColor = '#e0e7ff';
}
```

### 6.3 Quiz Panel (`QuizPanel.tsx`)

- **동적 지시문:** `getLevelStrategy(currentLevel).renderInstruction(...)`을 통해 현재 문제 상황에 맞는 텍스트를 렌더링합니다.
- **레벨별 컨트롤**: Level 3의 경우 거리 입력 폼 표시.

### 6.4 Tactical Intel System (`IntelPopup.tsx`)

- **역할**: 사용자의 우클릭 인터랙션에 반응하여 해당 지역의 전술 정보(지명, 인접 지역, 도로)를 표시합니다.
- **특징**:
  - **Glassmorphism UI**: 군사 작전 지도 컨셉의 반투명 스타일링.
  - **Portal-free**: `Map` 컴포넌트 내부에서 절대 위치(`absolute`)로 렌더링되어 줌/팬 컨텍스트와 무관하게 화면 좌표(`clientX`, `clientY`)를 따릅니다.
  - **Dismissal**: 외부 클릭(`click-outside`) 또는 닫기 버튼으로 제어됩니다.

---

## 7. 데이터 처리

### 7.1 GeoJSON 로딩 (`useGeoData`)

```tsx
const { data: mapData, level2Data, loading, error } = useGeoData();
```

- **Level 2**: `/data/skorea_municipalities_geo_simple.json` (250개 → 경기도 42개 필터링)
- **Level 3**: `/data/skorea_submunicipalities_geo_simple.json` (3504개 → 경기도 563개 필터링)

### 7.2 필터링 로직

```tsx
const gyeonggiCodes = ['41', ...]; // 경기도 시/군 코드
const filteredLevel2 = level2.features.filter(f => 
  gyeonggiCodes.includes(f.properties.code)
);
```

### 7.3 데이터 스키마 (Data Schema)
 
 **원본 데이터 (Raw Data)**
 
 `public/data/`의 GeoJSON 파일(`skorea-municipalities-2018-geo.json`, `skorea-submunicipalities-2018-geo.json`)은 다음 공통 속성을 가집니다:
 
 ```typescript
 interface RawRegionProperties {
   code: string;       // 행정동 코드 (예: "11010" 종로구, "1101053" 사직동)
   name: string;       // 지역 이름 (예: "종로구", "사직동")
   name_eng: string;   // 영문 이름 (예: "Jongno-gu", "Sajik-dong")
   base_year: string;  // 기준 연도 (예: "2018")
 }
 ```
 
 **파생 데이터 (Enriched Data)**
 
 `useGeoData` 훅을 통해 로딩된 데이터는 다음 속성이 추가됩니다:
 
 ```typescript
 interface EnrichedRegionProperties extends RawRegionProperties {
   // Level 3 데이터에만 추가됨
   SIG_KOR_NM?: string; // 상위 시군구 이름 (예: "종로구")
   EMD_KOR_NM?: string; // 읍면동 이름 (name과 동일, 예: "사직동") - 필터링 및 표시 편의성
 }
 ```
 
 ### 7.4 데이터 영속성 (Data Persistence)
 
 `MasteryStorage` 서비스를 통해 브라우저 `localStorage`에 학습 데이터를 영구 저장합니다.
 
 | Key | Value Type | Description | Example |
 | :--- | :--- | :--- | :--- |
 | `map-mastery-v1` | `JSON Object` | 챕터(시/군)별 최고 숙련도 기록 | `{"41110": 100, "41130": 45}` |
 | `game-difficulty` | `string` | 난이도 설정 (NORMAL / HARD) | `"HARD"` |
 | `game-level` | `number` | 마지막으로 플레이한 레벨 | `1` |
 
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
import { geoCentroid } from 'd3-geo';

// ...
f.properties.centroid = geoCentroid(f); // [lon, lat]
```

---

## 8. 주요 아키텍처 결정 (Architecture Decisions)

### AD-001: react-simple-maps → D3 직접 렌더링 마이그레이션

**날짜**: 2026-02-14  
**버전**: v3.0.0

#### 문제
`@vnedyalk0v/react19-simple-maps`의 `<Geographies>` 컴포넌트에 WeakMap 기반 캐싱 버그 존재. Level 2 (42개) ↔ Level 3 (563개) 전환 시 563개 지역이 표시되지 않음.

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
- `src/game/levels/Level2_Route/index.tsx`: Marker/Line 재구현 필요
- `src/game/levels/Level3_Distance/index.tsx`: Marker/Line 재구현 필요

### 8.2 AD-002: 지도 렌더링 최적화 - 계층형 아키텍처 (Layered Architecture)

**날짜**: 2026-02-15  
**대상**: `Map.tsx` 리팩토링 및 성능 최적화

#### 문제 (Context)
React의 Virtual DOM은 강력하지만, SVG 내의 수백/수천 개 `path` 요소가 빈번하게 업데이트되면 브라우저의 Layout/Paint 비용이 급증합니다.
특히 `mousemove` 이벤트에 따라 `hoveredRegion` 상태가 변경될 때마다 전체 지도를 리렌더링하면, 마우스 커서를 따라갈 때 프레임 드랍(렉)이 발생할 수 있습니다.

#### 해결 방안 (Solution)
지도를 **변경 빈도(Frequency of Change)**에 따라 3개의 논리적 레이어로 분리하고, `React.memo`를 통해 불필요한 리렌더링을 차단합니다.

1.  **Base Layer (정적 배경)**
    -   **역할**: 전체 행정구역(Context Layer + Active Game Layer)을 그립니다.
    -   **특징**: 가장 무거운 계층입니다.
    -   **갱신 조건**: 오직 **정답을 맞췄을 때(`answeredRegions` 변경)**만 리렌더링됩니다.
    -   **최적화**: `hoveredRegion` prop을 전달받지 않음으로써, 마우스 이동 시 리렌더링을 원천 차단합니다.

2.  **Highlight Layer (동적 오버레이)**
    -   **역할**: 현재 호버된 지역(하나의 `path`) 또는 오답 피드백(빨간색 채우기)을 그립니다.
    -   **특징**: 매우 가볍습니다(Path 1~2개).
    -   **갱신 조건**: `hoveredRegion` 또는 `lastFeedback` 변경 시 리렌더링됩니다.
    -   **최적화**: 배경을 투명하게 처리하고, Base Layer 위에 덧그립니다(Z-Index).

3.  **Interaction Layer (이벤트 핸들러)**
    -   **역할**: 시각적 요소 없이 투명한 영역으로 마우스 이벤트를 감지합니다.
    -   **특징**: 렌더링 비용이 거의 없습니다.
    -   **최적화**: 이벤트 위임(Event Delegation)을 활용하거나, 단순히 좌표 계산만 수행합니다.

#### 기대 효과
-   **60FPS 보장**: 마우스 이동 시 연산량이 `O(N)`에서 `O(1)`로 감소합니다.
-   **코드 가독성**: 렌더링 로직(Base)과 인터랙션 로직(Highlight/Event)이 분리되어 유지보수가 용이합니다.

### 8.3 AD-003: 고성능 도로망 렌더링 (High-Performance Road Network)

**날짜**: 2026-02-15  
**대상**: `RoadLayer.tsx`, `useMapZoom.ts`

#### 문제 (Context)
- 7만 개 이상의 도로 세그먼트를 SVG로 렌더링 시 심각한 DOM 부하 발생.
- React Rendering Cycle(비동기)과 D3 Zoom Event(동기) 간의 **타이밍 불일치**로 인해, 줌/팬 동작 시 도로 레이어가 지도에서 분리되어 "둥둥 떠다니는(Floating/Wobble)" 현상 발생.

#### 해결 방안 (Solution)
**Multi-Canvas Dual-Sync Architecture**를 도입하여 성능과 동기화를 모두 해결했습니다.

1.  **5-Layer Canvas Architecture**
    -   도로 위계(Motorway, Trunk, Primary, Secondary, Others)별로 **5개의 독립된 Canvas** 사용.
    -   **이유**: 레이어별 `z-index` 및 `opacity` 독립 제어 가능. 복잡한 도로망의 깊이감 구현.

2.  **Dual Synchronization Strategy (핵심)**
    -   **Sync via Event (Imperative)**: `d3-zoom` 이벤트 발생 시, React 상태 업데이트를 기다리지 않고 **즉시(Synchronously)** 캔버스 `draw()` 메서드를 호출.
    -   **Sync via Render (LayoutEffect)**: React 컴포넌트 마운트/업데이트 시 `useLayoutEffect`를 사용하여 **Browser Paint 이전에** 렌더링 완료.
    -   **결과**: SVG(지도)와 Canvas(도로)가 단 1프레임의 오차도 없이 완벽하게 동기화됨.

3.  **Spatial Indexing & Culling**
    -   `d3-quadtree`를 사용하여 화면에 보이는 도로만 실시간으로 필터링 (`O(logN)`).
    -   **Viewport Culling**: 현재 줌 레벨과 뷰포트 영역을 계산하여 렌더링 부하 최소화.

#### 트레이드오프
-   **복잡도 증가**: React의 선언적 패턴을 일부 우회(Imperative Handle)해야 함.
-   **메모리 사용**: Canvas 인스턴스가 늘어남에 따라 메모리 사용량 소폭 증가 (허용 범위 내).

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

## 10. 개발 가이드

### 10.1 새로운 레벨 추가하기

1. **디렉토리 생성**
   ```
   src/game/levels/LevelN_Name/
   ├── index.tsx       # LevelStrategy 구현
   ├── generator.ts    # 문제 생성 로직
   ├── validator.ts    # 정답 검증 로직
   └── README.md       # 레벨 설명
   ```

2. **registry.ts에 등록**
   ```tsx
   import { LevelNStrategy } from './LevelN_Name';
   
   export const GameLevels: Record<number, LevelStrategy> = {
     // ...
     N: LevelNStrategy,
   };
   ```

### 10.2 D3 기반 오버레이 추가하기

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
      <text x={x} y={y - 10}>마커</text>
    </g>
  );
}
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
