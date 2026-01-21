class Config {
    constructor() {
        this.forage = {
            color: '#99cc33',
        };
        this.guys = {
            mutationRate: data.hum,
            size: 10,
            colors: {
                dead: '#272a3aff',
                horny: '#ff3cd1ff',
                hungry: '#339cccaa',
                gold: '#ffaa00',
            },
            traits: {
                binary: [
                'overRideMove',
                'overRideMoveIntermittent',
                'resolute',
            ], value: [
                'size',
                'senseDistance',
                'digestionRate',
                'velLimit',
                'noiseRotate',
                'noiseMagnitude',
                'seekAccel',
            ]
            }
        };
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
 * monogamousX: once you mate with a guy, you stick with that guy and mate again when the chance arrives
 */