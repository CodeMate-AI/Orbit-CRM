import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { CreatePersonDto } from "./dto/create-person.dto";

const prisma = new PrismaClient();

@Injectable()
export class PeopleService {
  /** Verify user is a member of the workspace */
  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }
  }

  async listByWorkspace(userId: string, workspaceId: string) {
    await this.assertMembership(userId, workspaceId);

    const people = await prisma.person.findMany({
      where: { workspaceId, deletedAt: null },
      include: { company: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return {
      total: people.length,
      data: people.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        name: `${p.firstName} ${p.lastName}`,
        email: p.email,
        phone: p.phone,
        jobTitle: p.jobTitle,
        company: p.company?.name ?? null,
        companyId: p.companyId,
        createdAt: p.createdAt,
      })),
    };
  }

  async create(userId: string, dto: CreatePersonDto) {
    await this.assertMembership(userId, dto.workspaceId);

    const person = await prisma.person.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        jobTitle: dto.jobTitle,
        workspaceId: dto.workspaceId,
        companyId: dto.companyId,
      },
    });

    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      name: `${person.firstName} ${person.lastName}`,
      email: person.email,
      phone: person.phone,
      jobTitle: person.jobTitle,
      companyId: person.companyId,
      createdAt: person.createdAt,
    };
  }

  async delete(userId: string, personId: string) {
    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person) throw new NotFoundException("Person not found.");
    await this.assertMembership(userId, person.workspaceId);

    await prisma.person.update({
      where: { id: personId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }
}
