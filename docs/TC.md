# [TC] 1DAL Trainer - 테스트 케이스 문서

**문서 코드**: TC-001  
**작성일**: 2026-02-15  
**버전**: 1.0.1 (Map Resize Bug Fix)  
**상태**: Active  
**참조 문서**: GDD v2.0.0, saved.html (Technical Specification)

---

## 문서 개요 (Document Overview)

본 문서는 **1DAL Trainer**의 QA 테스트 케이스를 정의합니다. saved.html(Technical Specification)과 GDD v2.0.0을 Ground Truth로 합니다.

### 테스트 목적
- **기능 검증**: 모든 기능이 명세대로 동작하는지 확인
- **UI/UX 검증**: 화면 구성, 애니메이션, 스타일이 명세와 일치하는지 확인
- **상태 전환 검증**: GameState 전환이 올바르게 동작하는지 확인
- **성능 검증**: 60 FPS, 로딩 시간 등 성능 요구사항 충족 확인
- **회귀 방지**: 기존 기능이 정상 동작하는지 확인

### 테스트 범위
- ✅ Level 1 (위치 찾기 Phase 1)
- ✅ 5가지 GameState 전환
- ✅ UI 컴포넌트 (Header, ActionBar, Map, Panels)
- ✅ 브라우저 호환성 (Chrome, Firefox, Safari, Edge)

---

## 테스트 케이스 우선순위 (Priority)

| 우선순위 | 설명 | 예시 |
|----------|------|------|
| **P0** | 치명적 (Core Functionality) | 게임 시작 불가, 정답 처리 안 됨 |
| **P1** | 중요 (Major Feature) | 애니메이션 작동 안 함, 점수 미표시 |
| **P2** | 보통 (Minor Feature) | 색상 불일치, 텍스트 오타 |
| **P3** | 낮음 (Enhancement) | 디버그 패널 오류 |

---

## 1. 기능 테스트 (Functional Tests)

### 1.1 게임 시작 (Game Initialization)

#### TC-F-001: 앱 최초 진입
**Priority**: P0  
**Precondition**: 브라우저 열기  
**Steps**:
1. `http://localhost:5173` 접속
2. 화면 확인

**Expected Result**:
- ✅ Header 표시: `1DAL Trainer`, `[Game: OFF]` (빨간색), `[Map: ON]` (초록색)
- ✅ START 버튼 표시: `▶ START` (초록 배경)
- ✅ Map 표시: 경기도 지도 (시군구 42개 영역)
- ✅ GameState: `INITIAL`

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-F-002: START 버튼 클릭
**Priority**: P0  
**Precondition**: TC-F-001 완료  
**Steps**:
1. `▶ START` 버튼 클릭
2. 모달 확인

**Expected Result**:
- ✅ Level Select Modal 표시
- ✅ 제목: `Mission Parameters`
- ✅ Level 1 버튼: `LEVEL 001 - AVAILABLE` (초록 배지)
- ✅ Level 2-3 버튼: `LOCKED` (회색, 클릭 불가)
- ✅ GameState: `LEVEL_SELECT`

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-F-003: Level 1 선택
**Priority**: P0  
**Precondition**: TC-F-002 완료  
**Steps**:
1. `LEVEL 001 - REGION IDENTIFICATION` 버튼 클릭
2. 화면 확인

**Expected Result**:
- ✅ Modal 닫힘
- ✅ GameState: `PLAYING`
- ✅ Header `[Game: ON]` (초록색)
- ✅ START 버튼 사라짐
- ✅ Score 표시: `Best 0`, `Score 0`
- ✅ ActionBar 슬라이드 다운 (300ms 애니메이션)
- ✅ 문제 표시: `Q. 다음 지역을 찾으세요: [지역명]` (초록색)

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

### 1.2 게임 플레이 (Gameplay)

#### TC-F-004: 정답 클릭 (정답 처리)
**Priority**: P0  
**Precondition**: TC-F-003 완료  
**Steps**:
1. ActionBar에 표시된 지역 확인 (예: "안산시 단원구")
2. Map에서 해당 지역 클릭
3. 피드백 확인

