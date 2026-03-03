# Map Data Update Report: "태전동" (Taejeon-dong) Issue Resolved

## 1. Issue History

초기 개발 단계에서 광주시의 **"태전동"**, "오포1동", "벌원동" 등 일부 지역이 지도에서 누락되는 현상이 보고되었습니다. 당시 조사 결과, 이는 2018년도 기준의 과거 **'행정동'** 지리 데이터(약 3,504개 구역)를 사용하고 있었기 때문에, 그 이후에 행정 개편으로 나뉘거나 변경된, 혹은 일상적으로 쓰이지만 행정동 구조와 불일치하는 **'법정동'** 데이터를 담지 못하는 한계 때문이었습니다.

## 2. Resolution (2024 Update)

해당 이슈는 최근 데이터 파이프라인 개편을 통해 **완벽히 해결되었습니다.**

기존의 2018년도 행정동(`.geojson`) 데이터를 전량 폐기하고, 최신 VWorld 기반의 **'법정동 (Bupjeong-dong)' 파일(`gyeonggi_bupjeongdong.geojson`)** 및 파이썬 맵핑 스크립트를 새로 도입해 적용했습니다.

### 적용된 주요 변경 사항 (`useGeoData.ts`)

```typescript
// AS-IS: 행정동 기반 (과거)
// const DATA_URL_LEVEL3 = '/data/skorea-submunicipalities-2018-geo.json';

// TO-BE: 법정동 기반 (현재 사용 중)
const DATA_URL_LEVEL3 = "/data/gyeonggi_bupjeongdong.geojson";
```

## 3. 결론 (Conclusion)

이제 광주시 "태전동"을 포함해, 유저들이 실생활에서 사용하는 고유 지명인 대다수의 '법정동' 경계가 문제 없이 지도에 렌더링되며 1DAL Trainer의 문제로도 정상 출제됩니다.

_본 문서는 과거 누락 이슈 트래킹을 위해 "해결됨(Resolved)" 상태로 스냅샷 보존됩니다._
