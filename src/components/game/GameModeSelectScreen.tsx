
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';
import { GameStages } from '../../game/stages/registry';
import { useState, useEffect } from 'react';
import { MasteryStorage } from '../../services/MasteryStorage';

export const GameModeSelectScreen = () => {
    const { setGameState } = useGame();
    const { theme } = useSettings();

    const isTactical = theme === 'tactical';
    const stages = Object.values(GameStages); // 1, 2, 3 단계 배열

    // 각 스테이지의 잠금 상태를 로컬스토리지 숙달 데이터를 기반으로 확인 (마운트 시 한 번)
    const [unlockedStages, setUnlockedStages] = useState<Record<number, boolean>>({ 1: true });

    useEffect(() => {
        const checkUnlockStatus = () => {
            const mastery = MasteryStorage.loadAllMastery(); // 전체 숙달 데이터 가져옴 (객체: { 41135: 80, 11110: 100, ... })
            // 현재 지역코드를 키로 쓰기 때문에 특정 '단계(Stage)' 단위의 기록은 아직 서버/로컬 구조에 명확히 없지만, 
            // 일단 에러가 나지 않도록 임시로 평균/혹은 임의 계산 로직을 거치거나(이후 기획에 따라) 우선 true로 열어둡니다.
            // (혹은 나중에 'stage2_score' 처럼 별도의 키를 만들어서 점수를 관리해야 할 수도 있음)
            
            const unlockStatus: Record<number, boolean> = { 1: true }; // 1단계는 항상 열림
            
            for (const stage of stages) {
                const condition = stage.config.unlockCondition;
                if (!condition || !condition.requireStageClear) {
                    unlockStatus[stage.config.id] = true;
                } else {
                    const requiredStageId = condition.requireStageClear;
                    
                    // 향후 Stage 별 점수를 따로 저장하게 된다면 아래 로직 사용
                    // const prevScore = mastery[`stage_${requiredStageId}`] || 0;
                    // 우선은 임시로 모든 단계를 해제 상태로 두거나 특정 테스트 점수로 대체합니다.
                    // 실제 구현 시 백엔드 혹은 로컬스토리지에 stage 번호를 키로 점수를 남겨야 함
                    const prevScore = 100; // 잠시 임시 하드코딩 (나중에 기획 구체화 시 적용)
                    
                    unlockStatus[stage.config.id] = prevScore >= 80;
                }
            }
            setUnlockedStages(unlockStatus);
        };
        checkUnlockStatus();
    }, [stages]);

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="flex flex-col items-start gap-6 max-w-4xl w-full px-8">

                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic shadow-black drop-shadow-md">
                        <span className="text-primary mr-2">///</span>훈련 코스 선택
                    </h1>
                    <p className="text-gray-400 font-mono text-sm">
                        수행할 훈련의 코스를 선택하십시오.
                    </p>
                </div>

                {/* Mode Cards Container */}
                <div className="grid grid-cols-1 gap-6 w-full max-w-lg">

                    {stages.map((strategy) => {
                        const { id, name, shortDescription, description, badge, unlockCondition } = strategy.config;
                        const isUnlocked = unlockedStages[id];

                        if (isUnlocked) {
                            // 열린 모드
                            return (
                                <button
                                    key={`stage-${id}`}
                                    onClick={() => setGameState('LEVEL_SELECT')} // 선택 화면으로 넘어가거나 바로 시작
                                    className={`
                                        group relative flex flex-col items-start p-6 rounded-xl border-l-4 transition-all duration-300
                                        ${isTactical
                                        ? 'bg-slate-900/90 border-emerald-500 hover:bg-slate-800 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                        : 'bg-white border-blue-500 hover:bg-blue-50 shadow-lg'}
                                    `}
                                >
                                    <div className="flex justify-between w-full items-center mb-2">
                                        <h2 className={`text-2xl font-bold ${isTactical ? 'text-emerald-400' : 'text-blue-600'}`}>
                                            {name}
                                        </h2>
                                        <span className={`text-xs font-mono px-2 py-1 rounded ${isTactical ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-100 text-blue-600'}`}>
                                            {badge || 'M O D E'}
                                        </span>
                                    </div>

                                    <p className="text-gray-300 text-sm text-left mb-4 leading-relaxed">
                                        {shortDescription || description}<br />
                                    </p>

                                    <div className={`mt-auto w-full h-px ${isTactical ? 'bg-emerald-500/30' : 'bg-blue-200'} group-hover:bg-emerald-500 transition-colors`} />

                                    <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 text-emerald-500">
                                        ▶
                                    </div>
                                </button>
                            );
                        } else {
                            // 잠긴 모드
                            return (
                                <div key={`stage-${id}-locked`} className="relative flex flex-col items-start p-6 rounded-xl border-l-4 border-gray-700 bg-gray-900/50 opacity-60 cursor-not-allowed grayscale">
                                    <div className="flex justify-between w-full items-center mb-2">
                                        <h2 className="text-2xl font-bold text-gray-500">
                                            {name}
                                        </h2>
                                        <span className="text-xs font-mono px-2 py-1 rounded bg-gray-800 text-gray-500">
                                            {badge || 'L O C K E D'}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-sm text-left">
                                        {shortDescription || description}<br />
                                        <span className="text-xs text-red-500/80 mt-1 block">"{unlockCondition?.requireStageClear}단계 80점 숙달 후 해금됩니다."</span>
                                    </p>
                                </div>
                            );
                        }
                    })}

                </div>

            </div>
        </div>
    );
};
