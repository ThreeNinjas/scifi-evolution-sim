/**
 * Keeps track of when certain thresholds have been passed and unlocks new behavior
 */

class PhaseTransducer {
    constructor() {
        this.carnivorous = false;
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
}