import { useState, useEffect } from 'react';
import type { RegionCollection, RoadCollection, RegionFeature } from '../types/geo';
import { log } from '../lib/debug';
import * as topojson from 'topojson-client';

// ── 데이터 URL ──────────────────────────────────────────────────────────────
// emd.json + sig.json에서 생성된 경기도 읍/면/동 데이터
const DATA_URL_MAIN   = '/data/gyeonggi_bupjeongdong.geojson'; // 경기도 읍/면/동 (emd+sig 변환)
const DATA_URL_SIG    = '/data/sig.json';                       // 전국 시군구 (코드 변환용)
const DATA_URL_LEVEL1 = '/data/gyeonggi_level1_merged.geojson'; // 경기도 시 단위 병합 (UI용)
const DATA_URL_ROADS  = '/data/korea-roads-topo.json?v=3';      // TopoJSON 도로망

export const useGeoData = () => {
  const [data,       setData]       = useState<RegionCollection | null>(null);
  const [level1Data, setLevel1Data] = useState<RegionCollection | null>(null);
  const [cityData,   setCityData]   = useState<RegionCollection | null>(null);
  const [roadData,   setRoadData]   = useState<RoadCollection   | null>(null);

  const [loading,  setLoading]  = useState(true);
  const [progress, setProgress] = useState(0);
  const [error,    setError]    = useState<Error | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        log.data("[useGeoData] Starting data load...");
        setLoading(true);
        setProgress(10);

        // ── 1. 병렬 Fetch ────────────────────────────────────────────────────
        const [resMain, resSig, resLevel1] = await Promise.all([
          fetch(DATA_URL_MAIN),
          fetch(DATA_URL_SIG),
          fetch(DATA_URL_LEVEL1),
        ]);
        setProgress(40);

        if (!resMain.ok)   throw new Error(`gyeonggi_bupjeongdong 로드 실패: ${resMain.statusText}`);
        if (!resSig.ok)    throw new Error(`sig.json 로드 실패: ${resSig.statusText}`);
        if (!resLevel1.ok) throw new Error(`level1 로드 실패: ${resLevel1.statusText}`);

        const rawMain   = await resMain.json()   as RegionCollection;
        const rawSig    = await resSig.json();
        const rawLevel1 = await resLevel1.json() as RegionCollection;
        setProgress(60);

        log.data(`[useGeoData] 읍/면/동 로드: ${rawMain.features.length}개`);

        // ── 2. sig.json으로 시군구 이름→코드 역방향 맵 구성 ─────────────────
        // level1_merged의 내부 코드(31xxx)를 공식 코드(41xxx)로 변환하기 위해 필요
        const sigNameToCode = new Map<string, string>();
        for (const f of rawSig.features) {
          const cd = String(f.properties.SIG_CD   || '');
          const nm = String(f.properties.SIG_KOR_NM || '');
          if (!sigNameToCode.has(nm)) {
            sigNameToCode.set(nm, cd);
          }
          // 구 있는 시: "수원시 장안구" → 상위 "수원시" 코드 (앞 4자리+'0')
          const baseName = nm.split(' ')[0];
          if (baseName !== nm && !sigNameToCode.has(baseName)) {
            sigNameToCode.set(baseName, cd.substring(0, 4) + '0');
          }
        }

        // ── 3. level1_merged 코드 변환: 31xxx → 41xxx ───────────────────────
        rawLevel1.features.forEach((f: RegionFeature) => {
          const name = f.properties.name;
          if (name && sigNameToCode.has(name)) {
            f.properties.code = sigNameToCode.get(name)!;
          }
        });
        log.data(`[useGeoData] level1 코드 변환 완료: ${rawLevel1.features.length}개`);

        // ── 4. 상태 업데이트 ─────────────────────────────────────────────────
        setData(rawMain);
        setLevel1Data(rawLevel1);
        setCityData(rawLevel1); // cityData = level1 (REGION_SELECT UI용 31개 시/군)
        setProgress(80);

        // ── 5. 도로 데이터 (비핵심, 실패해도 계속) ───────────────────────────
        try {
          const responseRoads = await fetch(DATA_URL_ROADS);
          if (responseRoads.ok) {
            const topology = await responseRoads.json();
            const geojson = topojson.feature(topology, topology.objects.roads) as unknown as RoadCollection;
            log.data(`[useGeoData] 도로 세그먼트: ${geojson.features.length}개`);
            setRoadData(geojson);
          } else {
            console.warn("[useGeoData] 도로 데이터 로드 실패:", responseRoads.statusText);
          }
        } catch (roadErr) {
          console.warn("[useGeoData] 도로 데이터 로드 오류:", roadErr);
        }

        setProgress(100);

      } catch (err) {
        console.error("[useGeoData] 데이터 로드 오류:", err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { data, level1Data, cityData, roadData, loading, progress, error };
};
