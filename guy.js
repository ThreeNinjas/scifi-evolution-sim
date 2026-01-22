let NEXT_ID = 0;
class Guy {
  constructor(traits) {
    //genes
    this.id = NEXT_ID++;

    //developmental
    this.adultSize = constrain(Math.abs(Math.floor(util.randomNormal(10, data.clouds/10))), 5, 100);
    this.size = 5; //this.adultSize;
    this.pingSize = this.size;
    let globalDigestionRate = Guy.getGlobalDigestionRate();
    this.growthRate = Math.abs(util.randomNormal(globalDigestionRate - (globalDigestionRate * (data.clouds/100)), 0.0005));

    //heritable - value
    this.color = util.randomColor(data.temp, data.hum);
    this.senseDistance = this.getSenseDistance(); //This should always be a percentage of their size, right? So always > this.size
    this.digestionRate = this.getDigestionRate();
    
    //heritable - boolean
    this.hasDominantColor = util.chance(data.temp * 0.25);
    this.overRideMove = util.chance(data.hum) ? 0 : 1;
    this.overRideMoveIntermittent = util.chance(data.hum) && !this.overRideMove ? 0 : 1;
    this.smartFoodFinder = util.coinToss(0, 1);
    this.resolute = util.chance(10); //if this is true, guy won't change its mind about food targets

    //heritable - vectors
    this.velLimit = !util.chance(99) ? 5 : util.randomNormal(0.001, 0.25); // random(0.00001, 0.25); //0.00001; // constrain(0.5 * util.logNormalMultiplier(), 0.5, data.vis);
    this.noise = p5.Vector.random2D().setMag(0.1);
    this.noiseRotate = util.randomNormal(50, 10);
    this.noiseMagnitude = util.randomNormalBounded(1, 1, 0, 10); //util.rightSkew(0.5, 5, data.clouds > 0 ? map(data.clouds, 0, 100, 0.1, 3) : 1);
    this.seekAccel = util.randomNormal(0.5, data.vis); 

    //vectors
    this.pos = createVector(util.randomNumber(config.bounds.x.min, config.bounds.x.max), util.randomNumber(config.bounds.y.min, config.bounds.y.max));
    this.vel = p5.Vector.random2D();
    this.acc = createVector(0,0);

    //acquired / stative
    this.stomachContents = 0;
    this.dead = 0;
    this.decayProgress = 0;
    this.isHorny = 0;
    this.halo = 0;
    this.isSeeking = 0;
    this.digestionProgress = 0;
    this.starvationProgress = 0;
    this.growthProgress = 0;

    this.target = createVector(0,0);
    
    this.potentialMates = [];
    this.mateTimer = 0;
    this.mate = undefined;
    this.mutationPackage = [];   
  }


 

