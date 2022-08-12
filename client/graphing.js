import {setLoadingText} from './utils.js'
import {getScaleText, getToneDataFromElementAndPlay} from './audio.js'
import {focusMapOnConstellation} from './map.js'
import {Chart, ScatterController, LinearScale, PointElement, LineController, CategoryScale, LineElement, Legend} from 'chart.js'
Chart.register(ScatterController, LinearScale, PointElement, LineController, CategoryScale, LineElement, Legend)

export const updateSelectedConstellation = (starData, constellationId, moveMap) => {
  // console.log('updateSelectedConstellation', starData.selectedConstellation ,constellationId,starData.selectedConstellation !== constellationId)
  if (starData.selectedConstellation !== constellationId) {
    starData.selectedConstellation = constellationId
    const constellationData = starData.constellations.find(c => c.constellation === constellationId)
    if (moveMap) {
      focusMapOnConstellation(constellationData)
    }
    const selectedConstellationHtml = generateConstellationMapDataHtml(constellationData)
    document.querySelector('.selected-constellation').innerHTML = selectedConstellationHtml
    for (const button of document.querySelectorAll('.selected-constellation .tone-clip')) {
      button.addEventListener('click', function () {
        // console.log('this', this)\
        getToneDataFromElementAndPlay(starData, this)
      })
    }
    // console.log('updated selected constellation', constellationId)
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
const generateConstellationMapDataHtml = (constellationData) => {
  return `
    <h5 class="mt-3">${constellationData.constellationName} - ${constellationData.constellation}
        <span class="badge rounded-pill text-bg-secondary tone-clip" data-constellation="${constellationData.constellation}" data-type="song">
                                                        <i class="bi bi-play-circle"></i>
                                                    </span>
        ${constellationData.music.songPath ? `<span class="badge rounded-pill text-bg-primary tone-clip" data-url="${constellationData.music.songPath}">
                                                        <i class="bi bi-play-circle"></i>
                                                    </span>` : ''}</h5>
    <p>Scale: ${constellationData.music.scaleText}<br />
        <span class="badge rounded-pill text-bg-secondary tone-clip" data-constellation="${constellationData.constellation}" data-type="scale">
                                                        <i class="bi bi-play-circle"></i>
                                                    </span>
    </p>
    <p>Chords: ${constellationData.music.chords.text}<br />
        <span class="badge rounded-pill text-bg-secondary tone-clip" data-constellation="${constellationData.constellation}" data-type="chords">
                                                        <i class="bi bi-play-circle"></i>
                                                    </span>
    </p>
    <p>Melody: ${constellationData.music.melodyText}<br />
        <span class="badge rounded-pill text-bg-secondary tone-clip" data-constellation="${constellationData.constellation}" data-type="melody">
                                                        <i class="bi bi-play-circle"></i>
                                                    </span>
    </p>

    <p>Melody2: ${constellationData.music.melody2Text}<br />
        <span class="badge rounded-pill text-bg-secondary tone-clip" data-constellation="${constellationData.constellation}" data-type="melody2">
                                                        <i class="bi bi-play-circle"></i>
                                                    </span>
    </p>`
}
const generateConstellationGraphHtml = (constellationData, showCharts) => {
  return `
    <div class="row">
        <h3>${constellationData.constellationName} - ${constellationData.constellation}
        <span class="badge rounded-pill text-bg-secondary tone-clip" data-constellation="${constellationData.constellation}" data-type="song">
                                                        <i class="bi bi-play-circle"></i>
                                                    </span>
        ${constellationData.music.songPath ? `<span class="badge rounded-pill text-bg-primary tone-clip" data-url="${constellationData.music.songPath}">
                                                        <i class="bi bi-play-circle"></i>
                                                    </span>` : ''}
                                                    </h3>

        <div class="col-3">
            <p>Stars Total: ${constellationData.stars.length}</p>
            <p>Stars Main Total: ${constellationData.starsMain.length}</p>
        </div>
        <div class="col-3">
            <p>Scale: ${constellationData.music.scaleText}
                <span class="badge rounded-pill text-bg-secondary tone-clip" data-constellation="${constellationData.constellation}" data-type="scale">
                    <i class="bi bi-play-circle"></i>
                </span>
            </p>
            <p>Chords: ${constellationData.music.chords.text}
                <span class="badge rounded-pill text-bg-secondary tone-clip" data-constellation="${constellationData.constellation}" data-type="chords">
                    <i class="bi bi-play-circle"></i>
                </span>
            </p>
            <p>Melody: ${constellationData.music.melodyText}
                <span class="badge rounded-pill text-bg-secondary tone-clip" data-constellation="${constellationData.constellation}" data-type="melody">
                    <i class="bi bi-play-circle"></i>
                </span>
            </p>

            <p>Melody2: ${constellationData.music.melody2Text}
                <span class="badge rounded-pill text-bg-secondary tone-clip" data-constellation="${constellationData.constellation}" data-type="melody2">
                    <i class="bi bi-play-circle"></i>
                </span>
            </p>
        </div>
        ${showCharts ? `
        <div class="col-3">
            <!--<p>Stars Main Total: ${constellationData.starsMain.length}</p>-->
        </div>
        <div class="col-3">
            <!--<p>Stars Main Total: ${constellationData.starsMain.length}</p>-->
        </div>

        <div class="col-3"><canvas class="${constellationData.constellation}-absmag"></canvas></div>
        <div class="col-3"><canvas class="${constellationData.constellation}-mag"></canvas></div>
        <div class="col-3"><canvas class="${constellationData.constellation}-rv"></canvas></div>
        <div class="col-3"><canvas class="${constellationData.constellation}-lum"></canvas></div>
        <div class="col-3"><canvas class="${constellationData.constellation}-ci"></canvas></div>
        <div class="col-3"></div>
        <div class="col-3"></div>
        <div class="col-3"></div>

        <div class="col-3"><canvas class="${constellationData.constellation}-absmag-main"></canvas></div>
        <div class="col-3"><canvas class="${constellationData.constellation}-mag-main"></canvas></div>
        <div class="col-3"><canvas class="${constellationData.constellation}-rv-main"></canvas></div>
        <div class="col-3"><canvas class="${constellationData.constellation}-lum-main"></canvas></div>
        <div class="col-3"><canvas class="${constellationData.constellation}-ci-main"></canvas></div>
        <div class="col-3"></div>
        <div class="col-3"></div>
        <div class="col-3"></div>

        <div class="col-3"><canvas class="${constellationData.constellation}-absmag-ave"></canvas></div>
        <div class="col-3"><canvas class="${constellationData.constellation}-mag-ave"></canvas></div>
        <div class="col-3"><canvas class="${constellationData.constellation}-rv-ave"></canvas></div>
        <div class="col-3"><canvas class="${constellationData.constellation}-lum-ave"></canvas></div>
        <div class="col-3"><canvas class="${constellationData.constellation}-ci-ave"></canvas></div>
        <div class="col-3"></div>
        <div class="col-3"></div>
        <div class="col-3"></div>

        <div class="col-3"><canvas class="${constellationData.constellation}-absmag-ave-main"></canvas></div>
        <div class="col-3"><canvas class="${constellationData.constellation}-mag-ave-main"></canvas></div>
        <div class="col-3"><canvas class="${constellationData.constellation}-rv-ave-main"></canvas></div>
        <div class="col-3"><canvas class="${constellationData.constellation}-lum-ave-main"></canvas></div>
        <div class="col-3"><canvas class="${constellationData.constellation}-ci-ave-main"></canvas></div>
        <div class="col-3"></div>
        <div class="col-3"></div>
        <div class="col-3"></div>
        ` : ``}
    </div>`
}
const drawScatterConstellationDiffChart = (constellationData, attribute, colorIndex, useMainStarsOnly) => {
  // eslint-disable-next-line no-new
  new Chart(document.querySelector(`.${constellationData.constellation}-${attribute}${useMainStarsOnly ? '-main' : ''}`), {
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
  new Chart(document.querySelector(`.${constellationData.constellation}-${attribute}-ave${useMainStarsOnly ? '-main' : ''}`), {
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
  new Chart(document.querySelector(`.all-${attribute}`), {
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
export const addConstellationGraphs = (starData) => {
  const dataAbsmagAll = {
    label: `ALL - absmag - average`,
    backgroundColor: getColor(19),
    borderColor: getColor(19),
    data: starData.ranges.absmag.averages,
    borderWidth: 1,
    hidden: true
  }
  const dataMagAll = {
    label: `ALL - mag - average`,
    backgroundColor: getColor(19),
    borderColor: getColor(19),
    data: starData.ranges.mag.averages,
    borderWidth: 1,
    hidden: true
  }
  const dataRVAll = {
    label: `ALL - rv - average`,
    backgroundColor: getColor(19),
    borderColor: getColor(19),
    data: starData.ranges.rv.averages,
    borderWidth: 1,
    hidden: true
  }
  const dataLumAll = {
    label: `ALL - lum - average`,
    backgroundColor: getColor(19),
    borderColor: getColor(19),
    data: starData.ranges.lum.averages,
    borderWidth: 1,
    hidden: true
  }
  const dataCiAll = {
    label: `ALL - ci - average`,
    backgroundColor: getColor(19),
    borderColor: getColor(19),
    data: starData.ranges.ci.averages,
    borderWidth: 1,
    hidden: true
  }

  for (const [i, constellationData] of starData.constellations.entries()) {
    console.log(`Processing ${i + 1} of ${starData.constellations.length} - ${constellationData.constellationName} - ${constellationData.constellation}`)
    setLoadingText(`Drawing graphs for ${constellationData.constellationName} (${i + 1} of ${starData.constellations.length})`)
    // console.log('constellationData', constellationData)
    const div = document.createElement('div')
    div.classList.add('constellation')
    div.setAttribute('data-constellation', constellationData.constellation)

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
    // ciConstellationDiffList.push(ciConstellationDiff)

    constellationData.music.scaleText = getScaleText(constellationData.music.scale.chroma)

    constellationData.music.chords.text = constellationData.music.chords.structure.map(v => toRomanNumeral(v.interval) + (v.decoration ? `add${v.decoration}` : '')).join(', ')

    constellationData.music.melodyText = constellationData.music.melody.map(m => `${m.note}-${m.time}`).join(', ')
    constellationData.music.melody2Text = constellationData.music.melody2.map(m => `${m.note}-${m.time}`).join(', ')

    div.innerHTML = generateConstellationGraphHtml(constellationData, starData.showCharts)

    document.querySelector('.constellations').appendChild(div)

    if (starData.showCharts) {
      // Sorted all stars
      drawScatterConstellationDiffChart(constellationData, 'absmag', i)
      drawScatterConstellationDiffChart(constellationData, 'mag', i)
      drawScatterConstellationDiffChart(constellationData, 'rv', i)
      drawScatterConstellationDiffChart(constellationData, 'lum', i)
      drawScatterConstellationDiffChart(constellationData, 'ci', i)

      // Sorted main stars
      drawScatterConstellationDiffChart(constellationData, 'absmag', i, true)
      drawScatterConstellationDiffChart(constellationData, 'mag', i, true)
      drawScatterConstellationDiffChart(constellationData, 'rv', i, true)
      drawScatterConstellationDiffChart(constellationData, 'lum', i, true)
      drawScatterConstellationDiffChart(constellationData, 'ci', i, true)

      // AVERAGES - ALL
      drawLineConstellationAveragesChart(constellationData, 'absmag', i, [absmagConstellationDiff, dataAbsmagAll])
      drawLineConstellationAveragesChart(constellationData, 'mag', i, [magConstellationDiff, dataMagAll])
      drawLineConstellationAveragesChart(constellationData, 'rv', i, [rvConstellationDiff, dataRVAll])
      drawLineConstellationAveragesChart(constellationData, 'lum', i, [lumConstellationDiff, dataLumAll])
      drawLineConstellationAveragesChart(constellationData, 'ci', i, [ciConstellationDiff, dataCiAll])

      // AVERAGES - MAIN
      drawLineConstellationAveragesChart(constellationData, 'absmag', i, [dataAbsmagAll], true)
      drawLineConstellationAveragesChart(constellationData, 'mag', i, [dataMagAll], true)
      drawLineConstellationAveragesChart(constellationData, 'rv', i, [dataRVAll], true)
      drawLineConstellationAveragesChart(constellationData, 'lum', i, [dataLumAll], true)
      drawLineConstellationAveragesChart(constellationData, 'ci', i, [dataCiAll], true)
    }
  }

  console.log('Drawing ALL graphs')
  const allDiv = document.createElement('div')
  allDiv.classList.add('all-constellation')

  allDiv.innerHTML = `<div class="row">
                <div class="col-12"><h3>Visual</h3></div>
                <div class="col-10 star-map"></div>
                <div class="col-2">
                    <h4>Constellations</h4>
                    <select class="form-select constellation-select">
                        <option style="display:none" value="">Select constellation</option>
                        ${starData.constellations.map(c => `<option value="${c.constellation}">${c.constellationName}</option>`)}
                    </select>
                    <div class="selected-constellation"></div>
                </div>
                <div class="col-12"><h3>All</h3></div>
                <div class="col-12"><canvas class="all-absmag"></canvas></div>
                <div class="col-12"><canvas class="all-mag"></canvas></div>
                <div class="col-12"><canvas class="all-rv"></canvas></div>
                <div class="col-12"><canvas class="all-lum"></canvas></div>
                <div class="col-12"><canvas class="all-ci"></canvas></div>
                <div class="col-12"><canvas class="all-hr"></canvas></div>
            </div>`
  document.querySelector('.constellations').prepend(allDiv)
  document.querySelector('.constellation-select').addEventListener('change', function () {
    const constellationId = this.value
    console.log('select constellation', constellationId)
    updateSelectedConstellation(starData, constellationId, true)
  })

  // ALL graphs
  drawLineAllDiffsChart(starData, 'absmag')
  drawLineAllDiffsChart(starData, 'mag')
  drawLineAllDiffsChart(starData, 'rv')
  drawLineAllDiffsChart(starData, 'lum')
  drawLineAllDiffsChart(starData, 'ci')
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

  for (const button of document.querySelectorAll('.tone-clip')) {
    button.addEventListener('click', function () {
      getToneDataFromElementAndPlay(starData, this)
    })
  }
}
