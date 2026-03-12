$fn = 96;

render_mode = is_undef(render_mode) ? "assembly" : render_mode;
exploded_view = is_undef(exploded_view) ? true : exploded_view;
show_led_ring = is_undef(show_led_ring) ? true : show_led_ring;
timer_demo_minutes = is_undef(timer_demo_minutes) ? 35 : timer_demo_minutes;

housing_od = 340;
housing_r = housing_od / 2;
housing_wall = 2.8;
assembled_thickness = 42;

lens_od = 332;
lens_th = 2;
lens_center_hole_d = 44;
lens_lip_od = 326;
lens_lip_th = 0.8;

bezel_opening_d = 270;
bezel_depth = 12;
bezel_wall = 2.8;
bezel_boss_r = 146;

mask_od = 290;
mask_th = 1.8;
mask_center_hole_d = 18;

disk_od = 260;
disk_th = 1.2;
disk_center_hole_d = 4.4;
timer_wipe_th = 0.9;
timer_display_outer_r = 128;
timer_display_sweep = 330;
timer_display_start = 90 - timer_display_sweep;
timer_display_end = 90;
timer_total_minutes = 60;
timer_display_minutes = min(max(timer_demo_minutes, 0), timer_total_minutes);
timer_elapsed_deg = timer_display_sweep * (1 - timer_display_minutes / timer_total_minutes);

hub_flange_d = 30;
hub_flange_th = 1.5;
hub_body_d = 20;
hub_body_th = 9;

knob_d = 40;
knob_depth = 18;

knob_shaft_d = 6;
knob_shaft_len = 30;

support_plate_d = 240;
support_plate_th = 3;
support_boss_r = 108;

output_shaft_d = 4;
output_shaft_len = 28;

output_gear_od = 58;
gear_b_od = 26;
gear_a_od = 18;
motor_pinion_od = 10;
gear_plane_z_assembled = -6;

motor_axis_x = 78;
idler_a_x = 64;
idler_b_x = 42;

motor_body_d = 42;
motor_body_th = 20;

pcb_d = 145;
pcb_th = 1.6;

buzzer_d = 24;
buzzer_th = 6;

led_ring_od = 220;
led_ring_id = 206;
led_ring_th = 1.5;

rear_depth = 26;
rear_wall = 2.8;

function place_z(assembled_z, exploded_z) = exploded_view ? exploded_z : assembled_z;
function arc_points(r, a0, a1, n) = [
    for (i = [0 : n])
        let (a = a0 + (a1 - a0) * i / n)
            [r * cos(a), r * sin(a)]
];
function reverse_points(points) = [for (i = [len(points) - 1 : -1 : 0]) points[i]];

module rounded_rect_2d(size = [10, 10], radius = 2) {
    offset(r = radius)
        offset(delta = -radius)
            square(size, center = true);
}

module annular_sector_2d(outer_r, inner_r, start_angle, end_angle, segments = 120) {
    polygon(points = concat(
        arc_points(outer_r, start_angle, end_angle, segments),
        reverse_points(arc_points(inner_r, start_angle, end_angle, segments))
    ));
}

module sector_2d(r, start_angle, end_angle, segments = 120) {
    polygon(points = concat(
        [[0, 0]],
        arc_points(r, start_angle, end_angle, segments),
        [[0, 0]]
    ));
}

module boss(d = 10, h = 8, hole_d = 3.2) {
    difference() {
        cylinder(d = d, h = h, center = true);
        cylinder(d = hole_d, h = h + 0.4, center = true);
    }
}

module simple_gear(od = 20, thickness = 4, bore_d = 3, tooth_count = 16, tooth_depth = 1.4, hub_d = 0, hub_h = 0) {
    root_d = od - (2 * tooth_depth);
    tooth_w = max((od * PI / tooth_count) * 0.38, tooth_depth * 1.9);
    hub_height = hub_h > 0 ? hub_h : thickness + 1.2;

    difference() {
        union() {
            cylinder(d = root_d, h = thickness, center = true);

            for (i = [0 : tooth_count - 1]) {
                rotate([0, 0, i * 360 / tooth_count])
                    translate([(root_d / 2) + (tooth_depth / 2), 0, 0])
                        cube([tooth_depth, tooth_w, thickness], center = true);
            }

            if (hub_d > 0) {
                cylinder(d = hub_d, h = hub_height, center = true);
            }
        }

        cylinder(d = bore_d, h = max(thickness, hub_height) + 0.6, center = true);
    }
}

