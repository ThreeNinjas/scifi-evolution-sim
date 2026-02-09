let NEXT_ID = 0;
class Guy {
  constructor(traits) {
    //genes
    this.id = NEXT_ID++;

    let globalDigestionRate = Guy.getGlobalDigestionRate();

    //heritable - value
    this.adultSize = constrain(
      Math.abs(Math.floor(util.randomNormal(12, data.clouds / 10))),
      5,
      100
    );
    this.growthRate = Math.abs(
      util.randomNormal(
        globalDigestionRate - globalDigestionRate * (data.clouds / 100),
        0.0005
      )
    );
    this.color = util.randomColor(data.temp, data.hum);
    this.senseDistanceMultiplier = util.randomNormal(1, 0.5);
    this.digestionRate = this.getDigestionRate();
    this.lifeSpan = util.randomNormal(data.temp, data.vis);
    this.childrenAllowed = Math.abs(
      Math.floor(util.randomNormal(data.temp / 5, data.vis))
    );
    this.reactionTime = constrain(Math.abs(Math.floor(util.randomNormal(data.temp, data.hum))), 30, 20000);

    //heritable - special cases
    //there's a 1 in temperature chance that guy will have a preference of some random trait
    this.preference = Guy.getPreference();
    this.preferenceDirection = Guy.getPreferenceDirection();

    //heritable - boolean
    this.hasDominantColor = util.chance(data.temp * 0.25);
    this.overRideMove = util.chance(data.hum) ? 0 : 1;
    this.overRideMoveIntermittent =
      util.chance(data.hum) && !this.overRideMove ? 0 : 1;
    this.smartFoodFinder = util.coinToss(0, 1);
    this.resolute = util.chance(10); //if this is true, guy won't change its mind about food targets
    this.movesAwayFromBaby = util.chance(data.temp);
    this.wander = util.chance(data.clouds);
    
    this.carnivorous = getTimeIndex() < data.totalRainfall * 10 ? false : guys.length == 100 ? true : util.chance(1, Math.abs(100 - guys.length));
    this.carnivoreNoisePlayed = false;
    if (this.carnivorous) {
        this.digestionRate = Math.abs(this.digestionRate);
        console.log(`Guy${this.id} is a carnivore.`);
        util.playNoise(sounds.carnivoreNoise, () => this.carnivoreNoisePlayed = true);

        if (!pt.thresholds.carnivore.passed) {
            pt.thresholds.carnivore.passed = true;
        }
    }

    this.armored = guys.filter(g => g.carnivorous).length > guys.length / 2 ? util.coinToss(true, false) : null;
    this.runsFromPredators = guys.filter(g => g.carnivorous).length > guys.length / data.totalRainfall ? util.coinToss(true, false) : null;
    if (this.armored) this.carnivorous = false;
    if (this.carnivorous) this.armored = false;

    if (this.armored && !pt.thresholds.armored.passed) {
        pt.thresholds.armored.passed = true;
    }

    //heritable - vectors
    this.velLimit = !util.chance(99) ? 5 : util.randomNormal(0.001, 0.25); // random(0.00001, 0.25); //0.00001; // constrain(0.5 * util.logNormalMultiplier(), 0.5, data.vis);
    this.noise = p5.Vector.random2D().setMag(0.1);
    this.noiseRotate = util.randomNormal(50, 10);
    this.noiseMagnitude = util.randomNormalBounded(1, 1, 0, 10); //util.rightSkew(0.5, 5, data.clouds > 0 ? map(data.clouds, 0, 100, 0.1, 3) : 1);
    this.seekAccel = util.randomNormal(0.5, data.vis);

    //vectors
    this.pos = createVector(
      util.randomNumber(config.bounds.x.min, config.bounds.x.max),
      util.randomNumber(config.bounds.y.min, config.bounds.y.max)
    );
    this.vel = p5.Vector.random2D();
    this.acc = createVector(0, 0);

    //acquired / stative
    this.size = 5 >= this.adultSize * 0.9 ? this.adultSize * 0.6 : 5;
    this.pingSize = this.size;
    this.birthday = getTimeIndex();
    this.stomachContents = 0;
    this.dead = 0;
    this.decayProgress = 0;
    this.isHorny = 0;
    this.halo = 0;
    this.haloWasSetAutomatically = 0;
    this.isSeeking = 0;
    this.digestionProgress = 0;
    this.starvationProgress = 0;
    this.growthProgress = 0;
    this.senseDistance = this.senseDistanceG(); //This should always be a percentage of their size, right? So always > this.size
    this.orbiters = [];
    this.offspringCount = 0;
    this.deathNoisePlayed = 0;

    this.wanderStartingT = 0;
    this.wanderNoisePlayed = false;

    this.reactionStartFrame = null;

    this.target = createVector(0, 0);
    this.seekPriority = null; //food|mate|baby|prey|evade|wander

    this.prey = undefined;
    this.beingChasedBy = undefined;
    this.chosenCorner = null;

    this.potentialMates = [];
    this.mateTimer = 0;
    this.mate = undefined;

    this.mutationPackage = [];

    this.lastPing = 0;

    //phylogeny
    this.parents = [];
    this.children = [];
  }

