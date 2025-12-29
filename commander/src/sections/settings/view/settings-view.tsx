import { Box, Card, CardContent, Container, Typography, useTheme } from '@mui/material';
import { Iconify } from 'src/components/iconify';
import { DashboardContent } from 'src/layouts/dashboard';

export const SettingsView = () => {
  const theme = useTheme();

  return (
    <DashboardContent maxWidth="xl">
      <Container sx={{ paddingTop: '50px' }}>
        <Typography variant="h4" sx={{ marginBottom: '30px' }}>
          Settings
        </Typography>

        <Card>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                gap: 2,
              }}
            >
              <Iconify
                icon="mdi:cog-outline"
                sx={{
                  width: 64,
                  height: 64,
                  color: theme.palette.text.secondary,
                  opacity: 0.5,
                }}
              />
              <Typography variant="h5" color="textSecondary">
                Nothing to see here yet!
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
                Settings and preferences will be available in a future update.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </DashboardContent>
  );
};
