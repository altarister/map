import React from 'react';
import { Line, Marker } from '@vnedyalk0v/react19-simple-maps';
import { geoCentroid } from 'd3-geo';
import type { LevelStrategy, LevelContext, GameQuestion, UserInput, ValidationResult } from '../../core/types';
import type { RegionFeature } from '../../../types/geo';
import { generateLevel2Question } from './generator';
import { validateLevel2Answer } from './validator';

interface Level2State {
  step: 'FIND_START' | 'FIND_END';
}

export const Level2Strategy: LevelStrategy = {
  config: {
    id: 2,
    name: "2단계: 경로 시각화",
    description: "상차지와 하차지를 순서대로 선택하여 이동 경로를 확인하세요."
  },

  generateQuestion: (ctx: LevelContext) => {
    return generateLevel2Question(ctx);
  },

  validateAnswer: (question: GameQuestion, input: UserInput, state: any) => {
    if (question.type !== 'LOCATE_PAIR') {
      throw new Error('Level 2 strategy received invalid question type');
    }
    
    const result = validateLevel2Answer(question, input, state);
    
    if (result.status === 'CONTINUE') {
       return { ...result, nextState: { step: 'FIND_END' } }; // 다음 상태 명시
    }
    
    return result;
  },

  renderInstruction: (question: GameQuestion, step?: number) => { 
    if (question.type !== 'LOCATE_PAIR') return null;
    
    return (
      <div className="flex flex-col items-center">
         <div className="flex items-center gap-2 text-lg">
            <span className="font-bold text-blue-600">상차지: {question.start.name}</span>
            <span className="text-slate-400">→</span>
            <span className="font-bold text-red-600">하차지: {question.end.name}</span>
         </div>
      </div>
    );
  },

  renderMapOverlay: (question: GameQuestion, mapData: RegionFeature[], state: any) => {
    if (question.type !== 'LOCATE_PAIR') return null;
    
    const currentState = state as Level2State;
    // 1. Start 지점 찾았으면 Start 지점에 마커 표시
    // 2. End 지점까지 찾았으면(혹은 FIND_END 상태인데 Start를 보여줘야 함)
    
    const startCode = question.start.code;
    const endCode = question.end.code;

    // Feature 찾기
    const startFeature = mapData.find(f => f.properties.code === startCode);
    const endFeature = mapData.find(f => f.properties.code === endCode);
    
    if (!startFeature) return null;

    const startCentroid = geoCentroid(startFeature);
    const endCentroid = endFeature ? geoCentroid(endFeature) : null;

    const overlays = [];

    // 상차지 마커 (항상 표시하거나, 찾은 후에 표시?)
    // 2단계 목표: 상차지 찍고 -> 하차지 찍기.
    // 상차지를 찍은 후(FIND_END)에는 상차지 위치에 마커가 있어야 헷갈리지 않음.
    if (currentState?.step === 'FIND_END') {
       // 상차지 마커
       overlays.push(
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         <Marker key="start-marker" coordinates={startCentroid as any}>
           <circle r={4} fill="#2563eb" stroke="#fff" strokeWidth={2} />
           <text textAnchor="middle" y={-10} style={{ fontSize: '10px', fill: '#2563eb', fontWeight: 'bold'}}>상차지</text>
         </Marker>
       );
       
       // 가이드 라인? (마우스 따라다니는 선은 여기서 구현 불가, UserInput 기반 아님)
    }

    // 정답을 다 맞췄거나 피드백 보여주는 시점?
    // useGameLogic에서 정답 맞추면 바로 다음 문제로 넘어감 (3초 딜레이 없음? 아 있음 setLastFeedback 등)
    // 하지만 state는 초기화될 수 있음.
    // 만약 "정답!" 상태라면 선을 그려주고 싶음.
    // 하지만 renderMapOverlay는 'currentQuestion'과 'state'만 받음.
    // 'lastFeedback'은 안 받음.
    // 정답 후 피드백 기간 동안은 question이 그대로임.
    // 하지만 state는? useGameLogic이 reset할 수도 있음.
    // 일단 FIND_END 상태에서 하차지까지 이은 선은... 하차지를 아직 못 찾았으니 못 그림.
    
    return <>{overlays}</>;
  }
};
