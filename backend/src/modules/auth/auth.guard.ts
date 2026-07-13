import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { auth } from "./auth";

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Better Auth api.getSession automatically resolves the session from headers/cookies
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      throw new UnauthorizedException("User is not authenticated");
    }

    request.session = session.session;
    request.user = session.user;
    
    return true;
  }
}
