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
        this.mutationRateChangePeriod = new Phase(2);

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
        if (this.mutationRateChangePeriod.hasFinished()) {
            this.mutationRateChangePeriod.deactivate(() => {
                console.log('restoring mutation rate');
            mc.addToQueue('Mutation rate restored.');
            c.guys.mutationRate = c.guys.mutationRate * 2;
            util.playNoise(sounds.penaltyOffBeep);
            });
            
            return;
        }
        
        let courseOfAction = [
            () => this.raft(),
            () => this.mutationRateChange()
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
        if (globalSameCount >= 3) {
            random(courseOfAction)();
        }
    }

    raft() { 
        if (this.mutationRateChangePeriod.active) return;

        let newGuysCount = Math.round(guys.length - (guys.length * 0.75));
        
        for (let i = 0; i < newGuysCount; i++) {
            let newGuy = new Guy();
            newGuy.velLimit = viz.experiment.samples.velLimit[viz.experiment.samples.velLimit.length - 1].max * 1.5;
            newGuy.seekAccel = viz.experiment.samples.seekAccel[viz.experiment.samples.seekAccel.length - 1]. max * 1.5;
            newGuy.noiseMagnitude = Math.abs(viz.experiment.samples.noiseMagnitude[viz.experiment.samples.noiseMagnitude.length - 1].min / 1.5);
            newGuy.noiseRotate = Math.abs(viz.experiment.samples.noiseRotate[viz.experiment.samples.noiseRotate.length - 1].min / 1.5);
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
        console.log('raft event');
        mc.addToQueue(`${newGuysCount} strange new guys have arrived!!`, 'mutation');
        util.playNoise(sounds.raft);
        return;
    }

    mutationRateChange() {
        if (this.mutationRateChangePeriod.active) return;

        console.log('changing mutation rate');
        
        if (!this.mutationRateChangePeriod.active) {
            this.mutationRateChangePeriod.activate(() => {
                c.guys.mutationRate = constrain(c.guys.mutationRate / 2, (c.guys.traits.binary.length + c.guys.traits.value.length) * 5, data.hum * 3);
                mc.addToQueue(`Increased radiation is causing mutations.`, 'mutation');
                util.playNoise(sounds.penaltyOnBeep);
            });
        }
        
        return;
    }
}