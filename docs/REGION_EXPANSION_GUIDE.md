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

## 2. 4계층 데이터 파이프라인

```
[원본 다운로드]                    [가공 스크립트]              [런타임 데이터]
download/notUsed/                scripts/                    mapData/
skorea-provinces-*.json    →  (필터링)              →  {region}_provinces.geojson
skorea-municipalities-*.json  ┬→ merge_cities.js     →  {region}_municipalities_merged.geojson
                              └→ (런타임 직접 fetch)  →  download/skorea-municipalities-*.json
skorea-submunicipalities-*.json → merge_intel_to_geo.js → merged_map.geojson
scripts/data/intel/*.json     ↗
```

---

## 3. 새 지역 추가 절차 (예: 인천 추가)

### Step 1: 광역 자치단체 폴리곤 확인
`useGeoData.ts`에서 `skorea-provinces-2018-geo.json`을 사용하여 인천(코드 `23`)의 광역 폴리곤을 런타임에 필터링. **별도 파일 생성 불필요** — 코드에서 `provinces` 데이터를 로드하면 됨.

### Step 2: 시/군/자치구 확인
`skorea-municipalities-2018-geo.json`에 인천 10개 자치구가 이미 존재 (코드 `23xxx`). 현재 코드가 `code.startsWith(prefix)`로 필터링하므로 **추가 작업 없음**.

### Step 3: 읍/면/동 데이터 가공
```bash
# 1. 원본에서 인천 읍면동 추출
jq '{type: "FeatureCollection", features: [.features[] | select(.properties.code[:2] == "23")]}' \
  public/download/notUsed/skorea-submunicipalities-2018-geo.json \
  > /tmp/incheon_dong_raw.geojson

# 2. 인텔 데이터 작성 (scripts/data/intel/23010_junggu.json 등)
# 3. merge_intel_to_geo.js 실행하여 merged_map.geojson에 병합
node scripts/merge_intel_to_geo.js
```

### Step 4: useGeoData.ts 코드 수정
현재 광역 자치단체 로딩이 `gyeonggi_level1_merged.geojson` + `seoul_incheon_level1.geojson`을 하드코딩하고 있음. 이를 **전국 provinces 파일 하나로 통일**하면 새 지역 추가 시 코드 수정이 불필요해짐.

```typescript
// Before (하드코딩)
fetch('/mapData/gyeonggi_level1_merged.geojson')
fetch('/download/seoul_incheon_level1.geojson')

// After (전국 통합 — 향후 목표)
fetch('/download/notUsed/skorea-provinces-2018-geo.json')
// → 런타임에서 활성화된 지역만 필터링
```

---

## 4. 파일 관리 기준

| 폴더 | 내용 | 규칙 |
|------|------|------|
| `download/` | 코드가 런타임에 fetch하는 원본 | **수정 금지**, 코드에서 직접 참조 |
| `download/notUsed/` | 보관용 원본 | 스크립트 입력으로만 사용 |
| `mapData/` | AI 스크립트로 가공한 데이터 | 스크립트로 **재생성 가능**해야 함 |
| `scripts/data/intel/` | 인텔 소스 데이터 | 빌드 시점에만 사용, 브라우저 노출 안 됨 |

---

> [!CAUTION]
> **현재 구현의 레거시 비대칭성**
> 현재 `useGeoData.ts` 코드를 보면, 광역 자치단체(Level 1)를 그릴 때 지역마다 방식이 다릅니다:
> - **경기도**: `gyeonggi_level1_merged.geojson`(경기도 31개 시/군 폴리곤)를 로드한 뒤, 런타임에 브라우저에서 `turf.union`으로 31개를 합쳐서 1개의 "경기도" 광역 폴리곤을 만듭니다. (비효율적)
> - **서울/인천**: `seoul_incheon_level1.geojson`이라는, 이미 1개 통짜로 가공된 파일을 별도로 로드합니다.

## 5. 향후 전국 통합 방향 (강력 권장 아키텍처)

위의 레거시 비대칭성을 해결하고 가장 빠르고 우아하게 전국으로 확대하려면, **계층별 원본 데이터를 브라우저가 직접 로드**하고 필터링만 수행하는 구조로 변경해야 합니다. 별도의 AI 추출 파일(`seoul_incheon_*.geojson` 등)은 모두 폐기(삭제)할 수 있습니다.

### 목표 아키텍처 (Ideal Architecture - 빌드 타임 사전 통합 방식)

| 계층 | 사용 원본 파일 (`/download/`) | 동작 방식 (useGeoData.ts) |
|---|---|---|
| **광역 자치단체** | `skorea-provinces-2018-geo.json` | 런타임에 대상 코드(e.g., `11`, `23`, `31`)만 `filter()` 하여 사용. (브라우저에서 `turf.union` 병합 로직 완전 삭제 가능!) |
| **시/군/구** | `skorea-municipalities-2018-geo.json` | 런타임 필터링 (이미 인천/서울은 이렇게 동작 중) |
| **시/군 (병합본)** | `korea-municipalities-merged.geojson` | 현 `gyeonggi_level1_merged.geojson`의 역할을 전국 단위로 확장. 스크립트(`bake_nationwide_maps.js`)를 통해 '일반구'가 있는 특례시들을 통짜로 합친 전국 파일 하나를 사전 생성. |
| **읍/면/법정동** | `merged_map.geojson` | `skorea-submunicipalities-2018-geo.json` 전체를 대상으로 인텔 데이터를 입력해 한 번에 퀴즈 데이터 생성. |

**이 파일 하나만 기억하세요:**
새로운 지역(예: 부산 `21`)을 추가할 때는, 지도를 새로 다운로드하거나 분리할 필요가 **전혀 없습니다.**
단지 `useGeoData.ts`의 `startsWith('11') || startsWith('23')` 같은 필터링 조건에 `'21'`을 추가하기만 하면 지도 준비는 끝납니다. (인텔 데이터만 추가하면 됨)
