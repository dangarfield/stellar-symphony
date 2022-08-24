import { ScaleType, Note, Interval } from '@tonaljs/tonal'
import Midi from '@tonejs/midi'
import fs from 'fs-extra'
import {join} from 'path'

import _ from 'lodash'

const sortingOrder = [
  // Don't actually use boosts, keep them here until I decided to get rid of it
  {name: 'major', boost: 2},
  {name: 'lydian', boost: 2},
  {name: 'mixolydian', boost: 2},
  {name: 'phrygian', boost: 2},
  {name: 'dorian', boost: 2},
  {name: 'locrian', boost: 2},
  {name: 'aeolian', boost: 2},

  {name: 'lydian dominant', boost: 1},
  {name: 'lydian augmented', boost: 1},
  {name: 'lydian minor', boost: 1},
  {name: 'lydian #9', boost: 1},
  {name: 'phrygian dominant', boost: 1},
  {name: 'dorian b2', boost: 1},
  {name: 'mixolydian b6', boost: 1},
  {name: 'major augmented', boost: 1},

  {name: 'flamenco', boost: 0},
  {name: 'neopolitan major', boost: 0},
  {name: 'harmonic major', boost: 0},
  {name: 'locrian major', boost: 0},
  {name: 'leading whole tone', boost: 0},
  // {name: 'double harmonic lydian', boost: 0},
  {name: 'harmonic minor', boost: 0},
  {name: 'altered', boost: 0},
  {name: 'locrian #2', boost: 0},
  {name: 'melodic minor', boost: 0},
  // {name: 'ultralocrian', boost: 0},
  // {name: 'locrian 6', boost: 0},
  {name: 'augmented heptatonic', boost: 0},
  {name: 'dorian #4', boost: 0},
  {name: 'lydian diminished', boost: 0},
  {name: 'balinese', boost: 0},
  {name: 'double harmonic major', boost: 0},
  {name: 'hungarian minor', boost: 0},
  {name: 'hungarian major', boost: 0}
  // {name: 'oriental', boost: 0}
  // {name: 'todi raga', boost: 0},
  // {name: 'persian', boost: 0},
  // {name: 'enigmatic', boost: 0}
]
const sortingOrderFlat = sortingOrder.map(s => s.name)
sortingOrderFlat.reverse()

const allScales = ScaleType.all().filter(s => s.intervals.length === 7 && sortingOrderFlat.includes(s.name))

// let up = [0, 0, 0, 0, 0, 0]
// let down = [0, 0, 0, 0, 0, 0]

export const getScale = (bucketValues) => {
  let scale = [...bucketValues]
  scale.sort((a, b) => Math.abs(b) - Math.abs(a))
  // console.log('scale.length', scale.length, scale.slice(1, 7))

  const offset = 2 // Add offset to that it's more balanced
  scale = scale.slice(0 + offset, 6 + offset).map(v => v > 0)
  // Use chroma. for the 6 pairs, set 2 or b2 etc for all, then use chroma to find a found scale, removing one note as required until a match

  // const c = [0, 0, 0, 0, 0, 0]
  // for (let i = 0; i < scale.length; i++) {
  //   scale[i] ? up[i]++ : down[i]++
  //   c[i] = Math.round(100 '(down[i] / (up[i] + down[i])))
  // }

  // scale[2] ? totalMajor++ : totalMinor++
  // console.log('potential scale', scale, 'up', up, 'down', down, 'c', c)

  const chromaString = new Array(12).fill(0)
  chromaString[0] = 1

  for (let i = 0; i < scale.length; i++) {
    const noteValue = scale[i]
    if (i === 0 || i === 1) {
      chromaString[(i + 1) * 2 - (noteValue ? 0 : 1)] = 1
    } else if (i === 4 || i === 5) {
      chromaString[((i + 1) * 2) - 1 - (noteValue ? 0 : 1)] = 1
    } else if (i === 2 || i === 3) {
      chromaString[i + 4 - (noteValue ? 0 : 1)] = 1
    }
  }
  const chroma = chromaString.join('')
  // Filter the scale list

  for (const potentialScale of allScales) {
    const distance = chromaDifference(chroma, potentialScale.chroma)
    potentialScale.distance = distance
    potentialScale.boost = sortingOrder.find(s => s.name === potentialScale.name).boost
  }
  // allScales.sort((a, b) => a.distance - b.distance)

  allScales.sort((a, b) => {
    // function findFirstDiffPos (a, b) {
    //   if (a.length < b.length)[a, b] = [b, a]
    //   return [...a].findIndex((chr, i) => chr !== b[i])
    // }
    // return a.distance - b.distance || findFirstDiffPos(b.chroma.split(''), chroma) - findFirstDiffPos(a.chroma.split(''), chroma)

    return a.distance - b.distance || sortingOrderFlat.indexOf(b.name) - sortingOrderFlat.indexOf(a.name)
    // return (a.distance - a.boost) - (b.distance - b.boost) ||
    // sortingOrderFlat.indexOf(b.name) - sortingOrderFlat.indexOf(a.name) ||
    // findFirstDiffPos(b.chroma.split(''), chroma) - findFirstDiffPos(a.chroma.split(''), chroma)
  })

  // console.log('allScales', chroma, allScales.map(s => `${chroma} : ${s.chroma} - ${s.distance}-${s.boost}= ${s.distance - s.boost} - ${s.name}`))
  // const allScales = ScaleType.all().filter(s => s.intervals.length === 7)
  // console.log('allScales', ScaleType.all().filter(s => s.intervals.length === 7).map(s => s.name))
  // const scaleFound = allScales[0]
  // console.log('scaleFound', scaleFound)
  return allScales[0]
}