module front_lens() {
    difference() {
        union() {
            cylinder(d = lens_od, h = lens_th, center = true);
            translate([0, 0, -(lens_th / 2) + (lens_lip_th / 2)])
                difference() {
                    cylinder(d = lens_lip_od, h = lens_lip_th, center = true);
                    cylinder(d = lens_lip_od - 6, h = lens_lip_th + 0.2, center = true);
                }
        }

        cylinder(d = lens_center_hole_d, h = lens_th + 2, center = true);
    }
}

module front_bezel_shell() {
    boss_d = 10;
    boss_h = 8;
    lens_seat_d = lens_od + 0.8;
    lens_seat_h = 2.4;

    difference() {
        union() {
            translate([0, 0, -bezel_depth / 2])
                cylinder(d = housing_od - 1.5, h = bezel_depth - 1.5);

            translate([0, 0, bezel_depth / 2 - 1.5])
                cylinder(d1 = housing_od - 1.5, d2 = housing_od, h = 1.5);

            for (a = [45, 135, 225, 315]) {
                translate([bezel_boss_r * cos(a), bezel_boss_r * sin(a), -(bezel_depth / 2) + 2.5])
                    boss(d = boss_d, h = boss_h, hole_d = 3.2);
            }
        }

        translate([0, 0, -(bezel_depth / 2) + bezel_wall])
            cylinder(d = housing_od - (2 * bezel_wall), h = bezel_depth - bezel_wall + 0.4);

        translate([0, 0, -(bezel_depth / 2) - 0.2])
            cylinder(d = bezel_opening_d, h = bezel_depth + 0.4);

        translate([0, 0, (bezel_depth / 2) - lens_seat_h])
            cylinder(d = lens_seat_d, h = lens_seat_h + 0.2);
    }
}

module face_mask() {
    difference() {
        cylinder(d = mask_od, h = mask_th, center = true);
        cylinder(d = timer_display_outer_r * 2, h = mask_th + 0.4, center = true);
    }
}

module rotating_red_disk() {
    difference() {
        linear_extrude(height = disk_th, center = true)
            sector_2d(timer_display_outer_r, timer_display_start, timer_display_end);
        cylinder(d = disk_center_hole_d, h = disk_th + 0.4, center = true);
    }
}

module timer_wipe_disk() {
    difference() {
        cylinder(d = disk_od, h = timer_wipe_th, center = true);
        cylinder(d = disk_center_hole_d, h = timer_wipe_th + 0.4, center = true);

        linear_extrude(height = timer_wipe_th + 0.4, center = true)
            sector_2d(timer_display_outer_r, timer_display_start, timer_display_end);
    }
}

module disk_carrier_hub() {
    difference() {
        union() {
            translate([0, 0, (hub_body_th - hub_flange_th) / 2])
                cylinder(d = hub_body_d, h = hub_body_th, center = true);
            translate([0, 0, -hub_body_th / 2 + hub_flange_th / 2])
                cylinder(d = hub_flange_d, h = hub_flange_th, center = true);
            translate([0, 0, hub_body_th / 2 + 1.2])
                cylinder(d = 12, h = 2.4, center = true);
        }

        cylinder(d = 4.2, h = hub_body_th + 6, center = true);
        translate([2.3, 0, 0])
            cube([3.4, 8, hub_body_th + 6], center = true);
    }
}

module central_knob() {
    difference() {
        union() {
            cylinder(d = knob_d - 2, h = knob_depth - 6, center = true);
            translate([0, 0, (knob_depth / 2) - 2])
                cylinder(d1 = knob_d - 2, d2 = knob_d - 6, h = 4, center = true);
            translate([0, 0, -(knob_depth / 2) + 2])
                cylinder(d1 = knob_d - 6, d2 = knob_d, h = 4, center = true);
        }

        cylinder(d = 6.2, h = knob_depth + 2, center = true);
        translate([0, 0, (knob_depth / 2) - 1.6])
            cylinder(d1 = 20, d2 = 14, h = 3.2, center = true);
    }
}

module knob_shaft() {
    difference() {
        union() {
            cylinder(d = knob_shaft_d, h = knob_shaft_len, center = true);
            translate([0, 0, -knob_shaft_len / 2 + 3])
                cylinder(d = 8, h = 6, center = true);
        }

        translate([2.2, 0, 0])
            cube([3.2, 10, knob_shaft_len + 2], center = true);
    }
}

