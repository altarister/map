import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useMapContext } from '../../contexts/MapContext';
import { MasteryStorage } from '../../services/MasteryStorage';
import { useEffect } from 'react';

export const GameOptionSelectScreen = () => {
    const { cityData, loading } = useGame();
    const { difficulty, setDifficulty } = useSettings();
    const { setLayerVisibility } = useMapContext();

    // 컴포넌트 마운트 및 난이도 설정 초기화 시 레이어 가시성 동기화
    // 학습(NORMAL): 라벨 켜짐, 테스트(HARD): 라벨 꺼짐
    useEffect(() => {
        setLayerVisibility({ labels: difficulty === 'NORMAL' });
    }, [difficulty, setLayerVisibility]);

    // 난이도 변경 핸들러 (MasteryStorage에도 저장)
    const handleDifficultyChange = (newDifficulty: 'NORMAL' | 'HARD') => {
        setDifficulty(newDifficulty);
        MasteryStorage.saveDifficulty(newDifficulty);
    };

    if (loading || !cityData) return <div className="flex items-center justify-center h-full text-primary font-mono animate-pulse">LOADING MAP DATA...</div>;

    return (
        <div className="absolute inset-0 z-40 flex flex-col justify-between pt-24 pb-8 p-4 pointer-events-none">
            
            {/* =========================================================
                [MODULE 1] HEADER_SECTION 
                - 화면 최상단 영역: 제목, 레벨 탭, 난이도 조절 토글
            ========================================================= */}
            <div className="w-full flex items-center justify-between mb-8 px-4 pointer-events-auto flex-wrap gap-4">
                {/* [MODULE 1-3] DIFFICULTY_TOGGLE (난이도 조절 스위치) */}
                {/* <div className="flex items-center space-x-3 bg-background/80 backdrop-blur border border-white/10 px-4 py-2 rounded-full shadow-lg pointer-events-auto">
                    <span className={`text-sm font-bold ${difficulty === 'NORMAL' ? 'text-green-500' : 'text-muted-foreground'}`}>학습</span>
                    <button
                        onClick={() => handleDifficultyChange(difficulty === 'NORMAL' ? 'HARD' : 'NORMAL')}
                        className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                            ${difficulty === 'HARD' ? 'bg-red-500' : 'bg-green-500'}
                        `}
                    >
                        <span
                            className={`
                                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                ${difficulty === 'HARD' ? 'translate-x-6' : 'translate-x-1'}
                            `}
                        />
                    </button>
                    <span className={`text-sm font-bold ${difficulty === 'HARD' ? 'text-red-500' : 'text-muted-foreground'}`}>테스트</span>
                </div> */}
            </div>

            {/* =========================================================
                [MODULE 2] CENTER_GUIDE_SECTION
                - 지도 위 중앙 안내선 또는 목표지시 문구 영역 (데이터 없음 표기)
            ========================================================= */}
            <div className="flex-1 flex items-center justify-center">
                {/* [MODULE 2-1] CENTER_CROSSHAIR (중앙 지시 텍스트) */}
                <div className="text-white/50 animate-pulse text-lg font-black uppercase tracking-[0.5em] pointer-events-none drop-shadow-lg">
                    훈련 지역을 선택하십시오
                </div>
            </div>

            {/* =========================================================
                [MODULE 3] FOOTER_INSTRUCTION_SECTION
                - 하단 고정: 게임 플레이 방법을 안내하는 가이드라인 모달
            ========================================================= */}
            {/* <div className="w-full flex justify-center pb-8 pointer-events-auto">
                <div className="bg-black/60 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10 text-center shadow-2xl">
                    <p className="text-lg font-bold text-white mb-1">
                        <span className="text-primary">지도</span>를 직접 클릭하여 훈련을 시작하세요.
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                        * 마우스를 올리면 지역 정보를 확인할 수 있습니다.
                    </p>
                </div>
            </div> */}
        </div>
    );
};
