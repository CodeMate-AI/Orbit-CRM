import { Priority, TaskStatus } from "@prisma/client";
import { prisma } from "../prisma";

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | Date;
  assigneeId?: string;
  personId?: string;
  companyId?: string;
  opportunityId?: string;
  workspaceId: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | Date;
  assigneeId?: string | null;
  personId?: string | null;
  companyId?: string | null;
  opportunityId?: string | null;
}

export class TasksService {
  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      throw new Error("You are not a member of this workspace.");
    }

    return member;
  }

  private async assertOwnerPrivilege(userId: string, workspaceId: string) {
    const member = await this.assertMembership(userId, workspaceId);
    if (member.role !== "OWNER") {
      throw new Error("Only workspace owners can perform this action.");
    }
  }

  private async validateRelations(
    workspaceId: string,
    relations: {
      assigneeId?: string | null;
      personId?: string | null;
      companyId?: string | null;
      opportunityId?: string | null;
    }
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
        throw new Error("Invalid assignee.");
      }
    }

    if (relations.personId) {
      const person = await prisma.person.findUnique({ where: { id: relations.personId } });
      if (!person || person.deletedAt || person.workspaceId !== workspaceId) {
        throw new Error("Invalid contact relationship.");
      }
    }

    if (relations.companyId) {
      const company = await prisma.company.findUnique({ where: { id: relations.companyId } });
      if (!company || company.deletedAt || company.workspaceId !== workspaceId) {
        throw new Error("Invalid company relationship.");
      }
    }

    if (relations.opportunityId) {
      const opportunity = await prisma.opportunity.findUnique({ where: { id: relations.opportunityId } });
      if (!opportunity || opportunity.deletedAt || opportunity.workspaceId !== workspaceId) {
        throw new Error("Invalid deal relationship.");
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
        priority: dto.priority ?? Priority.MEDIUM,
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

    await prisma.activity.create({
      data: {
        type: "RECORD_CREATED",
        title: "Task created",
        body: `${task.title} was created.`,
        workspaceId: dto.workspaceId,
        authorId: userId,
        ...(task.personId ? { personId: task.personId } : {}),
        ...(task.companyId ? { companyId: task.companyId } : {}),
        ...(task.opportunityId ? { opportunityId: task.opportunityId } : {}),
      },
    });

    return this.serializeTask(task);
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });

    if (!task || task.deletedAt) {
      throw new Error("Task not found.");
    }

    await this.assertMembership(userId, task.workspaceId);
    await this.validateRelations(task.workspaceId, {
      assigneeId: dto.assigneeId === "" ? undefined : dto.assigneeId,
      personId: dto.personId === "" ? undefined : dto.personId,
      companyId: dto.companyId === "" ? undefined : dto.companyId,
      opportunityId: dto.opportunityId === "" ? undefined : dto.opportunityId,
    });

    const nextStatus = dto.status ?? task.status;
    const wasCompleted = task.status === TaskStatus.DONE;
    const willBeCompleted = nextStatus === TaskStatus.DONE;

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

    if (!wasCompleted && willBeCompleted) {
      await prisma.activity.create({
        data: {
          type: "TASK_COMPLETED",
          title: "Task completed",
          body: `${updated.title} was completed.`,
          workspaceId: task.workspaceId,
          authorId: userId,
          ...(updated.personId ? { personId: updated.personId } : {}),
          ...(updated.companyId ? { companyId: updated.companyId } : {}),
          ...(updated.opportunityId ? { opportunityId: updated.opportunityId } : {}),
        },
      });
    } else {
      await prisma.activity.create({
        data: {
          type: "RECORD_UPDATED",
          title: "Task updated",
          body: `${updated.title} was updated.`,
          workspaceId: task.workspaceId,
          authorId: userId,
          ...(updated.personId ? { personId: updated.personId } : {}),
          ...(updated.companyId ? { companyId: updated.companyId } : {}),
          ...(updated.opportunityId ? { opportunityId: updated.opportunityId } : {}),
        },
      });
    }

    return this.serializeTask(updated);
  }

  async delete(userId: string, taskId: string) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });

    if (!task || task.deletedAt) {
      throw new Error("Task not found.");
    }

    await this.assertOwnerPrivilege(userId, task.workspaceId);

    await prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }
}

export const tasksService = new TasksService();
