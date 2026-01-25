class Config {
    constructor() {
        this.forage = {
            color: '#99cc33',
            colorVar2: '#99ccaa'
        };
        this.guys = {
            mutationRate: data.hum,
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
            ]
            }
        };
        for (let value of this.guys.traits.value) {
            this.guys.colors.orbiters.push(util.randomColor());
        }
    }

    getOrbiterColor(trait) {
        return this.guys.colors.orbiters[this.guys.traits.value.indexOf(trait)];
    }
}

/**
 * some traits I want to add:
 * resolute: once it chooses a food or mate target it does not change until it eats / mates, or target is invalidated
 * killsCompetitors: if a guy has chosen a mate and it isn't mutual, but its target mate has other potential mates, it kills is competitors
 * selfDefense: cannot be killed by by a killsCompetitors guy
 * selfDefensePlus: kills the killer first
 * wander: if there's no food or mates within sensor range it picks a spot far away to look for stuff there
 * carnivore: when food is scarce and starvation is imminent, eat another guy (which will take you to full right away)
 * avoidDanger: if you sense a guy who is a carnivor or competitor killer, you run away
 * aposematic: make other guys think you will kill them so they avoid you
 * monogamous: once you mate with a guy, you stick with that guy and mate again when the chance arrives
 * preference: pick a preference from the list of heritable traits
 * preferenceDirection: more of that trait or less
 * 
 * to implement:
 * when a guy dies with food in its stomach its body becomes food as it decays
 */

 /**
 * How growth will work:
 * Each guy will have a growth rate that will function like the other rates, ie digestion.
 * At birth it will be 3px
 * Each time growthProgress reaches 1, if/when its stomach is full, its size will increase by growthRate
 * When size == adultSize - (adultSize * 0.10) it is sexually mature
 * But will continue to grow until it reaches adultSize
 * 
 * New traits to implement:
 * growthRate - x
 * adultSize - x
 * growthProgress - x
 * isSexuallyMature() - x
 * 
 */