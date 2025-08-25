"use server";

import { ReadingHighlight } from "@/lib/types";
import { readFile } from "fs/promises";
import { join } from "path";

let highlightsCache: ReadingHighlight[] | null = null;
let lastModified: number | null = null;

export async function getHighlights(): Promise<ReadingHighlight[]> {
  try {
    const filePath = join(process.cwd(), "src", "lib", "reading-highlights.md");
    
    // Check if we need to refresh the cache
    const stats = await import('fs/promises').then(fs => fs.stat(filePath));
    const currentModified = stats.mtime.getTime();
    
    if (highlightsCache && lastModified === currentModified) {
      return highlightsCache;
    }

    const markdown = await readFile(filePath, "utf-8");

    const parts = markdown.split(/###\s+/).filter(Boolean);
    const highlights = parts.map((block: string) => {
      const [titleLine, ...bodyLines] = block.trim().split("\n");
      return {
        title: titleLine.trim(),
        text: bodyLines.join("\n").trim(),
      };
    }).filter(highlight => {
      if (!highlight.title || !highlight.text) return false;
      
      const title = highlight.title.trim();
      const text = highlight.text.trim();
      
      // Filter out empty content
      if (title === "" || text === "") return false;
      
      // Filter out fragments (text starting with lowercase)
      if (text.length > 0 && text[0] === text[0].toLowerCase() && text[0] !== text[0].toUpperCase()) {
        return false;
      }
      
      // Filter out very short text that's likely incomplete
      if (text.length < 10) return false;
      
      return true;
    });

    // Cache the results
    highlightsCache = highlights;
    lastModified = currentModified;

    return highlights;
  } catch (error) {
    console.error("Error loading highlights:", error);
    return [];
  }
}

export async function getRandomHighlights(count: number = 50): Promise<ReadingHighlight[]> {
  const allHighlights = await getHighlights();
  
  // Fisher-Yates shuffle for better randomization
  const shuffled = [...allHighlights];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, count);
}
