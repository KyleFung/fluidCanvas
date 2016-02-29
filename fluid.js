// Initializes 0 velocity fluid of given dimensions and a context to render on
function fluid(width, height, canvas) {
    // Initialize fluid basic properties
    this.width = width;
    this.height = height;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.showBack = true;

    // Rendered field
    // 0 = concentration, 1 = velocity, 2 = divergence, 3 = pressure, 4 = pressure gradient
    this.renderedField = 0;

    // Initialize rendering buffer
    this.view = this.ctx.createImageData(this.width, this.height);

    // Concentration
    this.c0 = new field(width, height, 1);
    this.c1 = new field(width, height, 1);

    // Velocity
    this.v0 = new field(width, height, 2);
    this.v1 = new field(width, height, 2);

    // Divergence of velocity
    this.div = new field(width, height, 1);

    // Pressure and its gradient
    // p0 is for scratch calculations; p1 holds the actual values
    this.p0 = new field(width, height, 1);
    this.p1 = new field(width, height, 1);
    this.gp = new field(width, height, 2);

    // Zero out all the fields
    this.c0.fillZero();
    this.c1.fillZero();
    this.div.fillZero();
    this.p0.fillZero();
    this.p1.fillZero();
    this.v0.fillZero();
    this.v1.fillZero();
    this.gp.fillZero();

    // Fill in u component of vector fields
    for(var i = 0; i < this.v0.u.height; i++) {
        for(var j = 0; j < this.v0.u.width; j++) {
            var index = i * this.v0.u.width + j;
            var dx = j - 60;
            var dy = i - 60;
            if(dx * dx + dy * dy < 500) {
                this.v0.u.data[index] = -dy;
                this.v1.u.data[index] = -dy;
            }
        }
    }

    // Fill in v component of vector fields
    for(var i = 0; i < this.v0.v.height; i++) {
        for(var j = 0; j < this.v0.v.width; j++) {
            var index = i * this.v0.v.width + j;
            var dx = j - 60;
            var dy = i - 60;
            if(dx * dx + dy * dy < 500) {
                this.v0.v.data[index] = dx;
                this.v1.v.data[index] = dx;
            }
        }
    }

    // Fill in scalar fields
    for(var i = 0; i < height; i++) {
        for(var j = 0; j < width; j++) {
            var index = i * width + j;
            var dx = j - 70;
            var dy = i - 90;
            if((dx * dx) + (dy * dy) < 300) {
                this.c0.data[index] = 1.0;
                this.c1.data[index] = 1.0;
            }
        }
    }

    this.v0.updateBoundary(0);
    this.v1.updateBoundary(0);

    this.render = function() {
        this.updateView(1.0);
        this.ctx.putImageData(this.view, 0, 0);
    }

    this.updateView = function(scale) {
        // Choose which field to use to render
        var src = undefined;
        switch(this.renderedField) {
            case 0:
                src = this.showBack ? this.c0: this.c1;
                break;
            case 1:
                src = this.showBack ? this.v0: this.v1;
                break;
            case 2:
                src = this.div;
                break;
            case 3:
                src = this.p1;
                break;
            case 4:
                src = this.gp;
            default:
        }

        // Copy src into the view buffer
        for(var i = 0; i < src.height; i++) {
            for(var j = 0; j < src.width; j++) {
                // Decide mapping based on field type
                if(src.dimension == 2) {
                    var v = src.sample(j + 0.5, i + 0.5);
                    this.updatePixel(j, i, scale * (v.x * v.x + v.y * v.y));
                }
                else {
                    var index = i * src.width + j;
                    this.updatePixel(j, i, scale * Math.abs(src.data[index]));
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

    // Advects a quantity at (x, y) in src using vel into dst
    this.advect = function(x, y, dst, src, vel, delta) {
        // Integrate backwards in time by solving for (x0,y0)
        var u = vel.sample(x, y);
        var x0 = x - delta * u.x;
        var y0 = y - delta * u.y;

        // Solve q1(x,y) by interpolating for q0(x0,y0)
        var result = src.sample(x0, y0);
        dst.data[Math.floor(y) * dst.width + Math.floor(x)] = result;
    }

    // Project the given velocity field onto its divergence free component
    this.project = function(vel) {
        // Recompute divergence of vel
        vel.divergence(this.div);

        // Use jacobi solver to calculate pressure field
        // Magic numbers taken from the discrete laplacian definition
        this.p1.jacobi(this.p0, this.div, -1, 4, 128, 1.0);

        // Calculate its gradient into gp
        this.p1.gradient(this.gp);

        // Subtract gp from vel
        vel.subtract(this.gp);
    }

    this.step = function() {
        var delta = 0.1;
        var vDst = !this.showBack ? this.v0: this.v1;
        var vSrc = this.showBack ? this.v0: this.v1;

        var cDst = !this.showBack ? this.c0: this.c1;
        var cSrc = this.showBack ? this.c0: this.c1;

        // Advect velocity using the velocity field

        // Enforce no-slip condition
        vDst.updateBoundary(0);
        //this.project(vDst);

        // Advect concentration using the velocity field
        for(var i = 1; i < this.height - 1; i++) {
            for(var j = 1; j < this.width - 1; j++) {
                // Advect the concentration field
                this.advect(j + 0.5, i + 0.5, cDst, cSrc, vDst, delta);
            }
        }

        this.showBack = !this.showBack;
    }
}

function field(width, height, dimension) {
    this.width = width;
    this.height = height;
    this.dimension = dimension;

    if(dimension == 1) {
        this.data = new Array(width * height);
    }
    if(dimension == 2) {
        this.u = new field(width + 1, height, 1);
        this.v = new field(width, height + 1, 1);
    }

    this.sample = function(x, y) {
        // Anything outside of the inner box is zero
        if(x < 0.5 || x >= this.width - 0.5) {return this.zero();}
        if(y < 0.5 || y >= this.height - 0.5) {return this.zero();}

        // Sample according to the staggered grid setup
        if(this.dimension == 1) {
            return this.centerSample(x, y);
        }
        if(this.dimension == 2) {
            return this.edgeSample(x, y);
        }
    }

    this.centerSample = function(x, y) {
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

    this.edgeSample = function(x, y) {
        // Sample the u array to get horizontal component
        var xu = Math.floor(x) + 0.5;
        var yu = Math.round(y) - 1;
        var kxu = x - Math.floor(x);
        var kyu = y - Math.round(y) + 0.5;

        var u = this.u.centerSample(xu + kxu, yu + kyu);

        // Sample the v array to get vertical component
        var yv = Math.floor(y) + 0.5;
        var xv = Math.round(x) - 1;
        var kxv = x - Math.round(x) + 0.5;
        var kyv = y - Math.floor(y);

        var v = this.v.centerSample(xv + kxv, yv + kyv);

        return {x:u, y:v};
    }

    // Calculate the divergence of field into dst
    // Assumes dst is the same size as field
    this.divergence = function(dst) {
        for(var i = 0; i < dst.height; i++) {
            for(var j = 0; j < dst.width; j++) {
                // Map index values into R2 values
                var x = j + 0.5;
                var y = i + 0.5;
                // Sample around the point (x,y)
                var s = this.sample(x, y + 0.5);
                var n = this.sample(x, y - 0.5);
                var e = this.sample(x + 0.5, y);
                var w = this.sample(x - 0.5, y);

                var index = i * dst.width + j;
                dst.data[index] = (e.x - w.x) + (s.y - n.y);
            }
        }
    }

    // Jacobi iterator using b, alpha, beta, and i iterations to solve into
    // this field. A scratch buffer is provided to minimize memory allocation.
    this.jacobi = function(scratch, b, alpha, beta, i, boundary) {
        // Ensure after i iterations, final result is in this
        var writeScratch = (i % 2) == 0;

        for(var l = 0; l < i; l++) {
            // Reset destination and source
            var dest = writeScratch ? scratch : this;
            var src = writeScratch ? this : scratch;

            // Enforce boundary conditions
            dest.updateBoundary(boundary);

            // Calculate latest value
            for(var j = 1; j < dest.height - 1; j++) {
                for(var k = 1; k < dest.width - 1; k++) {
                    // Sample neighboring squares from source
                    var index = j * dest.width + k;
                    var w = src.data[index - 1];
                    var n = src.data[index - dest.width];
                    var e = src.data[index + 1];
                    var s = src.data[index + dest.width];

                    // Compute sample from b field
                    var alphaB = b.data[index] * alpha;

                    dest.data[index] = (w + n + e + s + alphaB) / beta;
                }
            }

            // Swap destination and source
            writeScratch = !writeScratch;
        }
    }

    // Calculates the gradient of this field into dst
    this.gradient = function(dst) {
        for(var i = 0; i < dst.height; i++) {
            for(var j = 0; j < dst.width; j++) {
                var index = i * dst.width + j;
                var c = this.data[index];
                var e = this.data[index + 1];
                var w = this.data[index - 1];
                var s = this.data[index + dst.width];
                var n = this.data[index - dst.width];

                if(i == 0) {
                    dst.data[index].y = (s - c);
                }
                else if(i == dst.height - 1) {
                    dst.data[index].y = (c - n);
                }
                else {
                    dst.data[index].y = (s - n) / 2.0;
                }

                if(j == 0) {
                    dst.data[index].x = (e - c);
                }
                else if(j == dst.width - 1) {
                    dst.data[index].x = (c - w);
                }
                else {
                    dst.data[index].x = (e - w) / 2.0;
                }
            }
        }
    }

    // Update boundary values to be the value of closest interior cell scaled by k
    this.updateBoundary = function(k) {
        if(this.dimension == 1) {
            this.updateCenters(k);
        }
        if(this.dimension == 2) {
            this.updateEdges(k);
        }
    }

    this.updateCenters = function(k) {
        // Update top and bottom rows
        for(var i = 0; i < this.width; i++) {
            this.data[i] = this.scale(k, this.data[i + this.width]);
            var index = (this.height - 1) * this.width + i;
            this.data[index] = this.scale(k, this.data[index - this.width]);
        }
        // Update left and right columns
        for(var i = 0; i < this.height; i++) {
            var index = i * this.width;
            this.data[index] = this.scale(k, this.data[index + 1]);
            index = index + this.width - 1;
            this.data[index] = this.scale(k, this.data[index - 1]);
        }
    }

    this.updateEdges = function(k) {
        // Outer edges of staggered fields are defined to be 0
        this.u.updateCenters(0);
        this.v.updateCenters(0);

        // Update top and bottom rows of v field
        for(var i = 1; i < this.v.width - 1; i++) {
            var index = i + this.v.width;
            this.v.data[index] = k * this.v.data[index + this.width];
            index = (this.v.height - 2) * this.v.width + i;
            this.v.data[index] = k * this.v.data[index - this.width];
        }
        // Update left and right columns of u field
        for(var i = 1; i < this.u.height - 1; i++) {
            var index = i * this.u.width + 1;
            this.u.data[index] = k * this.u.data[index + 1];
            index = i * this.u.width + this.u.width - 2;
            this.u.data[index] = k * this.u.data[index - 1];
        }
    }

    // Calculate (this - other) into this
    this.subtract = function(other) {
        // Loop through and subtract element by element
        for(var i = 0; i < this.height; i++) {
            for(var j = 0; j < this.width; j++) {
                var index = i * this.width + j;
                // Actual subtraction depends on field type
                if(this.dimension == 1) {
                    this.data[index] = this.data[index] - other.data[index];
                }
                if(this.dimension == 2) {
                    this.data[index].x = this.data[index].x - other.data[index].x;
                    this.data[index].y = this.data[index].y - other.data[index].y;
                }
            }
        }
    }

    this.scale = function(k, a) {
        if(this.dimension == 1) {
            return k * a;
        }
        if(this.dimension == 2) {
            return {x:k * a.x, y:k * a.y};
        }
    }

    this.zero = function() {
        if(this.dimension == 1)
            return 0;
        else if(this.dimension == 2)
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

    this.fillZero = function() {
        if(dimension == 1) {
            for(var i = 0; i < this.height; i++) {
                for(var j = 0; j < this.width; j++) {
                    var index = i * this.width + j;
                    this.data[index] = 0;
                }
            }
        }

        if(dimension == 2) {
            this.u.fillZero();
            this.v.fillZero();
        }
    }
}
