import unittest
from unittest.mock import patch

import app


class UnresponsiveDeviceTests(unittest.TestCase):
    def test_existing_port_without_response_is_not_connected(self):
        with patch.object(app, 'device_status', side_effect=TimeoutError('HTTP timeout')), \
                patch.object(app, 'has_pyserial', return_value=True), \
                patch.object(app, 'maintenance_status', return_value={'active': None}), \
                patch.object(app, 'serial_firmware_version', side_effect=RuntimeError('No serial response')):
            result = app.combined_device_status('http://device', 'COM3', serial_timeout=5)
        self.assertEqual(result['state'], 'offline')
        self.assertEqual(result['serial_port'], 'COM3')
        self.assertEqual(result['version_source'], 'unavailable')
        self.assertEqual(result['serial_error'], 'No serial response')


if __name__ == '__main__':
    unittest.main()
