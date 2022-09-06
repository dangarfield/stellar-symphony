import {Vector3, Scene, Color, PerspectiveCamera, WebGLRenderer, TextureLoader,
  BufferGeometry, Points, ShaderMaterial, AdditiveBlending, Float32BufferAttribute,
  Mesh, SphereGeometry, MeshPhongMaterial, DoubleSide, Raycaster, Vector2, Line3, MathUtils, Group,
  EllipseCurve, LineBasicMaterial, LineLoop, Object3D, EdgesGeometry, LineSegments, RingGeometry, CircleGeometry, MeshBasicMaterial} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import {updateSelectedConstellation, showDefaultInfoWindow} from './graphing.js'
import {Tween, update as tweenUpdate, Easing} from '@tweenjs/tween.js'
import {getScaleNotesFromChrome} from './audio.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'

const starVertexShader = () => {
  return `
        attribute float size;
        attribute vec3 customColor;
        varying vec3 vColor;

        void main() {
            vColor = customColor;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size * ( 300.0 / -mvPosition.z );
            gl_Position = projectionMatrix * mvPosition;
        }
    `
}

const starFragmentShader = () => {
  return `
        uniform vec3 color;
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        void main() {
            gl_FragColor = vec4( color * vColor, 0.5 );
            gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );
        }
    `
}

let controls
let camera
let scene
let renderer
let labelRenderer
const showStats = window.location.hostname === 'localhost'
let stats

const raycaster = new Raycaster()
const pointer = new Vector2()

const centrePoints = []
const bgStarsList = []
let starData
let sphere
let explanationGroup

