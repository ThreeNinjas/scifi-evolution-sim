class Guy {
  constructor(traits) {
    this.x = traits.x;
    this.y = traits.y;
    this.color = traits.color;
    this.size = traits.size;
    this.hasDominantColor = traits.hasDominantColor;
  }

  drawMe() {
    push();
    stroke(this.color);
    fill(this.color);
    circle(this.x, this.y, this.size);
    pop();
  }

  move() {
    for (const key of ["x", "y"]) {
      switch (util.randomNumber(0, 2)) {
        case 0:
          break;
        case 1:
          if (this[key] < config.bounds[key].max) {
            this[key]++;
          }
          break;
        case 2:
          if (this[key] > config.bounds[key].min) {
            this[key]--;
          }
          break;
      }
    }
    this.drawMe();
  }

  intersects(other) {
    return dist(this.x, this.y, other.x, other.y) < diameter
  }

  dominance() {
    return this.hasDominantColor ? 0.5 + (temp/100) : 0.5;
  }

  static whoIsDominant(a, b) {
    if (a.hasDominantColor && b.hasDominantColor) {
      return 'both';
    }
    
    if (a.hasDominantColor && !b.hasDominantColor) {
      return {
        dom: a,
        non: b
      };
    }

    if (!a.hasDominantColor && b.hasDominantColor) {
      return {
        dom: b,
        non: a
      };
    }

    return false;
  }
}
