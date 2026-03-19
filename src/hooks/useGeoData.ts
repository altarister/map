import { useState, useEffect } from 'react';
import type { RegionCollection, RoadCollection, RegionFeature } from '../types/geo';
import { log } from '../lib/debug';
import * as topojson from 'topojson-client';
import { geoCentroid } from 'd3-geo';

// GeoJSON Data URLs (Optimized Architecture with Fallbacks)
const DATA_URL_LEVEL1 = '/download/skorea-provinces-2018-geo.json'; // 광역 자치단체 (원본 17개)
const DATA_URL_LEVEL2_RAW = '/download/skorea-municipalities-2018-geo.json'; // 시/군/구 원본 (쪼개진 구 포함, rawCityData용)
const DATA_URL_LEVEL2_MERGED = '/mapData/korea-municipalities-merged.geojson'; // 시/군/구 통합본 (cityData용 - bake_nationwide_maps.js 로 생성)
const DATA_URL_LEVEL3 = '/mapData/merged_map.geojson'; // 읍/면/법정동 (Terminal Nodes, Intel merged, 서울·인천 포함)
const DATA_URL_ROADS = '/download/korea-roads-topo.json?v=3'; // TopoJSON Roads

// 현재 서비스(활성화) 중인 광역 코드 (11:서울, 23:인천, 31:경기)
const ACTIVE_REGION_PREFIXES = ['11', '23', '31', '41'];

/**
 * [정책] 트럭 진입 불가 도서 지역 제외 목록
 *
 * 기준: 다리·도로로 육지와 연결되지 않은 도서 행정구역은 제외
 *       다리가 있으면 포함 (예: 강화군 → 강화대교·초지대교, 영종도 → 인천대교)
 *
 * ❌ 제외: 인천 옹진군(23440) — 서해 도서, 배 이외 접근 불가
 * ✅ 포함: 인천 강화군(23430) — 강화대교·초지대교 (트럭 통행 가능)
 * ✅ 포함: 인천 중구(23110)   — 인천대교·영종대교 (공항 방면, 트럭 통행 가능)
 *
 * 향후 전국 확장 시 도서 지역이 추가되면 여기에 코드만 추가할 것
 */
const EXCLUDED_ISLAND_CITIES = ['23440'];