  drawMe() {
    push();
    if (this.orbiters.length > 0) {
      this.orbiter();
    }

    stroke(!this.dead ? this.color : c.guys.colors.dead);

    fill(!this.dead ? this.color : c.guys.colors.dead);
    circle(this.pos.x, this.pos.y, this.size);

    if (this.isHorny == 1) {
      strokeWeight(0.5);
      stroke("#cc2233");
      noFill();
      circle(this.pos.x, this.pos.y, this.size);
    }

    if (this.stomachContents > 0) {
      stroke(this.carnivorous ? c.guys.colors.mars : c.forage.color);
      fill(c.forage.color);
      circle(this.pos.x, this.pos.y + 1, constrain(this.stomachContents, 0, this.size - 1));
    }
    if (
      !this.dead &&
      this.senseDistance > 0 &&
      ((this.isHungry() && !this.isSeeking) ||
        (this.isHungry() && this.target.x == 0) ||
        (this.isHorny && !this.isSeeking))
    ) {
      drawPing(this);
    }

    if (this.carnivorous && this.isHungry()) {
        drawPing(this);
    }
    pop();

    if (this.halo == 1) {
      push();
      stroke("#ffdf27ff");
      noFill();
      circle(this.pos.x, this.pos.y, this.size * 2);
      pop();
      push();
          stroke(c.guys.colors.hungry);
          noFill();
          circle(this.pos.x, this.pos.y, this.size * 2);
          textSize(14);
          let startY = this.pos.y + (this.size * 2);
          let haloData = [];
            if (this.carnivorous) haloData.push('carnivorous');
            if (this.armored) haloData.push('armored');
            if (this.children.length > 0) haloData.push(`${this.children.length} children`);
            if (this.orbiters.length > 0) {
            for (let orbiter of this.orbiters) {
                haloData.push(`${orbiter.trait}, ${orbiter.delta.toFixed(4)}`);
            }
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

      // if (this.isSeeking == 1) {
      //     line(this.pos.x, this.pos.y, this.target.x, this.target.y);
      // }
      pop();
    }

    if (debug) {
      push();
      fill("white");
      textSize(10);
      text(
        `${this.id},${this.calculateSensePerim()}`,
        this.pos.x - 10,
        this.pos.y
      );
      pop();

      push();
      noFill();
      stroke("white");
      circle(this.pos.x, this.pos.y, this.calculateSensePerim());
      pop();
    }

    if (this.armored) {
        push();
            noFill();
            strokeWeight(1);
            stroke(c.guys.colors.radioactive);
            circle(this.pos.x, this.pos.y, this.size - (this.size * 0.4));
            circle(this.pos.x, this.pos.y, this.size + (this.size * 0.5));
        pop();
    }

    if (this.carnivorous) {
        push();
            noFill();
            strokeWeight(1);
            stroke(c.guys.colors.mars);
            circle(this.pos.x, this.pos.y, this.size - (this.size * 0.4));
            circle(this.pos.x, this.pos.y, this.size + (this.size * 0.5));
        pop();
    }
  }

  arrow(target) {
    const isGuy = target && target.pos !== undefined;

    if (isGuy) {
      this.target.x = target.pos.x;
      this.target.y = target.pos.y;
    }
    
    if (this.target.x === 0 && this.target.y === 0) return;

    if (isGuy && !treeMode) {
      stroke(this.color);
      line(this.pos.x, this.pos.y, target.pos.x, target.pos.y);
    }

    const d = p5.Vector.sub(this.target, this.pos);
    const angle = atan2(d.y, d.x);
    const sourceRadius = this.size / 2;
    const padding = 4;
    const tipDistanceFromSource = sourceRadius + padding;
    const back = createVector(d.x, d.y).setMag(
      dist(this.pos.x, this.pos.y, this.target.x, this.target.y) -
        tipDistanceFromSource
    );
    const tip = p5.Vector.sub(this.target, back);

    push();
    if (isGuy) {
        if (this.seekPriority == 'prey') {
            stroke(c.guys.colors.mars);
        } else {
            stroke(c.guys.colors.horny);
        }
      
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

      if (this.seekPriority == 'wander') {
        line(5, 0, -4, -4);
        line(5, 0, -4, 4);
      }

      if (this.seekPriority == 'evade') {
        push();
            stoke(c.guys.colors.mars);
            line(10, 0, 4, -6);
            line(10, 0, 4, 6);
        pop();
      }
    }
    pop();
  }

  orbiter() {
    if (this.dead) return;
    
    for (let i = 0; i < this.orbiters.length; i++) {
        if (this.orbiters[i].delta >= 1 || this.orbiters[i].delta <= -1) {
            continue;
        }
      push();
      let orbiterSize = this.size * 0.2 >= 2 ? this.size * 0.2 : 2;
      translate(this.pos.x, this.pos.y);
      strokeWeight(orbiterSize);
      stroke(this.orbiters[i].color);

      let r = this.size * this.orbiters[i].rMultiplier;
      let x = r * cos(this.orbiters[i].angle);
      let y = r * sin(this.orbiters[i].angle);
      point(x, y);
      this.orbiters[i].angle += this.orbiters[i].delta;
      pop();
    }
  }

  static getGuyById(id) {
    return byId[id];
  }

  move() {
    if (this.dead) {
      return this.drawMe();
    }

    // if (this.overRideMove) {
    //     return;
    // }

    // if (this.overRideMoveIntermittent) {
    //     if (util.coinToss('oven', 'toaster oven') == 'oven') {
    //         return;
    //     }
    // }

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
      this.pos.x = constrain(
        this.pos.x,
        config.bounds.x.min,
        config.bounds.x.max
      );
      this.pos.y = constrain(
        this.pos.y,
        config.bounds.y.min,
        config.bounds.y.max
      );

      if (
        this.pos.x == config.bounds.x.min ||
        this.pos.x == config.bounds.x.max
      ) {
        this.vel.x = 0;
      }

      if (
        this.pos.y == config.bounds.y.min ||
        this.pos.y == config.bounds.y.max
      ) {
        this.vel.y = 0;
      }
    } else {
      this.isSeeking = 0;
      this.target = null;
    }
  }

