// ESP32-S3 + PCA9685: newline-delimited serial protocol at 115200 baud.
// HELLO -> FACADE_READY,4 ; <motor>,<angle> -> OK / ERR
export const MOTOR_COUNT = 4;
export const MIN_ANGLE = 0;
export const MAX_ANGLE = 180;

// Website 0-100% (physical panel 0-90 degrees) maps to servo commands 0-180.
export function openingToAngle(opening, reverse = false) {
  const percent = Math.max(0, Math.min(100, Number(opening) || 0));
  const angle = MIN_ANGLE + (MAX_ANGLE - MIN_ANGLE) * percent / 100;
  return Math.round(reverse ? MIN_ANGLE + MAX_ANGLE - angle : angle);
}

export function motorCommand(motor, angle) {
  if (!Number.isInteger(motor) || motor < 1 || motor > MOTOR_COUNT ||
      !Number.isInteger(angle) || angle < MIN_ANGLE || angle > MAX_ANGLE) {
    throw new Error("Invalid motor or servo angle");
  }
  return `${motor},${angle}\n`;
}

export class FacadeSerial {
  constructor(onDisconnect = () => {}) {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.waiter = null;
    this.buffer = "";
    this.closed = false;
    this.onDisconnect = onDisconnect;
  }

  async connect() {
    if (!navigator.serial) {
      throw new Error("Web Serial requires desktop Chrome/Edge on localhost or HTTPS.");
    }
    this.closed = false;
    try {
      // requestPort must be called from the user pressing Connect.
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200 });
      this.writer = this.port.writable.getWriter();
      this.reader = this.port.readable.getReader();
      void this.readLoop();
      const response = await this.exchange("HELLO\n", 6000);
      if (response !== "FACADE_READY,4") {
        throw new Error(`Unexpected device response: ${response}`);
      }
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  receive(line) {
    if (!this.waiter) return;
    // Ignore boot banners and unrelated serial log lines.
    if (line === "READY" || line === "") return;
    const waiter = this.waiter;
    this.waiter = null;
    clearTimeout(waiter.timer);
    if (line.startsWith("ERR") || line === "INVALID COMMAND") {
      waiter.reject(new Error(`ESP32 replied: ${line}`));
    } else {
      waiter.resolve(line);
    }
  }

  async readLoop() {
    const decoder = new TextDecoder();
    try {
      while (!this.closed && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;
        this.buffer += decoder.decode(value, { stream: true });
        if (this.buffer.length > 4096) this.buffer = this.buffer.slice(-1024);
        let pos;
        while ((pos = this.buffer.indexOf("\n")) >= 0) {
          const line = this.buffer.slice(0, pos).trim();
          this.buffer = this.buffer.slice(pos + 1);
          this.receive(line);
        }
      }
    } catch (error) {
      if (!this.closed) this.onDisconnect(error);
    } finally {
      if (!this.closed) this.onDisconnect(new Error("ESP32 serial port disconnected."));
    }
  }

  async exchange(command, timeout = 1800) {
    if (this.closed || !this.writer || this.waiter) {
      throw new Error("ESP32 is disconnected or busy.");
    }
    let waiter;
    const response = new Promise((resolve, reject) => {
      waiter = { resolve, reject, timer: null };
      waiter.timer = setTimeout(() => {
        if (this.waiter === waiter) this.waiter = null;
        reject(new Error("No response from ESP32. Check the USB port and firmware."));
      }, timeout);
      this.waiter = waiter;
    });
    try {
      await this.writer.write(new TextEncoder().encode(command));
    } catch (error) {
      if (this.waiter === waiter) this.waiter = null;
      clearTimeout(waiter.timer);
      // Consume the rejected promise to avoid an unhandled rejection.
      response.catch(() => {});
      throw error;
    }
    return response;
  }

  async send(motor, angle) {
    const response = await this.exchange(motorCommand(motor, angle));
    if (response !== "OK") throw new Error(`Motor ${motor}: ${response}`);
  }

  async disconnect() {
    if (this.closed) return;
    this.closed = true;
    if (this.waiter) {
      const waiter = this.waiter;
      this.waiter = null;
      clearTimeout(waiter.timer);
      waiter.reject(new Error("ESP32 disconnected."));
    }
    try { await this.reader?.cancel(); } catch { /* already disconnected */ }
    try { this.reader?.releaseLock(); } catch { /* already released */ }
    try { this.writer?.releaseLock(); } catch { /* already released */ }
    try { await this.port?.close(); } catch { /* already closed */ }
    this.reader = null;
    this.writer = null;
    this.port = null;
  }
}
