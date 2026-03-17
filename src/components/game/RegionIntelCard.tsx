import type { RegionIntel } from '../../types/intel';

interface RegionIntelCardProps {
    intel: RegionIntel;
    onClose?: () => void;
    className?: string;
}

export const RegionIntelCard = ({ intel, onClose, className = '' }: RegionIntelCardProps) => {
    // 별표 표시기 (총 5개 중 importance 개수만큼 활성화)
    const renderStars = (count: number) => {
        return (
            <div className="flex gap-1 text-[10px] mt-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={star <= count ? 'text-yellow-400' : 'text-gray-600'}>
                        ★
                    </span>
                ))}
            </div>
        );
    };

    // 오더 수 라벨 색상 (상/중/하)
    const getOrderVolumeColor = (volume: string) => {
        if (volume.includes('상')) return 'bg-red-500/20 text-red-400 border-red-500/30';
        if (volume.includes('중')) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    };

    return (
        <div className={`glass-panel p-4 flex flex-col gap-3 relative overflow-hidden ${className}`}>
            {/* 타이틀 영역 */}
            <div className="flex justify-between items-start border-b border-white/10 pb-2">
                <div>
                    <h3 className="text-sm font-bold text-white leading-none">
                        {intel.parentName} {intel.name}
                    </h3>
                    {renderStars(intel.importance)}
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-1 -mt-1 -mr-1"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* 핵심 정보 뱃지 */}
            <div className="flex gap-2 text-[10px] font-bold">
                <div className={`px-2 py-1 rounded border ${getOrderVolumeColor(intel.orderVolume)}`}>
                    오더 수: {intel.orderVolume}
                </div>
            </div>

            {/* 주요 도로 */}
            {intel.roads.length > 0 && (
                <div className="text-xs">
                    <h4 className="text-gray-500 mb-1 font-mono uppercase text-[10px]">연결망/주요도로</h4>
                    <div className="flex flex-wrap gap-1">
                        {intel.roads.map((road, idx) => (
                            <span key={idx} className="bg-white/10 text-white/90 px-1.5 py-0.5 rounded shadow-sm text-[10px]">
                                {road}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* 특징 및 실전 팁 */}
            {intel.fieldTips.length > 0 && (
                <div className="text-xs bg-black/20 rounded p-2 border border-white/5">
                    <h4 className="text-yellow-500 mb-1.5 font-bold text-[10px]">💡 실전 인텔(Tips)</h4>
                    <ul className="space-y-1.5 text-gray-300">
                        {intel.fieldTips.map((tip, idx) => (
                            <li key={idx} className="flex gap-1.5 leading-snug">
                                <span className="text-yellow-600 opacity-70">▸</span>
                                <span>{tip}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
