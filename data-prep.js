const csv = require('csv-parser')
const fs = require('fs-extra')
const _ = require('lodash')

const saveDataStep = (fileName, obj) => {
  fs.writeJsonSync(`data-steps/${fileName}.json`, obj)
}
const loadDataStep = (fileName) => {
  if (fs.existsSync(`data-steps/${fileName}.json`)) {
    return fs.readJsonSync(`data-steps/${fileName}.json`)
  }
}

const getRawData = async () => {
  const rawStarData = await getStarData()
  const constellationShip = getConstellationShipData()
  const constellationNames = getConstellationNamesData()
  return {rawStarData, constellationShip, constellationNames}
}
const getStarData = async () => {
//   const dataStepResult = loadDataStep('getStarData')
//   if (dataStepResult) {
//     return dataStepResult
//   }

  return new Promise((resolve, reject) => {
    let results = []
    fs.createReadStream('data/hygdata_v3.csv')
      .pipe(csv())
      .on('data', (data) => {
        data.absmag = parseFloat(data.absmag)
        // if (data.absmag < 0) {
        //   delete data.absmag
        // }
        data.mag = parseFloat(data.mag)
        // if (data.mag < 7) {
        //   delete data.mag
        // }
        data.rv = parseFloat(data.rv)

        // if (data.rv === 0) {
        //   delete data.rv
        // }
        data.lum = parseFloat(data.lum)
        // if (data.lum < 1) {
        //   delete data.lum
        // }
        data.ci = parseFloat(data.ci)
        results.push(data)
      })
      .on('end', () => {
        // console.log(results)
        // results = results.filter(r => r.con === 'Sct')
        // results = _.groupBy(results, 'con')
        // results = _.map(results, (v, k) => ({constellation: k, stars: v}))

        results = _.chain(results)
          .filter(r => r.con !== '')
          //   .filter(r => r.con === 'Sct')
          // .filter(r => r.con.includes('S'))
          //   .filter(r => r.absmag < 7)
          //   .groupBy('con')
          //   .map((v, k) => ({constellation: k, stars: v}))
          .value()
        // saveDataStep('getStarData', results)
        resolve(results)
      })
  })
}
const getConstellationShipData = () => {
  let data = fs.readFileSync('data/constellationship.fab', 'utf-8')
  data = data.split('\n')
  //   data = data.split(/\s+/)
  data = data.map(d => {
    const dSplit = d.split(' ')// d.split[/\t+/]
    return {
      constellation: dSplit[0],
      lines: _.chunk(dSplit.slice(3), 2)
    }
  })
  //   console.log('data', data, data.length)
  return data
}
const getConstellationNamesData = () => {
  let data = fs.readFileSync('data/constellation_names.eng.fab', 'utf-8')
  data = data.split('\n')
  //   data = data.split(/\s+/)
  data = data.map(d => {
    const dSplit = d.split('\t')// d.split[/\t+/]
    return {constellation: dSplit[0], constellationName: dSplit[1].replaceAll('"', '')}
  })
  //   console.log('data', data, data.length)
  return data
}
const groupByConstellation = (rawData) => {
//   console.log('constellationShip', constellationShip)
  return _.chain(rawData.rawStarData)
    .filter(r => r.con !== '')
    // .filter(r => r.con === 'Sct')
    // .filter(r => r.con.includes('S'))
    .groupBy('con')
    .map((v, k) => (
      _.defaults(
        {constellation: k, stars: v},
        rawData.constellationShip.find(c => c.constellation === k),
        rawData.constellationNames.find(c => c.constellation === k)
      ))
    )
    .map(v => {
      v.starsMain = _.uniq(_.flatten(v.lines)).map(sid => v.stars.find(s => s.hip === sid)).filter(s => s !== undefined)
      return v
    })
    .value()
}
const getRange = (min, max, totalSteps) => {
  let range = _.range(min, max, (max - min) / (totalSteps))
  range.push(max)
  range.shift()
  return range
}

