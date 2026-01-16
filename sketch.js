const params = new URLSearchParams(window.location.search);
const debug = params.get('debug');
let numberOfGuys = params.get('guys') || null;
let font;

let util = new Util();
let c = new Config(); //maybe rename config below later....

/** @@type {Guy[]} */
let guys = [];
let forage;
let diameter = 10;
let data = null;

let startTextSize = 15;
let dominantColor = null;
let stats = {
    guys: 0,
    numberOfFoodHistory: [],
    numberOfGuysHistory: [],
};

let graphAreaHeight = 275;

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

let histogramButtonBoxes;
let selectedHistogram = 0;

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
    font = await loadFont("/assets/Antonio-Regular.ttf");
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
    if (data === null || !font) {
        loadingScreen();
        return;
    } 
    textFont(font);
    background(0);
    drawEnvironment();

    forage.drawMe();

    // for (const guy of guys) {
    //     guy.move();
    // }

    guys = guys.filter(g => !guysToRemove.has(g.id));

    guysToRemove.clear();

    for (let i = 0; i < guys.length; i++) {
        if (guys[i].dead) {
            guys[i].decayProgress += Guy.getGlobalDigestionRate() * (data.rain > 0 ? data.rain : data.vis);

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
                        // const oldColor = util.getStringFromP5ColorObj(dom.non.color);
                        
                        //decrement the stats array
                        //and delete it if the count is 0
                        // stats.colors[oldColor] = (stats.colors[oldColor] || 0) - 1;
                        // if (stats.colors[oldColor] <= 0) {
                        //     delete stats.colors[oldColor];
                        //     stats.colorCount--;
                        // }

                        //update that color
                        dom.non.color = lerpColor(dom.dom.color, dom.non.color, 0.25);

                        //add the new one to the stats array
                        // const newColor = util.getStringFromP5ColorObj(dom.non.color);
                        // if (stats.colors[newColor] === undefined) stats.colorCount++;
                        // stats.colors[newColor] = (stats.colors[newColor] || 0) + 1;
                        
                    }
                } else {
                    for (let guy of [guys[i], guys[j]]) {
                        // const oldColor = util.getStringFromP5ColorObj(guy.color);
                        // stats.colors[oldColor] = (stats.colors[oldColor] || 0) - 1;
                        // if (stats.colors[oldColor] <= 0) {
                        //     delete stats.colors[oldColor];
                        //     stats.colorCount--;
                        // }

                        guy.color = lerpColor(guys[i].color, guys[j].color, 0.5);

                        // const newColor = util.getStringFromP5ColorObj(guy.color);
                        // if (stats.colors[newColor] === undefined) stats.colorCount++;
                        // stats.colors[newColor] = (stats.colors[newColor] || 0) + 1;
                    }
                }
            }

            if (guys[i].senses(guys[j])) {
                //silently acknowledge
                if (debug) {
                    push();
                        textSize(10);
                        fill('white');
                        text('!!', guys[i].pos.x, guys[i].pos.y+20);
                        text('!!', guys[j].pos.x, guys[j].pos.y+20);
                    pop();
                }
            }
        }

        if (!guys[i].dead) {
            if (guys[i].isHungry()) {
                const sensedFood = guys[i].sensesFood(forage.foodStorage);

                if (sensedFood) {
                    guys[i].seekFood(sensedFood);
                    if (!guys[i].overRideMove) {
                        guys[i].move();
                    }
                    if (guys[i].overRideMoveIntermittent) {
                        if (!util.chance(data.hum)) {
                            guys[i].move();
                        }
                    }
                } else {
                    guys[i].move();
                }

                const foodToEat = guys[i].intersectsFood(forage.foodStorage);
                if (foodToEat !== null) {
                    guys[i].eat(foodToEat);
                }
            } else {
                guys[i].move();
            }
        }


        guys[i].digestionProgress += guys[i].digestionRate;
        if (guys[i].stomachContents > 0 && guys[i].dead == 0) {
            if (guys[i].digestionProgress >= 1) {
                guys[i].stomachContents -= forage.foodSize;
                guys[i].digestionProgress -= 1;
            }
        } else {
            if (guys[i].digestionProgress >= 1 && guys[i].dead == 0 && guys[i].stomachContents == 0) {
                guys[i].dead = 1;
                stats.guys--;
            }
        }

        
        guys[i].drawMe();
    }

    forage.replenishProgress += forage.replenishRate;
    if (forage.replenishProgress >= 1 && forage.foodStorage.length < (forage.chanceOfFood * 0.10)) {
        forage.replenishProgress = 0;
        forage.populateMe();
    }
    
    if (frameCount % DOWNSAMPLE_RATE === 0) {
        stats.numberOfFoodHistory.push(forage.foodStorage.length);

        if (stats.numberOfFoodHistory.length > MAX_HISTORY_LENGTH) {
            stats.numberOfFoodHistory = [];
        }

        stats.numberOfGuysHistory.push(stats.guys);

        if (stats.numberOfGuysHistory.length > MAX_HISTORY_LENGTH) {
            stats.numberOfGuysHistory = [];
        }
    }

    statsText();
    
    drawGraphs();

    histogramButtons();

    drawHistogram(0);
}

