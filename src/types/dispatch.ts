import type { RegionIntel } from './intel';

export interface LocationPoint {
    code: string;
    name: string;
    fullName: string;
    centroid: [number, number];
    intel?: RegionIntel; // OSRM 휴리스틱 연산용
}

// [신규] 출발지/도착지 팝업에서 긁어올 상세 정보 (운행일지 및 리뷰 작성용)
// 인성앱 "출발지 상세" / "도착지 상세" 팝업 기준 1:1 매핑
export interface LocationDetailInfo {
    customerName?: string;    // [고객] 상호/고객명 (예: "*레드캠프", "SK스토아 홈쇼핑(5층하차")
    department?: string;      // [부서] 부서명 (예: "정실장님", 빈 값일 경우 "*")
    contactName?: string;     // [담당] 담당자명 (예: "정종혁차장")
    mileage?: number;         // [마일리지] 마일리지 포인트 (예: 0)
    phone1?: string;          // [전화1] 대표 연락처 (예: "010-2228-4991")
    phone2?: string;          // [전화2] 보조 연락처 (예: "031-267-1224", 빈 값일 경우 "*")
    region?: string;          // [출발/도착] 광역 지역명 (예: "경기 화성시", "서울 마포구")
    addressDetail?: string;   // [위치] 상세 주소+건물명 (예: "경기 화성시 안녕동 158-95(경기 화성시 안녕남로119번길 25)")
    requestedTime?: string;   // 상차/하차 예약 시간 (확정 페이지에서 파싱, 예: "13:53")
    memo?: string;            // 현장 전달사항 (적요 등에서 추출)
}

export interface CallItem {
    id: string; // 고유 ID (UI 렌더링 키값 등)
    pickups: LocationPoint[];   // 상차지 배열 (1개 이상)
    dropoffs: LocationPoint[];  // 하차지 배열 (1개 이상)
    pickupDetails?: LocationDetailInfo[];  // [추가] 출발지 상세 정보 목록 (팝업 파싱)
    dropoffDetails?: LocationDetailInfo[]; // [추가] 도착지 상세 정보 목록 (팝업 파싱)
    pickupDistanceKm?: number;
    distanceKm: number;
    status?: string;          // 상태 (신규, 배차, 픽업, 완료, 등)
    isShared?: boolean;       // 공유 오더 여부 (출발지에 @ 표시)
    isExpress?: boolean;      // 급송 여부 (노란 바탕, 붉은 글씨, 합짐 불가)
    paymentType?: '신용' | '선불' | '착불' | '카드';     // 결제 방식 (신용/카드는 가상계좌(적립금) 차감, 선불/착불은 현금수수)
    billingType?: '계산서' | '인수증' | '무과세';        // 증빙 방식 (계산서는 파란 바탕)
    vehicleType?: string;     // 다, 라, 카, 마 (오토방/카고)
    itemDescription?: string; // 박스 1개, 서류 등
    callCategory?: string;    // 보통, 급행, 예약
    companyName?: string;     // 고객/상호명 (완료 탭 표기용)
    pickupTime?: string;      // 픽업 시간 (HH:MM)
    deliveryTime?: string;    // 예상 하차 시간 (HH:MM)
    fare: number;
    freightFee?: number;       // 탁송료 (0 또는 금액)
    recipientName?: string;    // 수신인 이름 (도착지 표시용)
    isMatchingRoute: boolean; // 유저 목표와 일치하는가?
    violation?: 'BAD_FARE' | 'WRONG_DEST';
}

// 자동배차 설정 인터페이스 (인성 기본 UI 완전 동기화)
export interface AutoDispatchFilter {
    allowWaypoint: boolean;       // 경유 허용 여부
    allowRoundTrip: boolean;      // 왕복 허용 여부
    pickupRadiusKm: number;       // 내위치 반경(km)
    minFare: number;              // 최소 운임
    maxFare: number;              // 최대 운임
    excludedKeywords: string;     // 제외 단어 (키워드 콤마 분리형)
    destinationKeywords: string;  // 도착지 단어 (키워드 콤마 분리형)
    customFilters: string[];      // 하단 빠른 설정 텍스트 (ex: "^^,@", "김포,인천...")
}