const getAverages = (ranges, attr, stars) => {
  const averages = new Array(ranges.length).fill(0)
  const starCountNormlisedStep = (1 / stars.length)
  for (const star of stars) {
    let selectedBucketId = 0
    for (let bucketId = 0; bucketId < ranges.length; bucketId++) {
      if (star && star[attr] && star[attr] <= ranges[bucketId]) {
        selectedBucketId = bucketId
        break
      }
    }
    averages[selectedBucketId] += starCountNormlisedStep
  }
  return averages
}
const getMinMaxAndRanges = (stars, allRanges) => {
  const totalSteps = 12 * 2
  const ranges = {
    absmag: {
      min: _.minBy(stars, 'absmag').absmag,
      max: _.maxBy(stars, 'absmag').absmag,
      mean: _.meanBy(stars, 'absmag')
    },
    mag: {
      min: _.minBy(stars, 'mag').mag,
      max: _.maxBy(stars, 'mag').mag,
      mean: _.meanBy(stars, 'mag')
    },
    rv: {
      min: _.minBy(stars, 'rv').rv,
      max: _.maxBy(stars, 'rv').rv,
      mean: _.meanBy(stars, 'rv')
    },
    lum: {
      min: _.minBy(stars, 'lum').lum,
      max: _.maxBy(stars, 'lum').lum,
      mean: _.meanBy(stars, 'lum')
    },

    ci: {
      min: _.minBy(stars, 'ci').ci,
      max: _.maxBy(stars, 'ci').ci,
      mean: _.meanBy(stars, 'ci')
    }
  }
  ranges.absmag.ranges = getRange(ranges.absmag.min, ranges.absmag.max, totalSteps)
  ranges.mag.ranges = getRange(ranges.mag.min, ranges.mag.max, totalSteps)
  ranges.rv.ranges = getRange(ranges.rv.min, ranges.rv.max, totalSteps)
  ranges.lum.ranges = getRange(ranges.lum.min, ranges.lum.max, totalSteps)
  ranges.ci.ranges = getRange(ranges.ci.min, ranges.ci.max, totalSteps)

  ranges.absmag.averages = getAverages(allRanges ? allRanges.absmag.ranges : ranges.absmag.ranges, 'absmag', stars)
  ranges.mag.averages = getAverages(allRanges ? allRanges.mag.ranges : ranges.mag.ranges, 'mag', stars)
  ranges.rv.averages = getAverages(allRanges ? allRanges.rv.ranges : ranges.rv.ranges, 'rv', stars)
  ranges.lum.averages = getAverages(allRanges ? allRanges.lum.ranges : ranges.lum.ranges, 'lum', stars)
  ranges.ci.averages = getAverages(allRanges ? allRanges.ci.ranges : ranges.ci.ranges, 'ci', stars)

  //   console.log('ranges', ranges)
  return ranges
}
const setMinMaxAndRangesForConstellations = (groupedByConstellation, allRanges) => {
  for (const constellation of groupedByConstellation) {
    // console.log('constellation', constellation)
    constellation.ranges = getMinMaxAndRanges(constellation.stars, allRanges)
    constellation.rangesMain = getMinMaxAndRanges(constellation.starsMain, allRanges)
  }
}
const getConstellationAverages = (groupedByConstellation) => {
  return {
    starsPerConstallation: {
      min: _.minBy(groupedByConstellation, c => c.stars.length).stars.length,
      max: _.maxBy(groupedByConstellation, c => c.stars.length).stars.length,
      mean: _.meanBy(groupedByConstellation, c => c.stars.length)
    },
    starsMainPerConstallation: {
      min: _.minBy(groupedByConstellation, c => c.starsMain.length).starsMain.length,
      max: _.maxBy(groupedByConstellation, c => c.starsMain.length).starsMain.length,
      mean: _.meanBy(groupedByConstellation, c => c.starsMain.length)
    }
  }
}
const init = async () => {
  const rawData = await getRawData()
  const ranges = getMinMaxAndRanges(rawData.rawStarData)
  //   console.log('rawData', rawStarData, constellationShip)
  const groupedByConstellation = groupByConstellation(rawData)
  const averages = getConstellationAverages(groupedByConstellation)
  setMinMaxAndRangesForConstellations(groupedByConstellation, ranges)
  console.log('rawStarData', groupedByConstellation.map(d => d.constellation), Object.keys(groupedByConstellation[0]))
  fs.writeJsonSync(`_static/data/star-data.json`, {constellations: groupedByConstellation, ranges, averages})
}

init()
