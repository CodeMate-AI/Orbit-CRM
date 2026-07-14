import test from "node:test";
import assert from "node:assert/strict";
import { validateSync } from "class-validator";
import { UpdateOpportunityDto } from "./update-opportunity.dto";

test("UpdateOpportunityDto accepts null optional fields", () => {
  const dto = new UpdateOpportunityDto();
  dto.name = null as any;
  dto.amount = null as any;
  dto.closeDate = null as any;
  dto.stageId = null as any;
  dto.companyId = null as any;

  const errors = validateSync(dto);

  assert.equal(errors.length, 0);
});
