
import {
  Box,
  Typography,
  Grid as MuiGrid,
  Paper,
  Stack,
} from '@mui/material';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/hooks/use-translations';

const Grid = MuiGrid as unknown as React.ComponentType<any>;

export function Cta() {
  const t = useTranslations();

  return (
    <Box sx={{ mt: 10 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, md: 6 },
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={7}>
            <Typography variant="h4" fontWeight={700}>
              {t.landing.secondaryCta.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5 }}>
              {t.landing.secondaryCta.subtitle}
            </Typography>
          </Grid>
          <Grid item xs={12} md={5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
              <Button
                component="a"
                href="mailto:hello@mailagent.ai"
                endIcon={<ArrowRight size={18} />}
              >
                {t.landing.secondaryCta.primaryCta}
              </Button>
              <Button component="a" href="#features" variant="outlined">
                {t.landing.secondaryCta.secondaryCta}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
