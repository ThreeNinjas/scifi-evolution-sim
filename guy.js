class Guy {
  constructor(traits) {
    this.id = traits.id;
    this.x = traits.x;
    this.y = traits.y;
    this.color = traits.color;
    this.size = traits.size;
    this.hasDominantColor = traits.hasDominantColor;
    this.senseDistance = traits.senseDistance || 5; //This should always be a percentage of their size, right? So always > this.size
    
    //acquired
    this.stomachContents = 0;
  }

  drawMe() {
    push();
      stroke(this.color);
      fill(this.color);
      circle(this.x, this.y, this.size);

      if (this.stomachContents > 0) {
        stroke(c.foodColor);
        fill(c.foodColor);
        circle(this.x, this.y+1, this.stomachContents);
      }
    pop();

    if (debug) {
      push();
      fill('white');
      textSize(10);
      text(`${this.id},${this.calculateSensePerim()}`, this.x - 10, this.y);
    pop();

    push();
      stroke('white');
      noFill();
      circle(this.x, this.y, this.calculateSensePerim())
    pop();
    }     
  }

  static getGuyById(id) {
    return guys.find(g => g.id === id);
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
    return dist(this.x, this.y, other.x, other.y) < this.size;
  }

  intersectsFood(foods) {
    for (let food of foods) {
        if (dist(this.x, this.y, food.x, food.y) < this.size) {
            return food.id;
        }
    }
    return null;
  }

  eat(foodToEat) {
    forage.remove(foodToEat);
    this.stomachContents += forage.foodSize;
  }

  senses(other) {
    return dist(this.x, this.y, other.x, other.y) < this.calculateSensePerim();
  }

  calculateSensePerim() {
    return this.size + (this.size * this.senseDistance)
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
