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

@Injectable()
export class AiService {
  private readonly openRouterBaseUrl = "https://openrouter.ai/api/v1";
  private readonly fallbackModel = "google/gemini-2.5-flash:free";

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

    // Load session history to maintain context
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
          "Use the provided tool-calling functions to search contacts (people), companies, opportunities, and tasks inside the user's workspace. " +
          "Never guess or make up data; if a search returns empty results or if you don't have the context, state that clearly.",
      },
      ...formattedMessages,
    ];

    const tools = [
      {
        type: "function",
        function: {
          name: "listWorkspacePeople",
          description: "Search or list people (contacts) in the user's active workspace by name, email, job title, or industry.",
          parameters: {
            type: "object",
            properties: {
              searchQuery: {
                type: "string",
                description: "The search query string to filter contacts.",
              },
            },
            required: ["searchQuery"],
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
                description: "The search query string to filter companies.",
              },
            },
            required: ["searchQuery"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "listWorkspaceOpportunities",
          description: "Search or list opportunities (deals) in the user's active workspace by name.",
          parameters: {
            type: "object",
            properties: {
              searchQuery: {
                type: "string",
                description: "The search query string to filter opportunities.",
              },
            },
            required: ["searchQuery"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "listWorkspaceTasks",
          description: "Search or list tasks in the user's active workspace by title or description. Note: Viewer role cannot call this.",
          parameters: {
            type: "object",
            properties: {
              searchQuery: {
                type: "string",
                description: "The search query string to filter tasks.",
              },
            },
            required: ["searchQuery"],
          },
        },
      },
    ];

    let loopCount = 0;
    const maxLoops = 3;

    while (loopCount < maxLoops) {
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
      });

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

        for (const toolCall of replyMessage.tool_calls) {
          const { name, arguments: argsString } = toolCall.function;
          let args: any = {};
          try {
            args = JSON.parse(argsString);
          } catch (e) {
            console.error("Failed to parse tool arguments:", argsString);
          }

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

        loopCount++;
      } else {
        return replyMessage.content?.trim() || "";
      }
    }

    return "AI request exceeded maximum tool execution depth.";
  }

  async listWorkspacePeople(userId: string, workspaceId: string, searchQuery: string) {
    await this.assertMembership(userId, workspaceId);
    const query = searchQuery.trim();
    if (!query) return [];

    const people = await prisma.person.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { jobTitle: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
      },
      take: 10,
    });

    return people.map((person: any) => ({
      id: person.id,
      name: `${person.firstName} ${person.lastName}`,
      email: person.email,
      jobTitle: person.jobTitle,
    }));
  }

  async listWorkspaceCompanies(userId: string, workspaceId: string, searchQuery: string) {
    await this.assertMembership(userId, workspaceId);
    const query = searchQuery.trim();
    if (!query) return [];

    const companies = await prisma.company.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { domain: { contains: query, mode: "insensitive" } },
          { city: { contains: query, mode: "insensitive" } },
          { industry: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, domain: true },
      take: 10,
    });

    return companies;
  }

  async listWorkspaceOpportunities(userId: string, workspaceId: string, searchQuery: string) {
    await this.assertMembership(userId, workspaceId);
    const query = searchQuery.trim();
    if (!query) return [];

    const opportunities = await prisma.opportunity.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        name: { contains: query, mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
        amount: true,
        stage: { select: { name: true } },
      },
      take: 10,
    });

    return opportunities.map((opportunity: any) => ({
      id: opportunity.id,
      name: opportunity.name,
      amount: opportunity.amount ? Number(opportunity.amount) : null,
      stageName: opportunity.stage.name,
    }));
  }

  async listWorkspaceTasks(userId: string, workspaceId: string, searchQuery: string) {
    const member = await this.assertMembership(userId, workspaceId);
    if (member.role === "VIEWER") {
      throw new ForbiddenException("Viewer role cannot access task tools.");
    }

    const query = searchQuery.trim();
    if (!query) return [];

    const tasks = await prisma.task.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
      },
      take: 10,
    });

    return tasks;
  }
}
