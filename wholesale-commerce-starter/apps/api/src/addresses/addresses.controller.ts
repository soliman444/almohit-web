import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalSessionGuard } from "../auth/optional-session.guard";
import type { AuthContext } from "../auth/auth.types";
import { AddressesService } from "./addresses.service";

@ApiTags("addresses")
@Controller("addresses")
@UseGuards(OptionalSessionGuard)
export class AddressesController {
  constructor(@Inject(AddressesService) private readonly addresses: AddressesService) {}

  @Get()
  list(@CurrentUser() user: AuthContext | null) {
    return this.addresses.list(user);
  }

  @Post()
  @HttpCode(200)
  create(@CurrentUser() user: AuthContext | null, @Body() body: Record<string, unknown>) {
    return this.addresses.create(user, body ?? {});
  }

  @Patch(":addressId")
  update(
    @CurrentUser() user: AuthContext | null,
    @Param("addressId") addressId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.addresses.update(user, addressId, body ?? {});
  }

  @Delete(":addressId")
  remove(@CurrentUser() user: AuthContext | null, @Param("addressId") addressId: string) {
    return this.addresses.remove(user, addressId);
  }

  @Post(":addressId/default")
  @HttpCode(200)
  setDefault(@CurrentUser() user: AuthContext | null, @Param("addressId") addressId: string) {
    return this.addresses.setDefault(user, addressId);
  }
}