**Expected Result**:
- ✅ 피드백 표시: `✓ 정답입니다!` (초록색, 중앙)
- ✅ ActionBar 테두리: 초록색으로 플래시 (0.5초)
- ✅ Score 증가: `Score 100` (+100점)
- ✅ GameInfoPanel Correct 증가: `Correct: 1`
- ✅ 3초 후 다음 문제 자동 출제
- ✅ 피드백 사라짐

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-F-005: 오답 클릭 (오답 처리)
**Priority**: P0  
**Precondition**: TC-F-003 완료  
**Steps**:
1. ActionBar에 표시된 지역과 **다른** 지역 클릭
2. 피드백 확인

**Expected Result**:
- ✅ 피드백 표시: `✗ 틀렸습니다. 다시 시도하세요` (빨간색)
- ✅ ActionBar 테두리: 빨간색으로 플래시 (0.5초)
- ✅ Score 변동 없음 (100점 유지)
- ✅ GameInfoPanel Incorrect 증가: `Incorrect: 1`
- ✅ 3초 후 피드백만 사라짐 (문제는 유지)
- ✅ 같은 문제로 재시도 가능

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-F-006: 연속 정답 (Streak)
**Priority**: P1  
**Precondition**: TC-F-003 완료  
**Steps**:
1. 5문제 연속 정답 클릭
2. Score 확인

**Expected Result**:
- ✅ Score: `500` (5 × 100점)
- ✅ GameInfoPanel: `Correct: 5`, `Incorrect: 0`
- ✅ Best Score 업데이트 없음 (게임 종료 시 업데이트)

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-F-007: 게임 종료 - 모든 문제 완료
**Priority**: P0  
**Precondition**: Level 1의 모든 지역(42개) 정답  
**Steps**:
1. 마지막 문제 정답 클릭
2. 3초 후 확인

**Expected Result**:
- ✅ GameState: `RESULT`
- ✅ Result Modal 표시
- ✅ 점수, 소요 시간 표시
- ✅ `다시하기` 버튼 표시

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-F-008: 게임 중단 - 그만하기 버튼
**Priority**: P1  
**Precondition**: TC-F-003 완료 (게임 진행 중)  
**Steps**:
1. Header 우측 `그만하기` 버튼 클릭
2. 확인

**Expected Result**:
- ✅ GameState: `LEVEL_SELECT`
- ✅ Level Select Modal 표시
- ✅ ActionBar 숨김 (슬라이드 업)
- ✅ Score 초기화: `0`
- ✅ 진행 중이던 문제 사라짐

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

### 1.3 점수 및 기록 (Score & Records)

#### TC-F-009: Best Score 저장 (localStorage)
**Priority**: P1  
**Precondition**: 게임 1회 완료 (예: 4200점)  
**Steps**:
1. Result Modal에서 `다시하기` 클릭
2. Level 1 다시 시작
3. Header 확인

**Expected Result**:
- ✅ Header `Best 4200` 표시
- ✅ localStorage에 저장됨 (`topScore` 키)
- ✅ 새로운 게임 시작 시 `Score 0`부터 시작

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-F-010: Best Score 갱신
**Priority**: P1  
**Precondition**: Best Score 4200점 존재  
**Steps**:
1. 새 게임 시작
2. 더 높은 점수 획득 (예: 4300점)
3. 게임 종료 후 확인

**Expected Result**:
- ✅ Best Score 업데이트: `Best 4300`
- ✅ localStorage 업데이트

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

## 2. UI/UX 테스트 (UI/UX Tests)

### 2.1 Header (TopBar)

#### TC-UI-001: Header 레이아웃
**Priority**: P1  
**Precondition**: 앱 실행  
**Steps**:
1. Header 확인

**Expected Result**:
- ✅ 높이: `64px`
- ✅ 배경: `#0f172a` (slate-900)
- ✅ 테두리 하단: `#334155` (slate-700)
- ✅ 좌측: `1DAL Trainer` (흰색, 굵게)
- ✅ 중앙: `[Game: OFF] [Map: ON]` (font-mono)
- ✅ 우측: START 버튼 / Score / 설정 아이콘

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-UI-002: System Status Display 색상
**Priority**: P1  
**Precondition**: 게임 상태별 확인  
**Steps**:
1. INITIAL 상태: `[Game: OFF]` 확인
2. PLAYING 상태: `[Game: ON]` 확인

