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
        return util.randomNumber(0, 100) < chance;
    }

    getStringFromP5ColorObj(thisColor) {
        return [red(thisColor), green(thisColor), blue(thisColor), alpha(thisColor)].join(',')
    }
}