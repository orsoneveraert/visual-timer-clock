# OpenSCAD Clock

This folder contains a simple parametric wall-clock style assembly with an exploded view.

Files:
- `exploded_clock.scad`: main OpenSCAD model
- `isometric_outline_clock.scad`: 2D isometric outline projection of the exploded assembly
- `visual_timer_clock.scad`: large minimalist wall-mounted visual timer clock with exploded internal assemblies
- `webapp/`: interactive Three.js frontend for the visual timer clock

Useful modes:
- `render_mode = "assembly"` for the whole model
- `render_mode = "back_case"`
- `render_mode = "dial_spacer"`
- `render_mode = "dial_face"`
- `render_mode = "bezel"`
- `render_mode = "hour_hand"`
- `render_mode = "minute_hand"`
- `render_mode = "second_hand"`
- `render_mode = "center_cap"`

Useful toggles:
- `exploded_view = true` to separate the parts
- `explode_gap = 14` to control separation distance
- `show_led_ring = true` to include the optional ring element in the visual timer model
- `timer_demo_minutes = 35` to change the conceptual displayed remaining time in the OpenSCAD assembly

Visual timer render modes:
- `render_mode = "assembly"`
- `render_mode = "front_lens"`
- `render_mode = "front_bezel_shell"`
- `render_mode = "face_mask"`
- `render_mode = "timer_wipe_disk"`
- `render_mode = "rotating_red_disk"`
- `render_mode = "disk_carrier_hub"`
- `render_mode = "central_knob"`
- `render_mode = "knob_shaft"`
- `render_mode = "front_support_plate"`
- `render_mode = "output_shaft"`
- `render_mode = "motor_pinion"`
- `render_mode = "idler_gear_a"`
- `render_mode = "idler_gear_b"`
- `render_mode = "output_gear"`
- `render_mode = "motor_bracket"`
- `render_mode = "stepper_motor_body"`
- `render_mode = "encoder_module"`
- `render_mode = "main_pcb"`
- `render_mode = "piezo_buzzer"`
- `render_mode = "led_ring"`
- `render_mode = "power_module"`
- `render_mode = "rear_housing_shell"`
- `render_mode = "wall_mount_bracket"`

Example CLI exports:

```bash
/Users/orsoneveraert/Applications/OpenSCAD-2021.01.app/Contents/MacOS/OpenSCAD \
  -o /tmp/exploded-clock.stl \
  /Users/orsoneveraert/Documents/openscad-clock/exploded_clock.scad
```

```bash
/Users/orsoneveraert/Applications/OpenSCAD-2021.01.app/Contents/MacOS/OpenSCAD \
  -D 'render_mode="back_case"' \
  -o /tmp/back-case.stl \
  /Users/orsoneveraert/Documents/openscad-clock/exploded_clock.scad
```

```bash
/Users/orsoneveraert/Applications/OpenSCAD-2021.01.app/Contents/MacOS/OpenSCAD \
  --autocenter --viewall \
  -o /tmp/isometric-outline.svg \
  /Users/orsoneveraert/Documents/openscad-clock/isometric_outline_clock.scad
```

```bash
/Users/orsoneveraert/Applications/OpenSCAD-2021.01.app/Contents/MacOS/OpenSCAD \
  --autocenter --viewall --render --imgsize=1600,1200 \
  -o /tmp/visual-timer-clock.png \
  /Users/orsoneveraert/Documents/openscad-clock/visual_timer_clock.scad
```

```bash
/Users/orsoneveraert/Applications/OpenSCAD-2021.01.app/Contents/MacOS/OpenSCAD \
  -D 'render_mode="rear_housing_shell"' \
  -o /tmp/visual-timer-rear.stl \
  /Users/orsoneveraert/Documents/openscad-clock/visual_timer_clock.scad
```

Webapp:

```bash
cd /Users/orsoneveraert/Documents/openscad-clock/webapp
npm install
npm run dev
```

The frontend provides:
- timer setting slider
- exploded length slider
- playback speed slider
- animated red timer sector
- animated knob, shafts, and reduction gear train
