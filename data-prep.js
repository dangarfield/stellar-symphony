const csv = require('csv-parser')
const fs = require('fs-extra')
const _ = require('lodash')
const THREE = require('three')
const path = require('path')
const fetch = require('node-fetch')

const saveDataStep = (fileName, obj) => {
  fs.writeJsonSync(`data-steps/${fileName}.json`, obj)
}
const loadDataStep = (fileName) => {
  if (fs.existsSync(`data-steps/${fileName}.json`)) {
    return fs.readJsonSync(`data-steps/${fileName}.json`)
  }
}
const downloadDataFile = async (url, path) => {
  const res = await fetch(url)
  const fileStream = fs.createWriteStream(path)
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream)
    res.body.on('error', reject)
    fileStream.on('finish', resolve)
  })
}
const downloadDataFiles = async () => {
  const dataDirName = 'data'
  fs.ensureDirSync(dataDirName)

  const urls = [
    'https://raw.githubusercontent.com/Stellarium/stellarium/master/skycultures/western/asterism_lines.fab',
    'https://raw.githubusercontent.com/Stellarium/stellarium/master/skycultures/western/asterism_names.eng.fab',
    'https://raw.githubusercontent.com/Stellarium/stellarium/master/skycultures/western/constellation_names.eng.fab',
    'https://raw.githubusercontent.com/Stellarium/stellarium/master/skycultures/western/constellationship.fab',
    'https://raw.githubusercontent.com/Stellarium/stellarium/master/skycultures/western/star_names.fab',
    'https://raw.githubusercontent.com/astronexus/HYG-Database/master/hygdata_v3.csv'
  ]
  for (const url of urls) {
    const fileName = url.split('/').slice(-1)[0]
    const filePath = path.join(dataDirName, fileName)
    if (!fs.existsSync(filePath)) {
      console.log('dl', url, filePath, 'downloading')
      await downloadDataFile(url, filePath)
      console.log('dl', url, filePath, 'complete')
    } else {
      // console.log('dl', url, filePath, 'already downloaded')
    }
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

        data.ra = parseFloat(data.ra)
        data.rarad = parseFloat(data.rarad)
        data.dec = parseFloat(data.dec)
        data.decrad = parseFloat(data.decrad)

        const {x, y, z} = getXYZFromRaDec(1, data.decrad, data.rarad)
        data.ax = x
        data.ay = y
        data.az = z
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
    const lines = _.chunk(dSplit.slice(3), 2).map(l => { return { starIds: l } })
    return {
      constellation: dSplit[0],
      lines
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
    // console.log('dSplit', dSplit)
    if (dSplit.length < 2) {
      return {}
    }
    return {constellation: dSplit[0], constellationName: dSplit[1].replaceAll('"', '')}
  }).filter(d => d.constellation)
  // console.log('data', data, data.length)
  return data
}
const getAngleFromPoint = (originTriangleNormal, originPlane, originX, originY, originZ, destinationX, destinationY, destinationZ) => {
  if (originX === destinationX && originY === destinationY && originZ === destinationZ) {
    return 0
  }
  const starVec3 = new THREE.Vector3(destinationX, destinationY, destinationZ)
  const starCentreTriangle = new THREE.Triangle(new THREE.Vector3(0, 0, 0), new THREE.Vector3(originX, originY, originZ), starVec3)
  const starCentreTriangleNormal = starCentreTriangle.getNormal(new THREE.Vector3())
  const starCentreDist = originPlane.distanceToPoint(starVec3) > 0 // TODO - Not sure how to tell if star deg is clockwise or anticlockwise, use this temporarily
  // const angleDeg = THREE.MathUtils.radToDeg(centreTriangleNormal.angleTo(starTriangleNormal))
  const starCentreDot = originTriangleNormal.dot(starCentreTriangleNormal)
  const starCentreAngleDeg = THREE.MathUtils.radToDeg(Math.acos(starCentreDot))
  const starCentreFinalAngle = starCentreDist ? starCentreAngleDeg : 360 - starCentreAngleDeg
  return starCentreFinalAngle
}
const groupByConstellation = (rawData) => {
//   console.log('constellationShip', constellationShip)
  return _.chain(rawData.rawStarData)
    // .filter(r => r.con !== '')
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
      v.starsMain = _.uniq(_.flatten(v.lines.map(l => l.starIds))).map(sid => v.stars.find(s => s.hip === sid)).filter(s => s !== undefined)
      v.starsMain.sort((a, b) => b.mag - a.mag)

      v.centre = {
        x: _.meanBy(v.starsMain, 'ax'),
        y: _.meanBy(v.starsMain, 'ay'),
        z: _.meanBy(v.starsMain, 'az')
      }

      let alpha = v.starsMain.find(s => s.bayer === 'Alp')

      const R = 1
      // console.log('--------------------------------------------------------')
      if (alpha === undefined || alpha === null) {
        const alphaCandidates = v.starsMain.filter(s => s.bayer !== '')
        alphaCandidates.sort((a, b) => a.absmag - b.absmag)
        // console.log('alpha can', alphaCandidates[0])
        alpha = alphaCandidates[0]
        // console.log('NO Alpha -', v.constellationName, '-', alpha.bayer)
      }
      // console.log('alpha', alpha, v.constellationName, v.starsMain.length, v.stars.length)
      // console.log('alpha.ra', alpha.ra)

      // const {x, y, z} = getXYZFromRaDec(R, alpha.decrad, alpha.rarad)
      // alpha.ax = x
      // alpha.ay = y
      // alpha.az = z

      alpha.alpha = true

      const centreTriangle = new THREE.Triangle(new THREE.Vector3(0, 0, 0), new THREE.Vector3(v.centre.x, v.centre.y, v.centre.z), new THREE.Vector3(0, 1, 0))
      const centreTriangleNormal = centreTriangle.getNormal(new THREE.Vector3())
      const centrePlane = centreTriangle.getPlane(new THREE.Plane())

      const alphaTriangle = new THREE.Triangle(new THREE.Vector3(0, 0, 0), new THREE.Vector3(v.centre.x, v.centre.y, v.centre.z), new THREE.Vector3(alpha.ax, alpha.ay, alpha.az))
      const alphaTriangleNormal = alphaTriangle.getNormal(new THREE.Vector3())
      const alphaPlane = alphaTriangle.getPlane(new THREE.Plane())

      for (const starMain of v.starsMain) {
        // const {x, y, z} = getXYZFromRaDec(R, starMain.decrad, starMain.rarad)
        // starMain.ax = x
        // starMain.ay = y
        // starMain.az = z

        starMain.distanceFromAlpha = Math.sqrt(Math.pow(starMain.ax - alpha.ax, 2) + Math.pow(starMain.ay - alpha.ay, 2) + Math.pow(starMain.az - alpha.az, 2))
        starMain.distanceFromCentre = Math.sqrt(Math.pow(starMain.ax - v.centre.x, 2) + Math.pow(starMain.ay - v.centre.y, 2) + Math.pow(starMain.az - v.centre.z, 2))

        starMain.angleFromCentre = getAngleFromPoint(centreTriangleNormal, centrePlane, v.centre.x, v.centre.y, v.centre.z, starMain.ax, starMain.ay, starMain.az)
        starMain.angleFromAlpha = getAngleFromPoint(alphaTriangleNormal, alphaPlane, alpha.ax, alpha.ay, alpha.az, starMain.ax, starMain.ay, starMain.az)
      }
      // Note: Some lines extend to other constellations, Pegasus to Andromeda for example
      for (const line of v.lines) {
        const starA = v.starsMain.find(s => s.hip === line.starIds[0]) || rawData.rawStarData.find(s => s.hip === line.starIds[0])
        const starB = v.starsMain.find(s => s.hip === line.starIds[1]) || rawData.rawStarData.find(s => s.hip === line.starIds[1])
        if (starA && starB) {
          line.distance = Math.sqrt(Math.pow(starB.ax - starA.ax, 2) + Math.pow(starB.ay - starA.ay, 2) + Math.pow(starB.az - starA.az, 2))
          line.points = [{x: starA.ax, y: starA.ay, z: starA.az}, {x: starB.ax, y: starB.ay, z: starB.az}]
        }
      }

      return v
    })
    .value()
}
const getXYZFromRaDec = (R, dec, ra) => {
  const phi = Math.PI / 2 - dec
  const theta = ra
  const sinPhiRadius = Math.sin(phi) * R
  return {
    x: sinPhiRadius * Math.sin(theta),
    y: Math.cos(phi) * R,
    z: sinPhiRadius * Math.cos(theta)
  }
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
  await downloadDataFiles()
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
