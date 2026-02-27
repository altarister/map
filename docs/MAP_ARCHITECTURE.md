# Map Component Architecture & Development Guidelines

_(작성자: 시니어 개발자 알(Al) / 최종 리뷰: Stage 1 리팩토링 직후)_

본 문서는 프로젝트의 핵심 코어 컴포넌트인 `Map.tsx`와 관련된 지도를 렌더링하고 유저의 입력을 처리하는 기술 구조의 가이드라인입니다. **앞으로 이 프로젝트를 다루게 될 후임 개발자 및 모든 AI 어시스턴트는 새로운 스테이지(Stage 2, Stage 3 등)를 개발할 때 반드시 이 원칙을 준수해야 합니다.**

---

## 🛑 코어 컴포넌트 수정 금지 (Strict OCP 원칙)

**"이미 완성된 토대는 절대 더럽히지 마라."**

스테이지 1 개발 과정에서 우리는 `Map.tsx`가 거대한 괴물(God Object)이 되는 것을 막기 위해 뼈를 깎는 리팩토링을 단행했습니다. 지리데이터(`useMapGeometry`), 오토줌 제어(`useMapAutoZoom`), 렌더러 분리(`BaseMapLayerCanvas`), 상태 캐싱(`GeoDataContext`) 등 모든 기능이 SRP(단일 책임 원칙)에 맞춰 아름답게 쪼개져 있습니다.

> **[경고]**
> 앞으로 어떤 새로운 스테이지나 게임 모드(경로 잇기, 거리 측정 등)가 추가되더라도, **기존의 `Map.tsx`나 코어 훅 파일 내부를 수정하여 새로운 로직이나 `if/else` 분기를 추가해서는 안 됩니다.**

## 🧩 새로운 스테이지 개발 가이드 (마이크로 플러그인 패턴)

새로운 기능을 추가해야 한다면 소프트웨어 설계의 **확장 페쇄 원칙(Open-Closed Principle, OCP)**을 철저히 따라야 합니다. 즉, 기존 코드를 건드리지(수정 닫힘) 않고 새로운 코드를 얹어서(확장 열림) 해결해야 합니다.

### 1. `renderMapOverlay` 적극 활용하기 (의존성 주입)

각 스테이지의 전략 객체(`StageStrategy`)에는 `renderMapOverlay` 속성이 준비되어 있습니다.
지도 위에 마커(Marker)를 올리거나, 경로 선(Line)을 긋거나 지시선을 그리고 싶다면 오직 이 렌더 함수 내부에서 React Component(Plugin)를 반환하는 방식으로만 구현하세요.

```tsx
// 좋은 예시: 기존 지도 시스템과 무관하게, 마커와 라인을 오버레이로 얹어서 해결
export const Stage2Strategy: StageStrategy = {
  // ...
  renderMapOverlay: (question, mapData, state) => {
    // 필요한 데이터만 추출하고 컴포넌트를 반환합니다.
    return (
      <>
        <Marker coordinates={startCentroid}>
          <circle r={4} fill="#2563eb" />
        </Marker>
        <Line from={startCentroid} to={currentCursor} strokeDasharray="4 4" />
      </>
    );
  },
};
```

### 2. 컴포넌트 간 데이터 흐름 (Context 오염 금지)

새로운 상태 데이터(예: 드래그 중인 임시 좌표, 유저가 마우스로 선택한 2번째 지점 등)가 필요하다고 해서 통짜 `GameContext`에 변수를 마구잡이로 추가하지 마세요.
스테이지 고유의 상태는 각 컴포넌트 내부의 로컬 State(`useReducer`, `useState`)나, 전략 객체로 전달되는 `levelState` 등 캡슐화된 파라미터를 통해 관리해야 합니다.

---

## 💡 시니어의 코멘트

> "이 정도면 라이브 서버에 올릴 만한 MVP(Minimum Viable Product)는 훌륭하게 뽑혔습니다. 여러분이 만들어 낸 Map 아키텍처는 이제 견고한 캔틸레버 구조와 같습니다. 코어를 건드리지 않고도 오버레이 계층에 얼마든지 무거운 UI를 얹어도 지도 줌아웃의 60fps가 무너지지 않습니다. 푹 쉬시고, 다음 스테이지 기획이 완료되면 다시 뵙겠습니다!"
