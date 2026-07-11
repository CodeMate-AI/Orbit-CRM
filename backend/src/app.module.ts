import { Module } from "@nestjs/common";

import { AuthModule } from "./modules/auth/auth.module";
import { ContactsModule } from "./modules/contacts/contacts.module";
import { WorkflowsModule } from "./modules/workflows/workflows.module";

@Module({
  imports: [AuthModule, ContactsModule, WorkflowsModule],
})
export class AppModule {}
