import os

file_path = r'C:\esp\usb_dongle\main\cmd_wifi.c'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'tusb_config.h' in line:
        continue # avoid redefinition warning
    elif line.strip() == '#include "tinyusb.h"':
        new_lines.append('#include "tusb.h"\n')
        new_lines.append('#include "tinyusb.h"\n')
        new_lines.append('#include "tinyusb_net.h"\n')
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("cmd_wifi.c updated with correct headers")
