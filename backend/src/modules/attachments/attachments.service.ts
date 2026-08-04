import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "../../prisma";
import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { GetUploadUrlDto } from "./dto/get-upload-url.dto";

@Injectable()
export class AttachmentsService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
      api_key: process.env.CLOUDINARY_API_KEY || "",
      api_secret: process.env.CLOUDINARY_API_SECRET || "",
    });
  }

  private async assertMembership(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace.");
    }
  }

  private getResourceType(mimeType: string): "image" | "video" | "raw" {
    const mime = mimeType.toLowerCase();
    if (mime.startsWith("image/")) {
      return "image";
    }
    if (mime.startsWith("video/")) {
      return "video";
    }
    return "raw";
  }

  private buildAttachmentUrl(storageKey: string, resourceType: string) {
    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/authenticated/${storageKey}`;
  }

  async generateUploadUrl(userId: string, dto: GetUploadUrlDto) {
    await this.assertMembership(userId, dto.workspaceId);

    const uuid = randomUUID();
    const safeFileName = dto.fileName.replace(/[\\/]+/g, "-").replace(/\.[^/.]+$/, "");
    const resourceType = this.getResourceType(dto.mimeType);
    const extension = dto.fileName.split(".").pop() || "";
    const storageKey = resourceType === "raw"
      ? `workspaces/${dto.workspaceId}/attachments/${uuid}-${safeFileName}.${extension}`
      : `workspaces/${dto.workspaceId}/attachments/${uuid}-${safeFileName}`;

    const timestamp = Math.round(new Date().getTime() / 1000);
    const params = {
      timestamp,
      public_id: storageKey,
      type: "authenticated",
    };

    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET || "",
    );

    const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`;
    const url = this.buildAttachmentUrl(storageKey, resourceType);

    const attachment = await prisma.attachment.create({
      data: {
        name: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        url,
        storageKey,
        workspaceId: dto.workspaceId,
        uploadedById: userId,
        personId: dto.personId || null,
        companyId: dto.companyId || null,
        opportunityId: dto.opportunityId || null,
      },
    });

    return {
      uploadUrl,
      fields: {
        api_key: process.env.CLOUDINARY_API_KEY || "",
        timestamp: timestamp.toString(),
        public_id: storageKey,
        type: "authenticated",
        signature,
      },
      attachment,
    };
  }

  async listForEntity(
    userId: string,
    workspaceId: string,
    entityType: "person" | "company" | "opportunity",
    entityId: string,
  ) {
    await this.assertMembership(userId, workspaceId);

    const whereClause: Record<string, string> = {
      workspaceId,
    };

    if (entityType === "person") {
      whereClause.personId = entityId;
    } else if (entityType === "company") {
      whereClause.companyId = entityId;
    } else {
      whereClause.opportunityId = entityId;
    }

    return prisma.attachment.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });
  }

  async generateDownloadUrl(userId: string, attachmentId: string) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found.");
    }

    await this.assertMembership(userId, attachment.workspaceId);

    const expiresAt = Math.round(Date.now() / 1000) + 3600; // valid for 1 hour
    const resourceType = this.getResourceType(attachment.mimeType);

    // Use cloudinary.url() with sign_url — this generates a proper signed delivery
    // URL on res.cloudinary.com for 'authenticated' type resources.
    // NOTE: private_download_url() was wrong here — it hits api.cloudinary.com
    // (the admin API endpoint) which cannot serve authenticated delivery resources.
    const downloadUrl = cloudinary.url(attachment.storageKey, {
      resource_type: resourceType,
      type: "authenticated",
      sign_url: true,
      expires_at: expiresAt,
      attachment: true, // forces Content-Disposition: attachment (triggers download)
      secure: true,
    });

    return { downloadUrl };
  }

  async delete(userId: string, attachmentId: string) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found.");
    }

    await this.assertMembership(userId, attachment.workspaceId);

    const resourceType = this.getResourceType(attachment.mimeType);

    await cloudinary.uploader.destroy(attachment.storageKey, {
      resource_type: resourceType,
      type: "authenticated",
    });

    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    return { success: true };
  }
}

