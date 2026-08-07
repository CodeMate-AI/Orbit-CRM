import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

// Organizes dependency injection boundaries for the Search feature
@Module({
  controllers: [SearchController], // Exposes endpoints for search queries
  providers: [SearchService], // Regulates business logic lookup dependencies
  exports: [SearchService], // Shares SearchService with modules importing SearchModule
})
export class SearchModule {}

