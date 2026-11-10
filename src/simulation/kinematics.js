export const commandAngle = (command) =>
  ((Math.max(0, Math.min(100, command)) / 100) * Math.PI * 86) / 180;
export function hingeCoordinates(command, width = 0.965) {
  const a = commandAngle(command),
    x = width * Math.cos(a),
    z = -width * Math.sin(a);
  return { angle: a, middle: [x, z], free: [2 * x, 0] };
}
