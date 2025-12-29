import type { SxProps, Theme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export type ColorPickerProps = {
  multi?: boolean;
  colors: string[];
  selected: string | string[];
  limit?: 'auto' | number;
  onSelectColor: (color: string | string[]) => void;
  slotProps?: {
    button?: SxProps<Theme>;
  };
};

export type ColorPreviewProps = {
  limit?: number;
  colors: ColorPickerProps['colors'];
};
