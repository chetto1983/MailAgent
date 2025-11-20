
import {
  Box,
  Typography,
  Paper,
} from '@mui/material';
import { useTranslations } from '@/lib/hooks/use-translations';

export function Testimonial() {
  const t = useTranslations();

  return (
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
  );
}
