// FEATURE: Global Search [Backend] - Multi-entity database search spanning tasks, opportunities, contacts, and companies
import { ForbiddenException, Injectable } from "@nestjs/common";
import { prisma } from "../../prisma";

// Handles full-text lookup requests across primary workspace data entities
@Injectable()
export class SearchService {
  // Helper to ensure the user has permission to search within the requested workspace
  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }
  }

  // Executes multi-table lookup for contacts, companies, and opportunities matching the query
  async searchWorkspace(userId: string, workspaceId: string, query: string) {
    await this.assertMembership(userId, workspaceId);

    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return { people: [], companies: [], opportunities: [] }; // Early exit if query is empty
    }

    // Query all three tables concurrently
    const [people, companies, opportunities] = await Promise.all([
      // Query contacts matching name, email, phone, or job title (case-insensitive)
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
        take: 10, // Cap results to avoid performance issues
      }),

      // Query companies matching name, domain, city, or industry (case-insensitive)
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
        take: 10, // Cap results to avoid performance issues
      }),

      // Query opportunities/deals matching name (case-insensitive)
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
        take: 10, // Cap results to avoid performance issues
      }),
    ]);

    // Format DB response records into standard frontend structures
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

