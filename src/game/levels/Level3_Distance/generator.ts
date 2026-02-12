import { geoCentroid, geoDistance } from 'd3-geo';
import type { LevelContext, EstimateDistanceQuestion } from '../../core/types';
import type { RegionFeature } from '../../../types/geo';

// 지구 반지름 (km)
const EARTH_RADIUS_KM = 6371;

export const generateLevel3Question = (context: LevelContext): EstimateDistanceQuestion => {
  const { mapData } = context;

  // 랜덤 두 지역 선택 (너무 가까운 지역 제외)
  let startFeature: RegionFeature;
  let endFeature: RegionFeature;
  let distanceKm = 0;

  // 적절한 거리가 나올 때까지 반복 (최대 10회 시도)
  for (let i = 0; i < 10; i++) {
    const startIndex = Math.floor(Math.random() * mapData.length);
    startFeature = mapData[startIndex];

    let endIndex = Math.floor(Math.random() * mapData.length);
    while (endIndex === startIndex) {
      endIndex = Math.floor(Math.random() * mapData.length);
    }
    endFeature = mapData[endIndex];

    // 중심 좌표 계산
    const startCentroid = geoCentroid(startFeature);
    const endCentroid = geoCentroid(endFeature);

    // d3-geo의 geoDistance는 라디안 단위 거리를 반환함
    // 라디안 * 지구반지름 = 실제 거리(km)
    const distanceRad = geoDistance(startCentroid, endCentroid);
    distanceKm = distanceRad * EARTH_RADIUS_KM;

    // 너무 가깝지 않은 거리 (예: 10km 이상) 선택
    if (distanceKm > 10) break;
  }

  // 루프가 끝나도 초기화되지 않았을 경우를 대비 (사실 위 로직상 무조건 할당됨)
  if (!startFeature! || !endFeature!) {
      // fallback
      startFeature = mapData[0];
      endFeature = mapData[1];
      const s = geoCentroid(startFeature);
      const e = geoCentroid(endFeature);
      distanceKm = geoDistance(s, e) * EARTH_RADIUS_KM;
  }

  return {
    id: crypto.randomUUID(),
    type: 'ESTIMATE_DIST',
    start: {
      code: startFeature.properties.code,
      name: startFeature.properties.name,
      coordinate: geoCentroid(startFeature)
    },
    end: {
      code: endFeature.properties.code,
      name: endFeature.properties.name,
      coordinate: geoCentroid(endFeature)
    },
    actualDistance: Math.round(distanceKm * 10) / 10 // 소수점 첫째자리까지
  };
};
