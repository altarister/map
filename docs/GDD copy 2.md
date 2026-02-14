# [GDD] 일달 트레이너 (1DAL Trainer) : 게임 상세 기획서

**문서 코드**: GDD-001  
**작성일**: 2026-02-14  
**버전**: 1.4.0 (Screen Flow & Entry Sequence)  
**상태**: Draft  

---

## 1. 게임 개요 (Game Overview)

### 1.1 기획 의도
지리를 전혀 모르는 초보자도 게임을 즐기다 보면 자연스럽게 **베테랑 용달 기사**의 지리 감각을 익힐 수 있도록 설계합니다. 초반에는 스트레스를 주는 요소(타이머, 과도한 이펙트)를 배제하고, 성취감을 느끼게 하는 데 집중합니다.

### 1.2 핵심 루프 (Beginner -> Veteran Loop)
1.  **탐색 (Explore)**: 지도에서 편하게 위치를 찾음 (시간 제한 없음).
2.  **학습 (Learn)**: 틀리면 정답 위치를 명확히 알려줌.
3.  **숙달 (Master)**: 익숙해지면 점수 경쟁 및 시간 제한 도입.

---

## 2. 화면 구성 및 흐름 (Screen Flow & Layout)

### 2.1 화면 흐름도 (Screen Flow)

```mermaid
graph TD
    A[<b>Initial State</b><br/>지도만 덩그러니 보임<br/>지도 조작 가능] -->|Header [START] 클릭| B[<b>Level Select Layer</b><br/>레벨 목록 오버레이 표시]
    B -->|Level 1 선택| C[<b>Game Entry</b><br/>오버레이 닫힘<br/>Action Bar 내려옴]
    C --> D[<b>Game Active</b><br/>문제 풀이 진행]
    D -->|BACK 버튼| E[<b>Pause/Exit</b><br/>그만두시겠습니까?]
    E -->|Yes| A
    E -->|No| D
```

### 2.2 레이아웃 (Layout)

```
+-------------------------------------------------------+
|  (1) Header Area                                      |
|  [ SETTINGS ]         [ START ]              [ BACK ] |
+-------------------------------------------------------+
|                                                       |
|   (2) MAP AREA (Main Interactive Zone)                |
|       - Fullscreen                                    |
|       - Idle: 전체 지도 탐색 가능                     |
|                                                       |
|   +-----------------------------------------------+   |
|   | (3) Action Bar (Hidden -> Slide Down)         |   |
|   |  ▼ Q. 다음 지역을 찾으세요: [ 안산시 단원구 ]     |   |
|   +-----------------------------------------------+   |
|                                                       |
|   +-------------------+                               |
|   | (4) Status HUD    |                               |
|   | SCORE: 1200       |                               |
|   +-------------------+                               |
|                                                       |
+-------------------------------------------------------+
```

### 2.3 요소별 명세 (Component Specs)

#### (1) Header Area
*   **SETTINGS**: 배경음/효과음 제어.
*   **START**: 게임 시작 버튼. 클릭 시 **레벨 선택 레이어** 표시.
    *   *게임 중에는 숨김 처리.*
*   **BACK**: 로비(Initial State)로 돌아가기.

#### (2) Map Area
*   **Initial State**: 아무런 UI 없이 지도만 자유롭게 확대/축소/이동 가능 (탐색 모드).
*   **Game Active**: 문제가 출제되면 해당 권역으로 Auto-Fit.

#### (3) Action Bar (Top Center)
*   **동작 (Accordion)**:
    *   **게임 진입 시**: 화면 밖(위쪽)에서 아래로 `Slide Down` 하며 등장.
    *   **내용**: "Q. 다음 지역의 위치는?" + **[ 지역명 ]**
    *   **피드백**: 정답(초록), 오답(빨강) 배경색 변경.

#### (4) Status HUD (Bottom Left)
*   **SCORE**: 현재 점수.
*   **LIFE**: 남은 기회 (Phase 2부터 표시).

#### (5) Level Select Layer (Modal/Overlay)
*   **호출**: Header의 `[ START ]` 버튼 클릭 시.
*   **구성**:
    *   **Level 1: 지역 위치** (활성화) - "지리의 기초를 다지세요."
    *   **Level 2: 경로 시각화** (준비중)
    *   **Level 3: 거리 추정** (준비중)
*   **동작**: 레벨 선택 시 레이어 닫히며 Game Entry 시퀀스 진입.

---

## 3. 진행 방식 및 난이도 조절 (Progression)

초보자가 포기하지 않도록 **단계적 학습(Step-by-Step)**을 적용합니다.

### 3.1 Level 1: 지역 위치 (Location)

**목표**: "안산시 단원구" 찾기

#### Phase 1: 적응 (Tutorial / Easy)
*   **대상**: 게임을 처음 시작하는 사용자.
*   **규칙**:
    *   **시간 제한 없음**: 느긋하게 지도를 둘러볼 수 있음.
    *   **권역 힌트**: 정답이 있는 광역 시/도(예: 경기 남부)를 하이라이트.
    *   **실패 없음**: 틀려도 감점 없이 "다시 찾아보세요" 메시지.

#### Phase 2: 훈련 (Normal)
*   **대상**: Phase 1을 5문제 이상 연속 정답 시 진입.
*   **규칙**:
    *   **타임 보너스**: 빨리 맞추면 추가 점수.
    *   **힌트 제거**: 전체 지도에서 스스로 찾아야 함.
    *   **라이프 적용**: 오답 시 라이프 숫자 차감.

---

## 4. MVP 개발 범위 (Scope)

일단 다음 기능만 포함하여 빠르게 출시하고 피드백을 받습니다.

1.  **Map Interaction**: D3 기반 지역 클릭, 하이라이트, Free Navigation.
2.  **Screen Flow**: Init -> Level Select -> Game Active.
3.  **Basic UI (Text Only)**:
    *   Header (Start Button), Action Bar (Slide Animation), Level Modal.
4.  **Level Strategy**:
    *   Level 1 (위치 찾기) 우선 구현.

---