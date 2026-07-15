import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient, TaskStatus } from "@prisma/client";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { EventsService } from "../events/events.service";

const prisma = new PrismaClient();

@Injectable()
export class TasksService {
  constructor(private readonly eventsService: EventsService) {}

  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }
  }

  private async validateRelations(
    workspaceId: string,
    relations: {
      assigneeId?: string;
      personId?: string;
      companyId?: string;
      opportunityId?: string;
    },
  ) {
    if (relations.assigneeId) {
      const assigneeMember = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: relations.assigneeId,
            workspaceId,
          },
        },
      });

      if (!assigneeMember) {
        throw new ForbiddenException("Invalid assignee.");
      }
    }

    if (relations.personId) {
      const person = await prisma.person.findUnique({ where: { id: relations.personId } });
      if (!person || person.deletedAt || person.workspaceId !== workspaceId) {
        throw new ForbiddenException("Invalid contact relationship.");
      }
    }

    if (relations.companyId) {
      const company = await prisma.company.findUnique({ where: { id: relations.companyId } });
      if (!company || company.deletedAt || company.workspaceId !== workspaceId) {
        throw new ForbiddenException("Invalid company relationship.");
      }
    }

    if (relations.opportunityId) {
      const opportunity = await prisma.opportunity.findUnique({ where: { id: relations.opportunityId } });
      if (!opportunity || opportunity.deletedAt || opportunity.workspaceId !== workspaceId) {
        throw new ForbiddenException("Invalid deal relationship.");
      }
    }
  }

  private serializeTask(task: any) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      workspaceId: task.workspaceId,
      assigneeId: task.assigneeId,
      personId: task.personId,
      companyId: task.companyId,
      opportunityId: task.opportunityId,
      assignee: task.assignee
        ? {
            id: task.assignee.id,
            name: task.assignee.name,
            email: task.assignee.email,
          }
        : null,
      person: task.person
        ? {
            id: task.person.id,
            name: `${task.person.firstName} ${task.person.lastName}`,
          }
        : null,
      company: task.company
        ? {
            id: task.company.id,
            name: task.company.name,
          }
        : null,
      opportunity: task.opportunity
        ? {
            id: task.opportunity.id,
            name: task.opportunity.name,
          }
        : null,
    };
  }

  async listByWorkspace(userId: string, workspaceId: string) {
    await this.assertMembership(userId, workspaceId);

    const tasks = await prisma.task.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        person: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        opportunity: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });

    return tasks.map((task) => this.serializeTask(task));
  }

  async create(userId: string, dto: CreateTaskDto) {
    await this.assertMembership(userId, dto.workspaceId);
    await this.validateRelations(dto.workspaceId, dto);

    const task = await prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status ?? TaskStatus.TODO,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        completedAt: dto.status === TaskStatus.DONE ? new Date() : null,
        assigneeId: dto.assigneeId || null,
        personId: dto.personId || null,
        companyId: dto.companyId || null,
        opportunityId: dto.opportunityId || null,
        workspaceId: dto.workspaceId,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        person: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        opportunity: { select: { id: true, name: true } },
      },
    });

    this.eventsService.emitToWorkspace(dto.workspaceId, "task.created", { id: task.id });

    return this.serializeTask(task);
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });

    if (!task || task.deletedAt) {
      throw new NotFoundException("Task not found.");
    }

    await this.assertMembership(userId, task.workspaceId);
    await this.validateRelations(task.workspaceId, {
      assigneeId: dto.assigneeId === "" ? undefined : dto.assigneeId,
      personId: dto.personId === "" ? undefined : dto.personId,
      companyId: dto.companyId === "" ? undefined : dto.companyId,
      opportunityId: dto.opportunityId === "" ? undefined : dto.opportunityId,
    });

    const nextStatus = dto.status ?? task.status;

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: dto.title ?? task.title,
        description: dto.description !== undefined ? dto.description : task.description,
        status: nextStatus,
        priority: dto.priority ?? task.priority,
        dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : task.dueDate,
        completedAt:
          dto.status !== undefined
            ? dto.status === TaskStatus.DONE
              ? task.completedAt ?? new Date()
              : null
            : task.completedAt,
        assigneeId: dto.assigneeId !== undefined ? dto.assigneeId || null : task.assigneeId,
        personId: dto.personId !== undefined ? dto.personId || null : task.personId,
        companyId: dto.companyId !== undefined ? dto.companyId || null : task.companyId,
        opportunityId: dto.opportunityId !== undefined ? dto.opportunityId || null : task.opportunityId,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        person: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        opportunity: { select: { id: true, name: true } },
      },
    });

    this.eventsService.emitToWorkspace(task.workspaceId, "task.updated", { id: updated.id });

    return this.serializeTask(updated);
  }

  async delete(userId: string, taskId: string) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });

    if (!task || task.deletedAt) {
      throw new NotFoundException("Task not found.");
    }

    await this.assertMembership(userId, task.workspaceId);

    await prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });

    this.eventsService.emitToWorkspace(task.workspaceId, "task.deleted", { id: taskId });

    return { success: true };
  }
}
