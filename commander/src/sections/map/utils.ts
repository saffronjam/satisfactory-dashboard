import { DroneStation, Machine, MachineCategoryGenerator, TrainStation } from 'src/apiTypes';
import { MachineGroup } from 'src/types';

// Entity type for unified grouping
type GroupableEntity =
  | { type: 'machine'; data: Machine; x: number; y: number }
  | { type: 'trainStation'; data: TrainStation; x: number; y: number }
  | { type: 'droneStation'; data: DroneStation; x: number; y: number };

class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // Path compression
    }
    return this.parent[x];
  }

  union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX !== rootY) {
      if (this.rank[rootX] > this.rank[rootY]) {
        this.parent[rootY] = rootX;
      } else if (this.rank[rootX] < this.rank[rootY]) {
        this.parent[rootX] = rootY;
      } else {
        this.parent[rootY] = rootX;
        this.rank[rootX]++;
      }
    }
  }
}

export function groupMachines(nodes: Machine[], distance: number): Machine[][] {
  const n = nodes.length;
  const uf = new UnionFind(n);

  // Helper to calculate Euclidean distance
  const euclideanDistance = (a: Machine, b: Machine): number =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  // Compare every pair of nodes (brute force for simplicity)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (euclideanDistance(nodes[i], nodes[j]) < distance) {
        uf.union(i, j);
      }
    }
  }

  // Group nodes by their connected components
  const groups: Map<number, Machine[]> = new Map();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    if (!groups.has(root)) {
      groups.set(root, []);
    }
    groups.get(root)!.push(nodes[i]);
  }

  return Array.from(groups.values());
}

export const computeMachineGroups = (machines: Machine[], groupDistance: number) => {
  return computeUnifiedGroups(machines, [], [], groupDistance);
};

// Unified grouping function that groups machines, train stations, and drone stations together
export const computeUnifiedGroups = (
  machines: Machine[],
  trainStations: TrainStation[],
  droneStations: DroneStation[],
  groupDistance: number
): MachineGroup[] => {
  // Create unified entities array
  const entities: GroupableEntity[] = [
    ...machines.map((m) => ({ type: 'machine' as const, data: m, x: m.x, y: m.y })),
    ...trainStations.map((s) => ({ type: 'trainStation' as const, data: s, x: s.x, y: s.y })),
    ...droneStations.map((s) => ({ type: 'droneStation' as const, data: s, x: s.x, y: s.y })),
  ];

  if (entities.length === 0) return [];

  // Group all entities together based on distance
  const groups = groupByDistance(entities, groupDistance);

  return groups.map((entityGroup) => {
    // Separate entities by type
    const groupMachines = entityGroup
      .filter((e): e is GroupableEntity & { type: 'machine' } => e.type === 'machine')
      .map((e) => e.data);
    const groupTrainStations = entityGroup
      .filter((e): e is GroupableEntity & { type: 'trainStation' } => e.type === 'trainStation')
      .map((e) => e.data);
    const groupDroneStations = entityGroup
      .filter((e): e is GroupableEntity & { type: 'droneStation' } => e.type === 'droneStation')
      .map((e) => e.data);

    // Calculate center from all entities
    const center = {
      x: entityGroup.reduce((acc, e) => acc + e.x, 0) / entityGroup.length,
      y: entityGroup.reduce((acc, e) => acc + e.y, 0) / entityGroup.length,
    };

    // Calculate power metrics from machines
    const powerConsumption = groupMachines.reduce((acc, m) => {
      if (m.category === MachineCategoryGenerator) return acc;
      return acc + (m.input.find((i) => i.name === 'Power')?.current || 0);
    }, 0);
    const powerProduction = groupMachines.reduce((acc, m) => {
      if (m.category !== MachineCategoryGenerator) return acc;
      return acc + (m.output.find((i) => i.name === 'Power')?.current || 0);
    }, 0);

    const itemProduction: { [key: string]: number } = {};
    const itemConsumption: { [key: string]: number } = {};

    groupMachines.forEach((m) => {
      m.output.forEach((p) => {
        if (p.name === 'Power') return;
        if (itemProduction[p.name] === undefined) {
          itemProduction[p.name] = 0;
        }
        itemProduction[p.name] += p.current;
      });

      m.input.forEach((i) => {
        if (i.name === 'Power') return;
        if (itemConsumption[i.name] === undefined) {
          itemConsumption[i.name] = 0;
        }
        itemConsumption[i.name] += i.current;
      });
    });

    // Create hash from all entities (sorted to ensure stable hash regardless of input order)
    const hash = [
      ...groupMachines.map((m) => `m:${m.x},${m.y},${m.z}`),
      ...groupTrainStations.map((s) => `t:${s.x},${s.y}`),
      ...groupDroneStations.map((s) => `d:${s.x},${s.y}`),
    ]
      .sort()
      .join('|');

    return {
      hash,
      machines: groupMachines,
      trainStations: groupTrainStations,
      droneStations: groupDroneStations,
      center,
      powerConsumption,
      powerProduction,
      itemProduction,
      itemConsumption,
    } as MachineGroup;
  });
};

// Generic grouping for any items with x, y coordinates
export function groupByDistance<T extends { x: number; y: number }>(
  items: T[],
  distance: number
): T[][] {
  if (distance === 0 || items.length === 0) {
    return items.map((item) => [item]);
  }

  const n = items.length;
  const uf = new UnionFind(n);

  const euclideanDistance = (a: T, b: T): number => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (euclideanDistance(items[i], items[j]) < distance) {
        uf.union(i, j);
      }
    }
  }

  const groups: Map<number, T[]> = new Map();
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    if (!groups.has(root)) {
      groups.set(root, []);
    }
    groups.get(root)!.push(items[i]);
  }

  return Array.from(groups.values());
}

export const zoomToGroupDistance = (zoom: number) => {
  zoom = Math.floor(zoom);
  switch (zoom) {
    case 3:
      return 12000;
    case 4:
      return 8000;
    case 5:
      return 4000;
    case 6:
      return 100;
    case 7:
      return 0;
    case 8:
      return 0;
    default:
      return 0;
  }
};
