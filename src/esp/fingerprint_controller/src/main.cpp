/*
 * Smart Appointment Scheduling Kiosk
 * ESP32 Firmware - Fingerprint Controller
 *
 * Communicates with RPi4 over UART (Serial)
 * Controls AS608 fingerprint sensor via Adafruit library
 *
 * Protocol:
 *   Commands received via Serial (115200 baud)
 *   Responses sent back via Serial
 *
 * Commands:
 *   PING            -> PONG
 *   FP_ENROLL:<id>  -> FP_ENROLLED:<id> | ERR:<msg>
 *   FP_VERIFY       -> FP_MATCH:<id> | FP_NO_MATCH | ERR:<msg>
 *   FP_DELETE:<id>  -> OK | ERR:<msg>
 *   FP_COUNT        -> OK:<count> | ERR:<msg>
 *   FP_ID           -> OK:<id> | ERR:No match
 *   FP_CLEAR        -> OK | ERR:<msg>
 */

#include <Arduino.h>
#include <Adafruit_Fingerprint.h>

// Pin definitions for AS608
#define FINGERPRINT_RX 16  // ESP32 RX (connect to AS608 TX)
#define FINGERPRINT_TX 17  // ESP32 TX (connect to AS608 RX)

// ESP32 has multiple hardware serial ports: Serial1, Serial2, etc.
// We use Serial1 for the fingerprint sensor
HardwareSerial fingerSerial(1);
Adafruit_Fingerprint finger(&fingerSerial);

// Command buffer
const int MAX_CMD_LEN = 64;
char cmdBuffer[MAX_CMD_LEN];
int cmdIndex = 0;

// Forward declarations
bool enrollFingerprint(int id);
int verifyFingerprint();
bool deleteFingerprint(int id);
uint8_t getFingerprintCount();

void setup() {
  // Serial for RPi4 communication
  Serial.begin(115200);
  while (!Serial);  // Wait for serial

  // Serial1 for fingerprint sensor
  fingerSerial.begin(57600, SERIAL_8N1, FINGERPRINT_RX, FINGERPRINT_TX);

  // Initialize fingerprint sensor
  finger.begin(57600);

  delay(1000);

  // Test sensor connection
  if (finger.verifyPassword()) {
    Serial.println("OK:Fingerprint sensor initialized");
  } else {
    Serial.println("ERR:Fingerprint sensor not found - check wiring");
  }

  Serial.println("OK:ESP32 ready");
}

void loop() {
  // Read commands from Serial (RPi4)
  while (Serial.available() > 0) {
    char c = Serial.read();

    if (c == '\n' || c == '\r') {
      // End of command
      if (cmdIndex > 0) {
        cmdBuffer[cmdIndex] = '\0';
        processCommand(cmdBuffer);
        cmdIndex = 0;
      }
    } else if (cmdIndex < MAX_CMD_LEN - 1) {
      cmdBuffer[cmdIndex++] = c;
    }
  }

  // Small delay to prevent watchdog issues
  delay(10);
}

void processCommand(const char* cmd) {
  if (strcmp(cmd, "PING") == 0) {
    Serial.println("PONG");
  }
  else if (strncmp(cmd, "FP_ENROLL:", 10) == 0) {
    int id = atoi(cmd + 10);
    if (id < 1 || id > 127) {
      Serial.println("ERR:ID must be 1-127");
      return;
    }
    enrollFingerprint(id);
  }
  else if (strcmp(cmd, "FP_VERIFY") == 0) {
    int id = verifyFingerprint();
    if (id > 0) {
      char response[32];
      snprintf(response, sizeof(response), "FP_MATCH:%d", id);
      Serial.println(response);
    } else {
      Serial.println("FP_NO_MATCH");
    }
  }
  else if (strncmp(cmd, "FP_DELETE:", 10) == 0) {
    int id = atoi(cmd + 10);
    if (deleteFingerprint(id)) {
      Serial.println("OK");
    } else {
      Serial.println("ERR:Delete failed");
    }
  }
  else if (strcmp(cmd, "FP_COUNT") == 0) {
    uint8_t count = getFingerprintCount();
    char response[16];
    snprintf(response, sizeof(response), "OK:%d", count);
    Serial.println(response);
  }
  else if (strcmp(cmd, "FP_ID") == 0) {
    // Returns last matched ID (stored in finger.fingerID)
    if (finger.fingerID > 0) {
      char response[16];
      snprintf(response, sizeof(response), "OK:%d", finger.fingerID);
      Serial.println(response);
    } else {
      Serial.println("ERR:No match");
    }
  }
  else if (strcmp(cmd, "FP_CLEAR") == 0) {
    bool ok = (finger.emptyDatabase() == FINGERPRINT_OK);
    Serial.println(ok ? "OK" : "ERR:Clear failed");
  }
  else {
    Serial.print("ERR:Unknown command - ");
    Serial.println(cmd);
  }
}

/**
 * Enroll a fingerprint at the given ID slot.
 * Returns FP_ENROLLED:<id> on success.
 */
bool enrollFingerprint(int id) {
  Serial.print("OK:Place finger on sensor for enrollment ID ");
  Serial.println(id);

  // Wait for finger
  int p = -1;
  for (int attempts = 0; attempts < 30 && p != FINGERPRINT_OK; attempts++) {
    p = finger.getImage();
    delay(500);
  }

  if (p != FINGERPRINT_OK) {
    Serial.println("ERR:No finger detected");
    return false;
  }

  // Convert image to character file 1
  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    Serial.println("ERR:Image conversion failed");
    return false;
  }

  Serial.println("OK:Remove finger");

  // Wait for finger to be removed
  delay(2000);
  while (finger.getImage() != FINGERPRINT_NOFINGER) {
    delay(100);
  }

  Serial.println("OK:Place same finger again");

  // Wait for finger again
  p = -1;
  for (int attempts = 0; attempts < 30 && p != FINGERPRINT_OK; attempts++) {
    p = finger.getImage();
    delay(500);
  }

  if (p != FINGERPRINT_OK) {
    Serial.println("ERR:No finger detected on second scan");
    return false;
  }

  // Convert image to character file 2
  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) {
    Serial.println("ERR:Second image conversion failed");
    return false;
  }

  // Create model
  p = finger.createModel();
  if (p != FINGERPRINT_OK) {
    Serial.println("ERR:Models do not match");
    return false;
  }

  // Store model
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

/**
 * Scan and verify fingerprint against enrolled templates.
 * Returns the matched template ID, or negative on error.
 */
int verifyFingerprint() {
  Serial.println("OK:Place finger on sensor");

  // Wait for finger
  int p = -1;
  for (int attempts = 0; attempts < 30 && p != FINGERPRINT_OK; attempts++) {
    p = finger.getImage();
    delay(500);
  }

  if (p != FINGERPRINT_OK) {
    Serial.println("ERR:No finger detected");
    return -1;
  }

  // Convert image
  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) {
    Serial.println("ERR:Image conversion failed");
    return -1;
  }

  // Search database
  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    return finger.fingerID;
  } else if (p == FINGERPRINT_NOTFOUND) {
    return -2;  // No match found
  } else {
    return -1;  // Error
  }
}

/**
 * Delete a fingerprint template by ID.
 */
bool deleteFingerprint(int id) {
  return finger.deleteModel(id) == FINGERPRINT_OK;
}

/**
 * Get the number of enrolled fingerprint templates.
 */
uint8_t getFingerprintCount() {
  return finger.getTemplateCount();
}