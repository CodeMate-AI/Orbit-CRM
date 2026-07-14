import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/user.decorator";
import { AttachmentsService } from "./attachments.service";
import { GetUploadUrlDto } from "./dto/get-upload-url.dto";

@Controller("attachments")
@UseGuards(AuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post("presigned-url")
  async getUploadUrl(@CurrentUser() user: any, @Body() dto: GetUploadUrlDto) {
    return this.attachmentsService.generateUploadUrl(user.id, dto);
  }

  @Get()
  async list(
    @CurrentUser() user: any,
    @Query("workspaceId") workspaceId: string,
    @Query("entityType") entityType: "person" | "company" | "opportunity",
    @Query("entityId") entityId: string,
  ) {
    return this.attachmentsService.listForEntity(user.id, workspaceId, entityType, entityId);
  }

  @Get(":id/download-url")
  async getDownloadUrl(@CurrentUser() user: any, @Param("id") id: string) {
    return this.attachmentsService.generateDownloadUrl(user.id, id);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: any, @Param("id") id: string) {
    return this.attachmentsService.delete(user.id, id);
  }
}
