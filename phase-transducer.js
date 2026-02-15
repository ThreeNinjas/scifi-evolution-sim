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
}