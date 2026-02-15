import { useMemo, useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { Button } from '../ui/Button';

// 주요 콜 발생 지역 (Quick Select용)
const PRIORITY_CITIES = ['고양시', '파주시', '김포시', '화성시', '오산시', '광주시', '수원시', '성남시'];

export const RegionSelectScreen = () => {
  // mapData (Level 3)도 가져와서 각 시/군의 하위 지역 개수를 계산
  const { mapDataLevel2, mapData: fullMapData, startGame, loading } = useGame();

  // 초기 선택값은 비워두어 사용자가 직접 선택하도록 유도 (또는 전체 선택?)
  // 기획 의도: "Focused Training"이므로 비워두는 게 맞음.
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());

  // 시/군 목록 및 각 시/군의 하위 지역(Level 3) 개수 계산
  const cityStats = useMemo(() => {
    if (!mapDataLevel2 || !fullMapData) return [];

    const stats = new Map<string, number>();
    const cities = new Set<string>();

    // 1. Level 2 데이터에서 시/군 이름 추출
    mapDataLevel2.features.forEach(f => {
      const name = f.properties.name;
      // "안산시 단원구" -> "안산시"
      const match = name.match(/^(\S+[시군])/);
      const cityName = match ? match[1] : name.split(' ')[0];
      cities.add(cityName);
    });

    // 2. Level 3 데이터에서 각 시/군에 속한 읍/면/동 개수 카운트
    fullMapData.features.forEach(f => {
      const parentName = f.properties.SIG_KOR_NM || f.properties.name; // 상위 행정구역 이름
      // 해당 Feature가 속한 시/군 찾기
      const matchedCity = Array.from(cities).find(city => parentName.startsWith(city));
      if (matchedCity) {
        stats.set(matchedCity, (stats.get(matchedCity) || 0) + 1);
      }
    });

    return Array.from(cities).sort().map(city => ({
      name: city,
      count: stats.get(city) || 0
    }));
  }, [mapDataLevel2, fullMapData]);

  const toggleCity = (city: string) => {
    const newSelected = new Set(selectedCities);
    if (newSelected.has(city)) {
      newSelected.delete(city);
    } else {
      newSelected.add(city);
    }
    setSelectedCities(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedCities(new Set(cityStats.map(c => c.name)));
  };

  const handleDeselectAll = () => {
    setSelectedCities(new Set());
  };

  const handleSelectPriorityCities = () => {
    // PRIORITY_CITIES에 있는 것만 선택
    const validPriorityCities = cityStats
      .filter(c => PRIORITY_CITIES.includes(c.name))
      .map(c => c.name);
    setSelectedCities(new Set(validPriorityCities));
  };

  const handleStart = () => {
    if (selectedCities.size === 0) return;
    startGame(Array.from(selectedCities));
  };

  // 선택된 총 하위 지역(Quest) 개수 계산
  const totalQuestCount = useMemo(() => {
    return cityStats
      .filter(c => selectedCities.has(c.name))
      .reduce((sum, c) => sum + c.count, 0);
  }, [cityStats, selectedCities]);

  if (loading || !mapDataLevel2) return <div className="flex items-center justify-center h-full text-primary font-mono animate-pulse">LOADING GEODATA...</div>;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 overflow-y-auto bg-background/80 backdrop-blur-sm">
      <div className="glass-panel p-8 rounded-2xl shadow-2xl max-w-5xl w-full border border-border relative overflow-hidden flex flex-col max-h-full">
        {/* Decorative Grid Background for the Panel */}
        <div className="absolute inset-0 map-grid opacity-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-foreground mb-2 tracking-tighter uppercase" style={{ textShadow: '0 0 20px rgba(var(--primary),0.3)' }}>
              Target Sector Selection
            </h1>
            <p className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
              Configure Training Parameters
            </p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center mb-6 shrink-0">
            <Button variant="outline" size="sm" onClick={handleSelectAll} className="uppercase font-mono text-xs tracking-wider">All Sectors</Button>
            <Button variant="outline" size="sm" onClick={handleDeselectAll} className="uppercase font-mono text-xs tracking-wider">Clear</Button>
            <Button variant="ghost" size="sm" onClick={handleSelectPriorityCities} className="uppercase font-mono text-xs tracking-wider text-green-500 hover:text-green-400 hover:bg-green-500/10">Priority Targets</Button>
          </div>

          {/* Grid Area - Scrollable */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent flex-grow min-h-0">
            {cityStats.map(city => (
              <label
                key={city.name}
                className={`
                  relative flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all duration-200 border
                  ${selectedCities.has(city.name)
                    ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)] scale-105'
                    : 'bg-background/40 border-border text-muted-foreground hover:bg-background/60 hover:border-gray-500 hover:text-foreground'}
                `}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedCities.has(city.name)}
                  onChange={() => toggleCity(city.name)}
                />
                <span className="font-bold text-sm tracking-tight mb-1">
                  {city.name}
                </span>
                <span className="text-[10px] font-mono opacity-70">
                  {city.count} Regions
                </span>

                {/* Active Indicator Dot */}
                {selectedCities.has(city.name) && (
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_rgba(var(--primary),0.8)]" />
                )}
              </label>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center pt-6 border-t border-border mt-4 shrink-0">
            <div className="text-xs font-mono text-muted-foreground mb-3">
              Total Targets: <span className="text-primary font-bold">{totalQuestCount}</span> / {fullMapData?.features.length || 0}
            </div>
            <Button
              size="lg"
              onClick={handleStart}
              disabled={selectedCities.size === 0}
              className={`min-w-[240px] text-lg transition-all duration-300 ${selectedCities.size > 0 ? 'animate-pulse-slow' : 'opacity-50'}`}
            >
              INITIALIZE MISSION
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
