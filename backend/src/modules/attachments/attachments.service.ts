import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Attachment, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetUploadUrlDto } from "./dto/get-upload-url.dto";

const prisma = new PrismaClient();

@Injectable()
export class AttachmentsService {
  private readonly s3: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor() {
    this.region = process.env.AWS_REGION || "us-east-1";
    this.bucketName = process.env.AWS_BUCKET_NAME || "";
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
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

  private buildAttachmentUrl(storageKey: string) {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${storageKey}`;
  }

  async generateUploadUrl(userId: string, dto: GetUploadUrlDto) {
    await this.assertMembership(userId, dto.workspaceId);

    const uuid = randomUUID();
    const safeFileName = dto.fileName.replace(/[\\/]+/g, "-");
    const storageKey = `workspaces/${dto.workspaceId}/attachments/${uuid}-${safeFileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      ContentType: dto.mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 900 });
    const url = this.buildAttachmentUrl(storageKey);

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

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: attachment.storageKey,
    });

    const downloadUrl = await getSignedUrl(this.s3, command, { expiresIn: 3600 });

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

    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    return { success: true };
  }
}