**Expected Result**:
- ✅ INITIAL/LEVEL_SELECT/RESULT: `[Game: OFF]` 빨간색 (`#ef4444`)
- ✅ PLAYING: `[Game: ON]` 초록색 (`#10b981`)
- ✅ Map Status: 항상 `[Map: ON]` 초록색

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-UI-003: START 버튼 스타일
**Priority**: P1  
**Precondition**: INITIAL 상태  
**Steps**:
1. START 버튼 확인
2. Hover 동작 확인

**Expected Result**:
- ✅ 텍스트: `▶ START` (심볼 포함)
- ✅ 배경: 초록색 (`#10b981`)
- ✅ 텍스트: 검은색 (`#000000`), 굵게
- ✅ Padding: `24px 8px` (px-6 py-2)
- ✅ Hover 시 배경: `#34d399` (밝은 초록)

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

### 2.2 Action Bar

#### TC-UI-004: Action Bar 슬라이드 애니메이션
**Priority**: P1  
**Precondition**: Level 1 시작  
**Steps**:
1. LEVEL_SELECT → PLAYING 전환 관찰
2. 애니메이션 확인

**Expected Result**:
- ✅ 초기 위치: 화면 위쪽 밖 (`-translate-y-full`)
- ✅ PLAYING 진입 시: 화면 안으로 슬라이드 다운 (`translate-y-0`)
- ✅ Duration: `300ms`
- ✅ Timing: `ease-out`
- ✅ 부드러운 애니메이션 (60 FPS)

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-UI-005: Action Bar 문제 표시 포맷
**Priority**: P2  
**Precondition**: PLAYING 상태  
**Steps**:
1. ActionBar 텍스트 확인

**Expected Result**:
- ✅ 고정 텍스트: `Q. 다음 지역을 찾으세요:` (흰색)
- ✅ 지역명: 초록색 (`#10b981`)
- ✅ 폰트: `text-2xl` (24px), `font-bold`
- ✅ 정렬: 중앙

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-UI-006: Action Bar 피드백 애니메이션
**Priority**: P1  
**Precondition**: 정답/오답 클릭  
**Steps**:
1. 정답 클릭 → 피드백 확인
2. 오답 클릭 → 피드백 확인

**Expected Result**:
- ✅ 정답: `✓ 정답입니다!` 초록색
- ✅ 오답: `✗ 틀렸습니다. 다시 시도하세요` 빨간색
- ✅ 테두리 플래시: 초록/빨강 (0.5초)
- ✅ 3초 후 자동으로 사라짐

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

### 2.3 Map Area

#### TC-UI-007: Map LOD (Level of Detail) 전환
**Priority**: P1  
**Precondition**: Map 표시  
**Steps**:
1. 줌 레벨 `k < 1.5` 확인
2. 줌 인하여 `k >= 1.5` 확인

**Expected Result**:
- ✅ `k < 1.5`: Level 2 (시군구 42개), 단색 (`#e0e7ff`)
- ✅ `k >= 1.5`: Level 3 (읍면동 563개), 해시 기반 컬러
- ✅ 전환 시간: 100ms 이하
- ✅ 부드러운 전환

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-UI-008: Map Zoom/Pan 인터랙션
**Priority**: P1  
**Precondition**: Map 표시  
**Steps**:
1. 마우스 휠로 줌 인/아웃
2. 드래그로 팬
3. DebugInfoPanel 확인

**Expected Result**:
- ✅ 줌 범위: `1.0x ~ 8.0x`
- ✅ 커서 위치 기준 줌
- ✅ 드래그 팬 부드럽게 동작
- ✅ DebugInfoPanel에 Zoom, Pan 값 실시간 표시

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-UI-009: Map Hover 효과
**Priority**: P2  
**Precondition**: Map 표시  
**Steps**:
1. 지역 위에 마우스 올리기
2. DebugInfoPanel 확인

**Expected Result**:
- ✅ Hover 시 지역 색상 변경: `#404040`
- ✅ 테두리 강조: 흰색
- ✅ DebugInfoPanel `Hover` 필드: 지역 코드 표시 (예: `4113110600`)

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-UI-010: 정답 시각 피드백 (Map)
**Priority**: P1  
**Precondition**: PLAYING 상태  
**Steps**:
1. 정답 지역 클릭
2. Map 확인

**Expected Result**:
- ✅ 해당 지역 하이라이트: 초록색 (`rgba(0,255,0,0.3)`)
- ✅ 테두리: 초록색 (`#00ff00`), 두께 `3px`
- ✅ 3초간 표시 후 사라짐

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

