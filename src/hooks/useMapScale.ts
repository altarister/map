import { useState, useCallback } from 'react';

export const useMapScale = () => {
  const [scaleWidth, setScaleWidth] = useState(0);
  const [scaleDistance, setScaleDistance] = useState(0);
  const [scaleUnit, setScaleUnit] = useState('km');

  // 줌/팬 이벤트 발생 시 호출
  const handleMove = useCallback(({ zoom }: { zoom: number }) => {
    // 1. 현재 줌 레벨에서의 1 픽셀당 실제 거리 계산
    // 메르카토르 투영법 등 복잡한 계산 대신, 경기도 중심부 기준 근사치 사용
    // scale: 8000일 때, 화면상 100px이 대략 몇 km인지 기준 잡기
    // d3-geo의 projection.invert()를 쓰면 정확하지만, 여기선 약식으로 계산
    
    // 기준: (127.0, 37.0) -> (127.1, 37.0) 
    // 경도 0.1도 차이 = 위도 37도에서 약 8.9km
    // scale 8000일 때 0.1도 차이는 약 X 픽셀
    
    // 더 간단한 방법:
    // 기본 scale(8000)에서 zoom 1일 때, 100px = 약 15km (경기도 전체 폭이 약 80km, 화면에 꽉 차면 600~800px)
    // 800px / 80km = 10px/km
    // Zoom 1: 10px = 1km
    // Zoom 2: 20px = 1km ...
    
    // Zoom 레벨에 역비례하여 거리는 줄어듦
    // 화면 100px 기준 거리 = (Base Distance) / zoom
    
    const baseDistanceFor100Px = 12; // Zoom 1일 때 100px = 12km라고 가정 (튜닝 필요)
    
    let dist = baseDistanceFor100Px / zoom;
    let unit = 'km';
    let width = 100;

    // 보기 좋은 숫자로 떨어지게 조정 (1, 2, 5, 10 단위)
     if (dist < 1) {
      dist *= 1000;
      unit = 'm';
    }

    // dist를 예쁜 숫자로 내림 (예: 12.3km -> 10km)
    const magnitude = Math.pow(10, Math.floor(Math.log10(dist)));
    const normalized = dist / magnitude;
    
    let roundedDist;
    if (normalized >= 5) roundedDist = 5 * magnitude;
    else if (normalized >= 2) roundedDist = 2 * magnitude;
    else roundedDist = 1 * magnitude;

    // 조정된 거리에 맞춰 픽셀 너비 재계산
    // width / 100 = roundedDist / originalDist
    width = (roundedDist / dist) * 100;
    
    // 만약 단위가 m로 바뀌었으면 다시 km로 환산해서 저장할 수도 있음
    // 여기선 그냥 표기용 값 저장
    setScaleDistance(roundedDist);
    setScaleUnit(unit);
    setScaleWidth(width);
  }, []);

  return { scaleWidth, scaleDistance, scaleUnit, handleMove };
};
