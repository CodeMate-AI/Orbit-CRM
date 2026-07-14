import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { SearchService } from "./search.service";

@Controller("search")
@UseGuards(AuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Query("q") query: string,
  ) {
    return this.searchService.searchWorkspace(user.id, workspaceId, query ?? "");
  }
}
