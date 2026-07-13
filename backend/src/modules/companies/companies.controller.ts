import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { CompaniesService } from "./companies.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";

@Controller("companies")
@UseGuards(AuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  list(@CurrentUser() user: any, @Query("workspaceId") workspaceId: string) {
    return this.companiesService.listByWorkspace(user.id, workspaceId);
  }

  @Get(":id")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.companiesService.findOne(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateCompanyDto) {
    return this.companiesService.create(user.id, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: any, @Param("id") id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(user.id, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: any, @Param("id") id: string) {
    return this.companiesService.delete(user.id, id);
  }
}
