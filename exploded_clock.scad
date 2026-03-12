$fn = 128;

render_mode = is_undef(render_mode) ? "assembly" : render_mode; // assembly, back_case, dial_spacer, dial_face, bezel, hour_hand, minute_hand, second_hand, center_cap
exploded_view = is_undef(exploded_view) ? true : exploded_view;
explode_gap = is_undef(explode_gap) ? 14 : explode_gap;
auto_render = is_undef(auto_render) ? true : auto_render;

clock_d = 180;
case_h = 20;
case_wall = 4;
front_skin = 3;
spacer_h = 8;
dial_h = 2.4;
marker_h = 0.8;
bezel_h = 5;
shaft_hole_d = 8;

movement_body_w = 58;
movement_body_h = 58;
movement_cavity_h = case_h - front_skin;

inner_d = clock_d - (2 * case_wall);
dial_d = inner_d - 2;
spacer_inner_d = dial_d - 26;
bezel_inner_d = dial_d - 6;

hour_hand_h = 1.8;
minute_hand_h = 1.6;
second_hand_h = 1.2;
cap_h = 3;

function explode(step) = exploded_view ? step * explode_gap : 0;

module back_case() {
    difference() {
        union() {
            cylinder(d = clock_d, h = case_h);

            // Small hanging lug on the back.
            translate([0, (clock_d / 2) - 8, case_h / 2])
                rotate([90, 0, 0])
                    cylinder(d = 10, h = 6, center = true);
        }

        translate([0, 0, movement_cavity_h / 2])
            cube([movement_body_w, movement_body_h, movement_cavity_h + 0.2], center = true);

        translate([0, 0, -0.1])
            cylinder(d = shaft_hole_d, h = case_h + 0.2);

        translate([0, -(clock_d / 2) + 6, 4])
            cube([16, 10, 8], center = true);

        translate([0, (clock_d / 2) - 8, case_h / 2])
            rotate([90, 0, 0])
                cylinder(d = 4, h = 8, center = true);
    }
}

module dial_spacer() {
    difference() {
        cylinder(d = inner_d, h = spacer_h);
        translate([0, 0, -0.1])
            cylinder(d = spacer_inner_d, h = spacer_h + 0.2);
        translate([0, 0, -0.1])
            cylinder(d = shaft_hole_d + 2, h = spacer_h + 0.2);
    }
}

module dial_marker(width, length, height) {
    translate([-width / 2, (dial_d / 2) - length - 5, 0])
        cube([width, length, height]);
}

module dial_face() {
    difference() {
        union() {
            cylinder(d = dial_d, h = dial_h);

            for (i = [0 : 11]) {
                rotate([0, 0, i * 30])
                    translate([0, 0, dial_h])
                        dial_marker((i % 3 == 0) ? 3.2 : 1.8, (i % 3 == 0) ? 12 : 7, marker_h);
            }
        }

        translate([0, 0, -0.1])
            cylinder(d = shaft_hole_d, h = dial_h + marker_h + 0.2);
    }
}

module bezel() {
    difference() {
        cylinder(d = clock_d, h = bezel_h);
        translate([0, 0, -0.1])
            cylinder(d = bezel_inner_d, h = bezel_h + 0.2);
    }
}

module tapered_hand(length, root_w, tip_w, thickness, hub_d, cutout_scale) {
    difference() {
        union() {
            linear_extrude(height = thickness)
                polygon(points = [
                    [-root_w / 2, 0],
                    [root_w / 2, 0],
                    [tip_w / 2, length * 0.84],
                    [0, length],
                    [-tip_w / 2, length * 0.84]
                ]);

            cylinder(d = hub_d, h = thickness);
        }

        translate([0, 0, -0.1])
            cylinder(d = hub_d * 0.38, h = thickness + 0.2);

        translate([0, length * 0.42, -0.1])
            scale([cutout_scale, 1, 1])
                cylinder(d = root_w * 1.6, h = thickness + 0.2);
    }
}

module hour_hand() {
    tapered_hand(58, 10, 5, hour_hand_h, 16, 0.72);
}

module minute_hand() {
    tapered_hand(86, 8, 4, minute_hand_h, 14, 0.58);
}

module second_hand() {
    difference() {
        union() {
            cylinder(d = 10, h = second_hand_h);

            linear_extrude(height = second_hand_h)
                polygon(points = [
                    [-1.4, 0],
                    [1.4, 0],
                    [1.1, 96],
                    [0, 108],
                    [-1.1, 96]
                ]);

            translate([0, -14, 0])
                cylinder(d = 9, h = second_hand_h);
        }

        translate([0, 0, -0.1])
            cylinder(d = 2, h = second_hand_h + 0.2);
    }
}

module center_cap() {
    difference() {
        cylinder(d = 12, h = cap_h);
        translate([0, 0, -0.1])
            cylinder(d = 2.4, h = cap_h + 0.2);
    }
}

module assembly() {
    z_case = 0;
    z_spacer = case_h;
    z_dial = case_h + spacer_h;
    z_bezel = z_dial;
    z_hour = z_dial + dial_h + 0.6;
    z_minute = z_hour + 1.6;
    z_second = z_minute + 1.4;
    z_cap = z_second + 1.2;

    color("lightsteelblue")
        translate([0, 0, z_case])
            back_case();

    color("silver")
        translate([0, 0, z_spacer + explode(1)])
            dial_spacer();

    color("floralwhite")
        translate([0, 0, z_dial + explode(2)])
            dial_face();

    color("gainsboro")
        translate([0, 0, z_bezel + explode(3)])
            bezel();

    color("black")
        translate([0, 0, z_hour + explode(4)])
            hour_hand();

    color("dimgray")
        translate([0, 0, z_minute + explode(5)])
            minute_hand();

    color("firebrick")
        translate([0, 0, z_second + explode(6)])
            second_hand();

    color("gold")
        translate([0, 0, z_cap + explode(7)])
            center_cap();
}

if (auto_render) {
    if (render_mode == "assembly") {
        assembly();
    } else if (render_mode == "back_case") {
        back_case();
    } else if (render_mode == "dial_spacer") {
        dial_spacer();
    } else if (render_mode == "dial_face") {
        dial_face();
    } else if (render_mode == "bezel") {
        bezel();
    } else if (render_mode == "hour_hand") {
        hour_hand();
    } else if (render_mode == "minute_hand") {
        minute_hand();
    } else if (render_mode == "second_hand") {
        second_hand();
    } else if (render_mode == "center_cap") {
        center_cap();
    } else {
        echo(str("Unknown render_mode: ", render_mode));
    }
}
