import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { OptionalSessionGuard } from "../../auth/optional-session.guard";
import { CatalogService } from "../catalog.service";

@ApiTags("brands")
@Controller("brands")
@UseGuards(OptionalSessionGuard)
export class BrandsController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get()
  async list() {
    const data = await this.catalog.listBrands();
    return { data, meta: { total: data.length, page: 1, pageSize: data.length } };
  }
}
