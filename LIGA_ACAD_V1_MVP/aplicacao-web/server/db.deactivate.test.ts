import { describe, expect, it, vi } from "vitest";
import { ruralProperties } from "../drizzle/schema";
import { deactivatePropertyWithDb } from "./db";

describe("deactivatePropertyWithDb", () => {
  it("atualiza somente o estado da propriedade e preserva as tabelas financeiras", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));
    const database = { update };
    const updatedAt = new Date("2026-08-20T04:00:00.000Z");

    await deactivatePropertyWithDb(database, 8, updatedAt);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(ruralProperties);
    expect(set).toHaveBeenCalledWith({ isActive: false, updatedAt });
    expect(Object.keys(set.mock.calls[0][0]).sort()).toEqual(["isActive", "updatedAt"]);
    expect(where).toHaveBeenCalledTimes(1);
  });
});
