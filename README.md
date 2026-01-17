NOTE: this repo is dependent upon a weather API for its initial conditions. That API is not ready to be made public but you can fake by creating an object called data that looks like this:

{
    clouds: 96,
    hum:  88.55,
    pres:  30.33,
    rain:  0,
    temp:  50.79,
    vis:  9.9
}

This project is a simple evolution simulator. On load it creates an array of what I've called guys (You see, I am quirky and fun. Not to mention given to whimsy.) with various traits that vary from guy to guy. The real world weather in a specific location is what determines things like the number of guys created, how much food will be available, how fast the guys can move, how far they'll be able to see, and so on.

These are just dots on a screen. But take some time to sit and watch them interact with their world and with each other. Let them draw you in! If you've ever sat down in front of an aquarium, or a container of sea monkeys, or a garden full of little bugs, and looked up and realized half an hour had passed without your noticing, you will recognize the feeling.

Perhaps my favorite thing about this is that I occasionally see a guy doing a behavior that I can't explain. I programmed this thing! I wrote the functions that determine what they can and cannot do! Yet I still find myself going "HOLY MOLY YOU SHOULDN'T BE ABLE TO DO THAT!!" That is the joy of writing simulations, I guess.

Two notes!

1. This project is built using the P5.js library. To me P5 is more like a musical instrument or a paintbrush than a javascript library, and I've passed many happy hours building things with it. Learn more about P5 and its java ancestor, Processing, at the [P5.js website](https://p5js.org) and at the [website](https://thecodingtrain.com/) / [YouTube channel](https://www.youtube.com/@TheCodingTrain) of Daniel Shiffman, P5's most charismatic ambassador.

2. I built this to fit inside a larger dashboard that I'm constantly working on. The current iteration is built to look like an LCARS interface on the USS Enterprise, and this simulation is designed to fit into a nice little nook in that dashboard. Hence the compact shape, and yellow gridlines.