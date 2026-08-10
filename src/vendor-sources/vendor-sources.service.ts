import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { SourceType } from '../generated/prisma/enums';
import { CreateVendorSourceDto } from './dto/create-vendor-source.dto';
import { QueryVendorSourcesDto } from './dto/query-vendor-sources.dto';
import { UpdateVendorSourceDto } from './dto/update-vendor-source.dto';
import {
  VendorSourceEntity,
  VendorSourceModel,
} from './entities/vendor-source.entity';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export interface PaginatedSources {
  items: VendorSourceEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Các cụm từ được chấp nhận là lời khai dữ liệu demo, theo yêu cầu nghiệp vụ:
 * khi không có nguồn công khai thì ghi chú phải chứa "source unverified" hoặc
 * "demo data". Chấp nhận thêm dạng gạch nối vì SourceType.DEMO_DATA khiến
 * người nhập dễ gõ "demo-data".
 */
const DEMO_DATA_MARKERS = ['demo data', 'demo-data', 'source unverified'];

@Injectable()
export class VendorSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mọi phương thức đều nhận vendorId vì Source API lồng dưới vendor.
   * vendorId không phải để trang trí: findOneForVendor() giới hạn truy vấn
   * theo cả hai id, nên /api/vendors/1/sources/99 không thể đọc hay sửa nguồn
   * thuộc về vendor khác.
   */
  async create(
    vendorId: number,
    dto: CreateVendorSourceDto,
  ): Promise<VendorSourceEntity> {
    // Kiểm tra vendor tồn tại trước, thay vì để ràng buộc khoá ngoại từ chối.
    // Prisma báo vi phạm FK bằng mã P2003 — AllExceptionsFilter sẽ biến nó
    // thành 500 trống trơn vì chỉ xử lý riêng HttpException.
    await this.assertVendorExists(vendorId);

    this.assertSourceEvidence(dto.sourceType, dto.sourceUrl, dto.memo);

    const created = await this.prisma.vendorSource.create({
      data: {
        vendorId,
        sourceType: dto.sourceType,
        sourceUrl: dto.sourceUrl ?? null,
        sourceTitle: dto.sourceTitle ?? null,
        checkedAt: dto.checkedAt ? new Date(dto.checkedAt) : null,
        memo: dto.memo ?? null,
      },
    });

    return VendorSourceEntity.fromModel(created);
  }

  async findAllForVendor(
    vendorId: number,
    query: QueryVendorSourcesDto,
  ): Promise<PaginatedSources> {
    // Trả 404 khi vendor không tồn tại thay vì một trang rỗng: danh sách rỗng
    // mang nghĩa "vendor này chưa có nguồn nào", khác hẳn "vendor không tồn tại".
    await this.assertVendorExists(vendorId);

    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    // sourceType để undefined khi không lọc — Prisma bỏ qua khoá undefined,
    // còn null sẽ lọc theo cột IS NULL và không khớp gì cả.
    const where = {
      vendorId,
      sourceType: query.sourceType,
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.vendorSource.count({ where }),
      this.prisma.vendorSource.findMany({
        where,
        // Bảng không có cột createdAt nên không sắp xếp theo thời gian được.
        // Với khoá tự tăng, id giảm dần chính là thứ tự chèn ngược.
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: VendorSourceEntity.fromModels(rows),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    vendorId: number,
    sourceId: number,
  ): Promise<VendorSourceEntity> {
    return VendorSourceEntity.fromModel(
      await this.findOneForVendor(vendorId, sourceId),
    );
  }

  async update(
    vendorId: number,
    sourceId: number,
    dto: UpdateVendorSourceDto,
  ): Promise<VendorSourceEntity> {
    const existing = await this.findOneForVendor(vendorId, sourceId);

    // Kiểm tra quy tắc nguồn trên dòng SAU KHI gộp, không phải trên body.
    // Một PATCH chỉ xoá sourceUrl trông vô hại khi xét từng trường, nhưng có
    // thể để lại dòng không còn URL lẫn ghi chú demo.
    this.assertSourceEvidence(
      dto.sourceType ?? existing.sourceType,
      dto.sourceUrl ?? existing.sourceUrl ?? undefined,
      dto.memo ?? existing.memo ?? undefined,
    );

    const updated = await this.prisma.vendorSource.update({
      where: { id: sourceId },
      data: {
        sourceType: dto.sourceType,
        // Để undefined khi client không gửi: với PATCH, trường vắng mặt nghĩa
        // là giữ nguyên, và Prisma bỏ qua khoá undefined. Dùng `?? null` ở đây
        // sẽ xoá sạch mọi trường client không gửi lại, biến PATCH thành PUT.
        sourceUrl: dto.sourceUrl,
        sourceTitle: dto.sourceTitle,
        checkedAt: dto.checkedAt ? new Date(dto.checkedAt) : undefined,
        memo: dto.memo,
      },
    });

    return VendorSourceEntity.fromModel(updated);
  }

  /**
   * Xoá cứng. Một dòng nguồn chỉ là con trỏ tới bằng chứng bên ngoài, không
   * gắn với quyết định nào nên không cần giữ lại để đối chiếu. Route giới hạn
   * cho ADMIN.
   */
  async remove(
    vendorId: number,
    sourceId: number,
  ): Promise<{ id: number; deleted: true }> {
    await this.findOneForVendor(vendorId, sourceId);

    await this.prisma.vendorSource.delete({ where: { id: sourceId } });

    return { id: sourceId, deleted: true };
  }

  /**
   * Quy tắc kiểm soát nguồn: mỗi dòng phải trỏ tới thứ kiểm chứng được, hoặc
   * nói thẳng ra là không có. Vế thứ hai là thứ ngăn một dòng không nguồn
   * trông như thể nó là bằng chứng.
   *
   * Giới hạn đã biết: hàm này bảo đảm từng DÒNG NGUỒN có bằng chứng, nhưng
   * không bảo đảm mỗi VENDOR có ít nhất một nguồn. Ràng buộc đó thuộc luồng
   * tạo vendor, không ép được từ module này.
   */
  private assertSourceEvidence(
    sourceType: SourceType,
    sourceUrl: string | undefined,
    memo: string | undefined,
  ): void {
    const hasUrl = typeof sourceUrl === 'string' && sourceUrl.trim().length > 0;

    const normalizedMemo = (memo ?? '').toLowerCase();
    const hasDemoDataNote = DEMO_DATA_MARKERS.some((marker) =>
      normalizedMemo.includes(marker),
    );

    if (!hasUrl && !hasDemoDataNote) {
      throw new BadRequestException(
        `A source must have either a public sourceUrl or a memo containing one of: ${DEMO_DATA_MARKERS.map(
          (marker) => `"${marker}"`,
        ).join(', ')}`,
      );
    }

    // Chiều ngược lại: chỉ dữ liệu demo mới được phép thiếu URL. Một dòng
    // không có URL mà lại khai là nguồn công khai thì đang nhận một thứ nó
    // không trưng ra được.
    if (!hasUrl && sourceType !== SourceType.DEMO_DATA) {
      throw new BadRequestException(
        `sourceUrl may only be omitted for sourceType ${SourceType.DEMO_DATA}, not ${sourceType}`,
      );
    }
  }

  /**
   * findFirst theo CẢ HAI id chứ không findUnique theo mình sourceId. Đây là
   * thứ khiến đoạn {id} trong /api/vendors/{id}/sources/{sourceId} có tác dụng
   * thật: cặp id không khớp sẽ trả 404 thay vì lặng lẽ thao tác lên dòng của
   * vendor khác.
   */
  private async findOneForVendor(
    vendorId: number,
    sourceId: number,
  ): Promise<VendorSourceModel> {
    await this.assertVendorExists(vendorId);

    const source = await this.prisma.vendorSource.findFirst({
      where: { id: sourceId, vendorId },
    });

    if (!source) {
      throw new NotFoundException(
        `Source ${sourceId} not found for vendor ${vendorId}`,
      );
    }

    return source;
  }

  private async assertVendorExists(vendorId: number): Promise<void> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor ${vendorId} not found`);
    }
  }
}
