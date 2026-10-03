import { prisma } from "../prisma";

export class SearchService {
  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) {
      throw new Error("You are not a member of this workspace.");
    }
  }

  async searchWorkspace(userId: string, workspaceId: string, query: string) {
    await this.assertMembership(userId, workspaceId);

    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return { people: [], companies: [], opportunities: [] };
    }

    const [people, companies, opportunities] = await Promise.all([
      prisma.person.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          OR: [
            { firstName: { contains: cleanQuery, mode: "insensitive" } },
            { lastName: { contains: cleanQuery, mode: "insensitive" } },
            { email: { contains: cleanQuery, mode: "insensitive" } },
            { phone: { contains: cleanQuery, mode: "insensitive" } },
            { jobTitle: { contains: cleanQuery, mode: "insensitive" } },
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
      }),

      prisma.company.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          OR: [
            { name: { contains: cleanQuery, mode: "insensitive" } },
            { domain: { contains: cleanQuery, mode: "insensitive" } },
            { city: { contains: cleanQuery, mode: "insensitive" } },
            { industry: { contains: cleanQuery, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          domain: true,
        },
        take: 10,
      }),

      prisma.opportunity.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          name: { contains: cleanQuery, mode: "insensitive" },
        },
        select: {
          id: true,
          name: true,
          amount: true,
          stage: {
            select: {
              name: true,
            },
          },
        },
        take: 10,
      }),
    ]);

    return {
      people: people.map((p) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        email: p.email,
        jobTitle: p.jobTitle,
      })),
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        domain: c.domain,
      })),
      opportunities: opportunities.map((o) => ({
        id: o.id,
        name: o.name,
        amount: o.amount ? Number(o.amount) : null,
        stageName: o.stage.name,
      })),
    };
  }
}

export const searchService = new SearchService();
