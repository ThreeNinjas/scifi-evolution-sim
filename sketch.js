const params = new URLSearchParams(window.location.search);
const debug = params.get('debug');
let numberOfGuys = params.get('guys') || null;
let globalMaxGuys = 0;
let font;

const mutationBeep = new Audio('/assets/computer_work_beep.mp3');
mutationBeep.preload = 'auto';

const deathBeep = new Audio('/assets/computerbeep_39.mp3');
deathBeep.preload = 'auto';

let util = new Util();
let c; //maybe rename config below later....

/** @@type {Guy[]} */
let guys = [];
/** @@type {Forage[]} */
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
let automatedHistogramSelection = true;
let volumeIcon;
let muteIcon;
let iconsReady;
let volumeOn;

/*
TODO: move the actually populating of guys out of loadWeather and into guys.populateGuys();
TODO: other real world data variables: size, speed (increment by more than 1?), ability to kill
TODO: implement quadtree
TODO: visual indicators of certain traits
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

    if (guys.length <= 1) {
        window.location.reload();
    }

    if (guys.length > globalMaxGuys) {
        globalMaxGuys = guys.length;
    }

    for (let guy of guys) {
        if (getTimeIndex() - guy.birthday >= guy.lifeSpan || guy.offspringCount > guy.childrenAllowed) {
            guy.dead = 1;
            guy.halo = 1;

            if (!guy.deathNoisePlayed) {
                stats.guys--;
                guy.deathNoisePlayed = 1;
            }
        }
        if (guy.size < guy.adultSize) {
            guy.growthProgress += guy.growthRate;

            if (!guy.isHungry() && guy.growthProgress >= 1) {
                guy.size++;
                guy.growthProgress--;
                guy.senseDistance = guy.senseDistanceG();
            }
        }

        let sensedFood;
        guy.potentialMates = [];
        if (guy.dead) {
            guy.decayProgress += Guy.getGlobalDigestionRate() * (data.rain > 0 ? data.rain : data.vis);

            if (guy.decayProgress >= 1) {
                //delete
                guysToRemove.add(guy.id);
            }
        }

        for (let otherGuy of guys) {
            if (otherGuy === guy) continue;
            if (guy.senses(otherGuy) && guy.isHorny && otherGuy.isHorny && !guy.isSeeking && !guy.mate) {
                guy.potentialMates.push(otherGuy);
                guy.mateTimer++;

                if (!guy.isSeeking && guy.mateTimer > 100) {
                    //guy.mate = util.closestGuyByColor(guy.color, guy.potentialMates);
                    guy.mate = guy.chooseMate(guy.color, guy.potentialMates);
                    if (guy.mate) {
                        guy.target.x = guy.mate.pos.x;
                        guy.target.y = guy.mate.pos.y;
                        guy.isSeeking = 1;
                    }
                    
                    guy.mateTimer = 0;
                }
            
                if (debug) {
                    push();
                        textSize(10);
                        fill('white');
                        text('!!', guy.pos.x, guy.pos.y+20);
                        text('!!', otherGuy.pos.x, otherGuy.pos.y+20);
                    pop();
                }
            }
        }

        for (let mt of guy.potentialMates) {
            guy.arrow(mt);
        }

        if (!guy.dead) {
            if (guy.isHungry()) {
                guy.isHorny = 0;
                sensedFood = guy.sensesFood(forage.foodStorage);

                if (sensedFood) {
                    guy.seekFood(sensedFood);
                    if (!guy.overRideMove) {
                        guy.move();
                    }
                    if (guy.overRideMoveIntermittent) {
                        if (!util.chance(data.hum)) {
                            guy.move();
                        }
                    }
                } else {
                    guy.move();
                    guy.mate = null;
                    guy.target.x = 0;
                    guy.target.y = 0;
                }

                const foodToEat = guy.intersectsFood(forage.foodStorage);
                if (foodToEat !== null) {
                    guy.eat(foodToEat);
                }
            } else {
                if (guy.isSeeking && guy.mate && !guy.mate.dead) {
                    guy.seekMate(guy.mate, guys);
                    //guy.arrow(guy.mate);
                } else {
                   guy.move(); 
                   guy.mate = null;
                }
                
                guy.isHorny = guy.isSexuallyMature();
            }
        }


        guy.digestionProgress += guy.isSexuallyMature() ? guy.digestionRate : guy.digestionRate / 4;
        if (guy.stomachContents > 0 && guy.dead == 0) {
            if (guy.digestionProgress >= 1) {
                guy.stomachContents -= forage.foodSize;
                guy.digestionProgress -= 1;
            }
        } else {
            if (guy.digestionProgress >= 1 && guy.dead == 0 && guy.stomachContents == 0) {
                guy.dead = 1;
                stats.guys--;
            }
        }

        
        guy.drawMe();
        if (sensedFood) {
            guy.arrow(sensedFood);
        }
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

    if (frameCount % 200 === 0 && automatedHistogramSelection) {
        selectedHistogram++;
        if (selectedHistogram > 3) {
            selectedHistogram = 0;
        }
    }

    drawMasking();

    statsText();
    
    drawGraphs();

    histogramButtons();

    drawHistogram(0);

    drawBars();
}

function mousePressed() { 
    //width - 30, height/2 + 25
    if (
        mouseX >= width - 30 &&
        mouseX <= (width - 30) + 20 &&
        mouseY >= height/2 + 25 &&
        mouseY <= (height/2 + 25) + 20
    ) {
        mutationBeep.play().then(() => {
        mutationBeep.pause();
        mutationBeep.currentTime = 0;
      }).catch(() => {});

        volumeOn = !volumeOn;

        let sounds = [mutationBeep];
        for (let sound of sounds) { 
            sound.play().then(() => {
                sound.pause();
                sound.currentTime = 0;
            }).catch(() => {})
        }
    }
    

    for (const [i, box] of Object.entries(histogramButtonBoxes)) {
        if (
            mouseX >= box.x &&
            mouseX <= box.x + box.w &&
            mouseY >= box.y &&
            mouseY <= box.y + box.h
        ) {
            selectedHistogram = i;
            automatedHistogramSelection = false;
        }
    }

    for (const [i, guy] of Object.entries(guys)) {
        if (dist(mouseX, mouseY, guy.pos.x, guy.pos.y) <= guy.size / 2) {
            guy.halo = !guy.halo;
            
            if (guy.halo) {
                console.log(guy, guy.calculateSensePerim(), guy.isHungry(), guy.isHorny);
                console.log(guy, `sensePerim: ${guy.calculateSensePerim()}, hungry: ${guy.isHungry()}, horny: ${guy.isHorny}`);
                console.log(`size: ${guy.size}, adultSize: ${guy.adultSize}, sexually mature: ${guy.isSexuallyMature()}`);
            }
        }
    }
}

async function loadWeather() {
    loadIcons();
    const url = `${serverURL}weather/guys`;
    console.log(url);
    data = await fetch(url)
        .then(r => r.json());

    console.log(data);
    c = new Config();
    numberOfGuys = debug && numberOfGuys ? numberOfGuys : Math.floor(data.temp);
    stats.guys = numberOfGuys;

    DIGESTION_RATE_PER_FRAME = Guy.getGlobalDigestionRate(); 

    forage = new Forage({
        maxX: config.bounds.x.max,
        maxY: config.bounds.y.max,
        chanceOfFood: Math.floor(data.hum),
        replenishRate: Guy.getGlobalDigestionRate(data) * 1.005
    });

    frameRate(data.temp);
    i = 0;
    guys = Array.from({ length: numberOfGuys }, () => {
            const guy = new Guy();

            // const thisColor = util.getStringFromP5ColorObj(guy.color);
            // if (stats.colors[thisColor] === undefined) stats.colorCount++;
            // stats.colors[thisColor] = (stats.colors[thisColor] || 0 ) + 1;
            i++;
            return guy;
        });
    globalMaxGuys = guys.length;
    for (const guy of guys) {
        guy.drawMe();
    }
}

function loadIcons() {
  iconsReady = false;

  loadImage('/assets/Speaker_Icon.png', img => {
    volumeIcon = img;
    iconsReady = !!(volumeIcon && muteIcon);
  });

  loadImage('/assets/Mute_Icon.png', img => {
    muteIcon = img;
    iconsReady = !!(volumeIcon && muteIcon);
  });
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

function getTimeIndex() {
    return frameCount / 1000;
}

function drawMasking() {
    push();
        let maskColor = 'black';

        //rectanble over the stats area
        stroke(maskColor);
        fill(maskColor);
        rect(0, height/2 + 12, width, height/2);

        //lines covering the top board area, outside the environment
        stroke(maskColor);
        fill(maskColor);
        rect(0, 0, 8, height/2 +15);
        rect(width - 8, 0, 8, height/2 + 15);
        rect(0, 0, width, 8);


        //alllll the rest of this is to mask the rounded corners where the above lines could not reach lol
        const x = 10 - 1;
        const y = 10 - 1;
        const w = (width - 20) + 2;
        const h = (height / 2) + 2;
        const r = 26 - 4;
        const steps = 24;

        let cx, cy, a;

        cx = x + r; cy = y + r;
        beginShape();
        vertex(x, y);
        vertex(x + r, y);
        for (let i = 0; i <= steps; i++) {
        a = (3 * Math.PI / 2) - (i * (Math.PI / 2) / steps);
        vertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        vertex(x, y + r);
        endShape(CLOSE);

        cx = x + w - r; cy = y + r;
        beginShape();
        vertex(x + w, y);
        vertex(x + w - r, y);
        for (let i = 0; i <= steps; i++) {
        a = (3 * Math.PI / 2) + (i * (Math.PI / 2) / steps);
        vertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        vertex(x + w, y + r);
        endShape(CLOSE);

        cx = x + r; cy = y + h - r;
        beginShape();
        vertex(x, y + h);
        vertex(x, y + h - r);
        for (let i = 0; i <= steps; i++) {
        a = Math.PI - (i * (Math.PI / 2) / steps);
        vertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        vertex(x + r, y + h);
        endShape(CLOSE);

        cx = x + w - r; cy = y + h - r;
        beginShape();
        vertex(x + w, y + h);
        vertex(x + w - r, y + h);
        for (let i = 0; i <= steps; i++) {
        a = (Math.PI / 2) - (i * (Math.PI / 2) / steps);
        vertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        vertex(x + w, y + h - r);
        endShape(CLOSE);

    pop();
}

function statsText() {
    let leftMargin = 10;
    let startingY = (height / 2) + graphAreaHeight + 50;
    push();
        noStroke();
        fill("#ddbbff");
        textSize(15);
        text("TIME INDEX: " + getTimeIndex(), leftMargin, startingY);
        text("GUYS: " + guys.length, leftMargin, startingY + 20);
        text("FOOD: " + forage.foodStorage.length, leftMargin, startingY + 40);
        text(`RPL: ${(forage.replenishRate*10000).toFixed(3)}`, leftMargin, startingY + 60);

        let middleMargin = leftMargin + 110;
        
        text(`GDR: ${(Guy.getGlobalDigestionRate()*10000).toFixed(3)}`, middleMargin, startingY);
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
    makeBox("digestionRate", "DIG_RATE", "#cc2233", startingY + 40),
    makeBox("noiseMagnitude", "NOISE_MAG", "#99aa22", startingY + 60),
  ];

  noStroke();
  fill('#339cccff'); text("SENSE_DIST", x, startingY);
  fill('#aaaaff'); text("VEL_LIMIT",   x, startingY + 20);
  fill('#cc2233'); text("DIG_RATE",    x, startingY + 40);
  fill('#99aa22'); text("NOISE_MAG",    x, startingY + 60);

  pop();
}


function drawGraphs() {
    if (iconsReady) {
        tint(255, 255, 255, 128);
        if (volumeOn) {
            image(volumeIcon, width - 30, height/2 + 25, 20, 20);
        } else {
            image(muteIcon, width - 30, height/2 + 25, 20, 20);
        }
        noTint();
    }
    
  push();
  let startingY = (height / 2) + 20;
  let graphs = ['numberOfGuysHistory', 'numberOfFoodHistory', 'histogram'];

  for (let graph of graphs) {
    let minY = 0;
    let maxY = 0;
    let color = '';

    switch (graph) {
      case 'numberOfGuysHistory':
        minY = 0;
        maxY = globalMaxGuys;
        color = '#ee1edcff';
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

    const sectionH = graphAreaHeight / graphs.length;
    const yBottom = startingY + sectionH;
    const yTop = startingY + 5;

    line(10, startingY, width - 10, startingY);
    line(10, yBottom, width - 10, yBottom);

    startingY++;

    if (graph != 'histogram') {
      if (stats[graph].length > 1) {
        beginShape();
        for (let i = 0; i < stats[graph].length; i++) {
          let x = map(i, 0, stats[graph].length - 1, 10, width - 10);
          let y = map(stats[graph][i], minY, maxY, yBottom, yTop, true);
          vertex(x, y);
        }
        endShape();
      }
    }

    startingY += sectionH + 5;
  }

  pop();
}


function drawHistogram() { 
  let color = histogramButtonBoxes[selectedHistogram].color;
  const sectionH = graphAreaHeight / 3;
  const x0 = 10;
  const y0 = 618 + 2;
  const w = width - 20;
  const h = sectionH - 10;

  const trait = histogramButtonBoxes[selectedHistogram].trait;
  const values = guys.map(g => g[trait]).filter(v => Number.isFinite(v));
  if (values.length === 0) return;

  push();
  stroke(color);
  noFill();

  const bins = 10;
  const minVal = min(values);
  const maxVal = max(values);
  const range = maxVal - minVal;

  let counts = Array(bins).fill(0);

  if (range === 0) {
    counts[0] = values.length;
  } else {
    const binSize = range / bins;
    for (let v of values) {
      let index = floor((v - minVal) / binSize);
      index = constrain(index, 0, bins - 1);
      counts[index]++;
    }
  }

  const maxCount = max(counts);
  if (!Number.isFinite(maxCount) || maxCount <= 0) return;

  const barWidth = w / bins;
  const labelH = 14;
  const plotH = h - labelH;

  textAlign(CENTER, TOP);
  textSize(7);

  const binSizeForLabels = range === 0 ? 0 : range / bins;

  for (let i = 0; i < bins; i++) {
    const barHeight = map(counts[i], 0, maxCount, 0, plotH);
    const x = x0 + i * barWidth;
    const y = y0 + plotH - barHeight;

    rect(x, y, barWidth - 2, barHeight);

    const binStart = minVal + i * binSizeForLabels;
    const binEnd = binStart + binSizeForLabels;

    if (range === 0) {
      if (i === 0) {
        text(`${minVal.toFixed(4)}`, x + barWidth / 2, y0 + plotH + 2);
        text(`${maxVal.toFixed(4)}`, x + barWidth / 2, y0 + plotH + 9);
      }
    } else {
      text(`${binStart.toFixed(4)}`, x + barWidth / 2, y0 + plotH + 2);
      text(`${binEnd.toFixed(4)}`, x + barWidth / 2, y0 + plotH + 9);
    }
  }

  pop();
}


function drawPing(guy) {
    if (!guy.isHorny && forage.foodStorage.length == 0 && millis() - guy.lastPing < 80000) {
       return;
    }
    const start = guy.size;
    //const end = guy.senseDistance * 2;
    //const end = guy.senseDistance;
    const end = guy.calculateSensePerim();
    const t = constrain((guy.pingSize - start) / (end - start), 0, 1);
    const alpha = Math.floor(255 * (1 - t));
    const hexAlpha = alpha.toString(16).padStart(2, '0');

    const colorStub = guy.isHorny ? '#ff3cd1' : '#339ccc'
    push();
        noFill();
        stroke(`${colorStub}${hexAlpha}`);
        circle(guy.pos.x, guy.pos.y, guy.pingSize);
        guy.pingSize += guy.pingSize * 0.025;
        if (guy.pingSize >= end) {
            guy.pingSize = guy.size;
        }
    pop();
}

function drawBars() {
    if (guys.length > 0) {
        push();
            translate(200, 712);

            //food replenish
            stroke(c.forage.color);
            noFill();
            rect(0, 0, 100, 20);
            fill(c.forage.colorVar2);
            let forageProgress = map(forage.replenishProgress, 0, 1, 0, 100)
            rect(0, 0, forageProgress < 100 ? forageProgress : 100, 20);

            //food eaten
            let cutoff = forage.chanceOfFood * 0.10;
            let percentOfThreshold = ((forage.chanceOfFood - forage.foodStorage.length) / (forage.chanceOfFood - cutoff)) * 100;
            percentOfThreshold = constrain(percentOfThreshold, 0, 100);

            stroke(c.guys.colors.hungry);
            noFill();
            rect(0, 27, 100, 20);
            fill(c.guys.colors.hungry);
            rect(0, 27, percentOfThreshold, 20);

            
            if (percentOfThreshold > 90 && forageProgress > 90) {
                if (Math.floor(millis() / 400) % 2 === 0) { 
                push();
                    
                    fill(c.guys.colors.gold);
                    stroke(c.guys.colors.gold);

                    //right top
                    strokeWeight(2);
                    line(-12, -1, -7, -1);
                    //right vert
                    strokeWeight(3);
                    line(-12, 0, -12, 47);
                    //right bottom
                    strokeWeight(2);
                    line(-12, 48, -7, 48);

                    //left top
                    strokeWeight(2);
                    line(107, -1, 112, -1);
                    //left vert
                    strokeWeight(3);
                    line(113, 0, 113, 47);
                    //left bottom
                    strokeWeight(2);
                    line(108, 48, 113, 48);
                    pop();
                }
            } 

            //horny
            stroke(c.guys.colors.hornyVar2);
            noFill();
            rect(0, 54, 100, 20);
            fill(c.guys.colors.hornyVar2);
            let hornyGuys = map(guys.filter(g => g.isHorny).length, 0, guys.length, 0, 100);
            if (hornyGuys > 0) {
                rect(0, 54, hornyGuys, 20);
            }

            let percentSexuallyMature = map(guys.filter(g => g.isSexuallyMature() == true).length, 0, guys.length, 0, 100);
            if (percentSexuallyMature > 0) {
                //stroke(c.guys.colors.hornyVar3);
                stroke('black');
                strokeWeight(1);
                fill(c.guys.colors.hornyVar3);
                rect(0, 54 + (20 - 5) / 2, percentSexuallyMature, 5);
            }
        pop();
    }
    
}
