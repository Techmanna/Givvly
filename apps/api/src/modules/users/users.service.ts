import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { UpdateProfileDto, ChangePasswordDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const data: { name?: string; phone?: string } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...updated,
      verified: Boolean(updated.emailVerifiedAt),
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        "Account uses external login. Please set password via reset flow."
      );
    }

    const isMatch = await argon2.verify(
      user.passwordHash,
      dto.currentPassword
    );
    if (!isMatch) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    const newHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { ok: true, message: "Password updated successfully" };
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({
        where: { userId },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          status: "DELETED",
          deletedAt: new Date(),
        },
      });
    });

    return { deleted: true };
  }
}

