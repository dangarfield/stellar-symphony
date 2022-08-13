import {ScaleType, Scale, Note} from '@tonaljs/tonal'
import {Sampler, Transport, Pattern, Part, loaded as toneLoaded, start as ToneStart, Draw} from 'tone'
import { setupMelodyExplanation } from './map.js'

export const getScaleText = (chroma) => {
  const scale = ScaleType.get(chroma)
  return `${scale.name} - ${scale.chroma}`
}
const piano = new Sampler({
  urls: {
    A0: 'A0.mp3',
    C1: 'C1.mp3',
    'D#1': 'Ds1.mp3',
    'F#1': 'Fs1.mp3',
    A1: 'A1.mp3',
    C2: 'C2.mp3',
    'D#2': 'Ds2.mp3',
    'F#2': 'Fs2.mp3',
    A2: 'A2.mp3',
    C3: 'C3.mp3',
    'D#3': 'Ds3.mp3',
    'F#3': 'Fs3.mp3',
    A3: 'A3.mp3',
    C4: 'C4.mp3',
    'D#4': 'Ds4.mp3',
    'F#4': 'Fs4.mp3',
    A4: 'A4.mp3',
    C5: 'C5.mp3',
    'D#5': 'Ds5.mp3',
    'F#5': 'Fs5.mp3',
    A5: 'A5.mp3',
    C6: 'C6.mp3',
    'D#6': 'Ds6.mp3',
    'F#6': 'Fs6.mp3',
    A6: 'A6.mp3',
    C7: 'C7.mp3',
    'D#7': 'Ds7.mp3',
    'F#7': 'Fs7.mp3',
    A7: 'A7.mp3',
    C8: 'C8.mp3'
  },
  release: 1,
  baseUrl: 'https://tonejs.github.io/audio/salamander/'
}).toDestination()
toneLoaded().then(() => {
  console.log('Piano samples loaded')
})
let currentlyPlayingMp3 = null
export const stopToneClips = () => {
  Transport.stop()
  Transport.cancel(0)
  if (currentlyPlayingMp3) {
    currentlyPlayingMp3.pause()
    currentlyPlayingMp3 = null
  }
}

const playMp3 = (url) => {
  stopToneClips()
  currentlyPlayingMp3 = new Audio(url) // eslint-disable-line no-undef
  currentlyPlayingMp3.play()
}
const triggeredAnimationAction = (visualMelody, value, timeForAnimation) => {
  console.log('Draw', value)
  if (value.melodyTimingByAngle) {
    visualMelody.animateLine(timeForAnimation)
  }
  if (value.melodyTimingByDistance) {
    visualMelody.animateCircle(timeForAnimation)
  }
}
const playToneClip = (toneData) => {
  // console.log('playToneClip', toneData)
  stopToneClips()
  ToneStart()
  if (toneData.type === 'scale') {
    const scaleNotes = Scale.get(toneData.scale.chroma).intervals.map(Note.transposeFrom('C')).map(v => (v) + '4')
    scaleNotes.push('C5')
    new Pattern(function (time, note) {
      piano.triggerAttackRelease(note, '4n', time)
    }, scaleNotes, 'up').start(0)
    Transport.bpm.value = 120
  } else if (toneData.type === 'chords' || toneData.type === 'melody') {
    const visualMelody = setupMelodyExplanation(toneData.constellation)
    // const notesToPlay = toneData.melody ? toneData.chords.concat(toneData.melody) : toneData.chords
    const notesToPlay = toneData.melody
    const totalBars = notesToPlay.find(n => n.totalBars).totalBars
    const timeForAnimation = 1000 * Math.pow(toneData.bpm / 60, -1) * 4 * totalBars
    const part = new Part((time, value) => {
      if (!value.ignore) {
        piano.triggerAttackRelease(value.note, value.duration, time)
      }
      Draw.schedule(function () {
        triggeredAnimationAction(visualMelody, value, timeForAnimation)
      }, time)
    }, notesToPlay).start(0)

    part.loop = true
    part.loopEnd = '4m'

    Transport.bpm.value = toneData.bpm
  } else if (toneData.type === 'song') {
    const visualMelody = setupMelodyExplanation(toneData.constellation)
    let notesToPlay = []
    for (const track of toneData.song) {
      notesToPlay = notesToPlay.concat(track.notes)
    }
    new Part((time, value) => {
      if (!value.ignore) {
        piano.triggerAttackRelease(value.note, value.duration, time)
      }
      Draw.schedule(function () {
        triggeredAnimationAction(toneData.bpm, visualMelody, value)
      }, time)
    }, notesToPlay).start(0)
    Transport.bpm.value = toneData.bpm
  }
  Transport.start()
}

// Potential melodies (da - distance from alpha, dc - distance from centre, aa - angle from alpha, ac - angle from centre)
// # - timing - notes
// 1 - da - aa
// 2 - da - ac
// 3 - dc - aa
// 4 - dc - ac
// 5 - aa - da
// 6 - aa - dc
// 7 - ac - da
// 8 - ac - dc

// Melody 1 Timing = distance from alpha
// Melody 1 Notes =  angle from centre

export const getToneDataFromElementAndPlay = (starData, ele) => {
  const url = ele.getAttribute('data-url')
  if (url) {
    playMp3(url)
    return
  }

  const type = ele.getAttribute('data-type')
  const constellationId = ele.getAttribute('data-constellation')
  const constellation = starData.constellations.find(c => c.constellation === constellationId)

  let toneData = {bpm: constellation.music.bpm, timeSig: constellation.music.timeSig, constellation}
  switch (type) {
    case 'scale':
      toneData.type = 'scale'
      toneData.scale = constellation.music.scale
      break
    case 'chords':
      toneData.type = 'chords'
      toneData.chords = constellation.music.chords.toneNotes
      break
    case 'melody':
      toneData.type = 'chords'
      toneData.chords = constellation.music.chords.toneNotes
      toneData.melody = constellation.music.melody
      break
    case 'melody2':
      toneData.type = 'chords'
      toneData.chords = constellation.music.chords.toneNotes
      toneData.melody = constellation.music.melody2
      break
    case 'song':
      toneData.type = 'song'
      toneData.song = constellation.music.songNotes
      break
  }
  console.log('.tone-clip click', type, constellationId, constellation, toneData)
  playToneClip(toneData)
}
