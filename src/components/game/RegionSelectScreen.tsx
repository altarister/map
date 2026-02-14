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

  if (loading || !mapDataLevel2) return <div>Loading data...</div>;

  return (
    <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center p-8 overflow-y-auto">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-4xl w-full border border-slate-200">
        <h1 className="text-3xl font-bold text-slate-800 mb-2 text-center">지역 선택</h1>
        <p className="text-slate-600 mb-6 text-center">게임을 진행할 지역을 선택해주세요.</p>

        <div className="flex flex-wrap gap-2 justify-center mb-6">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>전체 선택</Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll}>전체 해제</Button>
          <Button variant="primary" size="sm" onClick={handleSelectKeyCities}>주요 6개 도시 (추천)</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8 max-h-[400px] overflow-y-auto p-2">
          {availableCities.map(city => (
            <label
              key={city}
              className={`
                flex items-center p-3 rounded-lg border cursor-pointer transition-all
                ${selectedCities.has(city)
                  ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500'
                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}
              `}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={selectedCities.has(city)}
                onChange={() => toggleCity(city)}
              />
              <span className={`text-sm font-medium ${selectedCities.has(city) ? 'text-indigo-700' : 'text-slate-700'}`}>
                {city}
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-center">
          <Button size="lg" onClick={handleStart} disabled={selectedCities.size === 0}>
            게임 시작 ({selectedCities.size}개 지역)
          </Button>
        </div>
      </div>
    </div>
  );
};
