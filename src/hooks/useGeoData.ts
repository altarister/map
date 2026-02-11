import { useState, useEffect } from 'react';
import type { RegionCollection, RegionFeature } from '../types/geo';

export const useGeoData = () => {
  const [data, setData] = useState<RegionCollection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 두 개의 데이터 파일 병렬 로드
        // 1. 시/군/구 데이터 (구가 있는 시를 위해 필요)
        // 2. 읍/면/동 데이터 (구가 없는 시를 위해 필요, 33MB)
        const [munResponse, subResponse] = await Promise.all([
          fetch('./data/skorea-municipalities-2018-geo.json'),
          fetch('./data/skorea-submunicipalities-2018-geo.json')
        ]);
        
        if (!munResponse.ok || !subResponse.ok) {
          throw new Error('Failed to load GeoJSON data');
        }
        
        const munData = await munResponse.json() as RegionCollection;
        const subData = await subResponse.json() as RegionCollection;

        // 1. 구(Gu) 단위 데이터 확보 (경기도 '31' + 이름이 '구'로 끝나는 지역)
        // 예: 수원시 장안구, 성남시 분당구, 안산시 단원구, 고양시 덕양구 등
        const guFeatures = munData.features.filter((feature: RegionFeature) => {
          const code = feature.properties.code;
          const name = feature.properties.name;
          return code.startsWith('31') && name.endsWith('구');
        }).map((feature: RegionFeature) => {
             // "안산시단원구" -> "안산시 단원구" 공백 삽입
             const name = feature.properties.name;
             const match = name.match(/^(.+시)(.+구)$/);
             if (match) {
                 feature.properties.name = `${match[1]} ${match[2]}`;
             }
             return feature;
        });

        // '구' 코드를 Set으로 저장하여 하위 읍면동 필터링에 사용
        const guCodes = new Set(guFeatures.map(f => f.properties.code));

        // 시/군 코드 -> 이름 매핑 생성 (예: 31250 -> 광주시)
        const cityMap: Record<string, string> = {};
        munData.features.forEach(f => {
          const code = f.properties.code; 
          if (code.length === 5) {
            cityMap[code] = f.properties.name;
          }
        });

        // 2. 읍/면/동(Eup/Myeon/Dong) 단위 데이터 확보 (경기도 '31')
        // 단, 이미 '구' 단위로 확보된 지역의 하위 읍면동은 제외
        const dongFeatures = subData.features.filter((feature: RegionFeature) => {
          const code = feature.properties.code;
          // 경기도 코드 체크
          if (!code.startsWith('31')) return false;

          const parentCode = code.substring(0, 5);
          
          // 상위 코드가 guCodes에 있다면(=구가 있는 시), 읍면동 데이터는 제외 (구 단위로 표시할 것이므로)
          if (guCodes.has(parentCode)) return false;

          // 이름 포맷팅: '초월읍' -> '광주시 초월읍'
          const cityName = cityMap[parentCode];
          if (cityName) {
            // 이미 시 이름이 포함되어 있는지 확인 (중복 방지)
            if (!feature.properties.name.startsWith(cityName)) {
               feature.properties.name = `${cityName} ${feature.properties.name}`;
            }
          }

          return true;
        });
        
        // 3. 데이터 병합
        const combinedFeatures = [...guFeatures, ...dongFeatures];
        
        setData({
          type: 'FeatureCollection',
          features: combinedFeatures
        });
        
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};
