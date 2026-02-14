const params = new URLSearchParams(window.location.search);
const debug = params.get('debug');
const jason = params.get('jason');
const local = params.get('local');
let numberOfGuys = params.get('guys') || null;
let globalMaxGuys = 0;
let font;
let traits;
let viz;

let sounds = {
    mutationBeep: new Audio('assets/alert12.mp3'),
    prefBeep: new Audio('assets/computerbeep_39.mp3'),
    deathBeep: new Audio('assets/communications_end_transmission.mp3'),
    birthBeep: new Audio('assets/hailbeep4_clean.mp3'),
    monsterAlert: new Audio('assets/input_ok_3_clean.mp3'),
    weatherUpdated: new Audio('assets/ds9intercom.mp3'),
    penaltyOnBeep: new Audio('assets/penaltyOn.mp3'),
    penaltyOffBeep: new Audio('assets/penaltyOff.mp3'),
    carnivoreNoise: new Audio('assets/thatSFXguy/alert 02.mp3'),
    treeGuyTorchPassNoise: new Audio('assets/input_failed2_clean.mp3'),
    avoid: new Audio('assets/thatSFXguy/whubb 02.mp3'),
    wander: new Audio('assets/deskviewer1.mp3'),
};

for (let sound of Object.values(sounds)) {
    sound.preload = 'auto';
    sound.volume = 0.125;
}

for (let sound of [sounds.deathBeep, sounds.birthBeep, sounds.carnivoreNoise]) {
    sound.volume = 0.125;
}

let util = new Util();
let c; //maybe rename config below later....

/** @@type {Guy[]} */
let guys = [];
/** @@type {Forage[]} */
let forage;
let pt;
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

const MAX_HISTORY_LENGTH = 500;
const DOWNSAMPLE_RATE = 4;

//environmentally dependent variables
let DIGESTION_RATE_PER_FRAME = 0;
let SENSE_DISTANCE_MULTIPLIER = null;

let weatherUpdateInFlight = false;

let viewerOn = false;

const serverURL =
    local == 1 ? "http://localhost:3000/" : "http://199.19.74.165:3000/";

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
let volumeOn = false;
let paused = false;
let treeMode = false;
let treeGuy = null;

let byId;

let valueToViz = 'velLimit';
let vizValueDropdown;

/*
TODO: move the actually populating of guys out of loadWeather and into guys.populateGuys();
TODO: other real world data variables: size, speed (increment by more than 1?), ability to kill
TODO: implement quadtree
TODO: visual indicators of certain traits
*/

