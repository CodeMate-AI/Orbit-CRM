export function formatAiMessageContent(content) {
  let normalized = String(content ?? "").replace(/\r\n/g, "\n");
  normalized = normalized.replace(/<[^>]+>/g, ""); // Strip any HTML/XML tags
  const formattedLines = normalized.split("\n").map((line) => {
    let formattedLine = line.replace(/\$(?=\s*\d)/g, "₹");
    formattedLine = formattedLine.replace(/^(\s{0,3})#{1,6}\s+/, "$1");
    formattedLine = formattedLine.replace(/^(\s*)[-*]\s+/, "$1• ");
    formattedLine = formattedLine.replace(/\*\*(.+?)\*\*/g, "$1");
    formattedLine = formattedLine.replace(/\*(.+?)\*/g, "$1");
    return formattedLine;
  });

  return formattedLines.join("\n").replace(/[ \t]+\n/g, "\n").trim();
}
