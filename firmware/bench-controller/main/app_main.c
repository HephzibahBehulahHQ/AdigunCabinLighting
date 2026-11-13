#include "esp_log.h"
#include "firmware_core.h"

static const char *TAG = "adigun_bench";

void app_main(void)
{
    fw_controller_t controller;
    fw_controller_init(&controller);

    /* No GPIO, PWM, transport, or physical-output initialization in this milestone. */
    fw_controller_self_test_complete(&controller, true);
    ESP_LOGW(TAG, "Firmware core build %s; state=%u; physical output disabled",
             "0.1.0", (unsigned)controller.state);
}
