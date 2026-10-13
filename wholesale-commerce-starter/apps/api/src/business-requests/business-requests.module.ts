import { Module } from "@nestjs/common";

import { BusinessRequestsController } from "./business-requests.controller";
import { BusinessRequestsService } from "./business-requests.service";

@Module({
  controllers: [BusinessRequestsController],
  providers: [BusinessRequestsService],
  exports: [BusinessRequestsService],
})
export class BusinessRequestsModule {}
