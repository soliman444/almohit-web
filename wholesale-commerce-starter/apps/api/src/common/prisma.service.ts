import { Injectable } from "@nestjs/common";
import { prisma } from "@almohit/database";

@Injectable()
export class PrismaService {
  readonly client = prisma;
}
