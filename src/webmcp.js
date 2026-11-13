import { engine, CAMERAS } from "./simulation/engine.js";
export function registerModelTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return () => {};
  const controller = new AbortController();
  const report = (error) =>
    console.info("Optional model tools unavailable:", error?.message || error);
  const register = (tool) => {
    try {
      Promise.resolve(
        context.registerTool(tool, { signal: controller.signal }),
      ).catch(report);
    } catch (error) {
      report(error);
    }
  };
  register({
    name: "read_facade_simulation",
    title: "Read the facade study",
    description:
      "Read the visible studio state, indoor capacity, opening commands and current exposure samples.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: () => {
      const s = engine.getSnapshot();
      return {
        count: s.count,
        capacity: s.capacity,
        target: s.targetCount,
        entering: s.entering,
        leaving: s.leaving,
        environment: s.environment,
        mode: s.mode,
        commands: s.commands,
        actualCommands: s.actualCommands,
        camera: s.camera,
        selected: s.person,
        exposure: s.exposure,
        comparison: s.compare,
        room: s.room,
        safety: s.safety.active,
        hardware: s.hardware,
        metrics: s.metrics,
        demo: s.demo,
        positions: s.positions,
      };
    },
  });
  register({
    name: "stage_facade_simulation",
    title: "Set up a facade scenario",
    description:
      "Set an occupancy target, light condition, mode or camera using the same controls as the page. People and modules then animate toward those targets; returns pending transitions.",
    inputSchema: {
      type: "object",
      properties: {
        occupancy: { type: "integer", minimum: 0, maximum: 21 },
        environment: { type: "string", enum: ["day", "evening", "night"] },
        mode: { type: "string", enum: ["auto", "manual"] },
        opening: { type: "number", minimum: 0, maximum: 100 },
        camera: { type: "string", enum: CAMERAS.map((c) => c[0]) },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: (input) => {
      if (!input || typeof input !== "object" || Array.isArray(input))
        throw new Error("Expected a scenario object.");
      const keys = ["occupancy", "environment", "mode", "opening", "camera"];
      if (Object.keys(input).some((k) => !keys.includes(k)))
        throw new Error("Unknown scenario field.");
      if (
        input.occupancy !== undefined &&
        (!Number.isInteger(input.occupancy) ||
          input.occupancy < 0 ||
          input.occupancy > 21)
      )
        throw new Error("Occupancy must be 0–21.");
      if (
        input.environment !== undefined &&
        !["day", "evening", "night"].includes(input.environment)
      )
        throw new Error("Unknown environment.");
      if (input.mode !== undefined && !["auto", "manual"].includes(input.mode))
        throw new Error("Unknown mode.");
      if (
        input.opening !== undefined &&
        (!Number.isFinite(input.opening) ||
          input.opening < 0 ||
          input.opening > 100)
      )
        throw new Error("Opening must be 0–100.");
      if (
        input.camera !== undefined &&
        !CAMERAS.some((c) => c[0] === input.camera)
      )
        throw new Error("Unknown camera.");
      if (engine.state.demo || engine.state.compare)
        throw new Error(
          "Exit the temporary demonstration or comparison first.",
        );
      if (input.mode) engine.setMode(input.mode);
      if (input.environment) engine.change({ environment: input.environment });
      if (input.occupancy !== undefined) engine.setTarget(input.occupancy);
      if (input.opening !== undefined) engine.setOpening(input.opening);
      if (input.camera) engine.setCamera(input.camera);
      const s = engine.getSnapshot();
      return {
        target: s.targetCount,
        count: s.count,
        entering: s.entering,
        leaving: s.leaving,
        mode: s.mode,
        commands: s.commands,
      };
    },
  });
  return () => controller.abort();
}