async function setup() { 
    font = await loadFont("assets/Antonio-Regular.ttf");
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

    if (!treeMode) {
        treeGuy = null;
    }

    forage.drawMe();

    // for (const guy of guys) {
    //     guy.move();
    // }

    guys = guys.filter(g => !guysToRemove.has(g.id));

    guysToRemove.clear();

    byId = {};
    for (let g of guys) byId[g.id] = g;

    // if (guys.filter(g => !g.dead).length <= 1) {
    //     window.location.reload();
    // }

    if (!window.__reloading && guys.filter(g => !g.dead).length <= 1) {
        console.log('reload lol if you see me you are fucked haha');
        window.__reloading = true;
        window.top.location.href = window.location.href;
    }


    if (guys.length > globalMaxGuys) {
        globalMaxGuys = guys.length;
    }

    guysToHighlight = treeMode && treeGuy ? treeGuy : guys.filter(g => g.halo == 1);

    if (pt.thresholds.armored.passed && guys.filter(g => g.carnivorous).length == 0) {
        pt.thresholds.carnivoresExtinct.passed = true;
        pt.thresholds.carnivore.passed = false;
        pt.thresholds.carnivoreOnCarnivore.passed = false;
    }

    if (pt.thresholds.carnivoresExtinct.passed && pt.thresholds.armored.passed && guys.filter(g => g.armored).length == 0 && guys.filter(g => g.carnivorous).length == 0) {
        pt.thresholds.carnivoresExtinct.passed = false;
        pt.thresholds.carnivore.passed = false;
        pt.thresholds.armored.passed = false;
    }

    if (guys.length > Math.floor(Math.abs(data.temp))) {
        pt.thresholds.populationBoom.passed = true;
    }

    for (let guy of guys) {
        //kill guys whose time is up or who have had their allotment of children
        if (!guy.dead && (getTimeIndex() - guy.birthday >= guy.lifeSpan || guy.offspringCount > guy.childrenAllowed)) {
            Guy.killThisGuy(guy, true);
            // guy.dead = 1;

            // if (treeGuy === guy) {
            //     treeGuy = guy.getDescendants({}, new Set(), 'children', true);
            // }

            // if (!guy.deathNoisePlayed) {
            //     //return them to the environment
            //     if (guy.stomachContents > 0) {
            //         forage.populateMe(guy.stomachContents, guy.pos, guy.size);
            //         guy.stomachContents = 0;
            //     }

            //     forage.populateMe(guy.size, guy.pos, guy.size);
            //     stats.guys--;
            //     guy.playDeathBeep();
            // }
        }

        //guys that aren't full grown, increment their growth
        if (guy.size < guy.adultSize) {
            guy.growthProgress += guy.growthRate;

            //if their belly is full and so is their growth progress, increment their size
            if (!guy.isHungry() && guy.growthProgress >= 1) {
                guy.size++;
                guy.growthProgress--;
                guy.senseDistance = guy.senseDistanceG();
            }
        }

        //food, folks, and fun
        let sensedFood;
        guy.potentialMates = [];

        //decay dead guys, remove them from the board
        if (guy.dead) {
            guy.decayProgress += Guy.getGlobalDigestionRate() * (data.vis);

            if (guy.decayProgress >= 1) {
                //delete
                guysToRemove.add(guy.id);
            }
        }

        //hey, there's no need to check the position of every other guy when all you want to find is another currently horny guy!
        //just like real life!
        if (guy.isHorny) {
            let hornyGuys = guys.filter(g => g.isHorny);

            if (pt.thresholds.carnivoreOnCarnivore.passed && guy.carnivorous) hornyGuys = hornyGuys.filter(g => g.carnivorous);
            if (pt.thresholds.carnivoreOnCarnivore.passed && !guy.carnivorous) hornyGuys = hornyGuys.filter(g => !g.carnivorous);

            for (let otherGuy of hornyGuys) {
                if (otherGuy === guy || guy.seekPriority == 'baby') continue;
                if (guy.senses(otherGuy) && !guy.isSeeking && !guy.mate) {
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
        }
        
        for (let mt of guy.potentialMates) {
            guy.arrow(mt);
        }

        //find food
        if (!guy.dead) {
            //hungry carnivores
            if (guy.isHungry() && guy.carnivorous) {
                guy.isHorny = false;
                if (!guy.prey) {
                    //choose the guy with the fullest stomach as prey
                    let potentialPrey;

                    if (pt.thresholds.carnivoreOnCarnivore.passed) {
                        potentialPrey = guys.filter(g => !g.carnivorous);
                    } else {
                        potentialPrey = guys;
                    }

                    guy.prey = potentialPrey.filter(g => g.stomachContents < guy.size && !g.dead && g !== guy).reduce((a, b) => !a || b.stomachContents > a.stomachContents ? b : a, null);
                    
                    if (guy.prey) {
                        guy.target.x = guy.prey.pos.x;
                        guy.target.y = guy.prey.pos.y;

                        guy.isSeeking = 1;
                        guy.seekPriority = 'prey';

                        //if the other guy's a runner...
                        if (guy.prey.runsFromPredators) {
                            if (dist(guy.pos.x, guy.pos.y, guy.prey.pos.x, guy.prey.pos.y) <= guy.prey.calculateSensePerim()) {
                                guy.prey.beingChasedBy = guy;
                            }
                        }
                    }   
                } else {
                    guy.seek();
                }
            }

            if (guy.beingChasedBy) {
                if (!guy.beingChasedBy.isHungry() || guy.beingChasedBy.dead || guy.beingChasedBy.prey != guy) {
                    guy.beingChasedBy = null;
                } else {
                    guy.evadePredator();
                }
            }

            //hungry herbivores
            if (guy.gravityBites.length > 0 && !guy.carnivorous) {
                    guy.gravityFeed();
                }
                
            if (guy.isHungry() && guy.seekPriority !== 'baby' && !guy.carnivorous) {
                guy.isHorny = false;
                sensedFood = guy.sensesFood(forage.foodStorage);

                if (sensedFood) {
                    guy.wanderNoisePlayed = false;
                    if (guy.reactionStartFrame === null && guy.seekPriority !== 'food') {
                        guy.reactionStartFrame = frameCount;
                    }
                    if (frameCount >= guy.reactionStartFrame + guy.reactionTime) {
                        guy.seekFood(sensedFood);
                        guy.reactionStartFrame = null;
                        guy.seekPriority = 'food';
                    }
                    
                    if (!guy.overRideMove) {
                        guy.move();
                    }
                    if (guy.overRideMoveIntermittent) {
                        if (!util.chance(data.hum)) {
                            guy.move();
                        }
                    }
                } else {
                    if (guy.seekPriority !== 'wander') {
                        guy.target.x = 0;
                        guy.target.y = 0;
                    }
                    guy.move();
                    guy.mate = null;

                    if (guy.wander) {
                        guy.wanderStartingT++;
                        if (guy.wanderStartingT > guy.reactionTime * 2) {
                            if (guy.seekPriority !== 'wander') {
                                guy.seekPriority = 'wander'; 
                                guy.target.x = c.corners[util.randomNumber(0, c.corners.length - 1)].x;
                                guy.target.y = c.corners[util.randomNumber(0, c.corners.length - 1)].y;
                            }
                            //push(); stroke('white'); line(guy.pos.x, guy.pos.y, guy.target.x, guy.target.y); pop();
                            util.playNoise(sounds.wander, () => guy.wanderNoisePlayed = true);
                            guy.seek();
                        }
                    }
                }

                const foodToEat = guy.intersectsFood(forage.foodStorage);
                if (foodToEat !== null) {
                    guy.eat(foodToEat);
                }
            } else {
                if (guy.isSeeking && guy.mate && !guy.mate.dead) {
                    guy.seekMate(guy.mate, guys);
                    //guy.arrow(guy.mate);
                } else if (guy.seekPriority == 'baby') {
                    guy.seek();
                } else {
                   guy.move(); 
                   guy.mate = null;
                }
                
                guy.isHorny = guy.seekPriority !== 'baby' && guy.isSexuallyMature();
            }
        }

        if (guy.isHungry()) {
            guy.isHorny = false;
        }


        guy.digestionProgress += guy.isSexuallyMature() ? guy.digestionRate : guy.digestionRate / 4;

        if (guy.stomachContents > 0 && !guy.dead) {
            //Penalizing speed, the closer you get to the initial limit, the higher the metabolic cost
            //suspending the laws of physics for mating purposes, just like irl
            if (!guy.mate && jason != 2) {
                const penalty = Math.pow(guy.vel.mag() / viz.experiment.samples.velLimit[0].max, 3);
                guy.stomachContents -= penalty * 0.001;
                guy.stomachContents = Math.max(0, guy.stomachContents);
            }
            /**
             * Just so you remember how this works lol
                1 / 5 ^ 3 = 0.008
                5 / 5 ^ 3 = 1
                6 / 5 ^ 3 = 1.728
             */
        }
        if (guy.stomachContents > 0 && guy.dead == 0) {
            if (guy.digestionProgress >= 1) {
                guy.stomachContents -= forage.foodSize;
                guy.digestionProgress -= 1;

                if (guy.haloWasSetAutomatically) {
                    guy.halo = 0;
                    guy.haloWasSetAutomatically = 0;
                }
            }
        } else {
            if (guy.digestionProgress >= 1 && guy.dead == 0 && guy.stomachContents == 0) {
                if (treeGuy === guy) {
                    treeGuy = guy.getDescendants({}, new Set(), 'children', true);
                }
                Guy.killThisGuy(guy);
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
            stats.numberOfFoodHistory.shift();
        }

        stats.numberOfGuysHistory.push(stats.guys);

        if (stats.numberOfGuysHistory.length > MAX_HISTORY_LENGTH) {
            stats.numberOfGuysHistory.shift();
        }
    }

    if (frameCount % 200 === 0 && automatedHistogramSelection) {
        if (automatedHistogramSelection) {
            selectedHistogram++;
            if (selectedHistogram > 3) {
                selectedHistogram = 0;
            }
        }
        
    }

    

    if (frameCount % 1000 === 0) {
        viz.houseKeeping();
        viz.takeSnapshot(guys);
        
        if (!weatherUpdateInFlight) {
            weatherUpdateInFlight = true;
            const prevData = JSON.stringify(data);

            updateWeather()
                .then((newData) => {
                    if (!newData) return;

                    data = newData;

                    if (volumeOn && weatherHasChanged(prevData)) {
                        sounds.weatherUpdated.currentTime = 0;
                        sounds.weatherUpdated.play().catch(() => {});
                        console.log(data);
                    }
                }).finally(() => {
                    weatherUpdateInFlight = false;
                })
        }
    }

    if (guysToHighlight.length > 0) {
        drawHighLightMask();
        for (let guy of guysToHighlight) {
            guy.drawMe();
        }
    }

    if (treeMode && treeGuy) {
        guys.filter(g => g.id !== treeGuy.id).forEach(g => g.halo = 0);
        drawTree();
    }

    if (viewerOn) {
        showViz();
    }

    drawMasking();

    statsText();
    
    drawGraphs();

    histogramButtons();

    drawHistogram(0);

    drawBars();

    drawControls();

    drawThresholdBars();
}

function weatherHasChanged(prevData) {
    forage.calculateChanceOfFood();
    return JSON.stringify(data) !== prevData;
}

function keyPressed() {
    if (key === 'm') {
        volumeOn = !volumeOn;
    }

    if (key === ' ') {
        handlePause();
    }

    if (keyIsDown(SHIFT) && key === 'V' && viewerOn) { 
        let i = traits.findIndex(f => f == valueToViz); 
        if (i == traits.length - 1) {
            i = 0;
        } else {
            i++;
        }
        viz.show(traits[i]);
    }

    if (key === 'v') {
        handleVizMode();
    }

    if (key === 't') {
        handleTreeMode();
    }
}

function handlePause() {
    paused = !paused;

    if (paused) {
        noLoop();
    } else {
        loop();
    }
}

function handleVizMode() {
    viewerOn = !viewerOn;

    if (viewerOn) {
        vizDropdownWrap.show();
    } else {
        vizDropdownWrap.hide();
    }
}

function handleTreeMode() {
    if (treeMode == false) {
        treeMode = true;

        if (guysToHighlight.length == 1) {
            treeGuy = guysToHighlight[0];
        } else {
            guysToHighlight = [];
        }
    } else {
        treeMode = false;
        if (treeGuy) {
            treeGuy.halo = 0;
        treeGuy = null;
        }
        guysToHighlight = [];
    }
}

function mousePressed() {
    let yAddOn = 30;
    //mute button
    if (
        mouseX >= width - 30 &&
        mouseX <= (width - 30) + 20 &&
        mouseY >= (height/2 + 95) + yAddOn &&
        mouseY <= ((height/2 + 95) + 20) + yAddOn
    ) {
        volumeOn = !volumeOn;
        
        for (let sound of Object.values(sounds)) { 
            sound.muted = volumeOn ? false : true;
        }

    }
    
    //pause button
    if (
        mouseX >= width - 45 &&
        mouseX <= (width - 45) + 10 &&
        mouseY >= (height/2 + 95)  + yAddOn &&
        mouseY <= ((height/2 + 95) + 10) + yAddOn
        ) {
            handlePause();
        }

    //viz button
    //width - 60, height/2 + 100
    if (
        dist(mouseX, mouseY, width - 60, (height/2 + 100) + yAddOn) <= 10 / 2

    ) {
        handleVizMode();
    }

    //historgram switcher
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

    //treeMode
    //width - 80, y + 2 + yAddOn
    let minX = 323 - 5;
    let maxX = minX + 10;
    let minY = 531 - 5;
    let maxY = minY + 10;
    if (
        mouseX >= minX &&
        mouseX <= maxX &&
        mouseY >= minY &&
        mouseY <= maxY
    ) {
        // treeMode = !treeMode;
        // console.log('treeMode', treeMode);

        handleTreeMode();
    }

    //guys
    for (const [i, guy] of Object.entries(guys)) {
        if (dist(mouseX, mouseY, guy.pos.x, guy.pos.y) <= guy.size / 2) {
            if (treeMode) {
                treeGuy = treeGuy === null ?  guy : null;

                if (treeGuy) {
                    treeGuy.halo = 1;
                    console.log(`treeGuy: ${treeGuy.id}`);
                    console.log(treeGuy.parents);
                    console.log(treeGuy.children);
                }
                
            } else {
                guy.halo = !guy.halo;
            
                if (guy.halo) {
                    console.log(guy, guy.calculateSensePerim(), guy.isHungry(), guy.isHorny);
                    console.log(`sensePerim: ${guy.calculateSensePerim()}, hungry: ${guy.isHungry()}, horny: ${guy.isHorny}`);
                    console.log(`size: ${guy.size}, adultSize: ${guy.adultSize}, sexually mature: ${guy.isSexuallyMature()}`);
                }
            }
        }
    }

    if (paused) {
        redraw();
    }
}

function drawTree() {
    if (!treeGuy || !treeMode) return;
    drawHighLightMask();
    treeGuy.drawMe();
    let descendants = treeGuy.getDescendants();
    let ancestors = treeGuy.getAncestors();

    let i = 0;
    let arrowDirection;
    for (let direction of [descendants, ancestors]) {
        if (direction) {
            if (i === 0) {
                arrowDirection = 'away';
                stroke(c.guys.colors.horny);
            } else {
                arrowDirection = 'towards'
                stroke(c.guys.colors.gold);
            } i++;

            for (let [parentId, nodes] of Object.entries(direction)) {
                let originGuy = Guy.getGuyById(parentId);
                originGuy.drawMe();
                for (let node of nodes) {
                    let nodeGuy = Guy.getGuyById(node);
                    nodeGuy.drawMe();
                    line(originGuy.pos.x, originGuy.pos.y, nodeGuy.pos.x, nodeGuy.pos.y);
                    util.relationalArrow(nodeGuy.pos, originGuy.pos, dist(originGuy.pos.x, originGuy.pos.y, nodeGuy.pos.x, nodeGuy.pos.y) / 2, arrowDirection);
                }
            }
        }
        
    }
}

function drawHighLightMask() {
    push();
    noStroke();
    fill(0, 0, 0, 128);
    rect(11, 11, width - 22, height / 2 - 2, 26);
    pop();
}
async function updateWeather() {
    return await fetch(`${serverURL}weather/guys`)
        .then(r => r.json());
}

async function loadWeather() {
    loadIcons();
    const url = `${serverURL}weather/guys`;
    console.log(url);
    data = await updateWeather();

    console.log(data);
    c = new Config();
    c.generateOrbiterColors();

    viz  = new Visualization();
    console.log(viz.index);
    console.log(viz.experiment);

    vizValueDropdown = createSelect();
    vizDropdownWrap = createDiv('');
    vizDropdownWrap.id('vizDropdownWrap');
    vizValueDropdown.parent(vizDropdownWrap);

    vizValueDropdown.changed(() => {
            valueToViz = vizValueDropdown.value();
        });

    //let traits = c.guys.traits.value.sort((a, b) => a.localeCompare(b));
    traits = viz.traits.value.concat(viz.traits.binary).sort((a, b) => a.localeCompare(b));
    
    for (let traitLabel of traits) {
        vizValueDropdown.option(traitLabel);
    }

    vizDropdownWrap.hide();

    valueToViz = traits[0];

    numberOfGuys = debug && numberOfGuys ? numberOfGuys : Math.floor(data.temp);
    stats.guys = numberOfGuys;

    DIGESTION_RATE_PER_FRAME = Guy.getGlobalDigestionRate(); 

    forage = new Forage({
        maxX: config.bounds.x.max,
        maxY: config.bounds.y.max,
    });

    pt = new PhaseTransducer();

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

    stats.numberOfGuysHistory.push(stats.guys);

    viz.takeSnapshot(guys);

    for (const guy of guys) {
        guy.drawMe();
    }
}

function loadIcons() {
  iconsReady = false;

  const assets = [
    ['assets/Speaker_Icon.png', img => volumeIcon = img],
    ['assets/Mute_Icon.png', img => muteIcon = img],
  ];

  let remaining = assets.length;

  const done = () => {
    remaining--;
    if (remaining === 0) iconsReady = true;
  };

  for (let [src, assign] of assets) {
    loadImage(src, img => {
      assign(img);
      done();
    });
  }
}




function drawEnvironment() {
    push();
    strokeWeight(2);
    stroke(forage && forage.penaltyActive ? c.guys.colors.mars : '#cc99ff');
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
    
    if (forage && forage.penaltyActive) return;

    push();
    //the box is 380px wide
    stroke(0);
    strokeWeight(3);
    const linewidth = 300;
    line(linewidth, 10, width - linewidth, 10);
    line(linewidth, 10 + height / 2, width - linewidth, 10 + height / 2);
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
        text("GUYS: " + guys.filter(g => g.dead == 0).length, leftMargin, startingY + 20);
        text("FOOD: " + forage.foodStorage.length, leftMargin, startingY + 40);
        text(`CHOF: ${forage.chanceOfFood.toFixed(3)}`, leftMargin, startingY + 60);

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

function showViz() {
    let exceptions = ['avgActualLifeSpan'];
    push();
        stroke(c.guys.colors.horny);
        fill(0, 0, 0, 128);

        translate(10, 100);
        rect(0, 0, width-20, 100);

        vizDropdownWrap.position(12, 53);

        if (viz.traits.value.includes(valueToViz) && !exceptions.includes(valueToViz)) {
            drawMinMaxShape(valueToViz);

            stroke(c.guys.colors.hungryVar2);
            drawIndividualLine(valueToViz, 'mean');
            
            stroke(c.guys.colors.gold);
            drawIndividualLine(valueToViz, 'median');
        }

        if (viz.traits.binary.includes(valueToViz)) {
            drawBinaryLine(valueToViz);
        }
        
        if (valueToViz === 'preference') {
            drawPreferencePlot();
        }

        if (valueToViz == 'avgActualLifeSpan') {
            drawSingleLine(viz.experiment.samples.avgActualLifeSpan);
        }
        
    pop();
}

function drawPreferencePlot() {
    let halfWidth = 180;
    let barHeight = 100 / Object.values(viz.experiment.samples.preference).length;
    let startingY = 0;

    const prefs = Object.values(viz.experiment.samples.preference);
    const maxCount = Math.max(...prefs.map(p => p.count));

    textAlign(LEFT, BOTTOM);

    for (let trait of Object.values(viz.experiment.samples.preference)) { 
        let negativeWidth = map(trait.negative, 0, maxCount, 0, halfWidth);
        let positiveWidth = map(trait.positive, 0, maxCount, 0, halfWidth);

        let x = 200 - negativeWidth;
        let barWidth = negativeWidth + positiveWidth;

        stroke(c.guys.colors.horny);
        fill(c.guys.colors.hornyVar2)
        rect(x, startingY, barWidth, barHeight - 2);

        push();
        textSize(barHeight - (barHeight * 0.25));
        fill(c.guys.colors.hungryVar2);
        stroke('black');
        strokeWeight(2);
        text(trait.trait, x + 1, startingY + barHeight);
        pop();

        startingY += barHeight;
    }

    line(200, 0, 200, 100);
}

function drawSingleLine(values) {
    let minimum = Math.min(...values);
    let max = Math.max(...values);

    if (minimum === max) {
        return;
    }

    textSize(10);
    push();
        noStroke();
        fill(c.guys.colors.gold);
        textSize(16);
        text(max, 1, 16);
        text(minimum, 1, 99);
    pop();

    if (values.length > 2) {
        noFill();
        beginShape();
            for (let i = 0; i < values.length; i++) {
                let x = map(i, 0, values.length - 1, 0, width-20);
                let y = map(values[i], minimum, max, 100, 0);
                vertex(x, y);
            }
        endShape();
    }
}

function drawIndividualLine(trait, stat) {
    let minimum = Math.min(...viz.experiment.samples[trait].map(d => d['min']));
    let max = Math.max(...viz.experiment.samples[trait].map(d => d['max']));

    if (minimum === max) {
        return;
    }
    
    textSize(10);
    push();
        noStroke();
        fill(c.guys.colors.gold);
        textSize(16);
        text(viz.experiment.samples[trait][viz.experiment.samples[trait].length - 1].max, 1, 16);
        text(viz.experiment.samples[trait][viz.experiment.samples[trait].length - 1].min, 1, 99);
    pop();

    if (viz.experiment.samples[trait].length > 2) {
        noFill();
        beginShape();
            for (let i = 0; i < viz.experiment.samples[trait].length; i++) {
                let x = map(i, 0, viz.experiment.samples[trait].length - 1, 0, width-20);
                let y = map(viz.experiment.samples[trait][i][stat], minimum, max, 100, 0);
                vertex(x, y);
            }
        endShape();
    }
}

function drawMinMaxShape(trait) {
    let minimum = Math.min(...viz.experiment.samples[trait].map(d => d['min']));
    let max = Math.max(...viz.experiment.samples[trait].map(d => d['max']));

    if (minimum === max) {
        return;
    }

    if (viz.experiment.samples[trait].length > 2) {
        fill(c.guys.colors.hornyVar2);
        beginShape();
            for (let i = 0; i < viz.experiment.samples[trait].length; i++) {
                let x = map(i, 0, viz.experiment.samples[trait].length - 1, 0, width-20);
                let y = map(viz.experiment.samples[trait][i].max, minimum, max, 100, 0);
                vertex(x, y);
            }
            for (let i = viz.experiment.samples[trait].length - 1; i >= 0; i--) {
                let x = map(i, 0, viz.experiment.samples[trait].length - 1, 0, width-20);
                let y = map(viz.experiment.samples[trait][i].min, minimum, max, 100, 0);
                vertex(x, y);
            }
        endShape(CLOSE);
    }
}

function drawBinaryLine(trait) {
    const props = viz.experiment.samples[trait].map(d => d.true / (d.true + d.false));
    let minimum =  0; //Math.min(...props);
    let max = 1; //Math.max(...props);
    if (minimum === max) return;

    let h = 100;
    let w = width - 20;

    noStroke();
    fill(c.guys.colors.hornyVar2);
    rect(1, 1, w - 2, h - 2);

    fill(c.guys.colors.hungry);
    beginShape();
        vertex(1, 1);
        for (let i = 0; i < props.length; i++) {
            let x = map(i, 0, props.length - 1, 1, w - 1);
            let y = map(props[i], minimum, max, h - 1, 1);
            vertex(x, y);
        }
        vertex(w - 1, 1);
    endShape(CLOSE);
}

function drawControls() {
    yAddOn = 30;
    //mute
    if (iconsReady) {
        let  y = height/2 + 95;
        tint(255, 255, 255, 128);
        if (volumeOn) {
            image(volumeIcon, width - 30, (y - 5) + yAddOn, 20, 20);
        } else {
            image(muteIcon, width - 30, (y - 5) + yAddOn, 20, 20);
        }
        noTint();
    }

    //play / pause
    push();
        //translate(width - 45, height/2 + 30);
        stroke(c.guys.colors.hungry);
        fill(c.guys.colors.hungry);
        let  x = height/2 + 95;
        if (!paused) {
            translate(width - 45, x + yAddOn);
            fill(c.guys.colors.hungry);
            rect(0, 0, 2, 12);
            fill(c.guys.colors.hungry);
            rect(6, 0, 2, 12);
        } else {
            triangle(
                width - 45,          x + yAddOn,
                width - 45,          x + 10 + yAddOn,
                width - 35,          x + 5 + yAddOn,
            );
        }
        
    pop();

    //visualizer
    if (viz.experiment.samples['velLimit'].length > 0) {
        push();
        stroke(c.guys.colors.hungry);
        fill(c.guys.colors.hungry);
        circle(width - 60, (height/2 + 100) + yAddOn, 12);
        pop();
    }

    //tree mode
    push();
        let y = height/2 + 95;
        //image(treeIcon, width -85, (y) + yAddOn, 10, 10);
        fill(c.guys.colors.hungry);
        noStroke();
        translate(width - 80, y + 2 + yAddOn);
        circle(0, 0, 5);
        circle(-4, 8, 5);
        circle(4, 8, 5);

        if (treeMode) {
            stroke(c.guys.colors.hungryVar2);
            strokeWeight(1);
            line(0, 0, -4, 8);
            line(0, 0, 4, 8);
        }
    pop();
}

function drawGraphs() {
    
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
        fill(color);
        for (let i = 0; i < stats[graph].length; i++) {
          let x = map(i, 0, stats[graph].length - 1, 10, width - 10);
          let y = map(stats[graph][i], minY, maxY, yBottom, yTop, true);
          vertex(x, y);
        }
        vertex(width - 10, yBottom);
        vertex(10, yBottom);
        endShape(CLOSE);
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
    if (!guy.isHorny && forage.foodStorage.length == 0 && millis() - guy.lastPing > 20000) {
       return;
    }
    guy.lastPing = millis();
    const start = guy.size;
    //const end = guy.senseDistance * 2;
    //const end = guy.senseDistance;
    const end = guy.calculateSensePerim();
    const t = constrain((guy.pingSize - start) / (end - start), 0, 1);
    const alpha = Math.floor(255 * (1 - t));
    const hexAlpha = alpha.toString(16).padStart(2, '0');

    const colorStub = guy.carnivorous ? '#ff2200' : guy.isHorny ? '#ff3cd1' : '#339ccc'
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

function drawThresholdBars() {
    let startingX = 0;
    push();
        translate(10, 525);
        for (let th of Object.values(pt.thresholds)) {
            noFill();
            stroke(th.color);
            rect(startingX, 0, 40, 10);
            
            if (th.passed) {
                fill(th.color);
                rect(startingX, 0, 40, 10);
            }
            startingX += 45;
        }
        
    pop();
}