  drawMe() {
    push();
      stroke(!this.dead ? this.color : c.guys.colors.dead);

      
      fill(!this.dead ? this.color : c.guys.colors.dead);
      circle(this.pos.x, this.pos.y, this.size);

      if (this.isHorny == 1) {
        strokeWeight(0.5);
        stroke('#cc2233');
        noFill();
        circle(this.pos.x, this.pos.y, this.size);
      }

      if (this.stomachContents > 0) {
        stroke(c.forage.color);
        fill(c.forage.color);
        circle(this.pos.x, this.pos.y+1, this.stomachContents);
      }
      if (!this.dead) {
        drawPing(this);
      }
    pop();

    if (this.halo == 1) {
        push();
            stroke('#339cccff');
            noFill();
            circle(this.pos.x, this.pos.y, this.size * 2);
            textSize(14);
            let startY = this.pos.y + (this.size * 2);
            let haloData = [];
            if (this.mutationPackage.length > 0) {
                for (let datum of this.mutationPackage) {
                    haloData.push(`::${datum.trait}::`);
                    haloData.push(`A: ${datum.mom}`);
                    haloData.push(`B: ${datum.dad}`);
                    haloData.push(`C: ${datum.baby}`);
                }
            } else {
                haloData = [
                    `DP:${this.digestionProgress.toFixed(4)}`,
                    `SP:${this.calculateSensePerim().toFixed(4)}`,
                    `V:${this.vel.mag().toFixed(4)}`,
                    `VL:${this.velLimit.toFixed(4)}`, 
                    `NM:${this.noiseMagnitude.toFixed(4)}`,
                    `SA:${this.seekAccel.toFixed(4)}`,
                    `${this.overRideMove}, ${this.overRideMoveIntermittent}, ${this.resolute}`,
                ];
            }

            for (let datum of haloData) {
                text(datum, this.pos.x-10, startY);
                startY += 14;
            }
            // text(`DP:${this.digestionProgress.toFixed(4)}`, this.pos.x-10, this.pos.y + this.size * 2);
            // text(`SP:${this.calculateSensePerim().toFixed(4)}`, this.pos.x-10, (this.pos.y + this.size * 2) + 14);
            // text(`V:${this.vel.mag().toFixed(4)}`, this.pos.x - 10, (this.pos.y + this.size * 2) + 28);
            // text(`VL:${this.velLimit.toFixed(4)}`, this.pos.x - 10, (this.pos.y + this.size * 2) + 42);
            // text(`${this.overRideMove}, ${this.overRideMoveIntermittent}`, this.pos.x - 10, (this.pos.y + this.size * 2) + 56);

            if (this.isSeeking == 1) {
                line(this.pos.x, this.pos.y, this.target.x, this.target.y);
            }
        pop();
    }

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

  arrow(target) {
    const isGuy = target && target.pos !== undefined;

    if (isGuy) {
        this.target.x = target.pos.x;
        this.target.y = target.pos.y;

        stroke(this.color);
        line(this.pos.x, this.pos.y, target.pos.x, target.pos.y);
    } 

    const d = p5.Vector.sub(this.target, this.pos);
    const angle = atan2(d.y, d.x);
    const sourceRadius = this.size / 2;
    const padding = 4;
    const tipDistanceFromSource = sourceRadius + padding;
    const back = createVector(d.x, d.y).setMag(dist(this.pos.x, this.pos.y, this.target.x, this.target.y) - tipDistanceFromSource);
    const tip = p5.Vector.sub(this.target, back);

    push();
        if (isGuy) {
            stroke(c.guys.colors.horny);
        } else {
            stroke(c.guys.colors.hungry);
        }
        
        strokeWeight(2);
        translate(tip.x, tip.y);
        rotate(angle);
        if (isGuy) {
            line(0, 0, -4, -6);
            line(0, 0, -4, 6);
        } else {
            line(0, 0, -4, -4);
            line(0, 0, -4, 4);
        }
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
        if (this.target.x == 0 && this.target.y == 0) {
            this.target.x = food.x;
            this.target.y = food.y;
        } else if (!this.resolute) {
            this.target.x = food.x;
            this.target.y = food.y;
        }
        
        this.acc.set(this.target).sub(this.pos);
        this.acc.setMag(this.seekAccel);

        //this.noise.rotate(random(-0.25, 0.25));
       

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
        this.target.x = 0;
        this.target.y = 0;
    }
  }

  seekMate(mate, guys) {
    if (!mate.isHorny) {
        this.resetHorniness();
        return;
    }
    if (!this.overRideMove) {
        this.move();
    }

    if (this.overRideMoveIntermittent) {
        if (util.coinToss(1, 2) == 1) {
            this.move();
        }
    }
    this.arrow(mate);

    this.acc.set(this.target).sub(this.pos);
    this.acc.setMag(this.seekAccel);

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

    if (dist(this.pos.x, this.pos.y, this.target.x, this.target.y) <= 5) {
        if (mate && dist(this.pos.x, this.pos.y, mate.pos.x, mate.pos.y) <= 5) {
            this.businessTime(mate, guys);
        } else if (mate) {
            this.target.x = mate.pos.x;
            this.target.y = mate.pos.y;
        } else {
            this.isSeeking = 0;
            this.mate = null;
        }
    }
  }

