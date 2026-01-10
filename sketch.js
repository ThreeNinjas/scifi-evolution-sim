const params = new URLSearchParams(window.location.search);
const debug = params.get('debug');
let numberOfGuys = params.get('guys') || null;


let util = new Util();
let c = new Config(); //maybe rename config below later....
let guys = [];
let diameter = 10;
let data = null;

let startTextSize = 15;
let dominantColor = null;
let stats = {
    guys: 0,
    colorCount: 0,
    colors: {},
    dominantColors: {},
    colorCountHistory: [],
    numberOfFoodHistory: [],
    numberOfGuysHistory: [],
};

const MAX_HISTORY_LENGTH = 2500;
const DOWNSAMPLE_RATE = 2;

//environmentally dependent variables
let DIGESTION_RATE_PER_FRAME = 0;
let SENSE_DISTANCE_MULTIPLIER = null;

const serverURL =
    window.location.hostname === "127.0.0.1" ? "http://localhost:3000/" : "http://199.19.74.165:3000/";

let config = {
    bounds: {
        x: {
            min: 20,
            max: 0,
        },
        y: {
            min: 20,
            max: 0,
        },
    },
};

const guysToRemove = new Set();

/*
TODO: move the actually populating of guys out of loadWeather and into guys.populateGuys();
TODO: make the boxes prettier!
TODO: revisit how dominant color system works
TODO:  give each guy a small % chance of having a "dominant" color. Dominance means that upon collision you exert more of yourself upon the other guy.
TODO: set upper and lower limits on the color space,  have them be based on temp and humidity.
    maybe with higher temps warmer colors have more dominance? 
    maybe pressure makes the dominant colors more dominant
TODO: other real world data variables: size, speed (increment by more than 1?), ability to kill
TODO: food
TODO: mutations

TODO: graph
*/
async function setup() {
    colorMode(HSB, 360, 100, 100);
    frameRate(60);
    createCanvas(400, 800);
    background(0);
    drawEnvironment();
    loadWeather();
    config.bounds.x.max = width - 20;
    config.bounds.y.max = height / 2;
}

function draw() {
    if (data === null) {
        loadingScreen();
        return;
    } 
    background(0);
    drawEnvironment();

    push();
    noStroke();
    fill("white");
    textSize(15);
    text("GUYS: " + stats.guys, 20, height - 60);
    text("FOOD: " + Object.keys(forage.foodStorage).length, 20, height - 80);
    pop();

    forage.drawMe();

    for (const guy of guys) {
        guy.move();
    }

    guys = guys.filter(g => !guysToRemove.has(g.id));

    guysToRemove.clear();

    for (let i = 0; i < guys.length; i++) {
        if (guys[i].dead) {
            guys[i].decayProgress += DIGESTION_RATE_PER_FRAME;

            if (guys[i].decayProgress >= 1) {
                //delete
                guysToRemove.add(guys[i].id);
            }
        }
        for (let j = i + 1; j < guys.length; j++) {
            if (guys[i].intersects(guys[j])) {
                //figure out who if either is dominant
                let dom = Guy.whoIsDominant(guys[i], guys[j]);
                if (dom) {
                    if (dom != 'both') {
                        //dom.non is changing his color, soooooo
                        //make a note of his current color
                        const oldColor = util.getStringFromP5ColorObj(dom.non.color);
                        
                        //decrement the stats array
                        //and delete it if the count is 0
                        stats.colors[oldColor] = (stats.colors[oldColor] || 0) - 1;
                        if (stats.colors[oldColor] <= 0) {
                            delete stats.colors[oldColor];
                            stats.colorCount--;
                        }

                        //update that color
                        dom.non.color = lerpColor(dom.dom.color, dom.non.color, 0.25);

                        //add the new one to the stats array
                        const newColor = util.getStringFromP5ColorObj(dom.non.color);
                        if (stats.colors[newColor] === undefined) stats.colorCount++;
                        stats.colors[newColor] = (stats.colors[newColor] || 0) + 1;
                        
                    }
                } else {
                    let c1 = guys[i].color;
                    let c2 = guys[j].color;
                    for (let guy of [guys[i], guys[j]]) {
                        const oldColor = util.getStringFromP5ColorObj(guy.color);
                        stats.colors[oldColor] = (stats.colors[oldColor] || 0) - 1;
                        if (stats.colors[oldColor] <= 0) {
                            delete stats.colors[oldColor];
                            stats.colorCount--;
                        }

                        guy.color = lerpColor(c1, c2, 0.5);

                        const newColor = util.getStringFromP5ColorObj(guy.color);
                        if (stats.colors[newColor] === undefined) stats.colorCount++;
                        stats.colors[newColor] = (stats.colors[newColor] || 0) + 1;
                    }
                }
            }

            if (guys[i].senses(guys[j])) {
                //silently acknowledge
                if (debug) {
                    push();
                        textSize(10);
                        fill('white');
                        text('!!', guys[i].x, guys[i].y+20);
                        text('!!', guys[j].x, guys[j].y+20);
                    pop();
                }
            }
        }
        guys[i].digestionProgress += DIGESTION_RATE_PER_FRAME;
        if (guys[i].stomachContents > 0 && guys[i].dead == 0) {
            if (guys[i].digestionProgress >= 1) {
                guys[i].stomachContents -= forage.foodSize;
                guys[i].digestionProgress -= 1;
            }
        } else {
            if (guys[i].digestionProgress >= 1 && guys[i].dead == 0) {
                guys[i].dead = 1;
                stats.guys--;
            }
        }

        if (guys[i].isHungry()) {
            const foodToEat = guys[i].intersectsFood(forage.foodStorage);
            
            if (foodToEat !== null) {
                guys[i].eat(foodToEat);
            }
        }
    }

    forage.replenishProgress += forage.replenishRate;
    if (forage.replenishProgress >= 1) {
        forage.replenishProgress = 0;
        forage.populateMe();
    }
    
    if (frameCount % DOWNSAMPLE_RATE === 0) {
        stats.colorCountHistory.push(stats.colorCount);

        if (stats.colorCountHistory.length > MAX_HISTORY_LENGTH) {
            stats.colorCountHistory = [];
        }

        stats.numberOfFoodHistory.push(forage.foodStorage.length);

        if (stats.numberOfFoodHistory.length > MAX_HISTORY_LENGTH) {
            stats.numberOfFoodHistory = [];
        }

        stats.numberOfGuysHistory.push(stats.guys);

        if (stats.numberOfGuysHistory.length > MAX_HISTORY_LENGTH) {
            stats.numberOfGuysHistory = [];
        }
    }
    
    drawGraphs();
}

