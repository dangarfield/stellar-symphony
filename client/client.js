import {setLoadingText, hideLoadingText, filterConstellationsFromUrl, globalBindings, downloadStarData} from './utils.js'
import {initConstellationData} from './graphing.js'
import {addStarMap} from './map.js'

const init = async () => {
  try {
    console.log('Fetching data')
    setLoadingText('Fetching data...')
    const starData = await downloadStarData('data/star-data.png') // Netlify encodig does't gzip json
    filterConstellationsFromUrl(starData)
    setLoadingText('Drawing graphs...')
    console.log('Drawing Graphs', 'starData', starData)
    // addConstellationGraphs(starData)
    initConstellationData(starData)
    addStarMap(starData)
    globalBindings()
    console.log('Ready')
    hideLoadingText()
  } catch (error) {
    window.alert(`Error: ${error.message}`)
  }
}

init()
