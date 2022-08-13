import { ScaleType, Note, Interval } from '@tonaljs/tonal'
import Midi from '@tonejs/midi'
import fs from 'fs-extra'

import _ from 'lodash'

export const getScale = (bucketValues) => {
  let scale = [...bucketValues]
  scale.sort((a, b) => Math.abs(b) - Math.abs(a))
  scale = scale.slice(0, 6).map(v => v > 0)
  // Use chroma. for the 6 pairs, set 2 or b2 etc for all, then use chroma to find a found scale, removing one note as required until a match

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
  const allScales = ScaleType.all().filter(s => s.intervals.length === 7)
  for (const potentialScale of allScales) {
    const distance = chromaDifference(chroma, potentialScale.chroma)
    potentialScale.distance = distance
  }
  // allScales.sort((a, b) => a.distance - b.distance)

  allScales.sort((a, b) => {
    function findFirstDiffPos (a, b) {
      if (a.length < b.length)[a, b] = [b, a]
      return [...a].findIndex((chr, i) => chr !== b[i])
    }
    return a.distance - b.distance || findFirstDiffPos(b.chroma.split(''), chroma) - findFirstDiffPos(a.chroma.split(''), chroma)
  })

  // console.log('allScales', chroma, allScales, allScales.map(s => `${chroma} : ${s.chroma} - ${s.distance} - ${s.name}`))

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

  // console.log('scaleNotes', scaleNotes, scale)
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

    // console.log('star', s.bayer, s.proper, '-', s[angleAttribute], noteCount, '-', scaleNotes, s[distanceAttribute], s[distanceAttribute]/maxDistance, (s[distanceAttribute]/maxDistance) * (scaleNotes.length-1), note)
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
    // const duration = durationCount * durationOneLength // TODO - This isn't right, test 1n,2n,4n,8n,1m,2m

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
    {structure: '0000000001113', type: 'Picking'}, // A general picking thing can sound pretty bad, scrap it for now
    {structure: '0000000111113', type: 'Fast Arpeggio'},
    {structure: '1111300000000', type: 'Low Drone'}
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
        }
      }
    }

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
