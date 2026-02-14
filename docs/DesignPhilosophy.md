# [Design Philosophy] 1DAL Trainer : Tactical Operations Center

## 1. 기획 의도 및 핵심 컨셉 (Core Concept)

### "Operator Mindset" (사용자는 게이머가 아니라 오퍼레이터다)
1DAL Trainer의 사용자는 단순한 게임 플레이어가 아닙니다. 그들은 **실제 도로 위에서 빠르고 정확한 판단을 내려야 하는 '프로 용달 기사(Operator)'**가 되기 위해 훈련 중입니다.

따라서 UI는 **"화려한 게임"**보다는 **"신뢰할 수 있는 전술 장비(Tactical Gear)"**처럼 느껴져야 합니다.

- **불필요한 장식 제거**: 예쁜 그라데이션, 귀여운 아이콘, 부드러운 그림자는 배제합니다.
- **정보의 명확성**: 모든 정보는 한눈에 들어와야 하며(Scan), 해석의 여지가 없어야 합니다.
- **몰입감**: 사용자가 마치 작전 지휘소(Command Center)에 앉아 있는 듯한 느낌을 줍니다.

---

## 2. 시각적 언어 (Visual Language)

### 2.1 컬러 팔레트 (Tactical Color System)

색상은 단순한 장식이 아니라 **"기능적 신호(Functional Signal)"**로 사용됩니다.

#### ⬛ Void Black (배경) : `#050505`
- **의미**: 무한한 공간, 집중, 밤거리.
- **효과**: 눈의 피로를 최소화하고, 정보(데이터)가 가장 돋보이게 하는 캔버스 역할.
- **적용**: 앱 전체 배경, 지도 배경.

#### 🟩 Signal Green (긍정/활성) : `#16a34a` (Tailwind green-600)
- **의미**: "Systems Normal", "Target Acquired", "Success".
- **효과**: 가장 주목도가 높은 색상으로, 사용자가 봐야 할 **목표**와 **성공**을 즉각적으로 알립니다.
- **적용**: 정답 구역, 점수, 활성화된 버튼, 중요한 텍스트.

#### 🟥 Alert Red (부정/경고) : `#dc2626` (Tailwind red-600)
- **의미**: "Error", "Misfire", "Correction Needed".
- **효과**: 사용자의 실수를 즉시 인지시키고 교정을 유도합니다.
- **적용**: 오답 구역, 게임 종료 상태.

#### ⬜ Data Grey (정보/보조) : `#e5e5e5` & `#404040`
- **의미**: 객관적인 데이터, 구조.
- **효과**: 감정을 배제한 정보 전달.
- **적용**: 일반 텍스트, 지도 경계선, 패널 테두리.

### 2.2 타이포그래피 (Typography)

**"Data-First Typography"**

- **Inter (UI)**: 높은 가독성. 헤드라인 및 일반 텍스트. `Bold`, `Uppercase`를 적극 활용하여 강인한 인상.
- **JetBrains Mono (Data)**: 고정폭(Monospace) 폰트. 숫자, 좌표, 코드 등 **정확한 정보**를 전달할 때 사용. 기계적인 느낌 강조.

---

## 3. 사용자 경험 원칙 (UX Principles)

### 3.1 최소한의 인지 부하 (Minimal Cognitive Load)
운전 중 네비게이션을 보는 상황을 가정해 보세요. 0.5초 만에 정보를 파악해야 합니다.
- **원칙**: 화면에 동시에 표시되는 정보 그룹은 3~5개를 넘지 않는다.
- **적용**: `Header`, `Map`, `Action Bar` 등 구획을 명확히 나누고, 각 구획 내 정보는 계층화한다.

### 3.2 즉각적이고 명확한 피드백 (Instant Feedback)
사용자의 모든 행동에는 즉각적인 시청각적 피드백이 따릅니다.
- **클릭**: 즉시 색상 변화 (Green/Red Tint).
- **결과**: 화면 상단 Action Bar에서 명확한 텍스트로 성공/실패 선언.
- **소리**: (향후) 기계적인 비프음 등 효과음 추가.

### 3.3 일관된 인터랙션 (Consistent Interaction)
- **Glassmorphism**: 떠 있는 정보 패널들은 모두 반투명 유리 재질을 사용하여, 배경 지도와의 단절을 피하면서도 정보를 분리합니다.
- **Grid System**: 배경의 도트 그리드(Dot Grid)는 공간감과 정밀함을 부여하며, 모든 UI 요소는 이 그리드 위에 정렬된 느낌을 줍니다.

---

## 4. 컴포넌트 디자인 가이드 (Component Guidelines)

### 4.1 Glass Panel (정보 컨테이너)
모든 정보 UI는 `Glass Panel` 위에 올라갑니다.
- `bg`: `rgba(20, 20, 20, 0.85)` (어두운 반투명)
- `border`: `1px solid rgba(255, 255, 255, 0.1)` (얇고 날카로운 테두리)
- `shadow`: 없음 (Flat & Clean)

### 4.2 Map Elements (지도 요소)
- **Regions**: 어두운 회색(`fill`) + 밝은 회색(`stroke`)으로 "꺼진 화면"과 "켜진 라인" 느낌 구현.
- **Labels**: 
    - **Macro View (Zoom Out)**: 큰 폰트, 밝은 회색 (전체 맥락 파악)
    - **Micro View (Zoom In)**: 작은 폰트, 어두운 회색 (세부 정보 확인, 지도 가리지 않음)

### 4.3 Action Bar (동적 알림)
게임 상태(`PLAYING`)에서만 위에서 내려오는(Slide Down) 패널입니다.
- 평소에는 숨겨져 있다가, "작전 개시"와 함께 등장하여 사용자의 집중력을 환기시킵니다.
- 강렬한 `Border Bottom` 색상(Green/Red)으로 현재 상태를 직관적으로 보여줍니다.

---
**"Simplicity is the ultimate sophistication."**  
**단순함은 궁극의 정교함이다.**
- 레오나르도 다빈치 (그리고 1DAL Trainer 디자인 팀)
