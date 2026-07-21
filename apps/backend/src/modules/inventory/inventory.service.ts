import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';

const OUTBOUND_MOVEMENTS = new Set([
  'CONSUMPTION_OUT',
  'ADJUSTMENT_OUT',
  'TRANSFER_OUT',
  'EXPIRED_OUT',
]);

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createProduct(organizationId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: { organizationId, ...dto },
    });
  }

  async listProducts(organizationId: string, clinicId?: string) {
    const products = await this.prisma.product.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: 'asc' },
      include: { stocks: clinicId ? { where: { clinicId } } : true },
    });

    return products.map((product) => {
      const quantity = product.stocks.reduce(
        (sum, stock) => sum + stock.quantity,
        0,
      );
      return { ...product, quantity, lowStock: quantity <= product.minStock };
    });
  }

  async adjustStock(productId: string, dto: AdjustStockDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const isOutbound = OUTBOUND_MOVEMENTS.has(dto.type);
    const delta = isOutbound ? -dto.quantity : dto.quantity;

    const currentStock = await this.prisma.productStock.findUnique({
      where: { productId_clinicId: { productId, clinicId: dto.clinicId } },
    });

    const newQuantity = (currentStock?.quantity ?? 0) + delta;
    if (newQuantity < 0) {
      throw new BadRequestException(
        'El movimiento dejaría el stock en negativo',
      );
    }

    await this.prisma.stockMovement.create({
      data: {
        productId,
        type: dto.type,
        quantity: dto.quantity,
        reason: dto.reason,
      },
    });

    return this.prisma.productStock.upsert({
      where: { productId_clinicId: { productId, clinicId: dto.clinicId } },
      update: { quantity: newQuantity },
      create: { productId, clinicId: dto.clinicId, quantity: newQuantity },
    });
  }

  async listMovements(productId: string) {
    return this.prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listSuppliers(organizationId: string) {
    return this.prisma.supplier.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async createSupplier(organizationId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: { organizationId, ...dto } });
  }
}
