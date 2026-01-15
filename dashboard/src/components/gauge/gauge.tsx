import GaugeComponent, { type GaugeComponentProps } from 'react-gauge-component';
import { cn } from '@/lib/utils';

type BaseGaugeProps = {
  value: number;
  className?: string;
  label?: string;
};

type RadialGaugeProps = BaseGaugeProps & {
  variant?: 'radial';
  minValue?: number;
  maxValue?: number;
  showValueLabel?: boolean;
};

type SemicircleGaugeProps = BaseGaugeProps & {
  variant: 'semicircle';
  formatValue?: (value: number) => string;
  showTickLabels?: boolean;
  tickValues?: number[];
  minValue?: number;
  maxValue?: number;
};

export type GaugeProps = RadialGaugeProps | SemicircleGaugeProps;

/**
 * Gauge component wrapper for react-gauge-component with Tailwind styling.
 * Provides consistent theming using CSS variables and supports radial and semicircle variants.
 */
export function Gauge(props: GaugeProps) {
  const { value, className, label, variant = 'radial' } = props;

  const commonProps: Partial<GaugeComponentProps> = {
    value,
    minValue: props.minValue ?? 0,
    maxValue: props.maxValue ?? 100,
  };

  if (variant === 'semicircle') {
    const {
      formatValue = (v) => `${v.toFixed(1)}%`,
      showTickLabels = true,
      tickValues = [0, 50, 100],
    } = props as SemicircleGaugeProps;

    return (
      <div className={cn('flex flex-col items-center', className)}>
        <GaugeComponent
          type="semicircle"
          {...commonProps}
          arc={{
            width: 0.2,
            padding: 0.005,
            cornerRadius: 10,
            subArcs: [
              {
                limit: value,
                color: 'hsl(var(--chart-1))',
                showTick: false,
              },
              {
                color: 'hsl(var(--muted))',
                showTick: false,
              },
            ],
          }}
          pointer={{
            type: 'needle',
            color: 'hsl(var(--foreground))',
            length: 0.7,
            width: 12,
          }}
          labels={{
            valueLabel: {
              formatTextValue: formatValue,
              style: {
                fontSize: '36px',
                fill: 'hsl(var(--foreground))',
                textShadow: 'none',
              },
            },
            tickLabels: showTickLabels
              ? {
                  type: 'outer',
                  ticks: tickValues.map((v) => ({ value: v })),
                  defaultTickValueConfig: {
                    style: {
                      fontSize: '10px',
                      fill: 'hsl(var(--muted-foreground))',
                    },
                  },
                }
              : { hideMinMax: true },
          }}
        />
        {label && <span className="text-sm text-muted-foreground">{label}</span>}
      </div>
    );
  }

  const { showValueLabel = false } = props as RadialGaugeProps;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <GaugeComponent
        type="radial"
        {...commonProps}
        labels={{
          valueLabel: {
            hide: !showValueLabel,
            style: {
              fontSize: '24px',
              fill: 'hsl(var(--foreground))',
              textShadow: 'none',
            },
          },
          tickLabels: {
            type: 'inner',
            defaultTickValueConfig: {
              style: {
                fontSize: '10px',
                fill: 'hsl(var(--muted-foreground))',
              },
            },
          },
        }}
        arc={{
          colorArray: [
            'hsl(var(--chart-destructive, 0 84% 60%))',  // red (low = slow/bad)
            'hsl(var(--chart-warning, 38 92% 50%))',     // yellow (mid)
            'hsl(var(--chart-success, 142 76% 36%))',    // green (high = fast/good)
          ],
          padding: 0.02,
          width: 0.3,
          subArcs: [{ limit: 30 }, { limit: 60 }, {}, {}, {}, {}, {}],
        }}
        pointer={{
          type: 'needle',
          elastic: true,
          animationDelay: 0,
          color: 'hsl(var(--muted-foreground))',
        }}
      />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}
