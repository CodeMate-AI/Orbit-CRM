import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient, EntityType } from "@prisma/client";
import { CreateCustomFieldDto } from "./dto/create-custom-field.dto";

let prisma = new PrismaClient();

export function setCustomFieldsPrisma(client: PrismaClient) {
  prisma = client;
}

type EntityRelation = "person" | "company" | "opportunity";

type FieldValueInput = {
  fieldId: string;
  entityType: EntityType;
  entityId: string;
  value: unknown;
};

@Injectable()
export class CustomFieldsService {
  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }
  }

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

  private relationKey(entityType: EntityType): EntityRelation {
    if (entityType === "PERSON") return "person";
    if (entityType === "COMPANY") return "company";
    return "opportunity";
  }

  private relationWhere(entityType: EntityType, entityId: string) {
    const key = this.relationKey(entityType);
    return { [key === "person" ? "personId" : key === "company" ? "companyId" : "opportunityId"]: entityId } as const;
  }

  private serializeValue(fieldValue: {
    id: string;
    value: unknown;
    fieldId: string;
    workspaceId: string;
    personId: string | null;
    companyId: string | null;
    opportunityId: string | null;
    field: {
      id: string;
      name: string;
      label: string;
      type: string;
      entityType: EntityType;
      options: unknown;
      isRequired: boolean;
      position: number;
      workspaceId: string;
    };
  }) {
    return {
      id: fieldValue.id,
      fieldId: fieldValue.fieldId,
      entityType: fieldValue.field.entityType,
      value: fieldValue.value,
      field: {
        id: fieldValue.field.id,
        name: fieldValue.field.name,
        label: fieldValue.field.label,
        type: fieldValue.field.type,
        entityType: fieldValue.field.entityType,
        options: fieldValue.field.options,
        isRequired: fieldValue.field.isRequired,
        position: fieldValue.field.position,
      },
    };
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

    const name = dto.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_+|_+$)/g, "");

    if (!name) {
      throw new BadRequestException("Invalid label. Programmatic field name cannot be empty.");
    }

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

  async listValues(userId: string, workspaceId: string, entityType: EntityType, entityId: string) {
    await this.assertMembership(userId, workspaceId);

    const entity =
      entityType === "PERSON"
        ? await prisma.person.findUnique({ where: { id: entityId } })
        : entityType === "COMPANY"
          ? await prisma.company.findUnique({ where: { id: entityId } })
          : await prisma.opportunity.findUnique({ where: { id: entityId } });

    if (!entity || (entity as any).deletedAt) {
      throw new NotFoundException("Record not found.");
    }

    if ((entity as any).workspaceId !== workspaceId) {
      throw new ForbiddenException("Invalid record.");
    }

    const definitions = await prisma.customFieldDefinition.findMany({
      where: { workspaceId, entityType },
      orderBy: { position: "asc" },
    });

    const values = await prisma.customFieldValue.findMany({
      where: {
        workspaceId,
        ...this.relationWhere(entityType, entityId),
      },
      include: { field: true },
      orderBy: [{ field: { position: "asc" } }, { fieldId: "asc" }],
    });

    const valuesByFieldId = new Map(values.map((value) => [value.fieldId, value]));

    return definitions.map((definition) => {
      const fieldValue = valuesByFieldId.get(definition.id);
      return {
        id: definition.id,
        fieldId: definition.id,
        name: definition.name,
        label: definition.label,
        type: definition.type,
        entityType: definition.entityType,
        options: definition.options,
        isRequired: definition.isRequired,
        position: definition.position,
        value: fieldValue?.value ?? null,
        valueId: fieldValue?.id ?? null,
      };
    });
  }

  async upsertValue(userId: string, workspaceId: string, dto: FieldValueInput) {
    await this.assertMembership(userId, workspaceId);

    const field = await prisma.customFieldDefinition.findUnique({
      where: { id: dto.fieldId },
    });

    if (!field || field.workspaceId !== workspaceId) {
      throw new NotFoundException("Custom field not found.");
    }

    if (field.entityType !== dto.entityType) {
      throw new BadRequestException("Custom field does not belong to the provided entity type.");
    }

    const entity =
      dto.entityType === "PERSON"
        ? await prisma.person.findUnique({ where: { id: dto.entityId } })
        : dto.entityType === "COMPANY"
          ? await prisma.company.findUnique({ where: { id: dto.entityId } })
          : await prisma.opportunity.findUnique({ where: { id: dto.entityId } });

    if (!entity || (entity as any).deletedAt) {
      throw new NotFoundException("Record not found.");
    }

    if ((entity as any).workspaceId !== workspaceId) {
      throw new ForbiddenException("Invalid record.");
    }

    const relation = this.relationWhere(dto.entityType, dto.entityId);

    const value = await prisma.customFieldValue.upsert({
      where:
        dto.entityType === "PERSON"
          ? { fieldId_personId: { fieldId: dto.fieldId, personId: dto.entityId } }
          : dto.entityType === "COMPANY"
            ? { fieldId_companyId: { fieldId: dto.fieldId, companyId: dto.entityId } }
            : { fieldId_opportunityId: { fieldId: dto.fieldId, opportunityId: dto.entityId } },
      update: {
        value: dto.value as any,
      },
      create: {
        workspaceId,
        fieldId: dto.fieldId,
        value: dto.value as any,
        ...relation,
      },
      include: { field: true },
    });

    return this.serializeValue(value);
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

    await prisma.customFieldValue.deleteMany({
      where: { fieldId: id },
    });

    await prisma.customFieldDefinition.delete({
      where: { id },
    });

    return { success: true };
  }
}
