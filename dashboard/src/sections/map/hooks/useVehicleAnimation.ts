import { useEffect, useRef, useState } from 'react';

export interface AnimatedPosition {
  x: number;
  y: number;
  rotation: number;
}

interface VehicleWithLocation {
  name: string;
  x?: number;
  y?: number;
  rotation?: number;
}

interface AnimatedVehicle<T> {
  vehicle: T;
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

export function useVehicleAnimation<T extends VehicleWithLocation>(
  vehicles: T[],
  enabled: boolean = true
): Map<string, AnimatedPosition> {
  const animatedVehiclesRef = useRef<Map<string, AnimatedVehicle<T>>>(new Map());
  const [positions, setPositions] = useState<Map<string, AnimatedPosition>>(new Map());
  const rafRef = useRef<number>();

  // Update targets when vehicle data changes
  useEffect(() => {
    if (!enabled) {
      animatedVehiclesRef.current.clear();
      setPositions(new Map());
      return;
    }

    const now = performance.now();

    // Track which vehicles exist in the new data
    const currentVehicleNames = new Set<string>();
    // Track new vehicles that need immediate position update
    const newVehiclePositions = new Map<string, AnimatedPosition>();

    for (const vehicle of vehicles) {
      // Skip vehicles without position data
      if (vehicle.x === undefined || vehicle.y === undefined) continue;

      currentVehicleNames.add(vehicle.name);
      const existing = animatedVehiclesRef.current.get(vehicle.name);

      const newPos = {
        x: vehicle.x,
        y: vehicle.y,
        rotation: vehicle.rotation ?? 0,
      };

      if (existing) {
        // Update target, keeping current interpolated position as start
        existing.startPosition = { ...existing.currentPosition };
        existing.targetPosition = newPos;
        existing.animationStartTime = now;
        existing.vehicle = vehicle;
      } else {
        // New vehicle - start at actual position (no animation needed)
        animatedVehiclesRef.current.set(vehicle.name, {
          vehicle,
          currentPosition: { ...newPos },
          targetPosition: { ...newPos },
          startPosition: { ...newPos },
          animationStartTime: now,
        });
        // Mark this vehicle for immediate position update
        newVehiclePositions.set(vehicle.name, { ...newPos });
      }
    }

    // Remove vehicles that no longer exist
    for (const name of animatedVehiclesRef.current.keys()) {
      if (!currentVehicleNames.has(name)) {
        animatedVehiclesRef.current.delete(name);
      }
    }

    // Immediately update positions state for new vehicles so they render at correct positions
    // without waiting for the animation frame
    if (newVehiclePositions.size > 0) {
      setPositions((prevPositions) => {
        const newPositions = new Map(prevPositions);
        for (const [name, pos] of newVehiclePositions) {
          newPositions.set(name, pos);
        }
        return newPositions;
      });
    }
  }, [vehicles, enabled]);

  // Animation loop
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const animate = (time: number) => {
      const newPositions = new Map<string, AnimatedPosition>();

      for (const [name, animated] of animatedVehiclesRef.current) {
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
