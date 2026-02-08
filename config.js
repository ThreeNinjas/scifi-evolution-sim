class Config {
    constructor() {
        this.forage = {
            color: '#99cc33',
            colorVar2: '#99ccaa'
        };
        this.guys = {
            mutationRate: data.hum * 3,
            size: 10,
            colors: {
                dead: '#272a3aff',
                horny: '#ff3cd1ff',
                hornyVar2: '#ff3cd1aa',
                hornyVar3: '#f25ecfff',
                hungry: '#339cccaa',
                hungryVar2: '#339cccff',
                gold: '#ffaa00',
                mars: '#ff2200',
                radioactive: '#88ffff',
                orbiters: []
            },
            traits: {
                binary: [
                'armored',
                'movesAwayFromBaby',
                'overRideMove',
                'overRideMoveIntermittent',
                'resolute',
                'runsFromPredators',
                'smartFoodFinder',
            ], value: [
                'adultSize',
                'digestionRate',
                'growthRate',
                'noiseMagnitude',
                'noiseRotate',
                'senseDistanceMultiplier',
                'seekAccel',
                'velLimit',
                'lifeSpan',
                'childrenAllowed',
                'reactionTime',
            ], special: [
                'preference',
                'preferenceDirection',
            ]
            }
        };
        this.bounds = {
            x: {
                min: 10,
                max: width - 10,
            },
            y: {
                min: 10,
                max: height / 2,
            }
        };
        this.corners = [
            createVector(this.bounds.x.min, this.bounds.y.min),
            createVector(this.bounds.x.max, this.bounds.y.min),
            createVector(this.bounds.x.max, this.bounds.y.max),
            createVector(this.bounds.x.min, this.bounds.y.max)
        ];
    }

    generateOrbiterColors() {
        for (let value of this.guys.traits.value) {
            this.guys.colors.orbiters.push(util.randomColor());
        }
        return true;
    }

    getOrbiterColor(trait) {
        return this.guys.colors.orbiters[this.guys.traits.value.indexOf(trait)];
    }
}

/**
 * some traits I want to add:
 * killsCompetitors: if a guy has chosen a mate and it isn't mutual, but its target mate has other potential mates, it kills is competitors
 * selfDefense: cannot be killed by by a killsCompetitors guy
 * selfDefensePlus: kills the killer first
 * wander: if there's no food or mates within sensor range it picks a spot far away to look for stuff there
 * avoidDanger: if you sense a guy who is a carnivor or competitor killer, you run away
 * aposematic: make other guys think you will kill them so they avoid you
 * monogamous: once you mate with a guy, you stick with that guy and mate again when the chance arrives

 * 
 * a 'family tree' mode, where you click on a guy and it highlights its entire lineage.
 * option to use Perlin noise instead of randomly incrementing x and y
 * 
 * 
 * viz to track:
 * avg actual lifespan

 * avg age
 * # who are sexually mature
 * # who are dead
 * death date

 * 
 * features to implement:
 * a button to hide pinging
 * space bar for pause

 * if preference mutates, force a choice other than null. ie, add an override to the getPreference() function
 */


 /**
  * SOmething to consider: a standalone p5 sketch whose sole job is to display the data compiled by this sketch's visualizer.
  * 
  * 
  * 

--->  give orbiters an expiration date
armor needs a cost
add a clear all halos button
Put a limit on number of orbiters, or make them more rare.
When guys are big, food moves to them...I can draw lines or something instead of animating forage
Tails for binary mutations 
Guys that aren't full killers, they take a nip off random guys
Mutation viewer. Select a guy, highlight everyone with his same orbiters, hide everyone else.
Avoid incest lol
Highlight distal ends of tree mode

Omnivore. He eats guys when he's near starvation and can't find forage.
For someday: allopatric speciation, somehow

Add max and min to lifespan viz
Indicate arrival of carnivory on these viz graphs: age, lifespan, sexual maturity....maybe all of them?
Actual offspring count stats
Different shades of gold for parent A and B lines
Text overlay on board that show stats for currently selected guy. Id, age, time left, parents, children... Etc?
Cause of death viz? Old age, starvation, murder, kids...doa
Bug: dead carnivores are pinging

Bug: how does digestion progress reach 11??

In some way mark when the last of the original cohort dies.... Maybe a generation tracker or something. 
In tree mode, show what % of the population is in the current tree
Try to find a way to identify the source of mutations, like a Genghis Khan effect
Bug: how can you have negative stomach contents??
Herding behavior in herbivores
Add fw puffers and stingrays to inat monitor
Have some sort of threshold system: once a certain threshold is reached (population or something) a new thing (food can move or something) gets 'unlocked'


Message center


x When the carnivores are the majority, evolve guys with defenses
x No arrow if target is 0,0
x Adjust ping mills
x Carnivore noise
x Penalty time noise
x Reaction time. They don't notice food immediately
x moves away from baby trait
x maybe when paused and a guy is clicked, let it run for 1 frame so that the guy gets highlighted
x MAKE AMOUNT OF FOOD DEPENDANT UPON HOW MUCH ITS RAINED RECENTLY
x when a guy dies with food in its stomach its body becomes food as it decays
x PREFERENCES
x make viz only consider alive guys
x A way to visualize the current population, what traits are prevalent, a history of their prevalance, etc
x carnivore: when food is scarce and starvation is imminent, eat another guy (which will take you to full right away)
x pass on the mantle of treeGuy to a descendant
x Find whatever is still auto haloing
x When highlighting a guy or tree of guys, draw the guys, then cover the board with a translucent rectangle, then draw the highlighted guys again. Make them brighter than 
everyone else so they stand out better.
x Have the threshold for carnivory be 1 in (max population - current population). Closer it gets the more likely carnivory is
x Bug: carnivores get stuck in some kind of limbo
x Bug: doesn't refresh when it gets to 1 guy...
x Or 0 guys! Wtf!
x Work out treemode / highlight kinks
x Bug: turning off tree mode doesn't get rid of the translucent mask?
x Add armored to stats
x Enforce armored != carnivorous
x Actual lifespan stuff should be in viz.experiments
x Add carnivorous / armored to halo text
x Guy that runs away from carnies
*/