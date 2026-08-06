import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "../../prisma";
import { UpdateProfileDto } from "./dto/settings.dto";

let prisma = defaultPrisma;

export function setSettingsPrisma(client: PrismaClient) {
  prisma = client;
}

@Injectable()
export class SettingsService {


  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: Record<string, string> = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.timezone !== undefined) {
      data.timezone = dto.timezone;
    }

    if (dto.locale !== undefined) {
      data.locale = dto.locale;
    }

    if (Object.keys(data).length === 0) {
      return prisma.user.findUnique({
        where: { id: userId },
      });
    }

    return prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}