module front_support_plate() {
    difference() {
        union() {
            cylinder(d = support_plate_d, h = support_plate_th, center = true);

            for (a = [45, 135, 225, 315]) {
                translate([support_boss_r * cos(a), support_boss_r * sin(a), 0])
                    cylinder(d = 12, h = support_plate_th + 1, center = true);
            }

            for (pt = [[0, 0], [idler_b_x, 0], [idler_a_x, 0], [motor_axis_x, 0]]) {
                translate([pt[0], pt[1], -4.5])
                    cylinder(d = pt[0] == 0 ? 8 : 6, h = 7, center = true);
            }

            for (pt = [[55, 55], [-55, 55], [-55, -55], [55, -55]]) {
                translate([pt[0], pt[1], -6])
                    cylinder(d = 7, h = 10, center = true);
            }
        }

        cylinder(d = 8, h = 20, center = true);

        for (a = [45, 135, 225, 315]) {
            rotate([0, 0, a])
                translate([72, 0, 0])
                    scale([1.55, 0.9, 1])
                        cylinder(d = 62, h = 20, center = true);
        }

        for (a = [45, 135, 225, 315]) {
            translate([support_boss_r * cos(a), support_boss_r * sin(a), 0])
                cylinder(d = 3.2, h = 20, center = true);
        }

        for (pt = [[55, 55], [-55, 55], [-55, -55], [55, -55]]) {
            translate([pt[0], pt[1], -6])
                cylinder(d = 3, h = 14, center = true);
        }
    }
}

module output_shaft() {
    difference() {
        union() {
            cylinder(d = output_shaft_d, h = output_shaft_len, center = true);
            translate([0, 0, -6])
                cylinder(d = 6, h = 4, center = true);
            translate([0, 0, output_shaft_len / 2 - 2])
                cylinder(d = 5.5, h = 4, center = true);
        }

        translate([1.8, 0, output_shaft_len / 2 - 1])
            cube([2.6, 8, 6], center = true);
    }
}

module motor_pinion() {
    simple_gear(od = motor_pinion_od, thickness = 4, bore_d = 5.1, tooth_count = 10, tooth_depth = 1.2, hub_d = 8, hub_h = 5);
}

module idler_gear_a() {
    simple_gear(od = gear_a_od, thickness = 4, bore_d = 3.2, tooth_count = 12, tooth_depth = 1.3, hub_d = 10, hub_h = 5);
}

module idler_gear_b() {
    simple_gear(od = gear_b_od, thickness = 4, bore_d = 3.2, tooth_count = 16, tooth_depth = 1.6, hub_d = 12, hub_h = 5);
}

module output_gear() {
    simple_gear(od = output_gear_od, thickness = 5, bore_d = 4.2, tooth_count = 28, tooth_depth = 2.1, hub_d = 18, hub_h = 7);
}

module motor_bracket() {
    difference() {
        union() {
            linear_extrude(height = 2, center = true)
                rounded_rect_2d([60, 18], 3);

            translate([0, 0, -10])
                linear_extrude(height = 2, center = true)
                    rounded_rect_2d([52, 52], 4);

            translate([-21, 0, -5])
                cube([4, 8, 10], center = true);

            translate([21, 0, -5])
                cube([4, 8, 10], center = true);
        }

        for (x = [-20, 20]) {
            translate([x, 0, 0])
                cylinder(d = 4, h = 4, center = true);
        }

        translate([0, 0, -10])
            cylinder(d = 22, h = 4, center = true);

        for (x = [-15.5, 15.5], y = [-15.5, 15.5]) {
            translate([x, y, -10])
                cylinder(d = 3, h = 4, center = true);
        }
    }
}

module stepper_motor_body() {
    union() {
        cylinder(d = motor_body_d, h = motor_body_th, center = true);
        translate([0, 0, -motor_body_th / 2 - 2])
            linear_extrude(height = 4, center = true)
                rounded_rect_2d([30, 30], 3);
        translate([0, 0, motor_body_th / 2 + 4])
            cylinder(d = 5, h = 8, center = true);
    }
}

module encoder_module() {
    difference() {
        union() {
            cylinder(d = 14, h = 8, center = true);
            translate([0, 0, -8])
                linear_extrude(height = 10, center = true)
                    rounded_rect_2d([24, 16], 2);
        }

        cylinder(d = 6.2, h = 24, center = true);
    }
}

