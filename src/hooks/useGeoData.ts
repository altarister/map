import { useState, useEffect } from 'react';
import type { RegionCollection, RoadCollection, RegionFeature } from '../types/geo';
import { log } from '../lib/debug';
import * as topojson from 'topojson-client';

// ─── GeoJSON Data URLs (V-World Single Source of Truth) ───────────────
// 모든 Level 1/2는 merged_map.geojson (Level 3) 에서 turf.js dissolve로 파생된 파일입니다.
// build script: scripts/build_vworld_levels.cjs
const DATA_URL_LEVEL1 = '/mapData/vworld_provinces.geojson';           // 광역 자치단체 (서울/인천/경기)
const DATA_URL_LEVEL2_RAW = '/mapData/vworld_sig.geojson';             // 시/군/구 (비자치구 포함, 82개)
const DATA_URL_LEVEL2_MERGED = '/mapData/vworld_sig_merged.geojson';   // 시/군/구 (대도시 통합, 66개)
const DATA_URL_LEVEL3 = '/mapData/merged_map.geojson';                 // 읍/면/법정동 (V-World 단일 소스)
const DATA_URL_ROADS = '/download/korea-roads-topo.json?v=3';          // TopoJSON Roads

// 현재 서비스(활성화) 중인 광역 코드
const ACTIVE_REGION_PREFIXES = ['11', '28', '41']; // 서울, 인천, 경기

/**
 * [정책] 트럭 진입 불가 도서 지역 제외 목록
 *
 * 기준: 다리·도로로 육지와 연결되지 않은 도서 행정구역은 제외
 *       다리가 있으면 포함 (예: 강화군 → 강화대교·초지대교, 영종도 → 인천대교)
 *
 * ❌ 제외: 인천 옹진군(28720) — 서해 도서, 배 이외 접근 불가
 * ✅ 포함: 인천 강화군(28710) — 강화대교·초지대교 (트럭 통행 가능)
 * ✅ 포함: 인천 중구(28110)   — 인천대교·영종대교 (공항 방면, 트럭 통행 가능)
 */
const EXCLUDED_ISLAND_CITIES = ['28720']; // 인천 옹진군

// 활성 지역 필터 (공통 유틸)
const isActiveRegion = (code: string) =>
  ACTIVE_REGION_PREFIXES.some(p => code.startsWith(p)) &&
  !EXCLUDED_ISLAND_CITIES.some(exc => code.startsWith(exc));

export const useGeoData = () => {
  const [data, setData] = useState<RegionCollection | null>(null);
  const [level1Data, setLevel1Data] = useState<RegionCollection | null>(null);
  const [cityData, setCityData] = useState<RegionCollection | null>(null);
  const [rawCityData, setRawCityData] = useState<RegionCollection | null>(null);
  const [roadData, setRoadData] = useState<RoadCollection | null>(null);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        log.data("[useGeoData] Loading V-World standardized data...");
        setLoading(true);
        setProgress(10);

        // 1. Fetch all resources in parallel
        const [r1, r2Raw, r2Merged, r3] = await Promise.all([
          fetch(DATA_URL_LEVEL1),
          fetch(DATA_URL_LEVEL2_RAW),
          fetch(DATA_URL_LEVEL2_MERGED),
          fetch(DATA_URL_LEVEL3),
        ]);
        const fetchRoads = fetch(DATA_URL_ROADS);
        setProgress(40);

        if (!r1.ok) throw new Error(`Failed to load Level 1: ${r1.statusText}`);
        if (!r2Raw.ok) throw new Error(`Failed to load Level 2 Raw: ${r2Raw.statusText}`);
        if (!r2Merged.ok) throw new Error(`Failed to load Level 2 Merged: ${r2Merged.statusText}`);
        if (!r3.ok) throw new Error(`Failed to load Level 3: ${r3.statusText}`);

        // 2. Parse (모든 코드/centroid는 빌드 시 이미 구워져 있음 — 클라이언트 변환 불필요)
        const level1: RegionCollection = await r1.json();
        const level2Raw: RegionCollection = await r2Raw.json();
        const level2Merged: RegionCollection = await r2Merged.json();
        const level3: RegionCollection = await r3.json();
        setProgress(60);

        // 3. Filter by active region
        const filteredLevel1 = level1.features.filter((f: RegionFeature) => isActiveRegion(f.properties.code || ''));
        const filteredLevel2Raw = level2Raw.features.filter((f: RegionFeature) => isActiveRegion(f.properties.code || ''));
        const filteredLevel2Merged = level2Merged.features.filter((f: RegionFeature) => isActiveRegion(f.properties.code || ''));
        const filteredLevel3 = level3.features.filter((f: RegionFeature) => isActiveRegion(f.properties.code || ''));

        setProgress(80);

        // 4. Update State
        setLevel1Data({ type: 'FeatureCollection', features: filteredLevel1 } as RegionCollection);
        setCityData({ type: 'FeatureCollection', features: filteredLevel2Merged } as RegionCollection);
        setRawCityData({ type: 'FeatureCollection', features: filteredLevel2Raw } as RegionCollection);
        setData({ type: 'FeatureCollection', features: filteredLevel3, metadata: level3.metadata } as RegionCollection);

        // 5. Process Roads
        const responseRoads = await fetchRoads;
        if (responseRoads.ok) {
          const topology = await responseRoads.json();
          const geojson = topojson.feature(topology, topology.objects.roads) as unknown as RoadCollection;
          setRoadData(geojson);
        } else {
          console.warn("[useGeoData] Failed to load roads", responseRoads.statusText);
        }

        setProgress(100);
        log.data(`[useGeoData] ✅ Loaded: L1=${filteredLevel1.length}, L2Raw=${filteredLevel2Raw.length}, L2Merged=${filteredLevel2Merged.length}, L3=${filteredLevel3.length}`);

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
