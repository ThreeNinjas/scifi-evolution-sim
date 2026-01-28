class Visualization {
    constructor() {
        this.indexName = "experiments:index";
        this.index = JSON.parse(localStorage.getItem(this.indexName)) || this.createIndex();
        this.index.currentId = this.uniqueID();
        this.experimentKey = `experiments:${this.index.currentId}`;
        
        if (!this.index.ids.includes(this.index.currentId)) {
            this.index.ids.push(this.index.currentId);
        }

        this.save(this.index, this.indexName);

        this.experiment = this.createExperiment();
    }

    createIndex() {
        console.log('creating index');
        let index = {
            "ids": []
        };

        this.save(index, this.indexName);
        return index;
    }

    uniqueID() {
        return Date.now().toString();
    }

    createExperiment() {
        let experiment = {
            id: this.index.currentId,
            samples: {}
        }

        for (let types of Object.keys(c.guys.traits)) { 
            for (let traits of c.guys.traits[types]) { 
                experiment.samples[traits] = [];
            }
        }

        this.save(experiment, this.experimentKey);
        
        return experiment;
    }

    save(data, fileName) {
        return localStorage.setItem(fileName, JSON.stringify(data));
    }

    takeSnapshot(guys) {
        let t = frameCount;

        for (let trait of c.guys.traits.binary) {
            this.experiment.samples[trait].push({
                t,
                true: guys.filter(g => g[trait]).length,
                false: guys.filter(g => !g[trait]).length,
            });
        }

        for (let trait of c.guys.traits.value) {
            let values = guys.map(g => g[trait]);
            this.experiment.samples[trait].push({
                max: Math.max(...values),
                min: Math.min(...values),
                mean: util.calculateMean(values),
                median: util.calculateMedian(values),
                percentiles: {
                    ten: util.calculatePercentiles(values, 10),
                    fifty: util.calculatePercentiles(values, 50),
                    ninety: util.calculatePercentiles(values, 90),
                },
                std_dev: util.calculateStdDev(values)
            });
        }
        this.save(this.experiment, this.experimentKey);
    }

    emptyStorage() {
        localStorage.clear();
    }
}

// {
//   "currentId": "1706408123456",
//   "ids": [
//     "1706408123456",
//     "1706320000000",
//     "1706200000000"
//   ]
// }

// {
//   "id": "1706408123456",
//   "startedAt": 1706408123456,
//   "samples": [
//     { "t": 0,   "population": 42 },
//     { "t": 10,  "population": 47 },
//     { "t": 20,  "population": 39 }
//   ]
// }