  seekMate(mate, guys) {
    if (!mate.isHorny) {
      this.mate = null;
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
    this.pos.x = constrain(
      this.pos.x,
      config.bounds.x.min,
      config.bounds.x.max
    );
    this.pos.y = constrain(
      this.pos.y,
      config.bounds.y.min,
      config.bounds.y.max
    );
    if (
      this.pos.x == config.bounds.x.min ||
      this.pos.x == config.bounds.x.max
    ) {
      this.vel.x = 0;
    }

    if (
      this.pos.y == config.bounds.y.min ||
      this.pos.y == config.bounds.y.max
    ) {
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

  seek() {
    if (this.seekPriority == 'prey' && this.prey && this.prey.dead) {
        this.isSeeking = 0;
        this.target.x = 0;
        this.target.y = 0;
        this.seekPriority = null;
        this.prey = null;
        return;
    }

    switch (this.seekPriority) {
        case 'prey':
            this.arrow(this.prey);
            break;
        case 'wander':
            this.arrow(this.target);
            break;
    }
    
    this.acc.set(this.target).sub(this.pos);
    this.acc.setMag(this.seekAccel);

    this.noise.rotate(this.noiseRotate);
    this.noise.setMag(this.noiseMagnitude);
    this.acc.add(this.noise);

    this.vel.add(this.acc);
    this.vel.limit(this.velLimit);

    this.pos.add(this.vel);
    this.pos.x = constrain(
      this.pos.x,
      config.bounds.x.min,
      config.bounds.x.max
    );
    this.pos.y = constrain(
      this.pos.y,
      config.bounds.y.min,
      config.bounds.y.max
    );
    if (
      this.pos.x == config.bounds.x.min ||
      this.pos.x == config.bounds.x.max
    ) {
      this.vel.x = 0;
    }

    if (
      this.pos.y == config.bounds.y.min ||
      this.pos.y == config.bounds.y.max
    ) {
      this.vel.y = 0;
    }

    let distToTarget;

    switch(this.seekPriority) {
        case 'evade':
        case 'wander':
            distToTarget = 20;
            break;
        default:
            distToTarget = 5;
            break;
    }

    //if you have reached your target:
    if (dist(this.pos.x, this.pos.y, this.target.x, this.target.y) <= distToTarget) {
        //if you are carnivorous and seeking prey and that prey has not died:
        if (this.carnivorous && this.seekPriority == 'prey' && this.prey && !this.prey.dead) {
            //you found your guy, eat that fucker! unless he's armored
            if (!this.prey.armored) { 
                this.stomachContents += this.prey.stomachContents + this.prey.size;
                this.prey.stomachContents = 0;
                Guy.killThisGuy(this.prey);
                console.log(`Guy${this.id} just killed Guy${this.prey.id}.`);
                this.prey = undefined;
            }
        } 

        //if you are being chased by a predator 
        if (this.seekPriority == 'evade') {
            console.log(`${this.id} is still evading ${this.beingChasedBy.id}`);
            //and he's still targeting you and he's not dead
            if (this.beingChasedBy.prey == this && !this.beingChasedBy.dead) {
                if (this.chosenCorner !== null) {
                    this.chosenCorner++;
                    if (this.chosenCorner > c.corners.length - 1) this.chosenCorner = 0;
                    this.target = c.corners[this.chosenCorner].copy();
                    console.log(`new target: ${this.target.x}, ${this.target.y}`);
                }
                return;
            }
        }
        this.nullifyTarget();
    }
  }

  evadePredator() {
    //make corners an array, loop through them with i and have bestCorner be the index
    util.playNoise(sounds.avoid);
    this.seekPriority = 'evade';
    this.arrow();
    if (this.target.x == 0 && this.target.y === 0) {
        let away = p5.Vector.sub(this.pos, this.beingChasedBy.pos).normalize();
        let bestCorner = null;
        let bestScore = -Infinity;

        for (let i = 0; i < c.corners.length; i++) {
            let dir = p5.Vector.sub(c.corners[i], this.pos).normalize();
            let score = away.dot(dir);
            if (score > bestScore) {
                bestScore = score;
                bestCorner = c.corners[i].copy();
                this.target = bestCorner;   
                this.chosenCorner = i;
            }
        }
    }

     
    this.seek();
  }

  nullifyTarget() {
    switch (this.seekPriority) {
        case 'prey':
            this.prey = null;
            break;
        case 'evade':
            this.beingChasedBy = null;
            this.chosenCorner = null;
            break;
        case 'wander':
            this.wanderStartingT = 0;
            this.wanderNoisePlayed = false;
            break;
    }
    this.isSeeking = 0;
    this.target.x = 0;
    this.target.y = 0;
    this.seekPriority = null;
    this.vel.setMag(0);
  }

  chooseMate() {
    let speciationTraits = [
        'carnivorous',
        'armored'
    ];

    for (let trait of speciationTraits) {
        if (this[trait] && pt.speciationThresholdReached(trait)) {
            this.potentialMates = this.potentialMates.filter(g => g[trait]);
        }
    }
    if (!this.preference || this.potentialMates.length < 2) {
      return util.closestGuyByColor(this.color, this.potentialMates);
    }

    let bestGuy = null;
    let bestValue = this.preferenceDirection == 1 ? -Infinity : Infinity;

    for (const pm of this.potentialMates) {
      const v = pm[this.preference];

      if (this.preferenceDirection == 1) {
        if (v >= bestValue) {
          bestValue = v;
          bestGuy = pm;
        }
      } else {
        if (v <= bestValue) {
          bestValue = v;
          bestGuy = pm;
        }
      }
    }

    util.playNoise(sounds.prefBeep);

    return bestGuy;
  }

  businessTime(mate, guys) {
    //TODO: make babies small! let them grow into sexual maturity
    let mutationHappened = false;
    if (this.id < mate.id) return;

    const parentA = Guy.biggerId(this, mate);
    const parentB = Guy.smallerId(this, mate);

    this.offspringCount++;
    mate.offspringCount++;

    const child = new Guy();
    util.playNoise(sounds.birthBeep);
    child.parents.push(parentA.id, parentB.id);
    parentA.children.push(child.id);
    parentB.children.push(child.id);
    child.mutationPackage = {
      binary: [],
      value: [],
      special: [],
    };

    let mutation;
    let t = frameCount;

    for (const trait of c.guys.traits.binary) {
      child[trait] = util.coinToss(parentA, parentB)[trait];
      if (util.chance(1, c.guys.mutationRate)) {
        child[trait] = !child[trait];
        //child.halo = 1;
        mutationHappened = true;
        mutation = {
          t,
          trait,
          mom: parentA[trait],
          dad: parentB[trait],
          baby: child[trait],
        };
        child.mutationPackage.binary.push(mutation);
        viz.experiment.mutations[mutation.trait].push(mutation);
      }
    }

    for (const trait of c.guys.traits.value) {
      child[trait] = util.coinToss(parentA, parentB)[trait];
      if (util.chance(1, c.guys.mutationRate)) {
        mutationHappened = true;
        mutation = {
          t,
          trait,
          original: child[trait],
          mutated: 0,
          percentChange: 0,
        };
        const sign = util.chance(1, 2) ? 1 : -1;
        const percent = Math.abs(
          util.randomNormal(0, util.randomNumber(0.001, util.coinToss(data.totalDryDays, 0.5)))
        );
        child[trait] *= 1 + sign * percent;
        mutation.baby = child[trait];
        mutation.mutated = child[trait];
        mutation.percentChange = util.percentChange(
          mutation.original,
          mutation.mutated
        );

        child.mutationPackage.value.push(mutation);
        viz.experiment.mutations[mutation.trait].push(mutation);
      }
    }

    for (const trait of c.guys.traits.special) {
      child[trait] = util.coinToss(parentA, parentB)[trait];

      if (util.chance(1, c.guys.mutationRate)) {
        mutationHappened = true;
        mutation = {
          t,
          trait,
          original: child[trait],
          mom: parentA[trait],
          dad: parentB[trait],
        };
        switch (trait) {
          case "preference":
            child[trait] = Guy.getPreference();
            break;
          case "preferenceDirection":
            child[trait] = Guy.getPreferenceDirection();
            break;
        }
        mutation.baby = child[trait];
        child.mutationPackage.special.push(mutation);
        //viz.experiment.mutations[mutation.trait].push(mutation);
      }
    }


    //TODO refactor this and make it so I can add whatever traits that work this way in the future
    // if (parentA.carnivorous || parentB.carnivorous) {
    //     child.carnivorous = util.coinToss(true, false);
    //     if (child.carnivorous && !child.carnivoreNoisePlayed) {
    //         child.armored = false;
    //         util.playNoise(sounds.carnivoreNoise);
    //         child.carnivoreNoisePlayed = true;
    //     }
    // }

    for (let trait of Guy.gatedTraits()) {
        if (parentA[trait] || parentB[trait]) {
            child[trait] = util.coinToss(true, false);
        }

        if (parentA[trait] && parentB[trait]) {
            child[trait] = true;
            if (trait == 'carnivorous' && !pt.thresholds.carnivoreOnCarnivore.passed) {
                pt.thresholds.carnivoreOnCarnivore.passed = true;
            }
        }
    }

    if (child.carnivorous && !child.carnivoreNoisePlayed) {
            child.armored = false;
            util.playNoise(sounds.carnivoreNoise);
            child.carnivoreNoisePlayed = true;
        }

    if (mutationHappened) {
      for (let type of Object.values(child.mutationPackage)) {
        for (let m of type) {
            let min = Math.min(...Guy.getCurrentRangeFor(m.trait));
            let max = Math.max(...Guy.getCurrentRangeFor(m.trait));
          if (m.baby > max || m.baby < min) {
            console.log(`Guy${child.id} had a mutation on ${m.trait}: ${m.baby}`);
            
            //viz.show(m.trait);

            if (volumeOn) {
                sounds.monsterAlert.currentTime = 0;
                sounds.monsterAlert.play().catch(() => {});
            }
          }
        }
      }
    }
       
    for (const m of child.mutationPackage.value) {
        child.orbiters.push({
            trait: m.trait,
            t: getTimeIndex(),
            angle: 0,
            delta: (m.percentChange / 100) / 10,
            color: parentA.color,
            rMultiplier: Math.abs(util.randomNormal(1.1, 0.5)),
        });
    }

    for (const orbiterArray of [parentA.orbiters, parentB.orbiters]) {
      for (const o of orbiterArray) {
        if (!child.orbiters.some((c) => c.trait === o.trait) && getTimeIndex() - o.t < pt.orbiterLifeSpan) {
          child.orbiters.push({ ...o });
        }
      }
    }
    

    if (util.chance(1, 1000)) {
      child.color = util.randomColor();
    }
    child.color = parentA.hasDominantColor
      ? parentA.color
      : parentB.hasDominantColor
      ? parentB.color
      : util.coinToss(parentA, parentB).color;

    child.pos.x = this.pos.x + 10;
    child.pos.y = this.pos.y + 10;

    stats.guys++;

    this.resetHorniness(mate);
    Guy.enforceTradeOffs(child);
    guys.push(child);

    if (volumeOn && mutationHappened) {
      sounds.mutationBeep.currentTime = 0;
      sounds.mutationBeep.play().catch(() => {});
      console.log(`Welcome, Mutant${child.id}`);
    }

    for (let guy of [this, mate]) {
      if (guy.movesAwayFromBaby) {
        guy.target = util.randomVectorTargetWithinBounds(guy.pos);
        guy.isSeeking = 1;
        guy.seekPriority = "baby";
        guy.seek();
      }
    }
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
      if (
        dist(this.pos.x, this.pos.y, food.x, food.y) <
        this.calculateSensePerim()
      ) {
        this.isSeeking = 1;
        //
        if (this.smartFoodFinder) {
          potentialFoods.push({
            x: food.x,
            y: food.y,
            id: food.id,
            dist: dist(this.pos.x, this.pos.y, food.x, food.y),
          });
        } else {
          return { x: food.x, y: food.y, id: food.id };
        }
      }
    }

    if (potentialFoods.length > 0) {
      return potentialFoods.reduce((a, b) => (a.dist < b.dist ? a : b));
    }

    return null;
  }

  senses(other) {
    return (
      dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y) <
      this.calculateSensePerim()
    );
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
    this.seekPriority = null;
  }

  isHungry() {
    if (this.stomachContents > this.size * 0.4) {
      return false;
    }

    return true;
  }

  isSexuallyMature() {
    return this.size >= this.adultSize - this.adultSize * 0.1;
  }

  calculateSensePerim() {
    return this.size + this.senseDistance;
  }

  senseDistanceG(size = this.size, vis = data.vis) {
    // how far a guy *could* sense based on size alone
    const sizeSense = 150 * Math.pow(size, 0.30103);

    // visibility effect: 0 → none, higher → asymptotically stronger
    const visEffect = vis / (vis + 1);

    // final sense distance
    return (size + sizeSense * visEffect) * this.senseDistanceMultiplier;
  }

  dominance() {
    return this.hasDominantColor ? 0.5 + data.temp / 100 : 0.5;
  }

  getDigestionRate() {
    return Guy.getGlobalDigestionRate() * util.logNormalMultiplier();
  }

  getSenseDistance() {
    return Math.max(
      0,
      util.randomNormal(
        Guy.getGlobalSenseDistance(this.size),
        data.vis * data.vis
      )
    );
  }

  age() {
    return getTimeIndex() - this.birthday;
  }

  playDeathBeep() {
    if (volumeOn) {
        sounds.deathBeep.currentTime = 0;
        sounds.deathBeep.play().catch(() => {});
    }

    this.deathNoisePlayed = 1;
  }

  getAncestors() {
    return this.getDescendants({}, new Set(), 'parents');
  }

  getDescendants(out = {}, visited = new Set(), which='children', returnEldestLiving=false) {
    visited.add(this.id);

    for (let childId of this[which]) {
        const child = Guy.getGuyById(childId);
        if (returnEldestLiving && child && !child.dead) {
            return child;
        }
        if (!child || child.dead) continue;

        if (!out[this.id]) out[this.id] = [];
        out[this.id].push(childId);

        if (!visited.has(childId)) {
            visited.add(childId);
            child.getDescendants(out, visited, which);
        }
    }
    if (returnEldestLiving) {
        return null;
    }
    return out;
  }

  static whoIsDominant(a, b) {
    if (a.stomachContents > b.stomachContents) {
      return {
        dom: a,
        non: b,
      };
    }

    if (b.stomachContents > a.stomachContents)
      return {
        dom: b,
        non: a,
      };

    if (a.hasDominantColor && b.hasDominantColor) {
      return "both";
    }

    if (a.hasDominantColor && !b.hasDominantColor) {
      return {
        dom: a,
        non: b,
      };
    }

    if (!a.hasDominantColor && b.hasDominantColor) {
      return {
        dom: b,
        non: a,
      };
    }

    return false;
  }

  //0.00042206896551724135
  // -
  // -0.05957793103448276

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

  static getPreference() {
    let valueOrBinary = util.coinToss("value", "binary");
    return util.chance(5, data.temp)
      ? c.guys.traits[valueOrBinary][
          util.randomNumber(0, c.guys.traits[valueOrBinary].length - 1)
        ]
      : null;
  }

  static getPreferenceDirection() {
    return data.pres >= 29.4
      ? util.chance(60)
        ? 1
        : -1
      : util.chance(60)
      ? -1
      : 1;
  }

  static getCurrentRangeFor(trait) {
    return guys.map((g) => g[trait]);
  }

  static killThisGuy(guy, returnNutrients=false) {
    viz.experiment.currentDeathsCounted++;
    viz.experiment.currentCumulativeLifeSpan += guy.age();
    if (treeGuy === guy) {
        treeGuy = guy.getDescendants({}, new Set(), 'children', true);
        if (treeGuy) {
            treeGuy.halo = 1;
        }
        util.playNoise(sounds.treeGuyTorchPassNoise);
    }
    guy.dead = 1;
    stats.guys--;

    if (!guy.deathNoisePlayed) {
        guy.playDeathBeep();
    }

    if (returnNutrients) {
        if (guy.stomachContents > 0) {
            forage.populateMe(guy.stomachContents, guy.pos, guy.size);
            guy.stomachContents = 0;
        }

        forage.populateMe(guy.size, guy.pos, guy.size);
    }
  }

  static makeThisGuyCarnivorous(id) {
    let guy = guys.find(g => g.id === id);
    if (!guy) return;

    guy.carnivorous = 1; 
    guy.target.x = 0;
    guy.target.y = 0;
    guy.seekPriority = 'prey';
  }

  static showCarnivoreDetails(id) {
    let guy = guys.find(g => g.id === id);
    if (!guy) return;
    console.log(
        `isHungry: ${guy.isHungry()}; isHorny: ${guy.isHorny}; stomachContents: ${guy.stomachContents};
        seekPriority: ${guy.seekPriority}; size: ${guy.size};
        target: ${guy.target.x},${guy.target.y}; prey: ${guy.prey};
    `);
  }

  static enforceTradeOffs(guy) {
    if (guy.armored) {
        guy.digestionRate += guy.digestionRate * (data.totalDryDays / 100);
    }
  }

  static gatedTraits() {
    return [
        'armored',
        'carnivorous',
        'runsFromPredators',
    ];
  }

  static godMode() {
    guys.filter(g => g.id > 1).forEach(g => g.dead = 1);
    guys.forEach(g => g.size = 12);
  }
}
