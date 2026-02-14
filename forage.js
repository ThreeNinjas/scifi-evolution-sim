let NEXT_FORAGE_ID = 0;
class Forage {
    constructor(traits) {
        this.maxX = traits.maxX;
        this.maxY = traits.maxY;
        this.chanceOfFood = this.calculateChanceOfFood();
        this.replenishRate = Forage.getFoodReplenishmentRate();

        this.replenishProgress = 0;
        this.numberOfFood = 0;
        this.foodStorage = [];
        this.foodSize = 0.25;

        this.startOfPenalty = 0;
        this.penaltyLength = data.clouds * 10;
        this.penaltyActive = false;
        

        this.populateMe();
    }

    populateMe(num = null, pos = null, size = null) {
        let chanceOfFood = this.chanceOfFood;

        if (this.penaltyActive) {
            chanceOfFood = this.chanceOfFood / 2;
        }

        const max = num === null
            ? Math.floor(chanceOfFood)
            : Math.floor(num / this.foodSize);

        for (let i = 0; i < max; i++) {
            if (num === null && this.foodStorage.length >= chanceOfFood) break;

            if (util.chance(chanceOfFood)) {
                let x = pos != null && size != null ? util.randomNumber(pos.x - size, pos.x + size) : util.randomNumber(config.bounds.x.min, config.bounds.x.max);
                let y = pos != null && size != null ? util.randomNumber(pos.y - size, pos.y + size) : util.randomNumber(config.bounds.y.min, config.bounds.y.max);

                if (x > config.bounds.x.max) {
                    x = config.bounds.x.max
                }
                if (x < config.bounds.x.min) {
                    x = config.bounds.x.min;
                }
                if (y > config.bounds.y.max) {
                    y = config.bounds.y.max
                }
                if (y < config.bounds.y.min) {
                    y = config.bounds.y.min;
                }

                this.foodStorage.push({
                    id: NEXT_FORAGE_ID++,
                    x,
                    y,
                });
                this.numberOfFood += this.foodSize;
            }
        }
    }

    calculateChanceOfFood() {
        let start = (Math.floor(data.hum) - data.totalDryDays);
        let chanceOfFood = start + (start * data.totalRainfall/100);
        chanceOfFood += (chanceOfFood * data.rain24HrTotal/100);
        chanceOfFood -= data.daysSinceRain;
        return Math.abs(chanceOfFood);
    }

    activatePenalty() {
        if (!this.penaltyActive) {
            this.penaltyActive = true;
            this.startOfPenalty = frameCount;
            util.playNoise(sounds.penaltyOnBeep);
        }
    }

    deactivatePenalty() {
        if (this.penaltyActive) {
            this.penaltyActive = false;
            this.startOfPenalty = null;
            util.playNoise(sounds.penaltyOffBeep);
        }
    }

    checkPenaltyStatus() {
        switch (true) {
            case !this.penaltyActive && guys.length < 100:
                this.deactivatePenalty();
                break;
            case !this.penaltyActive && guys.length >= 100:
                this.activatePenalty();
                break;
            case this.penaltyActive && guys.length >= 100:
                this.startOfPenalty = frameCount;
                break;
            case this.penaltyActive && guys.length < 100 && this.penaltyTimeHasPassed():
                this.deactivatePenalty();
                break;
        }
    }

    penaltyTimeHasPassed() {
        return frameCount - this.startOfPenalty >= this.penaltyLength;
    }

    drawMe() {
        push();
        fill(c.forage.color);
        stroke(c.forage.color);
        for (let i = 0; i < this.foodStorage.length; i++) {
            rect(this.foodStorage[i].x, this.foodStorage[i].y, this.foodSize);
        }
        pop();
    }

    remove(id) {
        const i = this.foodStorage.findIndex(f => f.id === id);

        if (i === -1) {
            return;
        }
        const {x,y} = this.foodStorage[i];
        this.foodStorage.splice(i, 1);
        this.numberOfFood--;
    }

    exists(id) {
        return this.foodStorage.some(f => f.id === id);
    }

    static getFoodReplenishmentRate() {
        let out = Guy.getGlobalDigestionRate();

        if (data.totalDryDays > 0) {
            out = out + (out * (data.totalDryDays / 100));
        }
        return out;
    }
}