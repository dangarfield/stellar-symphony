// import * as THREE from 'three'
// import { OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
// // import { PointerLockControls } from 'https://unpkg.com/three@0.143.0/examples/jsm/controls/PointerLockControls.js';
// import { Line2 } from 'three/examples/jsm/lines/Line2.js'
// import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
// import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
// import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
// import * as _ from 'lodash'
// import * as Tone from 'tone'
// import {addConstellationGraphs} from './graphing.js'

import {setLoadingText, removeLoadingText, filterConstellationsFromUrl, globalBindings} from './utils.js'
import {addConstellationGraphs} from './graphing.js'
import {addStarMap} from './map.js'

const init = async () => {
  console.log('This is fastest')
  console.log('Fetching data')
  setLoadingText('Fetching data...')
  const starData = await (await fetch('data/star-data.json')).json()
  filterConstellationsFromUrl(starData)
  setLoadingText('Drawing graphs...')
  console.log('Drawing Graphs', 'starData', starData)
  addConstellationGraphs(starData)

  addStarMap(starData)
  globalBindings()
  console.log('Ready')
  removeLoadingText()
}

init()
