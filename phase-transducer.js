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
        this.mutationRateHalvedAt = null;
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
        if (getTimeIndex() > this.mutationRateHalvedAt + 500) {
            console.log('restoring mutation rate');
            mc.addToQueue('Mutation rate restored.');
            c.guys.mutationRate = c.guys.mutationRate * 2;
            this.mutationRateHalvedAt = null
        }
        //some guys have rafted in
        //mutation rate is lowered
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
            c.guys.mutationRate = c.guys.mutationRate / 2;
            random(courseOfAction)();
        }
    }

    raft() { 
        let newGuysCount = guys.length - (guys.length * 0.25);
        for (let i = 0; i < newGuysCount; i++) {
            let newGuy = new Guy();
            newGuy.velLimit = viz.experiment.samples.velLimit[viz.experiment.samples.velLimit.length - 1].max * 1.5;
            newGuy.color = '#14e718ff'
            newGuy.adultSize = 13;

            guys.push(newGuy);
            stats.guys++;
        }
        console.log('raft event');
        mc.addToQueue(`${newGuysCount} strange new guys have arrived!!`, 'mutation');
        return;
    }

    mutationRateChange() {
        console.log('changing mutation rate');
        c.guys.mutationRate = constrain(c.guys.mutationRate / 2, (c.guys.traits.binary.length + c.guys.traits.value.length) * 5, data.hum * 3);
        this.mutationRateHalvedAt = getTimeIndex();
        mc.addToQueue(`Increased radiation is causing mutations.`, 'mutation');
        return;
    }
}