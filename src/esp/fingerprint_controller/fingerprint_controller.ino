/*
 * Smart Appointment Scheduling Kiosk
 * ESP32 Firmware - Fingerprint Controller
 * Board: ESP32 Dev Module
 * Communicates with RPi4 over UART at 115200 baud.
 * Controls AS608 fingerprint sensor via Serial1 at 57600 baud.
 */

#include "FingerprintAS608.h"

#define FINGERPRINT_RX 16
#define FINGERPRINT_TX 17
#define MAX_ENROLL_ATTEMPTS 30

HardwareSerial fingerSerial(1);
FingerprintAS608 fpSensor(fingerSerial);

const int MAX_CMD_LEN = 64;
char cmdBuffer[MAX_CMD_LEN];
int cmdIndex = 0;

void setup() {
  Serial.begin(115200);
  while (!Serial);

  fingerSerial.begin(57600, SERIAL_8N1, FINGERPRINT_RX, FINGERPRINT_TX);
  fpSensor.begin();

  delay(1000);

  if (fpSensor.verifySensor()) {
    Serial.println("OK:Fingerprint sensor initialized");
  } else {
    Serial.println("ERR:Fingerprint sensor not found - check wiring");
  }

  Serial.println("OK:ESP32 ready");
}

void loop() {
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (cmdIndex > 0) {
        cmdBuffer[cmdIndex] = '\0';
        processCommand(cmdBuffer);
        cmdIndex = 0;
      }
    } else if (cmdIndex < MAX_CMD_LEN - 1) {
      cmdBuffer[cmdIndex++] = c;
    }
  }
  delay(10);
}

void processCommand(const char* cmd) {
  if (strcmp(cmd, "PING") == 0) {
    Serial.println("PONG");
  } else if (strncmp(cmd, "FP_ENROLL:", 10) == 0) {
    int id = atoi(cmd + 10);
    if (id < 1 || id > 127) {
      Serial.println("ERR:ID must be 1-127");
      return;
    }
    handleEnroll((uint16_t)id);
  } else if (strcmp(cmd, "FP_VERIFY") == 0) {
    int id = fpSensor.authenticate();
    if (id >= 0) {
      char response[32];
      snprintf(response, sizeof(response), "FP_MATCH:%d", id);
      Serial.println(response);
    } else if (id == -2) {
      Serial.println("FP_NO_MATCH");
    } else {
      Serial.println("ERR:Verify failed");
    }
  } else if (strncmp(cmd, "FP_DELETE:", 10) == 0) {
    int id = atoi(cmd + 10);
    Serial.println(fpSensor.deleteFingerprint((uint16_t)id) ? "OK" : "ERR:Delete failed");
  } else if (strcmp(cmd, "FP_COUNT") == 0) {
    char response[16];
    snprintf(response, sizeof(response), "OK:%d", fpSensor.getTemplateCount());
    Serial.println(response);
  } else if (strcmp(cmd, "FP_ID") == 0) {
    uint16_t lastId = fpSensor.getLastFingerID();
    if (lastId > 0) {
      char response[16];
      snprintf(response, sizeof(response), "OK:%d", lastId);
      Serial.println(response);
    } else {
      Serial.println("ERR:No match");
    }
  } else if (strcmp(cmd, "FP_CLEAR") == 0) {
    Serial.println(fpSensor.emptyDatabase() ? "OK" : "ERR:Clear failed");
  } else {
    Serial.print("ERR:Unknown command - ");
    Serial.println(cmd);
  }
}

bool handleEnroll(uint16_t id) {
  if (!fpSensor.enroll(id)) {
    Serial.println("ERR:Enrollment failed");
    return false;
  }
  char response[32];
  snprintf(response, sizeof(response), "FP_ENROLLED:%d", id);
  Serial.println(response);
  return true;
}
