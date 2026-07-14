import test from "node:test";
import assert from "node:assert/strict";
import { validateSync } from "class-validator";
import { CreatePersonDto } from "./create-person.dto";
import { UpdatePersonDto } from "./update-person.dto";

const INVALID_INDIAN_PHONE_MESSAGE =
  "phone must be a valid Indian phone number starting with +91 or 91, followed by exactly 10 digits.";

function buildCreateDto(overrides: Partial<CreatePersonDto> = {}) {
  const dto = new CreatePersonDto();
  dto.firstName = "Priya";
  dto.lastName = "Sharma";
  dto.workspaceId = "workspace-1";
  Object.assign(dto, overrides);
  return dto;
}

test("CreatePersonDto accepts +91 Indian phone numbers", () => {
  const dto = buildCreateDto({ phone: "+91 93484 70094" });

  const errors = validateSync(dto);

  assert.equal(errors.length, 0);
});

test("CreatePersonDto accepts Indian phone numbers without country code", () => {
  const dto = buildCreateDto({ phone: "93484 70094" });

  const errors = validateSync(dto);

  assert.equal(errors.length, 0);
});

test("CreatePersonDto accepts Indian phone numbers prefixed with 91", () => {
  const dto = buildCreateDto({ phone: "91 93484 70094" });

  const errors = validateSync(dto);

  assert.equal(errors.length, 0);
});

test("CreatePersonDto accepts dynamic contact metadata fields", () => {
  const dto = buildCreateDto({
    phone: "+91 93484 70094",
    leadSource: "LinkedIn",
    industry: "Technology",
    tagsString: "Customer, Hot lead",
  });

  const errors = validateSync(dto);

  assert.equal(errors.length, 0);
});

test("CreatePersonDto rejects Indian numbers with fewer than 10 digits after +91", () => {
  const dto = buildCreateDto({ phone: "+91 93484 7009" });

  const errors = validateSync(dto);

  assert.equal(errors.length, 1);
  assert.equal(errors[0]?.constraints?.isValidPhone, INVALID_INDIAN_PHONE_MESSAGE);
});

test("CreatePersonDto rejects non-Indian country codes", () => {
  const dto = buildCreateDto({ phone: "+1 93484 70094" });

  const errors = validateSync(dto);

  assert.equal(errors.length, 1);
  assert.equal(errors[0]?.constraints?.isValidPhone, INVALID_INDIAN_PHONE_MESSAGE);
});

test("UpdatePersonDto rejects Indian numbers with more than 10 digits after +91", () => {
  const dto = new UpdatePersonDto();
  dto.phone = "+91 93484 700941";

  const errors = validateSync(dto);

  assert.equal(errors.length, 1);
  assert.equal(errors[0]?.constraints?.isValidPhone, INVALID_INDIAN_PHONE_MESSAGE);
});

test("UpdatePersonDto accepts dynamic contact metadata fields", () => {
  const dto = new UpdatePersonDto();
  dto.leadSource = "Referral";
  dto.industry = "Finance";
  dto.tagsString = "Partner, Vendor";

  const errors = validateSync(dto);

  assert.equal(errors.length, 0);
});
