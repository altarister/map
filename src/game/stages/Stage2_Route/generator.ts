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

  const { driverFeature, driverCentroid, matchDestGroup, wrongDestGroup, validPickups } = getMapContext(
    mapData, targetDestCode, currentStartCode || currentLocCode, maxPickupDistanceKm
  );

  const calls: CallItem[] = [];

  // 4. 정답 콜 1~2개 무조건 포함 (방향 O, 상차거리 O, 요금 O)
  const answerCount = matchDestGroup.length > 0 ? (Math.random() > 0.5 ? 2 : 1) : 0;

  for (let i = 0; i < answerCount; i++) {
    const dest = matchDestGroup[Math.floor(Math.random() * matchDestGroup.length)];
    const pickup = validPickups[Math.floor(Math.random() * validPickups.length)];
    calls.push(createCallItem(pickup, dest, driverCentroid, true, minFare, 'PERFECT', validPickups, matchDestGroup));
  }

  // 5. 나머지 함정(오답) 오더 채우기
  const remainCount = CALLS_PER_BATCH - calls.length;
  for (let i = 0; i < remainCount; i++) {
    const trapType = Math.random();
    
    if (trapType < 0.5 || wrongDestGroup.length === 0) {
      if (matchDestGroup.length > 0) {
        // 함정 1: 요금 미달 똥콜 (노선 O, 상차거리 O, 요금 X)
        const dest = matchDestGroup[Math.floor(Math.random() * matchDestGroup.length)];
        const pickup = validPickups[Math.floor(Math.random() * validPickups.length)];
        calls.push(createCallItem(pickup, dest, driverCentroid, true, minFare, 'BAD_FARE', validPickups, matchDestGroup));
      }
    } 
    else {
      // 함정 2: 역방향 오답콜 (노선 X)
      const dest = wrongDestGroup[Math.floor(Math.random() * wrongDestGroup.length)];
      const pickup = validPickups[Math.floor(Math.random() * validPickups.length)];
      calls.push(createCallItem(pickup, dest, driverCentroid, false, minFare, 'PERFECT', validPickups, wrongDestGroup));
    }
  }

  const finalCalls = shuffle(calls);

  return {
    id: `call_batch_${Date.now()}`,
    type: 'CALL_FILTER',
    calls: finalCalls,
    driverLocation: {
      code: driverFeature.properties.code,
      name: driverFeature.properties.name,
      centroid: driverCentroid
    }
  };
};

