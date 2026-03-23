import { calculateDistanceKm } from '../../../utils/geo';
import { geoCentroid } from 'd3-geo';
import type { StageContext, CallFilterQuestion, CallItem } from '../../core/types';
import type { RegionFeature } from '../../../types/geo';

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
  const { mapData, currentLocCode, maxPickupDistanceKm = 15, minFare = 30000 } = ctx;

  // 1. 기사의 현위치 설정 (currentLocCode 우선, 없으면 currentStartCode, 없으면 랜덤)
  let driverFeature = mapData.find(f => f.properties.code === (currentStartCode || currentLocCode));
  if (!driverFeature) {
    driverFeature = mapData[Math.floor(Math.random() * mapData.length)];
  }
  const driverCentroid = getCentroid(driverFeature);

  // 2. 하차지 그룹 (정답 방향 vs 오답 방향)
  const matchDestGroup = mapData.filter(f => f.properties.code.startsWith(targetDestCode));
  const wrongDestGroup = mapData.filter(f => !f.properties.code.startsWith(targetDestCode));

  const calls: CallItem[] = [];

  // 3. 정답 콜 1~2개 무조건 포함 (방향 O, 상차거리 O, 요금 O)
  const answerCount = matchDestGroup.length > 0 ? (Math.random() > 0.5 ? 2 : 1) : 0;

  for (let i = 0; i < answerCount; i++) {
    const dest = matchDestGroup[Math.floor(Math.random() * matchDestGroup.length)];
    let pickup = mapData[Math.floor(Math.random() * mapData.length)];
    // 상차 거리가 설정값 이내인 곳 찾기 (최대 20번 탐색)
    for(let j=0; j<20; j++) {
       const pDist = calculateDistanceKm(driverCentroid, getCentroid(pickup));
       if (pDist <= maxPickupDistanceKm) break;
       pickup = mapData[Math.floor(Math.random() * mapData.length)];
    }
    calls.push(createCallItem(pickup, dest, driverCentroid, true, minFare, 'PERFECT'));
  }

  // 4. 나머지 함정(오답) 오더 채우기
  const remainCount = CALLS_PER_BATCH - calls.length;
  for (let i = 0; i < remainCount; i++) {
    const trapType = Math.random();
    
    if (trapType < 0.33 && matchDestGroup.length > 0) {
      // 함정 1: 요금 미달 똥콜 (노선 O, 상차거리 O, 요금 X)
      const dest = matchDestGroup[Math.floor(Math.random() * matchDestGroup.length)];
      let pickup = mapData[Math.floor(Math.random() * mapData.length)];
      for(let j=0; j<20; j++) {
         const pDist = calculateDistanceKm(driverCentroid, getCentroid(pickup));
         if (pDist <= maxPickupDistanceKm) break;
         pickup = mapData[Math.floor(Math.random() * mapData.length)];
      }
      calls.push(createCallItem(pickup, dest, driverCentroid, true, minFare, 'BAD_FARE'));
    } 
    else if (trapType < 0.66 && matchDestGroup.length > 0) {
      // 함정 2: 상차거리 초과 똥콜 (노선 O, 상차거리 X, 요금 O)
      const dest = matchDestGroup[Math.floor(Math.random() * matchDestGroup.length)];
      let pickup = mapData[Math.floor(Math.random() * mapData.length)];
      for(let j=0; j<20; j++) {
         const pDist = calculateDistanceKm(driverCentroid, getCentroid(pickup));
         if (pDist > maxPickupDistanceKm + 3) break; // 의도적으로 멀리
         pickup = mapData[Math.floor(Math.random() * mapData.length)];
      }
      calls.push(createCallItem(pickup, dest, driverCentroid, true, minFare, 'FAR_PICKUP'));
    } 
    else {
      // 함정 3: 역방향 오답콜 (노선 X)
      const dest = wrongDestGroup[Math.floor(Math.random() * wrongDestGroup.length)];
      const pickup = mapData[Math.floor(Math.random() * mapData.length)];
      calls.push(createCallItem(pickup, dest, driverCentroid, false, minFare, 'PERFECT'));
    }
  }

  const finalCalls = shuffle(calls);

  return {
    id: `call_batch_${Date.now()}`,
    type: 'CALL_FILTER',
    calls: finalCalls
  };
};

function getCentroid(feature: RegionFeature): [number, number] {
  if (feature.properties.centroid) {
    return feature.properties.centroid;
  }
  return geoCentroid(feature as any);
}

// 팩토리: 조건에 맞게 요금 조작하여 CallItem 생성
function createCallItem(
  pickupFeature: RegionFeature, 
  destFeature: RegionFeature, 
  driverCentroid: [number, number],
  isMatchingRoute: boolean,
  minFare: number,
  trapType: 'PERFECT' | 'BAD_FARE' | 'FAR_PICKUP'
): CallItem {
  const pickupCentroid = getCentroid(pickupFeature);
  const destCentroid = getCentroid(destFeature);
  
  const pickupDistanceKm = calculateDistanceKm(driverCentroid, pickupCentroid);
  const distanceKm = calculateDistanceKm(pickupCentroid, destCentroid);

  let fare = 10000 + (distanceKm * 1500) + (Math.random() * 5000);

  if (trapType === 'PERFECT' || trapType === 'FAR_PICKUP') {
    // 요금 통과 (최소 요금보다 무조건 3000원 이상 많게)
    fare = Math.max(fare, minFare + 3000 + (Math.random() * 5000));
  } else if (trapType === 'BAD_FARE') {
    // 똥콜 (최소 요금의 60~90% 수준으로 확정)
    fare = minFare * (0.6 + Math.random() * 0.3);
  }

  const finalFare = Math.floor(fare / 1000) * 1000;

  let violation: 'BAD_FARE' | 'FAR_PICKUP' | 'WRONG_DEST' | undefined = undefined;
  if (!isMatchingRoute) {
    violation = 'WRONG_DEST';
  } else if (trapType === 'BAD_FARE') {
    violation = 'BAD_FARE';
  } else if (trapType === 'FAR_PICKUP') {
    violation = 'FAR_PICKUP';
  }

  return {
    id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    startRegion: {
      code: pickupFeature.properties.code,
      name: pickupFeature.properties.name,
      centroid: pickupCentroid
    },
    targetRegion: {
      code: destFeature.properties.code,
      name: destFeature.properties.name,
      centroid: destCentroid
    },
    pickupDistanceKm,
    distanceKm,
    fare: finalFare,
    isMatchingRoute,
    violation
  };
}
