import {ScaleType, Scale, Note} from '@tonaljs/tonal'
import {Sampler, Transport, Pattern, Part, start as ToneStart, Draw, Player, JCReverb} from 'tone'
import {setupMelodyExplanation, stopMelodyExplanation} from './map.js'
import {setLoadingText, hideLoadingText, setLoadingPercent} from './utils.js'

const activeSamplers = []
const removeAllSamplers = () => {
  // console.log('removeAllSamplers', activeSamplers)
  while (activeSamplers.length > 0) {
    let sampler = activeSamplers.shift()
    sampler.dispose()
    sampler = null
  }
}
export const getScaleText = (chroma) => {
  const scale = ScaleType.get(chroma)
  return `${scale.name} - ${scale.chroma}`
}

Transport.on('stop', function () {
  console.log('Transport stop')
  stopToneClips()
})

export const stopToneClips = () => {
  console.log('stopToneClips')
  if (Transport.state === 'started') {
    Transport.stop()
    Transport.cancel(0)
  }
  removeAllSamplers()
  stopMelodyExplanation()
  document.querySelector('.info-short .tone-clip').style.display = 'inline'
  document.querySelector('.info-short .tone-stop').style.display = 'none'
  document.querySelector('.action-play').classList.remove('active', 'bi-stop-btn')
  document.querySelector('.action-play').classList.add('bi-play-btn')
  document.querySelector('.action-play .tooltip-text').textContent = 'Play'
}

const triggeredAnimationAction = (visualMelody, value, timeForAnimation, instrument) => {
  console.log('Draw', value, instrument)
  if (value.melodyTimingByAngle) {
    visualMelody.animateLine(timeForAnimation)
  }
  if (value.melodyTimingByDistance) {
    visualMelody.animateCircle(timeForAnimation)
  }
  if (value.starHip) {
    visualMelody.animateStar(value.starHip)
  }
}

const getRequiredSampleNotes = (instruments, instrument, requiredNotes) => {
  // console.log('getRequiredSampleNotes requiredNotes', requiredNotes, instrument)
  let sampleNotes = []
  for (const requiredNote of requiredNotes) {
    if (typeof (requiredNote.note) === 'string') {
      const potentialNote = Note.fromMidi(Note.get(requiredNote.note).midi)
      if (!sampleNotes.includes(potentialNote)) {
        sampleNotes.push(potentialNote)
      }
    } else if (typeof (requiredNote.note) === 'object') {
      for (const requiredNoteNote of requiredNote.note) {
        const potentialNote = Note.fromMidi(Note.get(requiredNoteNote).midi)
        if (!sampleNotes.includes(potentialNote)) {
          sampleNotes.push(potentialNote)
        }
      }
    }
  }
  const allSampleNoteValuesFromInstrument = instruments.find(i => i.name === instrument).notes

  sampleNotes = sampleNotes.filter(n => n !== 'C0' && allSampleNoteValuesFromInstrument.includes(n))
  // console.log('getRequiredSampleNotes sampleNotes', sampleNotes)

  return sampleNotes
}

export const loadPianoSampler = async () => {
  return new Promise(resolve => {
    const piano = new Sampler({
      name: 'Salamander Piano',
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
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
      onload: () => {
        // sampler.triggerAttackRelease(["C1", "E1", "G1", "B1"], 0.5);
        resolve(piano)
      }
    }).toDestination()
  })
}
export const loadSampler = async (instruments, instrument, requiredNotes, addReverb) => {
  // console.log('loadSampler', instruments, instrument, requiredNotes)
  return new Promise(resolve => {
    const sampleNotes = getRequiredSampleNotes(instruments, instrument, requiredNotes)

    const sampleNotesObject = {}
    for (const sampleNote of sampleNotes) {
      sampleNotesObject[sampleNote] = `${instrument} - ${sampleNote}.mp3`
    }
    // console.log('loadSampler', instrument, sampleNotesObject)
    const sampler = new Sampler({
      name: instrument,
      urls: sampleNotesObject,
      baseUrl: `sounds/${instrument}/`,
      onload: () => {
        // sampler.triggerAttackRelease(["C1", "E1", "G1", "B1"], 0.5);

        activeSamplers.push(sampler)
        resolve(sampler)
      }
    })
    if (addReverb) {
      const reverb = new JCReverb().toDestination()
      sampler.connect(reverb)
    } else {
      // console.log('NO REVERB')
      sampler.toDestination()
    }
  })
}

