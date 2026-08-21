import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MembersService } from '../members/members.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { randomUUID } from 'node:crypto';
import { RevokedTokenService } from './revoked-token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly membersService: MembersService,
    private readonly jwtService: JwtService,
    private readonly revokedTokenService: RevokedTokenService,
  ) {}

  async login(dto: LoginDto) {
    const member = await this.membersService.findByEmail(dto.email);

    if (!member) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const passwordMatched = await bcrypt.compare(
      dto.password,
      member.passwordHash,
    );

    if (!passwordMatched) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const payload: JwtPayload = {
      sub: member.id,
      email: member.email,
      role: member.role,
      jti: randomUUID(),
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      member: {
        id: member.id,
        email: member.email,
        name: member.name,
        role: member.role,
      },
    };
  }
  async logout(payload: JwtPayload): Promise<null> {
    if (!payload.jti || !payload.exp) {
      throw new UnauthorizedException('Invalid access token');
    }

    await this.revokedTokenService.revoke(payload.jti, payload.exp);
    return null;
  }
}
