import { calculateDistanceKm } from '../../../utils/geo';
import { geoCentroid } from 'd3-geo';
import type { StageContext, CallFilterQuestion, CallItem } from '../../core/types';
import type { RegionFeature } from '../../../types/geo';

const SEARCH_RADIUS_KM = 30; // 가변 반경
const CALLS_PER_BATCH = 4; // 한 번에 노출될 콜 카드 수

// Fisher-Yates shuffle
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const generateCallBatch = (
  ctx: StageContext,
  targetDestCode: string, // 예: "41610" (경기 광주시)
  currentStartCode?: string // 현재 하차한 위치 (꼬리물기용)
): CallFilterQuestion => {
  const { mapData } = ctx;

  // 1. 현재 시작 위치 설정 (없으면 전체 랜덤)
  let startFeature = mapData.find(f => f.properties.code === currentStartCode);
  if (!startFeature) {
    // 아무 곳이나 랜덤 시작인데, 폴리곤이 있는 EMD(읍면동) 레벨 선호
    startFeature = mapData[Math.floor(Math.random() * mapData.length)];
  }

  const startCentroid = getCentroid(startFeature as RegionFeature);

  // 2. 반경 내 도착지(하차지) 후보군 필터링
  const nearbyFeatures = mapData.filter(f => {
    if (f.properties.code === startFeature?.properties.code) return false;
    const destCentroid = getCentroid(f);
    const dist = calculateDistanceKm(startCentroid, destCentroid);
    return dist <= SEARCH_RADIUS_KM;
  });

  // 3. 정답 그룹(목표 노선 방향)과 오답 그룹(그 외) 분류
  const matchGroup = nearbyFeatures.filter(f => f.properties.code.startsWith(targetDestCode));
  const wrongGroup = nearbyFeatures.filter(f => !f.properties.code.startsWith(targetDestCode));

  const calls: CallItem[] = [];

  // 4. 정답 콜 1~2개 무조건 포함 (비율 조정 가능)
  const answerCount = matchGroup.length > 0 ? (Math.random() > 0.5 ? 2 : 1) : 0;
  
  if (matchGroup.length > 0) {
    const selectedMatches = shuffle([...matchGroup]).slice(0, answerCount);
    selectedMatches.forEach((f: RegionFeature) => {
      calls.push(createCallItem(startFeature as RegionFeature, f, true));
    });
  }

  // 5. 나머지 오답 콜로 채우기
  const remainCount = CALLS_PER_BATCH - calls.length;
  if (wrongGroup.length > 0 && remainCount > 0) {
    const selectedWrongs = shuffle([...wrongGroup]).slice(0, remainCount);
    selectedWrongs.forEach((f: RegionFeature) => {
      calls.push(createCallItem(startFeature as RegionFeature, f, false));
    });
  }

  // 6. 생성된 콜 리스트 순서 셔플
  return {
    id: `call_batch_${Date.now()}`,
    type: 'CALL_FILTER',
    calls: shuffle(calls)
  };
};

function getCentroid(feature: RegionFeature): [number, number] {
  // 인텔 데이터에 저장된 centroid가 있으면 우선 사용, 없으면 d3-geo의 geoCentroid 계산
  if (feature.properties.centroid) {
    return feature.properties.centroid;
  }
  return geoCentroid(feature as any);
}

function createCallItem(startFeature: RegionFeature, destFeature: RegionFeature, isMatchingRoute: boolean): CallItem {
  const startCentroid = getCentroid(startFeature);
  const destCentroid = getCentroid(destFeature);
  const dist = calculateDistanceKm(startCentroid, destCentroid);
  
  // 운임비 가설 계산 (기본 1만원 + km당 1500원 + 약간의 랜덤 변동)
  const baseFare = 10000 + (dist * 1500);
  const randomVariance = (Math.random() * 0.2 - 0.1); // -10% ~ +10%
  const finalFare = Math.round((baseFare * (1 + randomVariance)) / 1000) * 1000; // 천원 단위 반올림

  return {
    id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    startRegion: {
      code: startFeature.properties.code,
      name: startFeature.properties.name,
      centroid: startCentroid
    },
    targetRegion: {
      code: destFeature.properties.code,
      name: destFeature.properties.name,
      centroid: destCentroid
    },
    distanceKm: dist,
    fare: finalFare,
    isMatchingRoute
  };
}
