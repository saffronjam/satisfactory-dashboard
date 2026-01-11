import { Box, Chip, Typography } from '@mui/material';
import { useCallback, useRef, useState } from 'react';
import { CONFIG } from 'src/config-global';
import { useDebug } from 'src/contexts/debug/DebugContext';

const CLICK_THRESHOLD = 5;
const CLICK_TIMEOUT = 2000; // 2 seconds to complete 5 clicks

export function VersionDisplay() {
  const { isDebugMode, enableDebugMode, disableDebugMode } = useDebug();
  const [clickCount, setClickCount] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVersionClick = useCallback(() => {
    if (isDebugMode) {
      // If already in debug mode, clicking disables it
      disableDebugMode();
      setClickCount(0);
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount >= CLICK_THRESHOLD) {
      enableDebugMode();
      setClickCount(0);
    } else {
      // Reset count after timeout
      timeoutRef.current = setTimeout(() => {
        setClickCount(0);
      }, CLICK_TIMEOUT);
    }
  }, [clickCount, isDebugMode, enableDebugMode, disableDebugMode]);

  return (
    <Box sx={{ p: 2, pb: 6 }}>
      {isDebugMode && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <Chip
            label="Debug mode"
            size="small"
            onDelete={disableDebugMode}
            sx={{
              bgcolor: 'warning.main',
              color: 'warning.contrastText',
              fontWeight: 'bold',
              fontSize: '0.7rem',
              '& .MuiChip-deleteIcon': {
                color: 'warning.contrastText',
                '&:hover': {
                  color: 'warning.contrastText',
                  opacity: 0.7,
                },
              },
            }}
          />
        </Box>
      )}
      <Typography
        variant="caption"
        color="text.secondary"
        onClick={handleVersionClick}
        sx={{
          display: 'block',
          textAlign: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': {
            opacity: 0.8,
          },
        }}
      >
        {CONFIG.appVersion}
      </Typography>
    </Box>
  );
}
