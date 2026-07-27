import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function extractTextFromTiptapJson(body: any): string {
  if (!body) return "";
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      return extractTextFromTiptapJson(parsed);
    } catch {
      return body;
    }
  }
  if (body.text) return body.text;
  if (Array.isArray(body.content)) {
    return body.content.map(extractTextFromTiptapJson).join(" ");
  }
  if (body.content) {
    return extractTextFromTiptapJson(body.content);
  }
  return "";
}

export function isTiptapJsonEmpty(body: any): boolean {
  return extractTextFromTiptapJson(body).trim().length === 0;
}