module main_pcb() {
    difference() {
        union() {
            cylinder(d = pcb_d, h = pcb_th, center = true);

            translate([0, 26, -3])
                cube([18, 18, 6], center = true);

            translate([-30, 16, -2.5])
                cube([22, 16, 5], center = true);

            translate([30, -16, -3])
                cube([16, 12, 6], center = true);

            translate([52, 0, -3.5])
                cube([18, 10, 7], center = true);
        }

        cylinder(d = 18, h = 10, center = true);

        for (pt = [[55, 55], [-55, 55], [-55, -55], [55, -55]]) {
            translate([pt[0], pt[1], 0])
                cylinder(d = 3.2, h = 6, center = true);
        }
    }
}

module piezo_buzzer() {
    difference() {
        cylinder(d = buzzer_d, h = buzzer_th, center = true);
        translate([0, 0, buzzer_th / 2 - 0.5])
            cylinder(d = 7, h = 1.2, center = true);
    }
}

module led_ring() {
    difference() {
        cylinder(d = led_ring_od, h = led_ring_th, center = true);
        cylinder(d = led_ring_id, h = led_ring_th + 0.2, center = true);
    }
}

module power_module() {
    union() {
        cube([26, 18, 1.6], center = true);
        translate([0, 0, -4.5])
            cube([14, 10, 8], center = true);
        translate([10, 0, 0])
            cube([6, 8, 4], center = true);
    }
}

module rear_housing_shell() {
    post_r = 146;

    difference() {
        union() {
            cylinder(d = housing_od, h = rear_depth, center = true);

            for (a = [45, 135, 225, 315]) {
                translate([post_r * cos(a), post_r * sin(a), 0])
                    boss(d = 10, h = 18, hole_d = 3.2);
            }

            for (a = [0, 90, 180, 270]) {
                rotate([0, 0, a])
                    translate([74, 0, 0])
                        cube([82, 5, 8], center = true);
            }

            translate([0, 122, -7])
                linear_extrude(height = 6, center = true)
                    rounded_rect_2d([42, 20], 4);
        }

        translate([0, 0, rear_wall])
            cylinder(d = housing_od - (2 * rear_wall), h = rear_depth - rear_wall + 0.4, center = true);

        translate([0, 0, rear_depth / 2 - 2.2])
            cylinder(d = housing_od - (2 * 5), h = 4.6, center = true);

        translate([housing_r - 6, 0, 0])
            cube([16, 18, 12], center = true);

        translate([0, 122, -7])
            union() {
                cylinder(d = 8, h = 8, center = true);
                translate([0, -4, 0])
                    cube([4, 10, 8], center = true);
            }
    }
}

module wall_mount_bracket() {
    difference() {
        linear_extrude(height = 2, center = true)
            rounded_rect_2d([70, 26], 3);

        cylinder(d = 8, h = 4, center = true);

        translate([0, 5, 0])
            cube([4, 12, 4], center = true);

        for (x = [-24, 24]) {
            translate([x, 0, 0])
                cylinder(d = 4, h = 4, center = true);
        }
    }
}

module assembly() {
    z_support = 0;
    z_output_shaft = place_z(2.5, 6);
    z_hub = place_z(5, 13);
    z_disk = place_z(6.3, 17);
    z_wipe = place_z(7.8, 20.5);
    z_led = place_z(1.5, 10);
    z_mask = place_z(9.2, 24.5);
    z_bezel = place_z(14, 34);
    z_lens = place_z(19, 44);
    z_knob_shaft = place_z(8, 22);
    z_knob = place_z(21, 53);

    z_gear_plane = place_z(-6, -10);
    z_encoder = place_z(-7.5, -15);
    z_motor_bracket = place_z(-8, -20);
    z_motor = place_z(-18, -33);
    z_pcb = place_z(-14.5, -48);
    z_buzzer = place_z(-12, -41);
    z_power = place_z(-14.5, -48);
    z_rear = place_z(-13, -60);
    z_wall_bracket = place_z(-28, -78);

    color([1, 1, 1, 0.22])
        translate([0, 0, z_lens])
            front_lens();

    color([0.97, 0.97, 0.95, 1])
        translate([0, 0, z_bezel])
            front_bezel_shell();

