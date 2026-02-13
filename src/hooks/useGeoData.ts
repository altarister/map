import { useState, useEffect } from 'react';
import type { RegionCollection } from '../types/geo';

export const useGeoData = () => {
  // Level 3 (읍/면/동) - 상세 데이터
  const [data, setData] = useState<RegionCollection | null>(null);
  // Level 2 (시/군/구) - 기본 데이터
  const [level2Data, setLevel2Data] = useState<RegionCollection | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("[useGeoData] Starting data load...");

        // 두 개의 데이터 파일 병렬 로드
        const [munResponse, subResponse] = await Promise.all([
          fetch('./data/skorea-municipalities-2018-geo.json'),    // Level 2
          fetch('./data/skorea-submunicipalities-2018-geo.json')  // Level 3
        ]);

        if (!munResponse.ok || !subResponse.ok) {
          throw new Error(`Failed to load GeoJSON data: Mun=${munResponse.status}, Sub=${subResponse.status}`);
        }

        const munData = await munResponse.json() as RegionCollection;
        const subData = await subResponse.json() as RegionCollection;

        console.log(`[useGeoData] Loaded Level 2: ${munData.features.length} features`);
        console.log(`[useGeoData] Loaded Level 3: ${subData.features.length} features`);

        // ----------------------------------------------------
        // [REFACTOR] Pure Data Loading (No Filtering)
        // ----------------------------------------------------

        // Level 2: 시/군/구
        // 경기도(31)만 필터링 (일단 경기도 게임이니까)
        const gyeonggiLevel2 = {
          type: munData.type,
          features: munData.features.filter(f => String(f.properties.code).startsWith('31'))
        };

        // Level 3: 읍/면/동
        // 경기도(31)만 필터링
        const gyeonggiLevel3 = {
          type: subData.type,
          features: subData.features.filter(f => String(f.properties.code).startsWith('31'))
        };

        console.log(`[useGeoData] Filtered Level 2 (Gyeonggi): ${gyeonggiLevel2.features.length}`);
        console.log(`[useGeoData] Filtered Level 3 (Gyeonggi): ${gyeonggiLevel3.features.length}`);

        // ⚠️ CRITICAL: Create NEW object references to bypass WeakMap caching
        // The library uses WeakMap caching based on object reference
        // We need to ensure Level 2 and Level 3 have different references
        setLevel2Data(JSON.parse(JSON.stringify(gyeonggiLevel2)));
        setData(JSON.parse(JSON.stringify(gyeonggiLevel3)));

      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, level2Data, loading, error };
};
