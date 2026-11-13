#include "firmware_core.h"

#define FW_SOF_0 0xA5u
#define FW_SOF_1 0x5Au
#define FW_HEADER_SIZE 7u
#define FW_CRC_SIZE 4u

static uint32_t read_le32(const uint8_t *bytes)
{
    return ((uint32_t)bytes[0]) | ((uint32_t)bytes[1] << 8u) |
           ((uint32_t)bytes[2] << 16u) | ((uint32_t)bytes[3] << 24u);
}

uint32_t fw_crc32(const uint8_t *data, size_t length)
{
    uint32_t crc = 0xFFFFFFFFu;
    for (size_t index = 0; index < length; ++index) {
        crc ^= data[index];
        for (uint8_t bit = 0; bit < 8u; ++bit) {
            const uint32_t mask = (uint32_t)-(int32_t)(crc & 1u);
            crc = (crc >> 1u) ^ (0xEDB88320u & mask);
        }
    }
    return ~crc;
}

bool fw_decode_frame(const uint8_t *bytes, size_t length, fw_frame_view_t *frame)
{
    if (bytes == NULL || frame == NULL || length < FW_FRAME_OVERHEAD ||
        length > FW_MAX_FRAME || bytes[0] != FW_SOF_0 || bytes[1] != FW_SOF_1) {
        return false;
    }

    const uint8_t payload_length = bytes[4];
    if (bytes[2] != FW_PROTOCOL_VERSION || payload_length > FW_MAX_PAYLOAD ||
        length != (size_t)FW_FRAME_OVERHEAD + payload_length) {
        return false;
    }

    const size_t crc_offset = FW_HEADER_SIZE + payload_length;
    if (fw_crc32(&bytes[2], crc_offset - 2u) != read_le32(&bytes[crc_offset])) {
        return false;
    }

    frame->version = bytes[2];
    frame->type = bytes[3];
    frame->payload_length = payload_length;
    frame->sequence = (uint16_t)bytes[5] | ((uint16_t)bytes[6] << 8u);
    frame->payload = &bytes[FW_HEADER_SIZE];
    return true;
}

void fw_controller_init(fw_controller_t *controller)
{
    if (controller != NULL) {
        controller->state = FW_STATE_BOOT_SELF_TEST;
        controller->has_last_sequence = false;
        controller->last_sequence = 0u;
    }
}

void fw_controller_self_test_complete(fw_controller_t *controller, bool passed)
{
    if (controller != NULL && controller->state == FW_STATE_BOOT_SELF_TEST) {
        controller->state = passed ? FW_STATE_SAFE_DISABLED : FW_STATE_FAULT_LATCHED;
    }
}

bool fw_physical_outputs_enabled(void)
{
    return false;
}

fw_result_t fw_controller_accept(fw_controller_t *controller,
                                 const fw_frame_view_t *frame)
{
    if (controller == NULL || frame == NULL) return FW_RESULT_INVALID_FRAME;

    if (frame->version != FW_PROTOCOL_VERSION || frame->payload_length > FW_MAX_PAYLOAD ||
        (frame->payload_length > 0u && frame->payload == NULL)) {
        return FW_RESULT_INVALID_FRAME;
    }

    if (controller->has_last_sequence) {
        /* RFC-1982-style half-range ordering for a 16-bit per-session counter. */
        const uint16_t delta = (uint16_t)(frame->sequence - controller->last_sequence);
        if (delta == 0u || delta >= 0x8000u) return FW_RESULT_STALE_SEQUENCE;
    }
    controller->last_sequence = frame->sequence;
    controller->has_last_sequence = true;

    if (controller->state == FW_STATE_FAULT_LATCHED) return FW_RESULT_FAULT_LATCHED;
    if (controller->state != FW_STATE_SAFE_DISABLED) return FW_RESULT_OUTPUTS_DISABLED;

    switch (frame->type) {
    case FW_MSG_HELLO:
    case FW_MSG_CAPABILITIES:
    case FW_MSG_READ_STATUS:
    case FW_MSG_STOP:
    case FW_MSG_HEARTBEAT:
        return FW_RESULT_ACCEPTED_NO_OUTPUT;
    case FW_MSG_SET_TARGETS:
    case FW_MSG_PLAY_SCENE:
    case FW_MSG_AUTH_BEGIN:
    case FW_MSG_CLEAR_FAULT:
    case FW_MSG_ENTER_BOOTLOADER:
        return FW_RESULT_OUTPUTS_DISABLED;
    default:
        return FW_RESULT_UNSUPPORTED_MESSAGE;
    }
}