async function loadWeather() {
    const url = `${serverURL}weather/guys`;
    console.log(url);
    data = await fetch(url)
        .then(r => r.json());

    console.log(data);

    numberOfGuys = debug && numberOfGuys ? numberOfGuys : Math.floor(data.temp);
    stats.guys = numberOfGuys;

    DIGESTION_RATE_PER_FRAME = Guy.getDigestionRate(data); 
    console.log(DIGESTION_RATE_PER_FRAME);

    forage = new Forage({
        maxX: config.bounds.x.max,
        maxY: config.bounds.y.max,
        chanceOfFood: Math.floor(data.hum),
        replenishRate: Guy.getDigestionRate(data) * 1.05
    });
    
    console.log('replenishRate = ' + forage.replenishRate);

    frameRate(data.temp);
    i = 0;
    guys = Array.from({ length: numberOfGuys }, () => {
            const guy = new Guy({
                id: i,
                x: util.randomNumber(config.bounds.x.min, config.bounds.x.max),
                y: util.randomNumber(config.bounds.y.min, config.bounds.y.max),
                size: c.guys.size,
                color: util.randomColor(data.temp, data.hum),
                hasDominantColor: util.chance(data.temp * 0.25),
                senseDistance: util.chance(data.vis) ? 5 + 5 * (data.vis/10) : 5
            });

            const thisColor = util.getStringFromP5ColorObj(guy.color);
            if (stats.colors[thisColor] === undefined) stats.colorCount++;
            stats.colors[thisColor] = (stats.colors[thisColor] || 0 ) + 1;

            

            if (guy.hasDominantColor) {
                stats.dominantColors[thisColor] = (stats.dominantColors[thisColor] || 0 ) + 1;
                guy.size = 15;
            }
            i++;
            return guy;
        });
        
    stats.colorCountHistory.push(stats.colorCount);
    
    for (const guy of guys) {
        guy.drawMe();
    }
}


function drawEnvironment() {
    push();
    strokeWeight(2);
    stroke("white");
    fill(0);
    rect(10, 10, width - 20, height / 2);

    //the box is 380px wide
    stroke(0);
    const linewidth = 300;
    line(linewidth, 10, width - 10 - linewidth, 10);
    line(linewidth, 10 + height / 2, width - 10 - linewidth, 10 + height / 2);
    pop();
}

function loadingScreen() {
    background(0);
    fill(util.randomColor());
    textSize(startTextSize);
    text('loading', 100, 100);
    startTextSize++;
}


function drawGraphs() {
    push();
    let startingY = (height / 2) + 20;
    let i = 0;
    for (let graph of ['numberOfGuysHistory', 'numberOfFoodHistory']) {
        

        let minY = 0;
        let maxY = 0;
        let color = '';

        switch (graph) {
            case 'numberOfGuysHistory':
                minY = 0;
                maxY = data.temp + 5;
                color ='#ee1edcff'
                break;
            case 'colorCountHistory':
                minY = Object.keys(stats.dominantColors).length;
                maxY = stats.guys;
                color = util.minBrightness(guys[i].color, 100);
                break;
            case 'numberOfFoodHistory':
                minY = 0;
                maxY = forage.chanceOfFood;
                color = '#99cc33';
                break;
        }

        stroke(color);
        noFill();

        line(10, startingY, width-10, startingY);
        line(10, startingY + 100, width-10, startingY + 100);
        startingY = startingY++;
        
        if (stats[graph].length > 1) {
            beginShape();
                for (let i = 0; i < stats[graph].length; i++) {
                    let x = map(i, 0, stats[graph].length-1, 10, width-10);
                    let y = map(stats[graph][i], minY, maxY, startingY + 100, startingY);
                    
                    //first control point
                    if (i == 0) {
                        splineVertex(x, y);
                    }

                    splineVertex(x, y);

                    //last control point
                    if (i == stats[graph].length - 1) {
                        splineVertex(x, y);
                    }
                }
            endShape();
        }
        
        startingY += 105;
        i++;
    }
    pop();
}