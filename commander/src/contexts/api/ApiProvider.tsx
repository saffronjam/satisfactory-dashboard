import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiContext, ApiData } from "./useApi";
import * as API from "src/apiTypes";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8081/v1";

const DEFAULT_DATA: ApiData = {
  isLoading: true,
  isOnline: false,
  circuits: [],
  factoryStats: {} as API.FactoryStats,
  prodStats: {} as API.ProdStats,
  sinkStats: {} as API.SinkStats,
  players: [],
  generatorStats: {} as API.GeneratorStats,
  trains: [],
  trainStations: [],
  drones: [],
  droneStations: [],
};

interface ApiProviderProps {
  children: React.ReactNode;
  sessionId: string | null;
  onSessionUpdate?: (session: API.Session) => void;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({
  children,
  sessionId,
  onSessionUpdate,
}) => {
  const [data, setData] = useState<ApiData>(DEFAULT_DATA);
  const [dataHistory, setDataHistory] = useState<(ApiData & { timestamp: Date })[]>([]);

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

  const startSse = useCallback(
    (currentSessionId: string) => {
      // Reset data for new session
      const newData = { ...DEFAULT_DATA };
      dataRef.current = newData;
      setData(newData);
      setDataHistory([]);

      const eventSource = new EventSource(`${API_URL}/sessions/${currentSessionId}/events`);
      eventSourceRef.current = eventSource;

      const fetchState = async () => {
        return fetch(`${API_URL}/sessions/${currentSessionId}/state`)
          .then((response) => {
            if (!response.ok) {
              throw new Error("Failed to get full state");
            }
            return response.json() as Promise<API.State>;
          })
          .then((fullState) => {
            dataRef.current.isOnline = fullState.satisfactoryApiStatus.running;
            dataRef.current.circuits = fullState.circuits;
            dataRef.current.factoryStats = fullState.factoryStats;
            dataRef.current.prodStats = fullState.prodStats;
            dataRef.current.sinkStats = fullState.sinkStats;
            dataRef.current.players = fullState.players;
            dataRef.current.generatorStats = fullState.generatorStats;
            dataRef.current.trains = fullState.trains;
            dataRef.current.trainStations = fullState.trainStations;
            dataRef.current.drones = fullState.drones;
            dataRef.current.droneStations = fullState.droneStations;
            dataRef.current.isLoading = false;
            setData({ ...dataRef.current });
          })
          .catch((error) => {
            console.error("Failed to get full state: ", error);
            dataRef.current.isOnline = false;
            dataRef.current.isLoading = false;
            setData({ ...dataRef.current });
          });
      };

      dataRef.current.isLoading = true;
      void fetchState();

      eventSource.addEventListener(API.SatisfactoryEventKey, (event) => {
        const parsed = JSON.parse(event.data) as API.SseSatisfactoryEvent;
        switch (parsed.type as API.SatisfactoryEventType) {
          case API.SatisfactoryEventApiStatus:
            // If was offline, and now is online, set loading to false and request full state
            if (!dataRef.current.isOnline && parsed.data.running) {
              void fetchState();
              dataRef.current.isLoading = false;
            }
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
          case API.SatisfactoryEventTrainSetup:
            dataRef.current.trains = parsed.data.trains;
            dataRef.current.trainStations = parsed.data.trainStations;
            break;
          case API.SatisfactoryEventDroneSetup:
            dataRef.current.drones = parsed.data.drones;
            dataRef.current.droneStations = parsed.data.droneStations;
            break;
          case API.SatisfactoryEventSessionUpdate:
            if (onSessionUpdateRef.current) {
              onSessionUpdateRef.current(parsed.data as API.Session);
            }
            break;
        }
      });

      eventSource.onerror = () => {
        dataRef.current.isOnline = false;
        dataRef.current.isLoading = false;
        setData({ ...dataRef.current });
      };

      // Setup interval that snapshots the current data then saves to history
      intervalRef.current = setInterval(() => {
        setData({ ...dataRef.current });

        // Only add to history if not loading and online
        if (dataRef.current.isLoading || !dataRef.current.isOnline) {
          return;
        }

        const latestData = { ...dataRef.current, timestamp: new Date() };

        setDataHistory((prevDataHistory) => {
          const newHistory = [...prevDataHistory, latestData];

          // Keep one minute of history, check timestamps
          const oneMinuteAgo = new Date(latestData.timestamp.getTime() - 60000);
          return newHistory.filter((entry) => entry.timestamp > oneMinuteAgo);
        });
      }, 1000);
    },
    [cleanup],
  );

  useEffect(() => {
    if (!API_URL) {
      console.error("API_URL is not defined");
      return;
    }

    // Cleanup previous connection
    cleanup();

    // Don't connect if no session selected
    if (!sessionId) {
      setData({ ...DEFAULT_DATA, isLoading: false });
      return;
    }

    startSse(sessionId);

    return cleanup;
  }, [sessionId, cleanup, startSse]);

  const contextValue = useMemo(() => ({ ...data, history: dataHistory }), [data, dataHistory]);

  return <ApiContext.Provider value={contextValue}>{children}</ApiContext.Provider>;
};
