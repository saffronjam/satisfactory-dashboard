import { useEffect, useRef, useState } from 'react';
import { Train } from 'src/apiTypes';

export interface AnimatedPosition {
  x: number;
  y: number;
  rotation: number;
}

interface AnimatedTrain {
  train: Train;
  currentPosition: AnimatedPosition;
  targetPosition: AnimatedPosition;
  startPosition: AnimatedPosition;
  animationStartTime: number;
}

const ANIMATION_DURATION = 4500; // ms - slightly longer than 4s poll interval
const POSITION_THRESHOLD = 0.01; // Only update if position changed by this much

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * Math.min(Math.max(t, 0), 1);
}

function lerpAngle(start: number, end: number, t: number): number {
  // Normalize angles to 0-360
  const normalizedStart = ((start % 360) + 360) % 360;
  const normalizedEnd = ((end % 360) + 360) % 360;

  // Find shortest rotation direction
  let diff = normalizedEnd - normalizedStart;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return normalizedStart + diff * Math.min(Math.max(t, 0), 1);
}

function positionsEqual(
  a: Map<string, AnimatedPosition>,
  b: Map<string, AnimatedPosition>
): boolean {
  if (a.size !== b.size) return false;
  for (const [key, posA] of a) {
    const posB = b.get(key);
    if (!posB) return false;
    if (
      Math.abs(posA.x - posB.x) > POSITION_THRESHOLD ||
      Math.abs(posA.y - posB.y) > POSITION_THRESHOLD ||
      Math.abs(posA.rotation - posB.rotation) > POSITION_THRESHOLD
    ) {
      return false;
    }
  }
  return true;
}

export function useTrainAnimation(trains: Train[]): Map<string, AnimatedPosition> {
  const animatedTrainsRef = useRef<Map<string, AnimatedTrain>>(new Map());
  const [positions, setPositions] = useState<Map<string, AnimatedPosition>>(new Map());
  const lastPositionsRef = useRef<Map<string, AnimatedPosition>>(new Map());
  const rafRef = useRef<number>();
  const prevTrainHashRef = useRef<string>('');
  const lastUpdateTimeRef = useRef<number>(0);

  // Update targets when train data changes
  useEffect(() => {
    // Create a hash of train positions to detect actual data changes (not just reference changes)
    const trainHash = trains.map((t) => `${t.name}:${t.x}:${t.y}:${t.rotation}`).join('|');

    // Skip if train data hasn't actually changed - prevents infinite re-render loop
    if (trainHash === prevTrainHashRef.current) {
      return;
    }
    prevTrainHashRef.current = trainHash;

    const now = performance.now();

    // Track which trains exist in the new data
    const currentTrainNames = new Set<string>();
    // Track new trains that need immediate position update
    const newTrainPositions = new Map<string, AnimatedPosition>();

    for (const train of trains) {
      currentTrainNames.add(train.name);
      const existing = animatedTrainsRef.current.get(train.name);

      if (existing) {
        // Update target, keeping current interpolated position as start
        existing.startPosition = { ...existing.currentPosition };
        existing.targetPosition = { x: train.x, y: train.y, rotation: train.rotation };
        existing.animationStartTime = now;
        existing.train = train;
      } else {
        // New train - start at actual position (no animation needed)
        const pos = { x: train.x, y: train.y, rotation: train.rotation };
        animatedTrainsRef.current.set(train.name, {
          train,
          currentPosition: { ...pos },
          targetPosition: { ...pos },
          startPosition: { ...pos },
          animationStartTime: now,
        });
        // Mark this train for immediate position update
        newTrainPositions.set(train.name, { ...pos });
      }
    }

    // Remove trains that no longer exist
    for (const name of animatedTrainsRef.current.keys()) {
      if (!currentTrainNames.has(name)) {
        animatedTrainsRef.current.delete(name);
      }
    }

    // Immediately update positions state for new trains so they render at correct positions
    // without waiting for the animation frame
    if (newTrainPositions.size > 0) {
      setPositions((prevPositions) => {
        const newPositions = new Map(prevPositions);
        for (const [name, pos] of newTrainPositions) {
          newPositions.set(name, pos);
        }
        return newPositions;
      });
    }
  }, [trains]);

  // Animation loop
  useEffect(() => {
    const animate = (time: number) => {
      const newPositions = new Map<string, AnimatedPosition>();

      for (const [name, animated] of animatedTrainsRef.current) {
        const elapsed = time - animated.animationStartTime;
        const t = Math.min(elapsed / ANIMATION_DURATION, 1);

        animated.currentPosition = {
          x: lerp(animated.startPosition.x, animated.targetPosition.x, t),
          y: lerp(animated.startPosition.y, animated.targetPosition.y, t),
          rotation: lerpAngle(animated.startPosition.rotation, animated.targetPosition.rotation, t),
        };

        newPositions.set(name, { ...animated.currentPosition });
      }

      // Only update state if enough time has passed (throttle to ~20fps) and positions changed
      // This prevents "Maximum update depth exceeded" warnings from too-frequent state updates
      const timeSinceLastUpdate = time - lastUpdateTimeRef.current;
      if (timeSinceLastUpdate >= 50 && !positionsEqual(newPositions, lastPositionsRef.current)) {
        lastPositionsRef.current = newPositions;
        lastUpdateTimeRef.current = time;
        setPositions(newPositions);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return positions;
}
