import {setLoadingText, hideLoadingText, filterConstellationsFromUrl, globalBindings, downloadStarData} from './utils.js'
import {initConstellationData} from './graphing.js'
import {addStarMap} from './map.js'

const init = async () => {
  console.log('This is fastest')
  console.log('Fetching data')
  setLoadingText('Fetching data...')
  const starData = await downloadStarData('data/star-data.json')
  filterConstellationsFromUrl(starData)
  setLoadingText('Drawing graphs...')
  console.log('Drawing Graphs', 'starData', starData)
  // addConstellationGraphs(starData)
  initConstellationData(starData)
  addStarMap(starData)
  globalBindings()
  console.log('Ready')
  hideLoadingText()
}

init()
