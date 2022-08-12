import {stopToneClips} from './audio.js'

export const setLoadingText = (text) => {
  console.log('setLoadingText', text)
  document.querySelector('.loading-text').innerHTML = text
}
export const removeLoadingText = () => {
  document.querySelector('.loading').style.display = 'none'
}
export const filterConstellationsFromUrl = (starData) => {
  const urlParams = new URLSearchParams(window.location.search)
  const filter = urlParams.get('filter')
  if (filter) {
    console.log('Filter constellations', filter)
    starData.constellations = starData.constellations.filter(c => c.constellation.includes(filter))
  }
  if (urlParams.has('charts')) {
    starData.showCharts = true
  }
}
export const globalBindings = () => {
  document.body.addEventListener('keydown', function (e) {
    // console.log('e', e.code, e)
    if (e.code === 'Space' || e.code === 'Backspace' || e.code === 'Delete') {
      stopToneClips()
    }
  })
}
