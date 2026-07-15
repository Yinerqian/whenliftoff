import { describe, expect, it } from "vitest";
import { getLaunchStatusMeta } from "@/lib/launch-status";

describe("launch status presentation", () => {
  it("maps every current Launch Library status to the right tone", () => {
    expect(getLaunchStatusMeta("Go")).toEqual({ label: "计划发射", tone: "planned" });
    expect(getLaunchStatusMeta("TBC").tone).toBe("pending");
    expect(getLaunchStatusMeta("TBD").tone).toBe("pending");
    expect(getLaunchStatusMeta("Hold").tone).toBe("pending");
    expect(getLaunchStatusMeta("In Flight").tone).toBe("planned");
    expect(getLaunchStatusMeta("Deployed")).toEqual({ label: "载荷已部署", tone: "success" });
    expect(getLaunchStatusMeta("Success").tone).toBe("success");
    expect(getLaunchStatusMeta("Failure").tone).toBe("failed");
    expect(getLaunchStatusMeta("Partial Failure").tone).toBe("failed");
  });

  it("uses the upstream name and a neutral tone for unknown statuses", () => {
    expect(getLaunchStatusMeta("New Status", "等待官方说明"))
      .toEqual({ label: "等待官方说明", tone: "pending" });
  });
});
