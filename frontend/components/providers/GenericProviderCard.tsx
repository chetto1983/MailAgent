import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GenericProviderDialog } from './GenericProviderDialog';

interface GenericProviderCardProps {
  onSuccess: () => void;
}

export function GenericProviderCard({ onSuccess }: GenericProviderCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            component="span"
            sx={{
              width: 28,
              height: 28,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg viewBox="0 0 24 24" width="100%" height="100%">
              <path
                fill="none"
                stroke="#475569"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 5h18v14H3z"
              />
              <path
                fill="none"
                stroke="#475569"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 5l9 7 9-7"
              />
              <path
                fill="none"
                stroke="#10b981"
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 16h12M6 19h6"
              />
            </svg>
          </Box>
          IMAP & CalDAV
        </CardTitle>
        <CardDescription>Connect custom IMAP/SMTP and CalDAV providers</CardDescription>
      </CardHeader>
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Bring any compatible mailbox or calendar by entering your server credentials. Supports
            hosted email providers and self-hosted servers.
          </Typography>

          <Box
            component="ul"
            sx={{
              pl: 3,
              m: 0,
              listStyle: 'disc',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              color: 'text.secondary',
            }}
          >
            <li>IMAP/SMTP support for inbound/outbound email</li>
            <li>Optional CalDAV sync for calendars</li>
            <li>Perfect for Fastmail, Yahoo, iCloud, and custom servers</li>
          </Box>
        </Stack>

        <GenericProviderDialog
          onSuccess={onSuccess}
          trigger={
            <Button variant="outline" className="w-full">
              Configure IMAP / CalDAV
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
