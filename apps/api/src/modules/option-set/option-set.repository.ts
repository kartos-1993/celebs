import prisma, { Prisma } from '@/config/db.prisma';

export class OptionSetRepository {
  public async count() {
    return prisma.optionSet.count();
  }

  public async upsert(data: Prisma.OptionSetUpsertArgs) {
    return prisma.optionSet.upsert(data);
  }

  public async findAll() {
    return prisma.optionSet.findMany({ orderBy: { name: 'asc' } });
  }

  public async findById(id: string) {
    return prisma.optionSet.findUnique({ where: { id } });
  }

  public async findByName(name: string) {
    return prisma.optionSet.findUnique({ where: { name } });
  }

  public async create(data: Prisma.OptionSetCreateInput) {
    return prisma.optionSet.create({ data });
  }

  public async update(id: string, data: Prisma.OptionSetUpdateInput) {
    return prisma.optionSet.update({
      where: { id },
      data,
    });
  }

  public async delete(id: string) {
    return prisma.optionSet.delete({
      where: { id },
    });
  }
}

export const optionSetRepository = new OptionSetRepository();
