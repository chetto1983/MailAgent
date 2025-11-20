
import {
  Box,
  Typography,
  Grid as MuiGrid,
  Paper,
  Stack,
  Chip,
} from '@mui/material';
import { CheckCircle } from 'lucide-react';
import { useTranslations } from '@/lib/hooks/use-translations';

const Grid = MuiGrid as unknown as React.ComponentType<any>;

export function Modules() {
  const t = useTranslations();

  return (
    <Box id="automation" sx={{ mt: 10 }}>
      <Grid container spacing={4}>
        {t.landing.modules.map((module) => (
          <Grid item xs={12} md={6} key={module.title}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Chip label={module.eyebrow} color="secondary" variant="outlined" />
              <Typography variant="h4" fontWeight={600}>
                {module.title}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {module.description}
              </Typography>
              <Stack spacing={1}>
                {module.items.map((item) => (
                  <Box key={item} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <CheckCircle size={16} />
                    <Typography variant="body2">{item}</Typography>
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
