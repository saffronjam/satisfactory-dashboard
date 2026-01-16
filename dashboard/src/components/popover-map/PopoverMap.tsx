import { CRS, LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Drone,
  DroneStatusDocking,
  DroneStatusFlying,
  DroneStatusIdle,
  Player,
  Train,
  TrainStation,
  TrainStatusDerailed,
  TrainStatusDocking,
  TrainStatusManualDriving,
  TrainStatusSelfDriving,
} from 'src/apiTypes';
import { ConvertToMapCoords2 } from 'src/sections/map/bounds';

type EntityType = 'train' | 'drone' | 'player';

interface PopoverMapProps {
  entity: Train | Drone | Player;
  entityType: EntityType;
  playerColor?: string;
  trainStations?: TrainStation[];
  children: React.ReactNode;
}

// Train locomotive icon SVG (from trainVehicleLayer.tsx)
const trainIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="currentColor" d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4M7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17m3.5-7H6V6h5zm2 0V6h5v4zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5s1.5.67 1.5 1.5s-.67 1.5-1.5 1.5"/>
</svg>`;

// Drone icon SVG (from droneVehicleLayer.tsx)
const droneIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="currentColor" d="M6.475 22Q4.6 22 3.3 20.675t-1.3-3.2T3.3 14.3T6.475 13q.55 0 1.063.125t.962.35q.35-.725.375-1.5t-.275-1.5q-.475.25-1 .375t-1.1.125q-1.875 0-3.187-1.312T2 6.474T3.313 3.3T6.5 2t3.188 1.3T11 6.475q0 .575-.137 1.1t-.388 1q.725.3 1.5.288t1.5-.363q-.225-.45-.35-.962T13 6.475Q13 4.6 14.3 3.3T17.475 2t3.2 1.3T22 6.475t-1.325 3.2t-3.2 1.325q-.6 0-1.137-.15t-1.038-.425q-.325.75-.3 1.538t.375 1.562q.475-.25 1-.387t1.1-.138q1.875 0 3.2 1.3T22 17.475t-1.325 3.2t-3.2 1.325t-3.175-1.325t-1.3-3.2q0-.575.138-1.1t.387-1q-.775-.35-1.563-.387t-1.537.287q.275.5.425 1.05t.15 1.15q0 1.875-1.325 3.2T6.475 22"/>
</svg>`;

/**
 * Returns train color based on status (matching trainVehicleLayer.tsx)
 */
function getTrainColor(status: string): string {
  switch (status) {
    case TrainStatusSelfDriving:
    case TrainStatusManualDriving:
      return '#22c55e'; // Green - moving
    case TrainStatusDocking:
      return '#eab308'; // Yellow - docking
    case TrainStatusDerailed:
      return '#ef4444'; // Red - derailed
    default:
      return '#6b7280'; // Gray - parked/unknown
  }
}

/**
 * Returns drone color based on status (matching droneVehicleLayer.tsx)
 */
function getDroneColor(status: string): string {
  switch (status) {
    case DroneStatusFlying:
      return '#8B5CF6'; // Purple - flying
    case DroneStatusDocking:
      return '#eab308'; // Yellow - docking
    case DroneStatusIdle:
      return '#6b7280'; // Gray - idle
    default:
      return '#6b7280'; // Gray - unknown
  }
}

/**
 * Creates a vehicle icon (train or drone) with rotation support.
 */
