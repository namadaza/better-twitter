"use server";

import { ReadingHighlight } from "@/lib/types";
import { readFileSync } from "fs";
import { join } from "path";

export async function getHighlights(): Promise<ReadingHighlight[]> {
  const filePath = join(process.cwd(), "src", "lib", "reading-highlights.md");
  const markdown = readFileSync(filePath, "utf-8");

  const parts = markdown.split(/###\s+/).filter(Boolean);
  const highlights = parts.map((block: string) => {
    const [titleLine, ...bodyLines] = block.trim().split("\n");
    return {
      title: titleLine.trim(),
      text: bodyLines.join("\n").trim(),
    };
  });

  const randomizedFeed = highlights.sort(() => Math.random() - 0.5);
  return randomizedFeed;
}
