#include "firmware_core.h"

#include <assert.h>
#include <stdint.h>
#include <stdio.h>

static void write_le32(uint8_t *bytes, uint32_t value)
{
    bytes[0] = (uint8_t)value;
    bytes[1] = (uint8_t)(value >> 8u);
    bytes[2] = (uint8_t)(value >> 16u);
    bytes[3] = (uint8_t)(value >> 24u);
}

static size_t make_frame(uint8_t *bytes, uint8_t type, uint16_t sequence)
{
    bytes[0] = 0xA5u;
    bytes[1] = 0x5Au;
    bytes[2] = FW_PROTOCOL_VERSION;
    bytes[3] = type;
    bytes[4] = 0u;
    bytes[5] = (uint8_t)sequence;
    bytes[6] = (uint8_t)(sequence >> 8u);
    write_le32(&bytes[7], fw_crc32(&bytes[2], 5u));
    return FW_FRAME_OVERHEAD;
}

int main(void)
{
    static const uint8_t check[] = "123456789";
    assert(fw_crc32(check, sizeof(check) - 1u) == 0xCBF43926u);

    uint8_t bytes[FW_MAX_FRAME] = {0};
    fw_frame_view_t frame;
    size_t length = make_frame(bytes, FW_MSG_READ_STATUS, 0x1234u);
    assert(fw_decode_frame(bytes, length, &frame));
    assert(frame.sequence == 0x1234u);
    assert(frame.type == FW_MSG_READ_STATUS);
    assert(!fw_decode_frame(bytes, FW_FRAME_OVERHEAD - 1u, &frame));
    assert(!fw_decode_frame(bytes, FW_MAX_FRAME + 1u, &frame));
    bytes[4] = (uint8_t)(FW_MAX_PAYLOAD + 1u);
    assert(!fw_decode_frame(bytes, length, &frame));
    length = make_frame(bytes, FW_MSG_READ_STATUS, 0x1234u);
    assert(fw_decode_frame(bytes, length, &frame));

    fw_controller_t controller;
    fw_controller_init(&controller);
    assert(controller.state == FW_STATE_BOOT_SELF_TEST);
    fw_controller_self_test_complete(&controller, true);
    assert(controller.state == FW_STATE_SAFE_DISABLED);
    assert(fw_controller_accept(&controller, &frame) == FW_RESULT_ACCEPTED_NO_OUTPUT);
    assert(fw_controller_accept(&controller, &frame) == FW_RESULT_STALE_SEQUENCE);
    assert(!fw_physical_outputs_enabled());

    length = make_frame(bytes, FW_MSG_SET_TARGETS, 0x1235u);
    assert(fw_decode_frame(bytes, length, &frame));
    assert(fw_controller_accept(&controller, &frame) == FW_RESULT_OUTPUTS_DISABLED);

    length = make_frame(bytes, FW_MSG_HEARTBEAT, 0x1234u);
    assert(fw_decode_frame(bytes, length, &frame));
    assert(fw_controller_accept(&controller, &frame) == FW_RESULT_STALE_SEQUENCE);

    fw_controller_init(&controller);
    fw_controller_self_test_complete(&controller, true);
    length = make_frame(bytes, FW_MSG_HEARTBEAT, 0xFFFFu);
    assert(fw_decode_frame(bytes, length, &frame));
    assert(fw_controller_accept(&controller, &frame) == FW_RESULT_ACCEPTED_NO_OUTPUT);
    length = make_frame(bytes, FW_MSG_HEARTBEAT, 0u);
    assert(fw_decode_frame(bytes, length, &frame));
    assert(fw_controller_accept(&controller, &frame) == FW_RESULT_ACCEPTED_NO_OUTPUT);
    length = make_frame(bytes, FW_MSG_HEARTBEAT, 0x8000u);
    assert(fw_decode_frame(bytes, length, &frame));
    assert(fw_controller_accept(&controller, &frame) == FW_RESULT_STALE_SEQUENCE);

    fw_controller_init(&controller);
    fw_controller_self_test_complete(&controller, true);
    frame.version = (uint8_t)(FW_PROTOCOL_VERSION + 1u);
    assert(fw_controller_accept(&controller, &frame) == FW_RESULT_INVALID_FRAME);
    frame.version = FW_PROTOCOL_VERSION;
    frame.payload_length = 1u;
    frame.payload = NULL;
    assert(fw_controller_accept(&controller, &frame) == FW_RESULT_INVALID_FRAME);
    frame.payload_length = 0u;
    frame.payload = bytes;
    assert(fw_controller_accept(&controller, &frame) == FW_RESULT_ACCEPTED_NO_OUTPUT);

    bytes[7] ^= 0x01u;
    assert(!fw_decode_frame(bytes, FW_FRAME_OVERHEAD, &frame));

    fw_controller_init(&controller);
    fw_controller_self_test_complete(&controller, false);
    length = make_frame(bytes, FW_MSG_READ_STATUS, 1u);
    assert(fw_decode_frame(bytes, length, &frame));
    assert(fw_controller_accept(&controller, &frame) == FW_RESULT_FAULT_LATCHED);
    puts("firmware host checks passed (protocol core only; no hardware tested)");
    return 0;
}
