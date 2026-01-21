class Forage {
    constructor(traits) {
        this.maxX = traits.maxX;
        this.maxY = traits.maxY;
        this.chanceOfFood = traits.chanceOfFood;
        this.replenishRate = traits.replenishRate;

        this.replenishProgress = 0;
        this.numberOfFood = 0;
        this.foodStorage = [];
        this.foodSize = 0.25;
        

        this.populateMe();
    }

    populateMe() {
        for (let i = 0; i < this.chanceOfFood; i++) {
            if (util.chance(this.chanceOfFood) && this.foodStorage.length < this.chanceOfFood) {
                this.foodStorage.push({
                id: `${frameCount}-${i}`,
                x: util.randomNumber(10, this.maxX),
                y: util.randomNumber(10, this.maxY),
            });
            this.numberOfFood++;
            }
        }
    }

    replenish() {
        
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