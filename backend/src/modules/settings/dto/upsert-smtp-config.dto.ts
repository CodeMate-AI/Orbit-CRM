import { IsEmail, IsInt, IsNotEmpty, IsString, Max, Min } from "class-validator";

export class UpsertSmtpConfigDto {
  @IsString()
  @IsNotEmpty()
  host!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  senderName!: string;

  @IsEmail()
  @IsNotEmpty()
  senderEmail!: string;
}
