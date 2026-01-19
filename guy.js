class Guy {
  constructor(traits) {
    //genes
    this.id = traits.id;
    this.color = traits.color;
    this.size = traits.size;
    this.hasDominantColor = traits.hasDominantColor;
    this.senseDistance = this.getSenseDistance(); //This should always be a percentage of their size, right? So always > this.size
    this.overRideMove = util.chance(data.hum) ? 0 : 1;
    this.overRideMoveIntermittent = util.chance(data.hum) && !this.overRideMove ? 0 : 1;
    this.digestionRate = this.getDigestionRate();
    

    //vectors
    this.pos = createVector(traits.x, traits.y);
    this.vel = p5.Vector.random2D();
    this.velLimit = !util.chance(99) ? 5 : random(0.00001, 0.25); //0.00001; // constrain(0.5 * util.logNormalMultiplier(), 0.5, data.vis);
    
    this.noise = p5.Vector.random2D().setMag(0.1);
    this.noiseRotate = util.randomNormal(50, 10);
    this.noiseMagnitude = util.randomNormalBounded(1, 1, 0, 10); //util.rightSkew(0.5, 5, data.clouds > 0 ? map(data.clouds, 0, 100, 0.1, 3) : 1);
    
    this.randomNormal = util.randomNormal(5, data.clouds/10);
    this.randomNormalBounded = util.randomNormalBounded(5, 1, 0, 10);

    this.target = createVector(0,0);
    this.acc = createVector(0,0);
    //this.seekAccel = constrain(0.5 * util.logNormalMultiplier(), 0.5, data.vis);
    this.seekAccel = util.randomNormal(0.5, data.vis); 

    //acquired / stative
    this.stomachContents = 0;
    this.dead = 0;
    this.decayProgress = 0;
    this.isHorny = 0;
    this.halo = 0;
    this.isSeeking = 0;
    this.digestionProgress = 0;
    this.starvationProgress = 0;

    this.mateTargets = [];
  }

  drawMe() {
    push();
      stroke(!this.dead ? this.color : c.guys.deadColor);

      
      fill(!this.dead ? this.color : c.guys.deadColor);
      circle(this.pos.x, this.pos.y, this.size);

      if (this.isHorny == 1) {
        strokeWeight(1);
        stroke('white');
        noFill();
        circle(this.pos.x, this.pos.y, this.size + 5);
      }

      if (this.stomachContents > 0) {
        stroke(c.foodColor);
        fill(c.foodColor);
        circle(this.pos.x, this.pos.y+1, this.stomachContents);
      }
    pop();

    push();
      if (this.halo == 1) {
        stroke('#339cccff');
        noFill();
        circle(this.pos.x, this.pos.y, this.size * 2);
        textSize(14);
        text(`DP:${this.digestionProgress.toFixed(4)}`, this.pos.x-10, this.pos.y + this.size * 2);
        text(`V:${this.vel.mag().toFixed(4)}`, this.pos.x - 10, (this.pos.y + this.size * 2) + 14);
        text(`VL:${this.velLimit.toFixed(4)}`, this.pos.x - 10, (this.pos.y + this.size * 2) + 28);
        text(`${this.overRideMove}, ${this.overRideMoveIntermittent}`, this.pos.x - 10, (this.pos.y + this.size * 2) + 42);

        if (this.isSeeking == 1) {
            line(this.pos.x, this.pos.y, this.target.x, this.target.y);
        }
      }
    pop();

    if (debug) {
      push();
      fill('white');
      textSize(10);
      text(`${this.id},${this.calculateSensePerim()}`, this.pos.x - 10, this.pos.y);
    pop();

    push();
      noFill();
      stroke('white')
      circle(this.pos.x, this.pos.y, this.calculateSensePerim());
    pop();
    }     
  }

  arrow(otherGuy) {
    this.target.x = otherGuy.pos.x;
    this.target.y = otherGuy.pos.y;
    stroke(this.color);

    line(this.pos.x, this.pos.y, otherGuy.pos.x, otherGuy.pos.y);

    const d = p5.Vector.sub(this.target, this.pos);
    const angle = atan2(d.y, d.x);
    const sourceRadius = this.size;
    const padding = 6;
    const tipDistanceFromSource = sourceRadius + padding;
    const back = createVector(d.x, d.y).setMag(dist(this.pos.x, this.pos.y, this.target.x, this.target.y) - tipDistanceFromSource);
    const tip = p5.Vector.sub(this.target, back);

    push();
        stroke('#ff3cd1ff');
        strokeWeight(2);
        translate(tip.x, tip.y);
        rotate(angle);
        line(0, 0, -4, -6);
        line(0, 0, -4, 6);
    pop();
  }

  static getGuyById(id) {
    return guys.find(g => g.id === id);
  }

  move() {
    if (this.dead) {
        return this.drawMe();
    } 
    for (const key of ["x", "y"]) {
      switch (util.randomNumber(0, 2)) {
        case 0:
          break;
        case 1:
          if (this.pos[key] < config.bounds[key].max) {
            this.pos[key]++;
          }
          break;
        case 2:
          if (this.pos[key] > config.bounds[key].min) {
            this.pos[key]--;
          }
          break;
      }
    }
    //this.drawMe();
  }

  /**
     * Cheat sheet for modifying food seeking efficiency
     * 1. Acceleration magnitude (this.acc) controls how hard a guy pulls toward food.
     *      -higher value = stronger steering towards food, faster course correction.
     *      -lower value = sluggish response, more drift
     * 
     * 2. Noise rotation range (this.noise.rotate()) controls direction instability
     *      -smaller range = smoother, more stable pursuit
     *      -higher range = jittery erratic path
     * 
     * 3. Noise magnitude controls how strong the randomness is
     *      -higher value = more wandering, less efficient seeking
     *      -lower value = straighter course to food
     * 
     * 4. Velocity limit controls max pursuit speed
     *      -higher value = potential for a hungrier dog
     *      -lower value = this dog is not food motivated
     * 
     * 5. The ratio of the respecitve magnitudes of this.acc and this.noise is the most important factor in determining seek efficiency.
     *      -acc > noise = more intentional seeking behavior
     *      -evenly matched = wandering with bias
     *      -acc < noise = chaos lol
     * 
     * 6. This is all according to ChatGPT so it could be completely fucking wrong.
     */

  seekFood(food) {
    if (forage.exists(food.id)) {
        this.target.x = food.x;
        this.target.y = food.y;

        this.acc.set(this.target).sub(this.pos);
        this.acc.setMag(this.seekAccel);

        //this.noise.rotate(random(-0.25, 0.25));
        this.noise.rotate(this.noiseRotate);
        this.noise.setMag(this.noiseMagnitude);
        this.acc.add(this.noise);

        this.vel.add(this.acc);
        this.vel.limit(this.velLimit);

        this.pos.add(this.vel);
        this.pos.x = constrain(this.pos.x, config.bounds.x.min, config.bounds.x.max);
        this.pos.y = constrain(this.pos.y, config.bounds.y.min, config.bounds.y.max);

        if (this.pos.x == config.bounds.x.min || this.pos.x == config.bounds.x.max) {
            this.vel.x = 0;
        }

        if (this.pos.y == config.bounds.y.min || this.pos.y == config.bounds.y.max) {
            this.vel.y = 0;
        }
    } else {
        this.isSeeking = 0;
    }
  }

  sensesFood(foods) {
    for (let food of foods) {
        if (dist(this.pos.x, this.pos.y, food.x, food.y) < this.calculateSensePerim()) {
            this.isSeeking = 1;
            return {x: food.x, y: food.y, id: food.id}
        }
    }

    return null;
  }

  senses(other) {
    return dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y) < this.calculateSensePerim();
  }

  intersects(other) {
    return dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y) < this.size;
  }

  intersectsFood(foods) {
    for (let food of foods) {
        if (dist(this.pos.x, this.pos.y, food.x, food.y) < this.size) {
            return food.id;
        }
    }
    return null;
  }

  eat(foodToEat) {
    forage.remove(foodToEat);
    this.stomachContents += forage.foodSize;
    this.isSeeking = 0;

    this.vel.setMag(0);
    this.target.x = 0;
    this.target.y = 0;
  }

  isHungry() {
    if (this.stomachContents > (this.size * 0.4)) {
        return false;
    }

    return true;
  }

  calculateSensePerim() {
    return this.size + (this.size * this.senseDistance)
  }

  dominance() {
    return this.hasDominantColor ? 0.5 + (data.temp/100) : 0.5;
  }

  getDigestionRate() {
    return Guy.getGlobalDigestionRate() * util.logNormalMultiplier();
  }

  getSenseDistance() {
    return Guy.getGlobalSenseDistance() * util.logNormalMultiplier();
  }

  static whoIsDominant(a, b) {
    if (a.stomachContents > b.stomachContents) {
        return {
            dom: a,
            non: b
        }
    }

    if (b.stomachContents > a.stomachContents) 
        return {
            dom: b,
            non: a
        }

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

  static getGlobalDigestionRate() {
    return data.temp / (data.hum * 750);
  }

  static getGlobalSenseDistance() {
    return util.chance(data.vis) ? 5 + 5 * (data.vis/10) : 5
  }
}
