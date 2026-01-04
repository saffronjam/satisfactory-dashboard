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

export function useTrainAnimation(
  trains: Train[],
  enabled: boolean = true
): Map<string, AnimatedPosition> {
  const animatedTrainsRef = useRef<Map<string, AnimatedTrain>>(new Map());
  const [positions, setPositions] = useState<Map<string, AnimatedPosition>>(new Map());
  const rafRef = useRef<number>();

  // Update targets when train data changes
  useEffect(() => {
    if (!enabled) {
      animatedTrainsRef.current.clear();
      setPositions(new Map());
      return;
    }

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
  }, [trains, enabled]);

  // Animation loop
  useEffect(() => {
    if (!enabled) {
      return;
    }

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

      setPositions(newPositions);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled]);

  return positions;
}
