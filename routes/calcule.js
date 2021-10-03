const { application } = require('express')
const express = require('express')
const fs = require('fs');
const xmlConverter = require('xml-js');
const DOMParser = require('xmldom').DOMParser;
const togeojson = require('togeojson')
const routes = express.Router()
const path = './runs/'

routes.post('/', async (req, res) => {
  try {
    if (!req.files) {
      res.send({
        status: 400,
        message: 'No file uploaded'
      })
    }
    else if (!req.query.distanceDivider) {
      res.send({
        status: 400,
        message: 'No distance sended'
      })
    }
    else {
      const distanceDivider = req.query.distanceDivider
      const run = req.files.run
      await run.mv(path + run.name)
      const gpx = new DOMParser().parseFromString(fs.readFileSync(path + run.name, 'utf8'));
      const geoJson = togeojson.gpx(gpx)

      const coordinates = geoJson.features[0].geometry.coordinates
      const coordTimes = geoJson.features[0].properties.coordTimes

      const separatedList = await divideDistance(coordinates, coordTimes, distanceDivider)

      const total = await buildTotal(coordinates, coordTimes)

      deleteRun(run)
      res.send({
        status: 200,
        message: 'Success',
        data: {
          total,
          separatedList,
          distanceDivider
        }
      })
    }
  } catch (err) {
    console.log(err)
    res.status(500).send(err);
  }
})

const divideDistance = async (coordinates, coordTimes, distanceDivider) => {
  const separatedList = []
  let distance = 0
  let total

  for (let index = 1; index < coordinates.length; index++) {
    distance += calculeDistance(coordinates[index - 1][0], coordinates[index - 1][1], coordinates[index][0], coordinates[index][1])

    if (distance >= distanceDivider || index === coordinates.length - 1) {
      
      if (separatedList.length === 0)
        fristIndex = 0
      else
        fristIndex = separatedList[separatedList.length - 1].lastIndex

      total = await totalDistanceTime(coordinates.slice(fristIndex, index), coordTimes.slice(fristIndex, index))

      separatedList.push(buildObject(distance, fristIndex, index, total.time))
      distance = 0
    }
  }
  return separatedList
}

const buildObject = (distance, fristIndex, lastIndex, seconds) => {
  const pace = buildPace(distance, seconds)

  return {
    distance,
    fristIndex,
    lastIndex,
    time: buildStringTime(seconds),
    pace,
    seconds
  }
}

const buildPace = (distance, time) => {
  const seconds = (1000 * time) / distance
  return buildStringTime(seconds)
}

const buildTotal = async (coordinates, coordTimes) => {
  const total = await totalDistanceTime(coordinates, coordTimes)
  const distance = total.distance
  const time = await buildStringTime(total.time)
  const pace = await buildPace(total.distance, total.time)

  return {
    distance,
    time,
    pace
  }
}

const buildStringTime = (seconds) => {
  const hours = Math.floor(seconds / 3600) % 24
  seconds -= hours * 3600
  const minutes = Math.floor(seconds / 60) % 60
  seconds -= minutes * 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(Math.floor(seconds)).padStart(2, '0')}`
}

const totalDistanceTime = async (coordinates, coordTimes) => {
  let distance = 0
  let seconds

  for (let index = 1; index < coordinates.length; index++) {
    distance += await calculeDistance(coordinates[index - 1][0], coordinates[index - 1][1], coordinates[index][0], coordinates[index][1])
  }

  seconds = Math.abs(Date.parse(coordTimes[coordTimes.length - 1]) - Date.parse(coordTimes[0])) / 1000

  return {
    distance: distance,
    time: seconds
  }
}

const calculeDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6399593.6259;

  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const d = R * c
  return d;

}

const deg2rad = (deg) => {
  return deg * (Math.PI / 180)
}

const deleteRun = (run) => {
  fs.unlinkSync(path + run.name);
}

module.exports = routes