import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { CreateNoteDto } from "./dto/create-note.dto";
import { UpdateNoteDto } from "./dto/update-note.dto";

const prisma = new PrismaClient();

@Injectable()
export class NotesService {
  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }
  }

  async listForEntity(
    userId: string,
    workspaceId: string,
    entityType: "person" | "company" | "opportunity",
    entityId: string,
  ) {
    await this.assertMembership(userId, workspaceId);

    const whereClause: any = {
      workspaceId,
      deletedAt: null,
    };

    if (entityType === "person") {
      whereClause.personId = entityId;
    } else if (entityType === "company") {
      whereClause.companyId = entityId;
    } else if (entityType === "opportunity") {
      whereClause.opportunityId = entityId;
    }

    return prisma.note.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(userId: string, dto: CreateNoteDto) {
    await this.assertMembership(userId, dto.workspaceId);

    if (!dto.personId && !dto.companyId && !dto.opportunityId) {
      throw new ForbiddenException("A note must be linked to at least one Person, Company, or Opportunity.");
    }

    return prisma.note.create({
      data: {
        title: dto.title || null,
        body: dto.body,
        workspaceId: dto.workspaceId,
        authorId: userId,
        personId: dto.personId || null,
        companyId: dto.companyId || null,
        opportunityId: dto.opportunityId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async update(userId: string, noteId: string, dto: UpdateNoteDto) {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note || note.deletedAt) {
      throw new NotFoundException("Note not found.");
    }

    await this.assertMembership(userId, note.workspaceId);

    return prisma.note.update({
      where: { id: noteId },
      data: {
        title: dto.title !== undefined ? dto.title || null : note.title,
        body: dto.body !== undefined ? dto.body : note.body,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async delete(userId: string, noteId: string) {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException("Note not found.");
    }

    await this.assertMembership(userId, note.workspaceId);

    await prisma.note.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }
}