export const toRomanNumeral = (i) => {
  if (i === 1) {
    return 'I'
  } else if (i === 2) {
    return 'II'
  } else if (i === 3) {
    return 'III'
  } else if (i === 4) {
    return 'IV'
  } else if (i === 5) {
    return 'V'
  } else if (i === 6) {
    return 'VI'
  } else if (i === 7) {
    return 'VII'
  }
  return i
}
export const getChords = (bucketValues, bucketPositions, max, scale) => {
  const maxIntervals = 7
  const chords = []
  for (const bucketPosition of bucketPositions) {
    const value = bucketValues[bucketPosition]
    const interval = 1 + adjustBucketValue(value, max, maxIntervals - 1)
    // console.log('chords value', bucketPosition, value, interval)
    let decorationValue = parseInt(value.toFixed(5).replace(/\D/g, ''))
    let decoration = false
    if (decorationValue % 6 === 0) {
      decoration = 13
    } else if (decorationValue % 4 === 0) {
      decoration = 11
    } else if (decorationValue % 2 === 0) {
      decoration = 9
    }
    // console.log('decorationValue', decorationValue, decorationValue % 2 === 0, decorationValue % 4 === 0, decorationValue % 6 === 0, '->', decoration)
    const chord = getTriad(scale, interval, decoration)
    const chordObj = {
      interval,
      chord,
      notes: getNotesForChordSemitones(chord)
    }
    if (decoration) {
      chordObj.decoration = decoration
    }

    // console.log('chord', chordObj)
    chords.push(chordObj)
  }
  return chords
}
const adjustBucketValue = (value, max, total) => {
  return Math.min(Math.abs(Math.round((value / max) * total)), total)
}

const getTriad = (scale, interval, decoration) => {
  const scaleChromaArray = scale.chroma.split('')
  const tripleOctave = [...scaleChromaArray].concat(scaleChromaArray, scaleChromaArray).map((v, i) => ({
    v: v,
    i: i
  }))
  const tripleOctaveFiltered = tripleOctave.filter(v => v.v === '1')
  // console.log('tripleOctave', tripleOctave, tripleOctaveFiltered)

  const intervalNotes = [interval + 1 - 1, interval + 3 - 1, interval + 5 - 1]

  const notesForChord = intervalNotes.map(v => tripleOctaveFiltered[v - 1])
  // console.log('notesForChord', intervalNotes, notesForChord, scale.chroma)
  if (decoration && decoration > 0) {
    notesForChord.push(tripleOctaveFiltered[interval + decoration - 1 - 1])
  }
  return notesForChord.map(v => v.i)
}
const getNotesForChordSemitones = (chord) => {
  return chord.map(v => Note.transpose('C4', Interval.fromSemitones(v)))
}
const chromaDifference = (a, b) => {
  const as = a.split('')
  const bs = b.split('')
  let diff = 0
  for (let i = 0; i < as.length; i++) {
    if (as[i] !== bs[i]) {
      diff++
    }
  }
  return diff
}
export const getMelodyWithTimingByDistance = (stars, scale, distanceAttribute, angleAttribute) => {
  const melodyStars = stars// .filter(s => s.bayer !== '')
  melodyStars.sort((a, b) => a[distanceAttribute] - b[distanceAttribute])
  // melodyStars.sort((a, b) => a.distanceFromCentre - b.distanceFromCentre) // Could also use distanceFromCentre

  // 15 notes -> 4 bars, across total 32 half notes
  // 7 notes -> 2 bars, acrodd total 16 half notes
  // 3 notes -> 2 bars, across total 16 half notes
  const totalBars = melodyStars.length >= 7 ? 4 : 2
  const totalNoteCount = (8 * totalBars) - 1
  const timeFactor = melodyStars[melodyStars.length - 1][distanceAttribute] / totalNoteCount
  // const timeFactor = melodyStars[melodyStars.length - 1].distanceFromCentre / totalNoteCount

  const scaleNotes = scale.intervals.map(Note.transposeFrom('C')).map(v => (v) + '5')

  // console.log('scaleNotes', scaleNotes,
  //   distanceAttribute, melodyStars[0][distanceAttribute],
  //   angleAttribute, melodyStars[0][angleAttribute],
  //   melodyStars[0].alpha
  // )
  const melody = melodyStars.map((s, i) => {
    const noteCount = Math.round(s[distanceAttribute] / timeFactor)
    const note = scaleNotes[Math.floor((s[angleAttribute] % 180) / (180 / 7))]
    return {
      noteCount: noteCount,
      note: note, // scaleNotes[i % scaleNotes.length],
      time: `${Math.floor(noteCount / 8)}:${Math.floor(noteCount / 2) % 4}:${noteCount % 2 === 1 ? 2 : 0}`,
      duration: '4n', // Todo lengths
      starHip: s.hip
    }
  }) // TODO - fill out any notes played at the same time?
  melody[0].melodyTimingByDistance = true
  melody[0].totalBars = totalBars
  // console.log('melody stars', melodyStars, '-', totalBars, totalNoteCount, timeFactor, '-', melody)
  return melody
}
// Melody 2 Timing = angle from centre
// Melody 2 Notes = distance from centre
export const getMelodyWithTimingByAngle = (stars, scale, distanceAttribute, angleAttribute) => {
  const melodyStars = stars// .filter(s => s.bayer !== '')
  melodyStars.sort((a, b) => a[angleAttribute] - b[angleAttribute])

  const totalBars = melodyStars.length >= 7 ? 4 : 2
  const totalNoteCount = (8 * totalBars) - 1
  const timeFactor = 360 / totalNoteCount

  // console.log('melody2 timefactor', totalNoteCount, timeFactor)

  const scaleNotes = scale.intervals.map(Note.transposeFrom('C')).map(v => (v) + '5')
  scaleNotes.push('C5')
  const maxDistance = _.maxBy(melodyStars, distanceAttribute)[distanceAttribute]

  const melody = melodyStars.map((s, i) => {
    const noteCount = Math.round(s[angleAttribute] / timeFactor)
    // const note = scaleNotes[Math.floor((s[angleAttribute]%180)/(180/7))]
    const note = scaleNotes[Math.floor((s[distanceAttribute] / maxDistance) * (scaleNotes.length - 1))]

    // console.log('star', s.bayer, s.proper, '-', s[angleAttribute], noteCount, '-', scaleNotes, s[distanceAttribute], s[distanceAttribute]/maxDistance, (s[distanceAttribute]/maxDistance) '(scaleNotes.length-1), note)
    return {
      noteCount: noteCount,
      note: note, // scaleNotes[i % scaleNotes.length],
      time: `${Math.floor(noteCount / 8)}:${Math.floor(noteCount / 2) % 4}:${noteCount % 2 === 1 ? 2 : 0}`,
      duration: '4n', // Todo lengths
      starHip: s.hip
    }
  })
  const hiddenFirstNote = {
    noteCount: 0,
    note: 'C0',
    time: '0:0:0',
    duration: '4n',
    ignore: true,
    melodyTimingByAngle: true,
    totalBars: totalBars
  }
  melody.unshift(hiddenFirstNote)
  return melody
}

