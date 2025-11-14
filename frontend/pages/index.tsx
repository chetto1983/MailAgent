import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  AppBar,
  Toolbar,
  Container,
  Box,
  Typography,
  Grid as MuiGrid,
  Paper,
  Stack,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import { useTheme as useNextTheme } from 'next-themes';
import { ArrowRight, Play, CheckCircle, Moon, Sun } from 'lucide-react';

const Grid = MuiGrid as unknown as React.ComponentType<any>;
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';
import { useTranslations } from '@/lib/hooks/use-translations';

const ThemeToggle = () => {
  const { theme, setTheme, systemTheme } = useNextTheme();
  const resolvedTheme = theme === 'system' ? systemTheme : theme;
  const isDark = resolvedTheme === 'dark';

  return (
    <IconButton
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      sx={{
        ml: 1,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </IconButton>
  );
};

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const t = useTranslations();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="body1">{t.common.loading}</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar
          sx={{
            py: 1,
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Image src="/logo.png" alt={`${t.app.name} logo`} width={40} height={40} priority />
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                {t.landing.hero.eyebrow}
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {t.app.name}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, gap: 3, justifyContent: 'center' }}>
            <Button variant="ghost" component="a" href="#product">
              {t.nav.product}
            </Button>
            <Button variant="ghost" component="a" href="#features">
              {t.nav.features}
            </Button>
            <Button variant="ghost" component="a" href="#automation">
              {t.nav.automation}
            </Button>
            <Button variant="ghost" component="a" href="#resources">
              {t.nav.resources}
            </Button>
          </Box>

          <ThemeToggle />

          <Button component={Link} href="/auth/login" variant="ghost">
            {t.nav.login}
          </Button>
          <Button component={Link} href="/auth/register">
            {t.nav.register}
          </Button>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ pt: { xs: 6, md: 12 }, pb: 10 }}>
        <Container maxWidth="lg">
          {/* Hero */}
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
                    size="lg"
                    endIcon={<ArrowRight size={18} />}
                  >
                    {t.landing.hero.primaryCta}
                  </Button>
                  <Button
                    component="a"
                    href="#features"
                    variant="outline"
                    size="lg"
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

          {/* Features */}
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

          {/* Modules */}
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

          {/* Testimonial */}
          <Box id="resources" sx={{ mt: 12 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 4, md: 6 },
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                textAlign: 'center',
              }}
            >
              <Typography variant="h5" fontStyle="italic" gutterBottom>
                “{t.landing.testimonial.quote}”
              </Typography>
              <Typography variant="subtitle1" fontWeight={600}>
                {t.landing.testimonial.author}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t.landing.testimonial.role}
              </Typography>
            </Paper>
          </Box>

          {/* CTA */}
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
                    <Button component="a" href="#features" variant="outline">
                      {t.landing.secondaryCta.secondaryCta}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

// Force SSR to avoid NextRouter SSR errors
export const getServerSideProps = async () => {
  return { props: {} };
};
