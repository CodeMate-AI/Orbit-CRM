function normalizeDealAmount(value) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function normalizeDealOptionalString(value) {
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeDealCloseDate(value) {
  const trimmed = value.trim();
  return trimmed || null;
}

function formatDealCurrency(amount) {
  if (amount === null || amount === 0) return null;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
}

module.exports = {
  normalizeDealAmount,
  normalizeDealOptionalString,
  normalizeDealCloseDate,
  formatDealCurrency,
};
