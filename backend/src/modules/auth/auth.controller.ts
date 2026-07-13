import { Controller, All, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";

@Controller("auth")
export class AuthController {
  @All("*")
  handleAuth(@Req() req: Request, @Res() res: Response) {
    return toNodeHandler(auth)(req, res);
  }
}
