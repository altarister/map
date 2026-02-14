import { useState, useEffect } from 'react';
import type { RegionCollection } from '../types/geo';
import { log } from '../lib/debug';

// GeoJSON Data URLs
const DATA_URL_LEVEL2 = '/data/skorea-municipalities-2018-geo.json'; // Sigun (City/County)
const DATA_URL_LEVEL3 = '/data/skorea-submunicipalities-2018-geo.json'; // Emd (Town/District) - Detailed

export const useGeoData = () => {
  const [data, setData] = useState<RegionCollection | null>(null);
  const [level2Data, setLevel2Data] = useState<RegionCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        log.data("[useGeoData] Starting data load...");
        setLoading(true);

        // Load both levels in parallel
        const [response2, response3] = await Promise.all([
          fetch(DATA_URL_LEVEL2),
          fetch(DATA_URL_LEVEL3)
        ]);

        if (!response2.ok) throw new Error(`Failed to load Level 2 data: ${response2.statusText}`);
        if (!response3.ok) throw new Error(`Failed to load Level 3 data: ${response3.statusText}`);

        const level2 = await response2.json();
        const level3 = await response3.json();

        log.data(`[useGeoData] Loaded Level 2: ${level2.features.length} features`);
        log.data(`[useGeoData] Loaded Level 3: ${level3.features.length} features`);

        // Gyeonggi-do code prefix: 31 (based on previous code)
        // Check first feature to confirm
        if (level2.features.length > 0) {
          const firstCode = level2.features[0].properties.code;
          log.data(`[useGeoData] First region code: ${firstCode}`);
        }

        const targetPrefix = '31'; // Previously used 31

        const filteredLevel2 = level2.features.filter((f: any) =>
          f.properties.code.startsWith(targetPrefix)
        );

        const filteredLevel3 = level3.features.filter((f: any) =>
          f.properties.code.startsWith(targetPrefix)
        );

        log.data(`[useGeoData] Filtered Level 2 (Gyeonggi): ${filteredLevel2.length}`);
        log.data(`[useGeoData] Filtered Level 3 (Gyeonggi): ${filteredLevel3.length}`);

        // ------------------------------------------------------------------
        // [Data Enrichment] Level 3 데이터에 상위 행정구역(Level 2) 이름 주입
        // ------------------------------------------------------------------

        // 1. Level 2 코드 -> 이름 매핑 생성
        const parentMap = new Map<string, string>();
        filteredLevel2.forEach((f: any) => {
          // Level 2 코드 (예: "41111") -> 이름 (예: "수원시 장안구")
          // properties.name에 이름이 있다고 가정
          if (f.properties.code && f.properties.name) {
            parentMap.set(f.properties.code, f.properties.name);
          }
        });

        // 2. Level 3 데이터에 주입
        filteredLevel3.forEach((f: any) => {
          const code = f.properties.code;
          // Level 3 코드의 앞 5자리가 Level 2 코드와 일치한다고 가정 (표준)
          // 예: "41111560" -> "41111"
          if (code && code.length >= 5) {
            const parentCode = code.substring(0, 5);
            const parentName = parentMap.get(parentCode);

            if (parentName) {
              f.properties.SIG_KOR_NM = parentName; // 시군구 이름
              f.properties.EMD_KOR_NM = f.properties.name; // 읍면동 이름 (기본 name)

              // 디버깅용 로그 (첫 번째 아이템만)
              if (f === filteredLevel3[0]) {
                log.data(`[useGeoData] Enriched First Feature: ${parentName} ${f.properties.name}`);
              }
            }
          }
        });

        setLevel2Data({ ...level2, features: filteredLevel2 });
        setData({ ...level3, features: filteredLevel3 });

      } catch (err) {
        console.error("[useGeoData] Error loading data:", err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { data, level2Data, loading, error };
};
