import React, { useState } from 'react';
import { Line, Marker } from '@vnedyalk0v/react19-simple-maps';
import type { LevelStrategy, LevelContext, GameQuestion, UserInput } from '../../core/types';
import { generateLevel3Question } from './generator';
import { validateLevel3Answer } from './validator';

export const Level3Strategy: LevelStrategy = {
  config: {
    id: 3,
    name: "3단계: 거리 추정",
    description: "두 지점 사이의 직선 거리를 추정해보세요."
  },

  generateQuestion: (ctx: LevelContext) => {
    return generateLevel3Question(ctx);
  },

  validateAnswer: (question: GameQuestion, input: UserInput) => {
    if (question.type !== 'ESTIMATE_DIST') {
      throw new Error('Level 3 strategy received invalid question type');
    }
    return validateLevel3Answer(question, input);
  },

  renderInstruction: (question: GameQuestion) => { 
    if (question.type !== 'ESTIMATE_DIST') return null;
    
    return (
      <div className="flex flex-col items-center">
         <div className="flex items-center gap-2 text-base">
            <span className="font-bold text-blue-600">{question.start.name}</span>
            <span className="text-slate-400">↔</span>
            <span className="font-bold text-red-600">{question.end.name}</span>
         </div>
         <div className="text-sm text-slate-500 mt-1">
           두 지역 간의 거리는 몇 km 일까요?
         </div>
      </div>
    );
  },

  renderMapOverlay: (question: GameQuestion) => {
    if (question.type !== 'ESTIMATE_DIST') return null;
    
    // Start와 End 마커, 그리고 점선 연결
    // 좌표는 Question에 이미 있음 (generator에서 계산함)
    // 하지만 Question type definition에 coordinate가 있는지 확인 필요 via types.ts
    // generator.ts에서 coordinate를 넣었지만, types.ts의 EstimateDistanceQuestion에는 coordinate가 정의되어 있어야 함.
    // (이전 단계에서 types.ts 수정했음)

    const startCoord = question.start.coordinate;
    const endCoord = question.end.coordinate;

    if (!startCoord || !endCoord) return null;

    return (
      <>
        {/* 상차지(출발) 마커 */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Marker coordinates={startCoord as any}>
          <circle r={4} fill="#2563eb" stroke="#fff" strokeWidth={2} />
        </Marker>

        {/* 하차지(도착) 마커 */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Marker coordinates={endCoord as any}>
          <circle r={4} fill="#dc2626" stroke="#fff" strokeWidth={2} />
        </Marker>

        {/* 연결 선 */}
        <Line
          from={startCoord as any}
          to={endCoord as any}
          stroke="#94a3b8"
          strokeWidth={2}
          strokeDasharray="4 4" // 점선
        />
      </>
    );
  },

  renderControlPanel: (question: GameQuestion, onSubmit: (input: UserInput) => void) => {
     if (question.type !== 'ESTIMATE_DIST') return null;

     return <DistanceInputForm onSubmit={onSubmit} />;
  }
};

const DistanceInputForm = ({ onSubmit }: { onSubmit: (input: UserInput) => void }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onSubmit({ type: 'ESTIMATE_VALUE', value: numValue });
      setValue(''); // 제출 후 초기화? (선택사항)
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex gap-2 justify-center">
      <input 
        type="number" 
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="예: 50"
        className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
        autoFocus
      />
      <span className="self-center font-bold text-slate-600">km</span>
      <button 
        type="submit"
        disabled={!value}
        className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
      >
        확인
      </button>
    </form>
  );
};
