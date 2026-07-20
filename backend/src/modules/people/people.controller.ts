import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { PeopleService } from "./people.service";
import { CreatePersonDto } from "./dto/create-person.dto";
import { DryRunImportDto } from "./dto/dry-run-import.dto";
import { StartImportDto } from "./dto/start-import.dto";
import { UpdatePersonDto } from "./dto/update-person.dto";

@Controller("people")
@UseGuards(AuthGuard)
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Get()
  list(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string) {
    return this.peopleService.listByWorkspace(user.id, workspaceId);
  }

  @Get("export")
  async exportCsv(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Res() res: Response,
  ) {
    const csv = await this.peopleService.exportCsv(user.id, workspaceId);
    const filename = `contacts-${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get(":id")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.peopleService.findOne(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreatePersonDto) {
    return this.peopleService.create(user.id, dto);
  }

  @Post("import/dry-run")
  async dryRun(@CurrentUser() user: any, @Body() dto: DryRunImportDto) {
    return this.peopleService.dryRun(user.id, dto);
  }

  @Post("import")
  async startImport(@CurrentUser() user: any, @Body() dto: StartImportDto) {
    return this.peopleService.startImport(user.id, dto);
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
