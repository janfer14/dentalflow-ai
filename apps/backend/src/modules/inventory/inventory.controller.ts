import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Post('products')
  createProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
  ) {
    return this.inventory.createProduct(user.organizationId, dto);
  }

  @Get('products')
  listProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clinicId') clinicId?: string,
  ) {
    return this.inventory.listProducts(user.organizationId, clinicId);
  }

  @Post('products/:id/stock-movements')
  adjustStock(@Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.inventory.adjustStock(id, dto);
  }

  @Get('products/:id/stock-movements')
  listMovements(@Param('id') id: string) {
    return this.inventory.listMovements(id);
  }

  @Get('suppliers')
  listSuppliers(@CurrentUser() user: AuthenticatedUser) {
    return this.inventory.listSuppliers(user.organizationId);
  }

  @Post('suppliers')
  createSupplier(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.inventory.createSupplier(user.organizationId, dto);
  }
}
