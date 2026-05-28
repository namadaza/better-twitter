import { describe, it, expect } from "vitest";
import { formatArtist } from "./artwork-item.helpers";

describe("formatArtist", () => {
  it("formats 'Mansur Ustad' as 'Mansur, Ustad'", () => {
    expect(formatArtist("Mansur Ustad")).toBe("Mansur, Ustad");
  });

  it("returns single-word names unchanged", () => {
    expect(formatArtist("Plato")).toBe("Plato");
  });

  it("leaves names with existing commas unchanged", () => {
    expect(formatArtist("Doe, John")).toBe("Doe, John");
  });

  it("formats multi-part names using the first token as family name", () => {
    expect(formatArtist("Jean-Leon Gerome")).toBe("Jean-Leon, Gerome");
  });
});
