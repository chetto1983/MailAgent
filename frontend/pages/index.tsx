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
  Button,
} from '@mui/material';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/lib/hooks/use-auth';
import { useTranslations } from '@/lib/hooks/use-translations';
import dynamic from 'next/dynamic';

const Hero = dynamic(() => import('@/components/landing/hero').then((mod) => mod.Hero));
const Features = dynamic(() => import('@/components/landing/features').then((mod) => mod.Features));
const Modules = dynamic(() => import('@/components/landing/modules').then((mod) => mod.Modules));
const Testimonial = dynamic(() => import('@/components/landing/testimonial').then((mod) => mod.Testimonial));
const Cta = dynamic(() => import('@/components/landing/cta').then((mod) => mod.Cta));


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
            <Button variant="text" component="a" href="#product">
              {t.nav.product}
            </Button>
            <Button variant="text" component="a" href="#features">
              {t.nav.features}
            </Button>
            <Button variant="text" component="a" href="#automation">
              {t.nav.automation}
            </Button>
            <Button variant="text" component="a" href="#resources">
              {t.nav.resources}
            </Button>
          </Box>

          <ThemeToggle />

          <Button component={Link} href="/auth/login" variant="text">
            {t.nav.login}
          </Button>
          <Button component={Link} href="/auth/register">
            {t.nav.register}
          </Button>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ pt: { xs: 6, md: 12 }, pb: 10 }}>
        <Container maxWidth="lg">
          <Hero />
          <Features />
          <Modules />
          <Testimonial />
          <Cta />
        </Container>
      </Box>
    </Box>
  );
}

// Force SSR to avoid NextRouter SSR errors
export const getServerSideProps = async () => {
  return { props: {} };
};