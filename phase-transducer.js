/**
 * Keeps track of when certain thresholds have been passed and unlocks new behavior
 */

class PhaseTransducer {
    constructor() {
        this.thresholds = {
            populationBoom: {passed: false, color: c.guys.colors.horny},
            carnivore: {passed: false, color: c.guys.colors.mars},
            carnivoreOnCarnivore: {passed: false, color: c.guys.colors.gold},
            armored: {passed: false, color: c.guys.colors.blue},
            carnivoresExtinct: {passed: false, color: c.guys.colors.radioactive}
        };
        this.percentOfCarnivores = 0;
        this.maxPercentOfCarnivores = 0;
        this.orbiterLifeSpan = data.totalDryDays * 100;

        this.phases = {
            mutationRateChangePeriod: new Phase(20, {
                onActivate: () => {
                    c.guys.mutationRate = constrain(c.guys.mutationRate / 2, (c.guys.traits.binary.length + c.guys.traits.value.length) * 5, data.hum * 3);
                    mc.addToQueue(`Increased radiation is causing mutations.`, 'mutation');
                    util.playNoise(sounds.penaltyOnBeep);
                },
                onDeactivate: () => {
                console.log('restoring mutation rate');
                mc.addToQueue('Mutation rate restored.');
                c.guys.mutationRate = c.guys.mutationRate * 2;
                util.playNoise(sounds.penaltyOffBeep);
                }
            }),
            raftGuys: new Phase(50, {
                onActivate: () => {
                    this.raft();
                }
            }),
            windfallOfFood: new Phase(30, {
                onActivate: () => {
                    forage.populateMe(500)
                    mc.addToQueue('An unusual amount of food has been distributed.');
                }
            }),
        };

        this.raftCount = 0;
        this.raftColors = [
            '#14e718ff',
            '#14b2e7ff',
            '#f994afff',
            '#b1b1b1ff',
            '#984effff',
        ];
    }

    getCarnivorousThreshold() {
        return getTimeIndex() > data.totalRainfall * 10 && globalMaxGuys >= 100;
    }

    armored() {
        this.carnivory && this.maxPercentOfCarnivores > 50;
    }

    speciationThresholdReached(trait) {
        return guys.filter(g => g[trait]).length > guys.length * 0.2;
    }

    monitorMutationRate() {
        for (let phase of Object.values(this.phases)) {
            if (phase.active) {
                if (phase.hasFinished()) {
                    phase.deactivate();
                }
                return;
            }
        }
        // if (this.phases.mutationRateChangePeriod.active) {
        //     if (this.phases.mutationRateChangePeriod.hasFinished()) {
        //         this.phases.mutationRateChangePeriod.deactivate();
        //     }
        //     return;
        // }

        // if (this.phases.windfallOfFood.active) {
        //     if (this.phases.windfallOfFood.hasFinished()) {
        //         this.phases.windfallOfFood.deactivate();
        //     }
        // }

        // if (this.phases.raftGuys.active) {
        //     if (this.phases.raftGuys.hasFinished()) {
        //         this.phases.raftGuys.deactivate();
        //     }
        // }
        
        let courseOfAction = [
            () => this.raft(),
            () => this.mutationRateChange(),
            () => this.windfallOfFood(),
        ];
        let globalSameCount = 0;
        let sameTraits = [];
        for (let [trait, samples] of Object.entries(viz.experiment.samples)) {
            let sameCount = 0;
            if (c.guys.traits.value.includes(trait)) {
                for (let sample of Object.values(samples)) {
                    if (sample.min === sample.max) {
                        sameCount++;
                    } else {
                        sameCount = 0;
                    }
                }
                if (sameCount > 10) {
                    globalSameCount++;
                    sameTraits.push(trait);
                }
            }
            
        }
        if (globalSameCount >= 3 && guys.length < 100) {
            random(courseOfAction)();
        }
    }

    raft() { 
        if (this.phases.mutationRateChangePeriod.active) return;

        let newGuysCount = Math.round(guys.length > 3 ? Math.round(guys.length - (guys.length * 0.75)) : data.temp);
        
        for (let i = 0; i < newGuysCount; i++) {
            let newGuy = new Guy();
            let velLimit = constrain(viz.experiment.samples.velLimit[viz.experiment.samples.velLimit.length - 1].max * 1.5, 0, 10)
            let seekAccel = constrain(viz.experiment.samples.seekAccel[viz.experiment.samples.seekAccel.length - 1].max * 1.5, 0, 10);
            let noiseMagnitude = Math.abs(viz.experiment.samples.noiseMagnitude[viz.experiment.samples.noiseMagnitude.length - 1].min / 1.5);
            let noiseRotate = Math.abs(viz.experiment.samples.noiseRotate[viz.experiment.samples.noiseRotate.length - 1].min / 1.5);

            let overrides = {velLimit, seekAccel, noiseMagnitude, noiseRotate};

            for (let key in overrides) {
                let value = overrides[key];

                if (value != null && !Number.isNaN(value)) newGuy[key] = value;
            }
            
            newGuy.color = this.raftColors[this.raftCount];
            newGuy.adultSize = Math.round(random(11, 21));
            newGuy.size = Math.floor(newGuy.adultSize * 0.9);
            newGuy.birthday = getTimeIndex() - 3;
            newGuy.carnivorous = false;

            guys.push(newGuy);
            stats.guys++;
        }
        this.raftCount++;
        if (this.raftCount > this.raftColors.length - 1) this.raftCount = 0;

        mc.addToQueue(`${newGuysCount} strange new guys have arrived!!`, 'mutation');
        util.playNoise(sounds.raft);

        return;
    }

    mutationRateChange() {
        if (this.phases.mutationRateChangePeriod.active) return;
        if (guys.length > 100) return;

        console.log('changing mutation rate');
        
        if (!this.phases.mutationRateChangePeriod.active) {
            this.phases.mutationRateChangePeriod.activate();
        }
        
        return;
    }

    windfallOfFood() {
        if (this.phases.windfallOfFood.active && forage.foodStorage.length > 100) return;
        this.phases.windfallOfFood.activate();
        
    }
}