### 2.4 Info Panels

#### TC-UI-011: DebugInfoPanel 위치 및 스타일
**Priority**: P3  
**Precondition**: 앱 실행  
**Steps**:
1. DebugInfoPanel 확인

**Expected Result**:
- ✅ 위치: `top: 80px, left: 16px`
- ✅ 크기: `width: 256px`
- ✅ Glassmorphism: `rgba(20,20,20,0.85)`, `blur(12px)`
- ✅ 제목: `Debug Info` (회색, 대문자)
- ✅ 내용: Zoom, Pan, Rendered, Hover (font-mono, 12px)

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-UI-012: GameInfoPanel 동적 표시
**Priority**: P2  
**Precondition**: PLAYING 상태  
**Steps**:
1. GameInfoPanel 확인
2. 정답/오답 클릭 후 재확인

**Expected Result**:
- ✅ 위치: `bottom: 16px, left: 16px`
- ✅ Level, State 항상 표시
- ✅ PLAYING 상태에서만 `Correct` (초록), `Incorrect` (빨강) 표시
- ✅ 정답 시 Correct 증가, 오답 시 Incorrect 증가

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

### 2.5 Modals

#### TC-UI-013: Level Select Modal 스타일
**Priority**: P1  
**Precondition**: START 버튼 클릭  
**Steps**:
1. Modal 확인

**Expected Result**:
- ✅ 배경: 검은색 반투명 (`bg-black/80`), 블러
- ✅ z-index: `100`
- ✅ Modal 크기: `max-w-lg`
- ✅ Glassmorphism 적용
- ✅ Fade-in 애니메이션 (0.3초)

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-UI-014: Level 1 버튼 Hover 효과
**Priority**: P2  
**Precondition**: Level Select Modal 표시  
**Steps**:
1. Level 1 버튼에 Hover
2. 스타일 확인

**Expected Result**:
- ✅ 초기 테두리: `#262626`
- ✅ Hover 테두리: 초록색 (`#10b981`)
- ✅ Transition 부드럽게 동작

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

## 3. 상태 전환 테스트 (State Transition Tests)

### 3.1 GameState Flow

#### TC-ST-001: INITIAL → LEVEL_SELECT
**Priority**: P0  
**Steps**: START 버튼 클릭  
**Expected Result**: ✅ Modal 표시, GameState = `LEVEL_SELECT`  
**Status**: [ ] Pass / [ ] Fail

---

#### TC-ST-002: LEVEL_SELECT → PLAYING
**Priority**: P0  
**Steps**: Level 1 버튼 클릭  
**Expected Result**: ✅ Modal 닫힘, ActionBar 슬라이드 다운, GameState = `PLAYING`  
**Status**: [ ] Pass / [ ] Fail

---

#### TC-ST-003: PLAYING → RESULT
**Priority**: P0  
**Steps**: 모든 문제 정답  
**Expected Result**: ✅ Result Modal 표시, GameState = `RESULT`  
**Status**: [ ] Pass / [ ] Fail

---

#### TC-ST-004: PLAYING → LEVEL_SELECT (그만하기)
**Priority**: P1  
**Steps**: 그만하기 버튼 클릭  
**Expected Result**: ✅ Modal 표시, ActionBar 숨김, GameState = `LEVEL_SELECT`  
**Status**: [ ] Pass / [ ] Fail

---

#### TC-ST-005: RESULT → LEVEL_SELECT
**Priority**: P1  
**Steps**: Result Modal에서 다시하기 클릭  
**Expected Result**: ✅ Level Select Modal 표시, GameState = `LEVEL_SELECT`  
**Status**: [ ] Pass / [ ] Fail

---

### 3.2 상태별 UI 가시성

#### TC-ST-006: INITIAL 상태 UI
**Priority**: P1  
**Precondition**: INITIAL 상태  
**Expected Result**:
- ✅ Map: 표시
- ✅ START 버튼: 표시
- ✅ ActionBar: 숨김
- ✅ Score: 미표시
- ✅ System Status: `[Game: OFF]` (빨강)

**Status**: [ ] Pass / [ ] Fail

---