function mousePressed() { 
    for (const [i, box] of Object.entries(histogramButtonBoxes)) {
        if (
            mouseX >= box.x &&
            mouseX <= box.x + box.w &&
            mouseY >= box.y &&
            mouseY <= box.y + box.h
        ) {
            selectedHistogram = i;
        }
    }
}

async function loadWeather() {
    const url = `${serverURL}weather/guys`;
    console.log(url);
    data = await fetch(url)
        .then(r => r.json());

    console.log(data);
    
    numberOfGuys = debug && numberOfGuys ? numberOfGuys : Math.floor(data.temp);
    stats.guys = numberOfGuys;

    DIGESTION_RATE_PER_FRAME = Guy.getGlobalDigestionRate(); 
    console.log('digestion rate: ' + DIGESTION_RATE_PER_FRAME);

    forage = new Forage({
        maxX: config.bounds.x.max,
        maxY: config.bounds.y.max,
        chanceOfFood: Math.floor(data.hum),
        replenishRate: Guy.getGlobalDigestionRate(data) * 1.005
    });
    
    

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
            });

            // const thisColor = util.getStringFromP5ColorObj(guy.color);
            // if (stats.colors[thisColor] === undefined) stats.colorCount++;
            // stats.colors[thisColor] = (stats.colors[thisColor] || 0 ) + 1;

            

            if (guy.hasDominantColor) {
                //stats.dominantColors[thisColor] = (stats.dominantColors[thisColor] || 0 ) + 1;
                guy.size = 15;
            }
            i++;
            return guy;
        });
        
    for (const guy of guys) {
        guy.drawMe();
    }

    
}


