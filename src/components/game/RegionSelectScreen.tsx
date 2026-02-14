import { useMemo, useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { Button } from '../ui/Button';

// 주요 콜 발생 지역 (사용자 요청)
const KEY_CITIES = ['고양시', '파주시', '김포시', '화성시', '오산시', '광주시'];

export const RegionSelectScreen = () => {
  // mapDataLevel2를 가져와서 시/군/구 목록 생성에 사용
  const { mapDataLevel2, startGame, loading } = useGame();
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set(KEY_CITIES));

  // 사용 가능한 모든 시/군 추출 (Level 2 데이터 기반)
  const availableCities = useMemo(() => {
    if (!mapDataLevel2) return [];

    // Feature 이름에서 시/군 이름 추출 (예: "안산시 단원구" -> "안산시")
    const cities = new Set<string>();
    mapDataLevel2.features.forEach(f => {
      const name = f.properties.name;
      // 공백을 기준으로 첫 번째 단어가 "시"나 "군"으로 끝나면 그것만 추출
      // 예: "수원시 장안구" -> "수원시"
      // 예: "가평군" -> "가평군"
      // 예: "광명시" -> "광명시"
      const match = name.match(/^(\S+[시군])/);
      if (match) {
        cities.add(match[1]);
      } else {
        // 매치 안 되면 (예: 혹시라도 "무슨무슨구"만 있다면) 전체 이름 사용
        cities.add(name.split(' ')[0]);
      }
    });

    return Array.from(cities).sort();
  }, [mapDataLevel2]);

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
    setSelectedCities(new Set(availableCities));
  };

  const handleDeselectAll = () => {
    setSelectedCities(new Set());
  };

  const handleSelectKeyCities = () => {
    setSelectedCities(new Set(KEY_CITIES));
  };

  const handleStart = () => {
    if (selectedCities.size === 0) return;
    startGame(Array.from(selectedCities));
  };

  if (loading || !mapDataLevel2) return <div className="flex items-center justify-center h-full text-primary font-mono animate-pulse">LOADING GEODATA...</div>;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 overflow-y-auto bg-background/80 backdrop-blur-sm">
      <div className="glass-panel p-8 rounded-2xl shadow-2xl max-w-5xl w-full border border-border relative overflow-hidden">
        {/* Decorative Grid Background for the Panel */}
        <div className="absolute inset-0 map-grid opacity-20 pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-3xl font-black text-foreground mb-2 text-center tracking-tighter uppercase" style={{ textShadow: '0 0 20px rgba(var(--primary),0.3)' }}>
            Sector Selection
          </h1>
          <p className="text-muted-foreground mb-8 text-center font-mono text-sm tracking-widest uppercase">
            Select operational areas for this session
          </p>

          <div className="flex flex-wrap gap-3 justify-center mb-8">
            <Button variant="outline" size="sm" onClick={handleSelectAll} className="uppercase font-mono text-xs tracking-wider">Select All</Button>
            <Button variant="outline" size="sm" onClick={handleDeselectAll} className="uppercase font-mono text-xs tracking-wider">Clear All</Button>
            <Button variant="primary" size="sm" onClick={handleSelectKeyCities} className="uppercase font-mono text-xs tracking-wider">Priority Code: 6-CITY</Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8 max-h-[400px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            {availableCities.map(city => (
              <label
                key={city}
                className={`
                  flex items-center justify-center p-3 rounded cursor-pointer transition-all duration-200
                  ${selectedCities.has(city)
                    ? 'text-primary font-black scale-110'
                    : 'text-muted-foreground hover:text-foreground hover:scale-105 opacity-60 hover:opacity-100'}
                `}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedCities.has(city)}
                  onChange={() => toggleCity(city)}
                />
                <span className="text-sm tracking-tight">
                  {city}
                </span>
              </label>
            ))}
          </div>

          <div className="flex justify-center pt-4 border-t border-border">
            <Button size="lg" onClick={handleStart} disabled={selectedCities.size === 0} className="min-w-[200px] text-lg">
              INITIALIZE OP ({selectedCities.size})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
