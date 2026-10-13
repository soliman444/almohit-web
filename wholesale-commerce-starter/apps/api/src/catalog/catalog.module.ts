import { Module } from "@nestjs/common";
import { AttributesModule } from "./attributes/attributes.module";
import { BrandsController } from "./brands/brands.controller";
import { CatalogService } from "./catalog.service";
import { CategoriesController } from "./categories/categories.controller";
import { ProductsController } from "./products/products.controller";
import { VariantsModule } from "./variants/variants.module";

@Module({
  imports: [AttributesModule, VariantsModule],
  controllers: [ProductsController, CategoriesController, BrandsController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
