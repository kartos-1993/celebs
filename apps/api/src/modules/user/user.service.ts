import prisma from '../../db';

export class UserService {
  public async findUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        vendorProfile: true,
      },
    });
    return user || null;
  }
}