const noteToMidi = (lengthBarSec, lengthBeatSec, lengthSubDSec, chordNotesFlat) => {
  return chordNotesFlat.map(n => {
    let bars = 0
    let beats = 0
    let subdivisions = 0
    const timeSplit = n.time.split(':')
    if (timeSplit.length > 0) bars = parseInt(timeSplit[0])
    if (timeSplit.length > 1) beats = parseInt(timeSplit[1])
    if (timeSplit.length > 2) subdivisions = parseInt(timeSplit[2])
    // const durationSplit = n.duration.split('')
    // const durationCount = parseInt(durationSplit[0])
    // let durationOneLength = lengthBeatSec
    let duration = lengthBeatSec
    switch (n.duration) {
      case '1n':
        duration = 4 * lengthBeatSec
        break
      case '2n':
        duration = 2 * lengthBeatSec
        break
      case '4n':
        duration = 1 * lengthBeatSec
        break
      case '8n':
        duration = 0.5 * lengthBeatSec
        break
      case '16n':
        duration = 0.25 * lengthBeatSec
        break
      case '1m':
        duration = 1 * lengthBarSec
        break
      case '2m':
        duration = 2 * lengthBarSec
        break
      case '3m':
        duration = 3 * lengthBarSec
        break
      case '4m':
        duration = 4 * lengthBarSec
        break
    }
    // const duration = durationCount 'durationOneLength // TODO - This isn't right, test 1n,2n,4n,8n,1m,2m

    let timeSeconds = (bars * lengthBarSec) + (beats * lengthBeatSec) + (subdivisions * lengthSubDSec)

    const midiNote = {
      // bars,
      // beats,
      // subdivisions,
      midi: Note.midi(n.note),
      time: timeSeconds,
      // ticks: secondsToTicks(timeSeconds),
      // name: n.note,
      // pitch: n.note.slice(0, -1),
      // octave: parseInt(n.note.slice(-1)),
      velocity: 1,
      duration: duration
    }
    // console.log('converting note', n, midiNote)
    return midiNote
  })
}
const convertNotesToMidi = (bpm, timeSig, name, tracks) => { // chordNotes, melodyNotes) => {
  // Assumed 4/4
  const beatsInMeasure = timeSig[0]
  const beatsLength = timeSig[1]
  const lengthBeatSec = Math.pow(bpm / 60, -1)
  const lengthSubDSec = lengthBeatSec / beatsLength
  const lengthBarSec = lengthBeatSec * beatsInMeasure

  // console.log('Midi', Midi)
  const midi = new Midi.Midi()
  midi.header.name = name
  midi.header.setTempo(bpm)
  midi.header.timeSignatures.push({ticks: 0, timeSignature: beatsInMeasure, measures: beatsLength})

  // console.log('bars/beat/subd', lengthBarSec, lengthBeatSec, lengthSubDSec)

  for (const track of tracks) {
    // console.log('track', track)
    const midiTrack = midi.addTrack()
    midiTrack.name = track.type
    midiTrack.channel = 1
    // console.log('chordNotes', chordNotes)
    const chordNotesFlat = track.notes.filter(n => !n.ignore).flatMap((x) => Array.isArray(x.note) ? x.note.flatMap((d) => ({ time: x.time, duration: x.duration, note: d })) : x)
    const chordMidiNotes = noteToMidi(lengthBarSec, lengthBeatSec, lengthSubDSec, chordNotesFlat)
    // console.log('chordMidiNotes', chordMidiNotes)
    for (const note of chordMidiNotes) {
      midiTrack.addNote(note)
    }
  }
  // console.log('midi', midi)
  // console.log('midi.toArray()', midi.toArray())
  return midi.toArray()
}
export const chordsToToneNotes = (chords, barOffset, variant) => {
  const chordNotes = []
  for (let i = 0; i < chords.length; i++) {
    const chord = chords[i]
    const notesInChord = chord.notes.slice(0, 3).map(n => Note.transpose(n, '-8P'))
    let decorationNote = chord.notes.length > 3 ? Note.transpose(Note.transpose(chord.notes[3], '-8P'), '-8P') : false
    if (variant === 2 && i === 3) {
      chordNotes.push({
        time: `${i + barOffset}:0`,
        note: notesInChord,
        duration: '4n'
      })
    } else if (variant === 3 && i === 3) {
      chordNotes.push({
        time: `${i + barOffset}:0`,
        note: notesInChord,
        duration: '2n'
      }, {
        time: `${i + barOffset}:2`,
        note: notesInChord,
        duration: '4n'
      })
      if (decorationNote) {
        chordNotes.push({
          time: `${i + barOffset}:1`,
          note: decorationNote,
          duration: '2n'
        })
      }
    } else {
      chordNotes.push({
        time: `${i + barOffset}:0`,
        note: notesInChord,
        duration: '2n'
      }, {
        time: `${i + barOffset}:2`,
        note: notesInChord,
        duration: '2n'
      })
      if (decorationNote) {
        chordNotes.push({
          time: `${i + barOffset}:1`,
          note: decorationNote,
          duration: '2n'
        }, {
          time: `${i + barOffset}:3`,
          note: decorationNote,
          duration: '4n'
        })
      }
    }
  }
  return chordNotes
}
export const chordsDroneToToneNotes = (chords, barOffset, variant) => {
  const chordNotes = []
  for (let i = 0; i < chords.length; i++) {
    const chord = chords[i]
    const notesInChord = chord.notes.slice(0, 3).map(n => Note.transpose(n, '-8P'))
    // let decorationNote = chord.notes.length > 3 ? Note.transpose(Note.transpose(chord.notes[3], '-8P'), '-8P') : false
    if (variant === 2 && i === 3) {
      chordNotes.push({
        time: `${i + barOffset}:0`,
        note: notesInChord,
        duration: '4n'
      })
    } else if (variant === 3 && i === 3) {
      chordNotes.push({
        time: `${i + barOffset}:0`,
        note: notesInChord,
        duration: '2n'
      })
    } else {
      chordNotes.push({
        time: `${i + barOffset}:0`,
        note: notesInChord,
        duration: '1m'
      })
    }
  }
  return chordNotes
}

