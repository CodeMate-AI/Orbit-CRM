import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { EntityType, PrismaClient, ViewType } from "@prisma/client";

const prisma = new PrismaClient();

type ViewFilters = Record<string, unknown>;
type ViewSorts = { column: string; direction: "asc" | "desc" } | null;

export type CreateViewDto = {
  name: string;
  entityType: EntityType;
  type?: ViewType;
  filters?: ViewFilters;
  sorts?: ViewSorts;
  workspaceId: string;
};

export type UpdateViewDto = Partial<Omit<CreateViewDto, "workspaceId" | "entityType">>;

@Injectable()
export class ViewsService {
  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }
  }

  private serialize(view: {
    id: string;
    name: string;
    entityType: EntityType;
    type: ViewType;
    filters: unknown;
    sorts: unknown;
    isDefault: boolean;
    position: number;
    createdAt: Date;
    workspaceId: string;
    createdById: string | null;
  }) {
    return {
      id: view.id,
      name: view.name,
      entityType: view.entityType,
      type: view.type,
      filters: view.filters ?? null,
      sorts: view.sorts ?? null,
      isDefault: view.isDefault,
      position: view.position,
      createdAt: view.createdAt,
      workspaceId: view.workspaceId,
      createdById: view.createdById,
    };
  }

  async list(userId: string, workspaceId: string, entityType: EntityType) {
    await this.assertMembership(userId, workspaceId);

    const views = await prisma.view.findMany({
      where: { workspaceId, entityType },
      orderBy: [{ isDefault: "desc" }, { position: "asc" }, { createdAt: "asc" }],
    });

    return views.map((v) => this.serialize(v));
  }

  async create(userId: string, dto: CreateViewDto) {
    await this.assertMembership(userId, dto.workspaceId);

    const count = await prisma.view.count({
      where: { workspaceId: dto.workspaceId, entityType: dto.entityType },
    });

    const view = await prisma.view.create({
      data: {
        name: dto.name,
        entityType: dto.entityType,
        type: dto.type ?? "TABLE",
        filters: (dto.filters as any) ?? undefined,
        sorts: (dto.sorts as any) ?? undefined,
        isDefault: false,
        position: count,
        workspaceId: dto.workspaceId,
        createdById: userId,
      },
    });

    return this.serialize(view);
  }

  async update(userId: string, workspaceId: string, viewId: string, dto: UpdateViewDto) {
    const view = await prisma.view.findUnique({ where: { id: viewId } });
    if (!view || view.workspaceId !== workspaceId) {
      throw new NotFoundException("View not found.");
    }
    await this.assertMembership(userId, workspaceId);

    const updated = await prisma.view.update({
      where: { id: viewId },
      data: {
        name: dto.name ?? view.name,
        type: dto.type ?? view.type,
        filters: dto.filters !== undefined ? (dto.filters as any) : view.filters,
        sorts: dto.sorts !== undefined ? (dto.sorts as any) : view.sorts,
      },
    });

    return this.serialize(updated);
  }

  async delete(userId: string, workspaceId: string, viewId: string) {
    const view = await prisma.view.findUnique({ where: { id: viewId } });
    if (!view || view.workspaceId !== workspaceId) {
      throw new NotFoundException("View not found.");
    }
    await this.assertMembership(userId, workspaceId);

    await prisma.view.delete({ where: { id: viewId } });

    return { success: true };
  }

  async setDefault(userId: string, workspaceId: string, viewId: string) {
    const view = await prisma.view.findUnique({ where: { id: viewId } });
    if (!view || view.workspaceId !== workspaceId) {
      throw new NotFoundException("View not found.");
    }
    await this.assertMembership(userId, workspaceId);

    // Clear existing default for this entityType
    await prisma.view.updateMany({
      where: { workspaceId, entityType: view.entityType, isDefault: true },
      data: { isDefault: false },
    });

    const updated = await prisma.view.update({
      where: { id: viewId },
      data: { isDefault: true },
    });

    return this.serialize(updated);
  }
}
