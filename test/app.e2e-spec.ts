import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { afterAll, beforeAll, describe, it } from '@jest/globals';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  it('/api (GET)', async () => {
    await request(app.getHttpServer()).get('/api').expect(200).expect({
      status: 200,
      message: 'success',
      data: 'Hello World!',
    });
  });

  it('exposes only the endpoints required by the Genie Vina specification', () => {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Genie Vina Vendor Intelligence API')
      .setVersion('1.0.0')
      .addTag('Auth API')
      .addTag('Vendor API')
      .addTag('Source API')
      .addTag('Classification API')
      .addTag('Statistics API')
      .addTag('LLM API')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    expect(document.tags?.map(({ name }) => name)).toEqual([
      'Auth API',
      'Vendor API',
      'Source API',
      'Classification API',
      'Statistics API',
      'LLM API',
    ]);

    const operationsByTag = Object.entries(document.paths).reduce<
      Record<string, string[]>
    >((result, [path, pathItem]) => {
      for (const [method, operation] of Object.entries(pathItem ?? {})) {
        if (!operation || typeof operation !== 'object') continue;
        for (const tag of operation.tags ?? []) {
          (result[tag] ??= []).push(`${method} ${path}`);
        }
      }
      return result;
    }, {});

    expect(operationsByTag).toEqual({
      'Auth API': ['post /api/auth/login', 'post /api/auth/logout'],
      'Vendor API': [
        'post /api/vendors',
        'get /api/vendors',
        'get /api/vendors/{id}',
        'patch /api/vendors/{id}',
        'delete /api/vendors/{id}',
      ],
      'Source API': [
        'post /api/vendors/{id}/sources',
        'get /api/vendors/{id}/sources',
        'patch /api/vendors/{id}/sources/{sourceId}',
      ],
      'Classification API': [
        'get /api/classification-rules',
        'patch /api/vendors/{id}/classification',
        'get /api/vendors/{id}/classification-history',
      ],
      'Statistics API': ['get /api/vendors/stats'],
      'LLM API': ['post /api/vendors/classify'],
    });

    const actualOperations = Object.entries(document.paths)
      .flatMap(([path, pathItem]) =>
        Object.keys(pathItem ?? {}).map((method) => `${method} ${path}`),
      )
      .sort();

    expect(actualOperations).toEqual(
      [
        'post /api/auth/login',
        'post /api/auth/logout',
        'post /api/vendors',
        'get /api/vendors',
        'get /api/vendors/{id}',
        'patch /api/vendors/{id}',
        'delete /api/vendors/{id}',
        'post /api/vendors/{id}/sources',
        'get /api/vendors/{id}/sources',
        'patch /api/vendors/{id}/sources/{sourceId}',
        'get /api/classification-rules',
        'patch /api/vendors/{id}/classification',
        'get /api/vendors/{id}/classification-history',
        'get /api/vendors/stats',
        'post /api/vendors/classify',
      ].sort(),
    );
  });

  afterAll(async () => {
    await app.close();
  });
});