export const useGeoData = () => {
  const [data, setData] = useState<RegionCollection | null>(null);
  const [level1Data, setLevel1Data] = useState<RegionCollection | null>(null);
  const [cityData, setCityData] = useState<RegionCollection | null>(null);
  const [rawCityData, setRawCityData] = useState<RegionCollection | null>(null); // [원인 4 해결] 기흥구, 처인구 등이 살아있는 원본 Level 2
  const [roadData, setRoadData] = useState<RoadCollection | null>(null);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0); 
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        log.data("[useGeoData] Starting data load (Optimized Architecture & Recovered mapping logic)...");
        setLoading(true);
        setProgress(10); 

        // 1. Fetch Resources
        const fetchLevel1 = fetch(DATA_URL_LEVEL1);
        const fetchLevel2Raw = fetch(DATA_URL_LEVEL2_RAW);         // 원인 4 해결 (원본 다시 로드)
        const fetchLevel2Merged = fetch(DATA_URL_LEVEL2_MERGED);   // 통합본 로드
        const fetchLevel3 = fetch(DATA_URL_LEVEL3);
        const fetchRoads = fetch(DATA_URL_ROADS);

        const [
          response1, response2Raw, response2Merged, response3
        ] = await Promise.all([fetchLevel1, fetchLevel2Raw, fetchLevel2Merged, fetchLevel3]);
        setProgress(40); 

        if (!response1.ok) throw new Error(`Failed to load Level 1: ${response1.statusText}`);
        if (!response2Raw.ok) throw new Error(`Failed to load Level 2 Raw: ${response2Raw.statusText}`);
        if (!response2Merged.ok) throw new Error(`Failed to load Level 2 Merged: ${response2Merged.statusText}`);
        if (!response3.ok) throw new Error(`Failed to load Level 3: ${response3.statusText}`);

        const level1 = await response1.json();
        const level2Raw = await response2Raw.json();
        const level2Merged = await response2Merged.json();
        const level3 = await response3.json();
        setProgress(50); 

        // ==========================================================
        // [원인 5 해결] Level 1 (광역 자치단체) 하드코딩 호환성 처리
        // ==========================================================
        const filteredLevel1 = level1.features.filter((f: RegionFeature) => {
          const code = f.properties.code || '';
          return ACTIVE_REGION_PREFIXES.some(prefix => code.startsWith(prefix));
        });
        filteredLevel1.forEach((f: RegionFeature) => {
          // 통계청 원본의 경기도 코드는 '31'이지만, 기존 게임 로직(Map.tsx 등)이 VWorld 코드 '41'을 기대하므로 강제 치환
          if (f.properties.code === '31') {
            f.properties.code = '41'; 
          }
          f.properties.centroid = geoCentroid(f);
        });

        // ==========================================================
        // [원인 1, 2 해결] Level 3 (읍/면/법정동) 기반으로 법정동 매핑 엔진(Map) 재구축
        // ==========================================================
        const filteredLevel3 = level3.features.filter((f: RegionFeature) => {
          const code = f.properties.code || '';
          return ACTIVE_REGION_PREFIXES.some(prefix => code.startsWith(prefix))
            && !EXCLUDED_ISLAND_CITIES.some(exc => code.startsWith(exc));
        });

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

            // 고양시, 수원시, 용인시 등 구(Gu)가 포함된 대도시의 상위 시 매핑 (예: "수원시 권선구" -> "수원시")
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

        // ==========================================================
        // [원인 3 파트 1 해결] Level 2 RAW (원본 시/군/구) 처리 및 법정동 Code 오버라이트, 부모 이름 수집
        // ==========================================================
        const filteredCityRaw = level2Raw.features.filter((f: RegionFeature) => {
          const code = f.properties.code || '';
          return ACTIVE_REGION_PREFIXES.some(prefix => code.startsWith(prefix))
            && !EXCLUDED_ISLAND_CITIES.some(exc => code.startsWith(exc));
        });

        const parentMap = new Map<string, string>();
        const parentGroups = new Map<string, { name: string, geometries: any[], children: RegionFeature[] }>();

        filteredCityRaw.forEach((f: RegionFeature) => {
          // 이름 정규화 및 법정동 코드 오버라이트 (원인 1)
          const name = f.properties.name ? f.properties.name.replace(/\s+/g, '') : undefined;
          if (name && sigNameToLegalCode.has(name)) {
            f.properties.code = sigNameToLegalCode.get(name)!;
          } else if (name) {
            // Fallback: If "수원시권선구" fails but "수원시" exists 
            const parentNameMatch = name.match(/^(.*?시)[\w\u3131-\uD79D]*구$/);
            if (parentNameMatch && sigNameToLegalCode.has(parentNameMatch[1])) {
              f.properties.code = sigNameToLegalCode.get(parentNameMatch[1])!.substring(0, 4) + f.properties.code.substring(4, 5);
            }
          }

          // 부모 맵(parentMap) 수집 (원인 3)
          if (f.properties.code && f.properties.name) {
            parentMap.set(f.properties.code, f.properties.name);
            
            // 대도시의 하위 '구' 인지 확인 (코드 5번째 자리가 0이 아님)
            const isGu = f.properties.code.length === 5 && !f.properties.code.endsWith('0');
            if (isGu) {
              const parentCode = f.properties.code.substring(0, 4) + '0';
              const match = f.properties.name.match(/^(.*?시)[\w\u3131-\uD79D]*구$/);
              const parentName = match ? match[1] : f.properties.name.replace(/구$/, '');

              if (!parentGroups.has(parentCode)) {
                parentGroups.set(parentCode, { name: parentName, geometries: [], children: [] });
              }
              // parentGroups 수집 자체는 안 쓰일 수 있지만(이미 스크립트로 구웠으므로), Level 3 이름표 달아주기 fallback용으로 둠.
            }
          }
          f.properties.centroid = geoCentroid(f);
        });

        // ==========================================================
        // [원인 4 파트 2 해결] Level 2 MERGED 처리 (최종 cityData용)
        // ==========================================================
        const filteredCityMerged = level2Merged.features.filter((f: RegionFeature) => {
          const code = f.properties.code || '';
          return ACTIVE_REGION_PREFIXES.some(prefix => code.startsWith(prefix))
            && !EXCLUDED_ISLAND_CITIES.some(exc => code.startsWith(exc));
        });

        filteredCityMerged.forEach((f: RegionFeature) => {
          // 이름 정규화 및 법정동 코드 오버라이트 (원인 1 적용)
          const name = f.properties.name ? f.properties.name.replace(/\s+/g, '') : undefined;
          if (name && sigNameToLegalCode.has(name)) {
            f.properties.code = sigNameToLegalCode.get(name)!;
          }
          f.properties.centroid = geoCentroid(f);
        });

        // [UX Improvement] Map 렌더링 시 대도시의 '구(Gu)' 들이 개별 조각으로 깨져서 보여지는 것 방지
        const finalCityFeatures = filteredCityMerged.filter((f: RegionFeature) => {
          const code = f.properties.code;
          // 비자치구만 필터 아웃 (통합본(filteredCityMerged)에는 어차피 병합되었으므로 원본 구는 거의 없지만, 안전장치)
          const isNonAutonomousGu = code && code.length === 5 && !code.endsWith('0');
          // _isMergedCity 플래그가 붙은 부모 도시는 살려야 함
          return !isNonAutonomousGu || f.properties._isMergedCity;
        });

        // ==========================================================
        // [원인 3 파트 2 해결] Level 3 자식들에게 부모 이름표 달아주기
        // ==========================================================
        filteredLevel3.forEach((f: RegionFeature) => {
          const code = f.properties.code;
          if (code && code.length >= 5) {
            const parentCode = code.substring(0, 5);
            // 자식 EMD에 소속 도시명 할당 (자신이 '구' 소속이면 구 이름, 아니면 통합 시 이름을 부여)
            const parentName = parentMap.get(parentCode) || (parentGroups.get(parentCode.substring(0, 4) + '0')?.name);
            if (parentName) {
              f.properties.SIG_KOR_NM = parentName;
            }
          }
          f.properties.centroid = geoCentroid(f);
        });

        // [원인 5 파트 2 해결] Level 1 코드에도 Legal Code 적용
        filteredLevel1.forEach((f: RegionFeature) => {
          const name = f.properties.name;
          if (name && sigNameToLegalCode.has(name)) {
            f.properties.code = sigNameToLegalCode.get(name)!;
          }
        });

        setProgress(80); // Map Data Ready

        // 5. Update State
        setLevel1Data({ type: 'FeatureCollection', features: filteredLevel1 } as RegionCollection);
        setCityData({ type: 'FeatureCollection', features: finalCityFeatures } as RegionCollection);
        // 원본 구(Gu)가 살아있는 RAW 데이터를 별도 저장 (3단계 View용)
        setRawCityData({ type: 'FeatureCollection', features: filteredCityRaw } as RegionCollection); 
        setData({ type: 'FeatureCollection', features: filteredLevel3 } as RegionCollection);

        // 6. Process Roads
        const responseRoads = await fetchRoads;
        if (responseRoads.ok) {
          const topology = await responseRoads.json();
          const geojson = topojson.feature(topology, topology.objects.roads) as unknown as RoadCollection;
          setRoadData(geojson);
        } else {
          console.warn("[useGeoData] Failed to load roads", responseRoads.statusText);
        }

        setProgress(100); 
        log.data(`[useGeoData] Successfully recovered all relations & initialized.`);

      } catch (err) {
        console.error("[useGeoData] Error loading data:", err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { data, level1Data, cityData, rawCityData, roadData, loading, progress, error };
};
