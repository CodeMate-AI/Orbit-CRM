import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaClient, EntityType } from "@prisma/client";
import { CreateCustomFieldDto } from "./dto/create-custom-field.dto";

const prisma = new PrismaClient();

@Injectable()
export class CustomFieldsService {
  private async assertAdminMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }
    if (member.role !== "OWNER" && member.role !== "ADMIN") {
      throw new ForbiddenException("Only owners or admins can manage custom fields.");
    }
  }

  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }
  }

  async list(userId: string, workspaceId: string, entityType?: EntityType) {
    await this.assertMembership(userId, workspaceId);

    return prisma.customFieldDefinition.findMany({
      where: {
        workspaceId,
        ...(entityType ? { entityType } : {}),
      },
      orderBy: { position: "asc" },
    });
  }

  async create(userId: string, workspaceId: string, dto: CreateCustomFieldDto) {
    await this.assertAdminMembership(userId, workspaceId);

    // Generate name programmatic key from label
    const name = dto.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_+|_+$)/g, "");

    if (!name) {
      throw new BadRequestException("Invalid label. Programmatic field name cannot be empty.");
    }

    // Check if duplicate name on same entityType
    const existing = await prisma.customFieldDefinition.findUnique({
      where: {
        workspaceId_entityType_name: {
          workspaceId,
          entityType: dto.entityType,
          name,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`A custom field with the name "${name}" already exists on ${dto.entityType}.`);
    }

    // Determine position
    const count = await prisma.customFieldDefinition.count({
      where: { workspaceId, entityType: dto.entityType },
    });

    return prisma.customFieldDefinition.create({
      data: {
        name,
        label: dto.label,
        type: dto.type,
        entityType: dto.entityType,
        options: dto.options ? (dto.options as any) : undefined,
        isRequired: dto.isRequired ?? false,
        position: count,
        workspaceId,
      },
    });
  }

  async delete(userId: string, workspaceId: string, id: string) {
    const field = await prisma.customFieldDefinition.findUnique({
      where: { id },
    });

    if (!field) {
      throw new NotFoundException("Custom field not found.");
    }

    if (field.workspaceId !== workspaceId) {
      throw new ForbiddenException("Custom field does not belong to this workspace.");
    }

    await this.assertAdminMembership(userId, workspaceId);

    // Delete values first to respect FK/unique constraint (Prisma relation cascade will handle or we clean up here)
    await prisma.customFieldValue.deleteMany({
      where: { fieldId: id },
    });

    await prisma.customFieldDefinition.delete({
      where: { id },
    });

    return { success: true };
  }
}
