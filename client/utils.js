import axios from 'axios'
import LdBar from '@loadingio/loading-bar'

const loadingBar = new LdBar('.ld-bar')

export const ensureCorrectLoadingText = async () => {
  if (window.location.hostname !== 'localhost') {
    const timeZone = window.Intl.DateTimeFormat().resolvedOptions().timeZone
    if (timeZone !== 'Europe/London') {
      document.querySelector('.loading .quote').style.display = 'block'
    }
  }
}
export const setLoadingText = async (text) => {
  document.querySelector('.loading-text').innerHTML = text
  document.querySelector('.loading').style.display = 'block'
}
export const hideLoadingText = () => {
  document.querySelector('.loading').style.display = 'none'
  setLoadingPercent(0)
}
export const setLoadingPercent = (percent) => {
  loadingBar.set(percent)
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
    console.log('e', e.code, e)
    if (e.code === 'Space' || e.code === 'Backspace' || e.code === 'Delete') {
      document.querySelector('.action-play').click()
    }
    if (e.code === 'KeyA') {
      document.querySelector('.action-play-rotate').click()
    }
    if (e.code === 'KeyN') {
      document.querySelector('.action-next').click()
    }
  })
}
export const downloadStarData = (url) => {
  return new Promise(async resolve => {
    axios.get(url, {
      onDownloadProgress: function (progressEvent) {
        let percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        // console.log('progress', progressEvent, percentCompleted)
        if (percentCompleted === Infinity) percentCompleted = 100
        setLoadingPercent(percentCompleted)
      }
    }).then(function (response) {
      // console.log('response', response)
      resolve(response.data)
    })
  })
}

export const shuffle = (array) => {
  let currentIndex = array.length
  let randomIndex

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]]
  }

  return array
}
