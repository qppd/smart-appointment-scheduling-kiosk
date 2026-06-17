/*
 * Smart Appointment Scheduling Kiosk
 * ESP32 Firmware - Fingerprint Controller
 * Board: ESP32 Dev Module
 * Communicates with RPi4 over UART at 115200 baud.
 * Controls AS608 fingerprint sensor via Serial1 at 57600 baud.
 */

#include <Adafruit_Fingerprint.h>

#define FINGERPRINT_RX 16
#define FINGERPRINT_TX 17
#define MAX_ENROLL_ATTEMPTS 30
#define WATCHDOG_FEED_MS 50

HardwareSerial fingerSerial(1);
Adafruit_Fingerprint finger(&fingerSerial);

const int MAX_CMD_LEN = 64;
char cmdBuffer[MAX_CMD_LEN];
int cmdIndex = 0;

void setup() {
  Serial.begin(115200);
  while (!Serial);

  fingerSerial.begin(57600, SERIAL_8N1, FINGERPRINT_RX, FINGERPRINT_TX);
  finger.begin(57600);

  delay(1000);

  if (finger.verifyPassword()) {
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
    enrollFingerprint(id);
  } else if (strcmp(cmd, "FP_VERIFY") == 0) {
    int id = verifyFingerprint();
    if (id > 0) {
      char response[32];
      snprintf(response, sizeof(response), "FP_MATCH:%d", id);
      Serial.println(response);
    } else {
      Serial.println("FP_NO_MATCH");
    }
  } else if (strncmp(cmd, "FP_DELETE:", 10) == 0) {
    int id = atoi(cmd + 10);
    Serial.println(deleteFingerprint(id) ? "OK" : "ERR:Delete failed");
  } else if (strcmp(cmd, "FP_COUNT") == 0) {
    char response[16];
    snprintf(response, sizeof(response), "OK:%d", getFingerprintCount());
    Serial.println(response);
  } else if (strcmp(cmd, "FP_ID") == 0) {
    if (finger.fingerID > 0) {
      char response[16];
      snprintf(response, sizeof(response), "OK:%d", finger.fingerID);
      Serial.println(response);
    } else {
      Serial.println("ERR:No match");
    }
  } else if (strcmp(cmd, "FP_CLEAR") == 0) {
    Serial.println(finger.emptyDatabase() == FINGERPRINT_OK ? "OK" : "ERR:Clear failed");
  } else {
    Serial.print("ERR:Unknown command - ");
    Serial.println(cmd);
  }
}

bool enrollFingerprint(int id) {
  Serial.print("OK:Place finger on sensor for enrollment ID ");
  Serial.println(id);

  int p = -1;
  for (int attempts = 0; attempts < MAX_ENROLL_ATTEMPTS && p != FINGERPRINT_OK; attempts++) {
    p = finger.getImage();
    if (p == FINGERPRINT_OK) break;
    delay(500);
    yield();
  }

  if (p != FINGERPRINT_OK) {
    Serial.println("ERR:No finger detected");
    return false;
  }

  if (finger.image2Tz(1) != FINGERPRINT_OK) {
    Serial.println("ERR:Image conversion failed");
    return false;
  }

  Serial.println("OK:Remove finger");
  delay(2000);
  while (finger.getImage() != FINGERPRINT_NOFINGER) { delay(100); }

  Serial.println("OK:Place same finger again");

  p = -1;
  for (int attempts = 0; attempts < MAX_ENROLL_ATTEMPTS && p != FINGERPRINT_OK; attempts++) {
    p = finger.getImage();
    if (p == FINGERPRINT_OK) break;
    delay(500);
    yield();
  }

  if (p != FINGERPRINT_OK) {
    Serial.println("ERR:No finger detected on second scan");
    return false;
  }

  if (finger.image2Tz(2) != FINGERPRINT_OK) {
    Serial.println("ERR:Second image conversion failed");
    return false;
  }

  if (finger.createModel() != FINGERPRINT_OK) {
    Serial.println("ERR:Models do not match");
    return false;
  }

  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    char response[32];
    snprintf(response, sizeof(response), "FP_ENROLLED:%d", id);
    Serial.println(response);
    return true;
  } else {
    Serial.println("ERR:Failed to store fingerprint");
    return false;
  }
}

int verifyFingerprint() {
  Serial.println("OK:Place finger on sensor");

  int p = -1;
  for (int attempts = 0; attempts < MAX_ENROLL_ATTEMPTS && p != FINGERPRINT_OK; attempts++) {
    p = finger.getImage();
    if (p == FINGERPRINT_OK) break;
    delay(500);
    yield();
  }

  if (p != FINGERPRINT_OK) {
    Serial.println("ERR:No finger detected");
    return -1;
  }

  if (finger.image2Tz() != FINGERPRINT_OK) {
    Serial.println("ERR:Image conversion failed");
    return -1;
  }

  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) return finger.fingerID;
  else if (p == FINGERPRINT_NOTFOUND) return -2;
  else return -1;
}

bool deleteFingerprint(int id) {
  return finger.deleteModel(id) == FINGERPRINT_OK;
}

uint8_t getFingerprintCount() {
  return finger.getTemplateCount();
}
