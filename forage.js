let NEXT_FORAGE_ID = 0;
class Forage {
    constructor(traits) {
        this.maxX = traits.maxX;
        this.maxY = traits.maxY;
        this.chanceOfFood = this.calculateChanceOfFood();
        this.replenishRate = traits.replenishRate;

        this.replenishProgress = 0;
        this.numberOfFood = 0;
        this.foodStorage = [];
        this.foodSize = 0.25;
        

        this.populateMe();
    }

    populateMe(num = null) {
        const max = num === null
            ? this.chanceOfFood
            : Math.floor(num / this.foodSize);

        for (let i = 0; i < max; i++) {
            if (num === null && this.foodStorage.length >= this.chanceOfFood) break;

            if (util.chance(this.chanceOfFood)) {
                this.foodStorage.push({
                    id: NEXT_FORAGE_ID++,
                    x: util.randomNumber(config.bounds.x.min, config.bounds.x.max),
                    y: util.randomNumber(config.bounds.y.min, config.bounds.y.max),
                });
                this.numberOfFood += this.foodSize;
            }
        }
    }

    calculateChanceOfFood() {
        let start = (Math.floor(data.hum) - data.totalDryDays);
        let chanceOfFood = start + (start * data.totalRainfall/100);
        chanceOfFood -= data.daysSinceRain;
        return Math.abs(chanceOfFood);
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
}