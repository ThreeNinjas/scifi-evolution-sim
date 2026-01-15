class Util {
    randomNumber(x, y) {
        return Math.floor(Math.random() * (y -x + 1)) + x;
    }

    randomColor(min = 0, max = 360) {
        if (min > max) {
            const tmp = min;
            min = max;
            max = tmp;
        }

        return color(
            util.randomNumber(0, 360),     // hue 0 - 360
            util.randomNumber(0, max),    // saturation 0 - 100
            util.randomNumber(min, map(max, 0, 100, 0, 100))  // brightness 0 - 100
        );
    }

    chance(chance) {
        return util.randomNumber(0, 100) <= chance;
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
}