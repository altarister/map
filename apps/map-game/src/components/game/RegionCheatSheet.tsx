import { useState } from 'react';
import { useGeoContext } from '../../contexts/GeoDataContext';
import { useGame } from '../../contexts/GameContext';

interface Mnemonic {
    id: string;
    title: string;
    keywords: string[];
    regionCodes: string[];
    description: string;
}

export const RegionCheatSheet = ({ onClose }: { onClose: () => void }) => {
    const { filteredMapData } = useGeoContext();
    const { setHighlightRegions } = useGame();
    const [hoveredMnemonicId, setHoveredMnemonicId] = useState<string | null>(null);

    // Extract mnemonics from GeoJSON metadata
    const mnemonics: Mnemonic[] = filteredMapData?.metadata?.mnemonics || [];

    const handleMouseEnter = (mnemonic: Mnemonic) => {
        setHoveredMnemonicId(mnemonic.id);
        if (filteredMapData && filteredMapData.features) {
            const features = filteredMapData.features.filter(f =>
                mnemonic.regionCodes.includes(f.properties.code)
            );
            setHighlightRegions(features);
        }
    };

    const handleMouseLeave = () => {
        setHoveredMnemonicId(null);
        setHighlightRegions([]);
    };

    if (mnemonics.length === 0) {
        return null;
    }

    return (
        <div className="absolute top-20 left-[280px] w-80 bg-slate-900/95 border border-white/20 rounded-xl shadow-2xl backdrop-blur-md z-[60] overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex justify-between items-center">
                <h3 className="text-white font-bold text-sm tracking-wide flex items-center gap-2">
                    <span>💡</span> 지역 암기장 (Cheat Sheet)
                </h3>
                <button
                    onClick={onClose}
                    className="text-white/70 hover:text-white transition-colors"
                    title="닫기"
                >
                    ✕
                </button>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3 relative">
                <p className="text-xs text-slate-400 mb-1 leading-relaxed">
                    실전 기사들이 주로 사용하는 지역 연상법입니다. 리스트에 마우스를 올리면 지도에 해당 지역들이 즉시 표시됩니다.
                </p>

                {mnemonics.map((m) => (
                    <div
                        key={m.id}
                        className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${hoveredMnemonicId === m.id
                            ? 'bg-blue-500/20 border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                        onMouseEnter={() => handleMouseEnter(m)}
                        onMouseLeave={handleMouseLeave}
                    >
                        <h4 className={`font-bold text-sm mb-1 ${hoveredMnemonicId === m.id ? 'text-blue-300' : 'text-slate-200'}`}>
                            {m.title}
                        </h4>
                        <div className="flex flex-wrap gap-1 mb-2">
                            {m.keywords.map((kw, i) => (
                                <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                                    {kw}
                                </span>
                            ))}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                            {m.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};
