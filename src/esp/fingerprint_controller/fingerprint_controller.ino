/*
 * Smart Appointment Scheduling Kiosk
 * ESP32 Firmware - Fingerprint Controller
 * Board: ESP32 Dev Module
 * Communicates with RPi4 over UART at 115200 baud.
 * Controls AS608 fingerprint sensor via Serial1 at 57600 baud.
 *
 * Features (ported from SmartCabinet reference):
 *  - Sensor verification on startup
 *  - Enroll fingerprint (specified ID or auto-assign)
 *  - Continuous monitoring mode
 *  - Verify/search fingerprint
 *  - List enrolled IDs
 *  - Delete single or all fingerprints
 *  - Serial monitor debugging throughout
 */

#include "FingerprintAS608.h"

#define FINGERPRINT_RX 16
#define FINGERPRINT_TX 17
#define MAX_ENROLLED_FINGERPRINTS 127

HardwareSerial fingerSerial(1);
FingerprintAS608 fpSensor(fingerSerial);

const int MAX_CMD_LEN = 64;
char cmdBuffer[MAX_CMD_LEN];
int cmdIndex = 0;

// Monitoring mode state
bool monitoringMode = false;
unsigned long lastFingerprintCheck = 0;
const unsigned long FINGERPRINT_CHECK_INTERVAL = 500; // ms

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
  Serial.println("[DEBUG] Commands: PING, FP_ENROLL:<id>, FP_AUTOENROLL, FP_VERIFY,");
  Serial.println("[DEBUG]          FP_SEARCH, FP_DELETE:<id>, FP_COUNT, FP_ID,");
  Serial.println("[DEBUG]          FP_LIST, FP_CLEAR, FP_MONITOR");
}

void loop() {
  // Process incoming serial commands
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

  // Continuous fingerprint monitoring
  if (monitoringMode) {
    if (millis() - lastFingerprintCheck >= FINGERPRINT_CHECK_INTERVAL) {
      lastFingerprintCheck = millis();
      checkFingerprint();
    }
  }

  // Update non-blocking operations if any
  fpSensor.update();

  delay(10);
}

void processCommand(const char* cmd) {
  Serial.print("[DEBUG] Received command: ");
  Serial.println(cmd);

  if (strcmp(cmd, "PING") == 0) {
    Serial.println("PONG");
  }

  else if (strncmp(cmd, "FP_ENROLL:", 10) == 0) {
    int id = atoi(cmd + 10);
    if (id < 1 || id > MAX_ENROLLED_FINGERPRINTS) {
      Serial.println("ERR:ID must be 1-127");
      return;
    }
    handleEnroll((uint16_t)id);
  }

  else if (strcmp(cmd, "FP_AUTOENROLL") == 0) {
    handleAutoEnroll();
  }

  else if (strcmp(cmd, "FP_VERIFY") == 0) {
    handleVerify();
  }

  else if (strcmp(cmd, "FP_SEARCH") == 0) {
    handleSearch();
  }

  else if (strncmp(cmd, "FP_DELETE:", 10) == 0) {
    int id = atoi(cmd + 10);
    if (id < 1 || id > MAX_ENROLLED_FINGERPRINTS) {
      Serial.println("ERR:ID must be 1-127");
      return;
    }
    Serial.print("[DEBUG] Deleting fingerprint ID ");
    Serial.println(id);
    bool ok = fpSensor.deleteFingerprint((uint16_t)id);
    Serial.println(ok ? "OK" : "ERR:Delete failed");
  }

  else if (strcmp(cmd, "FP_COUNT") == 0) {
    int count = fpSensor.getTemplateCount();
    Serial.print("[DEBUG] Template count: ");
    Serial.println(count);
    char response[16];
    snprintf(response, sizeof(response), "OK:%d", count);
    Serial.println(response);
  }

  else if (strcmp(cmd, "FP_ID") == 0) {
    uint16_t lastId = fpSensor.getLastFingerID();
    if (lastId > 0) {
      char response[16];
      snprintf(response, sizeof(response), "OK:%d", lastId);
      Serial.println(response);
    } else {
      Serial.println("ERR:No match");
    }
  }

  else if (strcmp(cmd, "FP_LIST") == 0) {
    handleList();
  }

  else if (strcmp(cmd, "FP_CLEAR") == 0) {
    Serial.println("[DEBUG] Clearing all fingerprints...");
    bool ok = fpSensor.emptyDatabase();
    Serial.println(ok ? "OK" : "ERR:Clear failed");
  }

  else if (strcmp(cmd, "FP_MONITOR") == 0) {
    monitoringMode = !monitoringMode;
    if (monitoringMode) {
      Serial.println("OK:Monitor ON");
      Serial.println("[DEBUG] Monitoring mode enabled - checking fingerprints every 500ms");
    } else {
      Serial.println("OK:Monitor OFF");
      Serial.println("[DEBUG] Monitoring mode disabled");
    }
  }

  else {
    Serial.print("ERR:Unknown command - ");
    Serial.println(cmd);
  }
}

