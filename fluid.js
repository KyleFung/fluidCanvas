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
    this.c0 = new field(width, height);
    this.c1 = new field(width, height);

    // Velocity
    this.v0 = new field(width, height);
    this.v1 = new field(width, height);

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
        var vDst = this.showBack ? this.v0: this.v1;
        var vSrc = !this.showBack ? this.v0: this.v1;

        var cDst = this.showBack ? this.c0: this.c1;
        var cSrc = !this.showBack ? this.c0: this.c1;

        // Solve non-divergence free velocity for each cell
        for(var i = 1; i < this.height - 1; i++) {
            for(var j = 1; j < this.width - 1; j++) {
                // Solve a cell
            }
        }

        this.showBack = !this.showBack;
    }
}

function field(width, height) {
    this.data = new Array(width * height);
    this.width = width;
    this.height = height;
}
