# Physical panel 0–90° control (observed mapping)

Your observation: servo command 180 corresponds to approximately 90° of physical panel movement. Therefore the website shows panel opening 0–90° while sending servo commands 0–180. This is an empirical mapping, **not a measured guarantee**.

| Website opening | Panel target (approx.) | Serial command for motor 1 |
|---|---|---|
| 0% | 0° | `1,0` |
| 25% | 22.5° | `1,45` |
| 50% | 45° | `1,90` |
| 75% | 67.5° | `1,135` |
| 100% | 90° | `1,180` |

The website's manual and automatic modes share the same mapping. Per-motor reverse switches remain available.

## Setup
1. Disconnect panel linkages and upload `firmware/ESP32S3_Facade_WebSerial.ino` with Arduino IDE 2.
2. Use a regulated external 5V servo supply and shared ground. Test one servo at a time, moving gradually toward 180; stop for buzzing, stalls, binding, or heat.
3. Close Arduino Serial Monitor. Run `npm install` and `npm run dev` in this project directory with Node.js installed. Open the localhost URL in desktop Chrome or Edge.
4. Select four modules, connect ESP32 via USB, then click Enable physical control. Use the 0°, 45°, 90° panel test buttons, beginning with the midpoint.
5. Reattach panels only after verifying clearance and safe movement. The site displays approximate target angles; no sensor measures actual position.

Note: Serial Monitor and the website cannot generally hold the same serial port simultaneously.
