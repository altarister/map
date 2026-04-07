import { useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useDispatchContext } from '../../contexts/DispatchContext';
import { useSettings } from '../../contexts/SettingsContext';
import { InseongApp } from '../AppView/Inseong/index';

export function StandaloneInseongView() {
    const { gameState, setGameState, startGame, fullMapData, setCurrentLocation, setTargetDestination, currentStage } = useGame();
    const { setCurrentStage } = useSettings();
    const { appendCall, setConfirmedCalls, setStreamingCalls } = useDispatchContext();

    // 1. Initialize Simulation State
    useEffect(() => {
        // Wait until the geo map data is loaded, then forcefully jump into Stage 2 (Dispatch Simulation)
        if (fullMapData && fullMapData.length > 0 && gameState !== 'PLAYING') {
            if (currentStage !== 2) {
                setCurrentStage(2);
                return; // Wait for the next React render cycle to ensure Stage 2 is registered
            }

            // Timeout ensures that useGameLogic's internal [currentStage] useEffect runs 
            // and resets states first, before we forcefully inject the PLAYING state.
            setTimeout(() => {
                // 게임 재시작 시 잔여 콜 초기화 (무한 루프 방지)
                if (setConfirmedCalls) setConfirmedCalls([]);
                if (setStreamingCalls) setStreamingCalls([]);
                
                // 경기도 광주시(41610)를 기본 거점 및 목표 하차 방향으로 설정
                setCurrentLocation({ code: '41610', name: '광주시' });
                setTargetDestination({ code: '41610', name: '광주시' });
                setGameState('PLAYING');
                startGame({}, true);
            }, 50);
        }
    }, [fullMapData, gameState, startGame, currentStage, setCurrentStage, setGameState, setTargetDestination]);

    // 2. PostMessage API Bridge for One-Dal parent communication
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const data = event.data;
            if (!data) return;

            // Handle location updates from the parent wrapper
            if (data.type === 'SIMULATION_UPDATE_LOCATION') {
                if (data.code && data.name) {
                    setCurrentLocation({ code: data.code, name: data.name });
                }
            }

            // Handle forceful call injection from external systems
            if (data.type === 'SIMULATION_INJECT_CALL') {
                if (data.call && appendCall) {
                    appendCall(data.call);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [setCurrentLocation, appendCall]);

    // 3. Render
    if (gameState !== 'PLAYING') {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#111] text-gray-400 font-mono text-xs tracking-widest uppercase relative z-50">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <span className="text-2xl">🔥</span>
                    <span>Initializing Simulation Engine...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-dvh bg-[#111] overflow-hidden relative font-sans text-black" id="standalone-root">
            <InseongApp />
        </div>
    );
}
