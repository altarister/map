import { useState, useEffect } from 'react';
import type { RegionCollection } from '../types/geo';
import { log } from '../lib/debug';
import * as topojson from 'topojson-client';

// GeoJSON Data URLs
const DATA_URL_LEVEL2 = '/data/skorea-municipalities-2018-geo.json'; // Sigun (City/County)
const DATA_URL_LEVEL3 = '/data/skorea-submunicipalities-2018-geo.json'; // Emd (Town/District) - Detailed
const DATA_URL_ROADS = '/data/korea-roads-topo.json?v=3'; // TopoJSON Roads

export const useGeoData = () => {
  const [data, setData] = useState<RegionCollection | null>(null);
  const [level2Data, setLevel2Data] = useState<RegionCollection | null>(null);
  const [roadData, setRoadData] = useState<any>(null); // New: Road Data

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
        const fetchLevel2 = fetch(DATA_URL_LEVEL2);
        const fetchLevel3 = fetch(DATA_URL_LEVEL3);
        const fetchRoads = fetch(DATA_URL_ROADS);

        // Await Level 2 & 3 first (Essential for Game Logic)
        const [response2, response3] = await Promise.all([fetchLevel2, fetchLevel3]);
        setProgress(40); // GeoJSONs fetched

        if (!response2.ok) throw new Error(`Failed to load Level 2 data: ${response2.statusText}`);
        if (!response3.ok) throw new Error(`Failed to load Level 3 data: ${response3.statusText}`);

        const level2 = await response2.json();
        const level3 = await response3.json();
        setProgress(60); // GeoJSONs parsed

        // Process GeoJSONs
        log.data(`[useGeoData] Loaded Level 2: ${level2.features.length} features`);
        log.data(`[useGeoData] Loaded Level 3: ${level3.features.length} features`);

        const targetPrefix = '31'; // TODO: Make configurable?

        const filteredLevel2 = level2.features.filter((f: any) =>
          f.properties.code.startsWith(targetPrefix)
        );

        const filteredLevel3 = level3.features.filter((f: any) =>
          f.properties.code.startsWith(targetPrefix)
        );

        // Enrichment Logic
        const parentMap = new Map<string, string>();
        filteredLevel2.forEach((f: any) => {
          if (f.properties.code && f.properties.name) {
            parentMap.set(f.properties.code, f.properties.name);
          }
        });

        filteredLevel3.forEach((f: any) => {
          const code = f.properties.code;
          if (code && code.length >= 5) {
            const parentCode = code.substring(0, 5);
            const parentName = parentMap.get(parentCode);
            if (parentName) {
              f.properties.SIG_KOR_NM = parentName;
              f.properties.EMD_KOR_NM = f.properties.name;
            }
          }
        });

        setLevel2Data({ ...level2, features: filteredLevel2 });
        setData({ ...level3, features: filteredLevel3 });
        setProgress(80); // Map Data Ready

        // Process Roads (TopoJSON)
        const responseRoads = await fetchRoads;
        if (responseRoads.ok) {
          const topology = await responseRoads.json();
          const geojson = topojson.feature(topology, topology.objects.roads) as any;
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

  return { data, level2Data, roadData, loading, progress, error };
};