function drawEnvironment() {
    push();
    strokeWeight(2);
    stroke("#cc99ff");
    fill(0);
    rect(10, 10, width - 20, height / 2, 26);
    pop();

    const spacing = 80;
    //vertical
    push();
        stroke('#ffaa00cc');
        for (let i = spacing; i < width; i += spacing) {
            line(i, 10, i, width+10);
        }

        //horizontal
        for (let i = spacing; i < height / 2; i += spacing) {
            line(10, i, width-10, i);
        }
    pop();
    
    push();
    //the box is 380px wide
    stroke(0);
    strokeWeight(3);
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

function statsText() {
    let leftMargin = 10;
    let startingY = (height / 2) + graphAreaHeight + 50;
    push();
        noStroke();
        fill("#ddbbff");
        textSize(15);
        text("TIME INDEX: " + frameCount / 1000, leftMargin, startingY);
        text("GUYS: " + stats.guys, leftMargin, startingY + 20);
        text("FOOD: " + forage.foodStorage.length, leftMargin, startingY + 40);
        text("REPLENISH: " + forage.replenishRate.toFixed(3), leftMargin, startingY + 60);

        let middleMargin = leftMargin + 110;
        text(`GDR: ${Guy.getGlobalDigestionRate().toFixed(3)}`, middleMargin, startingY);
        text(`TMP: ${data.temp}`, middleMargin, startingY + 20);
        text(`HUM: ${data.hum}`, middleMargin, startingY + 40);
        text(`VIS: ${data.vis}`, middleMargin, startingY + 60);
    pop();
}

function histogramButtons() { 
  let x = 390;
  let startingY = (height / 2) + graphAreaHeight + 50;

  push();
  textSize(15);
  textAlign(RIGHT);

  const makeBox = (trait, label, color, y) => {
    const w = textWidth(label);
    const a = textAscent();
    const d = textDescent();
    return {
      trait,
      label,
      color,
      x: x - w,
      y: y - a,
      w,
      h: a + d
    };
  };

  histogramButtonBoxes = [
    makeBox("senseDistance", "SENSE_DIST", "#339cccff", startingY),
    makeBox("velLimit", "VEL_LIMIT", "#aaaaff", startingY + 20),
    makeBox("digestionProgress", "DIG_PROG", "#cc2233", startingY + 40),
    makeBox("noiseMagnitude", "NOISE_MAG", "#99aa22", startingY + 60),
  ];

  noStroke();
  fill('#339cccff'); text("SENSE_DIST", x, startingY);
  fill('#aaaaff'); text("VEL_LIMIT",   x, startingY + 20);
  fill('#cc2233'); text("DIG_PROG",    x, startingY + 40);
  fill('#99aa22'); text("NOISE_MAG",    x, startingY + 60);

  pop();
}


function drawGraphs() {
    push();
    let startingY = (height / 2) + 20;
    let graphs = ['numberOfGuysHistory', 'numberOfFoodHistory', 'histogram'];
    
    let i = 0;
    for (let graph of graphs) {
        let minY = 0;
        let maxY = 0;
        let color = '';

        switch (graph) {
            case 'numberOfGuysHistory':
                minY = 0;
                maxY = data.temp + 5;
                color ='#ee1edcff'
                break;
            case 'numberOfFoodHistory':
                minY = 0;
                maxY = forage.chanceOfFood;
                color = '#99cc33';
                break;
            case 'histogram':
                color = '#339cccff';
                break;
        }

        stroke(color);
        noFill();

        line(10, startingY, width-10, startingY);
        line(10, startingY + (graphAreaHeight / graphs.length), width-10, startingY + (graphAreaHeight / graphs.length));
        startingY++;
        if (graph != 'histogram') {
            if (stats[graph].length > 1) {
                beginShape();
                    for (let i = 0; i < stats[graph].length; i++) {
                        let x = map(i, 0, stats[graph].length-1, 10, width-10);
                        let y = map(stats[graph][i], minY, maxY, startingY + (graphAreaHeight / graphs.length), startingY+5);
                        vertex(x, y);
                    }
                endShape();
            }
        } else {
            
        }
        
        startingY += (graphAreaHeight / graphs.length) + 5;
        i++;
    }
    pop();
}

function drawHistogram() { 
    let color = histogramButtonBoxes[selectedHistogram].color;
    const sectionH = graphAreaHeight / 3;
            const x0 = 10;
            const y0 = 618 + 5;
            const w = width - 20;
            const h = sectionH - 10;

    histogram = guys.map(g => g[histogramButtonBoxes[selectedHistogram].trait])
    push();
    stroke(color);
        noFill();
    let bins = 10;
    let minVal = min(histogram);
    let maxVal = max(histogram);
    let binSize = (maxVal - minVal) / bins;
    let counts = Array(bins).fill(0);

    for (let v of histogram) {
        let index = floor((v - minVal) / binSize);
        if (index === bins) index = bins - 1;
        counts[index]++;
    }

    let maxCount = max(counts);
    let barWidth = w / bins;

    let labelH = 14;
    let plotH = h - labelH;

    textAlign(CENTER, TOP);
    textSize(7);

    for (let i = 0; i < bins; i++) {
        let barHeight = map(counts[i], 0, maxCount, 0, plotH);
        let x = x0 + i * barWidth;
        let y = y0 + plotH - barHeight;

        rect(x, y, barWidth - 2, barHeight);

        let binStart = minVal + i * binSize;
        let binEnd = binStart + binSize;
        text(
            `${binStart.toFixed(4)}`,
            x + barWidth / 2,
            y0 + plotH + 2
        );
        text(
            `${binEnd.toFixed(4)}`,
            x + barWidth / 2,
            y0 + plotH + 9
        );
    }
    pop();
}
