/*
 * ESP32-S3 + PCA9685 + 4 SG90 servos
 * Install Adafruit PWM Servo Driver Library in Arduino IDE.
 * ESP32-S3 GPIO8 -> PCA9685 SDA, GPIO9 -> SCL
 * ESP32-S3 3V3 -> PCA9685 VCC, GND -> GND
 * PCA9685 channels 0..3 -> SG90 motors 1..4
 * IMPORTANT: Servo V+ needs its own verified REGULATED 5V supply.
 * Never use an unregulated 2-cell Li-ion holder directly on servo V+.
 */
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pwm(0x40);
constexpr int MIN_ANGLE = 0;
constexpr int MAX_ANGLE = 180;

void setMotor(int motor, int angle) {
  // 205..410 ticks at 50 Hz ~= 1..2 ms pulse width.
  int pulse = map(angle, 0, 180, 205, 410);
  pwm.setPWM(motor - 1, 0, pulse);
}

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(100);
  Wire.begin(8, 9);
  if (!pwm.begin()) {
    Serial.println("ERR PCA9685_NOT_FOUND");
    while (true) delay(1000);
  }
  pwm.setPWMFreq(50);
  delay(500);
  // No automatic servo movement on boot.
  Serial.println("READY");
}

void loop() {
  if (!Serial.available()) return;
  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line == "HELLO") {
    Serial.println("FACADE_READY,4");
    return;
  }
  int motor = 0, angle = 0;
  char extra = 0;
  // The trailing %c rejects malformed commands such as 1,90,garbage.
  if (sscanf(line.c_str(), "%d,%d %c", &motor, &angle, &extra) == 2 &&
      motor >= 1 && motor <= 4 &&
      angle >= MIN_ANGLE && angle <= MAX_ANGLE) {
    setMotor(motor, angle);
    Serial.println("OK");
  } else {
    Serial.println("ERR INVALID_COMMAND");
  }
}
