import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

// [AI] New shared file under common/ — needed because docs/erd.md makes every
// primary key a bigint, and route params arrive as strings. Without this,
// `BigInt(req.params.id)` throws a raw SyntaxError on any non-numeric path
// segment, which AllExceptionsFilter would surface as a 500 instead of a 400.
// -> MENTION TO TEAM: common/ is Thịnh's area in the task split. This is
//    additive (no existing file changed), but he should know it exists so a
//    second copy doesn't get written somewhere else.
@Injectable()
export class ParseBigIntPipe implements PipeTransform<string, bigint> {
  transform(value: string): bigint {
    // [AI] Deliberately stricter than BigInt() itself: BigInt() happily
    // accepts '0x10', '  7  ', '' (-> 0n) and negative values. IDs from
    // @default(autoincrement()) are always positive integers, so anything
    // else is a client mistake and should read as 400, not as a lookup that
    // silently misses.
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException(
        `"${value}" is not a valid identifier: expected a positive integer`,
      );
    }

    return BigInt(value);
  }
}
