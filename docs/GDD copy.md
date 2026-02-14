# [GDD] 일달 트레이너 (1DAL Trainer) : 게임 상세 기획서

**문서 코드**: GDD-001  
**작성일**: 2026-02-14  
**버전**: 1.1.0 (UI/UX Flow Focus)  
**상태**: Draft  

---

## 1. 게임 개요 (Game Overview)

### 1.1 핵심 게임 루프 (Core Game Loop)

사용자는 화물 배차 전문가가 되기 위해 **위치(Location) -> 경로(Route) -> 거리(Distance) -> 시간(Time) -> 단가(Pricing)** 의 5단계 능력을 훈련합니다. 각 레벨은 독립적인 미니게임 형식을 띠며, 상위 레벨 잠금 해제 방식으로 연결됩니다.

---

## 2. 공통 시스템 (Common Systems)

### 2.1 점수 산정 방식 (Scoring Formula)

$$ \text{Total Score} = (\text{Base Score} \times \text{Accuracy Multiplier}) + \text{Time Bonus} + \text{Combo Bonus} $$

*   **Base Score**: 문제당 기본 점수 (예: 1000점)
*   **Time Bonus**: `(남은 시간 / 제한 시간) * 500점`
*   **Combo Bonus**: `(Current Combo - 1) * 100점` (최대 1000점)

### 2.2 체력 및 종료 조건 (Life & Game Over)

*   **라이프 시스템**: 기본 **3개**의 하트 제공. 오답 시 1개 차감.
*   **게임 오버**: 하트가 0이 되거나, 모든 문제를 완료했을 때.

---

## 3. 화면 구성 및 흐름 (UI/UX Flow & Layout)

### 3.1 게임 진행 흐름도 (Game Flowchart)

```mermaid
graph TD
    A[로비/설정] -->|게임 시작| B[게임 초기화 (Reset State)]
    B --> C{준비 완료?}
    C -->|Yes| D[문제 출제 (State: Active)]
    D --> E[사용자 입력 대기 (Timer Running)]
    E -->|입력 발생| F{정답 여부 확인}
    F -->|정답| G[성공 피드백 (Score++, Combo++)]
    F -->|오답| H[실패 피드백 (Life--, Combo Reset)]
    G --> I{종료 조건 Check}
    H --> I
    I -->|No| D
    I -->|Yes| J[게임 종료 및 결과 화면]
    J -->|재시작| B
    J -->|나가기| A
```

### 3.2 화면 레이아웃 (Screen Layout)

```
+-------------------------------------------------------+
|  [Header]  (1) Back   (2) Title   (3) Settings        |
+-------------------------------------------------------+
|                                                       |
|   (4) MAP AREA (Fullscreen Interactive Map)           |
|       - Default View: Auto-Fit to Region              |
|       - Interaction: Zoom/Pan, Click, Hover           |
|                                                       |
|   +-------------------+                               |
|   | (5) HUD - Top     |                               |
|   | Score: 12,500     |                               |
|   | Life: 3       |                               |
|   +-------------------+                               |
|                                                       |
|                       (7) Feedback Overlay            |
|                       (Correct/Wrong Effect)          |
|                                                       |
|   +-----------------------+   +-------------------+   |
|   | (6) HUD - Bottom      |   | (8) Dev Info      |   |
|   | [ Q. 안산시 단원구 ]     |   | Zoom: 1.5         |   |
|   +-----------------------+   | Rendered: 52      |   |
|                               +-------------------+   |
|                                                       |
+-------------------------------------------------------+
```

### 3.3 요소별 기능 명세 (Component Specs)

#### (1)~(3) Header Area
*   **Title**: 현재 레벨 이름 (예: "Level 1: 지역 위치")
*   **Settings**: 배경음, 효과음 On/Off

#### (4) Map Area
*   **초기 상태**: 선택된 지역(시군구)이 화면에 꽉 차게 자동 줌(Auto-Fit). 축척표시도 같이 표시
*   **LOD (Level of Detail)**:
    *   **Single Selection**: 단일 시군구 선택 시 즉시 읍면동(Level 3) 표시.
    *   **Multi Selection**: 줌 레벨에 따라 시군구(Level 2) <-> 읍면동(Level 3) 전환.

#### (5) HUD - bottom left (Status)
*   **Score**: 실시간 점수 업데이트 (숫자 카운팅 애니메이션).
*   **Life**: 숫자로표시.

#### (6) HUD - top center (Action Center)
*   **Question Panel**: 현재 찾아야 할 목표 제시. 가독성 최우선.
*   **Back**: 로비로 이동. (게임 중 클릭 시 "그만두시겠습니까?" 팝업)

---

## 4. 레벨별 상세 규칙 (Level Specifics)

### 4.1 Level 1: 지역 위치 (Location Mastery)

**목표**: "안산시 단원구" 텍스트를 보고 3초 안에 지도에서 해당 위치를 클릭.

1.  **시작 (Init)**:
    *   화면 중앙에 문제 텍스트 크게 표시 (Ready... Go!)
    *   타이머 시작.
2.  **입력 (Input)**:
    *   지도상의 폴리곤 클릭.
    *   **Hover 효과**: 마우스 오버 시 해당 지역 색상 변경 (피드백 강화).
3.  **피드백 (Feedback)**:
    *   **정답**: 해당 지역 초록색 점멸 + 점수 획득.
    *   **오답**: 클릭한 지역 빨간색 진동 + 실제 정답 지역 노란색 힌트 표시.

### 4.2 Level 2: 경로 시각화 (Route Visualization)

**목표**: 상차지(A)와 하차지(B)를 순서대로 연결.

1.  **시작**: "상차: 인천 -> 하차: 강남" 텍스트 표시.
2.  **Phase 1 (Start)**: "상차지를 선택하세요" 힌트. 인천 클릭 시 **Start Marker** 생성.
3.  **Phase 2 (End)**: "하차지를 선택하세요" 힌트. 강남 클릭 시 **End Marker** 생성 및 경로 연결선(Arc) 애니메이션.

### 4.3 Level 3: 거리 추정 (Distance Estimation)

**목표**: 지도상의 시각적 거리를 보고 실제 주행 거리 유추.

1.  **시작**: 지도에 두 지점(A, B)과 연결선 표시.
2.  **입력**: 하단에 **슬라이더 컨트롤** 등장. (0km ~ 150km 범위)
3.  **제출**: "확인" 버튼 클릭 시 정답 공개.
4.  **판정**: 오차율에 따라 점수 차등 지급.

---

## 5. 데이터 테이블 (Data Tables)

### 5.1 난이도 보정표 (Difficulty Modifiers)
| 레벨 | 제한 시간 | HP 차감 | 획득 경험치 |
|---|---|---|---|
| 1 | 20초 | 1 | 100 |
| 2 | 15초 | 1 | 150 |
| 3 | 10초 | 2 | 200 |

### 5.2 칭호 시스템 (Titles)
*   일달 초보: 누적 점수 0 ~ 5,000
*   동네 기사: 누적 점수 5,000 ~ 20,000
*   수도권 마스터: 누적 점수 20,000 ~ 100,000
*   로드 킹: 상위 1% 랭커

---