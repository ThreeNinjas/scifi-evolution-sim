class Phase {
    static instances = [];
    /**
     * 
     * @param {number} phaseLength - how long the phase should last once activated, measured in TimeIndex units
     * @param {object} - two callback functions that run when the phase is activated or deactivated
     * @param {callback} shouldBeActive - function that determines criteria for activating the phase
     */
    constructor(phaseLength, { onActivate = null, onDeactivate = null } = {}, shouldBeActive = null) {
        Phase.instances.push(this);
        this.start = 0;
        this.phaseLength = phaseLength;
        this.active = false;
        this.onActivate = onActivate;
        this.onDeactivate = onDeactivate

        this.shouldBeActive = shouldBeActive;
    }

    activate() {
        if (!this.active) {
            this.active = true;
            this.start = getTimeIndex();
            if (this.onActivate) this.onActivate();
        }
    }

    deactivate() {
        if (this.active) {
            this.active = false;
            this.start = null;
            if (this.onDeactivate) this.onDeactivate();
        }
    }

    monitor() {
        if (this.shouldBeActive) {
            if (this.shouldBeActive()) {
                this.activate();
            } else {
                this.deactivate();
                return;
            }
        }
        if (this.hasFinished()) {
            this.deactivate();
        }
    }

    hasFinished() {
        return this.active && (getTimeIndex() - this.start >= this.phaseLength);
    }
}