const maxBy = (collection, attribute) => {
  let largestItem
  let largestValue = 0
  for (const item of collection) {
    if (item[attribute] > largestValue) {
      largestItem = item
      largestValue = item[attribute]
    }
  }
  return largestItem
}
const getTargetPointForExplanation = (distaceTarget, furthestStarFromTarget) => {
  const camLine = new Line3(camera.pos, distaceTarget)
  console.log('furthestStar', furthestStarFromTarget)
  const furthestVec = new Vector3(furthestStarFromTarget.ax, furthestStarFromTarget.ay, furthestStarFromTarget.az)
  const targetPoint = new Vector3()
  camLine.closestPointToPoint(furthestVec, true, targetPoint)
  console.log('targetPoint', targetPoint)

  return targetPoint
}
const createTimingExplanationLine = (targetPoint, starPoint, angleFromCentre) => {
  // console.log('createTimingExplanationLine')
  const lineMaterial = new LineMaterial({
    color: 0xFF00FF,
    linewidth: 0.001
  })
  const linePoints = [starPoint.x, starPoint.y, starPoint.z, targetPoint.x, targetPoint.y, targetPoint.z]

  const lineGeom = new LineGeometry()
  lineGeom.setPositions(linePoints)
  const line = new Line2(lineGeom, lineMaterial)
  line.visible = false

  return line
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
  } else if (i === 8) {
    return 'I'
  }
  return i
}
const getNoteTypeColor = (notePos) => {
  switch (notePos) {
    // Rainbox
    // case 0: default: return 0xF60000
    // case 1: return 0xFF8C00
    // case 2: return 0xFFEE00
    // case 3: return 0x4DE94C
    // case 4: return 0x3783FF
    // case 5: return 0x4815AA
    // case 6: return 0xEF4C9D

    // Greyscale
    case 0: default: return 0xFFFFFF
    case 1: return 0x333333
    case 2: return 0x888888
    case 3: return 0x333333
    case 4: return 0x888888
    case 5: return 0x333333
    case 6: return 0x888888
  }
}
const createPitchExplanationDistanceCircle = (targetPoint, starPoint, angleFromCentre, scaleChroma) => {
  const scaleNotes = getScaleNotesFromChrome(scaleChroma)
  scaleNotes.push(scaleNotes[0])
  const explanationCircle = new Group()
  const radius = targetPoint.distanceTo(starPoint)
  const segmentTotal = 8
  const segmentRadius = radius / segmentTotal
  // console.log('radius', radius, segmentRadius)
  // console.log('createPitchExplanationDistanceCircle', targetPoint, starPoint, angleFromCentre, scaleChroma, scaleNotes)
  explanationCircle.userData.expLabels = []
  for (let i = 0; i < segmentTotal; i++) {
    // Shape
    const innerRadius = i * segmentRadius
    const outerRadius = (i + 1) * segmentRadius
    const color = getNoteTypeColor(i)
    const geometry = new RingGeometry(innerRadius, outerRadius, 32 + (5 * i))
    const material = new MeshBasicMaterial({ color: color, opacity: 0.3, transparent: true, side: DoubleSide })
    const mesh = new Mesh(geometry, material)
    mesh.position.x = targetPoint.x
    mesh.position.y = targetPoint.y
    mesh.position.z = targetPoint.z
    mesh.visible = true
    mesh.lookAt(new Vector3(0, 0, 0))
    // console.log('mesh', mesh, i, innerRadius, outerRadius)
    explanationCircle.add(mesh)

    // Labels
    const expDiv = document.createElement('div')
    expDiv.className = 'label-note'
    expDiv.textContent = `${scaleNotes[i].substring(0, scaleNotes[i].length - 1)} (${toRomanNumeral(i + 1)})`
    const expLabel = new CSS2DObject(expDiv)
    const expPos = new Vector3()
    expPos.lerpVectors(targetPoint, starPoint, i / segmentTotal + (0.5 / segmentTotal))
    expLabel.position.set(expPos.x, expPos.y, expPos.z)
    expLabel.visible = false
    explanationCircle.add(expLabel)
    explanationCircle.userData.expLabels.push(expLabel)
  }
  explanationCircle.visible = false
  explanationCircle.userData.setLabelsVisible = (shouldBeVisible) => {
    for (const expLabel of explanationCircle.userData.expLabels) {
      expLabel.visible = shouldBeVisible
    }
  }
  return explanationCircle
}
const createPitchExplanationAngleCircle = (targetPoint, starPoint, angleFromCentre, scaleChroma, centreVec) => {
  const scaleNotes = getScaleNotesFromChrome(scaleChroma)
  // scaleNotes.push(scaleNotes[0])
  const explanationCircle = new Group()
  const radius = targetPoint.distanceTo(starPoint)
  const segmentTotal = 7
  explanationCircle.userData.expLabels = []
  for (let i = 0; i < segmentTotal * 2; i++) {
    // Shape
    const thetaStart = ((Math.PI / segmentTotal) * 2.5) - ((Math.PI / segmentTotal) * i)

    const geometry = new CircleGeometry(radius, 8, thetaStart, Math.PI / segmentTotal)
    // const color = i % 2 === 0 ? 0xFFFF00 : 0x0000FF
    const notePos = i % segmentTotal// === 0 ? 0 : segmentTotal - (i % segmentTotal)
    // console.log('circle', i, thetaStart, notePos)
    const color = getNoteTypeColor(notePos)
    const material = new MeshBasicMaterial({ color: color, opacity: 0.3, transparent: true, side: DoubleSide })
    const mesh = new Mesh(geometry, material)
    mesh.position.x = targetPoint.x
    mesh.position.y = targetPoint.y
    mesh.position.z = targetPoint.z
    mesh.visible = true
    // material.wireframe = true
    mesh.lookAt(new Vector3(0, 0, 0))
    // console.log('mesh', mesh, i, geometry)
    explanationCircle.add(mesh)

    // Labels

    const expDiv = document.createElement('div')
    expDiv.className = 'label-note'
    expDiv.textContent = `${scaleNotes[notePos].substring(0, scaleNotes[notePos].length - 1)} (${toRomanNumeral(notePos + 1)})`
    const expLabel = new CSS2DObject(expDiv)
    const expPos = new Vector3()
    expPos.lerpVectors(targetPoint, starPoint, 0.95)
    expLabel.position.set(expPos.x, expPos.y, expPos.z)

    expLabel.visible = false
    const expLabelGroup = new Group()
    const angleToRotate = (i * (360 / segmentTotal / 2)) + (360 / segmentTotal / 4)
    // console.log('angleToRotate', i, angleToRotate)
    expLabelGroup.setRotationFromAxisAngle(centreVec, MathUtils.degToRad(angleToRotate - angleFromCentre))

    expLabelGroup.add(expLabel)
    explanationCircle.add(expLabelGroup)
    explanationCircle.userData.expLabels.push(expLabel)
  }
  explanationCircle.visible = false
  explanationCircle.userData.setLabelsVisible = (shouldBeVisible) => {
    for (const expLabel of explanationCircle.userData.expLabels) {
      expLabel.visible = shouldBeVisible
    }
  }

  return explanationCircle
}
const createTimingExplanationCircle = (targetPoint) => {
  const geo = createCircleGeo(0)

  const mat = new LineBasicMaterial({ color: 0xFF00FF })
  const circle = new LineLoop(geo, mat)

  circle.position.x = targetPoint.x
  circle.position.y = targetPoint.y
  circle.position.z = targetPoint.z
  circle.lookAt(new Vector3(0, 0, 0))
  circle.visible = false
  return circle
}
const createCircleGeo = (radius) => {
  const curve = new EllipseCurve(
    0.0, 0.0, // Center x, y
    radius, radius, // x radius, y radius
    0.0, 2.0 * Math.PI // Start angle, stop angle
  )
  const pts = curve.getSpacedPoints(256)
  const geo = new BufferGeometry().setFromPoints(pts)
  return geo
}
const createStars = (starsMain) => {
  const bufGeom = new BufferGeometry()
  const points = new Points(bufGeom, new ShaderMaterial({
    uniforms: {
      color: { value: new Color(0xffffff) },
      pointTexture: { value: new TextureLoader().load('disc.png') }
    },
    vertexShader: starVertexShader(),
    fragmentShader: starFragmentShader(),

    blending: AdditiveBlending,
    depthTest: false,
    transparent: true
  }))
  const pointsArray = []
  const colorsArray = []
  const sizesArray = []
  const hipArray = []

  for (const star of starsMain) {
    hipArray.push(star.hip)
    pointsArray.push(star.ax, star.ay, star.az)
    sizesArray.push(0)
    colorsArray.push(0, 1, 1, 1)
  }
  bufGeom.setAttribute('position', new Float32BufferAttribute(pointsArray, 3))
  bufGeom.setAttribute('customColor', new Float32BufferAttribute(colorsArray, 4))
  bufGeom.setAttribute('size', new Float32BufferAttribute(sizesArray, 1))

  return { points, hipArray }
}
const removeAndDisposeProperly = (object) => {
  if (!(object instanceof Object3D)) return false
  if (object.geometry) {
    object.geometry.dispose()
  }
  if (object.material) {
    if (object.material instanceof Array) {
      object.material.forEach(material => material.dispose())
    } else {
      object.material.dispose()
    }
  }
  if (object.parent) {
    object.parent.remove(object)
  }
}
const setupMelodyExplanationGroup = () => {
  explanationGroup = new Group()
  scene.add(explanationGroup)
}
const clearMelodyExplanationGroup = () => {
  var obj, i
  for (i = scene.children.length - 1; i >= 0; i--) {
    obj = scene.children[ i ]
    if (obj.is_ob) {
      removeAndDisposeProperly(obj)
    }
  }
}
export const stopMelodyExplanation = () => {
  const explanationObject = explanationGroup.userData.explanationObject
  if (explanationObject === undefined) return
  if (explanationObject.timingCircleTween) explanationObject.timingCircleTween.stop()
  if (explanationObject.timingLineTween) explanationObject.timingLineTween.stop()
  if (explanationObject.starTween) explanationObject.starTween.stop()
}
export const setupMelodyExplanation = (constellation) => {
  console.log('setupMelodyExplanation', constellation)
  clearMelodyExplanationGroup()

  const alphaStar = constellation.starsMain.find(s => s.alpha)
  const alphaVec = new Vector3(alphaStar.ax, alphaStar.ay, alphaStar.az)
  const furthestStarFromAlpha = maxBy(constellation.starsMain, 'distanceFromAlpha')
  const targetPointAlpha = getTargetPointForExplanation(alphaVec, furthestStarFromAlpha)

  const centreVec = new Vector3(constellation.centre.x, constellation.centre.y, constellation.centre.z)
  const furthestStarFromCentre = maxBy(constellation.starsMain, 'distanceFromCentre')
  const targetPointCentre = getTargetPointForExplanation(centreVec, furthestStarFromCentre)

  console.log('furthestStarFromCentre', furthestStarFromCentre, furthestStarFromCentre.distanceFromCentre,
    centreVec.distanceTo(new Vector3(furthestStarFromCentre.ax, furthestStarFromCentre.ay, furthestStarFromCentre.az)),
    targetPointCentre.distanceTo(new Vector3(furthestStarFromCentre.ax, furthestStarFromCentre.ay, furthestStarFromCentre.az))
  )

  // Create Timing Line
  const notesCircleDistance = createPitchExplanationDistanceCircle(targetPointCentre,
    new Vector3(furthestStarFromCentre.ax, furthestStarFromCentre.ay, furthestStarFromCentre.az),
    furthestStarFromCentre.angleFromCentre,
    constellation.music.scale.chroma)
  explanationGroup.add(notesCircleDistance)
  // scene.add(new BoxHelper(notesCircle, 0xFF00FF))

  const timingLine = createTimingExplanationLine(targetPointCentre, new Vector3(furthestStarFromCentre.ax, furthestStarFromCentre.ay, furthestStarFromCentre.az), furthestStarFromCentre.angleFromCentre)
  // timingLine.lookAt(new Vector3(furthestStarFromCentre.ax, furthestStarFromCentre.ay, furthestStarFromCentre.az))
  // timingLine.visible = true
  explanationGroup.add(timingLine)

  // TEMP for showing star notes
  // for (const noteData of constellation.music.melody) {
  //   const star = constellation.starsMain.find(s => s.hip === noteData.starHip)
  //   const v = Math.floor((star.angleFromCentre % 180) / (180 / 7))
  //   const expDiv = document.createElement('div')
  //   expDiv.className = 'label-note'
  //   expDiv.innerHTML = `${noteData.note}<br/>${parseInt(star.angleFromCentre)}<br/>${v}`
  //   const expLabel = new CSS2DObject(expDiv)
  //   expLabel.position.set(star.ax, star.ay, star.az)
  //   expLabel.visible = true
  //   explanationGroup.add(expLabel)
  // }

  // Create Timing Circle
  const notesCircleAngle = createPitchExplanationAngleCircle(targetPointCentre,
    new Vector3(furthestStarFromCentre.ax, furthestStarFromCentre.ay, furthestStarFromCentre.az),
    furthestStarFromCentre.angleFromCentre,
    constellation.music.scale.chroma,
    centreVec)
  explanationGroup.add(notesCircleAngle)

  const timingCircle = createTimingExplanationCircle(targetPointAlpha)
  explanationGroup.add(timingCircle)

  // Create Stars
  const { points, hipArray } = createStars(constellation.starsMain)
  explanationGroup.add(points)

  const explanationObject = {
    timingCircle,
    timingLine,
    notesCircleDistance,
    notesCircleAngle,
    hipArray,
    points
  }
  explanationGroup.userData.explanationObject = explanationObject
  explanationObject.animateCircle = (time) => {
    explanationObject.timingCircle.visible = true
    explanationObject.notesCircleAngle.visible = true
    explanationObject.notesCircleAngle.userData.setLabelsVisible(true)
    // explanationObject.notesCircleAngle.setRotationFromAxisAngle(centreVec, MathUtils.degToRad(0 - furthestStarFromCentre.angleFromCentre))
    const angleTweenConfig = {radius: 0}
    explanationObject.timingCircleTween = new Tween(angleTweenConfig)
      .to({radius: furthestStarFromAlpha.distanceFromAlpha - (furthestStarFromAlpha.distanceFromAlpha * 0.04)}, time - 5)
      .easing(function (value) { // Distances are not linear, add a small weighting of quadratic easing to roughly approximate
        const q = 1
        const l = 7
        return ((value * value * q) + (value * l)) / (q + l)
      })
      .onUpdate(() => {
        explanationObject.timingCircle.geometry.dispose()
        explanationObject.timingCircle.geometry = createCircleGeo(angleTweenConfig.radius)
        explanationObject.timingCircle.visible = true
        explanationObject.notesCircleAngle.visible = true
        explanationObject.notesCircleAngle.userData.setLabelsVisible(true)
      })
      .onComplete(() => {
        explanationObject.timingCircle.visible = false
        explanationObject.notesCircleAngle.visible = false
        explanationObject.notesCircleAngle.userData.setLabelsVisible(false)
      })
      .onStop(() => {
        explanationObject.timingCircle.visible = false
        explanationObject.notesCircleAngle.visible = false
        explanationObject.notesCircleAngle.userData.setLabelsVisible(false)
      })
      .start()
  }

  explanationObject.animateLine = (time) => {
    explanationObject.timingLine.visible = true
    explanationObject.notesCircleDistance.visible = true
    explanationObject.notesCircleDistance.userData.setLabelsVisible(true)
    explanationObject.notesCircleDistance.setRotationFromAxisAngle(centreVec, MathUtils.degToRad(0 - furthestStarFromCentre.angleFromCentre))
    const angleTweenConfig = {angle: 0}
    explanationObject.timingLineTween = new Tween(angleTweenConfig)
      .to({angle: 360}, time - 1)
      .onUpdate(() => {
        explanationObject.timingLine.setRotationFromAxisAngle(centreVec, MathUtils.degToRad(angleTweenConfig.angle - furthestStarFromCentre.angleFromCentre))
        explanationObject.timingLine.visible = true
        explanationObject.notesCircleDistance.visible = true
        explanationObject.notesCircleDistance.userData.setLabelsVisible(true)
      })
      .onComplete(() => {
        explanationObject.timingLine.visible = false
        explanationObject.notesCircleDistance.visible = false
        explanationObject.notesCircleDistance.userData.setLabelsVisible(false)
      })
      .onStop(() => {
        explanationObject.timingLine.visible = false
        explanationObject.notesCircleDistance.visible = false
        explanationObject.notesCircleDistance.userData.setLabelsVisible(false)
      })
      .start()
  }

  explanationObject.animateStar = (starHip) => {
    const starIndex = explanationObject.hipArray.indexOf(starHip)
    // console.log('animateStar', starHip, starIndex)
    // explanationObject.points.geometry.attributes.size.array[starIndex] = 0.1
    // explanationObject.points.geometry.attributes.size.needsUpdate = true
    const sizeConfig = {size: 0}
    explanationObject.starTween = new Tween(sizeConfig).to({size: 0.1}, 200)
      .onUpdate(() => {
        explanationObject.points.geometry.attributes.size.array[starIndex] = sizeConfig.size
        explanationObject.points.geometry.attributes.size.needsUpdate = true
      })
      .onComplete(() => {
        // explanationObject.timingLine.visible = false
      })
    const tweenB = new Tween(sizeConfig).to({size: 0}, 2000)
      .onUpdate(() => {
        explanationObject.points.geometry.attributes.size.array[starIndex] = sizeConfig.size
        explanationObject.points.geometry.attributes.size.needsUpdate = true
      })
      .onComplete(() => {
        // explanationObject.timingLine.visible = false
      })
    explanationObject.starTween.chain(tweenB)
    explanationObject.starTween.start()
  }
  console.log('explanationObject', explanationObject)
  return explanationObject
}

