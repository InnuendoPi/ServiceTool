# ServiceTool guide

## Getting started

ServiceTool connects your computer to a Brautomat. Select the correct device
first: device actions apply to that selection.

### Connect a device

1. Connect the Brautomat to your computer via USB.
2. Open **Device** and select its serial port. Use the circular arrow beside the
   port list to refresh it.
3. Enter the URL configured for that Brautomat.
4. Run the connection check beside the URL and read the status at the top right.

### Find a task

- **Device:** connection and WiFi.
- **Firmware:** firmware installation, web files and device web language.
- **Data:** file management, backup and restore.
- **Service:** Serial Monitor, Telegraf, Maintenance, Migration and the optional
  Test Runner.
- **Three-dot menu:** Settings, Check for updates and Help.

Help opens the chapter for the current area. Search includes chapter text as
well as titles.

### Read the header

Select the active device on the left. Its serial port, URL and detected firmware
version follow, separated by dots. The connection and process status is on the
right. Check this row before running a device action.

The three-dot menu provides **Settings**, **Check for updates** and **Help**.
Use the previous and next buttons at the bottom of help to change chapters. On
narrow windows the chapter navigation appears above the article.

**Firmware** updates the Brautomat. **Check for updates** in the menu checks the
ServiceTool installation on your computer.

