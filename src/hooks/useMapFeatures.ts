import { useMemo } from 'react';
import type { RegionFeature } from '../types/geo';

interface UseMapFeaturesProps {
    gameState: string;
    selectionLevel: 'PROVINCE' | 'CITY' | 'DISTRICT' | 'DONG';
    currentFocusCode: string | null;
    selectedChapter: string | null;
    level1Data: any;
    cityData: any;
    rawCityData: any;
    showTownGeometry: boolean;
    baseFeatures: RegionFeature[];
    filteredCityFeatures: RegionFeature[];
}

export const useMapFeatures = ({
    gameState,
    selectionLevel,
    currentFocusCode,
    selectedChapter,
    level1Data,
    cityData,
    rawCityData,
    showTownGeometry,
    baseFeatures,
    filteredCityFeatures
}: UseMapFeaturesProps) => {

    // [Pass 1] 렌더링할 메인 피처 (BaseMapLayerCanvas 및 InteractionLayer 전달용)
    const featuresToRender = useMemo(() => {
        if (gameState === 'REGION_SELECT') {
            if (selectionLevel === 'PROVINCE') return level1Data?.features || [];
            if (selectionLevel === 'CITY') {
                if (!currentFocusCode) return cityData?.features || [];
                const prefix = currentFocusCode.substring(0, 2);
                return cityData?.features.filter((f: any) => f.properties.code.startsWith(prefix)) || [];
            }
            if (selectionLevel === 'DISTRICT') {
                if (!currentFocusCode) return rawCityData?.features || [];
                const prefix = currentFocusCode.substring(0, 4);
                return rawCityData?.features.filter((f: any) => f.properties.code.startsWith(prefix) && f.properties.code.length === 5 && !f.properties.code.endsWith('0')) || [];
            }
        }
        return showTownGeometry ? baseFeatures : filteredCityFeatures;
    }, [gameState, selectionLevel, currentFocusCode, level1Data, cityData, rawCityData, showTownGeometry, baseFeatures, filteredCityFeatures]);

    // [Pass 2] 컨텍스트 경계선: 선택 레벨에 따라 희미하게 그릴 이웃 피처 배열
    const contextBoundaryFeatures = useMemo(() => {
        if (gameState === 'REGION_SELECT') {
            if (selectionLevel === 'PROVINCE') {
                return cityData?.features ?? [];
            }
            if (selectionLevel === 'CITY') {
                return level1Data?.features.filter((f: any) =>
                    f.properties.code !== currentFocusCode
                ) ?? [];
            }
            if (selectionLevel === 'DISTRICT') {
                const provincePrefix = currentFocusCode?.substring(0, 2) ?? '';
                const cityPrefix = currentFocusCode?.substring(0, 4) ?? '';
                return cityData?.features.filter((f: any) =>
                    f.properties.code.startsWith(provincePrefix) &&
                    !f.properties.code.startsWith(cityPrefix)
                ) ?? [];
            }
        }
        if (gameState === 'PLAYING') {
            const provincePrefix = featuresToRender[0]?.properties?.code?.substring(0, 2) ?? '';
            return provincePrefix
                ? (cityData?.features.filter((f: any) => f.properties.code.startsWith(provincePrefix)) ?? [])
                : [];
        }
        return [];
    }, [gameState, selectionLevel, currentFocusCode, cityData, level1Data, featuresToRender]);

    // [Pass 3] 선택한 지역의 단일 통합 굵은 외곽선 액자 프레임
    const selectedBorderFeatures = useMemo(() => {
        // 게임 플레이 중이 무조건 1순위 (이전 메뉴가 어떤 선택이든 상관없음)
        if (gameState === 'PLAYING' && selectedChapter) {
            const f = rawCityData?.features.find((f: any) => f.properties.code === selectedChapter);
            const fallback = cityData?.features.find((f: any) => f.properties.code === selectedChapter);
            return f ? [f] : fallback ? [fallback] : [];
        }

        if (selectionLevel === 'PROVINCE') return [];

        if (selectionLevel === 'DISTRICT' && currentFocusCode) {
            const f = cityData?.features.find((f: any) => f.properties.code === currentFocusCode);
            const fallback = rawCityData?.features.find((f: any) => f.properties.code === currentFocusCode);
            return f ? [f] : fallback ? [fallback] : [];
        }

        if (selectionLevel === 'CITY' && currentFocusCode) {
            const f = level1Data?.features.find((f: any) => f.properties.code === currentFocusCode);
            return f ? [f] : [];
        }

        return [];
    }, [selectionLevel, currentFocusCode, gameState, selectedChapter, level1Data, cityData, rawCityData]);

    return {
        featuresToRender,
        contextBoundaryFeatures,
        selectedBorderFeatures
    };
};
