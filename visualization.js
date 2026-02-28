class Visualization {
    constructor() {
        this.memoryLimit = 3;
        this.houseKeeping();

        this.indexName = "experiments:index";
        //this.index = JSON.parse(localStorage.getItem(this.indexName)) || this.createIndex();
        this.index = this.createIndex();
        this.index.currentId = this.uniqueID();
        this.experimentKey = `experiments:${this.index.currentId}`;
        this.traits = this.initTraits();
        if (!this.index.ids.includes(this.index.currentId)) {
            this.index.ids.push(this.index.currentId);
        }

        //this.save(this.index, this.indexName);

        this.experiment = this.createExperiment();
    }

    initTraits() {
        let traits = {};

        let extraBinary = [
            'armored',
            'carnivorous', 
            'isSexuallyMature',
            'runsFromPredators',
            
        ];

        let extraValue = [
            'age',
            'avgActualLifeSpan',
            'preference',
        ];
     
        traits = {
            binary: [...c.guys.traits.binary.concat(extraBinary)],
            value: [...c.guys.traits.value.concat(extraValue)],
        };

        return traits;
    }

    createIndex() {
        console.log('creating index');
        let index = {
            "ids": []
        };

        //this.save(index, this.indexName);
        return index;
    }

    uniqueID() {
        return Date.now().toString();
    }

    createExperiment() {
        let experiment = {
            id: this.index.currentId,
            samples: {},
            mutations: {},
            currentCumulativeLifeSpan: 0,
            currentDeathsCounted: 0,
        }

        for (let types of Object.keys(this.traits)) { 
            for (let traits of this.traits[types]) { 
                experiment.samples[traits] = [];
                experiment.mutations[traits] = [];
            }
        }

        this.save(experiment, this.experimentKey);
        
        return experiment;
    }

    save(data, fileName) {
        return;
        return localStorage.setItem(fileName, JSON.stringify(data));
    }

    takeSnapshot(guys) {
        if (guys.length === 0) return;
        
        let t = frameCount;

        let aliveGuys = guys.filter(g => g.dead === 0);

        for (let trait of this.traits.binary) {
            let truesies;
            let falsies;
            switch (trait) {
                case 'isSexuallyMature':
                    truesies = aliveGuys.filter(g => g.isSexuallyMature()).length;
                    falsies = aliveGuys.filter(g => !g.isSexuallyMature()).length;
                    break;
                default:
                    truesies = aliveGuys.filter(g => g[trait]).length;
                    falsies = aliveGuys.filter(g => !g[trait]).length;
                    break;
            }

            // if (this.experiment.samples[trait].length > 10000) {
            //     this.experiment.samples[trait].shift();
            // }
            this.experiment.samples[trait].push({
                t,
                true: truesies,
                false: falsies,
            });
        }

        for (let trait of this.traits.value) {
            if (trait === 'preference') continue;
            let values;

            // if (this.experiment.samples[trait].length > 10000) {
            //     this.experiment.samples[trait].shift();
            // }

            switch (trait) {
                case 'age':
                    values = aliveGuys.map(g => g.age());
                    break;
                case 'avgActualLifeSpan':
                    if (this.experiment.currentDeathsCounted > 0) {
                        this.experiment.samples[trait].push(this.experiment.currentCumulativeLifeSpan / this.experiment.currentDeathsCounted);
                    }
                    continue;
                default:
                    values = aliveGuys.map(g => g[trait]);
                    break;
            }
            
            this.experiment.samples[trait].push({
                t,
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

        //prefs
        this.experiment.samples.preference = {};
        for (let traitType of Object.keys(c.guys.traits)) {
            if (traitType == 'special') continue;

            for (let trait of c.guys.traits[traitType]) {
                let count = guys.filter(g => g.preference === trait).length;
                
                if (count > 0) {
                    this.experiment.samples.preference[trait] = {
                        trait,
                        count,
                        positive: guys.filter(g => g.preference === trait & g. preferenceDirection == 1).length,
                        negative: guys.filter(g => g.preference === trait & g. preferenceDirection == -1).length,
                        chosenThisTimeFrame: 0
                    };
                }
            }
        }

        this.save(this.experiment, this.experimentKey);
    }

    emptyStorage() {
        localStorage.clear();
    }

    houseKeeping() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length;
            }
        }

        if (total > this.memoryLimit * 1000000) {
            this.emptyStorage();
        }
    }

    show(trait) {
        valueToViz = trait;
        viewerOn = true;
        vizValueDropdown.value(valueToViz);
        vizDropdownWrap.show();
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