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
*   **Ranking**: `Map/Game System` < `TopBar` / `BottomBar` < `Configuration Modal`
*   **Z-Index Range**: `z-25` (BottomBar), `z-50` (TopBar, Modals)

---

## Detailed Component Inventory

| System | Component | File | Type | Z-Index | Context / Role | Visibility Rule |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **Layout** | **SettingsModal** | `settings/SettingsModal` | Modal | `z-50+` | 테마/레벨 설정 (TopBar 위) | 버튼 클릭 시 (Action) |
| **Layout** | **TopBar** | `layout/TopBar` | Fixed | `z-50` | 로고, 게임 점수, 시스템 버튼 (상단 고정) | 항상 (Global) |
| **Game** | **ResultModal** | `game/ResultModal` | Modal | `z-50` | 게임 결과/통계 (전체 덮음) | `gameState === 'RESULT'` |
| **Game** | **GameModeSelectScreen** | `game/GameModeSelectScreen` | Screen | `z-50` | 게임 코스 선택 화면 | `gameState === 'GAME_MODE_SELECT'` |
| **Game** | **GameOptionSelectScreen** | `game/GameOptionSelectScreen` | Screen | `z-50` | 세부 게임 옵션 선택 화면 | `gameState === 'SUBREGION_SELECT'` |
| **Game** | **RegionModeSelectPopup** | `game/RegionModeSelectPopup` | Popup | `z-50` | 시/군 클릭 후 구 선택 팝업 | 시/군 클릭 시 (Conditional) |
| **Game** | **Stage1ActionBar** | `game/Stage1ActionBar` | Modeless | `z-30` | 1단계 미션 지령 HUD (우측 패널) | `gameState === 'PLAYING'` & Stage 1 |
| **Game** | **Stage2DispatchBoard** | `game/Stage2DispatchBoard` | Modeless | `z-[35]` | 2단계 고밀도 인성콜 표 배차판 | `gameState === 'PLAYING'` & Stage 2 |
| **Game** | **Stage2SetupModal** | `game/Stage2SetupModal` | Modal | `z-[40]` | 2단계 현위치/노선 설정 다이얼로그 | `gameState === 'SET_DESTINATION'` & Stage 2 |
| **Map** | **BottomBar** | `layout/BottomBar` | Footer | `z-[25]` | 하단 상태 바 (Zoom/Scale/Layer 토글) | **Always w/ Map** |
| **Settings** | **LayerPanel** | `settings/LayerPanel` | Panel | `z-[25]+` | 레이어 on/off 드롭다운 (BottomBar에서 열림) | LAYERS 버튼 클릭 시 |
| **Map** | **Interactive** | `map/InteractionLayer` | Layer | `z-20` | 지역 클릭/호버 감지 | 항상 (Interactive) |
| **Map** | **Road/Grid** | `map/RoadLayer` | Layer | `z-10` | 도로망 및 그리드 표시 | 항상 (Visual) |
| **Map** | **BaseTerrain** | `map/BaseMapLayerCanvas` | Layer | `z-0` | 지형 배경 (Base) | 항상 (Background) |
| **UI** | **AdSlot** | `ui/AdSlot` | Slot | `z-[35]` | 구글 애드센스 광고 자리 표시자 | ActionBar 내부 조건부 |

---

## Folder → Domain Mapping (파일명 검색 가이드)

> **원칙**: 폴더는 도메인(무슨 기능), 파일명 접미사는 UI 타입(어떻게 보이는가)

| 폴더 | 도메인 | 파일명 접미사 예시 |
| :--- | :--- | :--- |
| `game/` | 게임 플로우 전체 | `*Modal`, `*Screen`, `*Popup`, `*Bar` |
| `settings/` | 앱 설정 | `*Modal`, `*Panel` |
| `layout/` | 앱 크롬 (영구 구조) | `*Bar`, `*Screen` |
| `map/` | 지도 렌더링 | `*Layer`, `*Canvas` |
| `ui/` | 재사용 기본 요소 | `*Button`, `*Modal`, `*Slot` |

**버그 발생 시 검색 예시**: `Cmd+P` → `ResultModal`, `LayerPanel`, `AdSlot` → 바로 이동

---

## Visibility & Occlusion Rules (가시성 및 가림 규칙)

### Rule 1: Modeless follows System (모달리스는 시스템 위계를 따름)
*   **Map System Controls (`z-25`)**: 지도와 한 몸처럼 움직이며, `Game System`의 요소들(`z-30`, `z-35`)보다 아래에 위치합니다.
*   **Game HUD (`z-30`)**: 지도 위에 떠서 정보를 보여주지만, 더 중요한 `GameLog`(`z-35`)보다는 아래에 깔릴 수 있습니다.

### Rule 2: Modals are Unconditionally Top (모달은 무조건 최상단)
*   **System Modals (`z-50`)**: `GameModeSelectScreen`, `ResultModal`, `SettingsModal` 등 **Modal/Screen** 성격을 가진 컴포넌트는 모든 Modeless 요소를 덮어버립니다.
*   이 규칙 덕분에 복잡한 조건부 렌더링 없이 자연스러운 **Occlusion(가림)** 효과를 얻습니다.

### Rule 3: Map System Integrity
*   `Map Layer`, `LayerPanel`, `Scale Info`는 **하나의 세트**입니다.
*   지도가 보이면 `BottomBar`(+`LayerPanel`)도 보이고, 지도가 가려지면 함께 가려집니다.
