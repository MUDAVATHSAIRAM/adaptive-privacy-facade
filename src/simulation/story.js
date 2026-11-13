export const STORY = [
  {
    title: "Adaptive Kinetic Privacy Facade",
    duration: 8,
    count: 0,
    environment: "day",
    camera: "perspective",
    caption:
      "An Intelligent Building study at IIT (BHU), Varanasi: a room, a street and an adjustable layer of privacy. All performance values are simulation estimates.",
  },
  {
    title: "The architectural privacy problem",
    duration: 10,
    count: 1,
    environment: "day",
    camera: "observer",
    caption:
      "Ground-floor windows connect people to the street, but also expose daily activities. A fixed closed screen sacrifices outside views; adjustable screening offers a trade-off.",
  },
  {
    title: "The existing room and facade",
    duration: 12,
    count: 1,
    zone: "center",
    environment: "day",
    camera: "perspective",
    caption:
      "The original studio, side entrance, furniture and glazing remain the starting point. Room Designer changes the enclosure while keeping its parts coordinated.",
  },
  {
    title: "Independent kinetic modules",
    duration: 12,
    count: 1,
    environment: "day",
    camera: "detail",
    caption:
      "The default facade has M01–M04. Each module has two connected rigid leaves, a folding hinge and a sliding free edge. Real perforations filter views through the screen.",
  },
  {
    title: "Occupant position simulation",
    duration: 34,
    count: 7,
    environment: "day",
    camera: "perspective",
    caption:
      "7 → 14 → 21 people enter through the side door. The floor plan shows their positions. Moving closer to the facade or across the room changes the affected zones.",
  },
  {
    title: "Automatic facade response",
    duration: 12,
    count: 21,
    environment: "day",
    camera: "perspective",
    analysis: true,
    caption:
      "Occupant-to-observer sightlines determine affected modules. A short stability delay prevents rapid repeated commands, then the folds move smoothly toward their targets.",
  },
  {
    title: "Daytime conditions",
    duration: 12,
    count: 21,
    environment: "day",
    camera: "interior",
    caption:
      "Daytime rules retain more opening for views and useful daylight. The strongest privacy request governs each affected module; unaffected modules remain more open.",
  },
  {
    title: "Evening to nighttime privacy",
    duration: 17,
    count: 21,
    environment: "evening",
    camera: "exterior",
    caption:
      "The scene changes from evening to night. When the inside is lit and the exterior is dark, the proposed rules increase screening. Lighting contrast is assumed, not measured.",
  },
  {
    title: "Manual override",
    duration: 11,
    count: 21,
    environment: "day",
    camera: "perspective",
    manual: true,
    caption:
      "M02 closes independently while the other modules keep their opening. Occupants can override automation. A separate safety demonstration uses a configurable position.",
  },
  {
    title: "Privacy analysis and comparison",
    duration: 16,
    count: 21,
    environment: "night",
    camera: "exterior",
    compare: true,
    caption:
      "Compare the same frozen scene with different screen positions, then inspect actual sampled sightlines and perforations. The dashboard compares open, adaptive and closed estimates.",
  },
  {
    title: "Digital control network",
    duration: 12,
    count: 21,
    environment: "day",
    camera: "perspective",
    hardware: true,
    caption:
      "Position input → privacy rules → opening commands → calibrated servo angles → future serial connection. The prototype is Simulation Only; no Arduino is connected.",
  },
  {
    title: "Architectural conclusion",
    duration: 8,
    count: 21,
    environment: "day",
    camera: "perspective",
    caption:
      "An adaptable boundary balances privacy, views and occupant control. This prototype demonstrates the control idea; a physical model will need motor calibration and measured validation.",
  },
];
