import { IsEmail, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class TestSmtpConfigDto {
  @IsString()
  @IsOptional()
  host?: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  port?: number;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsEmail()
  @IsOptional()
  senderEmail?: string;

  @IsEmail()
  @IsOptional()
  to?: string;
}