function getMapContext(mapData: RegionFeature[], targetDestCode: string, locTarget?: string, maxPickupDistanceKm: number = 15) {
  // 1. 기사의 현위치 설정 (currentLocCode로 시작하는 지역 중 랜덤, 없으면 전체 랜덤)
  let driverFeature = mapData.find(f => f.properties.code === locTarget);
  
  // 1.1 행정구역 코드가 구/동 단위일 때 0으로 끝나는 시 단위 코드(예: 성남시 41130)를 안전하게 찾기 위한 Prefix화
  const locPrefix = locTarget ? locTarget.replace(/0+$/, '') : '';

  if (!driverFeature && locPrefix) {
    const candidates = mapData.filter(f => f.properties.code.startsWith(locPrefix));
    if (candidates.length > 0) {
      driverFeature = candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  if (!driverFeature) {
    driverFeature = mapData[Math.floor(Math.random() * mapData.length)];
  }
  const driverCentroid = getCentroid(driverFeature);

  // 2. 하차지 그룹 (정답 방향 vs 오답 방향)
  const destPrefix = targetDestCode === 'ALL' ? '' : targetDestCode.replace(/0+$/, '');
  const matchDestGroup = destPrefix ? mapData.filter(f => f.properties.code.startsWith(destPrefix)) : mapData;
  const wrongDestGroup = destPrefix ? mapData.filter(f => !f.properties.code.startsWith(destPrefix)) : [];

  // 3. 상차지(Pickup) 거리별 사전 분류
  const pickupCandidates = mapData.map(f => ({
    feature: f,
    dist: calculateDistanceKm(driverCentroid, getCentroid(f))
  }));

  let validPickups = pickupCandidates.filter(p => p.dist <= maxPickupDistanceKm).map(p => p.feature);

  // Fallback 처리
  if (validPickups.length === 0) validPickups = mapData;

  return { driverFeature, driverCentroid, matchDestGroup, wrongDestGroup, validPickups };
}

export const generateSingleCall = (
  ctx: StageContext,
  targetDestCode: string,
  currentStartCode?: string,
  isCorrectProb: number = 0.2
): CallItem => {
  const { mapData, currentLocCode, maxPickupDistanceKm = 15, minFare = 30000 } = ctx;

  const { driverCentroid, matchDestGroup, wrongDestGroup, validPickups } = getMapContext(
    mapData, targetDestCode, currentStartCode || currentLocCode, maxPickupDistanceKm
  );

  const isAnswer = Math.random() < isCorrectProb;
  const destGroup = isAnswer && matchDestGroup.length > 0 ? matchDestGroup : (wrongDestGroup.length > 0 ? wrongDestGroup : matchDestGroup);
  
  const dest = destGroup[Math.floor(Math.random() * destGroup.length)];
  const pickup = validPickups[Math.floor(Math.random() * validPickups.length)];

  if (isAnswer) {
    return createCallItem(pickup, dest, driverCentroid, true, minFare, 'PERFECT', validPickups, destGroup);
  } else {
    // 오답 콜 중 50%는 요금 미달 똥콜, 50%는 역방향
    const trapType = Math.random() < 0.5 ? 'BAD_FARE' : 'PERFECT';
    const isMatchingRoute = trapType === 'BAD_FARE'; // 똥콜은 방향은 맞게 할 수 있음
    
    // 만약 똥콜이면 하차지는 matchDestGroup에서 고름 (방향 일치)
    const trapDest = (trapType === 'BAD_FARE' && matchDestGroup.length > 0) 
      ? matchDestGroup[Math.floor(Math.random() * matchDestGroup.length)] 
      : dest;

    return createCallItem(pickup, trapDest, driverCentroid, isMatchingRoute, minFare, trapType, validPickups, trapType === 'BAD_FARE' ? matchDestGroup : wrongDestGroup);
  }
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
  trapType: 'PERFECT' | 'BAD_FARE',
  validPickups: RegionFeature[] = [],
  destGroup: RegionFeature[] = []
): CallItem {
  const pickupCentroid = getCentroid(pickupFeature);
  const destCentroid = getCentroid(destFeature);
  
  const pickupDistanceKm = calculateDistanceKm(driverCentroid, pickupCentroid);
  const distanceKm = calculateDistanceKm(pickupCentroid, destCentroid);

  let fare = 10000 + (distanceKm * 1500) + (Math.random() * 5000);

  if (trapType === 'PERFECT') {
    // 요금 통과 (최소 요금보다 무조건 3000원 이상 많게)
    fare = Math.max(fare, minFare + 3000 + (Math.random() * 5000));
  } else if (trapType === 'BAD_FARE') {
    // 똥콜 (최소 요금의 60~90% 수준으로 확정)
    fare = minFare * (0.6 + Math.random() * 0.3);
  }

  const finalFare = Math.floor(fare / 1000) * 1000;

  let violation: 'BAD_FARE' | 'WRONG_DEST' | undefined = undefined;
  if (!isMatchingRoute) {
    violation = 'WRONG_DEST';
  } else if (trapType === 'BAD_FARE') {
    violation = 'BAD_FARE';
  }

  // 확률 기반 신규 속성 부여
  const isShared = Math.random() < 0.3; // 30% 공유 오더
  const isExpress = Math.random() < 0.15; // 15% 급송 오더 (고단가/합짐불가)

  const paymentTypes: Array<'신용' | '선불' | '착불' | '월결'> = ['신용', '선불', '착불', '월결'];
  const randomPaymentType = paymentTypes[Math.floor(Math.random() * paymentTypes.length)];

  const billingTypes: Array<'계산서' | '인수증' | '무과세'> = ['계산서', '인수증', '무과세'];
  const randomBillingType = billingTypes[Math.floor(Math.random() * billingTypes.length)];

  const randomStatus = '신규'; // 기본값 (추후 고도화 가능)

  const vehicleOptions = ['오', '다', '라', '1t'];
  const randomVehicle = vehicleOptions[Math.floor(Math.random() * vehicleOptions.length)];

  const itemOptions = ['박스 1개', '서류봉투', '쇼핑백 2개', '소형 가전', '샘플 박스', '마대 1개'];
  const randomItem = itemOptions[Math.floor(Math.random() * itemOptions.length)];

  // 급송 팩터가 뽑혔다면 무조건 확정 급송, 아니면 대개 보통
  const categoryOptions = ['보통', '보통', '예약'];
  const randomCategory = isExpress ? '급송' : categoryOptions[Math.floor(Math.random() * categoryOptions.length)];

  // 경유콜 팩터 (25% 확률)
  const isWaypoint = Math.random() < 0.25;
  let pickupCount = 1;
  let dropoffCount = 1;

  if (isWaypoint) {
    // 경유콜이면 30% 확률로 상차 2곳, 70% 확률로 하차 2~3곳
    if (Math.random() < 0.3) {
      pickupCount = 2;
    } else {
      dropoffCount = Math.random() < 0.7 ? 2 : 3;
    }
  }

  // 복수 경유 텍스트 조합용 헬퍼
  const getCombinedName = (baseFeature: RegionFeature, featureGroup: RegionFeature[], count: number) => {
    let name = baseFeature.properties.name;
    if (count === 2 && featureGroup.length > 1) {
      // "+다른동" 추가
      const others = featureGroup.filter(f => f.properties.code !== baseFeature.properties.code);
      if (others.length > 0) {
        const extra = others[Math.floor(Math.random() * others.length)].properties.name;
        name = `${name}+${extra}`;
      } else {
        name = `${name} 외1곳`;
      }
    } else if (count >= 2) {
      name = `${baseFeature.properties.SIG_KOR_NM || baseFeature.properties.name}${count}곳`;
    }
    return name;
  };

  const finalStartName = getCombinedName(pickupFeature, validPickups, pickupCount);
  const finalTargetName = getCombinedName(destFeature, destGroup, dropoffCount);

  const companyOptions = ['태양메디스', '엠케이미디어', '씨엠파크-백암', '하나로유통', '부일물산', '한국부품', 'LG로지스'];
  const randomCompany = companyOptions[Math.floor(Math.random() * companyOptions.length)];

  const pHour = Math.floor(Math.random() * 8) + 8; // 08 ~ 15
  const pMin = Math.floor(Math.random() * 60);
  const dHour = pHour + Math.floor(Math.random() * 3) + 1;
  const dMin = Math.floor(Math.random() * 60);
  const randomPickupTime = `${pHour.toString().padStart(2, '0')}:${pMin.toString().padStart(2, '0')}`;
  const randomDeliveryTime = `${dHour.toString().padStart(2, '0')}:${dMin.toString().padStart(2, '0')}`;

  const getFullName = (f: RegionFeature, customName?: string): string => {
    const props = f.properties as any;
    const doName = props.code.startsWith('11') ? '서울' : props.code.startsWith('41') ? '경기' : props.code.startsWith('28') ? '인천' : (props.grandParentName || '경기');
    
    // 만약 customName(예: 포곡읍+왕산리)이 전달되었다면 EMD_KOR_NM 등 대신 customName 사용
    if (customName) {
      if (props.SIG_KOR_NM) return `${doName} / ${props.SIG_KOR_NM} / ${customName}`;
      return `${doName} / ${props.parentName || ''} / ${customName}`;
    }

    if (props.SIG_KOR_NM) {
      if (props.EMD_KOR_NM) return `${doName} / ${props.SIG_KOR_NM} / ${props.EMD_KOR_NM}`;
      return `${doName} / ${props.SIG_KOR_NM} / ${props.name}`;
    }
    return `${doName} / ${props.parentName || ''} / ${props.name}`;
  };

  return {
    id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    startRegion: {
      code: pickupFeature.properties.code,
      name: finalStartName,
      fullName: getFullName(pickupFeature, finalStartName),
      centroid: pickupCentroid
    },
    targetRegion: {
      code: destFeature.properties.code,
      name: finalTargetName,
      fullName: getFullName(destFeature, finalTargetName),
      centroid: destCentroid
    },
    pickupDistanceKm,
    distanceKm,
    status: randomStatus,
    isShared,
    isExpress,
    isWaypoint,
    pickupCount,
    dropoffCount,
    paymentType: randomPaymentType,
    billingType: randomBillingType,
    vehicleType: randomVehicle,
    itemDescription: randomItem,
    callCategory: randomCategory,
    companyName: randomCompany,
    pickupTime: randomPickupTime,
    deliveryTime: randomDeliveryTime,
    fare: finalFare,
    isMatchingRoute,
    violation
  };
}
