import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { SearchService } from "./search.service";

// Controller for handling global workspace search queries
@Controller("search")
@UseGuards(AuthGuard) // Protect search endpoints behind authorization guards
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // Executes search across people, companies, and opportunities in a workspace
  @Get()
  async search(
    @CurrentUser() user: any, // Retrieves currently logged-in user from request
    @Query("workspaceId") workspaceId: string, // Specific workspace context query parameter
    @Query("q") query: string, // Search query term inputted by user
  ) {
    return this.searchService.searchWorkspace(user.id, workspaceId, query ?? "");
  }
}

