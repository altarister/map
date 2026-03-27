// src/game/stages/Stage2_Route/optimizer.ts
import type { CallItem, LocationPoint } from '../../core/types';
import { calculateDistanceKm } from '../../../utils/geo';
import { fetchRealWorldRoute } from '../../../utils/osrm';
import { RANK_THRESHOLDS } from './constants';

export interface RoutePoint extends LocationPoint {
  type: 'START' | 'PICKUP' | 'DROPOFF';
  callId?: string;
  waypointIndex?: number; // 콜 내 상/하차 순번 (예: 하차1, 하차2 -> 1, 2)
}

export interface RouteOptimizationResult {
  idealDistanceKm: number;
  totalFare: number;
  profitPerKm: number;
  maxDirectDistanceKm: number; // 기사 위치 ~ 가장 먼 하차지 직접 연결 거리 (메인 축)
  detourDistanceKm: number;    // 합짐으로 인해 늘어난 거리
  detourRate: number;          // 우회율 (%)
  rank: 'S' | 'A' | 'B' | 'C' | 'F';
  feedback: string;
  orderedPoints: RoutePoint[]; // 최적 방문 순서 (렌더링용 다각형 애니메이션 라인)
  
  // Real Routing 고도화 속성
  realGeometry?: [number, number][]; // OSRM 도로 궤적 (LineString coordinates)
  isHeuristicRoute?: boolean;        // API 실패로 휴리스틱 거리 보정이 들어갔는지 여부
  roadNames?: string[];              // 통과하는 주요 도로명 텍스트 배열
}