#### TC-ST-007: PLAYING 상태 UI
**Priority**: P1  
**Precondition**: PLAYING 상태  
**Expected Result**:
- ✅ Map: 표시 (클릭 가능)
- ✅ START 버튼: 숨김
- ✅ ActionBar: 표시 (슬라이드 다운)
- ✅ Score: 표시
- ✅ 그만하기 버튼: 표시
- ✅ System Status: `[Game: ON]` (초록)

**Status**: [ ] Pass / [ ] Fail

---

## 4. 성능 테스트 (Performance Tests)

### 4.1 렌더링 성능

#### TC-PF-001: 60 FPS 유지
**Priority**: P1  
**Precondition**: Chrome DevTools Performance 패널 열기  
**Steps**:
1. 게임 시작
2. Map Zoom/Pan 수행
3. FPS 확인

**Expected Result**:
- ✅ FPS: 평균 60 FPS 이상
- ✅ 애니메이션 중 프레임 드롭 없음
- ✅ Zoom/Pan 부드럽게 동작

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

#### TC-PF-002: LOD 전환 시간
**Priority**: P1  
**Precondition**: Map 표시  
**Steps**:
1. Zoom 1.0x → 1.5x 전환
2. 전환 시간 측정

**Expected Result**:
- ✅ 전환 시간: 100ms 이하
- ✅ 눈에 띄는 딜레이 없음

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

### 4.2 로딩 성능

#### TC-PF-003: 초기 로딩 시간
**Priority**: P1  
**Precondition**: 브라우저 열기 (캐시 비활성화)  
**Steps**:
1. Network 패널에서 성능 측정
2. FCP, TTI 확인

**Expected Result**:
- ✅ FCP (First Contentful Paint): < 1.5s
- ✅ TTI (Time to Interactive): < 3s
- ✅ Map 데이터 로드: < 1s

**Status**: [ ] Pass / [ ] Fail  
**Tested By**: ___________  
**Date**: ___________

---

## 5. 브라우저 호환성 테스트 (Browser Compatibility)

### 5.1 기능 호환성

| 기능 | Chrome 121+ | Firefox 122+ | Safari 17+ | Edge 121+ |
|------|-------------|--------------|------------|-----------|
| Map 렌더링 (SVG) | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass |
| Zoom/Pan (D3) | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass |
| Glassmorphism (backdrop-filter) | [ ] Pass | [ ] Pass | [ ] Pass (-webkit-) | [ ] Pass |
| 애니메이션 (transition) | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass |
| localStorage | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass |

---

### 5.2 스타일 호환성

#### TC-BC-001: Safari backdrop-filter
**Priority**: P1  
**Precondition**: Safari 17+ 브라우저  
**Steps**:
1. Info Panels 확인
2. ActionBar 확인

**Expected Result**:
- ✅ Glassmorphism 정상 적용
- ✅ `-webkit-backdrop-filter` fallback 동작

**Status**: [ ] Pass / [ ] Fail  
**Browser**: Safari _______  
**Date**: ___________

---

## 6. 회귀 테스트 체크리스트 (Regression Checklist)

새로운 기능 추가 시 다음 항목을 반드시 확인:

- [ ] **TC-F-001~003**: 게임 시작 플로우
- [ ] **TC-F-004~005**: 정답/오답 처리
- [ ] **TC-UI-004**: ActionBar 애니메이션
- [ ] **TC-UI-007**: Map LOD 전환
- [ ] **TC-ST-001~005**: 모든 GameState 전환
- [ ] **TC-PF-001**: 60 FPS 유지
- [ ] **TC-BC-001**: 주요 브라우저 호환성

---

### 2.6 Layout & Responsiveness

#### TC-UI-015: Map Resize Alignment (Map 좌표 동기화)
**Priority**: P0
**Precondition**: Map 표시
**Steps**:
1. 브라우저 창 크기를 변경 (Resize)
2. 마우스로 특정 지역 Hover
3. 지역 하이라이트 위치 확인

**Expected Result**:
- ✅ Map 크기가 창 크기에 맞춰 자동 조절될 것
- ✅ 마우스 커서 위치와 하이라이트되는 지역이 **정확히 일치**할 것
- ✅ (버그 회귀) Resize 후 클릭/호버 위치가 틀어지지 않아야 함

**Status**: [ ] Pass / [ ] Fail
**Tested By**: ___________
**Date**: ___________

