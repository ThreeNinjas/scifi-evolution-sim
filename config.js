class Config {
    constructor() {
        this.forage = {
            color: '#99cc33',
            colorVar2: '#99ccaa'
        };
        this.guys = {
            mutationRate: data.hum * 2,
            size: 10,
            colors: {
                dead: '#272a3aff',
                horny: '#ff3cd1ff',
                hornyVar2: '#ff3cd1aa',
                hornyVar3: '#f25ecfff',
                hungry: '#339cccaa',
                gold: '#ffaa00',
                orbiters: []
            },
            traits: {
                binary: [
                'movesAwayFromBaby',
                'overRideMove',
                'overRideMoveIntermittent',
                'resolute',
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
            ], special: [
                'preference',
                'preferenceDirection'
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
 * carnivore: when food is scarce and starvation is imminent, eat another guy (which will take you to full right away)
 * avoidDanger: if you sense a guy who is a carnivor or competitor killer, you run away
 * aposematic: make other guys think you will kill them so they avoid you
 * monogamous: once you mate with a guy, you stick with that guy and mate again when the chance arrives
 * moves away from baby trait
 * A way to visualize the current population, what traits are prevalent, a history of their prevalance, etc
 * a 'family tree' mode, where you click on a guy and it highlights its entire lineage.
 * 
 * to implement:
 * MAKE AMOUNT OF FOOD DEPENDANT UPON HOW MUCH ITS RAINED RECENTLY
 * when a guy dies with food in its stomach its body becomes food as it decays
 * a button to hide pinging
 * space bar for pause
 * maybe when paused and a guy is clicked, let it run for 1 frame so that the guy gets highlighted
 * if preference mutates, force a choice other than null. ie, add an override to the getPreference() function
 */