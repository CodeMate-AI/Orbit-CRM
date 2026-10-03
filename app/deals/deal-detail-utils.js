export function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function buildContactLabel(contact) {
  return contact.jobTitle ? `${contact.name} · ${contact.jobTitle}` : contact.name;
}
