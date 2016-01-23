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
            // Initialize scalar fields
            this.c0.data[index] = 0;
            this.c1.data[index] = 0;

            // Initialize vector fields
            this.v0.data[index] = {x:0, y:0};
            this.v1.data[index] = {x:0, y:0};
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
                    this.updatePixel(i, j, (src.data[index].x * src.data[index].x +
                                            src.data[index].y * src.data[index].y));
                }
                else {
                    this.updatePixel(i, j, src.data[index]);
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

    this.step = function() {
        var delta = 0.1;
        var vDst = !this.showBack ? this.v0: this.v1;
        var vSrc = this.showBack ? this.v0: this.v1;

        var cDst = !this.showBack ? this.c0: this.c1;
        var cSrc = this.showBack ? this.c0: this.c1;

        // Solve non-divergence free velocity for each cell
        for(var i = 1; i < this.height - 1; i++) {
            for(var j = 1; j < this.width - 1; j++) {
                var index = i * this.width + j;
                // Solve a cell
                // Dumb effect just so that it does something
                cDst.data[index] = cSrc.sample(j - 0.2, i+ 0.75);
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
