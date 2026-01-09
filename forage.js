class Forage {
    constructor(traits) {
        this.maxX = traits.maxX;
        this.maxY = traits.maxY;
        this.chanceOfFood = traits.chanceOfFood;
        this.numberOfFood = 0;
        this.foodStorage = [];

        this.populateMe();
    }

    populateMe() {
        for (let i = 0; i < this.chanceOfFood; i++) {
            if (util.chance(this.chanceOfFood)) {
                this.foodStorage.push({
                id: i,
                x: util.randomNumber(10, this.maxX),
                y: util.randomNumber(10, this.maxY),
            });
            this.numberOfFood++;
            }
        }
    }

    drawMe() {
        push();
        fill('#99cc33');
        stroke('#99cc33');
        for (let i = 0; i < this.foodStorage.length; i++) {
            rect(this.foodStorage[i].x, this.foodStorage[i].y, 0.25);
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
}