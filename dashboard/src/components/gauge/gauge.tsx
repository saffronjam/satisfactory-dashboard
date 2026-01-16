import GaugeComponent, { type GaugeComponentProps } from 'react-gauge-component';
import { cn } from '@/lib/utils';

type GaugeSize = 'sm' | 'md' | 'lg';

type BaseGaugeProps = {
  value: number;
  className?: string;
  label?: string;
  size?: GaugeSize;
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

const sizeClasses: Record<GaugeSize, string> = {
  sm: 'max-w-[140px]',
  md: 'max-w-[180px]',
  lg: 'max-w-[240px]',
};

const sizeDimensions: Record<GaugeSize, { width: number; height: number }> = {
  sm: { width: 130, height: 105 },
  md: { width: 150, height: 120 },
  lg: { width: 200, height: 160 },
};

/**
 * Gauge component wrapper for react-gauge-component with Tailwind styling.
 * Provides consistent theming using CSS variables and supports radial and semicircle variants.
 */
export function Gauge(props: GaugeProps) {
  const { value, className, label, variant = 'radial', size = 'lg' } = props;

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
      <div className={cn('flex flex-col items-center', sizeClasses[size], className)}>
        <GaugeComponent
          type="semicircle"
          {...commonProps}
          style={{ width: sizeDimensions[size].width, height: sizeDimensions[size].height }}
          arc={{
            width: 0.2,
            padding: 0.005,
            cornerRadius: 10,
            subArcs: [
              {
                limit: value,
                color: 'var(--chart-1)',
                showTick: false,
              },
              {
                color: 'var(--muted)',
                showTick: false,
              },
            ],
          }}
          pointer={{
            type: 'needle',
            color: 'var(--foreground)',
            length: 0.7,
            width: 12,
          }}
          labels={{
            valueLabel: {
              formatTextValue: formatValue,
              style: {
                fontSize: '36px',
                fill: 'var(--foreground)',
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
                      fill: 'var(--muted-foreground)',
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
    <div className={cn('flex flex-col items-center', sizeClasses[size], className)}>
      <GaugeComponent
        type="radial"
        {...commonProps}
        style={{ width: sizeDimensions[size].width, height: sizeDimensions[size].height }}
        labels={{
          valueLabel: {
            hide: !showValueLabel,
            style: {
              fontSize: '24px',
              fill: 'var(--foreground)',
              textShadow: 'none',
            },
          },
          tickLabels: {
            hideMinMax: true,
          },
        }}
        arc={{
          colorArray: [
            '#eb4034', // red (low = slow/bad) - matches hsl(0 84% 60%)
            '#f5a623', // yellow (mid) - matches hsl(38 92% 50%)
            '#16a34a', // green (high = fast/good) - matches hsl(142 76% 36%)
          ],
          padding: 0.02,
          width: 0.3,
          subArcs: [{ limit: 30 }, { limit: 60 }, {}, {}, {}, {}, {}],
        }}
        pointer={{
          type: 'needle',
          elastic: true,
          animationDelay: 0,
          color: 'var(--foreground)',
        }}
      />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}
