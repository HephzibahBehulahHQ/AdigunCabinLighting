#ifndef ADIGUN_FIRMWARE_CORE_H
#define ADIGUN_FIRMWARE_CORE_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define FW_PROTOCOL_VERSION 1u
#define FW_MAX_PAYLOAD 48u
#define FW_FRAME_OVERHEAD 11u
#define FW_MAX_FRAME (FW_MAX_PAYLOAD + FW_FRAME_OVERHEAD)

typedef enum {
    FW_MSG_HELLO = 1,
    FW_MSG_CAPABILITIES = 2,
    FW_MSG_AUTH_BEGIN = 3,
    FW_MSG_READ_STATUS = 4,
    FW_MSG_SET_TARGETS = 5,
    FW_MSG_PLAY_SCENE = 6,
    FW_MSG_STOP = 7,
    FW_MSG_HEARTBEAT = 8,
    FW_MSG_CLEAR_FAULT = 9,
    FW_MSG_ENTER_BOOTLOADER = 10
} fw_message_type_t;

typedef enum {
    FW_STATE_BOOT_SELF_TEST = 0,
    FW_STATE_SAFE_DISABLED,
    FW_STATE_READY,
    FW_STATE_ACTIVE_BENCH,
    FW_STATE_FAULT_LATCHED,
    FW_STATE_MAINTENANCE,
    FW_STATE_UPDATING
} fw_state_t;

typedef enum {
    FW_RESULT_ACCEPTED_NO_OUTPUT = 0,
    FW_RESULT_OUTPUTS_DISABLED,
    FW_RESULT_FAULT_LATCHED,
    FW_RESULT_INVALID_FRAME,
    FW_RESULT_STALE_SEQUENCE,
    FW_RESULT_UNSUPPORTED_MESSAGE
} fw_result_t;

typedef struct {
    uint8_t version;
    uint8_t type;
    uint8_t payload_length;
    uint16_t sequence;
    const uint8_t *payload;
} fw_frame_view_t;

typedef struct {
    fw_state_t state;
    bool has_last_sequence;
    uint16_t last_sequence;
} fw_controller_t;

uint32_t fw_crc32(const uint8_t *data, size_t length);
bool fw_decode_frame(const uint8_t *bytes, size_t length, fw_frame_view_t *frame);
void fw_controller_init(fw_controller_t *controller);
void fw_controller_self_test_complete(fw_controller_t *controller, bool passed);
fw_result_t fw_controller_accept(fw_controller_t *controller,
                                 const fw_frame_view_t *frame);
bool fw_physical_outputs_enabled(void);

#endif
