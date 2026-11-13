# ESP32-S3 bench-controller firmware core

This is the first compileable firmware increment for the ESP32-S3 development-board family, using Espressif ESP-IDF v6.1. It provides a bounded protocol-frame validator (SOF, version, message type, payload length, sequence and CRC-32) plus a fail-closed state core. GitHub CI builds it for `esp32s3` and runs its portable host checks.

## Current boundary

This release does **not** initialize GPIO, PWM, USB/UART transport, a driver, a lamp, or any physical output. `SET_TARGETS` and `PLAY_SCENE` are rejected in `SAFE_DISABLED`; no state can enable outputs. `app_main` only completes the software startup transition and logs the disabled state. The parser is not connected to a transport and is not an authenticated device protocol yet.

The ESP32-S3-DevKitC-1 family is a development target candidate, not a verified board installation. The exact module suffix, board revision, peripheral wiring, driver, interlock, current limit, sensors, and approved safe state are not available in this workspace. No pin map or electrical ratings are inferred. Do not flash or connect this build to a driver or aircraft equipment.

## Build

With Espressif ESP-IDF v6.1 installed:

```sh
cd firmware/bench-controller
idf.py set-target esp32s3
idf.py build
```

The portable protocol-core checks can be run with a C11 compiler:

```sh
cc -std=c11 -Wall -Wextra -Werror -Ifirmware/bench-controller/main \
  firmware/bench-controller/main/firmware_core.c \
  firmware/bench-controller/tests/host_test.c -o /tmp/adigun-fw-host-test
/tmp/adigun-fw-host-test
```

Flashing, serial loopback, bench operation, hardware-in-the-loop, output timing, fault response, and electrical safety are **NOT TESTED**. These require an exact board on hand, a reviewed isolated/current-limited rig and independent interlock, approved driver characteristics, and witnessed bench evidence. Passing the host checks and CI compile does not validate firmware behavior on hardware.
