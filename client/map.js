import {Vector3, Scene, Color, PerspectiveCamera, WebGLRenderer, TextureLoader,
  BufferGeometry, Points, ShaderMaterial, AdditiveBlending, Float32BufferAttribute,
  Mesh, SphereGeometry, MeshPhongMaterial, DoubleSide, AmbientLight, Raycaster, Vector2, Line3, MathUtils, Group,
  EllipseCurve, LineBasicMaterial, LineLoop, BoxHelper} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import {updateSelectedConstellation} from './graphing.js'
import {Tween, update as tweenUpdate} from '@tweenjs/tween.js'

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
            gl_FragColor = vec4( color * vColor, 1.0 );
            gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );
        }
    `
}

let controls
let camera
let scene
let renderer
let labelRenderer

const raycaster = new Raycaster()
const pointer = new Vector2()

const centrePoints = []
let starData
let sphere

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
const createTimingExplanationLine = (targetPoint, distance) => {
  const lineMaterial = new LineMaterial({
    color: 0xFF00FF,
    linewidth: 0.003
  })

  const linePoints = [0, 0, 0, 0, distance, 0]
  const lineGeom = new LineGeometry()
  lineGeom.setPositions(linePoints)
  const line = new Line2(lineGeom, lineMaterial)
  line.computeLineDistances()
  line.scale.set(1, 1, 1)

  line.position.x = targetPoint.x
  line.position.y = targetPoint.y
  line.position.z = targetPoint.z
  line.lookAt(camera.position)
  line.visible = false
  return line
}
const createTimingExplanationCircle = (targetPoint) => {
  const geo = createCircleGeo(0)

  const mat = new LineBasicMaterial({ color: 0xFF00FF })
  const circle = new LineLoop(geo, mat)

  circle.position.x = targetPoint.x
  circle.position.y = targetPoint.y
  circle.position.z = targetPoint.z
  circle.lookAt(camera.position)
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
export const setupMelodyExplanation = (constellation) => {
  console.log('setupMelodyExplanation', constellation)
  const alphaStar = constellation.starsMain.find(s => s.alpha)
  const alphaVec = new Vector3(alphaStar.ax, alphaStar.ay, alphaStar.az)
  const furthestStarFromAlpha = maxBy(constellation.starsMain, 'distanceFromAlpha')
  const targetPointAlpha = getTargetPointForExplanation(alphaVec, furthestStarFromAlpha)

  const centreVec = new Vector3(constellation.centre.x, constellation.centre.y, constellation.centre.z)
  const furthestStarFromCentre = maxBy(constellation.starsMain, 'distanceFromCentre')
  const targetPointCentre = getTargetPointForExplanation(centreVec, furthestStarFromCentre)

  // Create Timing Line
  const timingLine = createTimingExplanationLine(targetPointCentre, furthestStarFromCentre.distanceFromCentre)
  scene.add(timingLine)

  // Create Timing Circle
  const timingCircle = createTimingExplanationCircle(targetPointAlpha)
  scene.add(timingCircle)

  // lineGroup.setRotationFromAxisAngle(alphaVec, 0)

  const explanationObject = {
    timingCircle,
    timingLine
  }

  explanationObject.animateCircle = (time) => {
    explanationObject.timingCircle.visible = true
    const angleTweenConfig = {radius: 0}
    new Tween(angleTweenConfig)
      .to({radius: furthestStarFromAlpha.distanceFromAlpha}, time - 10)
      .onUpdate(() => {
        explanationObject.timingCircle.geometry = createCircleGeo(angleTweenConfig.radius)
      })
      .onComplete(() => {
        explanationObject.timingCircle.visible = false
      })
      .start()
  }
  explanationObject.animateLine = (time) => {
    explanationObject.timingLine.visible = true
    const angleTweenConfig = {angle: 0}
    new Tween(angleTweenConfig)
      .to({angle: 360}, time - 10)
      .onUpdate(() => {
        explanationObject.timingLine.setRotationFromAxisAngle(centreVec, MathUtils.degToRad(angleTweenConfig.angle))
      })
      .onComplete(() => {
        explanationObject.timingLine.visible = false
      })
      .start()
  }

  return explanationObject
}

const updateFovFromDistance = () => {
  camera.fov = 25 + (controls.getDistance() * 30)
  camera.updateProjectionMatrix()
}

export const focusMapOnConstellation = (constellation) => {
  controls.enabled = false
  const newCamPos = new Vector3(constellation.centre.x, constellation.centre.y, constellation.centre.z).lerp(new Vector3(0, 0, 0), 1.2)
  camera.position.x = newCamPos.x
  camera.position.y = newCamPos.y
  camera.position.z = newCamPos.z
  camera.lookAt(controls.target)

  controls.enabled = true
  setupMelodyExplanation(constellation)
  updateFovFromDistance()
}

const initScene = () => {
  scene = new Scene()
  scene.background = new Color(0x000000)

  camera = new PerspectiveCamera(
    25, // Field of View
    1200 / 600, // aspect ratio
    0.001, // near clipping plane
    1000 // far clipping plane
  )
  renderer = new WebGLRenderer({
    alpha: true, // transparent background
    antialias: true // smooth edges
  })
  renderer.setSize(1200, 600)
  document.querySelector('.star-map').appendChild(renderer.domElement)

  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(1200, 600)
  labelRenderer.domElement.style.position = 'absolute'
  labelRenderer.domElement.style.top = '0px'
  labelRenderer.domElement.style.pointerEvents = 'none'
  document.querySelector('.star-map').appendChild(labelRenderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  // controls.rotateSpeed *= -1; // This isn't working, should ideally be opposite up and down, scroll in / out, not pan
  controls.minDistance = 0
  controls.maxDistance = 1
  controls.zoomSpeed = 2
  // console.log('controls', controls)
  controls.addEventListener('change', function (change) {
    // camera.lookAt(new THREE.Vector3(0,0,0).lerp(camera.position, 2))
    updateFovFromDistance()
    // console.log('control change', controls.getDistance(), camera.fov)
  })
}

const loadStars = () => {
  new TextureLoader().load('disc.png')

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

  for (const constellation of starData.constellations) { // .filter(c => c.constellationName === 'Sagitta')) {
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

  scene.add(points)
}
const loadConstellationLines = () => {
  const lineMaterial = new LineMaterial({
    color: 0x1363DF,
    linewidth: 0.003
  })
  for (const constellation of starData.constellations) {
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
      }
    }

    const conDiv = document.createElement('div')
    conDiv.className = 'label'
    conDiv.textContent = constellation.constellationName

    // conDiv.style.marginTop = '-1em';
    const conLabel = new CSS2DObject(conDiv)
    conLabel.position.set(constellation.centre.x, constellation.centre.y, constellation.centre.z)
    scene.add(conLabel)
  }
}
const loadSphere = () => {
  sphere = new Mesh(new SphereGeometry(1, 24, 13), new MeshPhongMaterial({ color: 0x12394C, side: DoubleSide, wireframe: true }))
  sphere.doubleSided = true
  scene.add(sphere)
  scene.add(new AmbientLight(0xFFFFFF))
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
const render = () => {
  window.requestAnimationFrame(render)
  // controls.update()
  tweenUpdate()
  raycaster.setFromCamera(pointer, camera)
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

  renderer.render(scene, camera)
  labelRenderer.render(scene, camera)
}
export const addStarMap = (passedStarData) => {
  starData = passedStarData
  initScene()

  loadStars()
  loadConstellationLines()
  loadSphere()
  loadTriangles()

  camera.lookAt(0, 0, 0)
  camera.position.z = 0.5 // move camera back so we can see the cube
  updateFovFromDistance()

  updateSelectedConstellation(starData, starData.constellations[0].constellation, true)
  render()
}
