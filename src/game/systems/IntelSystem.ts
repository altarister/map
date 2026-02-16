import { geoDistance, geoContains } from 'd3-geo';
import type { RegionFeature } from '../../types/geo';
import type { Feature } from 'geojson';

// --- Types ---
export interface IntelData {
    regionCode: string;
    regionName: string;
    neighbors: string[]; // Names of adjacent regions
    roads: string[];     // Names of roads passing through
}

// --- Constants ---
// Adjacency Threshold (approximate distance in radians for neighbors)
// This needs tuning based on the map scale. For Korea districts, 0.05 might be too big or small.
// Let's use a small value. 1 degree ~ 0.017 rad.
const NEIGHBOR_DISTANCE_THRESHOLD = 0.08;

// --- Logic ---

/**
 * Calculates adjacent regions for a target region.
 * Uses a simplified Centroid Distance check for performance.
 * @param target The region to find neighbors for
 * @param allRegions List of all candidate neighbors
 */
export const getAdjacentRegions = (
    target: RegionFeature,
    allRegions: RegionFeature[]
): string[] => {
    if (!target.properties.centroid) return [];

    const targetCentroid = target.properties.centroid;
    const neighbors: { name: string, dist: number }[] = [];

    for (const region of allRegions) {
        // Skip self
        if (region.properties.code === target.properties.code) continue;
        if (!region.properties.centroid) continue;

        const dist = geoDistance(targetCentroid, region.properties.centroid);

        // Initial check: if centroids are close enough, they might be neighbors
        // Threshold: 0.1 radians is ~637km. 0.01 is ~63km.
        // For adjacent districts, distance should be very small.
        if (dist < 0.05) {
            neighbors.push({ name: region.properties.name, dist });
        }
    }

    // Sort by distance (closest first)
    neighbors.sort((a, b) => a.dist - b.dist);

    console.log(`IntelSystem: Neighbors for ${target.properties.name}`, neighbors);

    // Return top 3 closest unique names
    return Array.from(new Set(neighbors.map(n => n.name))).slice(0, 3);
};

/**
 * Finds roads passing through or near a target region.
 * @param target The region feature
 * @param roadFeatures List of road features
 */
export const getPassingRoads = (
    target: RegionFeature,
    roadFeatures: any[]
): string[] => {
    if (!target || !roadFeatures) return [];

    // NOTE: True geometric intersection is expensive.
    // We'll use a property-based approach if data exists, or a simplified check.
    // For now, let's return a placeholder or mock implementation 
    // until we have a robust spatial index for roads.

    // Placeholder: "Route 42", "Highway 1"
    // In a real implementation, we'd query the Quadtree.
    return [];
};
