import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from './tenants.controller';
import { TenantService } from '../services/tenant.service';
import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedRequest } from '../../../common/types/request.types';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';

/**
 * Unit Tests for TenantsController
 *
 * Tests RBAC enforcement and tenant ownership validation
 */
describe('TenantsController', () => {
  let controller: TenantsController;
  let tenantService: TenantService;

  // Mock data
  const mockTenantId = 'tenant-123';
  const mockOtherTenantId = 'tenant-456';
  const mockUserId = 'user-123';

  const mockRegularUser = {
    id: mockUserId,
    tenantId: mockTenantId,
    role: 'user',
    email: 'user@test.com',
  };

  const mockAdminUser = {
    id: 'admin-123',
    tenantId: mockTenantId,
    role: 'admin',
    email: 'admin@test.com',
  };

  const mockSuperAdminUser = {
    id: 'superadmin-123',
    tenantId: mockTenantId,
    role: 'super-admin',
    email: 'superadmin@test.com',
  };

  const mockTenant = {
    id: mockTenantId,
    name: 'Test Tenant',
    slug: 'test-tenant',
    description: 'Test description',
    isActive: true,
    createdAt: new Date(),
    _count: {
      users: 5,
      messages: 100,
    },
  };

  const mockTenantService = {
    getAllTenants: jest.fn(),
    getTenantById: jest.fn(),
    createTenant: jest.fn(),
    updateTenant: jest.fn(),
    deleteTenant: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    }).compile();

    controller = module.get<TenantsController>(TenantsController);
    tenantService = module.get<TenantService>(TenantService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getAllTenants', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should call tenantService.getAllTenants and return all tenants', async () => {
      const mockTenants = [mockTenant, { ...mockTenant, id: 'tenant-2' }];
      mockTenantService.getAllTenants.mockResolvedValue(mockTenants);

      const result = await controller.getAllTenants();

      expect(tenantService.getAllTenants).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTenants);
    });

    it('should be protected by @Roles("super-admin") decorator', () => {
      // This test verifies the decorator is applied
      // In integration tests, we verify it actually blocks non-super-admins
      const metadata = Reflect.getMetadata('roles', controller.getAllTenants);
      expect(metadata).toEqual(['super-admin']);
    });
  });

  describe('getTenantById', () => {
    it('should allow user to get their own tenant', async () => {
      const req = { user: mockRegularUser } as AuthenticatedRequest;
      mockTenantService.getTenantById.mockResolvedValue(mockTenant);

      const result = await controller.getTenantById(req, mockTenantId);

      expect(tenantService.getTenantById).toHaveBeenCalledWith(mockTenantId);
      expect(result).toEqual(mockTenant);
    });

    it('should block user from getting other tenant', async () => {
      const req = { user: mockRegularUser } as AuthenticatedRequest;

      await expect(
        controller.getTenantById(req, mockOtherTenantId),
      ).rejects.toThrow(ForbiddenException);

      expect(tenantService.getTenantById).not.toHaveBeenCalled();
    });

    it('should allow super-admin to get any tenant', async () => {
      const req = { user: mockSuperAdminUser } as AuthenticatedRequest;
      mockTenantService.getTenantById.mockResolvedValue({
        ...mockTenant,
        id: mockOtherTenantId,
      });

      const result = await controller.getTenantById(req, mockOtherTenantId);

      expect(tenantService.getTenantById).toHaveBeenCalledWith(mockOtherTenantId);
      expect(result.id).toEqual(mockOtherTenantId);
    });

    it('should throw ForbiddenException with correct message for cross-tenant access', async () => {
      const req = { user: mockRegularUser } as AuthenticatedRequest;

      await expect(
        controller.getTenantById(req, mockOtherTenantId),
      ).rejects.toThrow('Access denied: You can only access your own tenant');
    });
  });

  describe('createTenant', () => {
    const createDto: CreateTenantDto = {
      name: 'New Tenant',
      slug: 'new-tenant',
      description: 'New tenant description',
    };

    it('should create tenant successfully', async () => {
      const createdTenant = {
        id: 'new-tenant-id',
        ...createDto,
        isActive: true,
        createdAt: new Date(),
      };
      mockTenantService.createTenant.mockResolvedValue(createdTenant);

      const result = await controller.createTenant(createDto);

      expect(tenantService.createTenant).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdTenant);
    });

    it('should be protected by @Roles("super-admin") decorator', () => {
      const metadata = Reflect.getMetadata('roles', controller.createTenant);
      expect(metadata).toEqual(['super-admin']);
    });

    it('should pass createDto to service without modification', async () => {
      mockTenantService.createTenant.mockResolvedValue({});

      await controller.createTenant(createDto);

      expect(tenantService.createTenant).toHaveBeenCalledWith(createDto);
      expect(tenantService.createTenant).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateTenant', () => {
    const updateDto: UpdateTenantDto = {
      name: 'Updated Name',
      description: 'Updated description',
    };

    it('should allow admin to update their own tenant', async () => {
      const req = { user: mockAdminUser } as AuthenticatedRequest;
      const updatedTenant = { ...mockTenant, ...updateDto };
      mockTenantService.updateTenant.mockResolvedValue(updatedTenant);

      const result = await controller.updateTenant(req, mockTenantId, updateDto);

      expect(tenantService.updateTenant).toHaveBeenCalledWith(mockTenantId, updateDto);
      expect(result).toEqual(updatedTenant);
    });

    it('should block admin from updating other tenant', async () => {
      const req = { user: mockAdminUser } as AuthenticatedRequest;

      await expect(
        controller.updateTenant(req, mockOtherTenantId, updateDto),
      ).rejects.toThrow(ForbiddenException);

      expect(tenantService.updateTenant).not.toHaveBeenCalled();
    });

    it('should allow super-admin to update any tenant', async () => {
      const req = { user: mockSuperAdminUser } as AuthenticatedRequest;
      const updatedTenant = { ...mockTenant, id: mockOtherTenantId, ...updateDto };
      mockTenantService.updateTenant.mockResolvedValue(updatedTenant);

      const result = await controller.updateTenant(req, mockOtherTenantId, updateDto);

      expect(tenantService.updateTenant).toHaveBeenCalledWith(mockOtherTenantId, updateDto);
      expect(result).toEqual(updatedTenant);
    });

    it('should throw ForbiddenException for cross-tenant update attempt', async () => {
      const req = { user: mockAdminUser } as AuthenticatedRequest;

      await expect(
        controller.updateTenant(req, mockOtherTenantId, updateDto),
      ).rejects.toThrow('Access denied: You can only update your own tenant');
    });

    it('should be protected by @Roles("admin", "super-admin") decorator', () => {
      const metadata = Reflect.getMetadata('roles', controller.updateTenant);
      expect(metadata).toEqual(['admin', 'super-admin']);
    });

    it('should allow regular user with admin role to update own tenant', async () => {
      const req = { user: mockAdminUser } as AuthenticatedRequest;
      mockTenantService.updateTenant.mockResolvedValue(mockTenant);

      await controller.updateTenant(req, mockTenantId, updateDto);

      expect(tenantService.updateTenant).toHaveBeenCalled();
    });
  });

  describe('deleteTenant', () => {
    it('should delete tenant successfully', async () => {
      const deletedTenant = { ...mockTenant, deletedAt: new Date() };
      mockTenantService.deleteTenant.mockResolvedValue(deletedTenant);

      const result = await controller.deleteTenant(mockTenantId);

      expect(tenantService.deleteTenant).toHaveBeenCalledWith(mockTenantId);
      expect(result).toEqual(deletedTenant);
    });

    it('should be protected by @Roles("super-admin") decorator', () => {
      const metadata = Reflect.getMetadata('roles', controller.deleteTenant);
      expect(metadata).toEqual(['super-admin']);
    });

    it('should pass tenantId to service without modification', async () => {
      mockTenantService.deleteTenant.mockResolvedValue({});

      await controller.deleteTenant(mockTenantId);

      expect(tenantService.deleteTenant).toHaveBeenCalledWith(mockTenantId);
      expect(tenantService.deleteTenant).toHaveBeenCalledTimes(1);
    });
  });

  describe('Security - RBAC Enforcement', () => {
    it('should have JwtAuthGuard and RolesGuard on controller', () => {
      const guards = Reflect.getMetadata('__guards__', TenantsController);
      expect(guards).toBeDefined();
      // Guards are applied at controller level via @UseGuards decorator
    });

    it('should enforce tenant ownership for getTenantById', async () => {
      const req = { user: { ...mockRegularUser, tenantId: 'wrong-tenant' } } as AuthenticatedRequest;

      await expect(
        controller.getTenantById(req, mockTenantId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should enforce tenant ownership for updateTenant', async () => {
      const req = { user: { ...mockAdminUser, tenantId: 'wrong-tenant' } } as AuthenticatedRequest;

      await expect(
        controller.updateTenant(req, mockTenantId, { name: 'Test' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors for getAllTenants', async () => {
      const error = new Error('Database error');
      mockTenantService.getAllTenants.mockRejectedValue(error);

      await expect(controller.getAllTenants()).rejects.toThrow('Database error');
    });

    it('should propagate service errors for getTenantById', async () => {
      const req = { user: mockRegularUser } as AuthenticatedRequest;
      const error = new Error('Tenant not found');
      mockTenantService.getTenantById.mockRejectedValue(error);

      await expect(controller.getTenantById(req, mockTenantId)).rejects.toThrow('Tenant not found');
    });

    it('should propagate service errors for createTenant', async () => {
      const error = new Error('Slug already exists');
      mockTenantService.createTenant.mockRejectedValue(error);

      await expect(
        controller.createTenant({ name: 'Test', slug: 'test' }),
      ).rejects.toThrow('Slug already exists');
    });

    it('should propagate service errors for updateTenant', async () => {
      const req = { user: mockAdminUser } as AuthenticatedRequest;
      const error = new Error('Update failed');
      mockTenantService.updateTenant.mockRejectedValue(error);

      await expect(
        controller.updateTenant(req, mockTenantId, { name: 'Test' }),
      ).rejects.toThrow('Update failed');
    });

    it('should propagate service errors for deleteTenant', async () => {
      const error = new Error('Delete failed');
      mockTenantService.deleteTenant.mockRejectedValue(error);

      await expect(controller.deleteTenant(mockTenantId)).rejects.toThrow('Delete failed');
    });
  });
});
