class Util {
    randomNumber(x, y) {
        return Math.floor(Math.random() * (y -x + 1)) + x;
    }

    randomColor(temp = 95, hum = 100) {
        //colorMode(HSB, 360, 100, 100);
        return color(
            util.randomNumber(0, map(temp, 17, 95, 0, 360)),     // hue 0 - 360
            util.randomNumber(0, hum),    // saturation 0 - 100
            100  // brightness 0 - 100
        );
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
        return [red(thisColor), green(thisColor), blue(thisColor), alpha(thisColor)].join(',')
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
        return ((b -a) / a) * 100;
    }

    percentToColor(pct) {
        const maxPct = 10; // visual scaling, tweak freely
        const t = constrain(pct / maxPct, -1, 1);

        const hue = t < 0
            ? map(t, -1, 0, 0, 60)     // reds → yellows
            : map(t, 0, 1, 60, 120);  // yellows → greens

        const sat = 80;
        const bri = 100;

        return color(hue, sat, bri);
    }

    randomVectorTargetWithinBounds(pos) {
    let x, y;

    while (true) {
        x = pos.x + util.randomNumber(10, data.temp);
        y = pos.y + util.randomNumber(10, data.temp);

        if (
            Math.abs(x - pos.x) >= 10 &&
            Math.abs(y - pos.y) >= 10 &&
            x >= c.bounds.x.min &&
            x <= c.bounds.x.max &&
            y >= c.bounds.y.min &&
            y <= c.bounds.y.max
        ) {
            break;
        }
    }

    return createVector(x, y);
}
}