Continue with [Devices & WiFi](#devices--wifi).

## Devices & WiFi

### Understand the status

- **Online · No active process:** HTTP is available and the device reports no
  active process.
- **Online · Process status unknown:** the device is reachable, but its process
  state could not be determined. This does not confirm that it is idle.
- **Online** with process details: a mash or fermentation process was reported.
- **Connected via serial:** the device was detected through USB. This does not
  confirm WiFi access.
- **No device:** check the connection and selection.

### Configure WiFi

1. Select the device and its serial port under **Device**.
2. Click the scan arrow in the WiFi area and wait for completion.
3. Select a network or enter its SSID. Enter the password.
4. Click the save icon. The device saves the credentials and restarts.
5. Wait for the restart, then check the connection again. Verify the URL if only
   serial access is detected.

**WiFi Reset** resets the WiFi configuration; it is not another scan button.

### Switch devices

**Active device** switches the saved serial-port and URL pair. A single profile
is called **Brautomat**; multiple profiles are named **Master**, **worker1**,
**worker2** and **worker3**.

Add profiles under [Settings → Devices](#settings). Wait for running device
operations before switching profiles.

### A new device has no WiFi yet

Connect it through USB first. Save its profile with the detected serial port and
the URL you intend to use. Select that profile and configure its WiFi.

Saving a URL in ServiceTool does not change the Brautomat's network name. The
address must match the actual device configuration. Use distinct addresses for
multiple devices.

:::details Technical background

HTTP detection and process status use separate requests. A device can therefore
be online while its process state is unknown. With multiple profiles, a missing
saved serial port is not replaced automatically with another detected port.

:::

## Firmware

### Select a package

1. Open **Firmware** and check the active device and its reported version.
2. Choose **Latest Release**, **Latest Development**, **Special Version** or
   **Open directory**.
3. For **Special Version**, select a specific version. For **Open directory**,
   select the local package folder.
4. Check the displayed source and available actions. Resolve missing package
   files before installation.

### Install via USB

1. Select the correct port under **Device**, then return to **Firmware**.
2. Select the flash baud rate. Review **Erase Flash** and **Flash LittleFS**:
   these affect device storage and its filesystem.
3. Click **Install selected package over USB** and watch progress and status.
   Keep USB and power connected until writing has finished.

Use [Migration](#migration) when moving from the old partition layout to the
ServiceApp layout.

### Update over WiFi

1. Check that the device is **Online** and reports no active process.
2. Under **Update published firmware**, click **Check for firmware updates**.
   This checks GitHub for published firmware, independently of the selected
   package above.
3. Compare the current and offered versions in the dialog.
4. Start the offered update after reviewing them. An active or unknown process
   state prevents starting it.

### Use a downloaded ZIP

Extract the firmware package first. Select **Open directory** and use the folder
button to select the directory containing its firmware files. A ZIP archive
itself is not a package directory. If files or version information are missing,
read the error instead of mixing files from different versions.

### Update web files

Select the desired firmware package, then use the web-files update action. The
device must be reachable over WiFi. This updates browser resources and language
files, not the main firmware.

Select a repository package source for this. The separate web-files update and
language installation are unavailable with **Open directory**.

### Change the device web language

Select an available language and use **Change language**. Files come from the
selected package source. If the list is unavailable, check the package version,
connection and error message.

The language of ServiceTool itself is changed under **Settings**.

:::details Package generations

Firmware before 1.66 uses the build directory; 1.66 and later use Updates.
ServiceApp packages also need the matching ServiceApp image. Local packages must
contain the corresponding files.

:::

## Data

### Transfer files

1. Open **Data → Files** and select mash plans, fermenter plans, profiles or
   configuration.
2. Identify the device and local-inventory sides.
3. Select a file and the required copy action. Review any overwrite prompt.
4. Read the result. Rename and delete actions apply to the selected entry.

### Back up and restore configuration

1. Open **Data → Backup & restore**.
2. Create a configuration backup. It is saved locally and appears in the list.
3. To restore, select the appropriate backup or an external JSON file.
4. Check the active device and selected backup before restoring.

### Different backup types

- A **configuration backup** contains settings provided by the device backup
  feature.
- **Firmware Backup** reads the active app partition via USB.
- A **migration backup** contains the complete flash for migration recovery.

These are not interchangeable. See [Migration](#migration) for an interrupted
migration.

The **Firmware Backup** interface also requires an online connection. The saved
firmware image is not a complete backup of settings and the filesystem.

## Service

### Serial Monitor

1. Open **Service → Serial Monitor**.
2. Check the port and baud rate, then start the monitor.
3. Use the output for diagnosis and copy relevant error messages.

Flashing and firmware backup also need the serial port. ServiceTool handles the
port handover; check the resulting state after the operation.

### Telegraf

Open **Service → Telegraf** to configure its executable, polling interval,
templates and output destinations.

1. Review the existing configuration and enable the destinations you need.
2. Enter destination settings and credentials.
3. Save the configuration and use the start action.
4. Check status and logs. Use the stop action to end the session.

The password-saving option controls whether passwords are saved. A running
Telegraf session can prevent switching device profiles.

### Maintenance

Use **Service → Maintenance** to enter or leave maintenance mode. Read warnings
about active processes or a blocked main firmware.

If a repair is offered, read its reason and follow the provided workflow. See
[Troubleshooting](#troubleshooting).

### Repair blocked main firmware

1. Read the reason under **Service → Maintenance**. Repair is offered for an
   incomplete main firmware write.
2. Select the intended package source and version under **Firmware**.
3. Return to **Service → Maintenance** and click **Repair main firmware**.
4. Review the package named in the confirmation, then confirm and wait for
   verification and the result.

Resetting brewing state is a different operation from repairing firmware. Do not
use it as a general replacement for the offered repair.

### Test Runner

This area is available only with the required local development environment.
Normal maintenance does not require it.

:::details Test Runner requirements

Detection requires the test-automation documents, the Test Runner project, at
least one valid suite configuration and Node.js. Without those prerequisites the
entry stays hidden. Explicit hiding through hide_test remains effective.

:::

## Migration

Migration changes an older device's partition layout to the ServiceApp layout.
It is more than a normal firmware update.

### Requirements

Supported source versions are **1.62.0 through 1.65.5**, targeting **1.66.x,
1.67.x or 1.70.x**, on supported ESP32 devices with 4 MiB flash and the old
symmetric layout. ServiceTool checks the device before writing.

### Run migration

1. Finish mash and fermentation processes. Connect USB and make sure the device
   URL is reachable.
2. Verify the active device and serial port under **Device**.
3. Open **Service → Migration** and select the package source and target
   package.
4. Start migration. Keep power and USB connected until completion.
5. Read the final result; starting an operation does not mean it succeeded.

A complete flash backup is created first. New images are then installed and
preserved data is checked.

### Recover after an interruption

Follow the displayed recovery session. **Resume migration** requires the
installation files to remain in the cache. Alternatively, use **Restore Backup**
and select the matching migration backup folder.

The backup belongs to the original device. Restoration requires USB, not WiFi.
Other serial actions may remain blocked until recovery.

:::details Backup and verification

Migration backups are stored under backups/migrations and include
flash-backup.bin, nvs.bin and report.json. Normal migration reads the complete
flash once for backup, then reads back NVS and LittleFS after writing. esptool
verifies the images. Backup restoration uses a complete read-back verification.

:::

## Settings

Open **Three-dot menu → Settings**.

### Language and debug output

The language setting affects ServiceTool. Change the Brautomat web language
under **Firmware**. Debug output reveals additional status information for
diagnosis.

### Add another device

1. Under **Devices**, choose **Add device**.
2. Select its serial port and enter its unique URL.
3. Save the profile. The interface reloads with that device selected.
4. Configure WiFi under **Device** if needed.

Both port and URL are required. The URL need not be reachable yet. The first
device defaults to `http://brautomat`; existing settings are preserved. Further
devices start with an empty URL field.

### Edit or remove a profile

Select the device at the top. **Settings → Devices** shows the selection. **Edit
profile** opens its port and URL.

Additional devices can be removed in the profile dialog. The first profile is
retained. Removing a profile does not delete data on the Brautomat.

### Update ServiceTool

Choose **Three-dot menu → Check for updates**. Offered updates are downloaded as
ZIP files and their checksums verified. The update dialog indicates whether
automatic installation is supported. If supported, ServiceTool asks for
confirmation before closing, updating and restarting. Otherwise it provides the
package for manual installation.

## Troubleshooting

### No serial port found

Check USB and power, then refresh the port list under **Device**. With multiple
profiles, check the saved port under **Settings → Devices**. Another connected
device is not selected automatically.

### Serial connection only

Check WiFi credentials and this device's URL. After a restart, allow time for
reconnection and run the device check again.

### WiFi scan does not finish

Wait for any current check, then retry. For **No serial response**, check the
port and whether another program is using it. Copy the exact error if the
problem persists.

### Online, but process state unknown

Run the device check again. The process request did not return a usable state.
This proves neither an active nor a finished process. Actions requiring a
confirmed idle state may remain unavailable.

### Main firmware does not boot

If the ServiceApp is reachable, read the boot-blocker message under **Service →
Maintenance**. If **Repair main firmware** is offered, select a suitable
firmware source and follow that workflow. WiFi access is required for the
transfer.

Flashing again does not necessarily clear a stored boot blocker. Do not change
NVS entries by guesswork. For an interrupted migration use [Migration
recovery](#migration).

### Missing languages or firmware package

Check the selected source. **Special Version** requires a specific version.
Online packages require access to their source; local folders must contain the
matching files.

### Report a problem

- Include ServiceTool and reported firmware versions.
- State the active device, connection status and attempted action.
- Include the exact error and relevant status lines.

Remove passwords and other credentials from text and screenshots before sharing
them.
