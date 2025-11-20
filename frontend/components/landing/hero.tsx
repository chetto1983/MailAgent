
import Link from 'next/link';
import Image from 'next/image';
import {
  Box,
  Typography,
  Grid as MuiGrid,
  Paper,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import { ArrowRight, Play, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/hooks/use-translations';

const Grid = MuiGrid as unknown as React.ComponentType<any>;

export function Hero() {
  const t = useTranslations();

  return (
    <Grid container spacing={6} alignItems="center" id="product">
      <Grid item xs={12} md={6}>
        <Stack spacing={3}>
          <Chip
            label={t.landing.hero.eyebrow}
            color="primary"
            variant="outlined"
            sx={{ alignSelf: 'flex-start' }}
          />
          <Typography variant="h2" component="h1" sx={{ fontWeight: 700 }}>
            {t.landing.hero.title}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {t.landing.hero.subtitle}
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              component={Link}
              href="/auth/register"
              size="large"
              endIcon={<ArrowRight size={18} />}
            >
              {t.landing.hero.primaryCta}
            </Button>
            <Button
              component="a"
              href="#features"
              variant="outlined"
              size="large"
              endIcon={<Play size={18} />}
            >
              {t.landing.hero.secondaryCta}
            </Button>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} pt={2}>
            {t.landing.highlights.map((highlight) => (
              <Box key={highlight.label}>
                <Typography variant="h4" fontWeight={700}>
                  {highlight.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {highlight.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper
          elevation={3}
          sx={{
            borderRadius: 4,
            p: 4,
            position: 'relative',
            overflow: 'hidden',
            minHeight: 420,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'primary.main',
              opacity: 0.08,
            }}
          />
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Image src="/logo.png" alt="MailAgent UI" width={64} height={64} />
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {t.app.tagline}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Material-compliant workspace
              </Typography>
            </Box>
          </Box>

          <Divider />

          <Stack spacing={2} sx={{ position: 'relative' }}>
            {t.landing.features[0].bullets.map((item) => (
              <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckCircle size={16} />
                <Typography variant="body2">{item}</Typography>
              </Box>
            ))}
          </Stack>

          <Divider />

          <Stack direction="row" spacing={2}>
            {t.landing.highlights.map((highlight) => (
              <Paper
                key={`card-${highlight.label}`}
                variant="outlined"
                sx={{
                  flex: 1,
                  p: 2,
                  borderRadius: 3,
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  {highlight.label}
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {highlight.value}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}