export class RouteOptimizer {
  /**
   * 5개의 콜 데이터를 받아 TSP 기반의 이상적 최단 동선을 계산합니다.
   * [제약 조건] 특정 콜의 dropoffs를 방문하려면, 해당 콜의 모든 pickups가 선행 방문(픽업 완료)되어야 함.
   * 
   * @param calls 유저가 확정한 배차(합짐) 목록
   * @param startLocation 유저의 현재 거점(시작점)
   * @returns Promise<RouteOptimizationResult> - OSRM 통신이 포함된 종합 분석 결과 및 랭크
   */
  static async analyzeBatch(calls: CallItem[], startLocation: { code: string; name: string; center?: [number, number] }): Promise<RouteOptimizationResult> {
    // 1. 모든 노드 추출
    const nodes: Array<{
      id: string; // 고유 ID (call.id + _pickup_ + idx)
      callId: string;
      type: 'PICKUP' | 'DROPOFF';
      waypointIndex: number;
      point: LocationPoint;
    }> = [];

    const callRequirements: Record<string, { totalPickups: number }> = {};
    const callFareSum = calls.reduce((sum, c) => sum + c.fare, 0);

    calls.forEach(call => {
      callRequirements[call.id] = { totalPickups: call.pickups.length };
      call.pickups.forEach((p, idx) => {
        nodes.push({ id: `${call.id}_P_${idx}`, callId: call.id, type: 'PICKUP', waypointIndex: idx + 1, point: p });
      });
      call.dropoffs.forEach((d, idx) => {
        nodes.push({ id: `${call.id}_D_${idx}`, callId: call.id, type: 'DROPOFF', waypointIndex: idx + 1, point: d });
      });
    });

    const numNodes = nodes.length;
    let minDistance = Infinity;
    let bestPathIndices: number[] = [];

    // DFS 상태
    const visited = new Array(numNodes).fill(false);
    const pickupCountPerCall: Record<string, number> = {};
    calls.forEach(c => pickupCountPerCall[c.id] = 0);
    const currentPath: number[] = [];

    // 거리 캐싱
    const getDistance = (p1?: LocationPoint, p2?: LocationPoint) => {
      if (!p1 || !p2 || !p1.centroid || !p2.centroid) return 0;
      return calculateDistanceKm(p1.centroid, p2.centroid);
    };

    const startPoint: RoutePoint = {
      code: startLocation.code,
      name: startLocation.name,
      fullName: startLocation.name,
      centroid: startLocation.center as [number, number],
      type: 'START'
    };

    // TSP DFS 탐색 (백트래킹)
    const dfs = (currentDistance: number, lastPoint: LocationPoint, depth: number) => {
      // Branch and Bound (가지치기)
      if (currentDistance >= minDistance) return;

      if (depth === numNodes) {
        minDistance = currentDistance;
        bestPathIndices = [...currentPath];
        return;
      }

      for (let i = 0; i < numNodes; i++) {
        if (!visited[i]) {
          const node = nodes[i];

          // 규칙 검사: 하차지 방문 시도 시, 해당 콜의 모든 상차지가 픽업되었는지 확인
          if (node.type === 'DROPOFF' && pickupCountPerCall[node.callId] < callRequirements[node.callId].totalPickups) {
            continue; // 제약 조건 위반이므로 건너뜀
          }

          visited[i] = true;
          currentPath.push(i);
          if (node.type === 'PICKUP') pickupCountPerCall[node.callId]++;

          const dist = getDistance(lastPoint, node.point);
          dfs(currentDistance + dist, node.point, depth + 1);

          // 백트래킹 복구
          visited[i] = false;
          currentPath.pop();
          if (node.type === 'PICKUP') pickupCountPerCall[node.callId]--;
        }
      }
    };

    dfs(0, startPoint, 0);

    // 최적 경로 구성
    const orderedPoints: RoutePoint[] = bestPathIndices.map(idx => ({
      ...nodes[idx].point,
      type: nodes[idx].type,
      callId: nodes[idx].callId,
      waypointIndex: nodes[idx].waypointIndex,
    }));
    orderedPoints.unshift(startPoint); // 궤적의 시작은 현재 위치

    // --- Phase 10: 외부 라우팅 API(또는 휴리스틱 폴백)를 호출하여 진짜 거리 확보 ---
    const realRoute = await fetchRealWorldRoute(orderedPoints);
    const finalDistanceKm = realRoute ? realRoute.totalDistanceKm : minDistance;

    const profitPerKm = finalDistanceKm > 0 ? callFareSum / finalDistanceKm : 0;
    
    // ================= 우회율 (Detour Rate) 산출 =================
    // 1. 메인 축(Main Axis) 구하기: 현재 위치에서 가장 멀리 있는 "하차지" 
    const dropoffDistances = calls.flatMap(c => c.dropoffs.map(d => getDistance(startPoint, d)));
    const maxDirectDistanceKm = dropoffDistances.length > 0 ? Math.max(...dropoffDistances) : 0;
    
    // 2. 우회 거리 & 우회율 (단, 하차지가 나와 아예 같은 곳이어서 maxDirect=0 인 예외 방어)
    const detourDistanceKm = Math.max(0, finalDistanceKm - maxDirectDistanceKm);
    const detourRate = maxDirectDistanceKm > 0 ? (detourDistanceKm / maxDirectDistanceKm) * 100 : 0;

    let rank: RouteOptimizationResult['rank'] = 'C';
    let feedback = "";

    if (profitPerKm >= RANK_THRESHOLDS.S) {
      rank = 'S';
      feedback = "합짐의 마술사! km당 최상의 운임을 기록했습니다.";
    } else if (profitPerKm >= RANK_THRESHOLDS.A) {
      rank = 'A';
      feedback = "훌륭한 동선 기획입니다. 빈차 운행이 거의 없네요.";
    } else if (profitPerKm >= RANK_THRESHOLDS.B) {
      rank = 'B';
      feedback = "무난한 운행이었습니다. 다소 공차가 섞여 있습니다.";
    } else if (profitPerKm >= RANK_THRESHOLDS.C) {
      rank = 'C';
      feedback = "배보다 배꼽이 큽니다! 짐을 싣지 않고 뛰는 구간이 너무 깁니다.";
    } else {
      rank = 'F';
      feedback = "최악의 동선입니다. 기름값이 더 나오겠습니다! 역방향 콜이 섞여 있습니다.";
    }

    return {
      idealDistanceKm: finalDistanceKm, // 기존 minDistance(직선거리)를 real distance로 교체
      totalFare: callFareSum,
      profitPerKm,
      maxDirectDistanceKm,
      detourDistanceKm,
      detourRate,
      rank,
      feedback,
      orderedPoints,
      realGeometry: realRoute ? realRoute.coordinates : undefined,
      isHeuristicRoute: !realRoute, // realRoute가 없으면(null) 렌더링 생략 플래그 켜기
      roadNames: realRoute ? realRoute.roadNames : [],
    };
  }
}
