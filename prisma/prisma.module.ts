<<<<<<< HEAD
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
=======
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

>>>>>>> origin/develop
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
<<<<<<< HEAD
export class PrismaModule {}
=======
export class PrismaModule {}
>>>>>>> origin/develop
