class MessageCenter {
    constructor() {
        this.activeQueue = [];
        this.currentMessage = '';
        this.pastMessages = [];
        this.lastMessageRotation = 0;
    }

    addToQueue(message) {
        this.activeQueue.push(message);
    }

    manageQueue() {
        if (this.activeQueue.length > 0) {
            this.currentMessage = this.activeQueue[0];
            if (millis() - this.lastMessageRotation > 45000) {
                this.pastMessages.push(this.activeQueue[0]);
                this.activeQueue.shift();
                this.lastMessageRotation = millis();
            }
        } else {
            this.currentMessage = '';
        }
    }
}