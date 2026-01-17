import { BoundingBox } from 'src/apiTypes';
import { SelectableEntity } from 'src/types';

/**
 * Rotates a point around a pivot point by the given angle.
 */
export function rotatePoint(
  px: number,
  py: number,
  pivotX: number,
  pivotY: number,
  angleRad: number
): { x: number; y: number } {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = px - pivotX;
  const dy = py - pivotY;
  return {
    x: pivotX + dx * cos - dy * sin,
    y: pivotY + dx * sin + dy * cos,
  };
}

/**
 * Converts rotation degrees to radians with 90° offset for map coordinate system.
 */
export function toRotationRad(rotationDegrees: number): number {
  return Math.PI / 2 + ((rotationDegrees || 0) * Math.PI) / 180;
}

/**
 * Returns the position (x, y) of a selectable entity.
 * For infrastructure with two endpoints (belts, pipes, cables, rails, hypertubes),
 * returns the midpoint between location0 and location1.
 */
export function getEntityPosition(entity: SelectableEntity): { x: number; y: number } {
  switch (entity.type) {
    case 'belt':
    case 'pipe':
    case 'cable':
    case 'rail':
      return {
        x: (entity.data.location0.x + entity.data.location1.x) / 2,
        y: (entity.data.location0.y + entity.data.location1.y) / 2,
      };
    case 'hypertube':
      return {
        x: (entity.data.location0.x + entity.data.location1.x) / 2,
        y: (entity.data.location0.y + entity.data.location1.y) / 2,
      };
    default:
      return { x: entity.data.x, y: entity.data.y };
  }
}

/**
 * Returns the bounding box for a selectable entity.
 * For entities with explicit bounding boxes, returns those directly.
 * For infrastructure, computes bounds from the two endpoints.
 * For point entities (vehicles, players), returns a small box around the position.
 */
export function getEntityBounds(entity: SelectableEntity): BoundingBox {
  switch (entity.type) {
    case 'machine':
    case 'trainStation':
    case 'droneStation':
    case 'radarTower':
    case 'hub':
    case 'spaceElevator':
      return entity.data.boundingBox;

    case 'belt':
    case 'pipe':
    case 'cable':
    case 'rail': {
      const { location0, location1 } = entity.data;
      return {
        min: {
          x: Math.min(location0.x, location1.x),
          y: Math.min(location0.y, location1.y),
          z: Math.min(location0.z, location1.z),
          rotation: 0,
        },
        max: {
          x: Math.max(location0.x, location1.x),
          y: Math.max(location0.y, location1.y),
          z: Math.max(location0.z, location1.z),
          rotation: 0,
        },
      };
    }

    case 'hypertube': {
      const { location0, location1 } = entity.data;
      return {
        min: {
          x: Math.min(location0.x, location1.x),
          y: Math.min(location0.y, location1.y),
          z: Math.min(location0.z, location1.z),
          rotation: 0,
        },
        max: {
          x: Math.max(location0.x, location1.x),
          y: Math.max(location0.y, location1.y),
          z: Math.max(location0.z, location1.z),
          rotation: 0,
        },
      };
    }

    case 'train':
    case 'drone':
    case 'truck':
    case 'tractor':
    case 'explorer':
    case 'player': {
      const { x, y, z } = entity.data;
      const halfSize = 100;
      return {
        min: { x: x - halfSize, y: y - halfSize, z: z - halfSize, rotation: 0 },
        max: { x: x + halfSize, y: y + halfSize, z: z + halfSize, rotation: 0 },
      };
    }
  }
}
