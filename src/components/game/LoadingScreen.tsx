import React, { useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';

interface LoadingScreenProps {
    onStart: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onStart }) => {
    const { progress } = useGame();
    const { theme } = useSettings();
    const [isReady, setIsReady] = useState(false);

    // Consider loading complete when progress reaches 100
    // gameLoading might be false before progress is animated to 100, so rely on progress
    useEffect(() => {
        if (progress >= 100) {
            // Add a small delay for dramatic effect
            const timer = setTimeout(() => setIsReady(true), 500);
            return () => clearTimeout(timer);
        }
    }, [progress]);

    // Theme Styles
    const isTactical = theme === 'tactical';

    const bgClass = isTactical
        ? "bg-slate-900 text-emerald-400"
        : "bg-sky-100 text-blue-600";

    // Bar Container
    const barContainerClass = isTactical
        ? "bg-slate-800 border border-emerald-500/30"
        : "bg-white border border-blue-200";

    // Bar Fill
    const barFillClass = isTactical
        ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
        : "bg-blue-500";

    return (
        <div className={`absolute inset-0 z-[60] flex flex-col items-center justify-center ${bgClass} transition-opacity duration-1000`}>
            {/* Background Grid Pattern (Tactical Only) */}
            {isTactical && (
                <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: `
              linear-gradient(rgba(16,185,129,0.2) 1px, transparent 1px), 
              linear-gradient(90deg, rgba(16,185,129,0.2) 1px, transparent 1px)
            `,
                        backgroundSize: '40px 40px'
                    }}
                />
            )}

            <div className="relative z-10 flex flex-col items-center gap-8 min-w-[300px]">
                {/* Title */}
                <div className="text-center">
                    <h1 className={`text-4xl font-black tracking-wider mb-2 ${isTactical ? 'font-mono' : 'font-sans'}`}>
                        {isTactical ? '작전 지도' : '대한민국 지리 퀴즈'}
                    </h1>
                    <p className={`text-sm tracking-widest opacity-70 ${isTactical ? 'font-mono' : 'font-sans'}`}>
                        {isTactical ? '시스템 초기화 중...' : '우리나라 지도를 배워봅시다!'}
                    </p>
                </div>

                {/* Progress System */}
                <div className="w-full max-w-md flex flex-col gap-2">
                    {/* Progress Bar Container */}
                    <div className={`h-4 w-full rounded-full overflow-hidden relative ${barContainerClass}`}>
                        {/* Animated Fill */}
                        <div
                            className={`h-full transition-all duration-300 ease-out ${barFillClass}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-xs font-mono opacity-80">
                        <span>{progress < 100 ? '데이터 로딩 중...' : '준비 완료'}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                </div>

                {/* Start Button */}
                <div className={`transition-all duration-500 transform ${isReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <button
                        onClick={onStart}
                        disabled={!isReady}
                        className={`
              px-8 py-4 rounded font-bold text-lg transition-all duration-200 transform
              active:scale-95 hover:scale-105
              ${isTactical
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400 font-mono tracking-widest'
                                : 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg rounded-xl font-sans'}
              disabled:cursor-not-allowed
            `}
                    >
                        {isTactical ? '[ 작전 개시 ]' : '게임 시작'}
                    </button>
                </div>
            </div>
        </div>
    );
};
