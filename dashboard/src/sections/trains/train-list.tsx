import { Icon } from '@iconify/react';
import {
  Train,
  TrainStation,
  TrainStatusDerailed,
  TrainStatusDocking,
  TrainStatusManualDriving,
  TrainStatusParked,
  TrainStatusSelfDriving,
} from 'src/apiTypes';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { PopoverMap } from '@/components/popover-map';
import { cn } from '@/lib/utils';
import { fNumber } from 'src/utils/format-number';
import { abbreviations } from '../../utils/abbreviations';

/**
 * Returns styling configuration for a train status including icon, label, and color classes.
 */
function getStatusStyle(status: string) {
  switch (status) {
    case TrainStatusSelfDriving:
      return {
        icon: 'mdi:train',
        label: 'Self Driving',
        className: 'bg-green-700/80 text-green-100',
        pulse: false,
      };
    case TrainStatusManualDriving:
      return {
        icon: 'ri:steering-2-fill',
        label: 'Manual Driving',
        className: 'bg-yellow-700/80 text-yellow-100',
        pulse: false,
      };
    case TrainStatusDocking:
      return {
        icon: 'game-icons:cargo-crate',
        label: 'Docking',
        className: 'bg-blue-700/80 text-blue-100',
        pulse: true,
      };
    case TrainStatusDerailed:
      return {
        icon: 'mdi:alert',
        label: 'Derailed',
        className: 'bg-red-700/80 text-red-100',
        pulse: false,
      };
    case TrainStatusParked:
      return {
        icon: 'mdi:train-car',
        label: 'Parked',
        className: 'bg-blue-700/80 text-blue-100',
        pulse: false,
      };
    default:
      return {
        icon: 'ri:question-line',
        label: status,
        className: 'bg-blue-700/80 text-blue-100',
        pulse: false,
      };
  }
}

/**
 * Parses item codes from a train name and returns their full names.
 */
function parseTrainItems(trainName: string) {
  const match = trainName.match(/\[(.*?)\]/);
  if (!match) return [];

  const items = match[1]
    .replace(/,/g, '/')
    .split('/')
    .map((code) => abbreviations.get(code.trim().toLowerCase()))
    .filter((item) => item);

  return items as string[];
}

/**
 * Displays a single train's status, timetable, and speed information.
 */
function TrainCard({ train, trainStations }: { train: Train; trainStations: TrainStation[] }) {
  const style = getStatusStyle(train.status);
  const items = parseTrainItems(train.name);

  return (
    <Card className={cn('mb-4 p-5', style.label === 'Derailed' && 'ring-2 ring-red-500')}>
      <CardContent className="p-0">
        <div className="flex justify-between">
          <div className="flex items-center">
            <div className="flex flex-row items-center gap-6">
              <h4 className="text-xl font-bold">{train.name}</h4>
              <div className="flex flex-row gap-2">
                {items.map((item, index) => (
                  <Badge key={index} variant="secondary" className="gap-1.5 px-2 py-1">
                    <img
                      src={`assets/images/satisfactory/64x64/${item}.png`}
                      alt={item}
                      className="h-5 w-5"
                    />
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Chip className={cn('gap-1', style.className, style.pulse && 'animate-pulse')}>
            <Icon icon={style.icon} className="size-3" />
            {style.label}
          </Chip>
        </div>

        {/* Scrollable Timetable Node Graph */}
        {train.timetable && train.timetable.length > 0 && (
          <div className="my-4 overflow-x-auto py-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-500 scrollbar-thumb-rounded">
            <div className="flex min-w-full items-center">
              {train.timetable.map((stop, index) => {
                const isCurrentStop = index === train.timetableIndex;
                const isPreviousStop =
                  index === train.timetableIndex - 1 ||
                  (train.timetableIndex === 0 && index === train.timetable.length - 1);
                const isLastStop = index === train.timetable.length - 1;
                const isWrapping =
                  train.timetableIndex === 0 && train.status !== TrainStatusDocking;

                const isLineActive = isCurrentStop && train.status !== TrainStatusDocking;
                const isCircleActive = isPreviousStop && train.status === TrainStatusDocking;

                return (
                  <div
                    key={index}
                    className="relative mb-2 flex min-w-[200px] flex-col items-center"
                  >
                    {/* Station name directly above each circle */}
                    <span className="mb-2 text-sm text-muted-foreground">{stop.station}</span>

                    {/* Horizontal connecting line with animation */}
                    {index > 0 && (
                      <div
                        className={cn(
                          'absolute -left-[85px] top-[84%] -z-10 h-0.5 w-[170px]',
                          isLineActive
                            ? 'animate-train-flow bg-transparent bg-[length:50px_100%] bg-repeat'
                            : 'bg-gray-600'
                        )}
                        style={
                          isLineActive
                            ? {
                                backgroundImage:
                                  'linear-gradient(to right, transparent 20%, var(--primary) 20%)',
                              }
                            : undefined
                        }
                      />
                    )}
                    {isWrapping && (
                      <div
                        className={cn(
                          'absolute left-[30px] top-[84%] -z-10 h-0.5 w-[60px]',
                          'animate-train-flow bg-transparent bg-[length:50px_100%] bg-repeat'
                        )}
                        style={{
                          backgroundImage:
                            'linear-gradient(to right, transparent 20%, oklch(var(--primary)) 20%)',
                        }}
                      />
                    )}
                    {isWrapping && isLastStop && (
                      <div
                        className="animate-train-flow absolute left-[110px] top-[84%] -z-10 h-0.5 w-[60px] bg-transparent bg-[length:50px_100%] bg-repeat"
                        style={{
                          backgroundImage:
                            'linear-gradient(to right, transparent 20%, oklch(var(--primary)) 20%)',
                        }}
                      />
                    )}

                    {/* Circular node with conditional highlight */}
                    <div
                      className={cn(
                        'h-2.5 w-2.5 rounded-full transition-colors duration-500',
                        isCircleActive ? 'bg-primary' : 'bg-gray-600'
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-sm text-muted-foreground">Speed:</span>
            <span className="ml-1 text-lg font-bold">
              {fNumber(train.speed, { decimals: 0 })} km/h
            </span>
          </div>
          <PopoverMap entity={train} entityType="train" trainStations={trainStations}>
            <Icon icon="mdi:map-marker" className="size-4" />
          </PopoverMap>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Displays a list of train cards.
 */
export function TrainList({
  trains,
  trainStations,
}: {
  trains: Train[];
  trainStations: TrainStation[];
}) {
  return (
    <>
      {trains.map((train, index) => (
        <TrainCard key={index} train={train} trainStations={trainStations} />
      ))}
    </>
  );
}
