import { Controller, Get } from '@nestjs/common';
import { ClassificationRulesService } from './classification-rules.service';

@Controller('api/classification-rules')
export class ClassificationRulesController {
  constructor(private readonly service: ClassificationRulesService) {}

  @Get()
  async findAll() {
    const data = await this.service.findAll();

    return {
      status: 200,
      message: 'success',
      data,
    };
  }
}
