import React from 'react';
import { useGame } from '../../contexts/GameContext';
import { useSettings } from '../../contexts/SettingsContext';

export const GameInfoPanel = React.memo(() => {
    const { gameState, score } = useGame();
    const { currentLevel } = useSettings();

    return (
        <div className="absolute bottom-4 left-4 glass-panel p-4 w-64 z-20">
            <h3 className="text-xs text-gray-400 font-mono uppercase mb-2">
                Game Info
            </h3>
            <div className="text-xs font-mono space-y-1 text-white">
                <div>Level: {currentLevel || '-'}</div>
                <div>State: {gameState}</div>
                {gameState === 'PLAYING' && (
                    <>
                        <div className="text-green-500">
                            Correct: {score.correct}
                        </div>
                        <div className="text-red-500">
                            Incorrect: {score.incorrect}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});

GameInfoPanel.displayName = 'GameInfoPanel';
