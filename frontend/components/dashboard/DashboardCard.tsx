import React from 'react';
import { Card, CardContent, CardHeader, Typography, IconButton } from '@mui/material';
import { MoreVertical } from 'lucide-react';

export interface DashboardCardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  sx?: any;
}

export function DashboardCard({
  title,
  subtitle,
  action,
  children,
  sx,
}: DashboardCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...sx,
      }}
    >
      {title && (
        <CardHeader
          title={
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          }
          subheader={subtitle}
          action={
            action || (
              <IconButton size="small">
                <MoreVertical size={18} />
              </IconButton>
            )
          }
          sx={{ pb: 1 }}
        />
      )}
      <CardContent sx={{ flexGrow: 1, pt: title ? 1 : 3 }}>
        {children}
      </CardContent>
    </Card>
  );
}
