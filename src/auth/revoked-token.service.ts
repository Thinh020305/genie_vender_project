import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RevokedTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async revoke(jti: string, exp: number): Promise<void> {
    const expiresAt = new Date(exp * 1000);

    await this.prisma.revokedToken.upsert({
      where: {
        jti,
      },
      update: {
        expiresAt,
      },
      create: {
        jti,
        expiresAt,
      },
    });
  }

  async isRevoked(jti: string): Promise<boolean> {
    const revokedToken =
      await this.prisma.revokedToken.findUnique({
        where: {
          jti,
        },
      });

    return revokedToken !== null;
  }

  async deleteExpired(): Promise<void> {
    await this.prisma.revokedToken.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });
  }
}