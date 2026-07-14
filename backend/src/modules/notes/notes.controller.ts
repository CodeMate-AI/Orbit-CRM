import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { NotesService } from "./notes.service";
import { CreateNoteDto } from "./dto/create-note.dto";
import { UpdateNoteDto } from "./dto/update-note.dto";

@Controller("notes")
@UseGuards(AuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  async list(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Query("entityType") entityType: "person" | "company" | "opportunity",
    @Query("entityId") entityId: string,
  ) {
    return this.notesService.listForEntity(user.id, workspaceId, entityType, entityId);
  }

  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateNoteDto) {
    return this.notesService.create(user.id, dto);
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(user.id, id, dto);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: any, @Param("id") id: string) {
    return this.notesService.delete(user.id, id);
  }
}
