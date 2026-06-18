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

bool FingerprintAS608::enroll(uint16_t id) {
  if (id == 0) {
    return false;
  }

  int p = -1;

  while (p != FINGERPRINT_OK) {
    p = _finger.getImage();
    if (p == FINGERPRINT_OK) {
      // Image taken
    } else if (p == FINGERPRINT_NOFINGER) {
      delay(100);
    } else {
      return false;
    }
  }

  p = _finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    return false;
  }

  delay(2000);
  p = 0;
  while (p != FINGERPRINT_NOFINGER) {
    p = _finger.getImage();
  }

  p = -1;
  while (p != FINGERPRINT_OK) {
    p = _finger.getImage();
    if (p == FINGERPRINT_OK) {
      // Image taken
    } else if (p == FINGERPRINT_NOFINGER) {
      delay(100);
    } else {
      return false;
    }
  }

  p = _finger.image2Tz(2);
  if (p != FINGERPRINT_OK) {
    return false;
  }

  p = _finger.createModel();
  if (p != FINGERPRINT_OK) {
    return false;
  }

  p = _finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    return true;
  } else {
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