function createVehicleIcon(svgContent: string, color: string, rotation: number) {
  const size = 28;
  return L.divIcon({
    className: 'popover-vehicle-marker',
    html: `
      <div style="width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
        <div style="
          width: ${size}px;
          height: ${size}px;
          color: ${color};
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
          transform: rotate(${rotation}deg);
        ">
          ${svgContent}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Creates a player icon with the specified color.
 */
function createPlayerIcon(color: string) {
  const size = 24;
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">
    <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="12" cy="9" r="3" fill="white"/>
    <path fill="white" d="M12 13c-3 0-5.5 1.5-5.5 3.5v1.5h11v-1.5c0-2-2.5-3.5-5.5-3.5z"/>
  </svg>`;

  return L.divIcon({
    className: 'popover-map-marker',
    html: `<div style="width: ${size}px; height: ${size}px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${svgContent}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Updates the map center to follow a moving entity.
 */
function MapCenterUpdater({ position }: { position: LatLngExpression }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true, duration: 0.3 });
  }, [map, position]);

  return null;
}

/**
 * A small map popover that shows the location of a train, drone, or player.
 * The map follows moving entities in real-time and shows route lines for vehicles.
 */
export function PopoverMap({
  entity,
  entityType,
  playerColor,
  trainStations,
  children,
}: PopoverMapProps) {
  const mapPosition = ConvertToMapCoords2(entity.x, entity.y);

  // Compute icon based on entity type
  const icon = useMemo(() => {
    if (entityType === 'train') {
      const train = entity as Train;
      const color = getTrainColor(train.status);
      return createVehicleIcon(trainIconSvg, color, train.rotation);
    } else if (entityType === 'drone') {
      const drone = entity as Drone;
      const color = getDroneColor(drone.status);
      return createVehicleIcon(droneIconSvg, color, drone.rotation);
    } else {
      return createPlayerIcon(playerColor || '#ef4444');
    }
  }, [entity, entityType, playerColor]);

  // Compute train route line positions
  const trainRouteLines = useMemo(() => {
    if (entityType !== 'train' || !trainStations) return null;

    const train = entity as Train;
    if (!train.timetable || train.timetable.length === 0) return null;
    if (train.status === TrainStatusDocking) return null;

    // Find previous and next stations
    const currentIndex = train.timetableIndex;
    const prevIndex = currentIndex === 0 ? train.timetable.length - 1 : currentIndex - 1;

    const prevStationName = train.timetable[prevIndex]?.station;
    const nextStationName = train.timetable[currentIndex]?.station;

    const prevStation = trainStations.find((s) => s.name === prevStationName);
    const nextStation = trainStations.find((s) => s.name === nextStationName);

    const prevStationPos = prevStation ? ConvertToMapCoords2(prevStation.x, prevStation.y) : null;
    const nextStationPos = nextStation ? ConvertToMapCoords2(nextStation.x, nextStation.y) : null;

    return { prevStationPos, nextStationPos };
  }, [entity, entityType, trainStations]);

  // Compute drone route line positions
  const droneRouteLines = useMemo(() => {
    if (entityType !== 'drone') return null;

    const drone = entity as Drone;
    if (drone.status !== DroneStatusFlying) return null;

    // Determine source station (where drone came from)
    // If flying to home, source is paired; if flying to paired, source is home
    const destination = drone.destination;
    const home = drone.home;
    const paired = drone.paired;

    if (!destination) return null;

    let sourceStation = null;
    if (destination.name === home?.name) {
      // Flying home from paired
      sourceStation = paired;
    } else if (destination.name === paired?.name) {
      // Flying to paired from home
      sourceStation = home;
    }

    const sourcePos = sourceStation ? ConvertToMapCoords2(sourceStation.x, sourceStation.y) : null;
    const destPos = destination ? ConvertToMapCoords2(destination.x, destination.y) : null;

    return { sourcePos, destPos };
  }, [entity, entityType]);

  return (
    <Popover>
      <PopoverTrigger className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none">
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto border-0 p-0 shadow-xl"
        sideOffset={8}
        collisionPadding={16}
      >
        <div className="overflow-hidden rounded-lg" style={{ width: 500, height: 500 }}>
          <style>
            {`
              .animated-train-route path {
                animation: train-dash-animation 0.8s linear infinite;
              }
              @keyframes train-dash-animation {
                from { stroke-dashoffset: 40; }
                to { stroke-dashoffset: 0; }
              }
              .animated-drone-route path {
                animation: drone-dash-animation 0.8s linear infinite;
              }
              @keyframes drone-dash-animation {
                from { stroke-dashoffset: 18; }
                to { stroke-dashoffset: 0; }
              }
            `}
          </style>
          <MapContainer
            center={mapPosition}
            zoom={3}
            crs={CRS.Simple}
            zoomControl={false}
            attributionControl={false}
            dragging={true}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            touchZoom={true}
            boxZoom={false}
            keyboard={false}
            style={{ width: 500, height: 500, background: '#0e0e0e' }}
          >
            <ZoomControl position="topleft" />
            <TileLayer
              url="assets/images/satisfactory/map/1763022054/realistic/{z}/{x}/{y}.png"
              tileSize={256}
              minZoom={3}
              maxZoom={8}
              noWrap={true}
            />
            <MapCenterUpdater position={mapPosition} />

            {/* Train route lines */}
            {trainRouteLines?.prevStationPos && (
              <Polyline
                positions={[trainRouteLines.prevStationPos, mapPosition]}
                pathOptions={{ color: '#4b5563', weight: 3, opacity: 0.8 }}
              />
            )}
            {trainRouteLines?.nextStationPos && (
              <Polyline
                positions={[mapPosition, trainRouteLines.nextStationPos]}
                pathOptions={{ color: '#15803d', weight: 3, opacity: 0.9, dashArray: '8, 12' }}
                className="animated-train-route"
              />
            )}

            {/* Drone route lines */}
            {droneRouteLines?.sourcePos && (
              <Polyline
                positions={[droneRouteLines.sourcePos, mapPosition]}
                pathOptions={{ color: '#4b5563', weight: 3, opacity: 0.8 }}
              />
            )}
            {droneRouteLines?.destPos && (
              <Polyline
                positions={[mapPosition, droneRouteLines.destPos]}
                pathOptions={{ color: '#8B5CF6', weight: 3, opacity: 0.9, dashArray: '6, 3' }}
                className="animated-drone-route"
              />
            )}

            <Marker position={mapPosition} icon={icon} interactive={false} />
          </MapContainer>
        </div>
      </PopoverContent>
    </Popover>
  );
}
