import { LatLngExpression } from 'leaflet';
import { memo, useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { Polyline, useMap, useMapEvents } from 'react-leaflet';
import {
  VehiclePath,
  VehiclePathTypeExplorer,
  VehiclePathTypeFactoryCart,
  VehiclePathTypeTractor,
  VehiclePathTypeTruck,
} from 'src/apiTypes';
import { ConvertToMapCoords2 } from './bounds';

interface VehiclePathsOverlayProps {
  vehiclePaths: VehiclePath[];
  visiblePaths: Set<string>;
  showNames?: boolean;
}

// Get color based on vehicle type
const getPathColor = (vehicleType: string): string => {
  switch (vehicleType) {
    case VehiclePathTypeTruck:
      return '#F59E0B'; // Amber
    case VehiclePathTypeTractor:
      return '#22C55E'; // Green
    case VehiclePathTypeExplorer:
      return '#06B6D4'; // Cyan
    case VehiclePathTypeFactoryCart:
      return '#8B5CF6'; // Purple
    default:
      return '#6b7280'; // Gray
  }
};

// Label chip component that follows a path vertex
interface PathLabelProps {
  path: VehiclePath;
  vertexIndex: number;
}

function PathLabel({ path, vertexIndex }: PathLabelProps) {
  const map = useMap();
  const labelRef = useRef<HTMLDivElement>(null);
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [lineEndPos, setLineEndPos] = useState<{ x: number; y: number } | null>(null);

  const vertex = path.vertices[vertexIndex];
  if (!vertex) return null;

  const updatePosition = useCallback(() => {
    // The vertex coordinates are already in map coordinates (converted on backend)
    const mapPos = ConvertToMapCoords2(vertex.x, vertex.y);
    const point = map.latLngToContainerPoint(mapPos);
    setLineEndPos({ x: point.x, y: point.y });
    // Offset the label above the vertex
    setScreenPos({ x: point.x, y: point.y - 30 });
  }, [map, vertex]);

  useEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useMapEvents({
    move: updatePosition,
    zoom: updatePosition,
  });

  if (!screenPos || !lineEndPos) return null;

  const color = getPathColor(path.vehicleType);

  return (
    <>
      {/* Dashed line connecting label to vertex */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 999,
        }}
      >
        <line
          x1={screenPos.x}
          y1={screenPos.y + 10}
          x2={lineEndPos.x}
          y2={lineEndPos.y}
          stroke={color}
          strokeWidth={2}
          strokeDasharray="4,4"
          opacity={0.7}
        />
      </svg>
      {/* Label chip */}
      <div
        ref={labelRef}
        className="absolute z-[1000] pointer-events-none px-2 py-1 rounded-md bg-gray-800/95 shadow-md"
        style={{
          left: screenPos.x,
          top: screenPos.y,
          transform: 'translate(-50%, -100%)',
          border: `1px solid ${color}`,
        }}
      >
        <span className="text-[0.7rem] text-white whitespace-nowrap">{path.name}</span>
        <span className="text-[0.6rem] text-muted-foreground block">
          {path.pathLength.toFixed(0)}m
        </span>
      </div>
    </>
  );
}

function VehiclePathsOverlayInner({
  vehiclePaths,
  visiblePaths,
  showNames = false,
}: VehiclePathsOverlayProps) {
  // Filter to only visible paths
  const visiblePathsList = useMemo(
    () => vehiclePaths.filter((p) => visiblePaths.has(p.name)),
    [vehiclePaths, visiblePaths]
  );

  // Calculate a random but stable vertex index for each path label
  const labelVertexIndices = useMemo(() => {
    const indices: Map<string, number> = new Map();
    visiblePathsList.forEach((path) => {
      if (path.vertices.length > 0) {
        // Use a hash of the path name to pick a consistent vertex
        const hash = path.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const index = hash % path.vertices.length;
        indices.set(path.name, index);
      }
    });
    return indices;
  }, [visiblePathsList]);

  return (
    <>
      {visiblePathsList.map((path) => {
        // Convert vertices to map coordinates
        const positions: LatLngExpression[] = path.vertices.map((v) =>
          ConvertToMapCoords2(v.x, v.y)
        );

        if (positions.length < 2) return null;

        const color = getPathColor(path.vehicleType);
        const labelVertexIndex = labelVertexIndices.get(path.name) ?? 0;

        return (
          <div key={path.name}>
            {/* Path polyline */}
            <Polyline
              positions={positions}
              pathOptions={{
                color,
                weight: 3,
                opacity: 0.8,
                dashArray: '8, 8',
              }}
              className="vehicle-path-line"
            />
            {/* Path label (only shown when showNames is enabled) */}
            {showNames && <PathLabel path={path} vertexIndex={labelVertexIndex} />}
          </div>
        );
      })}

      {/* CSS for animated dashed line */}
      <style>
        {`
          .vehicle-path-line path {
            animation: vehicle-path-dash 1s linear infinite;
          }
          @keyframes vehicle-path-dash {
            from {
              stroke-dashoffset: 32;
            }
            to {
              stroke-dashoffset: 0;
            }
          }
        `}
      </style>
    </>
  );
}

export const VehiclePathsOverlay = memo(VehiclePathsOverlayInner);
