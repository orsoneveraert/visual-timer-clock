exploded_view = true;
explode_gap = 14;
use <exploded_clock.scad>

outline_width = 1.4;
fill_color = [1, 1, 1, 1];
line_color = [0.08, 0.08, 0.08, 1];
iso_rotation = [55, 0, 45];

module iso_projected() {
    projection(cut = false)
        rotate(iso_rotation)
            assembly();
}

module outline_pass(width) {
    difference() {
        offset(delta = width)
            iso_projected();
        offset(delta = max(width - 0.55, 0.01))
            iso_projected();
    }
}

module drawing_sheet() {
    color(fill_color)
        iso_projected();

    color(line_color)
        outline_pass(outline_width);
}

drawing_sheet();
