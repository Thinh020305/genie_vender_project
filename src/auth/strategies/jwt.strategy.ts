import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RevokedTokenService } from '../revoked-token.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly revokedTokenService: RevokedTokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<JwtPayload> {
    if (!payload.jti) {
      throw new UnauthorizedException(
        'Invalid access token',
      );
    }

    const isRevoked =
      await this.revokedTokenService.isRevoked(
        payload.jti,
      );

    if (isRevoked) {
      throw new UnauthorizedException(
        'Access token has been revoked',
      );
    }

    return payload;
  }
}