    color([0.96, 0.96, 0.94, 1])
        translate([0, 0, z_mask])
            face_mask();

    color([0.95, 0.95, 0.93, 1])
        translate([0, 0, z_wipe])
            timer_wipe_disk();

    color([0.79, 0.19, 0.18, 1])
        translate([0, 0, z_disk])
            rotate([0, 0, -timer_elapsed_deg])
                rotating_red_disk();

    color([0.72, 0.72, 0.72, 1])
        translate([0, 0, z_hub])
            disk_carrier_hub();

    color([0.95, 0.95, 0.93, 1])
        translate([0, 0, z_knob])
            central_knob();

    color([0.66, 0.66, 0.68, 1])
        translate([0, 0, z_knob_shaft])
            knob_shaft();

    color([0.87, 0.87, 0.88, 1])
        translate([0, 0, z_support])
            front_support_plate();

    color([0.6, 0.6, 0.62, 1])
        translate([0, 0, z_output_shaft])
            output_shaft();

    color([0.6, 0.6, 0.62, 1])
        translate([0, 0, z_gear_plane])
            output_gear();

    color([0.58, 0.58, 0.6, 1])
        translate([idler_b_x, 0, z_gear_plane])
            idler_gear_b();

    color([0.58, 0.58, 0.6, 1])
        translate([idler_a_x, 0, z_gear_plane])
            idler_gear_a();

    color([0.55, 0.55, 0.57, 1])
        translate([motor_axis_x, 0, z_gear_plane])
            motor_pinion();

    color([0.72, 0.72, 0.74, 1])
        translate([motor_axis_x, 0, z_motor_bracket])
            motor_bracket();

    color([0.42, 0.42, 0.44, 1])
        translate([motor_axis_x, 0, z_motor])
            stepper_motor_body();

    color([0.48, 0.48, 0.5, 1])
        translate([0, 0, z_encoder])
            encoder_module();

    color([0.15, 0.37, 0.2, 1])
        translate([0, 0, z_pcb])
            main_pcb();

    color([0.16, 0.16, 0.18, 1])
        translate([34, -30, z_buzzer])
            piezo_buzzer();

    if (show_led_ring) {
        color([0.92, 0.92, 0.92, 0.45])
            translate([0, 0, z_led])
                led_ring();
    }

    color([0.22, 0.22, 0.24, 1])
        translate([146, 16, z_power])
            power_module();

    color([0.95, 0.95, 0.93, 1])
        translate([0, 0, z_rear])
            rear_housing_shell();

    color([0.56, 0.56, 0.58, 1])
        translate([0, 0, z_wall_bracket])
            wall_mount_bracket();
}

if (render_mode == "assembly") {
    assembly();
} else if (render_mode == "front_lens") {
    front_lens();
} else if (render_mode == "front_bezel_shell") {
    front_bezel_shell();
} else if (render_mode == "face_mask") {
    face_mask();
} else if (render_mode == "timer_wipe_disk") {
    timer_wipe_disk();
} else if (render_mode == "rotating_red_disk") {
    rotating_red_disk();
} else if (render_mode == "disk_carrier_hub") {
    disk_carrier_hub();
} else if (render_mode == "central_knob") {
    central_knob();
} else if (render_mode == "knob_shaft") {
    knob_shaft();
} else if (render_mode == "front_support_plate") {
    front_support_plate();
} else if (render_mode == "output_shaft") {
    output_shaft();
} else if (render_mode == "motor_pinion") {
    motor_pinion();
} else if (render_mode == "idler_gear_a") {
    idler_gear_a();
} else if (render_mode == "idler_gear_b") {
    idler_gear_b();
} else if (render_mode == "output_gear") {
    output_gear();
} else if (render_mode == "motor_bracket") {
    motor_bracket();
} else if (render_mode == "stepper_motor_body") {
    stepper_motor_body();
} else if (render_mode == "encoder_module") {
    encoder_module();
} else if (render_mode == "main_pcb") {
    main_pcb();
} else if (render_mode == "piezo_buzzer") {
    piezo_buzzer();
} else if (render_mode == "led_ring") {
    led_ring();
} else if (render_mode == "power_module") {
    power_module();
} else if (render_mode == "rear_housing_shell") {
    rear_housing_shell();
} else if (render_mode == "wall_mount_bracket") {
    wall_mount_bracket();
} else {
    echo(str("Unknown render_mode: ", render_mode));
}