  businessTime(mate, guys) {
    //TODO: make babies small! let them grow into sexual maturity
    let mutation = false;
    if (this.id < mate.id) return;

    const parentA = Guy.biggerId(this, mate);
    const parentB = Guy.smallerId(this, mate);

    const child = new Guy();

    for (const trait of c.guys.traits.binary) {
        child[trait] = util.coinToss(parentA, parentB)[trait];
        if (util.chance(1, c.guys.mutationRate)) {
            child[trait] = !child[trait]
            child.halo = 1;
            mutation = true;
            child.mutationPackage.push({
                trait,
                mom: parentA[trait],
                dad: parentB[trait],
                baby: child[trait]
            });
        }
    }

    for (const trait of c.guys.traits.value) {
        child[trait] = util.coinToss(parentA, parentB)[trait];
        if (util.chance(1, c.guys.mutationRate)) {
            const sign = util.chance(1, 2) ? 1: -1;
            const percent = Math.abs(util.randomNormal(0, 0.03));
            child[trait] += 1 + sign * percent;
            child.halo = 1;
            mutation = true;
            child.mutationPackage.push({
                trait,
                mom: parentA[trait].toFixed(3),
                dad: parentB[trait].toFixed(3),
                baby: child[trait].toFixed(3)
            });
        }
    }

    if (util.chance(1, 1000)) {
        child.color = util.randomColor();
    }
    child.color = parentA.hasDominantColor ? parentA.color : (parentB.hasDominantColor ? parentB.color : util.coinToss(parentA, parentB).color);

    if (mutation) {
        console.log('mutation!');
        console.log(child.mutationPackage);
    }

    child.pos.x = this.pos.x + 10;
    child.pos.y = this.pos.y + 10;
    
    stats.guys++;
    
    this.resetHorniness(mate);
    guys.push(child);
    return;
  }

  resetHorniness(mate = null) {
    for (let guy of [this, mate].filter(Boolean)) {
        guy.isSeeking = 0;
        guy.isHorny = 0;
        guy.stomachContents = guy.stomachContents / 4;
        guy.mate = null;
    }
  }

  sensesFood(foods) {
    let potentialFoods = [];
    for (let food of foods) {
        if (dist(this.pos.x, this.pos.y, food.x, food.y) < this.calculateSensePerim()) {
            this.isSeeking = 1;
            //
            if (this.smartFoodFinder) {
                potentialFoods.push({x: food.x, y: food.y, id: food.id, dist: dist(this.pos.x, this.pos.y, food.x, food.y)});
            } else {
                return {x: food.x, y: food.y, id: food.id}
            }
            
        }
    }

    if (potentialFoods.length > 0) {
        return potentialFoods.reduce((a, b) => a.dist < b.dist ? a : b);

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

  isSexuallyMature() {
    return this.size >= this.adultSize - (this.adultSize * 0.1);
  }

  calculateSensePerim() {
    return this.size + (this.senseDistance);
  }

  dominance() {
    return this.hasDominantColor ? 0.5 + (data.temp/100) : 0.5;
  }

  getDigestionRate() {
    return Guy.getGlobalDigestionRate() * util.logNormalMultiplier();
  }

    getSenseDistance(){
        return Math.max(0, util.randomNormal(Guy.getGlobalSenseDistance(this.size), data.vis * data.vis));
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

  static getGlobalSenseDistance(size) {
    return size * 2;
  }

  static biggerId(a, b) {
    return a.id > b.id ? a : b;
  }

  static smallerId(a, b) {
    return a.id < b.id ? a : b;
  }
}
