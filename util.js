class Util {
  randomNumber(x, y) {
    let minimum;
    let maximum;
    if (x > y) {
      maximum = x;
      minimum = y;
    } else {
      minimum = x;
      maximum = y;
    }
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
  }

  randomColor(temp = 95, hum = 100) {
    //colorMode(HSB, 360, 100, 100);
    return color(
      util.randomNumber(0, map(temp, 17, 95, 0, 360)), // hue 0 - 360
      util.randomNumber(0, hum), // saturation 0 - 100
      100, // brightness 0 - 100
    );
  }

  randomHexColor(temp = 95, hum = 100) {
    temp = map(temp, 0, 95, 0, 255);
    hum = map(hum, 0, 100, 0, 255);
    let r = Math.floor(random(0, temp + 1))
      .toString(16)
      .padStart(2, "0");
    let g = Math.floor(random(0, temp + 1))
      .toString(16)
      .padStart(2, "0");
    let b = Math.floor(random(0, temp + 1))
      .toString(16)
      .padStart(2, "0");
    let alpha = Math.floor(hum).toString(16).padStart(2, "0");

    return `#${r}${g}${b}${alpha}`;
  }

  redShift(temp = 95, hum = 100) {
    temp = map(temp, 0, 95, 0, 255);
    hum = map(hum, 0, 100, 0, 255);
    let r = Math.floor(255)
      .toString(16)
      .padStart(2, "0");
    let g = Math.floor(random(0, temp + 1))
      .toString(16)
      .padStart(2, "0");
    let b = Math.floor(random(0, temp + 1))
      .toString(16)
      .padStart(2, "0");
    let alpha = Math.floor(hum).toString(16).padStart(2, "0");

    return `#${r}${g}${b}${alpha}`;
  }

  blueShift(temp = 95, hum = 100) {
    temp = map(temp, 0, 95, 0, 255);
    hum = map(hum, 0, 100, 0, 255);
    let r = Math.floor(0)
      .toString(16)
      .padStart(2, "0");
    let g = Math.floor(random(0, temp + 1))
      .toString(16)
      .padStart(2, "0");
    let b = Math.floor(random(0, temp + 1))
      .toString(16)
      .padStart(2, "0");
    let alpha = Math.floor(hum).toString(16).padStart(2, "0");

    return `#${r}${g}${b}${alpha}`;
  }

  closestGuyByColor(targetColor, guys) {
    let bestGuy = null;
    let bestDist = Infinity;

    const h1 = hue(targetColor);

    for (const guy of guys) {
      const h2 = hue(guy.color);
      const d = abs(h1 - h2);
      const dist = min(d, 360 - d);

      if (dist < bestDist) {
        bestDist = dist;
        bestGuy = guy;
      }
    }

    return bestGuy;
  }

  chance(chance, mult = 100) {
    return util.randomNumber(1, mult) <= chance;
  }

  getStringFromP5ColorObj(thisColor) {
    return [
      red(thisColor),
      green(thisColor),
      blue(thisColor),
      alpha(thisColor),
    ].join(",");
  }

  minBrightness(c, min) {
    let h = hue(c);
    let s = saturation(c);
    let b = max(brightness(c), min);

    return color(h, s, b);
  }

  //randomNormalZeroMean() and logNormalMultiplier() work together to generate a random number between 0.5 and 1.5 distributed in a natural way. Not quite
  //a bell curve but not unlike a bell curve. It's too much math for me to actually understand it lol.
  //But this can be used when natural variation is needed. Most values will center around the mean, but occasionally a "monster" will appear.
  randomNormalZeroMean() {
    let inputA = 0;
    let inputB = 0;

    while (inputA === 0) inputA = Math.random();
    while (inputB === 0) inputB = Math.random();

    return Math.sqrt(-2 * Math.log(inputA)) * Math.cos(2 * Math.PI * inputB);
  }

  //Modifying the value of variationStrength changes how big the range of outputs can be. Higher = more chaos.
  logNormalMultiplier(variationStrength = 0.225) {
    const normalValue = this.randomNormalZeroMean();
    const rawMultiplier = Math.exp(normalValue * variationStrength);

    if (rawMultiplier < 0.5) return 0.5;
    if (rawMultiplier > 1.5) return 1.5;
    return rawMultiplier;
  }

  /**
   *
   * Right skew means that most values will be on the smaller end of the range with a few larger values and a very few at the extremes.
   * The idea is to simulate natural distributions of variation.
   * A higher value for k produces more values closer to min
   */
  rightSkew(min, max, k = 3) {
    return min + (max - min) * Math.pow(random(), k);
  }

  /*
    LogNormal simulates natural variation with rare extremes
    */
  logNormalBetween(min, max, median, sigma = 0.8) {
    const mu = Math.log(median);
    return constrain(Math.exp(randomGaussian(mu, sigma)), min, max);
  }

  //more info on this at https://d3js.org/d3-random#randomNormal
  //thanks to Jake Amphiuma for the heads up on the D3 library!
  /*
    The expected value of the generated numbers is mu, with the given standard deviation sigma. If mu is not specified, it defaults to 0; 
    if sigma is not specified, it defaults to 1.
    */
  randomNormal(mu, sigma) {
    const out = d3.randomNormal(mu, sigma);
    return out();
  }

  randomNormalBounded(mu, sigma, min, max) {
    const gen = d3.randomNormal(mu, sigma);
    for (let tries = 0; tries < 50; tries++) {
      const v = gen();
      if (v >= min && v <= max) return v;
    }
    return constrain(gen(), min, max);
  }

  coinToss(a, b) {
    return random() < 0.5 ? a : b;
  }

  percentChange(a, b) {
    return ((b - a) / a) * 100;
  }

  percentToColor(pct) {
    const maxPct = 10; // visual scaling, tweak freely
    const t = constrain(pct / maxPct, -1, 1);

    const hue =
      t < 0
        ? map(t, -1, 0, 0, 60) // reds → yellows
        : map(t, 0, 1, 60, 120); // yellows → greens

    const sat = 80;
    const bri = 100;

    return color(hue, sat, bri);
  }

  randomVectorTargetWithinBounds(pos) {
    const minX = config.bounds.x.min;
    const maxX = config.bounds.x.max;
    const minY = config.bounds.y.min;
    const maxY = config.bounds.y.max;

    const minDist = 10;

    const xMin = Math.max(minX, pos.x - data.temp);
    const xMax = Math.min(maxX, pos.x + data.temp);
    const yMin = Math.max(minY, pos.y - data.temp);
    const yMax = Math.min(maxY, pos.y + data.temp);

    if (xMax - xMin < minDist * 2 || yMax - yMin < minDist * 2) {
      return createVector(
        constrain(pos.x + random([-1, 1]) * minDist, minX, maxX),
        constrain(pos.y + random([-1, 1]) * minDist, minY, maxY),
      );
    }

    let x, y;
    do {
      x = random(xMin, xMax);
      y = random(yMin, yMax);
    } while (Math.abs(x - pos.x) < minDist && Math.abs(y - pos.y) < minDist);

    return createVector(x, y);
  }

  calculateMean(values) {
    return d3.mean(values);
  }

  calculateMedian(values) {
    return d3.median(values);
  }

  calculatePercentiles(values, percentile) {
    return d3.quantile(values, percentile / 100);
  }

  calculateStdDev(values) {
    return d3.deviation(values);
  }

  playNoise(noise, callback = null) {
    if (volumeOn) {
      noise.currentTime = 0;
      noise.play().catch(() => {});
    }

    if (callback) {
      callback();
    }
    return;
  }

  /**
   *
   * @param {*} target = p5 Vector, ie the descendant, ancestor, mate, prey, etc
   * @param {*} source p5 Vector, ie the guy
   * @param {*} distanceFromSource
   * @param {*} direction ie pointing away from the guy or pointing towards the guy
   * @returns
   */
  relationalArrow(target, source, distanceFromSource, direction = "away") {
    if (target && target.x === 0 && target.y === 0) return;

    const d = p5.Vector.sub(target, source);
    const angle = atan2(d.y, d.x);
    const back = createVector(d.x, d.y).setMag(
      dist(source.x, source.y, target.x, target.y) - distanceFromSource,
    );
    const tip = p5.Vector.sub(target, back);

    push();
    strokeWeight(2);
    translate(tip.x, tip.y);
    rotate(angle);
    if (direction == "away") {
      line(0, 0, -4, -4);
      line(0, 0, -4, 4);
    } else {
      line(0, 0, 4, 4);
      line(0, 0, 4, -4);
    }
    pop();
  }

  biggerSmaller(data) {
    return data == -1 ? "smaller" : "bigger";
  }
}