const melodyToToneNotes = (melody, barOffset, variant) => {
  // melody = melody.filter() // Filter every thing that starts with a '3:' except if it is 3:0 or 3:0:0
  if (variant === 2) {
    melody = melody.filter(m => !m.time.startsWith('3:') || m.time === '3:0' || m.time === '3:0:0')
  }
  if (variant === 3) {
    melody = melody.filter(m => !['3:2:2', '3:3:0', '3:3:2', '3:4:0', '3:4:2', '3:3', '3:4'].includes(m.time))
  }
  return melody.map(m => {
    const timeSplit = m.time.split(':')
    timeSplit[0] = parseInt(timeSplit[0]) + barOffset

    const mClone = Object.assign({}, m)
    mClone.time = timeSplit.join(':')
    return mClone
  })
}
const chordsToRootBassToneNotes = (chords, barOffset, variant) => {
  const chordNotes = []
  for (let i = 0; i < chords.length; i++) {
    const chord = chords[i]
    // console.log('chord', chord)
    const rootNote = Note.transpose(chord.notes[0], '-8P')
    // let decorationNote = chord.notes.length > 3 ? Note.transpose(Note.transpose(chord.notes[3], '-8P'), '-8P') : false
    chordNotes.push({
      time: `${i + barOffset}:0`,
      note: rootNote,
      duration: i === 3 && variant === 2 ? '4n' : i === 3 && variant === 3 ? '2n' : '1n'
    })
  }
  return chordNotes
}
const scaleAndChordToHighNotes = (chords, scaleChroma, barOffset, variant) => {
  const scaleNotes = ScaleType.get(scaleChroma).intervals.map(Note.transposeFrom('C')).map(v => (v) + '5')
  // console.log('triad', scaleNotes[2], scaleNotes[1], scaleNotes[4], scaleNotes[2])
  const highNotes = [{
    time: `${0 + barOffset}:0`,
    note: scaleNotes[2],
    duration: '1n'
  }, {
    time: `${1 + barOffset}:0`,
    note: scaleNotes[1],
    duration: '2m'
  }, {
    time: `${2 + barOffset}:0`,
    note: scaleNotes[4],
    duration: '1n'
  }, {
    time: `${3 + barOffset}:0`,
    note: [scaleNotes[2], scaleNotes[0]],
    duration: variant === 2 ? '4n' : variant === 3 ? '2n' : '1n'
  }]

  return highNotes
}

const scaleToPickingNotes = (scaleChroma, barOffset, variant) => {
  const scaleNotes = ScaleType.get(scaleChroma).intervals.map(Note.transposeFrom('C')).map(v => (v) + '3')
  scaleNotes.push('C4')
  scaleNotes.push(scaleNotes[5 - 1].replace('3', '2'))
  // console.log('triad', scaleNotes[2], scaleNotes[1], scaleNotes[4], scaleNotes[2])
  const pattern = [
    // 1, 4, 5, 8, 3, 4, 2, 9,
    // 1, 4, 5, 4, 3, 4, 5, 7,
    // 1, 4, 5, 8, 3, 4, 2, 9,
    // 1, 4, 5, 4, 3, 4, 5, 7
    // 1, 2, 3, 5, 2, 3, 1, 8,
    // 1, 2, 3, 2, 5, 3, 2, 3,
    // 1, 2, 3, 5, 2, 3, 1, 8,
    // 1, 2, 3, 2, 5, 3, 2, 3
    1, 3, 5, 8, 6, 4, 5, 3,
    1, 3, 5, 8, 6, 4, 5, 3,
    1, 3, 5, 8, 6, 4, 5, 3,
    1, 3, 5, 8, 6, 4, 5, 3
  ]
  const pickingNotes = []
  for (let i = 0; i < pattern.length; i++) {
    const interval = pattern[i] - 1
    pickingNotes.push({
      time: `${barOffset}:${Math.floor(i / 2)}:${i % 2 === 1 ? 2 : 0}`,
      note: scaleNotes[interval],
      duration: '8n'
    })
    if (variant === 2 && i === 24) {
      break
    }
    if (variant === 3 && i === 28) {
      break
    }
  }
  // console.log('pickingNotes', pickingNotes, scaleNotes)
  return pickingNotes
}

