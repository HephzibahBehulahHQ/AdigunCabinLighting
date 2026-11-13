#include "esp_log.h"
#include "firmware_core.h"

static const char *TAG = "adigun_bench";

static bool firmware_self_test(void)
{
    static const uint8_t check[] = "123456789";
    return fw_crc32(check, sizeof(check) - 1u) == 0xCBF43926u;
}

void app_main(void)
{
    fw_controller_t controller;
    fw_controller_init(&controller);

    /* No GPIO, PWM, transport, or physical-output initialization in this milestone. */
    fw_controller_self_test_complete(&controller, firmware_self_test());
    if (controller.state == FW_STATE_FAULT_LATCHED) {
        ESP_LOGE(TAG, "Firmware self-test failed; outputs remain disabled");
        return;
    }
    ESP_LOGW(TAG, "Firmware core build %s; state=%u; physical output disabled",
             "0.1.0", (unsigned)controller.state);
}
