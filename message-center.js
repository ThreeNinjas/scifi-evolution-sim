class MessageCenter {
    constructor() {
        this.activeQueue = [];
        this.currentMessage = null;
        this.pastMessages = [];
        this.lastMessageRotation = 0;
        
        this.messageDuration = 25000;
        this.messageExpiresAt = this.messageDuration;
    }

    addToQueue(message, category='none') {
        const newMessage = {
            message,
            category,
        };

        if (this.activeQueue.length === 0) {
            this.messageExpiresAt = millis() + this.messageDuration;
            this.activeQueue.push(newMessage);
        } else {
            this.activeQueue.push(newMessage);
            this.activeQueue.shift(newMessage);
        }
        
    }

    manageQueue() {
        if (this.activeQueue.length > 0) {
            this.currentMessage = this.activeQueue[0];
            if (millis() >= this.messageExpiresAt) {
                this.pastMessages.push(this.activeQueue[0]);
                this.activeQueue.shift();
                this.lastMessageRotation = millis();
                this.messageExpiresAt = this.lastMessageRotation + this.messageDuration;
            }
        } else {
            this.currentMessage = null;
        }
    }

    mapCategoryToColor(category) {
        switch(category) {
            case 'weather':
                return c.guys.colors.moonlitViolet;
            case 'murder':
                return c.guys.colors.mars;
            case 'mating':
                return c.guys.colors.blue;
            case 'mutation':
                return c.guys.colors.radioactive;
            default:
                return c.guys.colors.gold;
        }
    }
}