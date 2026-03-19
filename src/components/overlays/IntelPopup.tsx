import React from 'react';

interface IntelPopupProps {
    x: number; // Screen X
    y: number; // Screen Y
    data: {
        regionName: string;
        neighbors: string[];
        roads: string[];
    };
    onClose: () => void;
}

export const IntelPopup: React.FC<IntelPopupProps> = ({ x, y, data, onClose }) => {
    // Prevent popup from going off-screen (simple boundary check)
    // Assuming window size is available or passed down. For now, simple absolute positioning.

    return (
        <div
            className="fixed z-50 pointer-events-auto"
            style={{ top: y, left: x }}
        >
            <div className="relative bg-black/80 text-white p-4 rounded-lg border border-primary/50 shadow-2xl backdrop-blur-md min-w-[200px] animate-in fade-in zoom-in-95 duration-200">

                {/* Close Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="absolute top-1 right-1 text-xs text-white/50 hover:text-white p-1"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="flex items-center gap-2 mb-3 border-b border-primary/30 pb-2">
                    <span className="text-xl">📍</span>
                    <div>
                        <div className="text-[10px] text-primary/70 tracking-widest leading-none">지역 정보</div>
                        <div className="font-bold text-lg leading-tight text-white">{data.regionName}</div>
                    </div>
                </div>

                {/* Neighbors Section */}
                {data.neighbors.length > 0 && (
                    <div className="mb-3">
                        <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span>🔗</span> 인접 지역
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {data.neighbors.map((neighbor, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 bg-primary/20 text-primary-foreground border border-primary/30 rounded">
                                    {neighbor}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Roads Section */}
                {data.roads.length > 0 ? (
                    <div>
                        <div className="text-[10px] text-white/50 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span>🛣️</span> 주요 도로
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {data.roads.map((road, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-200 border border-amber-500/30 rounded">
                                    {road}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-[10px] text-white/30 italic">주요 도로 정보가 없습니다.</div>
                )}

            </div>

            {/* Click outside backdrop (transparent) to close */}
            <div
                className="fixed inset-0 -z-10"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
            />
        </div>
    );
};
