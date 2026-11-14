#include "firmware_core.h"

#include <stddef.h>
#include <stdint.h>

/* Bounded CI fuzz target for untrusted frame bytes. */
int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size)
{
    fw_frame_view_t frame;
    if (fw_decode_frame(data, size, &frame)) {
        fw_controller_t controller;
        fw_controller_init(&controller);
        fw_controller_self_test_complete(&controller, true);
        (void)fw_controller_accept(&controller, &frame);
    }
    return 0;
}
