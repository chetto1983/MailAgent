import { Request } from 'express';

/**
 * Custom Request interface with JWT user payload
 */
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    userId: string;
    tenantId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    role: string;
    sessionId?: string | null;
  };
}
