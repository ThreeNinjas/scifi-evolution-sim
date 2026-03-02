class Physics {
    static enforceLawsOfPhyics(guy) {
        if (!guy.mate) {
            /**
             * Just so you remember how this works lol
                1 / 5 ^ 3 = 0.008
                5 / 5 ^ 3 = 1
                6 / 5 ^ 3 = 1.728
             */
            Physics.extractDigestivePenalty(guy, Math.pow(guy.vel.mag() / viz.experiment.samples.velLimit[0].max, 3) * 0.001);
        }

        if (guy.armored) {
            Physics.extractDigestivePenalty(guy, 0.000225)
        }
    }

    static extractDigestivePenalty(guy, penalty) {
        guy.stomachContents -= penalty;
        guy.stomachContents = Math.max(0, guy.stomachContents);
    }
}