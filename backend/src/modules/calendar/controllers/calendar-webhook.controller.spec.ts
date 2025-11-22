import { Test, TestingModule } from '@nestjs/testing';
import { CalendarWebhookController } from './calendar-webhook.controller';
import { GoogleCalendarWebhookService } from '../services/google-calendar-webhook.service';
import { MicrosoftCalendarWebhookService, MicrosoftCalendarNotification } from '../services/microsoft-calendar-webhook.service';
import { SyncAuthService } from '../../email-sync/services/sync-auth.service';

describe('CalendarWebhookController', () => {
  let controller: CalendarWebhookController;
  let googleWebhook: jest.Mocked<GoogleCalendarWebhookService>;
  let microsoftWebhook: jest.Mocked<MicrosoftCalendarWebhookService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarWebhookController],
      providers: [
        {
          provide: GoogleCalendarWebhookService,
          useValue: {
            handleNotification: jest.fn(),
            getStats: jest.fn(),
          },
        },
        {
          provide: MicrosoftCalendarWebhookService,
          useValue: {
            handleNotifications: jest.fn(),
            getStats: jest.fn(),
          },
        },
        {
          provide: SyncAuthService,
          useValue: {
            validateWebhookToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CalendarWebhookController>(CalendarWebhookController);
    googleWebhook = module.get(GoogleCalendarWebhookService);
    microsoftWebhook = module.get(MicrosoftCalendarWebhookService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('handleGoogleCalendarPush', () => {
    it('should handle Google Calendar push notification successfully', async () => {
      const headers = {
        'x-goog-channel-id': 'channel-123',
        'x-goog-resource-id': 'resource-456',
        'x-goog-resource-state': 'exists',
      };

      googleWebhook.handleNotification.mockResolvedValue(undefined);

      const result = await controller.handleGoogleCalendarPush(headers);

      expect(googleWebhook.handleNotification).toHaveBeenCalledWith(headers);
      expect(result).toEqual({ success: true });
    });

    it('should return success false on error but still return 200', async () => {
      const headers = {
        'x-goog-channel-id': 'channel-123',
        'x-goog-resource-id': 'resource-456',
        'x-goog-resource-state': 'exists',
      };

      googleWebhook.handleNotification.mockRejectedValue(new Error('Processing failed'));

      const result = await controller.handleGoogleCalendarPush(headers);

      expect(result).toEqual({
        success: false,
        error: 'Processing failed',
      });
    });

    it('should handle notifications with missing headers gracefully', async () => {
      const headers = {};

      await expect(controller.handleGoogleCalendarPush(headers)).rejects.toThrow(
        'Missing required Google webhook headers',
      );

      expect(googleWebhook.handleNotification).not.toHaveBeenCalled();
    });
  });

  describe('handleMicrosoftCalendarNotification', () => {
    it('should return validation token when provided', async () => {
      const validationToken = 'validation-token-123';
      const payload = { value: [] };

      const result = await controller.handleMicrosoftCalendarNotification(
        payload,
        validationToken,
      );

      expect(result).toBe(validationToken);
      expect(microsoftWebhook.handleNotifications).not.toHaveBeenCalled();
    });

    it('should handle Microsoft Calendar notifications successfully', async () => {
      const notifications: MicrosoftCalendarNotification[] = [
        {
          subscriptionId: 'sub-1',
          clientState: 'client-state',
          changeType: 'created',
          resource: '/me/events/event-1',
          subscriptionExpirationDateTime: new Date().toISOString(),
        },
        {
          subscriptionId: 'sub-1',
          clientState: 'client-state',
          changeType: 'updated',
          resource: '/me/events/event-2',
          subscriptionExpirationDateTime: new Date().toISOString(),
        },
      ];

      const payload = { value: notifications };

      microsoftWebhook.handleNotifications.mockResolvedValue(undefined);

      const result = await controller.handleMicrosoftCalendarNotification(payload);

      expect(microsoftWebhook.handleNotifications).toHaveBeenCalledWith(notifications);
      expect(result).toEqual({ success: true });
    });

    it('should return success true when payload is empty', async () => {
      const payload = { value: [] };

      const result = await controller.handleMicrosoftCalendarNotification(payload);

      expect(microsoftWebhook.handleNotifications).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should return success true when payload.value is undefined', async () => {
      const payload = {};

      const result = await controller.handleMicrosoftCalendarNotification(payload);

      expect(microsoftWebhook.handleNotifications).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should throw error on processing failure to trigger Microsoft retry', async () => {
      const notifications: MicrosoftCalendarNotification[] = [
        {
          subscriptionId: 'sub-1',
          clientState: 'client-state',
          changeType: 'created',
          resource: '/me/events/event-1',
          subscriptionExpirationDateTime: new Date().toISOString(),
        },
      ];

      const payload = { value: notifications };

      microsoftWebhook.handleNotifications.mockRejectedValue(
        new Error('Processing error'),
      );

      await expect(
        controller.handleMicrosoftCalendarNotification(payload),
      ).rejects.toThrow('Processing error');

      expect(microsoftWebhook.handleNotifications).toHaveBeenCalledWith(notifications);
    });
  });

  describe('getWebhookHealth', () => {
    it('should return health status with statistics from both providers', async () => {
      const googleStats = {
        activeSubscriptions: 5,
        recentNotifications: 3,
        lastNotifications: [],
      };

      const microsoftStats = {
        activeSubscriptions: 3,
        recentNotifications: 2,
        lastNotifications: [],
      };

      googleWebhook.getStats.mockResolvedValue(googleStats);
      microsoftWebhook.getStats.mockResolvedValue(microsoftStats);

      const result = await controller.getWebhookHealth();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        google: googleStats,
        microsoft: microsoftStats,
      });
      expect(googleWebhook.getStats).toHaveBeenCalled();
      expect(microsoftWebhook.getStats).toHaveBeenCalled();
    });

    it('should include valid ISO timestamp', async () => {
      googleWebhook.getStats.mockResolvedValue({
        activeSubscriptions: 0,
        recentNotifications: 0,
        lastNotifications: [],
      });
      microsoftWebhook.getStats.mockResolvedValue({
        activeSubscriptions: 0,
        recentNotifications: 0,
        lastNotifications: [],
      });

      const result = await controller.getWebhookHealth();

      const timestamp = new Date(result.timestamp);
      expect(timestamp.toISOString()).toBe(result.timestamp);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });

    it('should handle stats retrieval errors gracefully', async () => {
      googleWebhook.getStats.mockRejectedValue(new Error('Stats error'));
      microsoftWebhook.getStats.mockResolvedValue({
        activeSubscriptions: 3,
        recentNotifications: 1,
        lastNotifications: [],
      });

      await expect(controller.getWebhookHealth()).rejects.toThrow('Stats error');
    });
  });
});
