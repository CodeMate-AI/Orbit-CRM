import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

let prisma: any = new PrismaClient();

export function setAiPrisma(client: any) {
  prisma = client;
}

export type ChatRole = "user" | "assistant";

export interface GenerateChatStreamOptions {
  userId: string;
  workspaceId: string;
  sessionId: string;
  message: string;
}

type WorkspaceSummaryCount = {
  totalCount: number;
};

type WorkspaceSummaryBreakdownRow = {
  leadSource?: string | null;
  stageName?: string | null;
  status?: string | null;
  count: number;
  totalValue?: number;
};

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;
const ACTIVITY_TYPES = [
  "NOTE",
  "EMAIL",
  "CALL",
  "MEETING",
  "TASK_COMPLETED",
  "DEAL_STAGE_CHANGED",
  "RECORD_CREATED",
  "RECORD_UPDATED",
] as const;

function formatCurrencyInr(value: unknown): string {
  const numericValue = toNumber(value);
  if (numericValue === null) {
    return "₹0";
  }

  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(numericValue)}`;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === "object" && value !== null && "toNumber" in value && typeof (value as any).toNumber === "function") {
    const parsed = (value as any).toNumber();
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIsoString(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value as any);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function stringifyBody(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function previewBody(value: unknown, length = 300): string {
  const body = stringifyBody(value);
  return body.length > length ? body.slice(0, length) : body;
}

function buildFullName(firstName?: string | null, lastName?: string | null): string | null {
  const parts = [firstName, lastName].filter((part): part is string => Boolean(part && part.trim()));
  return parts.length ? parts.join(" ") : null;
}

function normalizeType(type?: string | null): string | null {
  if (!type) {
    return null;
  }

  const trimmed = type.trim().toUpperCase();
  return (ACTIVITY_TYPES as readonly string[]).includes(trimmed) ? trimmed : null;
}

@Injectable()
export class AiService {
  private readonly openRouterBaseUrl = "https://openrouter.ai/api/v1";
  private readonly fallbackModel = "openrouter/free";

  async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }

    return member;
  }

  async assertChatAccess(userId: string, workspaceId: string, sessionId: string) {
    await this.assertMembership(userId, workspaceId);

    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, workspaceId, userId },
    });

    if (!session) {
      throw new NotFoundException("Chat session not found.");
    }

    return session;
  }

  deriveSessionTitle(message: string) {
    const clean = message.trim().replace(/\s+/g, " ");
    if (!clean) {
      return "New Chat";
    }

    return clean.length > 48 ? `${clean.slice(0, 45).trimEnd()}…` : clean;
  }

  async createSession(userId: string, workspaceId: string, title = "New Chat") {
    await this.assertMembership(userId, workspaceId);

    return prisma.chatSession.create({
      data: {
        title,
        userId,
        workspaceId,
      },
    });
  }

  async listSessions(userId: string, workspaceId: string) {
    await this.assertMembership(userId, workspaceId);

    return prisma.chatSession.findMany({
      where: { userId, workspaceId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  async getSessionDetails(userId: string, workspaceId: string, sessionId: string) {
    await this.assertChatAccess(userId, workspaceId, sessionId);

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!session) {
      throw new NotFoundException("Chat session not found.");
    }

    return session;
  }

  async deleteSession(userId: string, workspaceId: string, sessionId: string) {
    await this.assertChatAccess(userId, workspaceId, sessionId);

    await prisma.chatSession.delete({ where: { id: sessionId } });

    return { success: true };
  }

  async postMessage(userId: string, workspaceId: string, sessionId: string, message: string) {
    const session = await this.assertChatAccess(userId, workspaceId, sessionId);

    const userMessage = await prisma.chatMessage.create({
      data: {
        role: "user",
        content: message,
        sessionId,
      },
    });

    if (session.title === "New Chat") {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { title: this.deriveSessionTitle(message) },
      });
    }

    const assistantContent = await this.generateAssistantReply({
      userId,
      workspaceId,
      sessionId,
      message,
    });

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        role: "assistant",
        content: assistantContent,
        sessionId,
      },
    });

    return {
      userMessage,
      assistantMessage,
    };
  }

  async generateAssistantReply(options: GenerateChatStreamOptions) {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey) {
      return "OpenRouter is not configured in the backend environment.";
    }

    const chatMessages = await prisma.chatMessage.findMany({
      where: { sessionId: options.sessionId },
      orderBy: { createdAt: "asc" },
    });

    const formattedMessages = chatMessages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    const apiMessages: any[] = [
      {
        role: "system",
        content:
          "You are Orbit CRM's AI assistant. Answer only from the user's workspace context, summarize records accurately, and draft concise follow-up templates when asked. " +
          "Use the provided tool-calling functions to search contacts (people), companies, opportunities, tasks, notes, and activities inside the user's workspace. " +
          "If a search in one category (e.g. notes) returns empty, proactively check other relevant categories (e.g. companies, people, or tasks) before giving a final answer. " +
          "Never guess or make up data; if a search returns empty results or if you don't have the context, state that clearly. " +
          "Always format currency and monetary values in Indian Rupees (₹). Never output dollar signs ($) or USD. " +
          "Respond in clean, neutral plain text. Do not output raw markdown symbols such as hashtags (#, ##), asterisks (**), or hyphen bullet prefixes (-). Use clean line breaks and numbered lists if listing items.",
      },
      ...formattedMessages,
    ];

    const tools = [
      {
        type: "function",
        function: {
          name: "listWorkspacePeople",
          description: "Search or list people (contacts) in the user's active workspace by name, email, job title, phone, city, company, lead source, or industry.",
          parameters: {
            type: "object",
            properties: {
              searchQuery: {
                type: "string",
                description: "Optional search query string to filter contacts. Leave empty to list recent contacts.",
              },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "listWorkspaceCompanies",
          description: "Search or list companies in the user's active workspace by name, domain, city, or industry.",
          parameters: {
            type: "object",
            properties: {
              searchQuery: {
                type: "string",
                description: "Optional search query string to filter companies. Leave empty to list recent companies.",
              },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "listWorkspaceOpportunities",
          description: "Search or list opportunities (deals) in the user's active workspace by name or related company.",
          parameters: {
            type: "object",
            properties: {
              searchQuery: {
                type: "string",
                description: "Optional search query string to filter opportunities. Leave empty to list recent deals.",
              },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "listWorkspaceTasks",
          description: "Search or list tasks in the user's active workspace by title, description, assignee, person, or company. Note: Viewer role cannot call this.",
          parameters: {
            type: "object",
            properties: {
              searchQuery: {
                type: "string",
                description: "Optional search query string to filter tasks. Leave empty to list recent tasks.",
              },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getWorkspaceSummary",
          description: "Return a high-level overview of the workspace with record counts and key breakdowns.",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      },
      {
        type: "function",
        function: {
          name: "listWorkspaceNotes",
          description: "Search or list notes in the user's active workspace by title or body text. Leave search empty to list recent notes.",
          parameters: {
            type: "object",
            properties: {
              searchQuery: {
                type: "string",
                description: "Optional search query string to filter notes.",
              },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "listWorkspaceActivities",
          description: "Search or list activities in the user's active workspace by title or body text, optionally filtered by activity type. Leave search empty to list recent activities.",
          parameters: {
            type: "object",
            properties: {
              searchQuery: {
                type: "string",
                description: "Optional search query string to filter activities.",
              },
              type: {
                type: "string",
                description: "Optional activity type filter such as NOTE, EMAIL, CALL, or MEETING.",
              },
            },
          },
        },
      },
    ];

    let loopCount = 0;
    const maxLoops = 5;
    const calledTools = new Set<string>();

    while (loopCount < maxLoops) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20-second timeout

      try {
        const response = await fetch(`${this.openRouterBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
            "X-Title": process.env.OPENROUTER_APP_TITLE || "Orbit CRM",
          },
          body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL || this.fallbackModel,
            messages: apiMessages,
            tools,
            tool_choice: "auto",
            stream: false,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const body = await response.text();
          return `OpenRouter request failed: ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`;
        }

        const data = (await response.json()) as any;
        const choice = data?.choices?.[0];
        const replyMessage = choice?.message;

        if (!replyMessage) {
          return "I couldn't generate a response.";
        }

        if (replyMessage.tool_calls && replyMessage.tool_calls.length > 0) {
          apiMessages.push(replyMessage);

          let hasNewCall = false;

          for (const toolCall of replyMessage.tool_calls) {
            const { name, arguments: argsString } = toolCall.function;
            let args: any = {};
            try {
              args = JSON.parse(argsString);
            } catch (error) {
              console.error("Failed to parse tool arguments:", argsString);
            }

            const callKey = `${name}:${JSON.stringify(args)}`;
            if (calledTools.has(callKey)) {
              console.warn(`Model repeated tool call: ${callKey}`);
              continue;
            }
            calledTools.add(callKey);
            hasNewCall = true;

            let toolResult: any;
            try {
              if (name === "listWorkspacePeople") {
                toolResult = await this.listWorkspacePeople(options.userId, options.workspaceId, args.searchQuery || "");
              } else if (name === "listWorkspaceCompanies") {
                toolResult = await this.listWorkspaceCompanies(options.userId, options.workspaceId, args.searchQuery || "");
              } else if (name === "listWorkspaceOpportunities") {
                toolResult = await this.listWorkspaceOpportunities(options.userId, options.workspaceId, args.searchQuery || "");
              } else if (name === "listWorkspaceTasks") {
                toolResult = await this.listWorkspaceTasks(options.userId, options.workspaceId, args.searchQuery || "");
              } else if (name === "getWorkspaceSummary") {
                toolResult = await this.getWorkspaceSummary(options.userId, options.workspaceId);
              } else if (name === "listWorkspaceNotes") {
                toolResult = await this.listWorkspaceNotes(options.userId, options.workspaceId, args.searchQuery || "");
              } else if (name === "listWorkspaceActivities") {
                toolResult = await this.listWorkspaceActivities(options.userId, options.workspaceId, args.searchQuery || "", args.type || "");
              } else {
                toolResult = { error: `Tool ${name} not found.` };
              }
            } catch (err: any) {
              toolResult = { error: err.message || "Failed to execute tool." };
            }

            apiMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name,
              content: JSON.stringify(toolResult),
            });
          }

          if (!hasNewCall) {
            return replyMessage.content?.trim() || "I couldn't find any relevant records in your workspace.";
          }

          loopCount++;
        } else {
          return replyMessage.content?.trim() || "I couldn't generate a response.";
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          return "The AI assistant request timed out. Please try again.";
        }
        throw err;
      }
    }

    return "AI request exceeded maximum tool execution depth.";
  }

  async listWorkspacePeople(userId: string, workspaceId: string, searchQuery: string) {
    await this.assertMembership(userId, workspaceId);

    const query = searchQuery.trim();
    const where: any = {
      workspaceId,
      deletedAt: null,
    };

    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { jobTitle: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
        { leadSource: { contains: query, mode: "insensitive" } },
        { industry: { contains: query, mode: "insensitive" } },
        { company: { is: { name: { contains: query, mode: "insensitive" } } } },
      ];
    }

    const people = await prisma.person.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        jobTitle: true,
        leadSource: true,
        industry: true,
        city: true,
        company: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: query ? 10 : 20,
    });

    return people.map((person: any) => ({
      id: person.id,
      name: buildFullName(person.firstName, person.lastName) || "",
      email: person.email,
      phone: person.phone,
      companyName: person.company?.name || null,
      leadSource: person.leadSource,
      industry: person.industry,
      city: person.city,
      jobTitle: person.jobTitle,
    }));
  }

  async listWorkspaceCompanies(userId: string, workspaceId: string, searchQuery: string) {
    await this.assertMembership(userId, workspaceId);

    const query = searchQuery.trim();
    const where: any = {
      workspaceId,
      deletedAt: null,
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { domain: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
        { industry: { contains: query, mode: "insensitive" } },
      ];
    }

    const companies = await prisma.company.findMany({
      where,
      select: {
        id: true,
        name: true,
        domain: true,
        industry: true,
        city: true,
        employeeCount: true,
        annualRevenue: true,
      },
      orderBy: { createdAt: "desc" },
      take: query ? 10 : 20,
    });

    return companies.map((company: any) => ({
      id: company.id,
      name: company.name,
      domain: company.domain,
      industry: company.industry,
      city: company.city,
      employeeCount: company.employeeCount,
      annualRevenue: toNumber(company.annualRevenue),
    }));
  }

  async listWorkspaceOpportunities(userId: string, workspaceId: string, searchQuery: string) {
    await this.assertMembership(userId, workspaceId);

    const query = searchQuery.trim();
    const where: any = {
      workspaceId,
      deletedAt: null,
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { company: { is: { name: { contains: query, mode: "insensitive" } } } },
      ];
    }

    const opportunities = await prisma.opportunity.findMany({
      where,
      select: {
        id: true,
        name: true,
        amount: true,
        closeDate: true,
        probability: true,
        source: true,
        stage: { select: { name: true } },
        company: {
          select: {
            name: true,
          },
        },
        contacts: {
          select: {
            person: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: query ? 10 : 20,
    });

    return opportunities.map((opportunity: any) => ({
      id: opportunity.id,
      name: opportunity.name,
      amount: toNumber(opportunity.amount),
      closeDate: toIsoString(opportunity.closeDate),
      probability: opportunity.probability,
      source: opportunity.source,
      stageName: opportunity.stage?.name || null,
      companyName: opportunity.company?.name || null,
      contacts: (opportunity.contacts || []).map((contact: any) => ({
        name: buildFullName(contact.person?.firstName, contact.person?.lastName) || "",
        email: contact.person?.email || null,
      })),
    }));
  }

  async listWorkspaceTasks(userId: string, workspaceId: string, searchQuery: string) {
    const member = await this.assertMembership(userId, workspaceId);
    if (member.role === "VIEWER") {
      throw new ForbiddenException("Viewer role cannot access task tools.");
    }

    const query = searchQuery.trim();
    const where: any = {
      workspaceId,
      deletedAt: null,
    };

    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { assignee: { is: { name: { contains: query, mode: "insensitive" } } } },
        { person: { is: { firstName: { contains: query, mode: "insensitive" } } } },
        { person: { is: { lastName: { contains: query, mode: "insensitive" } } } },
        { company: { is: { name: { contains: query, mode: "insensitive" } } } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        description: true,
        assignee: {
          select: {
            name: true,
          },
        },
        person: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: query ? 10 : 20,
    });

    return tasks.map((task: any) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: toIsoString(task.dueDate),
      description: task.description,
      assigneeName: task.assignee?.name || null,
      personName: buildFullName(task.person?.firstName, task.person?.lastName),
      companyName: task.company?.name || null,
    }));
  }

  async getWorkspaceSummary(userId: string, workspaceId: string) {
    await this.assertMembership(userId, workspaceId);

    const peopleWhere = { workspaceId, deletedAt: null };
    const companiesWhere = { workspaceId, deletedAt: null };
    const opportunitiesWhere = { workspaceId, deletedAt: null };
    const tasksWhere = { workspaceId, deletedAt: null };

    const [peopleTotal, peopleRows, companiesTotal, opportunitiesTotal, opportunityRows, tasksTotal, taskRows] = await Promise.all([
      prisma.person.count({ where: peopleWhere }),
      prisma.person.findMany({
        where: peopleWhere,
        select: { leadSource: true },
      }),
      prisma.company.count({ where: companiesWhere }),
      prisma.opportunity.count({ where: opportunitiesWhere }),
      prisma.opportunity.findMany({
        where: opportunitiesWhere,
        select: {
          amount: true,
          stage: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.task.count({ where: tasksWhere }),
      prisma.task.findMany({
        where: tasksWhere,
        select: { status: true },
      }),
    ]);

    const peopleByLeadSourceMap = new Map<string, number>();
    for (const row of peopleRows as Array<{ leadSource?: string | null }>) {
      const key = row.leadSource?.trim() || "Unknown";
      peopleByLeadSourceMap.set(key, (peopleByLeadSourceMap.get(key) || 0) + 1);
    }

    const opportunitiesByStageMap = new Map<string, { count: number; totalValue: number }>();
    let totalPipelineValue = 0;
    for (const row of opportunityRows as Array<{ amount?: unknown; stage?: { name?: string | null } }>) {
      const stageName = row.stage?.name?.trim() || "Unknown";
      const amount = toNumber(row.amount) || 0;
      totalPipelineValue += amount;
      const current = opportunitiesByStageMap.get(stageName) || { count: 0, totalValue: 0 };
      current.count += 1;
      current.totalValue += amount;
      opportunitiesByStageMap.set(stageName, current);
    }

    const taskStatusBreakdown = {
      TODO: 0,
      IN_PROGRESS: 0,
      DONE: 0,
    } as Record<(typeof TASK_STATUSES)[number], number>;

    for (const row of taskRows as Array<{ status?: string | null }>) {
      const status = row.status as (typeof TASK_STATUSES)[number] | null | undefined;
      if (status && status in taskStatusBreakdown) {
        taskStatusBreakdown[status] += 1;
      }
    }

    const peopleByLeadSource = Array.from(peopleByLeadSourceMap.entries())
      .map(([leadSource, count]) => ({ leadSource, count }))
      .sort((a, b) => b.count - a.count || a.leadSource.localeCompare(b.leadSource));

    const opportunitiesByStage = Array.from(opportunitiesByStageMap.entries())
      .map(([stage, value]) => ({ stage, count: value.count, totalValue: value.totalValue }))
      .sort((a, b) => b.count - a.count || a.stage.localeCompare(b.stage));

    return {
      people: {
        totalCount: peopleTotal,
        byLeadSource: peopleByLeadSource,
      },
      companies: {
        totalCount: companiesTotal,
      },
      opportunities: {
        totalCount: opportunitiesTotal,
        totalPipelineValue,
        totalPipelineValueFormatted: formatCurrencyInr(totalPipelineValue),
        byStage: opportunitiesByStage.map((stage) => ({
          ...stage,
          totalValueFormatted: formatCurrencyInr(stage.totalValue),
        })),
      },
      tasks: {
        totalCount: tasksTotal,
        byStatus: taskStatusBreakdown,
      },
    };
  }

  async listWorkspaceNotes(userId: string, workspaceId: string, searchQuery: string) {
    await this.assertMembership(userId, workspaceId);

    const query = searchQuery.trim();
    const notes = await prisma.note.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        person: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            name: true,
          },
        },
        opportunity: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: query ? 10 : 20,
    });

    const filtered = query
      ? notes.filter((note: any) => {
          const searchTarget = [note.title, stringifyBody(note.body)].filter(Boolean).join(" \n ").toLowerCase();
          return searchTarget.includes(query.toLowerCase());
        })
      : notes;

    return filtered.slice(0, query ? 10 : 20).map((note: any) => ({
      id: note.id,
      title: note.title,
      bodyPreview: previewBody(note.body),
      linkedEntityName:
        note.person
          ? buildFullName(note.person.firstName, note.person.lastName)
          : note.company?.name || note.opportunity?.name || null,
      linkedEntityType: note.person ? "person" : note.company ? "company" : note.opportunity ? "opportunity" : null,
      createdAt: toIsoString(note.createdAt),
    }));
  }

  async listWorkspaceActivities(userId: string, workspaceId: string, searchQuery: string, type?: string) {
    await this.assertMembership(userId, workspaceId);

    const query = searchQuery.trim();
    const normalizedType = normalizeType(type || null);

    const activities = await prisma.activity.findMany({
      where: {
        workspaceId,
        ...(normalizedType ? { type: normalizedType } : {}),
      },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        occurredAt: true,
        person: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            name: true,
          },
        },
        opportunity: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { occurredAt: "desc" },
      take: query ? 10 : 20,
    });

    const filtered = query
      ? activities.filter((activity: any) => {
          const searchTarget = [activity.title, stringifyBody(activity.body)].filter(Boolean).join(" \n ").toLowerCase();
          return searchTarget.includes(query.toLowerCase());
        })
      : activities;

    return filtered.slice(0, query ? 10 : 20).map((activity: any) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      body: activity.body,
      occurredAt: toIsoString(activity.occurredAt),
      linkedEntityName:
        activity.person
          ? buildFullName(activity.person.firstName, activity.person.lastName)
          : activity.company?.name || activity.opportunity?.name || null,
      linkedEntityType: activity.person ? "person" : activity.company ? "company" : activity.opportunity ? "opportunity" : null,
    }));
  }
}