#### TC-UI-016: Answered Region Interaction (기정답 영역 클릭 방지)
**Priority**: P1
**Precondition**: 문제 하나 정답 처리 (예: 파주시)
**Steps**:
1. 정답 처리된 지역(파주시)을 다시 클릭
2. 피드백 및 점수 확인

**Expected Result**:
- ✅ 클릭 이벤트가 무시되어야 함
- ✅ '정답입니다' 또는 '틀렸습니다' 피드백이 발생하지 않아야 함
- ✅ 점수 변화 없어야 함
- ✅ 커서가 'pointer'가 아닌 'default' 또는 'not-allowed'여야 함 (시각적 힌트)

**Status**: [ ] Pass / [ ] Fail
**Tested By**: ___________
**Date**: ___________

---

## 7. 알려진 이슈 (Known Issues)

### 현재 이슈 없음
- v1.0.1 (Map Resize 버그 수정됨) -> v1.0.2 (기정답 중복 클릭 버그 수정됨)

---

## 8. 탐색적 테스트 및 엣지 케이스 (Exploratory Testing & Edge Cases)

QA 전문가로서 예상되는 잠재적 버그 시나리오입니다. 다음 항목들을 중점적으로 테스트해 보시기를 권장합니다.

### 8.1 입력 및 인터랙션 (Input & Interaction)
- [ ] **TC-EX-001 (Rapid Re-click)**: 정답 판정 직후(0.1초 내) 다른 지역을 매우 빠르게 클릭했을 때 오답 처리되는가? (Concurrency Guard 확인)
- [ ] **TC-EX-002 (Double Click)**: 정답 지역을 더블 클릭했을 때, 두 번째 클릭이 다음 문제의 오답으로 처리되지 않는가?
- [ ] **TC-EX-003 (Simultaneous Input)**: (터치스크린/멀티터치) 두 지역을 동시에 터치했을 때 동작은?

### 8.2 화면 및 렌더링 (Display & Rendering)
- [ ] **TC-EX-004 (Browser Zoom)**: 브라우저 자체 줌(`Cmd +/-`)을 150% 이상 변경했을 때, 마우스 좌표와 맵 하이라이트가 일치하는가? (CSS transform vs SVG coordinate)
- [ ] **TC-EX-005 (Background Throttle)**: 브라우저 탭을 비활성화했다가 다시 돌아왔을 때, 타이머나 애니메이션이 튀지 않는가?

### 8.3 게임 로직 (Game Logic)
- [ ] **TC-EX-006 (Level Transition)**: 마지막 문제를 맞추자마자 다른 버튼(예: 그만하기)을 눌렀을 때 상태 꼬임은 없는가?
- [ ] **TC-EX-007 (Quick Restart)**: 결과 창이 뜨자마자 빠르게 '다시하기'를 눌렀을 때 점수 초기화가 올바른가?

---

## 9. 테스트 실행 가이드 (Test Execution Guide)

### 8.1 로컬 환경 설정

```bash
# 1. 프로젝트 디렉토리로 이동
cd /Users/seungwookkim/reps/map/map

# 2. 개발 서버 실행
npm run dev

# 3. 브라우저 열기
# http://localhost:5173
```

### 8.2 테스트 순서

1. **기능 테스트** (Section 1): P0 우선 → P1 → P2
2. **UI/UX 테스트** (Section 2): 컴포넌트별
3. **상태 전환 테스트** (Section 3): 모든 전환 확인
4. **성능 테스트** (Section 4): Chrome DevTools 사용
5. **브라우저 호환성** (Section 5): 각 브라우저별 실행

### 8.3 버그 리포트 양식

버그 발견 시 다음 형식으로 이슈 등록:

```markdown
**TC ID**: TC-F-004
**Priority**: P0
**Browser**: Chrome 121
**Steps to Reproduce**:
1. ...
2. ...

**Expected**: ...
**Actual**: ...
**Screenshot**: [첨부]
```

---

## 9. 승인 (Approval)

| 역할 | 이름 | 서명 | 날짜 |
|------|------|------|------|
| QA Lead | _________ | _________ | _________ |
| Dev Lead | _________ | _________ | _________ |
| Product Owner | _________ | _________ | _________ |

---

**문서 종료**

본 문서는 1DAL Trainer의 QA 테스트 케이스 문서입니다.  
모든 테스트는 saved.html과 GDD v2.0.0을 Ground Truth로 합니다.
