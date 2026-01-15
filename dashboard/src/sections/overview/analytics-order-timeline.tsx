import { cn } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  type TimelineDotProps,
  TimelineItem,
  TimelineSeparator,
} from '@/components/timeline';

import { fDateTime } from 'src/utils/format-time';

type Props = React.ComponentProps<'div'> & {
  title?: string;
  subheader?: string;
  list: {
    id: string;
    type: string;
    title: string;
    time: string | number | null;
  }[];
};

/**
 * Displays a timeline of order events within a card container.
 */
export function AnalyticsOrderTimeline({ title, subheader, list, className, ...other }: Props) {
  return (
    <Card className={cn(className)} {...other}>
      <CardHeader>
        {title && <CardTitle>{title}</CardTitle>}
        {subheader && <CardDescription>{subheader}</CardDescription>}
      </CardHeader>

      <CardContent>
        <Timeline>
          {list.map((item, index) => (
            <Item key={item.id} item={item} lastItem={index === list.length - 1} />
          ))}
        </Timeline>
      </CardContent>
    </Card>
  );
}

type ItemProps = {
  lastItem: boolean;
  item: Props['list'][number];
};

/**
 * Maps order type strings to timeline dot color variants.
 */
function getColorForType(type: string): TimelineDotProps['color'] {
  switch (type) {
    case 'order1':
      return 'primary';
    case 'order2':
      return 'success';
    case 'order3':
      return 'info';
    case 'order4':
      return 'warning';
    default:
      return 'error';
  }
}

/**
 * Individual timeline item displaying order title and timestamp.
 */
function Item({ item, lastItem }: ItemProps) {
  return (
    <TimelineItem>
      <TimelineSeparator>
        <TimelineDot color={getColorForType(item.type)} />
        {!lastItem && <TimelineConnector />}
      </TimelineSeparator>

      <TimelineContent>
        <p className="text-sm font-medium">{item.title}</p>
        <p className="text-xs text-muted-foreground">{fDateTime(item.time)}</p>
      </TimelineContent>
    </TimelineItem>
  );
}
