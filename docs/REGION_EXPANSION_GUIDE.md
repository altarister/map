# 지역 추가 가이드 (Region Expansion Guide)

## 1. 전국 확대 가능성: ✅ 확인 완료

현재 `download/` 폴더의 원본 3개 파일이 **전국 17개 시도(코드 11~39)를 모두 포함**하고 있어, 경기도와 동일한 방식으로 어떤 시도든 추가 가능합니다.

### 원본 데이터 소스 (download/notUsed/)

| 파일 | 계층 | 전국 피처 수 | 역할 |
|------|------|-------------|------|
| `skorea-provinces-2018-geo.json` | **광역 자치단체** (Provinces) | 17개 | 광역 폴리곤 추출 |
| `skorea-municipalities-2018-geo.json` | **시/군/구** (Municipalities) | 250개 | 시/군 폴리곤 (실시간 fetch) |
| `skorea-submunicipalities-2018-geo.json` | **읍/면/동** (Sub-municipalities) | 3,504개 | 퀴즈 출제 데이터 |

### 시도 코드표

| 코드 | 시도 | 시/군/구 수 | 읍/면/동 수 |
|------|------|-----------|-----------|
| `11` | 서울 | 25 | 424 |
| `21` | 부산 | 16 | 220 |
| `22` | 대구 | 8 | 139 |
| `23` | 인천 | 10 | 151 |
| `24` | 광주 | 5 | 97 |
| `25` | 대전 | 5 | 79 |
| `26` | 울산 | 5 | 60 |
| `29` | 세종 | 1 | 1 |
| `31` | 경기 | 42 | 545 |
| `32` | 강원 | 18 | 195 |
| `33` | 충북 | 14 | 153 |
| `34` | 충남 | 16 | 206 |
| `35` | 전북 | 15 | 240 |
| `36` | 전남 | 22 | 356 |
| `37` | 경북 | 24 | 332 |
| `38` | 경남 | 22 | 305 |
| `39` | 제주 | 2 | 1 |

---

## 2. 데이터 파이프라인 및 스크립트 역할

```
[원본 데이터]                        [가공 스크립트]                   [런타임 데이터]
download/                           scripts/                        mapData/
skorea-provinces-2018-geo.json  ─────────────────────────────────→  (필터링만, 별도 가공 불필요)
skorea-municipalities-2018-geo  ──→ bake_nationwide_maps.js      →  korea-municipalities-merged.geojson
download/notUsed/                   generate_gyeonggi_bjd_data.py →  public/temp/gyeonggi_bupjeongdong.geojson
                                    merge_intel_to_geo.js         →  merged_map.geojson
                                    fetch_roads.js                →  download/korea-roads-topo.json
scripts/data/intel/*.json       ──→ merge_intel_to_geo.js (위 동일)
```

### 스크립트별 역할 정의

| 스크립트 | 언제 실행? | 입력 | 출력 | 비고 |
|---------|-----------|------|------|------|
| `bake_nationwide_maps.js` | 원본 행정구역 데이터 변경 시 | `download/skorea-municipalities-2018-geo.json` | `mapData/korea-municipalities-merged.geojson` | 일반구(수원시 권선구 등) 병합. `node scripts/bake_nationwide_maps.js` |
| `merge_intel_to_geo.js` | 새 지역 인텔 데이터 추가 시 | `public/temp/gyeonggi_bupjeongdong.geojson` + `scripts/data/intel/*.json` | `mapData/merged_map.geojson` | 퀴즈용 읍면동 폴리곤에 인텔 정보 주입. `node scripts/merge_intel_to_geo.js` |
| `generate_gyeonggi_bjd_data.py` | 새 지역 읍면동 폴리곤 필요 시 | VWorld API (인터넷 연결 필요) | `public/temp/gyeonggi_bupjeongdong.geojson` | `merge_intel_to_geo.js`의 입력 원본 생성. `python scripts/generate_gyeonggi_bjd_data.py [API_KEY]` |
| `fetch_roads.js` | 도로 데이터 갱신 시 | Overpass API (인터넷 연결 필요) | `download/korea-roads-topo.json` | 한국 주요 도로 (고속도로/국도/지방도) TopoJSON 생성. `node scripts/fetch_roads.js` |
| `generate_bjd_data.py` | **(사용 안 함)** | VWorld API | `public/data/gwangju_bupjeongdong.geojson` | 광주시 단일 구역 시험용 레거시 스크립트. 삭제 예정 |

> [!NOTE]
> **`merged_map.geojson`에 전국 데이터를 다 넣어도 될까?**
> 현재 `merged_map.geojson` 크기: 약 **18MB** (경기도 약 741개 폴리곤)
> 서울(424) + 인천(151) + 경기(741) 전체를 합쳐도 **1,316개** 폴리곤으로, 크기는 약 **25~30MB** 예상입니다.
> Vite의 코드 스플리팅과 브라우저 캐시(Cache-Control)를 사용하면 첫 로드 후 캐시되어 재요청이 없으므로 **허용 가능한 범위**입니다.
> 단, 전국(17개 시도, ~3,000+ 폴리곤)으로 확장 시 **100MB+ 예상**이라 TopoJSON 압축 변환 또는 동적 로딩 전략이 필요합니다.

---

## 3. 새 지역 추가 절차

### Step 1: 광역 자치단체 폴리곤
`useGeoData.ts`의 `ACTIVE_REGION_PREFIXES` 배열에 시도 코드 추가 (예: 부산 `'21'`).
- `skorea-provinces-2018-geo.json`에서 런타임 필터링하므로 **별도 파일 생성 불필요**.

### Step 2: 시/군/구 폴리곤
`skorea-municipalities-2018-geo.json`에 이미 전국 250개가 존재. `ACTIVE_REGION_PREFIXES` 추가만으로 자동 포함.
- **단, `bake_nationwide_maps.js` 재실행 필요** (새 코드 기준으로 병합본 재생성).

### Step 3: 읍/면/동 폴리곤 (퀴즈 데이터)
```bash
# 1. VWorld에서 해당 시도 읍면동 원본 수집
python scripts/generate_gyeonggi_bjd_data.py [VWORLD_API_KEY]
# (스크립트 내 attrFilter 코드를 추가 지역 코드로 수정 후 실행)

# 2. 인텔 데이터 작성
# scripts/data/intel/XXXXX_regionname.json 파일 작성

# 3. 폴리곤 + 인텔 병합
node scripts/merge_intel_to_geo.js
```

### Step 4: 사이드 이펙트 없음 확인
`npx tsc --noEmit` 로 타입 에러 없는지 확인 후 브라우저 테스트.

---

## 4. 파일 관리 기준

| 폴더 | 내용 | 규칙 |
|------|------|------|
| `download/` | 런타임에 브라우저가 직접 fetch하는 원본 데이터 | **수정 금지**, 코드에서 직접 참조 |
| `download/notUsed/` | 보관용 원본 (스크립트 입력용) | 브라우저에서 직접 로드 안 함 |
| `mapData/` | 스크립트로 생성한 가공 데이터 | 스크립트로 **재생성 가능**해야 함 |
| `scripts/data/intel/` | 인텔 소스 데이터 | 빌드 시점에만 사용, 브라우저 노출 안 됨 |

---

## 5. 현재 서비스 중인 지역 (2025.3 기준)

| 코드 | 지역 | 상태 |
|------|------|------|
| `11` | 서울 | ✅ 서비스 중 |
| `23` | 인천 | ✅ 서비스 중 |
| `31` / `41` | 경기도 (VWorld 코드 41로 런타임 변환) | ✅ 서비스 중 |
