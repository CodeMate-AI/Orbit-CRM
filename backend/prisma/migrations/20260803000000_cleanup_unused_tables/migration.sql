-- =============================================================================
-- Orbit CRM — Cleanup Migration: Remove Unused Tables & Enums
-- Date: 2026-08-03
-- Reason: These tables/enums were scaffolded in the initial migration but have
--         NEVER been referenced by any backend module, API route, or frontend
--         page in the Orbit CRM application.
-- Safety: Each DROP uses IF EXISTS to be a no-op if already absent.
--         All actively used tables (Person, Company, Opportunity, Pipeline,
--         PipelineStage, Task, Note, Activity, Attachment, AuditLog,
--         WorkspaceMember, ChatSession, ChatMessage, SmtpConfig,
--         Invitation, JoinRequest, User, Session, Account, Verification)
--         are NOT touched.
-- =============================================================================

-- Drop dependent child tables first (FK order)
DROP TABLE IF EXISTS "WorkflowRun";
DROP TABLE IF EXISTS "Workflow";
DROP TABLE IF EXISTS "TagAssignment";
DROP TABLE IF EXISTS "Tag";
DROP TABLE IF EXISTS "CustomFieldValue";
DROP TABLE IF EXISTS "CustomFieldDefinition";
DROP TABLE IF EXISTS "View";
DROP TABLE IF EXISTS "Dashboard";
DROP TABLE IF EXISTS "Notification";

-- Drop orphaned enum types (only after all tables using them are dropped)
DROP TYPE IF EXISTS "WorkflowRunStatus";
DROP TYPE IF EXISTS "FieldType";
DROP TYPE IF EXISTS "EntityType";
DROP TYPE IF EXISTS "ViewType";
DROP TYPE IF EXISTS "NotificationType";
