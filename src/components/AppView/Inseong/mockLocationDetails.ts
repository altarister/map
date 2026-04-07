import type { LocationDetailInfo } from '../../../types/dispatch';

// 목업 상세 정보 10개 (순차적으로 꺼내 쓰기 위한 풀)
// 전화번호: 010-2684-8748 고정, 주소: 실제 한국 주소 기반
export const MOCK_LOCATION_DETAILS: LocationDetailInfo[] = [
  {
    customerName: '*레드캠프',
    department: '정실장님',
    contactName: '정종혁차장',
    mileage: 0,
    phone1: '010-2684-8748',
    phone2: '031-267-1224',
    region: '경기 화성시',
    addressDetail: '경기 화성시 안녕동 158-95(경기 화성시 안녕남로119번길 25)',
  },
  {
    customerName: 'SK스토아 홈쇼핑(5층하차',
    department: '*',
    contactName: '*',
    mileage: 0,
    phone1: '010-2684-8748',
    phone2: '*',
    region: '서울 마포구',
    addressDetail: '서울 마포구 상암동 1601 (서울 마포구 월드컵북로 402)KGIT센터',
  },
  {
    customerName: '쿠팡 로지스틱스',
    department: '물류팀',
    contactName: '김대리',
    mileage: 3,
    phone1: '010-2684-8748',
    phone2: '02-1577-7011',
    region: '경기 광주시',
    addressDetail: '경기 광주시 오포읍 능평리 50-1 (경기 광주시 오포로 89)',
  },
  {
    customerName: 'CJ대한통운 허브',
    department: '배송1팀',
    contactName: '박과장',
    mileage: 5,
    phone1: '010-2684-8748',
    phone2: '032-560-5500',
    region: '인천 서구',
    addressDetail: '인천 서구 오류동 1547 (인천 서구 봉수대로 966)인천신항 물류센터',
  },
  {
    customerName: '롯데택배 성남HUB',
    department: '*',
    contactName: '이차장',
    mileage: 0,
    phone1: '010-2684-8748',
    phone2: '*',
    region: '경기 성남시',
    addressDetail: '경기 성남시 중원구 상대원동 5442 (경기 성남시 중원구 둔촌대로 388)',
  },
  {
    customerName: '한진택배 용인센터',
    department: '허브관리팀',
    contactName: '최주임',
    mileage: 2,
    phone1: '010-2684-8748',
    phone2: '031-339-5555',
    region: '경기 용인시',
    addressDetail: '경기 용인시 기흥구 보정동 1190 (경기 용인시 기흥구 흥덕중앙로 55)',
  },
  {
    customerName: '네이버 1784',
    department: '시설관리',
    contactName: '홍매니저',
    mileage: 10,
    phone1: '010-2684-8748',
    phone2: '1588-3820',
    region: '경기 성남시',
    addressDetail: '경기 성남시 분당구 정자동 178-4 (경기 성남시 분당구 정자일로 95)',
  },
  {
    customerName: '이마트 트레이더스 하남점',
    department: '식품팀',
    contactName: '강사원',
    mileage: 0,
    phone1: '010-2684-8748',
    phone2: '031-790-8000',
    region: '경기 하남시',
    addressDetail: '경기 하남시 신장동 516 (경기 하남시 미사대로 750)스타필드 하남',
  },
  {
    customerName: '삼성전자 수원캠퍼스',
    department: 'DS사업부',
    contactName: '윤부장',
    mileage: 15,
    phone1: '010-2684-8748',
    phone2: '031-200-1114',
    region: '경기 수원시',
    addressDetail: '경기 수원시 영통구 매탄동 416 (경기 수원시 영통구 삼성로 129)',
  },
  {
    customerName: '카카오 판교오피스',
    department: '총무팀',
    contactName: '서대리',
    mileage: 7,
    phone1: '010-2684-8748',
    phone2: '1577-3754',
    region: '경기 성남시',
    addressDetail: '경기 성남시 분당구 삼평동 681 (경기 성남시 분당구 판교역로 235)',
  },
];

// 순차적으로 꺼내 쓰기 위한 인덱스 카운터
let pickupIdx = 0;
let dropoffIdx = 5; // 도착지는 다른 인덱스에서 시작하여 다양성 확보

export const getNextPickupDetail = (): LocationDetailInfo => {
  const detail = MOCK_LOCATION_DETAILS[pickupIdx % MOCK_LOCATION_DETAILS.length];
  pickupIdx++;
  return detail;
};

export const getNextDropoffDetail = (): LocationDetailInfo => {
  const detail = MOCK_LOCATION_DETAILS[dropoffIdx % MOCK_LOCATION_DETAILS.length];
  dropoffIdx++;
  return detail;
};
