import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { PeopleService } from "./people.service";
import { CreatePersonDto } from "./dto/create-person.dto";
import { UpdatePersonDto } from "./dto/update-person.dto";

@Controller("people")
@UseGuards(AuthGuard)
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Get()
  list(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string) {
    return this.peopleService.listByWorkspace(user.id, workspaceId);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreatePersonDto) {
    return this.peopleService.create(user.id, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: UpdatePersonDto) {
    return this.peopleService.update(user.id, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: any, @Param("id") id: string) {
    return this.peopleService.delete(user.id, id);
  }
}
