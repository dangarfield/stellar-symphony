import {getScaleText, getToneDataFromElementAndPlay, stopToneClips, loadSampler, playRotate, stopRotate, playNextRotation, playNext} from './audio.js'
import {focusMapOnConstellation, setBgStarsVisibility} from './map.js'
import {Chart, ScatterController, LinearScale, PointElement, LineController, CategoryScale, LineElement, Legend} from 'chart.js'

Chart.register(ScatterController, LinearScale, PointElement, LineController, CategoryScale, LineElement, Legend)

export const updateSelectedConstellation = async (starData, constellationId, moveMap) => {
  // console.log('updateSelectedConstellation', starData.selectedConstellation ,constellationId,starData.selectedConstellation !== constellationId)
  if (starData.selectedConstellation !== constellationId) {
    for (const constellationData of starData.constellations) {
      if (constellationData.constellation === constellationId) {
        constellationData.highlightConstellation(true)
      } else {
        constellationData.highlightConstellation(false)
      }
    }
    starData.selectedConstellation = constellationId
    const constellationData = starData.constellations.find(c => c.constellation === constellationId)
    // constellationData.highlightConstellation(true)
    // Move map
    if (moveMap) {
      focusMapOnConstellation(constellationData)
    }

    // Ensure select box is correct
    const constellationSelect = document.querySelector('.constellation-select')
    if (constellationSelect.value !== constellationId) {
      constellationSelect.value = constellationId
    }

    // Set play button
    const toneClipEle = document.querySelector('.action-play.tone-clip')

    toneClipEle.setAttribute('data-type', 'song')
    toneClipEle.setAttribute('data-constellation', constellationData.constellation)
    toneClipEle.removeAttribute('data-url')
    if (constellationData.music.songPath) {
      toneClipEle.setAttribute('data-url', constellationData.music.songPath)
    }

    // Set info text
    const infoLong = document.querySelector('.info-long')
    infoLong.querySelector('.name').innerHTML = `${constellationData.constellationName} <span class="text-muted">(${constellationId})</span>`
    infoLong.querySelector('.info-body').innerHTML = generateConstellationMapDataHtml(constellationData, starData.instruments.tracks)
    for (const button of document.querySelectorAll('.info-body .tone-clip')) {
      button.addEventListener('click', function () {
        getToneDataFromElementAndPlay(starData, this)
      })
    }
    for (const select of document.querySelectorAll('.info-body .info-long-instrument-select')) {
      select.addEventListener('change', async function () {
        const instrument = this.value
        const trackType = this.getAttribute('data-type')

        const track = constellationData.music.songNotes.find(t => t.type === trackType)
        console.log('info-long-instrument-select change', trackType, instrument, track)
        track.instrument = instrument
        if (track.sampler) { // If this is playing, update the sampler
          track.sampler = await loadSampler(starData.instruments.notes, track.instrument, track.notes, track.type.startsWith('Melody'))
        }
      })
    }
  }
}
const getColor = (i) => {
  const Tableau20 = ['#4E79A7', '#A0CBE8', '#F28E2B', '#FFBE7D', '#59A14F', '#8CD17D', '#B6992D', '#F1CE63',
    '#499894', '#86BCB6', '#E15759', '#FF9D9A', '#79706E', '#BAB0AC', '#D37295', '#FABFD2', '#B07AA1', '#D4A6C8', '#9D7660', '#D7B5A6'
  ]
  return Tableau20[i % 20]
}
const toRomanNumeral = (i) => {
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
const getInstrumentSelectHtml = (trackType, constellationData, tracks) => {
  const instrument = constellationData.music.songNotes.find(t => t.type === trackType).instrument
  return `
    <div class="mb-3 row">
      <label class="col-sm-5 col-form-label form-select-sm">${trackType}</label>
      <div class="col-sm-7">
        <select class="form-select form-select-sm info-long-instrument-select" data-type="${trackType}">
        ${tracks[trackType].map(i => `<option value="${i}"${i === instrument ? ' selected' : ''}>${i}</option>`)}
        </select>
      </div>
    </div>`
}
const generateConstellationMapDataHtml = (constellationData, instruments) => {
  return `
    <p>
      Song:

      <i class="bi bi-play-circle tone-clip"
        data-constellation="${constellationData.constellation}" data-type="song">
        Real time
      </i>
      ${constellationData.music.songPath ? `
      - <i class="bi bi-play-circle tone-clip"
        data-constellation="${constellationData.constellation}" data-type="song" data-url="${constellationData.music.songPath}">
        Recording
      </i>` : ''}
    </p>
    </p>

    ${getInstrumentSelectHtml('Chords', constellationData, instruments)}
    ${getInstrumentSelectHtml('Chords Drone', constellationData, instruments)}
    ${getInstrumentSelectHtml('Melody 1', constellationData, instruments)}
    ${getInstrumentSelectHtml('Melody 2', constellationData, instruments)}
    ${getInstrumentSelectHtml('Root Bass', constellationData, instruments)}
    ${getInstrumentSelectHtml('High Notes', constellationData, instruments)}
    ${getInstrumentSelectHtml('Picking', constellationData, instruments)}
    ${getInstrumentSelectHtml('Fast Arpeggio', constellationData, instruments)}
    ${getInstrumentSelectHtml('Low Drone', constellationData, instruments)}
    ${getInstrumentSelectHtml('Drums', constellationData, instruments)}

    <p>
      Scale:
      <i class="bi bi-play-circle tone-clip"
        data-constellation="${constellationData.constellation}" data-type="scale">
        ${constellationData.music.scaleText}
      </i>
    </p>
    <p>
      Chords:
      <i class="bi bi-play-circle tone-clip"
        data-constellation="${constellationData.constellation}" data-type="chords">
        ${constellationData.music.chords.text}
      </i>
    </p>
    <p>
      Melody:
      <i class="bi bi-play-circle tone-clip"
        data-constellation="${constellationData.constellation}" data-type="melody">
        ${constellationData.music.melodyText}
      </i>
    </p>

    <p>
      Melody 2:
      <i class="bi bi-play-circle tone-clip"
        data-constellation="${constellationData.constellation}" data-type="melody2">
        ${constellationData.music.melody2Text}
      </i>
    </p>
    `
}
const drawScatterConstellationDiffChart = (constellationData, attribute, colorIndex, useMainStarsOnly) => {
  // eslint-disable-next-line no-new
  return new Chart(document.querySelector(`.${constellationData.constellation}-${attribute}${useMainStarsOnly ? '-main' : ''}`), {
    type: 'scatter',
    data: {
      datasets: [{
        label: `${constellationData.constellation} - ${attribute}${useMainStarsOnly ? ' - main' : ''}`,
        backgroundColor: getColor(colorIndex),
        borderColor: getColor(colorIndex),
        data: constellationData.diffs[`${attribute}${useMainStarsOnly ? 'Main' : ''}List`].map((d, di) => {
          return {
            y: d,
            x: di
          }
        })
      }]
    }
  })
}

const drawLineConstellationAveragesChart = (constellationData, attribute, colorIndex, additionalDatasets, useMainStarsOnly) => {
  // eslint-disable-next-line no-new
  return new Chart(document.querySelector(`.${constellationData.constellation}-${attribute}-ave${useMainStarsOnly ? '-main' : ''}`), {
    type: 'line',
    data: {
      labels: Array.from({
        length: constellationData[useMainStarsOnly ? 'rangesMain' : 'ranges'][attribute].averages.length
      }, (_, i) => i + 1),
      datasets: [{
        label: `${constellationData.constellation} - ${attribute} - average${useMainStarsOnly ? ' - main' : ''}`,
        backgroundColor: getColor(colorIndex),
        borderColor: getColor(colorIndex),
        data: constellationData[useMainStarsOnly ? 'rangesMain' : 'ranges'][attribute].averages,
        borderWidth: 1,
        hidden: !useMainStarsOnly
      }].concat(additionalDatasets)
    }
  })
}
const drawLineAllDiffsChart = (starData, attribute) => {
  // eslint-disable-next-line no-new
  return new Chart(document.querySelector(`.all-${attribute}`), {
    type: 'line',
    data: {
      labels: Array.from({
        length: starData.ranges[attribute].averages.length
      }, (_, i) => i + 1),
      datasets: starData.ranges[attribute].constellationDiffListData.map((d, i) => ({
        label: `${d.constellation} - ${attribute} - diff`,
        backgroundColor: getColor(i),
        borderColor: getColor(i),
        data: d.data,
        borderWidth: 1,
        hidden: d.constellation === 'ALL'
      }))
    }
  })
}
const graphData = {}
const preProcessGraphData = (starData) => {
  // console.log('preProcessGraphData: START')
  graphData.dataAbsmagAll = {
    label: `ALL - absmag - average`,
    backgroundColor: getColor(19),
    borderColor: getColor(19),
    data: starData.ranges.absmag.averages,
    borderWidth: 1,
    hidden: true
  }
  graphData.dataMagAll = {
    label: `ALL - mag - average`,
    backgroundColor: getColor(19),
    borderColor: getColor(19),
    data: starData.ranges.mag.averages,
    borderWidth: 1,
    hidden: true
  }
  graphData.dataRVAll = {
    label: `ALL - rv - average`,
    backgroundColor: getColor(19),
    borderColor: getColor(19),
    data: starData.ranges.rv.averages,
    borderWidth: 1,
    hidden: true
  }
  graphData.dataLumAll = {
    label: `ALL - lum - average`,
    backgroundColor: getColor(19),
    borderColor: getColor(19),
    data: starData.ranges.lum.averages,
    borderWidth: 1,
    hidden: true
  }
  graphData.dataCiAll = {
    label: `ALL - ci - average`,
    backgroundColor: getColor(19),
    borderColor: getColor(19),
    data: starData.ranges.ci.averages,
    borderWidth: 1,
    hidden: true
  }

  for (const [i, constellationData] of starData.constellations.entries()) {
    // console.log(`Processing ${i + 1} of ${starData.constellations.length} - ${constellationData.constellationName} - ${constellationData.constellation}`)

    // console.log('list', absmagList, magList)
    const absmagConstellationDiff = {
      label: `${constellationData.constellation} - absmag - diff`,
      backgroundColor: getColor(i),
      borderColor: getColor(i),
      data: constellationData.ranges.absmag.diffs,
      borderWidth: 1
    }
    // absmagConstellationDiffList.push(absmagConstellationDiff)
    const magConstellationDiff = {
      label: `${constellationData.constellation} - mag - diff`,
      backgroundColor: getColor(i),
      borderColor: getColor(i),
      data: constellationData.ranges.mag.diffs,
      borderWidth: 1
    }
    // magConstellationDiffList.push(magConstellationDiff)
    const rvConstellationDiff = {
      label: `${constellationData.constellation} - rv - diff`,
      backgroundColor: getColor(i),
      borderColor: getColor(i),
      data: constellationData.ranges.rv.diffs,
      borderWidth: 1
    }
    // rvConstellationDiffList.push(rvConstellationDiff)
    const lumConstellationDiff = {
      label: `${constellationData.constellation} - lum - diff`,
      backgroundColor: getColor(i),
      borderColor: getColor(i),
      data: constellationData.ranges.lum.diffs,
      borderWidth: 1
    }
    // lumConstellationDiffList.push(lumConstellationDiff)
    const ciConstellationDiff = {
      label: `${constellationData.constellation} - ci - diff`,
      backgroundColor: getColor(i),
      borderColor: getColor(i),
      data: constellationData.ranges.ci.diffs,
      borderWidth: 1
    }
    constellationData.graphData = {
      absmagConstellationDiff,
      magConstellationDiff,
      rvConstellationDiff,
      lumConstellationDiff,
      ciConstellationDiff
    }
  }
}

const addConstellationSelectOptions = (starData) => {
  const constellationSelect = document.querySelector('.constellation-select')
  for (const constellation of starData.constellations) {
    const opt = document.createElement('option')
    opt.value = constellation.constellation
    opt.text = constellation.constellationName
    if (constellation.music.isFavourite) { opt.text += ' (Favourite)' }
    constellationSelect.add(opt)
  }

  constellationSelect.addEventListener('change', function () {
    const constellationId = this.value
    console.log('select constellation', constellationId)
    updateSelectedConstellation(starData, constellationId, true)
  })
}
const processMandatoryConstellationData = (starData) => {
  for (const constellationData of starData.constellations) {
    // Music Data
    constellationData.music.scaleText = getScaleText(constellationData.music.scale.chroma)
    constellationData.music.chords.text = constellationData.music.chords.structure.map(v => toRomanNumeral(v.interval) + (v.decoration ? `add${v.decoration}` : '')).join(', ')
    constellationData.music.melodyText = constellationData.music.melody.filter(m => !m.ignore).map(m => `${m.note}-${m.time}`).join(', ')
    constellationData.music.melody2Text = constellationData.music.melody2.filter(m => !m.ignore).map(m => `${m.note}-${m.time}`).join(', ')
  }
}
const bindInfoClose = () => {
  document.querySelector('.info-long .close').addEventListener('click', function () {
    hideInfoLong()
  })
  document.querySelector('.info-full .close').addEventListener('click', function () {
    hideInfoGraphAll()
    hideInfoGraphOne()
    hideInfoExplain()
  })
}

const activeGraphs = []
const destroyAllGraphs = () => {
  const graphsToBeRemoved = []
  while (activeGraphs.length > 0) graphsToBeRemoved.push(activeGraphs.pop())
  // console.log('destroyAllGraphs', activeGraphs, graphsToBeRemoved)
  for (const graphToBeRemoved of graphsToBeRemoved) {
    graphToBeRemoved.destroy()
  }
}
const populateGraphAllInfo = (starData) => {
  document.querySelector('.info-full .name').textContent = 'Analysis of all constellations'
  // console.log('graphData', graphData)

  document.querySelector('.info-full .info-body').innerHTML = `
  <div class="col-12 bg-light"><canvas class="all-absmag"></canvas></div>
  <div class="col-12 bg-light"><canvas class="all-mag"></canvas></div>
  <div class="col-12 bg-light"><canvas class="all-rv"></canvas></div>
  <div class="col-12 bg-light"><canvas class="all-lum"></canvas></div>
  <div class="col-12 bg-light"><canvas class="all-ci"></canvas></div>`
  // <div class="col-12 bg-light"><canvas class="all-hr"></canvas></div>`
  activeGraphs.push(drawLineAllDiffsChart(starData, 'absmag'))
  activeGraphs.push(drawLineAllDiffsChart(starData, 'mag'))
  activeGraphs.push(drawLineAllDiffsChart(starData, 'rv'))
  activeGraphs.push(drawLineAllDiffsChart(starData, 'lum'))
  activeGraphs.push(drawLineAllDiffsChart(starData, 'ci'))

  // Slows loading, leave commented for now
  // new Chart(document.querySelector(`.all-hr`), {
  //     type: 'scatter',
  //     data: {
  //         datasets: starData.hrAllListData.map((d,i) => ({
  //             label: `${d.constellation} - hr`,
  //             backgroundColor: getColor(i),
  //             borderColor: getColor(i),
  //             data: d.data
  //         }))
  //     },
  //     options: {
  //         scales: {
  //             y: {
  //                 reverse: true,
  //                 min: -5,
  //                 max: 17
  //             }
  //         }
  //     }
  // })
}
const populateGraphOneInfo = (starData) => {
  const i = starData.constellations.findIndex(c => c.constellation === document.querySelector('.constellation-select').value)
  const constellationData = starData.constellations[i]
  document.querySelector('.info-full .name').textContent = `Analysis of ${constellationData.constellationName}`
  document.querySelector('.info-full .info-body').innerHTML = `

  <div class="col-12 bg-light"><canvas class="all-absmag"></canvas></div>
  <div class="col-12 bg-light"><canvas class="all-mag"></canvas></div>
  <div class="col-12 bg-light"><canvas class="all-rv"></canvas></div>
  <div class="col-12 bg-light"><canvas class="all-lum"></canvas></div>
  <div class="col-12 bg-light"><canvas class="all-ci"></canvas></div>

  <div class="row holder">
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-absmag"></canvas></div>
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-mag"></canvas></div>
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-rv"></canvas></div>
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-lum"></canvas></div>
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-ci"></canvas></div>
    <div class="col-md-3 bg-light"></div>
    <div class="col-md-3 bg-light"></div>
    <div class="col-md-3 bg-light"></div>

    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-absmag-main"></canvas></div>
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-mag-main"></canvas></div>
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-rv-main"></canvas></div>
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-lum-main"></canvas></div>
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-ci-main"></canvas></div>
    <div class="col-md-3 bg-light"></div>
    <div class="col-md-3 bg-light"></div>
    <div class="col-md-3 bg-light"></div>

    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-absmag-ave"></canvas></div>
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-mag-ave"></canvas></div>
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-rv-ave"></canvas></div>
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-lum-ave"></canvas></div>
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-ci-ave"></canvas></div>
    <div class="col-md-3 bg-light"></div>
    <div class="col-md-3 bg-light"></div>
    <div class="col-md-3 bg-light"></div>

    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-absmag-ave-main"></canvas></div>
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-mag-ave-main"></canvas></div>
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-rv-ave-main"></canvas></div>
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-lum-ave-main"></canvas></div>
    <div class="col-md-3 bg-light"><canvas class="${constellationData.constellation}-ci-ave-main"></canvas></div>
    <div class="col-md-3 bg-light"></div>
    <div class="col-md-3 bg-light"></div>
    <div class="col-md-3 bg-light"></div>
  </div>`

  // All constellation data
  activeGraphs.push(drawLineAllDiffsChart(starData, 'absmag'))
  activeGraphs.push(drawLineAllDiffsChart(starData, 'mag'))
  activeGraphs.push(drawLineAllDiffsChart(starData, 'rv'))
  activeGraphs.push(drawLineAllDiffsChart(starData, 'lum'))
  activeGraphs.push(drawLineAllDiffsChart(starData, 'ci'))

  // Sorted all stars
  activeGraphs.push(drawScatterConstellationDiffChart(constellationData, 'absmag', i))
  activeGraphs.push(drawScatterConstellationDiffChart(constellationData, 'mag', i))
  activeGraphs.push(drawScatterConstellationDiffChart(constellationData, 'rv', i))
  activeGraphs.push(drawScatterConstellationDiffChart(constellationData, 'lum', i))
  activeGraphs.push(drawScatterConstellationDiffChart(constellationData, 'ci', i))

  // Sorted main stars
  activeGraphs.push(drawScatterConstellationDiffChart(constellationData, 'absmag', i, true))
  activeGraphs.push(drawScatterConstellationDiffChart(constellationData, 'mag', i, true))
  activeGraphs.push(drawScatterConstellationDiffChart(constellationData, 'rv', i, true))
  activeGraphs.push(drawScatterConstellationDiffChart(constellationData, 'lum', i, true))
  activeGraphs.push(drawScatterConstellationDiffChart(constellationData, 'ci', i, true))

  // AVERAGES - ALL
  activeGraphs.push(drawLineConstellationAveragesChart(constellationData, 'absmag', i, [constellationData.graphData.absmagConstellationDiff, graphData.dataAbsmagAll]))
  activeGraphs.push(drawLineConstellationAveragesChart(constellationData, 'mag', i, [constellationData.graphData.magConstellationDiff, graphData.dataMagAll]))
  activeGraphs.push(drawLineConstellationAveragesChart(constellationData, 'rv', i, [constellationData.graphData.rvConstellationDiff, graphData.dataRVAll]))
  activeGraphs.push(drawLineConstellationAveragesChart(constellationData, 'lum', i, [constellationData.graphData.lumConstellationDiff, graphData.dataLumAll]))
  activeGraphs.push(drawLineConstellationAveragesChart(constellationData, 'ci', i, [constellationData.graphData.ciConstellationDiff, graphData.dataCiAll]))

  // AVERAGES - MAIN
  activeGraphs.push(drawLineConstellationAveragesChart(constellationData, 'absmag', i, [graphData.dataAbsmagAll], true))
  activeGraphs.push(drawLineConstellationAveragesChart(constellationData, 'mag', i, [graphData.dataMagAll], true))
  activeGraphs.push(drawLineConstellationAveragesChart(constellationData, 'rv', i, [graphData.dataRVAll], true))
  activeGraphs.push(drawLineConstellationAveragesChart(constellationData, 'lum', i, [graphData.dataLumAll], true))
  activeGraphs.push(drawLineConstellationAveragesChart(constellationData, 'ci', i, [graphData.dataCiAll], true))

  // TODO - Fix styling for col-3
}
const populateExplainInfo = (starData) => {
  document.querySelector('.info-full .name').textContent = 'How it all works'
  document.querySelector('.info-full .info-body').innerHTML = `<div class="readme">${starData.readme}</div>`
}
export const showDefaultInfoWindow = (starData) => {
  if (window.localStorage.getItem('has-loaded')) {
    showInfoLong()
    removeClickMe()
  } else {
    showInfoExplain(starData)
    window.localStorage.setItem('has-loaded', true)
  }
}
const showInfoLong = () => {
  hideAllOverlays()
  document.querySelector('.info-long').style.display = 'flex'
  document.querySelector('.action-info').classList.add('active')
}
const hideInfoLong = () => {
  document.querySelector('.info-long').style.display = 'none'
  document.querySelector('.action-info').classList.remove('active')
}
export const showAllStars = () => {
  setBgStarsVisibility(true)
  document.querySelector('.action-all-stars').classList.add('active')
}
export const hideAllStars = () => {
  setBgStarsVisibility(false)
  document.querySelector('.action-all-stars').classList.remove('active')
}
const showInfoGraphAll = (starData) => {
  hideAllOverlays()
  populateGraphAllInfo(starData)
  document.querySelector('.info-full').style.display = 'flex'
  document.querySelector('.action-graph-all').classList.add('active')
}
const hideInfoGraphAll = () => {
  destroyAllGraphs()
  document.querySelector('.info-full').style.display = 'none'
  document.querySelector('.action-graph-all').classList.remove('active')
}
const showInfoGraphOne = (starData) => {
  hideAllOverlays()
  populateGraphOneInfo(starData)
  document.querySelector('.info-full').style.display = 'flex'
  document.querySelector('.action-graph-one').classList.add('active')
}
const hideInfoGraphOne = () => {
  destroyAllGraphs()
  document.querySelector('.info-full').style.display = 'none'
  document.querySelector('.action-graph-one').classList.remove('active')
}
const showInfoExplain = (starData) => {
  hideAllOverlays()
  populateExplainInfo(starData)
  document.querySelector('.info-full').style.display = 'flex'
  document.querySelector('.action-explain').classList.add('active')
}
const hideInfoExplain = () => {
  destroyAllGraphs()
  document.querySelector('.info-full').style.display = 'none'
  document.querySelector('.action-explain').classList.remove('active')
}
const hideAllOverlays = () => {
  destroyAllGraphs()
  hideInfoLong()
  hideInfoGraphAll()
  hideInfoGraphOne()
  hideInfoExplain()
}
const removeClickMe = () => {
  const clickMeEle = document.querySelector('.tooltip-clickme')
  // console.log('removeClickMe', clickMeEle)
  if(clickMeEle) clickMeEle.remove()
}
const bindActionLinks = (starData) => {
  document.querySelector('.action-play').addEventListener('click', function () {
    removeClickMe()
    this.classList.contains('active') ? stopToneClips() : getToneDataFromElementAndPlay(starData, this)
  })
  document.querySelector('.action-info').addEventListener('click', function () {
    this.classList.contains('active') ? hideInfoLong() : showInfoLong()
  })
  document.querySelector('.action-graph-all').addEventListener('click', function () {
    this.classList.contains('active') ? hideInfoGraphAll() : showInfoGraphAll(starData)
  })
  document.querySelector('.action-graph-one').addEventListener('click', function () {
    this.classList.contains('active') ? hideInfoGraphOne() : showInfoGraphOne(starData)
  })
  document.querySelector('.action-all-stars').addEventListener('click', function () {
    this.classList.contains('active') ? hideAllStars() : showAllStars()
  })
  document.querySelector('.action-explain').addEventListener('click', function () {
    this.classList.contains('active') ? hideInfoExplain() : showInfoExplain(starData)
  })
  document.querySelector('.action-play-rotate').addEventListener('click', function () {
    removeClickMe()
    this.classList.contains('active') ? stopRotate() : playRotate()
  })
  document.querySelector('.action-next').addEventListener('click', function () {
    const dontPlay = !document.querySelector('.action-play').classList.contains('active')
    document.querySelector('.action-play-rotate').classList.contains('active') ? playNextRotation(dontPlay) : playNext(dontPlay)
  })
}
export const initConstellationData = (starData) => {
  addConstellationSelectOptions(starData)
  bindInfoClose()
  bindActionLinks(starData)
  processMandatoryConstellationData(starData)
  preProcessGraphData(starData)
  // const allIn = []
  // for (const [track, instrus] of Object.entries(starData.instruments.tracks)) {
  //   // console.log(`${track}: ${instrus}`)
  //   for (const instru of instrus) {
  //     if (instru.substring(0, 4) !== instru.substring(0, 4).toUpperCase() && !allIn.includes(instru)) {
  //       allIn.push(instru)
  //     }
  //   }
  // }
  // allIn.sort()
  // console.log('allIn')
  // console.log(allIn)
}
