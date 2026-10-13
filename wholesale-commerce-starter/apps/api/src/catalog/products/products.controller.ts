import { Controller, Get, Inject, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "../../auth/auth.types";
import { CurrentUser } from "../../auth/current-user.decorator";
import { OptionalSessionGuard } from "../../auth/optional-session.guard";
import { CatalogService } from "../catalog.service";

@ApiTags("products")
@Controller("products")
@UseGuards(OptionalSessionGuard)
export class ProductsController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthContext | null,
    @Query("q") q?: string,
    @Query("category") category?: string,
    @Query("brand") brand?: string,
    @Query("includeDescendants") includeDescendants?: string,
  ) {
    const data = await this.catalog.listProducts(user, {
      q,
      category,
      brand,
      includeDescendants: includeDescendants === "true" || includeDescendants === "1",
    });
    return { data, meta: { total: data.length, page: 1, pageSize: data.length } };
  }

  @Get(":slug/related")
  async related(@CurrentUser() user: AuthContext | null, @Param("slug") slug: string) {
    const data = await this.catalog.listRelated(slug, user);
    return { data, meta: { total: data.length, page: 1, pageSize: data.length } };
  }

  @Get(":slug")
  async detail(@CurrentUser() user: AuthContext | null, @Param("slug") slug: string) {
    return { data: await this.catalog.getProduct(slug, user) };
  }
}
