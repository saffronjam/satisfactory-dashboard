import React from "react";
import { Box, Button, Card, CardContent, Typography, useTheme } from "@mui/material";
import { Iconify } from "src/components/iconify";
import { useSession } from "src/contexts/sessions";
import { varAlpha } from "src/theme/styles";

interface WelcomeScreenProps {
  onAddSession: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onAddSession }) => {
  const theme = useTheme();
  const { createMockSession, mockExists, isLoading } = useSession();

  const handleTryDemo = async () => {
    try {
      await createMockSession("Demo Session");
    } catch (err) {
      console.error("Failed to create mock session:", err);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "background.default",
        p: 3,
      }}
    >
      <Card
        sx={{
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
          boxShadow: varAlpha(theme.palette.grey["500Channel"], 0.16),
        }}
      >
        <CardContent sx={{ py: 5, px: 4 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              bgcolor: varAlpha(theme.palette.primary.mainChannel, 0.12),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 3,
            }}
          >
            <Iconify icon="material-symbols:factory" width={40} sx={{ color: "primary.main" }} />
          </Box>

          <Typography variant="h4" sx={{ mb: 1 }}>
            Welcome to Commander
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Connect to your Satisfactory server running the Ficsit Remote Monitoring mod to start
            monitoring your factory.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              onClick={onAddSession}
              startIcon={<Iconify icon="mdi:plus" />}
            >
              Add Your First Session
            </Button>

            {!mockExists && (
              <Button
                variant="outlined"
                size="large"
                onClick={handleTryDemo}
                startIcon={<Iconify icon="mdi:test-tube" />}
              >
                Try Demo Mode
              </Button>
            )}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 3 }}>
            Sessions are shared across all users of this Commander instance
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
export default WelcomeScreen;
