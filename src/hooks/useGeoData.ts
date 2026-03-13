import { useState, useEffect } from 'react';
import type { RegionCollection, RoadCollection, RegionFeature } from '../types/geo';
import { log } from '../lib/debug';
import * as topojson from 'topojson-client';
import { geoCentroid } from 'd3-geo';

// ── 데이터 URL ──────────────────────────────────────────────────────────────
// 전국 법정동 GeoJSON (gisdeveloper.co.kr, 2023년 7월, 도로명주소 DB 기반)
const DATA_URL_SIG   = '/data/sig.json';                    // 전국 시군구 (SIG_CD 5자리)
const DATA_URL_EMD   = '/data/emd.json';                    // 전국 읍면동 법정동 (EMD_CD 8자리)
const DATA_URL_ROADS = '/data/korea-roads-topo.json?v=3';   // TopoJSON 도로망
const DATA_URL_LEVEL1 = '/data/gyeonggi_level1_merged.geojson'; // 경기도 시 단위 병합 (UI용)

// ── 현재 서비스 지역 (추후 설정으로 변경 가능) ──────────────────────────────
// 경기도 시도코드 = '41'
const TARGET_SIDO_CODE = '41';

export const useGeoData = () => {
  const [data,      setData]      = useState<RegionCollection | null>(null);
  const [level1Data, setLevel1Data] = useState<RegionCollection | null>(null);
  const [cityData,  setCityData]  = useState<RegionCollection | null>(null);
  const [roadData,  setRoadData]  = useState<RoadCollection | null>(null);

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
        const [resSig, resEmd, resLevel1] = await Promise.all([
          fetch(DATA_URL_SIG),
          fetch(DATA_URL_EMD),
          fetch(DATA_URL_LEVEL1),
        ]);
        setProgress(40);

        if (!resSig.ok)    throw new Error(`sig.json 로드 실패: ${resSig.statusText}`);
        if (!resEmd.ok)    throw new Error(`emd.json 로드 실패: ${resEmd.statusText}`);
        if (!resLevel1.ok) throw new Error(`level1 로드 실패: ${resLevel1.statusText}`);

        const rawSig    = await resSig.json();
        const rawEmd    = await resEmd.json();
        const rawLevel1 = await resLevel1.json();
        setProgress(60);

        log.data(`[useGeoData] sig 로드: ${rawSig.features.length}개`);
        log.data(`[useGeoData] emd 로드: ${rawEmd.features.length}개`);

        // ── 2. 시군구(sig.json) 처리 ──────────────────────────────────────
        // 필드 정규화: SIG_CD → code, SIG_KOR_NM → name
        // 대상 시도 필터링 (41 = 경기도)
        const sigCodeToName = new Map<string, string>(); // SIG_CD(5자리) → SIG_KOR_NM
        const sigNameToCode = new Map<string, string>(); // SIG_KOR_NM → SIG_CD(5자리) (역방향, level1 코드 변환용)

        const filteredSig = rawSig.features
          .filter((f: RegionFeature) => {
            const sigCd = String((f.properties as any).SIG_CD || '');
            return sigCd.startsWith(TARGET_SIDO_CODE);
          })
          .map((f: RegionFeature) => {
            const raw = f.properties as any;
            const sigCd: string  = String(raw.SIG_CD  || '');
            const sigNm: string  = String(raw.SIG_KOR_NM || '');

            sigCodeToName.set(sigCd, sigNm);

            // 역방향 맵: 시 이름으로 공식 SIG_CD 찾기 (level1_merged 코드 변환용)
            // 예: "광주시" → "41610", "수원시" → "41111" (수원시 장안구), "수원시(합산)" → 앞 4자리+0
            if (!sigNameToCode.has(sigNm)) {
              sigNameToCode.set(sigNm, sigCd);
            }
            // 구 있는 시의 경우 "수원시 장안구" → 상위 "수원시" 코드도 추가 (5번째 자리 0)
            const baseName = sigNm.split(' ')[0]; // "수원시 장안구" → "수원시"
            if (baseName !== sigNm && !sigNameToCode.has(baseName)) {
              // 상위 시 코드: 앞 4자리 + '0' (예: 41111 → 41110)
              const parentCode = sigCd.substring(0, 4) + '0';
              sigNameToCode.set(baseName, parentCode);
            }

            return {
              ...f,
              properties: {
                ...f.properties,
                code:    sigCd,
                name:    sigNm,
                centroid: geoCentroid(f),
              },
            } as RegionFeature;
          });

        log.data(`[useGeoData] 경기도 시군구: ${filteredSig.length}개`);

        // ── 3. 읍면동(emd.json) 처리 ──────────────────────────────────────
        // 필드 정규화: EMD_CD → code, EMD_KOR_NM → name
        // SIG_KOR_NM 을 sig.json에서 조인 (EMD_CD 앞 5자리 = SIG_CD)
        const filteredEmd = rawEmd.features
          .filter((f: RegionFeature) => {
            const emdCd = String((f.properties as any).EMD_CD || '');
            return emdCd.startsWith(TARGET_SIDO_CODE);
          })
          .map((f: RegionFeature) => {
            const raw = f.properties as any;
            const emdCd: string  = String(raw.EMD_CD     || '');
            const emdNm: string  = String(raw.EMD_KOR_NM || '');
            const sigCd5: string = emdCd.substring(0, 5);
            const sigNm: string  = sigCodeToName.get(sigCd5) || '';

            return {
              ...f,
              properties: {
                ...f.properties,
                code:        emdCd,
                name:        emdNm,
                SIG_KOR_NM:  sigNm,    // 시군구 이름 (구 있는 시 감지에 사용)
                EMD_KOR_NM:  emdNm,
                _isEmdGroup: true,      // 리(里) 아님, 읍/면/동 단위임을 명시
                centroid:    geoCentroid(f),
              },
            } as RegionFeature;
          });

        log.data(`[useGeoData] 경기도 읍면동: ${filteredEmd.length}개`);

        // ── 4. Level 1 (경기도 시 단위 병합 폴리곤) ──────────────────────
        // level1_merged.geojson의 code가 내부 시퀀스(31010)이므로
        // sigNameToCode를 이용해 공식 SIG_CD(41110 등)로 교체
        rawLevel1.features.forEach((f: RegionFeature) => {
          const name = f.properties.name;
          if (name && sigNameToCode.has(name)) {
            f.properties.code = sigNameToCode.get(name)!;
          }
          f.properties.centroid = geoCentroid(f);
        });
        log.data(`[useGeoData] level1 코드 변환: ${rawLevel1.features.map((f: RegionFeature) => f.properties.name + ':' + f.properties.code).slice(0,3).join(', ')} ...`);

        // ── 5. 상태 업데이트 ─────────────────────────────────────────────
        setLevel1Data(rawLevel1);
        setCityData({ ...rawSig,  features: filteredSig });
        setData(     { ...rawEmd,  features: filteredEmd });
        setProgress(80);

        // ── 6. 도로 데이터 (비핵심, 실패해도 계속) ───────────────────────
        try {
          const fetchRoads = fetch(DATA_URL_ROADS);
          const responseRoads = await fetchRoads;
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
