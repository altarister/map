# 1DAL TRAINER UI Architecture & Inventory

이 문서는 사용자의 **3-System Mental Model**을 기반으로 UI 구조와 계층(Hierarchy)을 정의합니다.

## System Hierarchy (시스템 계층 구조)

전체 UI는 크게 **3가지 시스템**으로 구성되며, 각 시스템 내/외부의 **Z-Index 위계질서**를 따릅니다.

### 1. Map System (지도 시스템)
*   **Role**: 게임의 무대이자 기본 상호작용 영역. 가장 하단에 위치합니다.
*   **Ranking**: `Base Layer` < `Road/Grid` < `Interactive` < `Controls (Buttons/Panels)`
*   **Z-Index Range**: `z-0` ~ `z-25`

### 2. Game System (게임 시스템)
*   **Role**: 게임 진행(Flow), 미션(HUD), 결과(Result)를 담당합니다.
*   **Ranking**: `Map System` < `ActionBar` (HUD) < `GameLog` (Info) < `Modals` (Region/Result)
*   **Z-Index Range**: `z-30` ~ `z-50`

### 3. Layout System (레이아웃 시스템)
*   **Role**: 앱 전체의 골격(Navigation)과 전역 설정(Configuration)을 담당합니다.
*   **Ranking**: `Map/Game System` < `TopBar` < `Configuration Modal`
*   **Z-Index Range**: `z-50` (최상단)

---

## Detailed Component Inventory

| System | Component | Type | Z-Index | Context / Role | Visibility Rule |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **Layout** | **SettingsModal** | Modal | `z-50+` | 테마/레벨 설정 (TopBar 위) | 버튼 클릭 시 (Action) |
| **Layout** | **TopBar** | Fixed | `z-50` | 로고, 시스템 버튼 (상단 고정) | 항상 (Global) |
| **Game** | **ResultModal** | Modal | `z-50` | 게임 결과/통계 (전체 덮음) | `gameState === 'RESULT'` |
| **Game** | **RegionSelectScreen** | Modal | `z-50` | 지역 선택 (TopBar 제외 전체 덮음) | `gameState === 'LEVEL_SELECT'` |
| **Game** | **GameInfoPanel** | Modeless | `z-[35]` | 게임 로그/점수 (좌측 하단) | `hasStarted` (Map 위) |
| **Game** | **ActionBar** | Modeless | `z-30` | 미션 지령 HUD (중앙 상단) | `hasStarted` (Map 위) |
| **Map** | **MapScale** | Footer | `z-[25]` | 하단 통합 컨트롤 (Zoom/Hover/Layer) | **Always w/ Map** |
| **Map** | **Interactive** | Layer | `z-20` | 지역 클릭/호버 감지 | 항상 (Interactive) |
| **Map** | **Road/Grid** | Layer | `z-10` | 도로망 및 그리드 표시 | 항상 (Visual) |
| **Map** | **BaseTerrain** | Layer | `z-0` | 지형 배경 (Base) | 항상 (Background) |

---

## Visibility & Occlusion Rules (가시성 및 가림 규칙)

### Rule 1: Modeless follows System (모달리스는 시스템 위계를 따름)
*   **Map System Controls (`z-25`)**: 지도와 한 몸처럼 움직이며, `Game System`의 요소들(`z-30`, `z-35`)보다 아래에 위치합니다.
*   **Game HUD (`z-30`)**: 지도 위에 떠서 정보를 보여주지만, 더 중요한 `GameLog`(`z-35`)보다는 아래에 깔릴 수 있습니다.

### Rule 2: Modals are Unconditionally Top (모달은 무조건 최상단)
*   **System Modals (`z-50`)**: `RegionSelect`, `ResultModal`, `Configuration` 등 **Modal** 성격을 가진 컴포넌트는 모든 Modeless 요소(`Map`, `HUD`, `Log`)를 덮어버립니다.
*   이 규칙 덕분에 복잡한 조건부 렌더링 없이 자연스러운 **Occlusion(가림)** 효과를 얻습니다.

### Rule 3: Map System Integrity
*   `Map Layer`, `Layer Manager`, `Scale Info`는 **하나의 세트**입니다.
*   지도가 보이면 컨트롤도 보이고, 지도가 가려지면 컨트롤도 가려집니다 (by Higher Z-Index).
