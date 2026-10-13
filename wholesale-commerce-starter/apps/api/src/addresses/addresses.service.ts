import type { AddressDto } from "@almohit/contracts";
import { Prisma } from "@almohit/database";
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { AuthContext } from "../auth/auth.types";
import { PrismaService } from "../common/prisma.service";
import { ADDRESS_NOT_FOUND, AUTH_REQUIRED, CUSTOMER_REQUIRED } from "./addresses.errors";
import { parseAddressInput } from "./addresses.input";

type AddressRow = {
  id: string;
  label: string | null;
  recipient: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
};

const addressSelect = {
  id: true,
  label: true,
  recipient: true,
  phone: true,
  line1: true,
  line2: true,
  city: true,
  region: true,
  postalCode: true,
  country: true,
  isDefault: true,
} satisfies Prisma.AddressSelect;

const TX = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  timeout: 20_000,
  maxWait: 10_000,
} as const;

@Injectable()
export class AddressesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(user: AuthContext | null) {
    const customer = this.requireCustomer(user);
    const addresses = await this.prisma.client.address.findMany({
      where: { customerId: customer.id },
      select: addressSelect,
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return { data: addresses.map(toDto) };
  }

  async create(user: AuthContext | null, body: Record<string, unknown>) {
    const customer = this.requireCustomer(user);
    const input = parseAddressInput(body);
    const created = await this.prisma.client.address.create({
      data: {
        customerId: customer.id,
        label: input.label,
        recipient: input.recipient,
        phone: input.phone,
        line1: input.line1,
        line2: input.line2,
        city: input.city,
        region: input.region,
        postalCode: input.postalCode,
        country: input.country,
        isDefault: false,
      },
      select: addressSelect,
    });
    if (input.isDefault) {
      return { data: await this.setOwnedDefault(customer.id, created.id) };
    }
    return { data: toDto(created) };
  }

  async update(user: AuthContext | null, addressId: string, body: Record<string, unknown>) {
    const customer = this.requireCustomer(user);
    const input = parseAddressInput(body);
    const owned = await this.ownedAddress(customer.id, addressId);
    const updated = await this.prisma.client.address.update({
      where: { id: owned.id },
      data: {
        label: input.label,
        recipient: input.recipient,
        phone: input.phone,
        line1: input.line1,
        line2: input.line2,
        city: input.city,
        region: input.region,
        postalCode: input.postalCode,
        country: input.country,
      },
      select: addressSelect,
    });
    if (input.isDefault) {
      return { data: await this.setOwnedDefault(customer.id, owned.id) };
    }
    return { data: toDto(updated) };
  }

  async remove(user: AuthContext | null, addressId: string) {
    const customer = this.requireCustomer(user);
    const result = await this.prisma.client.address.deleteMany({
      where: { id: addressId, customerId: customer.id },
    });
    if (result.count === 0) throw new NotFoundException(ADDRESS_NOT_FOUND);
    return { data: { id: addressId } };
  }

  async setDefault(user: AuthContext | null, addressId: string) {
    const customer = this.requireCustomer(user);
    return { data: await this.setOwnedDefault(customer.id, addressId) };
  }

  private requireCustomer(user: AuthContext | null) {
    if (!user) throw new UnauthorizedException(AUTH_REQUIRED);
    if (!user.customer) throw new ForbiddenException(CUSTOMER_REQUIRED);
    return user.customer;
  }

  private async ownedAddress(customerId: string, addressId: string) {
    const owned = await this.prisma.client.address.findFirst({
      where: { id: addressId, customerId },
      select: addressSelect,
    });
    if (!owned) throw new NotFoundException(ADDRESS_NOT_FOUND);
    return owned;
  }

  private async setOwnedDefault(customerId: string, addressId: string) {
    await this.ownedAddress(customerId, addressId);
    const [, updated] = await this.prisma.client.$transaction(
      [
        this.prisma.client.address.updateMany({ where: { customerId }, data: { isDefault: false } }),
        this.prisma.client.address.update({
          where: { id: addressId },
          data: { isDefault: true },
          select: addressSelect,
        }),
      ],
      TX,
    );
    return toDto(updated);
  }
}

function toDto(row: AddressRow): AddressDto {
  return {
    id: row.id,
    label: row.label,
    recipient: row.recipient,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    region: row.region,
    postalCode: row.postalCode,
    country: row.country,
    isDefault: row.isDefault,
  };
}
