const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeDealAmount,
  normalizeDealOptionalString,
  normalizeDealCloseDate,
  formatDealCurrency,
} = require("./deal-normalizers");

test("normalizeDealAmount converts blank input to null", () => {
  assert.equal(normalizeDealAmount(""), null);
  assert.equal(normalizeDealAmount("   "), null);
});

test("normalizeDealAmount converts numeric input to a number", () => {
  assert.equal(normalizeDealAmount("500000"), 500000);
});

test("normalizeDealOptionalString converts blank input to null", () => {
  assert.equal(normalizeDealOptionalString(""), null);
  assert.equal(normalizeDealOptionalString("   "), null);
});

test("normalizeDealOptionalString preserves non-empty input", () => {
  assert.equal(normalizeDealOptionalString("company-1"), "company-1");
});

test("normalizeDealCloseDate converts blank input to null", () => {
  assert.equal(normalizeDealCloseDate(""), null);
  assert.equal(normalizeDealCloseDate("   "), null);
});

test("normalizeDealCloseDate preserves non-empty input", () => {
  assert.equal(normalizeDealCloseDate("2026-07-14"), "2026-07-14");
});

test("formatDealCurrency always renders amounts in Indian Rupees", () => {
  assert.equal(formatDealCurrency(500000), "₹5,00,000");
  assert.equal(formatDealCurrency(500000, "USD"), "₹5,00,000");
});

test("formatDealCurrency returns null for empty values", () => {
  assert.equal(formatDealCurrency(null), null);
  assert.equal(formatDealCurrency(0), null);
});
