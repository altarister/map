import { useState, useEffect } from 'react';
import type { RegionCollection, RoadCollection, RegionFeature } from '../types/geo';
import { log } from '../lib/debug';
import * as topojson from 'topojson-client';
import { geoCentroid } from 'd3-geo';

// GeoJSON Data URLs
const DATA_URL_LEVEL2 = '/data/skorea-municipalities-2018-geo.json'; // Sigun (City/County)
const DATA_URL_SEOUL_INCHEON_GU = '/data/seoul_incheon_gu.geojson'; // Seoul/Incheon Gu
const DATA_URL_LEVEL3 = '/data/gyeonggi_bupjeongdong.geojson'; // Bupjeong-dong/Ri (Terminal Nodes)
const DATA_URL_SEOUL_INCHEON_DONG = '/data/seoul_incheon_dong.geojson'; // Seoul/Incheon Dong
const DATA_URL_ROADS = '/data/korea-roads-topo.json?v=3'; // TopoJSON Roads

export const useGeoData = () => {
  const [data, setData] = useState<RegionCollection | null>(null);
  const [level1Data, setLevel1Data] = useState<RegionCollection | null>(null);
  const [cityData, setCityData] = useState<RegionCollection | null>(null);
  const [roadData, setRoadData] = useState<RoadCollection | null>(null);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0); // New: Loading Progress (0-100)
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        log.data("[useGeoData] Starting data load...");
        setLoading(true);
        setProgress(10); // Start

        // 1. Start fetching all resources
        const fetchLevel1 = fetch('/data/gyeonggi_level1_merged.geojson');
        const fetchLevel1SeoulIncheon = fetch('/data/seoul_incheon_level1.geojson');
        const fetchLevel2 = fetch(DATA_URL_LEVEL2);
        const fetchSeoulIncheonGu = fetch(DATA_URL_SEOUL_INCHEON_GU);
        const fetchLevel3 = fetch(DATA_URL_LEVEL3);
        const fetchSeoulIncheonDong = fetch(DATA_URL_SEOUL_INCHEON_DONG);
        const fetchRoads = fetch(DATA_URL_ROADS);

        // Await Level 1, 2 & 3 first (Essential for Game Logic)
        const [response1, response1SI, response2, responseSeoulIncheonGu, response3, responseSeoulIncheonDong] = await Promise.all([fetchLevel1, fetchLevel1SeoulIncheon, fetchLevel2, fetchSeoulIncheonGu, fetchLevel3, fetchSeoulIncheonDong]);
        setProgress(40); // GeoJSONs fetched

        if (!response1.ok) throw new Error(`Failed to load Level 1 data: ${response1.statusText}`);
        if (!response1SI.ok) throw new Error(`Failed to load Level 1 SI data: ${response1SI.statusText}`);
        if (!response2.ok) throw new Error(`Failed to load Level 2 data: ${response2.statusText}`);
        if (!responseSeoulIncheonGu.ok) throw new Error(`Failed to load Seoul/Incheon Gu data: ${responseSeoulIncheonGu.statusText}`);
        if (!response3.ok) throw new Error(`Failed to load Level 3 data: ${response3.statusText}`);
        if (!responseSeoulIncheonDong.ok) throw new Error(`Failed to load Seoul/Incheon Dong data: ${responseSeoulIncheonDong.statusText}`);

        const level1 = await response1.json();
        const level1SI = await response1SI.json();
        const level2 = await response2.json();
        const seoulIncheonGu = await responseSeoulIncheonGu.json();
        const level3 = await response3.json();
        const seoulIncheonDong = await responseSeoulIncheonDong.json();
        setProgress(60); // GeoJSONs parsed

        // Merge Level 1
        level1.features = [...level1.features, ...level1SI.features];

        // Merge Level 2
        level2.features = [...level2.features, ...seoulIncheonGu.features];

        // Merge Level 3
        level3.features = [...level3.features, ...seoulIncheonDong.features];

        // Process GeoJSONs
        log.data(`[useGeoData] Loaded Level 1: ${level1.features.length} features`);
        log.data(`[useGeoData] Loaded Level 2: ${level2.features.length} features`);
        log.data(`[useGeoData] Loaded Level 3: ${level3.features.length} features`);

        // Current level3 data could be our new Bupjeong-dong (starts with 41610 for Gwangju) 
        // or old data (starts with 31 for Gyeonggi). Let's allow both for testing.
        const filteredLevel3 = level3.features.filter((f: RegionFeature) => {
          const code = f.properties.code || '';
          return code.startsWith('31') || code.startsWith('41') || code.startsWith('11') || code.startsWith('23'); // VWorld Gyeonggi code is 41, Seoul 11, Incheon 23
        });

        // Build Name -> 5-digit Legal Code map from Level 3
        const sigNameToLegalCode = new Map<string, string>();
        filteredLevel3.forEach((f: RegionFeature) => {
          const sigName = f.properties.SIG_KOR_NM;
          const legalCodeStr = f.properties.code;
          if (sigName && legalCodeStr && legalCodeStr.length >= 5) {
            const sigCode5 = legalCodeStr.substring(0, 5);
            // 원본 이름 매핑 (예: "수원시 권선구" -> "수원시"를 제거하지 않은, "수원시권선구" 공백 제거)
            const normalizedSigName = sigName.replace(/\s+/g, '');
            if (!sigNameToLegalCode.has(normalizedSigName)) {
              sigNameToLegalCode.set(normalizedSigName, sigCode5);
            }

            // 고양시, 수원시, 등 구(Gu)가 포함된 대도시의 상위 시 매핑 (예: "수원시 권선구" -> "수원시")
            // 공백을 기점으로 앞 단어가 '시'로 끝나면 최상위 시(Si) 이름으로 간주
            const baseParts = sigName.split(' ');
            if (baseParts.length > 1 && baseParts[0].endsWith('시')) {
              const baseCityName = baseParts[0];
              if (!sigNameToLegalCode.has(baseCityName)) {
                // 부모 시 코드는 5번째 자리가 '0'임
                const parentCityCode = sigCode5.substring(0, 4) + '0';
                sigNameToLegalCode.set(baseCityName, parentCityCode);
              }
            }
          }
        });

        // Filter and update City Data (Level 2)
        const filteredCity = level2.features.filter((f: RegionFeature) =>
          f.properties.code.startsWith('31') || f.properties.code.startsWith('11') || f.properties.code.startsWith('23')
        );

        // Map Administrative Code to Legal Code
        filteredCity.forEach((f: RegionFeature) => {
          // Level 2 데이터의 name은 공백 없는 형태(e.g., "수원시권선구") 또는 상위 시("수원시")
          const name = f.properties.name ? f.properties.name.replace(/\s+/g, '') : undefined;

          if (name && sigNameToLegalCode.has(name)) {
            const legalCode = sigNameToLegalCode.get(name)!;
            // overwrite code with legal code
            f.properties.code = legalCode;
          } else if (name) {
            // Fallback: If "수원시권선구" fails but "수원시" exists 
            const parentNameMatch = name.match(/^(.*?시)[\w\u3131-\uD79D]*구$/);
            if (parentNameMatch && sigNameToLegalCode.has(parentNameMatch[1])) {
              f.properties.code = sigNameToLegalCode.get(parentNameMatch[1])!.substring(0, 4) + f.properties.code.substring(4, 5);
            }
          }
          // Calculate Centroid
          f.properties.centroid = geoCentroid(f);
        });

        // Enrichment Logic
        const parentMap = new Map<string, string>();
        filteredCity.forEach((f: RegionFeature) => {
          if (f.properties.code && f.properties.name) {
            parentMap.set(f.properties.code, f.properties.name);
          }
        });

        filteredLevel3.forEach((f: RegionFeature) => {
          const code = f.properties.code;
          if (code && code.length >= 5) {
            const parentCode = code.substring(0, 5);
            const parentName = parentMap.get(parentCode);
            if (parentName) {
              f.properties.SIG_KOR_NM = parentName;
            }
            // EMD_KOR_NM was properly populated by the python script already
          }
          // Calculate Centroid
          f.properties.centroid = geoCentroid(f);
        });

        // [NEW UX Consistency] Update Level 1 data to use legal codes instead of original admin codes
        level1.features.forEach((f: RegionFeature) => {
          const name = f.properties.name;
          if (name && sigNameToLegalCode.has(name)) {
            f.properties.code = sigNameToLegalCode.get(name)!;
          }
          f.properties.centroid = geoCentroid(f);
        });

        setLevel1Data(level1);
        setCityData({ ...level2, features: filteredCity });
        setData({ ...level3, features: filteredLevel3 });
        setProgress(80); // Map Data Ready

        // Process Roads (TopoJSON)
        const responseRoads = await fetchRoads;
        if (responseRoads.ok) {
          const topology = await responseRoads.json();
          const geojson = topojson.feature(topology, topology.objects.roads) as unknown as RoadCollection;
          log.data(`[useGeoData] Loaded Roads: ${geojson.features.length} segments`);
          setRoadData(geojson);
        } else {
          console.warn("[useGeoData] Failed to load roads", responseRoads.statusText);
        }

        setProgress(100); // All Done

      } catch (err) {
        console.error("[useGeoData] Error loading data:", err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { data, level1Data, cityData, roadData, loading, progress, error };
};
