class Phase {
    constructor(phaseLength) {
        this.start = 0;
        this.phaseLength = phaseLength;
        this.active = false;
    }

    activate(callback) {
        if (!this.active) {
            this.active = true;
            this.start = getTimeIndex();
            if (callback) callback();
        }
    }

    deactivate(callback) {
        if (this.active) {
            this.active = false;
            this.start = null;
            if (callback) callback();
        }
    }

    hasFinished() {
        return this.active && (getTimeIndex() - this.start >= this.phaseLength);
    }
}