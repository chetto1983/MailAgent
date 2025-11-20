
import {
  Box,
  Typography,
  Grid as MuiGrid,
  Paper,
  Stack,
  Chip,
} from '@mui/material';
import { useTranslations } from '@/lib/hooks/use-translations';

const Grid = MuiGrid as unknown as React.ComponentType<any>;

export function Features() {
  const t = useTranslations();

  return (
    <Box id="features" sx={{ mt: 12 }}>
      <Grid container spacing={4}>
        {t.landing.features.map((feature) => (
          <Grid item xs={12} md={4} key={feature.title}>
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                height: '100%',
                borderRadius: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                {feature.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {feature.description}
              </Typography>
              <Stack spacing={1.5}>
                {feature.bullets.map((bullet) => (
                  <Box key={bullet} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip label="·" size="small" />
                    <Typography variant="body2">{bullet}</Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