const scaleToFastArpeggioNotes = (chords, scaleChroma, barOffset, variant) => {
  const intervals = ScaleType.get(scaleChroma).intervals
  let scaleNotes = intervals.map(Note.transposeFrom('C')).map(v => (v) + '3')
  scaleNotes = scaleNotes.concat(intervals.map(Note.transposeFrom('C')).map(v => (v) + '4'))
  // scaleNotes.push('C4')
  // scaleNotes.push(scaleNotes[7 - 1].replace('3', '2'))
  // console.log('triad', scaleNotes[2], scaleNotes[1], scaleNotes[4], scaleNotes[2])
  const i1 = chords[0].interval - 1
  const i2 = chords[1].interval - 1
  const i3 = chords[2].interval - 1
  const i4 = chords[3].interval - 1
  const pattern = [
    i1 + 8, i1 + 5, i1 + 3, i1 + 1,
    i1 + 8, i1 + 5, i1 + 3, i1 + 1,
    i1 + 8, i1 + 5, i1 + 3, i1 + 1,
    i1 + 8, i1 + 5, i1 + 3, i1 + 1,
    i2 + 8, i2 + 5, i2 + 3, i2 + 1,
    i2 + 8, i2 + 5, i2 + 3, i2 + 1,
    i2 + 8, i2 + 5, i2 + 3, i2 + 1,
    i2 + 8, i2 + 5, i2 + 3, i2 + 1,
    i3 + 8, i3 + 5, i3 + 3, i3 + 1,
    i3 + 8, i3 + 5, i3 + 3, i3 + 1,
    i3 + 8, i3 + 5, i3 + 3, i3 + 1,
    i3 + 8, i3 + 5, i3 + 3, i3 + 1,
    i4 + 8, i4 + 5, i4 + 3, i4 + 1,
    i4 + 8, i4 + 5, i4 + 3, i4 + 1,
    i4 + 8, i4 + 5, i4 + 3, i4 + 1,
    i4 + 8, i4 + 5, i4 + 3, i4 + 1
  ]
  const pickingNotes = []
  for (let i = 0; i < pattern.length; i++) {
    const interval = pattern[i] - 1
    pickingNotes.push({
      time: `${barOffset}:${Math.floor(i / 4)}:${i % 4}`,
      note: scaleNotes[interval],
      duration: '16n'
    })
    if (variant === 2 && i === 48) {
      break
    }
    if (variant === 3 && i === 56) {
      break
    }
  }
  // console.log('pickingNotes', pickingNotes, scaleNotes)
  return pickingNotes
}
const scaleToLowDroneNotes = (scaleChroma, barOffset, variant) => {
  const scaleNotes = ScaleType.get(scaleChroma).intervals.map(Note.transposeFrom('C')).map(v => (v) + '2')
  // console.log('triad', scaleNotes[2], scaleNotes[1], scaleNotes[4], scaleNotes[2])
  const notes = [{
    time: `${0 + barOffset}:0`,
    note: scaleNotes[0],
    duration: '2m'
  }, {
    time: `${2 + barOffset}:0`,
    note: scaleNotes[0],
    duration: variant === 2 || variant === 3 ? '1m' : '2m'
  }]

  return notes
}
const drumNotes = (barOffset, variant) => {
  switch (variant) {
    case 1:
      return [{
        time: `${3 + barOffset}:2`,
        note: 'Db5',
        duration: '2n'
      }]
    case 2:
      return [{
        time: `${0 + barOffset}:0`,
        note: 'C3',
        duration: '2n'
      }, {
        time: `${1 + barOffset}:0`,
        note: 'C3',
        duration: '2n'
      }, {
        time: `${2 + barOffset}:0`,
        note: 'C3',
        duration: '2n'
      }, {
        time: `${3 + barOffset}:0`,
        note: 'C3',
        duration: '2n'
      }]
    case 3:
      return [{
        time: `${0 + barOffset}:0`,
        note: 'C3',
        duration: '4m'
      }]
    case 4:
      return [{
        time: `${0 + barOffset}:0`,
        note: 'D3',
        duration: '4m'
      }]
    case 5:
      return [{
        time: `${0 + barOffset}:0`,
        note: 'F3',
        duration: '4m'
      }]
    case 6:
      return [{
        time: `${0 + barOffset}:0`,
        note: 'E4',
        duration: '2m'
      }, {
        time: `${2 + barOffset}:0`,
        note: 'G4',
        duration: '2m'
      }]
    case 7:
      return [{
        time: `${0 + barOffset}:0`,
        note: 'B4',
        duration: '4m'
      }]
    case 8:
      return [{
        time: `${0 + barOffset}:0`,
        note: 'A3',
        duration: '2m'
      }, {
        time: `${2 + barOffset}:0`,
        note: 'D5',
        duration: '1m'
      }, {
        time: `${3 + barOffset}:0`,
        note: 'Bb4',
        duration: '2n'
      }, {
        time: `${3 + barOffset}:2`,
        note: 'Db5',
        duration: '2n'
      }]
    default:
      return []
  }
}
export const generateSong = (constellationData) => {
  const bpm = constellationData.music.bpm
  const timeSig = constellationData.music.timeSig

  const tracks = [
    {structure: '0000011111113', type: 'Chords'},
    {structure: '0111300000000', type: 'Chords Drone'},
    {structure: '0011300110013', type: 'Melody 1'},
    {structure: '0000011001100', type: 'Melody 2'},
    {structure: '0000311111113', type: 'Root Bass'},
    {structure: '0001311111113', type: 'High Notes'},
    {structure: '0000000001113', type: 'Picking'},
    {structure: '0000000111113', type: 'Fast Arpeggio'},
    {structure: '1111300000000', type: 'Low Drone'},
    {structure: '0000123445678', type: 'Drums'}
  ]
  for (const track of tracks) {
    track.notes = []
    const isActiveList = track.structure.split('')
    for (let i = 0; i < isActiveList.length; i++) {
      const variant = parseInt(isActiveList[i])
      if (variant !== 0) {
        if (track.type === 'Chords') {
          track.notes = track.notes.concat(chordsToToneNotes(constellationData.music.chords.structure, i * timeSig[1], variant))
        } if (track.type === 'Chords Drone') {
          track.notes = track.notes.concat(chordsDroneToToneNotes(constellationData.music.chords.structure, i * timeSig[1], variant))
        } else if (track.type === 'Melody 1') {
          track.notes = track.notes.concat(melodyToToneNotes(constellationData.music.melody, i * timeSig[1], variant))
        } else if (track.type === 'Melody 2') {
          track.notes = track.notes.concat(melodyToToneNotes(constellationData.music.melody2, i * timeSig[1], variant))
        } else if (track.type === 'Root Bass') {
          track.notes = track.notes.concat(chordsToRootBassToneNotes(constellationData.music.chords.structure, i * timeSig[1], variant))
        } else if (track.type === 'High Notes') {
          track.notes = track.notes.concat(scaleAndChordToHighNotes(constellationData.music.chords.structure, constellationData.music.scale.chroma, i * timeSig[1], variant))
        } else if (track.type === 'Picking') {
          track.notes = track.notes.concat(scaleToPickingNotes(constellationData.music.scale.chroma, i * timeSig[1], variant))
        } else if (track.type === 'Fast Arpeggio') {
          track.notes = track.notes.concat(scaleToFastArpeggioNotes(constellationData.music.chords.structure, constellationData.music.scale.chroma, i * timeSig[1], variant))
        } else if (track.type === 'Low Drone') {
          track.notes = track.notes.concat(scaleToLowDroneNotes(constellationData.music.scale.chroma, i * timeSig[1], variant))
        } else if (track.type === 'Drums') {
          track.notes = track.notes.concat(drumNotes(i * timeSig[1], variant))
        }
      }
    }
    // console.log('track.notes', track)
    // track.notes = JSON.stringify(track.notes)
  }
  const byteArray = convertNotesToMidi(bpm, timeSig, constellationData.constellationName, tracks)
  // console.log('generateSong', byteArray)
  const midiDir = 'midi'
  const filePath = `${midiDir}/${constellationData.constellationName}.mid`
  fs.ensureDirSync(midiDir)
  fs.writeFileSync(filePath, byteArray)

  return tracks
}
const printScaleSummary = (starData) => {
  // const scaleList = []
  // for (const constellation of starData.constellations) {
  //   const scale = constellation.music.scale

  //   let foundScale = scaleList.find(s => s.c === scale.chroma)
  //   if (!foundScale) {
  //     // foundScale = { chroma: scale.chroma, name: scale.name, c: [] }
  //     foundScale = { c: scale.chroma, n: scale.name, m: scale.chroma.split('')[4] === '1' ? 1 : 0, l: 0 }
  //     scaleList.push(foundScale)
  //   }
  //   // foundScale.c.push(constellation.constellationName)
  //   foundScale.l++
  // }
  // scaleList.sort((a, b) => b.l - a.l)
  // console.log('scaleList', scaleList)
  // console.log('total', _.sumBy(scaleList, 'l'))
  // console.log('major', _.sumBy(scaleList, function (s) { return s.l 's.m }))
  // console.log('minor', _.sumBy(scaleList, function (s) { return s.l '(s.m === 0 ? 1 : 0) }))
}
const printNotesForIntrumentsSummary = (starData) => {
  const types = []
  for (const constellationData of starData.constellations) {
    // console.log('constellationData.music.songNotes', constellationData.music.songNotes)
    for (const track of constellationData.music.songNotes) {
      // console.log('track', track)
      let type = types.find(t => t.type === track.type)
      if (!type) {
        type = {type: track.type, notes: [], durations: []}
        types.push(type)
      }
      // if (typeof (track.notes.note) === 'array') {

      for (const note of track.notes) {
        // console.log('notes type', typeof (note.note), note.note)
        const individualNotes = typeof (note.note) === 'string' ? [note.note] : note.note
        for (const individualNote of individualNotes) {
          // const midiValue = Note.midi(individualNote)
          if (!type.notes.includes(individualNote) && individualNote !== 'C0') {
            type.notes.push(individualNote)
          }
        }
        // console.log('duration', note.duration)
        if (!type.durations.includes(note.duration)) {
          type.durations.push(note.duration)
        }
        // type.durations.push(type.duration)
      }
    }
  }
  const durationSortOrder = [
    '16n',
    '8n',
    '4n',
    '2n',
    '1n',
    '1m',
    '2m',
    '3m',
    '4m'
  ]
  for (const type of types) {
    type.durations.sort((a, b) => durationSortOrder.indexOf(b) - durationSortOrder.indexOf(a))
    let durationIndex = durationSortOrder.indexOf(type.durations[0])
    if (durationIndex < 4) {
      durationIndex = 4
    }
    type.duration = durationSortOrder[1 + durationIndex]
    delete type.durations
    type.notes = ['2', '3', '4', '5', '6']
      .map(o => {
        const l = type.notes.filter(n => n.includes(o)).length
        const notes = []
        if (l === 1) {
          notes.push(Note.get(`C${o}`).name)
        }
        if (l > 1) {
          const fromMidiNote = Note.get(`C${o}`).midi
          const toMidiNote = Note.get(`B${o}`).midi
          // console.log('midi', fromMidiNote, toMidiNote)
          for (let m = fromMidiNote; m <= toMidiNote; m++) {
          // console.log('m', m, Note.fromMidi(m))
            notes.push(Note.fromMidi(m))
          }
        }
        return {o: o, l: l, all: l > 1, root: l === 1, notes: notes}
      })
      .reduce(function (a, b) {
        a = a.concat(b.notes)
        return a
      }, [])
      // .map((n, i) => {
      //   const bar = parseInt(type.duration.split('')[0]) 'i '2 // TODO - No space for note ending here
      //   return {time: `${bar}:0`, note: n, duration: type.duration, bar}
      // })
      .map((n, i) => {
        return {type: n, notes: [{time: `0:0`, note: n, duration: type.duration}]}
      })
    // console.log('type', type)
    const bpm = 80
    const timeSig = [4, 4]
    const byteArray = convertNotesToMidi(bpm, timeSig, `_all-notes-${type.type}`, type.notes)
    // console.log('generateSong', byteArray)
    const midiDir = 'midi'
    const filePath = `${midiDir}/_all-notes-${type.type}.mid`
    fs.ensureDirSync(midiDir)
    fs.writeFileSync(filePath, byteArray)
  }
  createAllMidiNotesFile()
}
const createAllMidiNotesFile = () => {
// C0 Eb0 Gb0 A0
// C1 Eb1 Gb1 A1
// C2 Eb2 Gb2 A2
// 3 *
// 4 *
// 5 *
// C6 Eb6 Gb6 A6
// C7 Eb7 Gb7 A7
  const noteValues = [
    ['C', 'Eb', 'Gb', 'A'],
    ['C', 'Eb', 'Gb', 'A'],
    ['C', 'Eb', 'Gb', 'A'],
    ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
    ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
    ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
    ['C', 'Eb', 'Gb', 'A'],
    ['C', 'Eb', 'Gb', 'A']
  ]
    .reduce(function (a, b, i) {
      a = a.concat(b.map(n => n + i))
      return a
    }, [])
    .map((n, i) => {
      return {type: n, notes: [{time: `0:0`, note: n, duration: '3m'}]}
    })
  // console.log('noteValues', noteValues)
  // for (const noteValue of noteValues) {
  //   console.log('noteValue',noteValue)
  // }
  const bpm = 80
  const timeSig = [4, 4]
  const byteArray = convertNotesToMidi(bpm, timeSig, `_all-notes`, noteValues)
  // console.log('generateSong', byteArray)
  const midiDir = 'midi'
  const filePath = `${midiDir}/_all-notes.mid`
  fs.ensureDirSync(midiDir)
  fs.writeFileSync(filePath, byteArray)
}
export const debugNotes = (starData) => {
  printScaleSummary(starData)
  printNotesForIntrumentsSummary(starData)
}
export const getInstrumentForTrack = () => {
  const chords = [
    'Soft Piano',
    'Capstan Upright',
    'Fingered',
    'Hannah Peels Music Box',
    'Floe',
    'Plucks',
    'Circular Mmms',
    'Vox Humana', // ?
    'The Deeps',
    'Nasty Tines',
    'Thirds Organ',
    'Space Pluck 2',
    'Sustain Ahhs',
    'Sustain Uhs',
    'The Lightkeeper',
    'Earth Sign'// ?
    // 'Magnetic Reader',
    // 'Spliced Upright',
    // 'Sustain Oohs',
  ]

  const chordsDrone = [
    'Soft Piano',
    'Capstan Upright',
    'The Deeps',
    'Floe',
    'Plucks',
    'Circular Mmms',
    'Sustain Oohs',
    'Space Pluck 2',
    'The Lightkeeper',
    'Nasty Tines',
    'Earth Sign'
    // 'Thirds Organ',
    // 'Vox Humana',
    // 'Magnetic Reader',
    // 'Spliced Upright',
    // 'Fingered',
    // 'Sustain Ahhs',
    // 'Hannah Peels Music Box',
  ]

  const melody = [
    'Soft Piano',
    'Felt Cassette',
    'Spliced Upright',
    'Fingered',
    'Plucks',
    'Nasty Tines',
    'Mini',
    'Piano Heaven',
    'Sustain Tuned',
    'Anthem',
    'Organ'
    // 'Earth Sign',
    // 'Ghost Hand Bells', // ?
    // 'Trems Slow', // ?
    // 'Gentle', // ?
    // 'Nautilus', // ?
    // 'Nautilus Soft', // ?
    // 'Magnetic Reader', // ?
    // 'Gieger', // ?
    // 'Choir In The Rain', // ?
    // 'Sevastopol', // ?
    // 'Warp Laments', // ?
    // 'Warp Souls', // ?
    // 'Chorus Pad',
  ]

  const bass = [
    'Gentle',
    'Sevastopol',
    'Lost In The Cavern',
    'Nautilus Soft',
    'Nasty Tines',
    'Peer Guitar Ensemble',
    'Choir In The Rain',
    'Sound The Alarm',
    'Nightfrost',
    'Sustain Uhs',
    'Earth Sign',
    'Phosphor',
    'Sumburgh Steel',
    'Space Pluck 2',
    'The Lightkeeper',
    'Brutalizer'
    // 'Ancients',
    // 'Drone',
    // 'Guitar Bowed Drone',
  ]

  const highNotes = [
    'Long',
    'Brass Loop',
    'Cyclosa',
    'Tape Piano',
    'Breathy Mist',
    'Sustain Guitar',
    'Whale Song',
    'Metallique Cries',
    'Vox Humana Crinkle',
    'Woods Hollow Crinkle',
    'Ethereal Guitar',
    'Plucks',
    'Vocal Pad',
    'Petrichor',
    'Oseny',
    'Warp Fracture',
    'Glass Cabinet',
    'Sages Pad',
    'Swells',
    'Trems Slow',
    'Foehn',
    'Decay',
    'Anthem',
    'Warp Laments',
    'Glacial Pad',
    'Octave Echoes',
    'Lost In The Cavern',
    'Sevastopol',
    'Ribbon',
    'Guitar Bowed Drone',
    'Granules',
    'Resonance Chaos'
    // 'Hireth',
    // 'Saudade',
    // 'Ghost Hand Bells', //?
    // 'Nautilus Soft',
    // 'Sustain',
    // 'Sustain Tuned',
    // 'Choir In The Rain',//?
    // 'Ghost At The Harbour',//?
    // 'Glass 2',
    // 'Chorus Pad',
  ]

  const picking = [
    'Resonator Music Box',
    'Pipe Piano',
    'Vox Humana',
    'Piano Heaven',
    'Plucks',
    'Floe',
    'Pizzicato Ensemble',
    'Short',
    'Underwater Bass'
  ]

  const fastArpeggio = [
    'Sound The Alarm',
    'The Deeps',
    'Vox Humana',
    'Magnetic Reader',
    'Thirds Organ',
    'Plucks',
    'Piano Heaven',
    'Tank Piano',
    'Pizzicato Ensemble',
    'Ensemble',
    'Nasty Tines',
    'Underwater Bass',
    'Mobius Blips'
    // 'Gossip',
    // 'Brass Loop',
    // 'Vox Humana Crinkle',
    // 'Muted Plucks',
    // 'Glass Grand Soft',
    // 'Tremolo',
    // 'Sustain Oohs',
    // 'Resonator Music Box',
    // 'Sages Pad',
    // 'Chorus Pad',
    // 'Bumblebee',
    // 'Granular Piano',
    // 'Tape Piano',
    // 'Synth Stab'
  ]

  const lowDrone = [
    'Whalesong',
    'Metro',
    'Night Tube',
    'Decay',
    'Glacial Pad',
    'Balm',
    'Lost In The Cavern',
    'Hayward Crane',
    'Break Emergency Glass',
    '2 on the Platform',
    'Fragile Air',
    'Submerged',
    'Nautilus Soft',
    'Chorus Pad',
    'Metallique Cries',
    'Transreal',
    'Nascent',
    'Ribbon',
    'Breathy Mist',
    'Nightfrost',
    'Thirds Organ',
    'The Lightkeeper',
    'Sumburgh Steel',
    'Ancients',
    'Earth Sign',
    'Andromeda',
    'Phosphor'
    // 'Deep Dream',
    // 'Plaintive Wail',
    // 'Nautilus',
    // 'Rattle',
    // 'Ghost At The Harbour',
    // 'Helicopter',
    // 'Horn',
    // 'Granules',
    // 'Metallique',
  ]
  const drums = [
    // Light
    'AIR A Bit Foggy',
    'AIR Bouncing Static',
    'AIR Dubbie Hats',
    'AIR High Tubes',
    'AIR Just Say Hi',
    'AIR Sizzles On Top',

    'ALN Clock Groove',
    'ALN Diving Danger',
    'ALN Pipe Drumming',
    'ALN Whatdidhesayyyy',

    // Glitch effects
    'GLT Brrrbs',
    'GLT I Found A Gameboy',
    'GLT Step Filter Groove',

    'ACT Plastic Box Ensemble',
    'ACT Cyberlicious',
    'ACT Purring Alien',
    'ACT Morse Code',

    'DRT Dirty Needle',

    'CPY Space X Delay',
    'CPY Hip Movement',
    'CPY Thru Gates',
    'CPY Stutter Groove',
    'CPY Rhytmn Gator',
    'CPY Chucka',
    'CPY Gaterade',

    // Noisy
    'GRO Coming And Going',
    'GRO Diving Bell',
    'GRO Dubganger',
    'GRO Relaxed Big Drums',

    'CIN Adrenaline Building',
    'CIN Attack From East',
    'CIN Pumped Hannibal',
    'CIN Right Behind You',

    'ALN Strange Mess',
    'ALN Ear Piercer',
    'ALN Earsick',
    // 'ALN Ebb and Flow',// Doesn't sound great
    'ALN Lost In Space Echo',

    'POW David And Goliath',
    'POW In A Strut',
    'POW Micro Brewery',
    'POW Ping Pong Armies',
    'POW Processor Progressor',
    'POW Washing Machine',

    'BAT Heart Pump',
    'BAT Battery',
    'BAT Carol of Drums',

    'BRU Eleven Inch Nails',

    'SUS Are You Nervous',
    'SUS Bam Bam',
    'SUS Off Beating',
    'SUS Fried Transistors',
    'SUS Start Stop',

    // Hard
    'THR Death By Gravity',
    'THR March Of The Drums',
    'THR Valley Of The King',

    'ACT Steady Rolling',
    'ACT Taiko Army',
    'ACT Algier Action',
    'ACT Distress',
    'ACT Forward Mission',
    'ACT Mounting Danger',
    'ACT Rimshot Dance',
    'ACT Rolling Thunder',

    'GIA Attila',
    'GIA The Siege',
    'GIA Twin Hits',

    'COL Amboss Troops',
    'COL Big Bottoms',
    'COL Big Hurry',
    'COL Death Of A King',
    'COL Doppler Monster'
  ]
  return {
    'Chords': chords,
    'Chords Drone': chordsDrone,
    'Melody 1': melody,
    'Melody 2': melody,
    'Root Bass': bass,
    'High Notes': highNotes,
    'Picking': picking,
    'Fast Arpeggio': fastArpeggio,
    'Low Drone': lowDrone,
    'Drums': drums }
}
export const getInstruments = () => {
  const soundsDir = join('_static', 'sounds')
  const instrumentList = fs.readdirSync(soundsDir).filter(f => fs.statSync(join(soundsDir, f)).isDirectory())
  // console.log('instrumentList', instrumentList)
  const instruments = instrumentList.map(name => {
    const notes = fs.readdirSync(join(soundsDir, name))
      .filter(f => f.endsWith('.mp3'))
      .map(f => f.replace(`${name} - `, '').replace('.mp3', ''))
    return { name: name, notes }
  })
  // for (const instrument of instruments) {
  //   console.log('instrument', instrument)
  // }
  return {notes: instruments, tracks: getInstrumentForTrack()}
}
export const applyInstrumentsToMusic = (starData) => {
  const instrumentTypes = getInstrumentForTrack()
  const constellations = starData.constellations.map(c => c)

  const trackTypeToAttributeList = [
    {track: 'Chords', bucket: 0},
    {track: 'Chords Drone', bucket: 1},
    {track: 'Melody 1', bucket: 2},
    {track: 'Melody 2', bucket: 3},
    {track: 'Root Bass', bucket: 4},
    {track: 'High Notes', bucket: 5},
    {track: 'Picking', bucket: 6},
    {track: 'Fast Arpeggio', bucket: 7},
    {track: 'Low Drone', bucket: 8},
    {track: 'Drums', bucket: 9}
  ]
  for (const trackTypeToAttribute of trackTypeToAttributeList) {
    // console.log('')
    constellations.sort((a, b) => b.ranges.ci.averages[trackTypeToAttribute.bucket] - a.ranges.ci.averages[trackTypeToAttribute.bucket])

    const instruMappings = constellations.map((c, i) => {
      const instrument = instrumentTypes[trackTypeToAttribute.track][Math.floor(i / (constellations.length / instrumentTypes[trackTypeToAttribute.track].length))]
      return {constellationName: c.constellationName, trackType: trackTypeToAttribute.track, instrument}
    })
    for (const instruMapping of instruMappings) {
      const track = starData.constellations.find(c => c.constellationName === instruMapping.constellationName).music.songNotes.find(t => t.type === instruMapping.trackType)
      track.instrument = instruMapping.instrument
    }
    // console.log('instruMappings', instruMappings)
  }
}