const updateFovFromDistance = () => {
  camera.fov = 25 + (controls.getDistance() * 30)
  camera.updateProjectionMatrix()
}

export const focusMapOnConstellation = (constellation) => {
  controls.enabled = false
  const oldCamPos = {x: camera.position.x, y: camera.position.y, z: camera.position.z}
  const newCamVec = new Vector3(constellation.centre.x, constellation.centre.y, constellation.centre.z).lerp(new Vector3(0, 0, 0), 1.3)
  const newCamPos = {x: newCamVec.x, y: newCamVec.y, z: newCamVec.z}

  new Tween(oldCamPos)
    .to(newCamPos, 1000)
    .easing(Easing.Quadratic.InOut)
    .onUpdate(() => {
      camera.position.x = oldCamPos.x
      camera.position.y = oldCamPos.y
      camera.position.z = oldCamPos.z
      camera.lookAt(controls.target)
      updateFovFromDistance()
    })
    .start()

  controls.enabled = true
  updateFovFromDistance()
}

const initScene = () => {
  const canvasWidth = document.querySelector('.star-map').clientWidth
  const canvasHeight = document.querySelector('.star-map').clientHeight // canvasWidth < 600 ? canvasWidth : Math.round(canvasWidth / 2)
  // console.log('canvas sizes', canvasWidth, canvasHeight)
  scene = new Scene()
  scene.background = new Color(0x000000)

  camera = new PerspectiveCamera(
    25, // Field of View
    canvasWidth / canvasHeight, // aspect ratio
    0.001, // near clipping plane
    1000 // far clipping plane
  )
  renderer = new WebGLRenderer({
    alpha: true, // transparent background
    antialias: true // smooth edges
  })
  renderer.setSize(canvasWidth, canvasHeight)
  document.querySelector('.star-map').appendChild(renderer.domElement)

  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(canvasWidth, canvasHeight)
  labelRenderer.domElement.style.position = 'absolute'
  labelRenderer.domElement.style.top = '0px'
  labelRenderer.domElement.style.pointerEvents = 'none'
  document.querySelector('.star-map').appendChild(labelRenderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  // controls.rotateSpeed *= -1; // This isn't working, should ideally be opposite up and down, scroll in / out, not pan
  controls.minDistance = 0
  controls.maxDistance = 0.99
  controls.zoomSpeed = 2
  // console.log('controls', controls)
  controls.addEventListener('change', function (change) {
    // camera.lookAt(new THREE.Vector3(0,0,0).lerp(camera.position, 2))
    updateFovFromDistance()
    // console.log('control change', controls.getDistance(), camera.fov)
  })
  if (showStats) {
    stats = new Stats()
    stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
    stats.dom.style.cssText = 'position:fixed;bottom:0;right:0;cursor:pointer;opacity:0.9;z-index:10000'
    document.querySelector('.stats').appendChild(stats.dom)
  }

  window.addEventListener('resize', onWindowResize)
  document.addEventListener('pointermove', onPointerMove)
}

const resizeCanvasToDisplaySize = () => {
  const canvas = renderer.domElement
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  // if (canvas.width !== width || canvas.height !== height) {
  // you must pass false here or three.js sadly fights the browser
  renderer.setSize(width, height, false)
  labelRenderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()

  // set render target sizes here
  // }
}

const loadStars = () => {
  new TextureLoader().load('disc.png')
  for (const constellation of starData.constellations) { // .filter(c => c.constellationName === 'Sagitta')) {
    const bufGeom = new BufferGeometry()
    const bgStars = new Points(bufGeom, new ShaderMaterial({
      uniforms: {
        color: { value: new Color(0xffffff) },
        pointTexture: { value: new TextureLoader().load('disc.png') }
      },
      vertexShader: starVertexShader(),
      fragmentShader: starFragmentShader(),

      blending: AdditiveBlending,
      depthTest: false,
      transparent: true
    }))
    const pointsArray = []
    const colorsArray = []
    const sizesArray = []

    const mainStarHips = constellation.starsMain.map(s => s.hip)
    for (const star of constellation.stars.filter(s => !mainStarHips.includes(s.hip))) {
      pointsArray.push(star.ax, star.ay, star.az)
      const s = ((star.mag * 26) / 255 + 0.18) / 75
      // const s = 0.0125
      sizesArray.push(s)
      colorsArray.push(1, 1, 1, 1)
    }
    for (const star of constellation.starsMain) {
      pointsArray.push(star.ax, star.ay, star.az)
      // const s = ((star.mag * 26) / 255 + 0.18) / 75
      const s = 0.03
      sizesArray.push(s)

      if (star.alpha) {
        colorsArray.push(1, 0, 0, 1)
      } else {
        // colorsArray.push(0.82,0.89,1,1)
        colorsArray.push(0, 1, 1, 1)
      }

      pointsArray.push(constellation.centre.x, constellation.centre.y, constellation.centre.z)
      sizesArray.push(0.03)
      colorsArray.push(1, 0, 0, 1)
      centrePoints.push({c: constellation.constellation, v: new Vector3(constellation.centre.x, constellation.centre.y, constellation.centre.z)})
    }
    // console.log('sizeArray', sizesArray)
    bufGeom.setAttribute('position', new Float32BufferAttribute(pointsArray, 3))
    bufGeom.setAttribute('customColor', new Float32BufferAttribute(colorsArray, 4))
    bufGeom.setAttribute('size', new Float32BufferAttribute(sizesArray, 1))

    scene.add(bgStars)
    bgStarsList.push(bgStars)
  }
}
const loadConstellationLines = () => {
  const minOpacity = 0.5
  for (const constellation of starData.constellations) {
    const lineMaterial = new LineMaterial({
      color: 0x1363DF,
      linewidth: 0.002,
      transparent: true
      // opacity: minOpacity
    })
    const constellationItems = []
    for (const lines of constellation.lines) {
      if (lines.points) {
        const points = []
        for (const point of lines.points) {
          // points.push( new THREE.Vector3( point.x,point.y,point.z ) )
          points.push(point.x, point.y, point.z)
        }
        // const lineGeom = new THREE.BufferGeometry().setFromPoints( points );
        const lineGeom = new LineGeometry()
        lineGeom.setPositions(points)
        const line = new Line2(lineGeom, lineMaterial)
        line.computeLineDistances()
        line.scale.set(1, 1, 1)
        scene.add(line)
        constellationItems.push(line)
      }
    }

    const conDiv = document.createElement('div')
    conDiv.className = 'label'
    conDiv.textContent = constellation.constellationName

    // conDiv.style.marginTop = '-1em';
    const conLabel = new CSS2DObject(conDiv)
    conLabel.position.set(constellation.centre.x, constellation.centre.y, constellation.centre.z)
    scene.add(conLabel)
    // constellationItems.push(conLabel)
    constellation.highlightConstellation = (highlight) => {
      lineMaterial.opacity = highlight ? 1 : minOpacity
      lineMaterial.transparent = !highlight
      // console.log('highlightConstellation', constellation.constellationName, highlight, lineMaterial.opacity)
      // if (lineMaterial.userData.isTweening) return
      // if (highlight && lineMaterial.opacity === 1) return
      // if (!highlight && lineMaterial.opacity === minOpacity) return

      // lineMaterial.userData.isTweening = true
      // new Tween(lineMaterial)
      //   .to({opacity: highlight ? 1 : minOpacity}, 400)
      //   .onComplete(() => {
      //     delete lineMaterial.userData.isTweening
      //   })
      //   .onStop(() => {
      //     delete lineMaterial.userData.isTweening
      //   })
      //   .start()
    }
  }
}
const loadSphere = () => {
  const sphereGeo = new SphereGeometry(1, 24, 13) // TODO adjust to match equatorial grid
  sphere = new Mesh(sphereGeo, new MeshPhongMaterial({ color: 0x12394C, side: DoubleSide, wireframe: true }))
  sphere.doubleSided = true
  // scene.add(sphere) // Add the line helper instead, as it shows quads rather than tris
  // scene.add(new AmbientLight(0xFFFFFF))

  const line = new LineSegments(new EdgesGeometry(sphereGeo), new LineBasicMaterial({ color: 0x12394C }))
  scene.add(line)
}
const loadTriangles = () => {
  // TRIANGLES
//   for (const constellation of starData.constellations) { // .filter(c => c.constellationName === 'Ursa Major')) {
//     const alpha = constellation.starsMain.find(s => s.alpha)
//     const origin = {x: constellation.centre.x, y: constellation.centre.y, z: constellation.centre.z}
//     // const origin = {x: alpha.ax, y: alpha.ay, z: alpha.az}
//     const triGeom = new BufferGeometry()
//     const triMesh = new Mesh(triGeom, new MeshBasicMaterial({side: DoubleSide, transparent: false, color: 0xFFFFFF}))
//     const triPos = new Float32Array([0, 0, 0, origin.x, origin.y, origin.z, 0, 1, 0])
//     triGeom.setAttribute('position', new BufferAttribute(triPos, 3))
//     scene.add(triMesh)
//     for (const star of constellation.starsMain) {
//       console.log('Angle to ', star.bayer, star.proper, '-', star.angleFromCentre, star.angleFromAlpha)
//       const triGeom = new BufferGeometry()
//       const triMesh = new Mesh(triGeom, new MeshBasicMaterial({side: DoubleSide, transparent: false, color: 0xFF00FF}))
//       const triPos = new Float32Array([0, 0, 0, origin.x, origin.y, origin.z, star.ax, star.ay, star.az])
//       triGeom.setAttribute('position', new BufferAttribute(triPos, 3))
//       scene.add(triMesh)
//     }
//   }
}
const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

const onPointerMove = (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
}
const render = () => {
  if (showStats) stats.begin()
  resizeCanvasToDisplaySize()
  // controls.update()
  tweenUpdate()
  raycaster.setFromCamera(new Vector2(), camera)
  const intersects = raycaster.intersectObjects([sphere])
  if (intersects.length > 0) {
    const point = intersects[0].point
    let dist = 100
    let constellationId = ''
    // console.log('point', point, centrePoints)
    for (const centrePoint of centrePoints) {
      const distPoint = centrePoint.v.distanceToSquared(point)
      if (distPoint < dist) {
        dist = distPoint
        constellationId = centrePoint.c
      }
    }
    // console.log('Closest', constellationId)
    updateSelectedConstellation(starData, constellationId, false)
  }
  // TODO - Potentially add a raycaster for c
  // bgRaycaster.setFromCamera(pointer, camera)
  // const bgStarsIntersects = bgRaycaster.intersectObjects(bgStarsList, false)
  // if (bgStarsIntersects.length > 0) {
  //   console.log('bgStars Intersect', bgStarsIntersects, bgStarsIntersects[0], bgStarsIntersects[0].point)
  // }

  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
  if (showStats) stats.end()
  window.requestAnimationFrame(render)
}
export const setBgStarsVisibility = (visible) => {
  for (const bgStars of bgStarsList) {
    bgStars.visible = visible
  }
}
export const addStarMap = (passedStarData) => {
  starData = passedStarData
  initScene()

  loadStars()
  loadConstellationLines()
  loadSphere()
  loadTriangles()

  camera.lookAt(0, 0, 0)
  camera.position.z = 0.7
  updateFovFromDistance()
  setupMelodyExplanationGroup()
  const initialConstellation = starData.constellations.find(c => c.constellationName === 'Aquarius') || starData.constellations[0]
  // console.log('initialConstellation', initialConstellation)
  updateSelectedConstellation(starData, initialConstellation.constellation, true)
  showDefaultInfoWindow()
  render()
}
