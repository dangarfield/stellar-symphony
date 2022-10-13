# Stellar Symphony

> Procedurally generated music based on data from 120000 stars

Listen here: [https://stellar-symphony.netlify.app](https://stellar-symphony.netlify.app)

![Stellar Symphony](https://i.ibb.co/VBzp3NV/ezgif-com-gif-maker-2.gif "Stellar Symphony")


## Why?

What do the stars sound like? Can we construct songs music purely referencing a single set of rules that we can apply to all star data that we have to create some patterns and music from them?

I'm Dan and this is what I've been working at achieving.


## Data
We know surprisingly little about the stars around, but we do have publicly available data for about 120000 stars in our galaxy.
Each of these stars are plotted in the star map with the differences in visible magnitude (how bright they are us) shown by bigger, brighter dots.

Imagine comparing the brightness of each star. That's pretty hard because there are so many and the brightness are are all pretty different.
One way would be to imagine the brightest star and the dullest star, now imagine creating a number of buckets or groups that you could put
the stars in, eg, a brightness of 1.5 might fit into the bucket 1 to 2.
In this experiment, I've created 24 buckets for each of the different pieces of indignation we have of the stars:

- Absolute magnitude (how bright the star really is)
- Relative magnitude (how bright the star appears from earth)
- Luminosity (the colour, closely representing the temperature of the star)
- etc

Once we have these buckets, we can start to group them for each constellation of stars. Some constellations may have more bright stars, or hotter stars.
Funnily enough, it starts to look like an musical EQ curve. We can also take the average of all stars and compare the constellations to those averages.
This is ultimately how I've created the rules the crate the music, by identifying differences between the constellations and making them into
rules to apply to create scales, chords, melodies and instruments for these pieces. All without my involvement out without me writing any music.

Data sources - Combination of the following catalogues - [HYG-Database](http://www.astronexus.com/hyg), Hipparcos, Yale Bright Stars Catalogue, Gliese catalog, Gaia DR2, [Stellarium Web](https://stellarium-web.org).


## Scale

We can plot the differences of absolute magnitude from the whole average star data.

If we look at one particular constellation (let's take Aquarius), we can see that I some case some of the buckets are bigger or smaller than the average.
This means that Aquarius has a few more 0.3 to 0.4 stars that the average of all data.

The are 12 potential notes in a scale (e.g., C, C#, D, D#, E, F, F#, G, G#, A, A#, B - all of the black and white keys on a piano).
Most (normal scales) have 7 notes, e.g., the major scale (the happy scale) is C, D, E, F, G, A, B.
Wouldn't it be cool if we could compare eachof the constellations so that it might point towards a different scale?

Well, let's look a look at the buckets of absolute magnitude differences in Aquarius.
Let's take the 6 most extreme values, eg biggest differences from the averages, it could be big or small. For each of these we count say that
if the difference was positive (Aquarius had more on average in this bucket), the it could be a black (e.g., D#).
If it was negative, it could be a white note (e.g., D). In fact, there are a few nuances to this, but this is what I've done.
I then compare this to the 20 typical scales that are used in western music. The closest match is the one scale that is used for everything in this constellation.
This gives each scale a audial difference. Some are happy (generally a major key, or had some major elements in it),
some are sad or moody (minor), or some are just plain strange (using scales that aren't typically used in our pop or rock music).

This is the frequency of scales and how many are used in all constellations.


## Chords

Most pop music is made from chords, and these chords are normally made from a root note as part of a triad.

What does that mean? Let's take C major (C, D, E, F, G, A, B). A triad is made of 3 notes, most typically 2 notes in the scale away from each other,
e.g. the first one is C, E, G (a C major chord). The second D, F, A (a D minor chord) etc etc.
As there 7 notes, there are 7 different starting points for each triad.

Fine, but how can we choose since chords from each constellation? In the same way we took the differences in absolute magnitude for
each conversion to produce the scale, why not use the relative magnitude to choose the chords?
Let's choose a range of 4 buckets to compare, grouping them off how they differ with the least different using the first triad C, and the most different using B.
Additionally, we can add some extra notes that add a little dramatic flavour if they are negative (add9, add11, add13).
Remember, these aren't always major chords, they use the scale that we have already selected.


## Melody

Each constellation had a number of main stars, typically illustrated by points if you draw the constellation. I wanted to use these main stars to play a melody.
In fact, I wanted 2 melodies.

There are 2 aspects, the rhythm or timing of the melody and the specific notes that are played.
The first melody uses the position of the main stars (relative to us here on earth) to select the notes from the scale and the distance away from the main star (alpha star) of the constellation for the timing.

You can see that we can divide a circle in 14 parts where each half contains the 7 notes of our scale. Looking at a long thin constellation,
using this method, it actually has lots of the same notes, that sounds quite interesting.

Also, the timing of the notes is based on the distance from the alpha star, as represented by the expanding purple circle.
Some constellations with only a few stars (5 or less) are repeated twice as often, just to fill the space a little more.

For the second melody, we do the opposite. The rhythm is made from the position of the main stars relative to the visual centre,
and the note is made from the distance of the star to the centre of the constellation.
We can see that some 'square' constellations appear to have consistent timing and also very similar notes.
This level of regularity or irregularity translates into audio differences.


## Instruments

I have cheated a little here. I was originally wanting to create soundscapes based on the actual frequencies off the known stars,
but very little of this data is available, and certainly not for the 100000 stars that I wanted.
Instead, I created a list of instruments, suitable for each party of the track and ordered them by soft to hard sound.
Looking at the luminosity buckets, I then ordered all constellations by these values and allocated the least frequently luminous
to the soft sounds and the most frequently luminous to the harder sounds.

All constellations have been recording properly in music software using the exact same samples: **Play full band**, however, you can change them
and play use the **Play with real time Instruments** to play with sampled instruments directly in the browser.

Credits
- All drums come from [ujam - Symphonic Elements](https://www.ujam.com/symphonic-elements/drums/)
- All other instruments come from [Spitfire Audio - Labs](https://labs.spitfireaudio.com/)


## Tempo

I was going to add tempo based on the average revolution speel of the stars, however, there is relatively little date known in the hyg
data sets for this, and also in order for me to be able to use real time instrument changes, the recorded notes (and drum samples)
were much easier to record at one single tempo, so all are at 80 bpm.


## Structure

Plotting the relative magnitude differences, we can see that there is a little shopping structure emerging.
I chose to use 9 to 15 to start sparsely, the gradually build up the instruments, have a small lull towards the end, the final crescendo.


## Star map

All 120000 stars are plotted and the view can be moved around, each time the focus changes of a constellation changes on the map,
the information panel is updated. Here, you can play the songs, or directly from the **play** icon at the bottom of the screen.