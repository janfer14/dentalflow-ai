import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

function buildService() {
  const prisma = {
    product: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    productStock: { findUnique: jest.fn(), upsert: jest.fn() },
    stockMovement: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn(),
    },
    supplier: { findMany: jest.fn(), create: jest.fn() },
  };

  const service = new InventoryService(prisma as never);
  return { service, prisma };
}

describe('InventoryService.listProducts', () => {
  it('sums stock quantities across clinics and flags low stock', async () => {
    const { service, prisma } = buildService();
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'p1',
        minStock: 10,
        stocks: [{ quantity: 3 }, { quantity: 4 }],
      },
      {
        id: 'p2',
        minStock: 5,
        stocks: [{ quantity: 10 }],
      },
    ]);

    const result = await service.listProducts('org-1');

    expect(result[0]).toMatchObject({ quantity: 7, lowStock: true });
    expect(result[1]).toMatchObject({ quantity: 10, lowStock: false });
  });
});

describe('InventoryService.adjustStock', () => {
  it('throws NotFoundException when the product does not exist', async () => {
    const { service, prisma } = buildService();
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(
      service.adjustStock('missing', {
        type: 'PURCHASE_IN',
        quantity: 5,
        clinicId: 'clinic-1',
      } as never),
    ).rejects.toThrow(NotFoundException);
  });

  it('increases stock for an inbound movement, defaulting to 0 when no stock row exists', async () => {
    const { service, prisma } = buildService();
    prisma.product.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.productStock.findUnique.mockResolvedValue(null);
    prisma.productStock.upsert.mockResolvedValue({});

    await service.adjustStock('p1', {
      type: 'PURCHASE_IN',
      quantity: 20,
      clinicId: 'clinic-1',
    } as never);

    expect(prisma.productStock.upsert).toHaveBeenCalledWith({
      where: { productId_clinicId: { productId: 'p1', clinicId: 'clinic-1' } },
      update: { quantity: 20 },
      create: { productId: 'p1', clinicId: 'clinic-1', quantity: 20 },
    });
  });

  it('decreases stock for an outbound movement', async () => {
    const { service, prisma } = buildService();
    prisma.product.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.productStock.findUnique.mockResolvedValue({ quantity: 15 });
    prisma.productStock.upsert.mockResolvedValue({});

    await service.adjustStock('p1', {
      type: 'CONSUMPTION_OUT',
      quantity: 5,
      clinicId: 'clinic-1',
    } as never);

    expect(prisma.productStock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { quantity: 10 } }),
    );
  });

  it('rejects an outbound movement that would leave stock negative', async () => {
    const { service, prisma } = buildService();
    prisma.product.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.productStock.findUnique.mockResolvedValue({ quantity: 3 });

    await expect(
      service.adjustStock('p1', {
        type: 'CONSUMPTION_OUT',
        quantity: 5,
        clinicId: 'clinic-1',
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
    expect(prisma.productStock.upsert).not.toHaveBeenCalled();
  });
});
