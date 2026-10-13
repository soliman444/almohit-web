import { Controller, Get, Inject, Param, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { OptionalSessionGuard } from "../../auth/optional-session.guard";
import { CatalogService } from "../catalog.service";

@ApiTags("categories")
@Controller("categories")
@UseGuards(OptionalSessionGuard)
export class CategoriesController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get()
  async list() {
    const data = await this.catalog.listCategories();
    return { data, meta: { total: data.length, page: 1, pageSize: data.length } };
  }

  @Get(":slug")
  async detail(@Param("slug") slug: string) {
    return { data: await this.catalog.getCategory(slug) };
  }
}
