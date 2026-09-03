import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Tài liệu sinh từ decorator trong controller và DTO nên không lệch với code.
  // SwaggerModule.setup() gắn thẳng vào Express, không chịu ảnh hưởng của
  // setGlobalPrefix, nên phải ghi đủ 'api/docs'.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Genie Vina Vendor Intelligence API')
    .setDescription(
      'Demo MVP cấu trúc hoá thông tin vendor IT/phần mềm Việt Nam. ' +
        'Kết quả phân loại và đầu ra LLM chỉ mang tính tham khảo, không phải ' +
        'khuyến nghị đối tác, xếp hạng hay thẩm định.',
    )
    .setVersion('1.0.0')
    .addTag('Auth API')
    .addTag('Vendor API')
    .addTag('Source API')
    .addTag('Classification API')
    .addTag('Statistics API')
    .addTag('LLM API')
    .addBearerAuth()
    .build();

  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
    // Giữ token sau khi tải lại trang, đỡ phải Authorize lại giữa buổi demo.
    { swaggerOptions: { persistAuthorization: true } },
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error: unknown) => {
  console.error('Application failed to start', error);
  process.exitCode = 1;
});
