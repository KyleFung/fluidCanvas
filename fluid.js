// Initializes 0 velocity fluid of given dimensions and a context to render on
function fluid(width, height, canvas) {
    // Initialize fluid basic properties
    this.width = width;
    this.height = height;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.showBack = true;
    this.renderVel = false;

    // Initialize rendering buffer
    this.view = this.ctx.createImageData(this.width, this.height);

    // Concentration
    this.c0 = new field(width, height, 1);
    this.c1 = new field(width, height, 1);

    // Velocity
    this.v0 = new field(width, height, 2);
    this.v1 = new field(width, height, 2);

    for(var i = 0; i < height; i++) {
        for(var j = 0; j < width; j++) {
            var index = i * width + j;
            // Initialize default setup
            this.c0.data[index] = 0;
            this.c1.data[index] = 0;
            this.v0.data[index] = {x:0, y:0};
            this.v1.data[index] = {x:0, y:0};

            // Test Setup 1:
            // Circular blob of dye and uniform velocity field to right
            var dx = j - 70;
            var dy = i - 90;
            if((dx * dx) + (dy * dy) < 400) {
                this.c0.data[index] = 1.0;
                this.c1.data[index] = 1.0;
            }
            this.v0.data[index] = {x:1, y:0};
            this.v1.data[index] = {x:1, y:0};
            // End test setup 1

            // Test Setup 2:
            // Circular blob of dye with a rotational velocity field (flushing toilet)
            var dx = j - 70;
            var dy = i - 90;
            if((dx * dx) + (dy * dy) < 300) {
                this.c0.data[index] = 1.0;
                this.c1.data[index] = 1.0;
            }
            var dx = j - 60;
            var dy = i - 60;
            this.v0.data[index] = {x:-dy, y:dx};
            this.v1.data[index] = {x:-dy, y:dx};
            // End test setup 2
        }
    }

    this.render = function() {
        var src = this.showBack ? this.c0: this.c1;
        if(this.renderVel) {
            var src = this.showBack ? this.v0: this.v1;
        }
        this.updateView(src);
        this.ctx.putImageData(this.view, 0, 0);
    }

    this.updateView = function(src) {
        // Copy src into the view buffer
        for(var i = 0; i < src.height; i++) {
            for(var j = 0; j < src.width; j++) {
                var index = i * src.width + j;
                if(this.renderVel) {
                    this.updatePixel(j, i, (src.data[index].x * src.data[index].x +
                                            src.data[index].y * src.data[index].y));
                }
                else {
                    this.updatePixel(j, i, src.data[index]);
                }
            }
        }
    }

    this.updatePixel = function(x, y, sat) {
        index = (x + y * this.view.width) * 4;
        this.view.data[index + 0] = 255 * sat;
        this.view.data[index + 1] = 255 * sat;
        this.view.data[index + 2] = 255 * sat;
        this.view.data[index + 3] = 255;
    }

    // Advects a quantity at (x+0.5, y+0.5) in src using vel into dst
    this.advect = function(x, y, dst, src, vel, delta) {
        // Integrate backwards in time by solving for (x0,y0)
        var u = vel.data[y * this.width + x];
        var x0 = x - delta * u.x + 0.5;
        var y0 = y - delta * u.y + 0.5;

        // Solve q1(x,y) by interpolating for q0(x0,y0)
        var result = src.sample(x0, y0);
        dst.data[y * this.width + x] = result;
    }

    this.step = function() {
        var delta = 0.1;
        var vDst = !this.showBack ? this.v0: this.v1;
        var vSrc = this.showBack ? this.v0: this.v1;

        var cDst = !this.showBack ? this.c0: this.c1;
        var cSrc = this.showBack ? this.c0: this.c1;

        // Solve non-divergence free velocity for each cell
        for(var i = 1; i < this.height - 1; i++) {
            for(var j = 1; j < this.width - 1; j++) {
                // Advect the concentration field
                this.advect(j, i, cDst, cSrc, vDst, delta);
            }
        }

        this.showBack = !this.showBack;
    }
}

function field(width, height, dimension) {
    this.data = new Array(width * height);
    this.width = width;
    this.height = height;
    this.dimension = dimension;

    this.sample = function(x, y) {
        // Anything outside of the inner box is zero
        if(x < 0.5 || x >= this.width - 0.5) {return this.zero();}
        if(y < 0.5 || y >= this.height - 0.5) {return this.zero();}

        var topLeft = Math.round(y - 1) * this.width + Math.round(x - 1);
        var topRight = topLeft + 1;
        var btmLeft = topLeft + this.width;
        var btmRight = btmLeft + 1;

        var kx = x - Math.round(x - 1) - 0.5;
        var ky = y - Math.round(y - 1) - 0.5;

        // Perform a bilerp
        var topVal = this.lerp(kx, this.data[topLeft], this.data[topRight]);
        var btmVal = this.lerp(kx, this.data[btmLeft], this.data[btmRight]);

        return this.lerp(ky, topVal, btmVal);
    }

    this.zero = function() {
        if(this.dimension == 1)
            return 0;
        else if(this.dimensions == 2)
            return {x:0, y:0};
    }

    this.lerp = function(k, a, b) {
        if(this.dimension == 1) {
            return (1 - k) * a + (k) * b;
        }
        if(this.dimension == 2) {
            var x = (1 - k) * a.x + (k) * b.x;
            var y = (1 - k) * a.y + (k) * b.y;
            return {x:x, y:y};
        }
    }
}