// ---------------------------------------------------------------------------
// Get the next available fingerprint ID (first empty slot)
// ---------------------------------------------------------------------------
uint16_t getNextAvailableID() {
  int templateCount = fpSensor.getTemplateCount();
  Serial.print("[DEBUG] Total fingerprints in database: ");
  Serial.println(templateCount);

  if (templateCount >= MAX_ENROLLED_FINGERPRINTS) {
    return 0;
  }

  // Scan from ID 1 to find first empty slot
  for (uint16_t id = 1; id <= MAX_ENROLLED_FINGERPRINTS; id++) {
    if (fpSensor.loadModel(id) != FINGERPRINT_OK) {
      Serial.print("[DEBUG] Found empty slot at ID: ");
      Serial.println(id);
      return id;
    }
  }

  return 0; // No empty slots found
}

// ---------------------------------------------------------------------------
// SmartCabinet-style enrollment with step-by-step serial feedback
// ---------------------------------------------------------------------------
bool handleEnroll(uint16_t id) {
  Serial.print("[DEBUG] Starting enrollment for ID #");
  Serial.println(id);
  Serial.println("OK:Place finger on sensor");
  Serial.println("OK:Hold still...");

  // Call the library's blocking enroll which handles:
  // - First image capture (with timeout)
  // - Remove finger prompt
  // - Second image capture (with timeout)
  // - Model creation and storage
  if (fpSensor.enroll(id, 30000)) {
    Serial.print("[DEBUG] Enrollment successful! ID #");
    Serial.println(id);
    char response[32];
    snprintf(response, sizeof(response), "FP_ENROLLED:%d", id);
    Serial.println(response);
    return true;
  } else {
    Serial.println("[DEBUG] Enrollment failed!");
    Serial.println("ERR:Enrollment failed - try again");
    return false;
  }
}

// ---------------------------------------------------------------------------
// Auto-enroll: find next available ID and enroll
// ---------------------------------------------------------------------------
bool handleAutoEnroll() {
  Serial.println("[DEBUG] Starting auto-enrollment...");
  uint16_t enrollID = getNextAvailableID();

  if (enrollID == 0) {
    Serial.println("ERR:Database full - maximum capacity reached");
    return false;
  }

  Serial.print("[DEBUG] Auto-assigning ID: ");
  Serial.println(enrollID);
  return handleEnroll(enrollID);
}

// ---------------------------------------------------------------------------
// Verify fingerprint (one-shot)
// ---------------------------------------------------------------------------
void handleVerify() {
  Serial.println("[DEBUG] Verify: place finger on sensor");

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
}

// ---------------------------------------------------------------------------
// Search for fingerprint (detailed / one-shot)
// ---------------------------------------------------------------------------
void handleSearch() {
  Serial.println("[DEBUG] Searching...");

  int id = fpSensor.search();

  if (id > 0) {
    char response[32];
    snprintf(response, sizeof(response), "FP_MATCH:%d", id);
    Serial.println(response);
  } else if (id == 0) {
    Serial.println("FP_NO_MATCH");
  } else {
    Serial.println("ERR:Search failed");
  }
}

// ---------------------------------------------------------------------------
// Check fingerprint (for continuous monitoring)
// ---------------------------------------------------------------------------
void checkFingerprint() {
  int result = fpSensor.authenticate();

  if (result >= 0) {
    // Authentication successful
    Serial.print("[DEBUG] [Monitor] Authentication successful! User ID: ");
    Serial.println(result);
    char response[32];
    snprintf(response, sizeof(response), "FP_MATCH:%d", result);
    Serial.println(response);
  } else if (result == -2) {
    // Finger detected but not matched
    Serial.println("[DEBUG] [Monitor] Authentication failed - no match found");
    Serial.println("FP_NO_MATCH");
  }
  // result == -1: No finger detected or sensor error (silent in monitor mode)
}

// ---------------------------------------------------------------------------
// List all enrolled fingerprint IDs
// ---------------------------------------------------------------------------
void handleList() {
  int count = fpSensor.getTemplateCount();
  Serial.print("[DEBUG] Scanning database. Total enrolled: ");
  Serial.println(count);

  char response[16];
  snprintf(response, sizeof(response), "OK:%d", count);
  Serial.println(response);

  int found = 0;
  for (uint16_t id = 1; id <= MAX_ENROLLED_FINGERPRINTS; id++) {
    if (fpSensor.loadModel(id) == FINGERPRINT_OK) {
      char idLine[16];
      snprintf(idLine, sizeof(idLine), "ID:%d", id);
      Serial.println(idLine);
      found++;
    }
  }

  if (found == 0) {
    Serial.println("[DEBUG] No enrolled fingerprints found");
  }
}
