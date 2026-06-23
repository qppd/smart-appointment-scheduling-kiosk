#include "FingerprintAS608.h"

FingerprintAS608::FingerprintAS608(HardwareSerial &serial, uint32_t baud)
  : _serial(serial), _finger(&serial), _baud(baud) {}

void FingerprintAS608::begin() {
  _serial.begin(_baud);
  delay(100);
  _state = IDLE;
  _searchCb = nullptr;
}

bool FingerprintAS608::verifySensor() {
  return _finger.verifyPassword();
}

int FingerprintAS608::getTemplateCount() {
  return _finger.getTemplateCount();
}

bool FingerprintAS608::isFingerDetected() {
  uint8_t p = _finger.getImage();
  return (p == FINGERPRINT_OK);
}

int FingerprintAS608::authenticate() {
  uint8_t p = _finger.getImage();
  if (p != FINGERPRINT_OK) {
    return -1;
  }

  p = _finger.image2Tz();
  if (p != FINGERPRINT_OK) {
    return -2;
  }

  p = _finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    return _finger.fingerID;
  } else if (p == FINGERPRINT_NOTFOUND) {
    return -2;
  } else {
    return -1;
  }
}

bool FingerprintAS608::enroll(uint16_t id, unsigned long timeoutMs) {
  if (id == 0) {
    return false;
  }

  int p = -1;
  unsigned long deadline = millis() + timeoutMs;

  // Step 1: Get first fingerprint image
  while (millis() < deadline) {
    p = _finger.getImage();
    if (p == FINGERPRINT_OK) {
      Serial.println("[FingerprintAS608] First image taken");
      break;
    } else if (p == FINGERPRINT_NOFINGER) {
      delay(100);
    } else {
      Serial.println("[FingerprintAS608] Error capturing first image");
      return false;
    }
  }
  if (p != FINGERPRINT_OK) {
    Serial.println("[FingerprintAS608] Timed out waiting for first finger");
    return false;
  }

  // Convert first image to template 1
  p = _finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    Serial.println("[FingerprintAS608] Failed to convert first image");
    return false;
  }
  Serial.println("[FingerprintAS608] First image converted");

  // Step 2: Wait for finger removal
  Serial.println("[FingerprintAS608] Remove finger");
  deadline = millis() + timeoutMs;
  delay(2000);
  p = 0;
  while (millis() < deadline && p != FINGERPRINT_NOFINGER) {
    p = _finger.getImage();
  }

  // Step 3: Get second fingerprint image
  Serial.println("[FingerprintAS608] Place same finger again");
  deadline = millis() + timeoutMs;
  p = -1;
  while (millis() < deadline) {
    p = _finger.getImage();
    if (p == FINGERPRINT_OK) {
      Serial.println("[FingerprintAS608] Second image taken");
      break;
    } else if (p == FINGERPRINT_NOFINGER) {
      delay(100);
    } else {
      Serial.println("[FingerprintAS608] Error capturing second image");
      return false;
    }
  }
  if (p != FINGERPRINT_OK) {
    Serial.println("[FingerprintAS608] Timed out waiting for second finger");
    return false;
  }

  // Convert second image to template 2
  p = _finger.image2Tz(2);
  if (p != FINGERPRINT_OK) {
    Serial.println("[FingerprintAS608] Failed to convert second image");
    return false;
  }
  Serial.println("[FingerprintAS608] Second image converted");

  // Step 4: Create model from both templates
  Serial.println("[FingerprintAS608] Creating model...");
  p = _finger.createModel();
  if (p == FINGERPRINT_OK) {
    Serial.println("[FingerprintAS608] Prints matched!");
  } else if (p == FINGERPRINT_ENROLLMISMATCH) {
    Serial.println("[FingerprintAS608] Fingerprints did not match");
    return false;
  } else {
    Serial.println("[FingerprintAS608] Error creating model");
    return false;
  }

  // Step 5: Store the model
  p = _finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    Serial.print("[FingerprintAS608] Stored! ID #");
    Serial.println(id);
    return true;
  } else if (p == FINGERPRINT_BADLOCATION) {
    Serial.println("[FingerprintAS608] Could not store in that location");
    return false;
  } else if (p == FINGERPRINT_FLASHERR) {
    Serial.println("[FingerprintAS608] Error writing to flash");
    return false;
  } else {
    Serial.println("[FingerprintAS608] Unknown storage error");
    return false;
  }
}

bool FingerprintAS608::deleteFingerprint(uint16_t id) {
  if (id == 0) {
    return false;
  }

  uint8_t p = _finger.deleteModel(id);
  if (p == FINGERPRINT_OK) {
    return true;
  } else {
    return false;
  }
}

bool FingerprintAS608::emptyDatabase() {
  uint8_t p = _finger.emptyDatabase();
  if (p == FINGERPRINT_OK) {
    return true;
  } else {
    return false;
  }
}

uint8_t FingerprintAS608::loadModel(uint16_t id) {
  return _finger.loadModel(id);
}

int FingerprintAS608::search() {
  int p = _finger.getImage();
  if (p != FINGERPRINT_OK) return -1;
  if (_finger.image2Tz() != FINGERPRINT_OK) return -1;
  int res = _finger.fingerSearch();
  if (res == FINGERPRINT_OK) return _finger.fingerID;
  if (res == FINGERPRINT_NOTFOUND) return 0;
  return -1;
}

bool FingerprintAS608::startSearch(SearchCallback cb) {
  if (_state != IDLE) return false;
  _searchCb = cb;
  _state = SEARCHING;
  return true;
}

void FingerprintAS608::update() {
  if (_state == IDLE) return;
  int p = _finger.getImage();
  if (p != FINGERPRINT_OK) return;
  if (_finger.image2Tz() != FINGERPRINT_OK) {
    if (_searchCb) _searchCb(-1);
    _state = IDLE;
    return;
  }
  int res = _finger.fingerSearch();
  if (res == FINGERPRINT_OK) {
    if (_searchCb) _searchCb(_finger.fingerID);
  } else if (res == FINGERPRINT_NOTFOUND) {
    if (_searchCb) _searchCb(0);
  } else {
    if (_searchCb) _searchCb(-1);
  }
  _state = IDLE;
}
