# 화물 배차 판단력 향상 시뮬레이터 (Freight Mapper MVP)

경기도 지역 맞추기 게임을 통해 화물 차주의 지역 위치 암기와 배차 판단 속도를 향상시키는 웹 애플리케이션입니다.

## 🚀 시작하기

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속하세요.

### 빌드

```bash
npm run build
```

## 🛠 기술 스택

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, Framer Motion
- **Map**: @vnedyalk0v/react19-simple-maps (React-simple-maps 포크), d3-geo
- **State Management**: React Context API

## 📂 프로젝트 구조

```
src/
├── components/
│   ├── game/    # 게임 관련 컴포넌트 (Map, QuizPanel 등)
│   ├── layout/  # 레이아웃 컴포넌트
│   └── ui/      # 공용 UI 컴포넌트 (Button, Modal 등)
├── contexts/    # Context API (Game, Settings)
├── hooks/       # 커스텀 훅 (useGameLogic, useGeoData 등)
├── types/       # TypeScript 타입 정의
└── constants/   # 상수 및 설정
```

## 📝 주요 기능

- **경기도 지도 렌더링**: GeoJSON 데이터를 기반으로 지도 표시
- **지역 맞추기 퀴즈**: 랜덤하게 제시되는 지역명을 지도에서 클릭
- **점수 및 타이머**: 제한 시간 내에 최대한 많은 지역 맞추기
- **반응형 디자인**: 다양한 디바이스 지원

## ⚠️ 주의사항

- 현재 지도 데이터는 `public/data/skorea-municipalities-2018-topo.json` (TopoJSON) 포맷을 사용합니다.
- TopoJSON은 GeoJSON보다 파일 크기가 훨씬 작아(약 1/10) 웹 성능에 유리합니다.
- 데이터 소스: [southkorea-maps](https://github.com/southkorea/southkorea-maps) (`kostat/2018/json/skorea-municipalities-2018-topo.json`)
- 참고: `src/hooks/useGeoData.ts`에서 TopoJSON을 로드하고 `topojson-client`를 사용하여 클라이언트 사이드에서 GeoJSON으로 변환합니다. 경기도 지역(코드 '31') 필터링 로직도 포함되어 있습니다.
