import SunCalc from 'suncalc'

const RAD_TO_DEG = 180 / Math.PI

export const elevationFor = (date: Date, lat: number, lon: number): number =>
  SunCalc.getPosition(date, lat, lon).altitude * RAD_TO_DEG

export const moonIlluminationFor = (date: Date): number =>
  SunCalc.getMoonIllumination(date).fraction
