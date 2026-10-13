import { Module } from "@nestjs/common";
import { AdminOrdersController } from "./admin-orders.controller";
import { AdminOrdersService } from "./admin-orders.service";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, AdminOrdersService],
  exports: [OrdersService, AdminOrdersService],
})
export class OrdersModule {}