let piano = null

const playToneClip = async (starData, toneData) => {
  // console.log('playToneClip', toneData)
  setLoadingText('Loading instruments...')
  setLoadingPercent(0)
  stopToneClips()
  document.querySelector('.info-short .tone-clip').style.display = 'none'
  document.querySelector('.info-short .tone-stop').style.display = 'inline'
  document.querySelector('.action-play').classList.remove('bi-play-btn')
  document.querySelector('.action-play').classList.add('active', 'bi-stop-btn')
  document.querySelector('.action-play .tooltip-text').textContent = `Stop ${toneData.constellation.constellationName}`
  ToneStart()
  if (toneData.type === 'scale') {
    if (piano === null) {
      piano = await loadPianoSampler()
      setLoadingPercent(100)
    }
    const scaleNotes = Scale.get(toneData.scale.chroma).intervals.map(Note.transposeFrom('C')).map(v => (v) + '4')
    scaleNotes.push('C5')
    new Pattern(function (time, note) {
      piano.triggerAttackRelease(note, '4n', time)
    }, scaleNotes, 'up').start(0)
    Transport.bpm.value = 120
  } else if (toneData.type === 'chords' || toneData.type === 'melody') {
    if (piano === null) {
      piano = await loadPianoSampler()
      setLoadingPercent(100)
    }
    const visualMelody = setupMelodyExplanation(toneData.constellation)
    // const notesToPlay = toneData.melody ? toneData.chords.concat(toneData.melody) : toneData.chords
    const notesToPlay = toneData.melody ? toneData.melody : toneData.chords
    const totalBars = toneData.type === 'melody' ? notesToPlay.find(n => n.totalBars).totalBars : 4
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
    const totalBars = notesToPlay.find(n => n.totalBars).totalBars
    const timeForAnimation = 1000 * Math.pow(toneData.bpm / 60, -1) * 4 * totalBars

    if (toneData.url) {
      // console.log('has url', toneData.url)
      const playerLoadingPromise = new Promise(resolve => {
        for (const note of notesToPlay) {
          note.ignore = true
        }
        const player = new Player(toneData.url, function () {
          // console.log('Player loaded', toneData.url)
          resolve()
        }).toDestination()
        player.sync().start(0)
      })
      const playerLoadingPromiseResult = await playerLoadingPromise
      console.log('Player  promise resolved', toneData.url, playerLoadingPromiseResult)
      new Part((time, value) => {
        Draw.schedule(function () {
          triggeredAnimationAction(visualMelody, value, timeForAnimation)
        }, time)
      }, notesToPlay).start(0)
      setLoadingPercent(100)
    } else {
      for (const [i, track] of toneData.song.entries()) {
        // console.log('about to loadSampler', starData.instruments.notes, track.instrument, track.notes, track)
        track.sampler = await loadSampler(starData.instruments.notes, track.instrument, track.notes, track.type.startsWith('Melody'))
        // const sampler = piano
        console.log('track', i, track)
        setLoadingPercent(100 / toneData.song.length * i)

        new Part((time, value) => {
          // if (!value.ignore && !track.type.startsWith('Melody')) {
          if (!value.ignore) {
            track.sampler.triggerAttackRelease(value.note, value.duration, time)
          }
          Draw.schedule(function () {
            triggeredAnimationAction(visualMelody, value, timeForAnimation, track.instrument)
          }, time)
        }, track.notes).start(0)
      }
    }
    Transport.bpm.value = toneData.bpm
  }
  setLoadingPercent(100)
  hideLoadingText()
  Transport.start('+0.05')
}

export const getScaleNotesFromChrome = (chroma) => {
  return ScaleType.get(chroma).intervals.map(Note.transposeFrom('C')).map(v => (v) + '5')
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
  const type = ele.getAttribute('data-type')
  const constellationId = ele.getAttribute('data-constellation')
  const constellation = starData.constellations.find(c => c.constellation === constellationId)
  const url = ele.getAttribute('data-url')
  let toneData = {bpm: constellation.music.bpm, timeSig: constellation.music.timeSig, constellation, url: url}
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
  playToneClip(starData, toneData)
}
