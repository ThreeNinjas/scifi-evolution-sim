class Guy {
  constructor(traits) {
    this.id = traits.id;
    this.color = traits.color;
    this.size = traits.size;
    this.hasDominantColor = traits.hasDominantColor;
    this.senseDistance = this.getSenseDistance(); //This should always be a percentage of their size, right? So always > this.size

    this.halo = 0;
    this.isSeeking = 0;

    //vectors
    this.pos = createVector(traits.x, traits.y);
    this.vel = p5.Vector.random2D();
    this.vel.mult(random(3));
    this.velLimit = !util.chance(99) ? 5 : random(0.00001, 0.25); //0.00001; // constrain(0.5 * util.logNormalMultiplier(), 0.5, data.vis);
    this.noise = p5.Vector.random2D().setMag(0.1);
    this.noiseRotate = random(-100, 100);
    this.noiseMagnitude = util.rightSkew(0.5, 5, data.clouds > 0 ? map(data.clouds, 0, 100, 0.1, 3) : 1);

    this.target = createVector(0,0);
    this.acc = createVector(0,0);
    //this.seekAccel = constrain(0.5 * util.logNormalMultiplier(), 0.5, data.vis);
    this.seekAccel = util.rightSkew(0.5, data.vis, 1)
    
    this.overRideMove = util.chance(data.hum) ? 0 : 1;
    this.overRideMoveIntermittent = util.chance(data.hum) && !this.overRideMove ? 0 : 1;
    
    this.digestionRate = this.getDigestionRate();
    this.digestionProgress = 0;
    this.starvationProgress = 0;

    //acquired
    this.stomachContents = 0;
    this.dead = 0;
    this.decayProgress = 0;
  }

  drawMe() {
    push();
      stroke(!this.dead ? this.color : c.guys.deadColor);

      if (this.halo) {
        stroke('yellow');
      }
      fill(!this.dead ? this.color : c.guys.deadColor);
      circle(this.pos.x, this.pos.y, this.size);

      if (this.stomachContents > 0) {
        stroke(c.foodColor);
        fill(c.foodColor);
        circle(this.pos.x, this.pos.y+1, this.stomachContents);
      }
    pop();

    if (debug) {
      push();
      fill('white');
      textSize(10);
      text(`${this.id},${this.calculateSensePerim()}`, this.pos.x - 10, this.pos.y);
    pop();

    push();
      stroke('white');
      noFill();
      circle(this.pos.x, this.pos.y, this.calculateSensePerim())
    pop();
    }     
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
        this.halo = 0;
        this.isSeeking = 0;
    }
    //this.drawMe();
  }

  intersects(other) {
    return dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y) < this.size;
  }

  sensesFood(foods) {
    for (let food of foods) {
        if (dist(this.pos.x, this.pos.y, food.x, food.y) < this.calculateSensePerim()) {
            //this.halo = 1;
            this.isSeeking = 1;
            return {x: food.x, y: food.y, id: food.id}
        }
    }

    return null;
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
    this.halo = 0;
    this.isSeeking = 0;
  }

  isHungry() {
    if (this.stomachContents > (this.size * 0.4)) {
        return false;
    }

    return true;
  }

  senses(other) {
    return dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y) < this.calculateSensePerim();
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
