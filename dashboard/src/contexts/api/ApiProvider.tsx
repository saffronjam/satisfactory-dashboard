import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as API from 'src/apiTypes';
import { config } from 'src/config';
import { dispatchAuthExpired } from 'src/contexts/auth/AuthContext';
import { ApiContext, ApiData } from './useApi';

const API_URL = config.apiUrl;

const DEFAULT_DATA: ApiData = {
  isLoading: true,
  isOnline: false,
  satisfactoryApiStatus: undefined,
  circuits: [],
  factoryStats: {} as API.FactoryStats,
  prodStats: {} as API.ProdStats,
  sinkStats: {} as API.SinkStats,
  players: [],
  generatorStats: {} as API.GeneratorStats,
  machines: [],
  trains: [],
  trainStations: [],
  drones: [],
  droneStations: [],
  trucks: [],
  truckStations: [],
  belts: [],
  pipes: [],
  pipeJunctions: [],
  trainRails: [],
  splitterMergers: [],
  hypertubes: [],
  hypertubeEntrances: [],
  cables: [],
  storages: [],
  tractors: [],
  explorers: [],
  vehiclePaths: [],
  spaceElevator: undefined,
  hub: undefined,
  radarTowers: [],
  resourceNodes: [],
  schematics: [],
};

interface ApiProviderProps {
  children: React.ReactNode;
  sessionId: string | null;
  sessionStage: API.SessionStage | null;
  onSessionUpdate?: (session: API.SessionDTO) => void;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({
  children,
  sessionId,
  sessionStage,
  onSessionUpdate,
}) => {
  const [data, setData] = useState<ApiData>(DEFAULT_DATA);

  const eventSourceRef = useRef<EventSource | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dataRef = useRef<ApiData>(DEFAULT_DATA);
  const onSessionUpdateRef = useRef(onSessionUpdate);

  // Keep the ref up to date with the latest callback
  useEffect(() => {
    onSessionUpdateRef.current = onSessionUpdate;
  }, [onSessionUpdate]);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Ref to store fetchState function so it can be called from SSE handler
  const fetchStateRef = useRef<(() => Promise<void>) | null>(null);

  const startSse = useCallback(
    (currentSessionId: string, isReady: boolean) => {
      // Reset data for new session
      const newData = { ...DEFAULT_DATA };
      dataRef.current = newData;
      setData(newData);

      const eventSource = new EventSource(`${API_URL}/sessions/${currentSessionId}/events`, {
        withCredentials: true,
      });
      eventSourceRef.current = eventSource;

      const fetchState = async () => {
        return fetch(`${API_URL}/sessions/${currentSessionId}/state`, { credentials: 'include' })
          .then((response) => {
            if (!response.ok) {
              if (response.status === 401) {
                dispatchAuthExpired();
              }
              throw new Error('Failed to get full state');
            }
            return response.json() as Promise<API.State>;
          })
          .then((fullState) => {
            dataRef.current.satisfactoryApiStatus = fullState.satisfactoryApiStatus;
            dataRef.current.isOnline = fullState.satisfactoryApiStatus.running;
            dataRef.current.circuits = fullState.circuits;
            dataRef.current.factoryStats = fullState.factoryStats;
            dataRef.current.prodStats = fullState.prodStats;
            dataRef.current.sinkStats = fullState.sinkStats;
            dataRef.current.players = fullState.players;
            dataRef.current.generatorStats = fullState.generatorStats;
            dataRef.current.machines = fullState.machines ?? [];
            dataRef.current.trains = fullState.trains;
            dataRef.current.trainStations = fullState.trainStations;
            dataRef.current.drones = fullState.drones;
            dataRef.current.droneStations = fullState.droneStations;
            dataRef.current.belts = fullState.belts ?? [];
            dataRef.current.pipes = fullState.pipes ?? [];
            dataRef.current.pipeJunctions = fullState.pipeJunctions ?? [];
            dataRef.current.trainRails = fullState.trainRails ?? [];
            dataRef.current.splitterMergers = fullState.splitterMergers ?? [];
            dataRef.current.hypertubes = fullState.hypertubes ?? [];
            dataRef.current.hypertubeEntrances = fullState.hypertubeEntrances ?? [];
            dataRef.current.cables = fullState.cables ?? [];
            dataRef.current.storages = fullState.storages ?? [];
            dataRef.current.tractors = fullState.tractors ?? [];
            dataRef.current.explorers = fullState.explorers ?? [];
            dataRef.current.vehiclePaths = fullState.vehiclePaths ?? [];
            dataRef.current.spaceElevator = fullState.spaceElevator;
            dataRef.current.hub = fullState.hub;
            dataRef.current.radarTowers = fullState.radarTowers ?? [];
            dataRef.current.resourceNodes = fullState.resourceNodes ?? [];
            dataRef.current.schematics = fullState.schematics ?? [];
            dataRef.current.isLoading = false;
            setData({ ...dataRef.current });
          })
          .catch((error) => {
            console.error('Failed to get full state: ', error);
            dataRef.current.isOnline = false;
            dataRef.current.isLoading = false;
            setData({ ...dataRef.current });
          });
      };

      // Store fetchState in ref so it can be called when session becomes ready
      fetchStateRef.current = fetchState;

      dataRef.current.isLoading = true;
      // Only fetch state if session is ready (not in init stage)
      if (isReady) {
        void fetchState();
      }

      eventSource.addEventListener(API.SatisfactoryEventKey, (event) => {
        const parsed = JSON.parse(event.data) as API.SseSatisfactoryEvent;
        switch (parsed.type as API.SatisfactoryEventType) {
          case API.SatisfactoryEventApiStatus:
            // If was offline, and now is online, set loading to false and request full state
            // Only fetch if we have fetchStateRef (session should be ready by now via SSE)
            if (!dataRef.current.isOnline && parsed.data.running && fetchStateRef.current) {
              void fetchStateRef.current();
              dataRef.current.isLoading = false;
            }
            dataRef.current.satisfactoryApiStatus = parsed.data;
            dataRef.current.isOnline = parsed.data.running;
            // Immediately update state when going offline for quick UI feedback
            if (!parsed.data.running) {
              setData({ ...dataRef.current });
            }
            break;
          case API.SatisfactoryEventCircuits:
            dataRef.current.circuits = parsed.data;
            break;
          case API.SatisfactoryEventFactoryStats:
            dataRef.current.factoryStats = parsed.data;
            break;
          case API.SatisfactoryEventProdStats:
            dataRef.current.prodStats = parsed.data;
            break;
          case API.SatisfactoryEventSinkStats:
            dataRef.current.sinkStats = parsed.data;
            break;
          case API.SatisfactoryEventPlayers:
            dataRef.current.players = parsed.data;
            break;
          case API.SatisfactoryEventGeneratorStats:
            dataRef.current.generatorStats = parsed.data;
            break;
          case API.SatisfactoryEventMachines:
            dataRef.current.machines = parsed.data;
            break;
          case API.SatisfactoryEventVehicles:
            dataRef.current.trains = parsed.data.trains;
            dataRef.current.drones = parsed.data.drones;
            dataRef.current.trucks = parsed.data.trucks;
            dataRef.current.tractors = parsed.data.tractors ?? [];
            dataRef.current.explorers = parsed.data.explorers ?? [];
            break;
          case API.SatisfactoryEventVehicleStations:
            dataRef.current.trainStations = parsed.data.trainStations;
            dataRef.current.droneStations = parsed.data.droneStations;
            dataRef.current.truckStations = parsed.data.truckStations;
            break;
          case API.SatisfactoryEventBelts:
            dataRef.current.belts = parsed.data.belts;
            dataRef.current.splitterMergers = parsed.data.splitterMergers;
            break;
          case API.SatisfactoryEventPipes:
            dataRef.current.pipes = parsed.data.pipes;
            dataRef.current.pipeJunctions = parsed.data.pipeJunctions;
            break;
          case API.SatisfactoryEventHypertubes:
            dataRef.current.hypertubes = parsed.data.hypertubes;
            dataRef.current.hypertubeEntrances = parsed.data.hypertubeEntrances;
            break;
          case API.SatisfactoryEventTrainRails:
            dataRef.current.trainRails = parsed.data;
            break;
          case API.SatisfactoryEventCables:
            dataRef.current.cables = parsed.data;
            break;
          case API.SatisfactoryEventStorages:
            dataRef.current.storages = parsed.data;
            break;
          case API.SatisfactoryEventTractors:
            dataRef.current.tractors = parsed.data;
            break;
          case API.SatisfactoryEventExplorers:
            dataRef.current.explorers = parsed.data;
            break;
          case API.SatisfactoryEventVehiclePaths:
            dataRef.current.vehiclePaths = parsed.data;
            break;
          case API.SatisfactoryEventSpaceElevator:
            dataRef.current.spaceElevator = parsed.data;
            break;
          case API.SatisfactoryEventHub:
            dataRef.current.hub = parsed.data;
            break;
          case API.SatisfactoryEventRadarTowers:
            dataRef.current.radarTowers = parsed.data;
            break;
          case API.SatisfactoryEventResourceNodes:
            dataRef.current.resourceNodes = parsed.data;
            break;
          case API.SatisfactoryEventSchematics:
            dataRef.current.schematics = parsed.data;
            break;
          case API.SatisfactoryEventSessionUpdate:
            if (onSessionUpdateRef.current) {
              onSessionUpdateRef.current(parsed.data as API.SessionDTO);
            }
            break;
        }
      });

      eventSource.onerror = () => {
        dataRef.current.isOnline = false;
        dataRef.current.isLoading = false;
        setData({ ...dataRef.current });
      };

      // Setup interval that snapshots the current data
      intervalRef.current = setInterval(() => {
        setData({ ...dataRef.current });
      }, 2000);
    },
    [cleanup]
  );

  // Track previous stage to detect transitions
  const prevStageRef = useRef<API.SessionStage | null>(null);

  useEffect(() => {
    if (!API_URL) {
      console.error('API_URL is not defined');
      return;
    }

    // Cleanup previous connection
    cleanup();

    // Don't connect if no session selected
    if (!sessionId) {
      setData({ ...DEFAULT_DATA, isLoading: false });
      return;
    }

    const isReady = sessionStage === API.SessionStageReady;
    startSse(sessionId, isReady);
    prevStageRef.current = sessionStage;

    return cleanup;
  }, [sessionId, cleanup, startSse]);

  // Handle session stage transitions (init -> ready)
  useEffect(() => {
    // If stage changed from init to ready, fetch state
    if (
      prevStageRef.current === API.SessionStageInit &&
      sessionStage === API.SessionStageReady &&
      fetchStateRef.current
    ) {
      void fetchStateRef.current();
    }
    prevStageRef.current = sessionStage;
  }, [sessionStage]);

  return <ApiContext.Provider value={data}>{children}</ApiContext.Provider>;
};
